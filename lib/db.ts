import { Pool } from "pg";

const poolConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "postgres",
  port: parseInt(process.env.DB_PORT || "5432"),
  ssl: process.env.DB_SSL === "false" ? false : {
    rejectUnauthorized: false, // Required for some RDS instances
  },
};

const globalForPool = global as unknown as { pool: Pool };

export const pool =
  globalForPool.pool ||
  new Pool({
    ...poolConfig,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") globalForPool.pool = pool;

export const query = (text: string, params?: any[]) => pool.query(text, params);

export default pool;
