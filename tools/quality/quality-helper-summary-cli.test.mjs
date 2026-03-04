import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const CLI_PATH = join(process.cwd(), 'tools', 'quality', 'quality-helper-summary-cli.mjs');

function runCli(args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    encoding: 'utf8'
  });
}

test('quality helper summary cli formats summary line', () => {
  const result = runCli(['format', '5', '0']);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'QUALITY_HELPER_TESTS_SUMMARY {"pass":5,"fail":0}');
});

test('quality helper summary cli parses valid summary line', () => {
  const result = runCli(['parse', 'QUALITY_HELPER_TESTS_SUMMARY {"pass":2,"fail":1}']);

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), '{"pass":2,"fail":1}');
});

test('quality helper summary cli fails for invalid parse payload', () => {
  const result = runCli(['parse', 'QUALITY_HELPER_TESTS_SUMMARY {"pass":']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JSON payload for QUALITY_HELPER_TESTS_SUMMARY/);
});
