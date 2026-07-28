// Read-only survey of the curriculum tables, to size the prefixed-plan-data work.
// Reports topics / subtopics / learning objectives / questions per grade, plus how
// much of the plan-defaults data (topics.classes) is already populated.
//
//   npx tsx scripts/inspect-curriculum.ts
//
// Connects via DATABASE_URL if present, else the DB_HOST/DB_USER/... vars that
// lib/db.ts uses. Retries without SSL when the server rejects it.

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

/** Tries SSL first (RDS), then plaintext (local/proxied). */
async function connect(): Promise<Pool> {
  const base = baseConfig();
  const attempts: PoolConfig[] = [
    { ...base, ssl: { rejectUnauthorized: false } },
    { ...base, ssl: false },
  ];
  let lastError: unknown;
  for (const config of attempts) {
    const pool = new Pool({ ...config, connectionTimeoutMillis: 8000, max: 2 });
    try {
      await pool.query("SELECT 1");
      console.log(
        `Connected (ssl=${config.ssl ? "on" : "off"}, source=${
          base.connectionString ? "DATABASE_URL" : "DB_HOST vars"
        })\n`,
      );
      return pool;
    } catch (error) {
      lastError = error;
      await pool.end().catch(() => {});
    }
  }
  throw lastError;
}

async function main() {
  const pool = await connect();

  const perGrade = await pool.query(`
    SELECT t.grade,
           COUNT(DISTINCT t.id)::int  AS topics,
           COUNT(DISTINCT st.id)::int AS subtopics,
           COUNT(DISTINCT lo.id)::int AS objectives,
           COUNT(DISTINCT q.id)::int  AS questions,
           SUM(t.classes)::int        AS total_classes
    FROM topics t
    LEFT JOIN subtopics st           ON st.topic_id = t.id
    LEFT JOIN learning_objectives lo ON lo.topic_id = t.id
    LEFT JOIN questions q            ON q.learning_objective_id = lo.id
    WHERE t.status::text <> 'archived'
    GROUP BY t.grade
    ORDER BY t.grade
  `);

  console.log("=== Per grade ===");
  console.table(perGrade.rows);

  const totals = await pool.query(`
    SELECT
      (SELECT COUNT(*)::int FROM topics WHERE status::text <> 'archived')  AS topics,
      (SELECT COUNT(*)::int FROM subtopics)                          AS subtopics,
      (SELECT COUNT(*)::int FROM learning_objectives)                AS objectives,
      (SELECT COUNT(*)::int FROM questions)                          AS questions
  `);
  console.log("\n=== Totals ===");
  console.table(totals.rows);

  // What the plan builder needs prefixed, and how much already exists.
  const coverage = await pool.query(`
    SELECT
      COUNT(*)::int                                        AS topics,
      COUNT(*) FILTER (WHERE classes IS NOT NULL)::int      AS with_classes,
      COUNT(*) FILTER (WHERE classes IS NULL)::int          AS missing_classes,
      MIN(classes)::int                                     AS min_classes,
      MAX(classes)::int                                     AS max_classes
    FROM topics WHERE status::text <> 'archived'
  `);
  console.log("\n=== Prefixed data coverage (topics.classes) ===");
  console.table(coverage.rows);

  // Objectives per topic drives the starter/master question authoring volume.
  const spread = await pool.query(`
    SELECT MIN(c)::int AS min_los, MAX(c)::int AS max_los,
           ROUND(AVG(c), 1)::float8 AS avg_los,
           COUNT(*) FILTER (WHERE c = 0)::int AS topics_with_no_los
    FROM (
      SELECT t.id, COUNT(lo.id) AS c
      FROM topics t
      LEFT JOIN learning_objectives lo ON lo.topic_id = t.id
      WHERE t.status::text <> 'archived'
      GROUP BY t.id
    ) s
  `);
  console.log("\n=== Learning objectives per topic ===");
  console.table(spread.rows);

  // How many LOs already have questions attached — those can seed starter/master
  // pairs from real questions instead of generating cold.
  const loQuestions = await pool.query(`
    SELECT COUNT(*)::int AS objectives,
           COUNT(*) FILTER (WHERE qc > 0)::int  AS with_questions,
           COUNT(*) FILTER (WHERE qc = 0)::int  AS without_questions
    FROM (
      SELECT lo.id, COUNT(q.id) AS qc
      FROM learning_objectives lo
      LEFT JOIN questions q ON q.learning_objective_id = lo.id
      GROUP BY lo.id
    ) s
  `);
  console.log("\n=== Question coverage per learning objective ===");
  console.table(loQuestions.rows);

  await pool.end();
}

main().catch((error) => {
  console.error("Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
