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

async function runMigration() {
  const client = await pool.connect();
  try {
    console.log("Database connection established. Starting transaction...");
    await client.query("BEGIN");

    // Sessions are now scheduled on teacher-picked calendar dates instead of
    // fixed week packs, so items carry their own date and the week/duration
    // constraints are widened.
    console.log("Adding session_date to learning_plan_items...");
    await client.query(`
      ALTER TABLE public.learning_plan_items
        ADD COLUMN IF NOT EXISTS session_date DATE;
    `);

    console.log("Widening duration/week constraints...");
    await client.query(`
      ALTER TABLE public.learning_plans
        DROP CONSTRAINT IF EXISTS learning_plans_duration_weeks_check;
      ALTER TABLE public.learning_plans
        ADD CONSTRAINT learning_plans_duration_weeks_check
        CHECK (duration_weeks >= 1);
      ALTER TABLE public.learning_plan_items
        DROP CONSTRAINT IF EXISTS learning_plan_items_week_check;
      ALTER TABLE public.learning_plan_items
        ADD CONSTRAINT learning_plan_items_week_check
        CHECK (week >= 1);
      ALTER TABLE public.learning_plan_items
        DROP CONSTRAINT IF EXISTS learning_plan_items_day_check;
      ALTER TABLE public.learning_plan_items
        ADD CONSTRAINT learning_plan_items_day_check
        CHECK (day >= 1);
    `);

    console.log("Backfilling session_date for existing items...");
    const backfill = await client.query(`
      UPDATE public.learning_plan_items i
      SET session_date = p.start_date + ((i.week - 1) * 7 + (i.day - 1))
      FROM public.learning_plans p
      WHERE p.id = i.plan_id AND i.session_date IS NULL
    `);
    console.log(`Backfilled ${backfill.rowCount} items.`);

    await client.query("COMMIT");
    console.log("✅ Learning plan date migration applied successfully!");

    const check = await client.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(session_date)::int AS with_date
      FROM public.learning_plan_items
    `);
    console.log(
      `Verification: ${check.rows[0].with_date}/${check.rows[0].total} items have session_date.`,
    );
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
