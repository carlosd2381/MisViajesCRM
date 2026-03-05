#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? ''
  };
}

function hasRequiredWorkflowFeatures(yaml) {
  return {
    hasForceInput: /force_postgres_integration:/.test(yaml),
    hasPostgresJob: /\n\s*postgres-integration:\s*/.test(yaml)
  };
}

const ghVersion = run('gh', ['--version']);
if (!ghVersion.ok) {
  console.log('POSTGRES_CI_READINESS_SUMMARY {"ready":false,"reason":"gh_not_installed"}');
  process.exit(1);
}

const authStatus = run('gh', ['auth', 'status']);
if (!authStatus.ok) {
  console.log('POSTGRES_CI_READINESS_SUMMARY {"ready":false,"reason":"gh_not_authenticated"}');
  process.exit(1);
}

const repoView = run('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner']);
if (!repoView.ok || !repoView.stdout) {
  console.log('POSTGRES_CI_READINESS_SUMMARY {"ready":false,"reason":"repo_unresolved"}');
  process.exit(1);
}

const qualityWorkflow = run('gh', ['workflow', 'view', 'quality.yml', '--yaml']);
if (!qualityWorkflow.ok) {
  console.log('POSTGRES_CI_READINESS_SUMMARY {"ready":false,"reason":"quality_workflow_unavailable"}');
  process.exit(1);
}

const features = hasRequiredWorkflowFeatures(qualityWorkflow.stdout);
const ready = features.hasForceInput && features.hasPostgresJob;

const nightlyWorkflow = run('gh', ['workflow', 'view', 'postgres-nightly.yml', '--yaml']);
const hasNightlyWorkflow = nightlyWorkflow.ok;

const summary = {
  ready,
  repository: repoView.stdout,
  qualityWorkflow: {
    hasForceInput: features.hasForceInput,
    hasPostgresJob: features.hasPostgresJob
  },
  hasNightlyWorkflow
};

console.log(`POSTGRES_CI_READINESS_SUMMARY ${JSON.stringify(summary)}`);

if (!ready) {
  process.exit(2);
}
