import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";

/* =====================================================================
   Production-ready MySQL configuration
   - Connection pool sized for high concurrency (millions of users)
   - Optional read replica support via DB_READ_HOST
   - Automatic retry on transient errors (deadlock, timeout, connection lost)
   - Fast-fail connect timeout
   - SQL logging only in development
   ===================================================================== */

const isProd = process.env.NODE_ENV === "production";

// ── Pool Settings ────────────────────────────────────────────────────
const poolConfig = {
  max: Number(process.env.DB_POOL_MAX) || 50,   // max concurrent connections
  min: Number(process.env.DB_POOL_MIN) || 5,    // keep-alive minimum
  acquire: 60_000,                                // 60s to acquire before error
  idle: 10_000,                                   // release idle connections after 10s
  evict: 30_000                                   // check for idle connections every 30s
};

// ── Retry Settings ───────────────────────────────────────────────────
const retryConfig = {
  max: 3,
  match: [
    /Deadlock/i,
    /ETIMEDOUT/,
    /ECONNREFUSED/,
    /ECONNRESET/,
    /PROTOCOL_CONNECTION_LOST/,
    /ER_LOCK_WAIT_TIMEOUT/,
    Sequelize.ConnectionError,
    Sequelize.ConnectionTimedOutError,
    Sequelize.TimeoutError
  ]
};

// ── Dialect Options ──────────────────────────────────────────────────
const dialectOptions = {
  connectTimeout: 10_000,                         // 10s TCP connect timeout
  // SSL for production (e.g. AWS RDS)
  ...(isProd && process.env.DB_SSL === "true" && {
    ssl: {
      rejectUnauthorized: true
    }
  })
};

// ── Replication (Read/Write Splitting) ───────────────────────────────
const hasReadReplica = !!process.env.DB_READ_HOST;

const replicationConfig = hasReadReplica
  ? {
      read: [
        {
          host: process.env.DB_READ_HOST,
          port: Number(process.env.DB_READ_PORT) || Number(process.env.DB_PORT) || 3306,
          username: process.env.DB_USER,
          password: process.env.DB_PASS
        }
      ],
      write: {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        username: process.env.DB_USER,
        password: process.env.DB_PASS
      }
    }
  : null;

// ── Build Sequelize Instance ─────────────────────────────────────────
const sequelizeOptions = {
  dialect: "mysql",
  logging: isProd ? false : (msg) => console.log(`📝 SQL: ${msg}`),
  pool: poolConfig,
  retry: retryConfig,
  dialectOptions,
  benchmark: !isProd,                              // log query durations in dev
  define: {
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci"
  }
};

let sequelize;

if (replicationConfig) {
  // Read/Write splitting mode
  sequelize = new Sequelize(process.env.DB_NAME, null, null, {
    ...sequelizeOptions,
    replication: replicationConfig
  });
} else {
  // Single-host mode
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      ...sequelizeOptions,
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306
    }
  );
}

export default sequelize;
