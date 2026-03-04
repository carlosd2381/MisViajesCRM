import { spawn } from 'node:child_process';

const BASE_URL = process.env.SMOKE_MATRIX_BASE_URL ?? 'http://127.0.0.1:3000';

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

function parseSummaryLine(line, expectedPrefix) {
  if (!line.startsWith(expectedPrefix)) return null;

  const payload = line.slice(expectedPrefix.length).trim();
  try {
    return JSON.parse(payload);
  } catch {
    throw new Error(`Invalid JSON payload for ${expectedPrefix}`);
  }
}

function runNpmScript(script, expectedPrefix, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    let summary = null;

    const child = spawn('npm', ['run', script], {
      env: {
        ...process.env,
        ...envOverrides
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);

      for (const line of text.split('\n')) {
        const parsed = parseSummaryLine(line.trim(), expectedPrefix);
        if (parsed) summary = parsed;
      }
    });

    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk.toString());
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        if (!summary) {
          reject(new Error(`npm run ${script} did not produce expected ${expectedPrefix} line`));
          return;
        }

        resolve(summary);
        return;
      }

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

async function runHeaderMatrix() {
  console.log('\n▶ Running smoke matrix for AUTH_MODE=header');
  const api = startApi('header');

  try {
    await waitForApiReady(BASE_URL);

    return [
      {
        script: 'auth:smoke',
        summary: await runNpmScript('auth:smoke', 'AUTH_SMOKE_SUMMARY ')
      },
      {
        script: 'auth:smoke:en',
        summary: await runNpmScript('auth:smoke:en', 'AUTH_SMOKE_SUMMARY ')
      },
      {
        script: 'ai:schema:smoke',
        summary: await runNpmScript('ai:schema:smoke', 'AI_SCHEMA_SMOKE_SUMMARY ')
      },
      {
        script: 'ai:schema:smoke:en',
        summary: await runNpmScript('ai:schema:smoke:en', 'AI_SCHEMA_SMOKE_SUMMARY ')
      }
    ];
  } finally {
    await stopApi(api);
  }
}

async function runTokenMatrix() {
  console.log('\n▶ Running smoke matrix for AUTH_MODE=token');
  const api = startApi('token');

  try {
    await waitForApiReady(BASE_URL);

    return [
      {
        script: 'auth:smoke:token',
        summary: await runNpmScript('auth:smoke:token', 'AUTH_SMOKE_SUMMARY ')
      },
      {
        script: 'auth:smoke:token:en',
        summary: await runNpmScript('auth:smoke:token:en', 'AUTH_SMOKE_SUMMARY ')
      },
      {
        script: 'ai:schema:smoke:token',
        summary: await runNpmScript('ai:schema:smoke:token', 'AI_SCHEMA_SMOKE_SUMMARY ')
      },
      {
        script: 'ai:schema:smoke:token:en',
        summary: await runNpmScript('ai:schema:smoke:token:en', 'AI_SCHEMA_SMOKE_SUMMARY ')
      }
    ];
  } finally {
    await stopApi(api);
  }
}

async function run() {
  console.log(`Running smoke matrix against ${BASE_URL}`);

  const headerRuns = await runHeaderMatrix();
  const tokenRuns = await runTokenMatrix();
  const summary = {
    baseUrl: BASE_URL,
    totalRuns: headerRuns.length + tokenRuns.length,
    runs: [...headerRuns, ...tokenRuns]
  };

  console.log(`SMOKE_MATRIX_SUMMARY ${JSON.stringify(summary)}`);
  console.log('\n✅ Smoke matrix check passed.');
}

run().catch((error) => {
  console.error(`\n❌ Smoke matrix check failed: ${error.message}`);
  process.exit(1);
});
