// Seeds `curriculum_plan_defaults` with proposed prefixed data for the plan builder.
//
//   npx tsx scripts/seed-curriculum-plan-defaults.ts            # dry run, prints only
//   npx tsx scripts/seed-curriculum-plan-defaults.ts --apply    # writes
//
// What it seeds:
//   Topic level (one row per active topic)
//     ideal_classes    ← topics.classes (already authored)
//     ideal_activities ← round5(classes * 5 + objectives * 2)   -- see FORMULA below
//     grade_priority   ← curriculum sequence within the grade
//   Objective level (one row per learning objective)
//     starter_question_id ← easiest active question on that objective
//     master_question_id  ← hardest active question on that objective
//
// Everything lands as review_status='proposed'. Rows already marked 'approved' or
// 'rejected' are never overwritten, so this is safe to re-run after review.

import * as fs from "node:fs";
import * as path from "node:path";
import { Pool, type PoolConfig } from "pg";

// ── FORMULA ──────────────────────────────────────────────────────────────────
// activities = classes × 5 + objectives × 2, rounded to the nearest 5.
// Teaching time sets the base practice volume; objective count adds coverage so
// each objective gets its own questions. Calibrated against the one worked example
// in the spec: Fractions, 6 classes / 5 objectives → 6×5 + 5×2 = 40 activities.
// These are starting values for a reviewer to adjust, not ground truth — refit the
// coefficients once real completion data exists (see `source` column).
const CLASS_WEIGHT = 5;
const OBJECTIVE_WEIGHT = 2;
const SOURCE = "formula_v1";

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

/** Topic rows with the derived activity budget and grade rank. */
const TOPIC_ROWS_SQL = `
  WITH shape AS (
    SELECT t.id,
           t.name,
           t.grade,
           t.classes::int AS classes,
           COUNT(lo.id)::int AS objectives
    FROM topics t
    LEFT JOIN learning_objectives lo ON lo.topic_id = t.id
    WHERE t.status = 'active'
    GROUP BY t.id, t.name, t.grade, t.classes
  )
  SELECT id, name, grade, classes, objectives,
         GREATEST(
           5,
           (ROUND(((classes * $1) + (objectives * $2)) / 5.0) * 5)::int
         ) AS ideal_activities,
         ROW_NUMBER() OVER (PARTITION BY grade ORDER BY id)::int AS grade_priority
  FROM shape
  ORDER BY grade, grade_priority
`;

/**
 * Easiest and hardest active question per objective. Ordered by band first, then
 * numeric rating, so a rating-less question still sorts into the right end.
 * Only questions with a current version are eligible — the rest have no prompt to show.
 */
const OBJECTIVE_ROWS_SQL = `
  WITH ranked AS (
    SELECT q.id,
           q.learning_objective_id,
           q.topic_id,
           ROW_NUMBER() OVER (
             PARTITION BY q.learning_objective_id
             ORDER BY CASE q.difficulty_band WHEN 'easy' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                      q.difficulty_rating ASC NULLS LAST, q.id
           ) AS easiest_rank,
           ROW_NUMBER() OVER (
             PARTITION BY q.learning_objective_id
             ORDER BY CASE q.difficulty_band WHEN 'hard' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
                      q.difficulty_rating DESC NULLS LAST, q.id
           ) AS hardest_rank
    FROM questions q
    JOIN topics t ON t.id = q.topic_id AND t.status = 'active'
    WHERE q.lifecycle_status = 'active'
      AND q.current_version_id IS NOT NULL
  )
  SELECT lo.id            AS learning_objective_id,
         lo.topic_id      AS topic_id,
         starter.id       AS starter_question_id,
         master.id        AS master_question_id
  FROM learning_objectives lo
  JOIN topics t ON t.id = lo.topic_id AND t.status = 'active'
  LEFT JOIN ranked starter ON starter.learning_objective_id = lo.id AND starter.easiest_rank = 1
  LEFT JOIN ranked master  ON master.learning_objective_id  = lo.id AND master.hardest_rank  = 1
  ORDER BY lo.topic_id, lo.id
`;

