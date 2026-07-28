// Creates `curriculum_plan_defaults` — the prefixed dimensional data the learning
// plan builder allocates from. One row per topic (learning_objective_id NULL) and
// optionally one row per learning objective, which overrides the topic-level row.
//
//   npx tsx scripts/create-curriculum-plan-defaults.ts
//
// Additive and idempotent: creates a new table only, never touches topics /
// learning_objectives / questions / learning_plans.

import * as fs from "node:fs";
import * as path from "node:path";
import { Pool, type PoolConfig } from "pg";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

function baseConfig(): PoolConfig {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) return { connectionString: url };
  return {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "postgres",
    port: Number.parseInt(process.env.DB_PORT || "5432", 10),
  };
}

async function connect(): Promise<Pool> {
  const base = baseConfig();
  for (const ssl of [{ rejectUnauthorized: false }, false] as const) {
    const pool = new Pool({
      ...base,
      ssl,
      connectionTimeoutMillis: 8000,
      max: 2,
    });
    try {
      await pool.query("SELECT 1");
      return pool;
    } catch {
      await pool.end().catch(() => {});
    }
  }
  throw new Error("could not connect");
}

async function main() {
  const pool = await connect();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.curriculum_plan_defaults (
        id                    BIGSERIAL PRIMARY KEY,
        topic_id              BIGINT NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
        -- NULL = topic-level defaults; set = per-objective override of the topic row.
        learning_objective_id BIGINT REFERENCES public.learning_objectives(id) ON DELETE CASCADE,

        -- Teaching budget. Mirrors topics.classes at seed time so the planner reads
        -- one table, and so a reviewer can override it without editing the syllabus.
        ideal_classes         SMALLINT CHECK (ideal_classes IS NULL OR ideal_classes >= 1),
        -- Practice budget: how many questions the student should work through.
        ideal_activities      SMALLINT CHECK (ideal_activities IS NULL OR ideal_activities >= 1),
        -- Rank within the topic's grade, 1 = pick first. Drives the "drop topics by
        -- priority when classes run short" validation.
        grade_priority        SMALLINT CHECK (grade_priority IS NULL OR grade_priority >= 1),

        -- Questions guideline: the range a student should manage if they've learnt
        -- this objective. Prefer real bank questions; the TEXT columns are for the
        -- handful of objectives with no suitable question.
        starter_question_id   BIGINT REFERENCES public.questions(id) ON DELETE SET NULL,
        master_question_id    BIGINT REFERENCES public.questions(id) ON DELETE SET NULL,
        starter_question      TEXT,
        master_question       TEXT,

        -- Provenance, so seeded rows stay distinguishable from human-edited ones
        -- when these numbers are recalibrated against real completion data.
        source                TEXT NOT NULL DEFAULT 'formula_v1',
        review_status         TEXT NOT NULL DEFAULT 'proposed'
                                CHECK (review_status IN ('proposed','approved','rejected')),
        reviewed_by           TEXT,
        reviewed_at           TIMESTAMPTZ,
        notes                 TEXT,
        created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // One topic-level row per topic, and one row per objective. Two partial unique
    // indexes rather than UNIQUE NULLS NOT DISTINCT, which needs PG15+.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_cpd_topic_level
        ON public.curriculum_plan_defaults (topic_id)
        WHERE learning_objective_id IS NULL;
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_cpd_objective_level
        ON public.curriculum_plan_defaults (learning_objective_id)
        WHERE learning_objective_id IS NOT NULL;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cpd_topic
        ON public.curriculum_plan_defaults (topic_id, review_status);
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE 'plpgsql';
    `);
    await client.query(`
      DROP TRIGGER IF EXISTS update_curriculum_plan_defaults_modtime
        ON public.curriculum_plan_defaults;
      CREATE TRIGGER update_curriculum_plan_defaults_modtime
        BEFORE UPDATE ON public.curriculum_plan_defaults
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query("COMMIT");
    console.log("✅ curriculum_plan_defaults created");

    const check = await client.query(`
      SELECT COUNT(*)::int AS rows FROM public.curriculum_plan_defaults
    `);
    console.log(`   existing rows: ${check.rows[0].rows}`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      "❌ migration failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
