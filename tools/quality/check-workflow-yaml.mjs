import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseDocument } from 'yaml';

const ROOT = process.cwd();
const WORKFLOWS_DIR = join(ROOT, '.github', 'workflows');

const workflowFiles = readdirSync(WORKFLOWS_DIR)
  .filter((fileName) => fileName.endsWith('.yml') || fileName.endsWith('.yaml'))
  .sort();

if (workflowFiles.length === 0) {
  console.error('\n❌ No workflow files found in .github/workflows');
  process.exit(1);
}

let hasErrors = false;

for (const fileName of workflowFiles) {
  const absolutePath = join(WORKFLOWS_DIR, fileName);
  const source = readFileSync(absolutePath, 'utf8');
  const document = parseDocument(source);

  if (document.errors.length > 0) {
    hasErrors = true;
    console.error(`\n❌ YAML parse errors in .github/workflows/${fileName}:`);
    for (const error of document.errors) {
      console.error(`- ${error.message}`);
    }
    continue;
  }

  const data = document.toJS();
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    hasErrors = true;
    console.error(`\n❌ Invalid workflow root object in .github/workflows/${fileName}`);
    continue;
  }

  if (!('on' in data)) {
    hasErrors = true;
    console.error(`\n❌ Missing required key "on" in .github/workflows/${fileName}`);
  }

  const jobs = data.jobs;
  if (!jobs || typeof jobs !== 'object' || Array.isArray(jobs) || Object.keys(jobs).length === 0) {
    hasErrors = true;
    console.error(`\n❌ Missing or empty "jobs" map in .github/workflows/${fileName}`);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('✅ Workflow YAML check passed.');
