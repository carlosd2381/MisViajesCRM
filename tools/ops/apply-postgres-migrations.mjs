import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';

function parseBoolean(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

function resolveSslOption() {
  const sslEnabled = parseBoolean(process.env.DB_SSL);
  if (sslEnabled !== true) return undefined;

  const rejectUnauthorized = parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED);
  return { rejectUnauthorized: rejectUnauthorized ?? false };
}

async function run() {
  const client = new Client({
    host: requireEnv('DB_HOST'),
    port: Number(process.env.DB_PORT ?? '5432'),
    database: requireEnv('DB_NAME'),
    user: requireEnv('DB_USER'),
    password: requireEnv('DB_PASSWORD'),
    ssl: resolveSslOption()
  });

  await client.connect();
  try {
    const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();

    for (const fileName of files) {
      const filePath = path.join(migrationsDir, fileName);
      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`Applying ${fileName}`);
      await client.query(sql);
    }

    console.log('POSTGRES_MIGRATIONS_APPLIED_OK');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error('POSTGRES_MIGRATIONS_APPLY_FAILED', error instanceof Error ? error.message : 'Unknown error');
  process.exitCode = 1;
});
