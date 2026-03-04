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

function runNpmScript(script, envOverrides = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', script], {
      env: {
        ...process.env,
        ...envOverrides
      },
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
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
    await runNpmScript('auth:smoke');
    await runNpmScript('auth:smoke:en');
    await runNpmScript('ai:schema:smoke');
    await runNpmScript('ai:schema:smoke:en');
  } finally {
    await stopApi(api);
  }
}

async function runTokenMatrix() {
  console.log('\n▶ Running smoke matrix for AUTH_MODE=token');
  const api = startApi('token');

  try {
    await waitForApiReady(BASE_URL);
    await runNpmScript('auth:smoke:token');
    await runNpmScript('auth:smoke:token:en');
    await runNpmScript('ai:schema:smoke:token');
    await runNpmScript('ai:schema:smoke:token:en');
  } finally {
    await stopApi(api);
  }
}

async function run() {
  console.log(`Running smoke matrix against ${BASE_URL}`);
  await runHeaderMatrix();
  await runTokenMatrix();
  console.log('\n✅ Smoke matrix check passed.');
}

run().catch((error) => {
  console.error(`\n❌ Smoke matrix check failed: ${error.message}`);
  process.exit(1);
});
