import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const CLI_PATH = join(process.cwd(), 'tools', 'ops', 'smoke-summary-cli.mjs');

function runCli(args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8'
  });
}

function writeTempLog(content) {
  const root = mkdtempSync(join(tmpdir(), 'misviajes-smoke-summary-cli-'));
  const logPath = join(root, 'smoke.log');
  writeFileSync(logPath, content, 'utf8');
  return logPath;
}

test('smoke summary cli extracts the latest matching summary line', () => {
  const logPath = writeTempLog([
    'AUTH_SMOKE_SUMMARY {"locale":"es-MX"}',
    'other line',
    'AUTH_SMOKE_SUMMARY {"locale":"en-US"}'
  ].join('\n'));

  const result = runCli(['extract', 'AUTH_SMOKE_SUMMARY', logPath]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'AUTH_SMOKE_SUMMARY {"locale":"en-US"}');
});

test('smoke summary cli parses a matching summary line', () => {
  const result = runCli(['parse', 'AI_SCHEMA_SMOKE_SUMMARY', 'AI_SCHEMA_SMOKE_SUMMARY {"schemaVersion":"ai-proposal.v1"}']);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '{"schemaVersion":"ai-proposal.v1"}');
});

test('smoke summary cli fails when summary line is missing', () => {
  const logPath = writeTempLog('no summary here');

  const result = runCli(['extract', 'SMOKE_MATRIX_SUMMARY', logPath]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SMOKE_MATRIX_SUMMARY/i);
    assert.match(result.stderr, /(not found|missing|summary line)/i);
});
