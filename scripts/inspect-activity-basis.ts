// Read-only: does `topics.classes` already track topic size (LO count, subtopics,
// question volume)? Answers whether ideal_activities can be derived from classes
// alone, or needs LO count as a second input.
//
//   npx tsx scripts/inspect-activity-basis.ts

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

  // Per-topic shape, grouped by the prefixed class count.
  const byClasses = await pool.query(`
    SELECT t.classes::int AS classes,
           COUNT(*)::int AS topics,
           ROUND(AVG(s.los), 1)::float8       AS avg_los,
           MIN(s.los)::int                    AS min_los,
           MAX(s.los)::int                    AS max_los,
           ROUND(AVG(s.subtopics), 1)::float8 AS avg_subtopics
    FROM topics t
    JOIN (
      SELECT t2.id,
             COUNT(DISTINCT lo.id) AS los,
             COUNT(DISTINCT st.id) AS subtopics
      FROM topics t2
      LEFT JOIN learning_objectives lo ON lo.topic_id = t2.id
      LEFT JOIN subtopics st           ON st.topic_id = t2.id
      GROUP BY t2.id
    ) s ON s.id = t.id
    WHERE t.status::text <> 'archived'
    GROUP BY t.classes
    ORDER BY t.classes
  `);
  console.log("=== Topic shape by prefixed class count ===");
  console.table(byClasses.rows);

  // Correlation: does classes move with LO count at all?
  const corr = await pool.query(`
    SELECT ROUND(CORR(t.classes, s.los)::numeric, 3)::float8 AS corr_classes_los,
           ROUND(CORR(t.classes, s.subtopics)::numeric, 3)::float8 AS corr_classes_subtopics
    FROM topics t
    JOIN (
      SELECT t2.id, COUNT(DISTINCT lo.id) AS los, COUNT(DISTINCT st.id) AS subtopics
      FROM topics t2
      LEFT JOIN learning_objectives lo ON lo.topic_id = t2.id
      LEFT JOIN subtopics st           ON st.topic_id = t2.id
      GROUP BY t2.id
    ) s ON s.id = t.id
    WHERE t.status::text <> 'archived'
  `);
  console.log("\n=== Correlation ===");
  console.table(corr.rows);

  // How long is a question expected to take? Bounds questions-per-practice-block.
  const timing = await pool.query(`
    SELECT COUNT(*)::int AS questions_with_time,
           ROUND(AVG(time_allocated_ms) / 1000.0)::int      AS avg_seconds,
           ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_allocated_ms) / 1000.0)::int AS median_seconds
    FROM questions
    WHERE time_allocated_ms IS NOT NULL AND time_allocated_ms > 0
  `);
  console.log("\n=== Expected time per question ===");
  console.table(timing.rows);

  // Difficulty spread per LO — needed for starter/master selection.
  const diff = await pool.query(`
    SELECT difficulty::text AS difficulty, COUNT(*)::int AS questions
    FROM questions
    GROUP BY difficulty ORDER BY 2 DESC
  `);
  console.log("\n=== Difficulty spread ===");
  console.table(diff.rows);

  await pool.end();
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