async function main() {
  const apply = process.argv.includes("--apply");
  const pool = await connect();

  const topics = await pool.query(TOPIC_ROWS_SQL, [
    CLASS_WEIGHT,
    OBJECTIVE_WEIGHT,
  ]);
  const objectives = await pool.query(OBJECTIVE_ROWS_SQL);

  console.log(`Topic rows:     ${topics.rowCount}`);
  console.log(`Objective rows: ${objectives.rowCount}`);

  const noStarter = objectives.rows.filter(
    (r) => !r.starter_question_id,
  ).length;
  const sameQuestion = objectives.rows.filter(
    (r) =>
      r.starter_question_id &&
      r.master_question_id &&
      r.starter_question_id === r.master_question_id,
  ).length;
  console.log(`  objectives with no usable question: ${noStarter}`);
  console.log(`  objectives where starter == master: ${sameQuestion}`);

  console.log("\nSample topic rows:");
  console.table(
    topics.rows.slice(0, 12).map((r) => ({
      grade: r.grade,
      priority: r.grade_priority,
      topic: String(r.name).slice(0, 34),
      classes: r.classes,
      objectives: r.objectives,
      activities: r.ideal_activities,
    })),
  );

  const spread = topics.rows.reduce<Record<number, number>>((acc, r) => {
    acc[r.ideal_activities] = (acc[r.ideal_activities] || 0) + 1;
    return acc;
  }, {});
  console.log("Activity budget spread (activities → topic count):");
  console.table(
    Object.entries(spread)
      .map(([activities, count]) => ({
        activities: Number(activities),
        topics: count,
      }))
      .sort((a, b) => a.activities - b.activities),
  );

  if (!apply) {
    console.log("\nDry run — nothing written. Re-run with --apply to persist.");
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Only 'proposed' rows are refreshed; reviewer decisions survive a re-run.
    for (const r of topics.rows) {
      await client.query(
        `INSERT INTO curriculum_plan_defaults
           (topic_id, learning_objective_id, ideal_classes, ideal_activities,
            grade_priority, source, review_status)
         VALUES ($1, NULL, $2, $3, $4, $5, 'proposed')
         ON CONFLICT (topic_id) WHERE learning_objective_id IS NULL
         DO UPDATE SET ideal_classes    = EXCLUDED.ideal_classes,
                       ideal_activities = EXCLUDED.ideal_activities,
                       grade_priority   = EXCLUDED.grade_priority,
                       source           = EXCLUDED.source
         WHERE curriculum_plan_defaults.review_status = 'proposed'`,
        [r.id, r.classes, r.ideal_activities, r.grade_priority, SOURCE],
      );
    }

    for (const r of objectives.rows) {
      await client.query(
        `INSERT INTO curriculum_plan_defaults
           (topic_id, learning_objective_id, starter_question_id, master_question_id,
            source, review_status)
         VALUES ($1, $2, $3, $4, $5, 'proposed')
         ON CONFLICT (learning_objective_id) WHERE learning_objective_id IS NOT NULL
         DO UPDATE SET starter_question_id = EXCLUDED.starter_question_id,
                       master_question_id  = EXCLUDED.master_question_id,
                       source              = EXCLUDED.source
         WHERE curriculum_plan_defaults.review_status = 'proposed'`,
        [
          r.topic_id,
          r.learning_objective_id,
          r.starter_question_id,
          r.master_question_id,
          SOURCE,
        ],
      );
    }

    await client.query("COMMIT");
    const total = await client.query(
      `SELECT COUNT(*) FILTER (WHERE learning_objective_id IS NULL)::int  AS topic_rows,
              COUNT(*) FILTER (WHERE learning_objective_id IS NOT NULL)::int AS objective_rows
       FROM curriculum_plan_defaults`,
    );
    console.log("\n✅ Seeded.");
    console.table(total.rows);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(
      "❌ seed failed:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
