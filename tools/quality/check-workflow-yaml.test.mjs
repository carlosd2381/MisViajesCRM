import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateWorkflowYaml } from './check-workflow-yaml.mjs';

function createWorkspaceWithWorkflows(files) {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'misviajes-workflow-check-'));
  const workflowsDir = join(workspaceRoot, '.github', 'workflows');
  mkdirSync(workflowsDir, { recursive: true });

  for (const [fileName, content] of Object.entries(files)) {
    writeFileSync(join(workflowsDir, fileName), content, 'utf8');
  }

  return workspaceRoot;
}

function readQualityWorkflowSource() {
  const qualityWorkflowPath = join(process.cwd(), '.github', 'workflows', 'quality.yml');
  return readFileSync(qualityWorkflowPath, 'utf8');
}

function assertStepExists(source, stepName) {
  const index = source.indexOf(`- name: ${stepName}`);
  assert.notEqual(index, -1, `Missing workflow step: ${stepName}`);
  return index;
}

function assertStepOrder(source, beforeStepName, afterStepName) {
  const beforeIndex = assertStepExists(source, beforeStepName);
  const afterIndex = assertStepExists(source, afterStepName);
  assert.ok(beforeIndex < afterIndex, `${beforeStepName} must appear before ${afterStepName}`);
}

test('validateWorkflowYaml passes for valid workflow files', () => {
  const root = createWorkspaceWithWorkflows({
    'quality.yml': 'name: Quality\non: [push]\njobs:\n  quality:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo ok\n'
  });

  const errors = validateWorkflowYaml(root);
  assert.deepEqual(errors, []);
});

test('validateWorkflowYaml reports missing jobs map', () => {
  const root = createWorkspaceWithWorkflows({
    'broken.yml': 'name: Broken\non: [push]\n'
  });

  const errors = validateWorkflowYaml(root);
  assert.ok(errors.some((message) => message.includes('Missing or empty "jobs" map')));
});

test('validateWorkflowYaml reports invalid YAML syntax', () => {
  const root = createWorkspaceWithWorkflows({
    'invalid.yml': 'name: Invalid\non: [push\njobs:\n  test:\n    runs-on: ubuntu-latest\n'
  });

  const errors = validateWorkflowYaml(root);
  assert.ok(errors.some((message) => message.includes('YAML parse errors')));
});

test('validateWorkflowYaml reports missing workflows directory', () => {
  const root = mkdtempSync(join(tmpdir(), 'misviajes-workflow-check-missing-'));
  const errors = validateWorkflowYaml(root);

  assert.deepEqual(errors, ['❌ Workflows directory is missing: .github/workflows']);
});

test('quality workflow keeps smoke contract preflight and summary steps', () => {
  const source = readQualityWorkflowSource();

  assertStepExists(source, 'Run smoke contract preflight');
  assert.match(source, /npm run smoke:matrix:contract\s*\|\s*tee\s+smoke-matrix-contract-output\.log/);
  assertStepExists(source, 'Smoke contract preflight summary');
  assert.match(source, /ci-smoke-summary\.sh\s+"Smoke matrix contract preflight"\s+SMOKE_MATRIX_SUMMARY\s+smoke-matrix-contract-output\.log/);
  assertStepOrder(source, 'Run smoke contract preflight', 'Run quality checks');
});
