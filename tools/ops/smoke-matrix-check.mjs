import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { formatSmokeSummaryLine, parseSmokeSummaryLine } from './smoke-summary-helpers.mjs';

const BASE_URL = process.env.SMOKE_MATRIX_BASE_URL ?? 'http://127.0.0.1:3000';
const SUMMARY_FILE = process.env.SMOKE_MATRIX_SUMMARY_FILE;
const AUTH_MODES_INPUT = process.env.SMOKE_MATRIX_AUTH_MODES ?? 'header,token';
const LOCALES_INPUT = process.env.SMOKE_MATRIX_LOCALES ?? 'es-MX,en-US';
const COMMAND_TIMEOUT_MS = Number(process.env.SMOKE_MATRIX_COMMAND_TIMEOUT_MS ?? '180000');
const REUSE_EXTERNAL_API = (process.env.SMOKE_MATRIX_REUSE_EXTERNAL_API ?? 'false').toLowerCase() === 'true';

const SUPPORTED_AUTH_MODES = ['header', 'token'];
const SUPPORTED_LOCALES = ['es-MX', 'en-US'];

function parseList(raw) {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function resolveSelection(raw, allowedValues, label) {
  const selected = parseList(raw);
  if (selected.length === 0) {
    throw new Error(`${label} selection is empty`);
  }

  for (const value of selected) {
    if (!allowedValues.includes(value)) {
      throw new Error(`Unsupported ${label} value: ${value}`);
    }
  }

  return selected;
}

const SELECTED_AUTH_MODES = resolveSelection(AUTH_MODES_INPUT, SUPPORTED_AUTH_MODES, 'auth mode');
const SELECTED_LOCALES = resolveSelection(LOCALES_INPUT, SUPPORTED_LOCALES, 'locale');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForApiReady(baseUrl, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.status === 200) return;
    } catch {
      // ignore until next retry
    }

    await sleep(1000);
  }

  throw new Error(`API did not become ready in time at ${baseUrl}`);
}

function runNpmScript(script, expectedPrefix, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    let summary = null;
    let settled = false;

    const child = spawn('npm', ['run', script], {
      env: {
        ...process.env,
        ...envOverrides
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timeoutHandle = setTimeout(() => {
      if (settled) return;

      child.kill('SIGTERM');
      settled = true;
      reject(new Error(`npm run ${script} timed out after ${COMMAND_TIMEOUT_MS}ms`));
    }, COMMAND_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);

      for (const line of text.split('\n')) {
        const parsed = parseSmokeSummaryLine(line.trim(), expectedPrefix);
        if (parsed) summary = parsed;
      }
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk.toString());
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (settled) return;
      clearTimeout(timeoutHandle);

      if (code === 0) {
        if (!summary) {
          settled = true;
          reject(new Error(`npm run ${script} did not produce expected ${expectedPrefix} summary line`));
          return;
        }

        settled = true;
        resolve(summary);
        return;
      }

      settled = true;
      reject(new Error(`npm run ${script} failed with exit code ${code ?? 'unknown'}`));
    });
  });
}

function startApi(authMode) {
  return spawn('npm', ['run', 'dev:api'], {
    env: {
      ...process.env,
      AUTH_MODE: authMode
    },
    stdio: 'inherit'
  });
}

async function stopApi(processHandle) {
  if (!processHandle || processHandle.killed) return;

  processHandle.kill('SIGTERM');
  await sleep(500);

  if (!processHandle.killed) {
    processHandle.kill('SIGKILL');
  }
}

async function withApi(authMode, callback) {
  if (REUSE_EXTERNAL_API) {
    console.log(`↪ Reusing external API at ${BASE_URL} for AUTH_MODE=${authMode}`);
    await waitForApiReady(BASE_URL);
    return callback();
  }

  const api = startApi(authMode);

  try {
    await waitForApiReady(BASE_URL);
    return callback();
  } finally {
    await stopApi(api);
  }
}

