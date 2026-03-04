import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT_PATH = join(process.cwd(), 'tools', 'ops', 'ci-smoke-summary.sh');

function runScript(args, summaryFilePath) {
  return spawnSync('bash', [SCRIPT_PATH, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_STEP_SUMMARY: summaryFilePath
    }
  });
}

test('ci-smoke-summary extracts, parses and publishes with context lines', () => {
  const root = mkdtempSync(join(tmpdir(), 'misviajes-ci-smoke-summary-'));
  const summaryFilePath = join(root, 'step-summary.md');
  const logFilePath = join(root, 'auth-smoke-output.log');

  writeFileSync(logFilePath, 'some log\nAUTH_SMOKE_SUMMARY {"locale":"es-MX","ok":true}\n', 'utf8');

  const result = runScript(
    [
      'Auth smoke (header, es-MX)',
      'AUTH_SMOKE_SUMMARY',
      logFilePath,
      'AUTH_MODE=header',
      'AUTH_SMOKE_LOCALE=es-MX'
    ],
    summaryFilePath
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Auth smoke \(header, es-MX\) run summary/);
  assert.match(result.stdout, /- AUTH_MODE=header/);
  assert.match(result.stdout, /- AUTH_SMOKE_LOCALE=es-MX/);
  assert.match(result.stdout, /- AUTH_SMOKE_SUMMARY \{"locale":"es-MX","ok":true\}/);

  const stepSummary = readFileSync(summaryFilePath, 'utf8');
  assert.match(stepSummary, /### Auth smoke \(header, es-MX\)/);
  assert.match(stepSummary, /- AUTH_SMOKE_SUMMARY \{"locale":"es-MX","ok":true\}/);
  assert.match(stepSummary, /- Parsed summary: \{"locale":"es-MX","ok":true\}/);
});

test('ci-smoke-summary fails when summary line is missing', () => {
  const root = mkdtempSync(join(tmpdir(), 'misviajes-ci-smoke-summary-'));
  const summaryFilePath = join(root, 'step-summary.md');
  const logFilePath = join(root, 'smoke-output.log');

  writeFileSync(logFilePath, 'no summary line\n', 'utf8');

  const result = runScript(['Smoke matrix', 'SMOKE_MATRIX_SUMMARY', logFilePath], summaryFilePath);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /SMOKE_MATRIX_SUMMARY line not found in output/);
});
