import { Pool, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function getPgPool(): Pool {
  if (pool) return pool;

  pool = new Pool({
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? '5432'),
    database: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD')
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
