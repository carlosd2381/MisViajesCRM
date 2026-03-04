import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSmokeSummaryLine } from './smoke-summary-helpers.mjs';

const MATRIX_PATH = join(process.cwd(), 'tools', 'ops', 'smoke-matrix-check.mjs');

test('smoke matrix contract-only mode emits contract summary without running smoke scripts', () => {
  const result = spawnSync(process.execPath, [MATRIX_PATH, '--contract-only'], {
    encoding: 'utf8'
  });

  assert.equal(result.status, 0);
  const lines = result.stdout.split('\n').map((line) => line.trim());
  const summaryLine = lines.find((line) => line.startsWith('SMOKE_MATRIX_SUMMARY '));
  assert.ok(summaryLine);

  const parsed = parseSmokeSummaryLine(summaryLine, 'SMOKE_MATRIX_SUMMARY');
  assert.ok(parsed);
  assert.equal(parsed.contractOnly, true);
  assert.equal(parsed.totalRuns, 0);
  assert.deepEqual(parsed.validatedContracts, [
    'AUTH_SMOKE_SUMMARY',
    'AI_SCHEMA_SMOKE_SUMMARY',
    'AI_RENDER_SMOKE_SUMMARY'
  ]);
});

test('smoke matrix contract-only mode writes summary file when requested', () => {
  const tempRoot = mkdtempSync(join(tmpdir(), 'misviajes-smoke-matrix-contract-'));
  const summaryPath = join(tempRoot, 'summary.json');

  const result = spawnSync(process.execPath, [MATRIX_PATH], {
    encoding: 'utf8',
    env: {
      ...process.env,
      SMOKE_MATRIX_CONTRACT_ONLY: 'true',
      SMOKE_MATRIX_SUMMARY_FILE: summaryPath
    }
  });

  assert.equal(result.status, 0);
  const payload = JSON.parse(readFileSync(summaryPath, 'utf8'));
  assert.equal(payload.contractOnly, true);
  assert.equal(payload.totalRuns, 0);
  assert.deepEqual(payload.runs, []);
});