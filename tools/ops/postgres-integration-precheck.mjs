import { Pool } from 'pg';

const REQUIRED_ENV = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const EXPECTED_TABLES = (process.env.POSTGRES_INTEGRATION_EXPECT_TABLES ?? 'audit_events,leads,clients')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function fail(message) {
  throw new Error(message);
}

function env(name) {
  const value = process.env[name];
  if (!value) {
    fail(`Missing env var: ${name}`);
  }

  return value;
}

function formatSummary(summary) {
  return `POSTGRES_INTEGRATION_PRECHECK ${JSON.stringify(summary)}`;
}

function parseBoolean(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  return undefined;
}

function resolveSslOption() {
  const sslEnabled = parseBoolean(process.env.DB_SSL);
  if (sslEnabled !== true) return undefined;

  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED);
  return { rejectUnauthorized: rejectUnauthorized ?? false };
}

async function run() {
  const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missingEnv.length > 0) {
    fail(`Missing required env vars: ${missingEnv.join(', ')}`);
  }

  const pool = new Pool({
    host: env('DB_HOST'),
    port: Number(process.env.DB_PORT ?? '5432'),
    database: env('DB_NAME'),
    user: env('DB_USER'),
    password: env('DB_PASSWORD'),
    ssl: resolveSslOption()
  });

  try {
    const result = await pool.query(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
      `
    );

    const existingTables = new Set(result.rows.map((row) => row.table_name));
    const missingTables = EXPECTED_TABLES.filter((tableName) => !existingTables.has(tableName));

    if (missingTables.length > 0) {
      fail(
        `Postgres schema not ready. Missing tables: ${missingTables.join(', ')}. ` +
        'Apply migrations before running postgres integration tests.'
      );
    }

    console.log(
      formatSummary({
        ok: true,
        dbHost: process.env.DB_HOST,
        dbName: process.env.DB_NAME,
        checkedTables: EXPECTED_TABLES,
        missingTables: []
      })
    );
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(
    formatSummary({
      ok: false,
      checkedTables: EXPECTED_TABLES,
      error: error instanceof Error ? error.message : 'Unknown precheck error'
    })
  );
  process.exitCode = 1;
});
