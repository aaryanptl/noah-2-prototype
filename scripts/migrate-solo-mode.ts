import { Pool } from "pg";
import path from "path";
import fs from "fs";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const fallbackPath = path.resolve(process.cwd(), ".env.example");
  const finalPath = fs.existsSync(envPath) ? envPath : fallbackPath;
  console.log("Loading migration env from:", finalPath);
  const envContent = fs.readFileSync(finalPath, "utf-8");
  const env: any = {};
  envContent.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim();
      env[key] = val.startsWith('"') && val.endsWith('"') ? val.slice(1, -1) : val;
    }
  });
  return env;
}

const env = loadEnv();
const pool = new Pool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: parseInt(env.DB_PORT || "5432"),
  ssl: env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("Updating test_mode check constraint to allow 'solo'...");
    await client.query(
      `ALTER TABLE diagnostic_assessments DROP CONSTRAINT IF EXISTS diagnostic_assessments_test_mode_check;`,
    );
    await client.query(`
      ALTER TABLE diagnostic_assessments 
      ADD CONSTRAINT diagnostic_assessments_test_mode_check 
      CHECK (test_mode IN ('topic', 'grade', 'recurring', 'placement', 'solo'));
    `);

    console.log("Updating topic_mode check constraint to allow 'solo'...");
    await client.query(
      `ALTER TABLE diagnostic_assessments DROP CONSTRAINT IF EXISTS diagnostic_assessments_topic_mode_check;`,
    );
    await client.query(`
      ALTER TABLE diagnostic_assessments 
      ADD CONSTRAINT diagnostic_assessments_topic_mode_check 
      CHECK (
        (test_mode IN ('topic', 'placement', 'recurring', 'solo') AND topic IS NOT NULL)
        OR (test_mode = 'grade' AND topic IS NULL)
      );
    `);

    await client.query("COMMIT");
    console.log("Migration successful!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
