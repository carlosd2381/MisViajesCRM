import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const SCRIPT_PATH = join(process.cwd(), 'tools', 'ops', 'ci-matrix-scope.sh');

function runScript(args) {
  return spawnSync('bash', [SCRIPT_PATH, ...args], {
    encoding: 'utf8'
  });
}

test('ci-matrix-scope defaults to true for non-dispatch events', () => {
  const result = runScript(['push', '', '', 'token', 'en-US']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'run_combo=true');
});

test('ci-matrix-scope respects mode selection during workflow_dispatch', () => {
  const result = runScript(['workflow_dispatch', 'token', 'both', 'header', 'es-MX']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'run_combo=false');
});

test('ci-matrix-scope respects locale selection during workflow_dispatch', () => {
  const result = runScript(['workflow_dispatch', 'both', 'en-US', 'token', 'es-MX']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'run_combo=false');
});

test('ci-matrix-scope allows matching dispatch combination', () => {
  const result = runScript(['workflow_dispatch', 'token', 'en-US', 'token', 'en-US']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), 'run_combo=true');
});