async function runHeaderMatrix() {
  console.log('\n▶ Running smoke matrix for AUTH_MODE=header');
  return withApi('header', async () => {
    const runs = [];

    if (SELECTED_LOCALES.includes('es-MX')) {
      runs.push({
        script: 'auth:smoke',
        summary: await runNpmScript('auth:smoke', 'AUTH_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:schema:smoke',
        summary: await runNpmScript('ai:schema:smoke', 'AI_SCHEMA_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:render:smoke',
        summary: await runNpmScript('ai:render:smoke', 'AI_RENDER_SMOKE_SUMMARY')
      });
    }

    if (SELECTED_LOCALES.includes('en-US')) {
      runs.push({
        script: 'auth:smoke:en',
        summary: await runNpmScript('auth:smoke:en', 'AUTH_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:schema:smoke:en',
        summary: await runNpmScript('ai:schema:smoke:en', 'AI_SCHEMA_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:render:smoke:en',
        summary: await runNpmScript('ai:render:smoke:en', 'AI_RENDER_SMOKE_SUMMARY')
      });
    }

    return runs;
  });
}

async function runTokenMatrix() {
  console.log('\n▶ Running smoke matrix for AUTH_MODE=token');
  return withApi('token', async () => {
    const runs = [];

    if (SELECTED_LOCALES.includes('es-MX')) {
      runs.push({
        script: 'auth:smoke:token',
        summary: await runNpmScript('auth:smoke:token', 'AUTH_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:schema:smoke:token',
        summary: await runNpmScript('ai:schema:smoke:token', 'AI_SCHEMA_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:render:smoke:token',
        summary: await runNpmScript('ai:render:smoke:token', 'AI_RENDER_SMOKE_SUMMARY')
      });
    }

    if (SELECTED_LOCALES.includes('en-US')) {
      runs.push({
        script: 'auth:smoke:token:en',
        summary: await runNpmScript('auth:smoke:token:en', 'AUTH_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:schema:smoke:token:en',
        summary: await runNpmScript('ai:schema:smoke:token:en', 'AI_SCHEMA_SMOKE_SUMMARY')
      });
      runs.push({
        script: 'ai:render:smoke:token:en',
        summary: await runNpmScript('ai:render:smoke:token:en', 'AI_RENDER_SMOKE_SUMMARY')
      });
    }

    return runs;
  });
}

async function run() {
  console.log(`Running smoke matrix against ${BASE_URL}`);

  if (REUSE_EXTERNAL_API && SELECTED_AUTH_MODES.length !== 1) {
    throw new Error('SMOKE_MATRIX_REUSE_EXTERNAL_API=true requires exactly one auth mode in SMOKE_MATRIX_AUTH_MODES');
  }

  const headerRuns = SELECTED_AUTH_MODES.includes('header') ? await runHeaderMatrix() : [];
  const tokenRuns = SELECTED_AUTH_MODES.includes('token') ? await runTokenMatrix() : [];
  const summary = {
    baseUrl: BASE_URL,
    selectedAuthModes: SELECTED_AUTH_MODES,
    selectedLocales: SELECTED_LOCALES,
    totalRuns: headerRuns.length + tokenRuns.length,
    runs: [...headerRuns, ...tokenRuns]
  };

  console.log(formatSmokeSummaryLine('SMOKE_MATRIX_SUMMARY', summary));

  if (SUMMARY_FILE) {
    await mkdir(dirname(SUMMARY_FILE), { recursive: true });
    await writeFile(SUMMARY_FILE, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    console.log(`SMOKE_MATRIX_SUMMARY_FILE ${SUMMARY_FILE}`);
  }

  console.log('\n✅ Smoke matrix check passed.');
}

run().catch((error) => {
  console.error(`\n❌ Smoke matrix check failed: ${error.message}`);
  process.exit(1);
});
