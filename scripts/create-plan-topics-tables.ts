// Plan schema v2: makes the TOPIC the unit of planning.
//
//   npx tsx scripts/create-plan-topics-tables.ts
//
// `learning_plan_topics` is now the plan — how many classes and activities each
// topic gets, and how much of that is done. `learning_plan_items` stays as the
// derived per-date schedule generated from it, so the existing session UI keeps
// working unchanged.
//
// `learning_plan_revisions` is append-only history. The spec's precedence rule
// ("if Manual was last, Auto may not modify") is a lookup of the newest row, and
// "the previous plan is always the baseline" needs history, not just current state.
//
// Additive and idempotent: creates two tables and adds nullable columns.

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

    // Package-level counters the allocator validates against.
    await client.query(`
      ALTER TABLE public.learning_plans
        ADD COLUMN IF NOT EXISTS total_classes     SMALLINT,
        ADD COLUMN IF NOT EXISTS classes_remaining SMALLINT,
        ADD COLUMN IF NOT EXISTS grade             TEXT,
        ADD COLUMN IF NOT EXISTS last_update_kind  TEXT
    `);
    // Added separately so a re-run doesn't fail on an existing constraint.
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE public.learning_plans
          ADD CONSTRAINT learning_plans_last_update_kind_check
          CHECK (last_update_kind IS NULL
                 OR last_update_kind IN ('initial','manual','class','auto'));
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.learning_plan_topics (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id            UUID NOT NULL
                             REFERENCES public.learning_plans(id) ON DELETE CASCADE,
        topic_id           BIGINT REFERENCES public.topics(id),
        -- Snapshot of the name, so a renamed or retired syllabus topic doesn't
        -- rewrite history on an in-flight plan.
        topic_name         TEXT NOT NULL,
        sequence           SMALLINT NOT NULL DEFAULT 1,

        planned_classes    SMALLINT NOT NULL CHECK (planned_classes >= 1),
        planned_activities SMALLINT NOT NULL DEFAULT 0 CHECK (planned_activities >= 0),
        classes_done       SMALLINT NOT NULL DEFAULT 0 CHECK (classes_done >= 0),
        activities_done    SMALLINT NOT NULL DEFAULT 0 CHECK (activities_done >= 0),

        -- Latest mastery on this topic, 0-100; drives the auto adjustment.
        mastery_score      REAL,
        priority           SMALLINT,
        status             TEXT NOT NULL DEFAULT 'planned'
                             CHECK (status IN ('planned','in_progress','done','dropped')),
        -- How this topic entered the plan.
        source             TEXT NOT NULL DEFAULT 'ai'
                             CHECK (source IN ('ai','manual','class','auto')),
        reason             TEXT,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // A topic appears at most once per plan; re-teaching is more classes, not a
    // second row.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_plan_topic
        ON public.learning_plan_topics (plan_id, topic_id)
        WHERE topic_id IS NOT NULL;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_topics_plan
        ON public.learning_plan_topics (plan_id, sequence);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.learning_plan_revisions (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id    UUID NOT NULL
                     REFERENCES public.learning_plans(id) ON DELETE CASCADE,
        kind       TEXT NOT NULL
                     CHECK (kind IN ('initial','manual','class','auto')),
        actor      TEXT,
        summary    TEXT,
        -- Before/after of the topics this revision touched.
        diff       JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_revisions_plan
        ON public.learning_plan_revisions (plan_id, created_at DESC);
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_learning_plan_topics_modtime
        ON public.learning_plan_topics;
      CREATE TRIGGER update_learning_plan_topics_modtime
        BEFORE UPDATE ON public.learning_plan_topics
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query("COMMIT");
    console.log("✅ plan schema v2 applied");

    const counts = await client.query(`
      SELECT (SELECT COUNT(*)::int FROM learning_plan_topics)    AS plan_topics,
             (SELECT COUNT(*)::int FROM learning_plan_revisions) AS revisions
    `);
    console.table(counts.rows);
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
