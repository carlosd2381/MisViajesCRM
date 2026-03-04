import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const requiredDocs = [
  'docs/planning/build-plan.md',
  'docs/data/data-dictionary.md',
  'docs/governance/project-constraints.md'
];

const missing = requiredDocs.filter((relativePath) => !existsSync(join(ROOT, relativePath)));

if (missing.length > 0) {
  console.error('\n❌ Required project docs are missing:');
  for (const filePath of missing) {
    console.error(`- ${filePath}`);
  }
  process.exit(1);
}

console.log('✅ Required docs check passed.');
