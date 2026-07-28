// Read-only: column types + PKs for the curriculum tables, so migrations declare
// correct foreign keys.
//   npx tsx scripts/inspect-schema-types.ts

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

const TABLES = [
  "topics",
  "subtopics",
  "learning_objectives",
  "questions",
  "subjects",
  "diagnostic_students",
  "learning_plans",
  "learning_plan_items",
];

async function main() {
  const pool = await connect();

  const cols = await pool.query(
    `SELECT table_name, column_name, data_type, udt_name, is_nullable
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ANY($1)
     ORDER BY table_name, ordinal_position`,
    [TABLES],
  );

  let current = "";
  for (const r of cols.rows) {
    if (r.table_name !== current) {
      current = r.table_name;
      console.log(`\n── ${current} ──`);
    }
    const type =
      r.data_type === "USER-DEFINED" ? `enum:${r.udt_name}` : r.data_type;
    console.log(
      `  ${r.column_name.padEnd(26)} ${type}${r.is_nullable === "NO" ? " NOT NULL" : ""}`,
    );
  }

  const pks = await pool.query(
    `SELECT tc.table_name, kcu.column_name
     FROM information_schema.table_constraints tc
     JOIN information_schema.key_column_usage kcu
       ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
     WHERE tc.table_schema = 'public' AND tc.constraint_type = 'PRIMARY KEY'
       AND tc.table_name = ANY($1)
     ORDER BY tc.table_name, kcu.ordinal_position`,
    [TABLES],
  );
  console.log("\n── primary keys ──");
  console.table(pks.rows);

  // Enum values actually in use for topic status.
  const enums = await pool.query(
    `SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
     FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
     GROUP BY t.typname ORDER BY t.typname`,
  );
  console.log("\n── enums ──");
  console.table(enums.rows);

  await pool.end();
}

main().catch((e) => {
  console.error("Failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
