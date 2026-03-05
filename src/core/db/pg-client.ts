import { Pool, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

function parseBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  return undefined;
}

function resolveSslOption(): { rejectUnauthorized: boolean } | undefined {
  const sslEnabled = parseBoolean(process.env.DB_SSL);
  if (sslEnabled !== true) return undefined;

  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED);
  return { rejectUnauthorized: rejectUnauthorized ?? false };
}

export function getPgPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? '5432'),
    database: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    ssl: resolveSslOption()
  });

  return pool;
}

export async function pgQuery<T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<QueryResult<T>> {
  const activePool = getPgPool();
  return activePool.query<T>(sql, params);
}

export async function closePgPool(): Promise<void> {
  if (!pool) return;
  await pool.end();
  pool = null;
}
