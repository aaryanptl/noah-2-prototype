import * as fs from "node:fs";
import * as path from "node:path";
import { Pool } from "pg";

// Manually parse .env.local because dotenv may not be globally available in all environments
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const index = trimmed.indexOf("=");
      if (index <= 0) return;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed
        .slice(index + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      process.env[key] = value;
    });
  }
}

loadEnvLocal();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  ssl: {
    rejectUnauthorized: false, // Required for RDS
  },
});

/**
 * Keeps the exact plan document produced by the Learning Plan Builder so a
 * saved plan can be reopened by id. The relational learning_plan_* tables only
 * hold a flattened projection and cannot rebuild the builder view.
 */
async function runMigration() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS learning_plan_snapshots (
        plan_id uuid PRIMARY KEY
          REFERENCES learning_plans(id) ON DELETE CASCADE,
        student jsonb NOT NULL,
        plan jsonb NOT NULL,
        completed_count integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS learning_plan_snapshots_updated_at_idx
        ON learning_plan_snapshots (updated_at DESC)
    `);
    await client.query("COMMIT");
    console.log("learning_plan_snapshots is ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
