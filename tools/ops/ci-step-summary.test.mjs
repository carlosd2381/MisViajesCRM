import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const SCRIPT_PATH = join(process.cwd(), 'tools', 'ops', 'ci-step-summary.sh');

function runScript(args, summaryFilePath) {
  return spawnSync('bash', [SCRIPT_PATH, ...args], {
    encoding: 'utf8',
    env: {
      ...process.env,
      GITHUB_STEP_SUMMARY: summaryFilePath
    }
  });
}

test('ci-step-summary appends section with parsed summary', () => {
  const root = mkdtempSync(join(tmpdir(), 'misviajes-ci-summary-'));
  const summaryFilePath = join(root, 'step-summary.md');

  const result = runScript(['Auth smoke (token, en-US)', 'AUTH_SMOKE_SUMMARY {"locale":"en-US"}', '{"locale":"en-US"}'], summaryFilePath);
  assert.equal(result.status, 0);

  const output = readFileSync(summaryFilePath, 'utf8');
  assert.match(output, /### Auth smoke \(token, en-US\)/);
  assert.match(output, /- AUTH_SMOKE_SUMMARY \{"locale":"en-US"\}/);
  assert.match(output, /- Parsed summary: \{"locale":"en-US"\}/);
});

test('ci-step-summary appends section without parsed summary', () => {
  const root = mkdtempSync(join(tmpdir(), 'misviajes-ci-summary-'));
  const summaryFilePath = join(root, 'step-summary.md');

  const result = runScript(['Smoke matrix', 'SMOKE_MATRIX_SUMMARY {"totalRuns":6}'], summaryFilePath);
  assert.equal(result.status, 0);

  const output = readFileSync(summaryFilePath, 'utf8');
  assert.match(output, /### Smoke matrix/);
  assert.match(output, /- SMOKE_MATRIX_SUMMARY \{"totalRuns":6\}/);
  assert.doesNotMatch(output, /Parsed summary:/);
});
