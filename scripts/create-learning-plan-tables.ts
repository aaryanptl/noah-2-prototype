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

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  ssl: {
    rejectUnauthorized: false, // Required for RDS
  },
};

const pool = new Pool(poolConfig);

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Database connection established. Starting transaction...");
    await client.query("BEGIN");

    // Plans may hold real teacher data, so this script is idempotent and
    // never drops existing tables.
    console.log("Creating table 'learning_plans'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.learning_plans (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id      UUID NOT NULL REFERENCES public.diagnostic_students(id),
        teacher_id      UUID,
        created_by      TEXT NOT NULL DEFAULT 'teacher',   -- "teacher" | "system"
        title           TEXT NOT NULL,
        subject         TEXT,
        duration_weeks  SMALLINT NOT NULL CHECK (duration_weeks >= 1),
        start_date      DATE NOT NULL,
        status          TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('draft','active','completed','archived')),
        notes           TEXT,
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      );
    `);

    console.log("Creating table 'learning_plan_items'...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.learning_plan_items (
        id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        plan_id             UUID NOT NULL REFERENCES public.learning_plans(id) ON DELETE CASCADE,
        week                SMALLINT NOT NULL CHECK (week >= 1),
        day                 SMALLINT NOT NULL CHECK (day >= 1),
        session_date        DATE,                       -- teacher-picked calendar date
        sort_order          SMALLINT NOT NULL DEFAULT 0,
        focus               TEXT NOT NULL
                              CHECK (focus IN ('teach','practice','review','assess')),
        topic               TEXT NOT NULL,
        subject             TEXT,
        learning_objective  TEXT,
        activity            TEXT NOT NULL,
        mastery_state       TEXT,                       -- mastery snapshot when the plan was built
        baseline_score      REAL,                       -- objective/topic score snapshot (0-100)
        status              TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','in_progress','done','skipped')),
        completed_at        TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT now(),
        updated_at          TIMESTAMPTZ DEFAULT now()
      );
    `);

    console.log("Creating indexes...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_learning_plans_student
        ON public.learning_plans (student_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_learning_plan_items_plan
        ON public.learning_plan_items (plan_id, week, day, sort_order);
    `);

    // Triggers for updated_at fields
    console.log("Creating triggers for updating updated_at columns...");
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_learning_plans_modtime ON public.learning_plans;
      CREATE TRIGGER update_learning_plans_modtime
          BEFORE UPDATE ON public.learning_plans
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_learning_plan_items_modtime ON public.learning_plan_items;
      CREATE TRIGGER update_learning_plan_items_modtime
          BEFORE UPDATE ON public.learning_plan_items
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query("COMMIT");
    console.log("✅ Learning plan tables and triggers created successfully!");

    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('learning_plans', 'learning_plan_items')
      ORDER BY table_name
    `);

    console.log("\n--- Verification: Created Tables ---");
    for (const row of tablesRes.rows) {
      console.log(`- ${row.table_name}`);
    }

    if (tablesRes.rows.length === 2) {
      console.log("✅ Verification successful: both tables exist!");
    } else {
      console.warn(
        `⚠️ Warning: Expected 2 tables, but found ${tablesRes.rows.length}.`,
      );
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Error running migration:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
