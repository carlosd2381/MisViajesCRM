import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const CODEOWNERS_PATH = join(ROOT, '.github', 'CODEOWNERS');

const PLACEHOLDER_PATTERNS = [
  '@your-org/',
  '@example/',
  'TODO: Replace placeholder handles'
];

if (!existsSync(CODEOWNERS_PATH)) {
  console.error('\n❌ CODEOWNERS file is missing: .github/CODEOWNERS');
  process.exit(1);
}

const content = readFileSync(CODEOWNERS_PATH, 'utf8');
const lines = content.split(/\r?\n/);

const hasOwnerRule = lines.some((line) => {
  const trimmed = line.trim();
  return trimmed && !trimmed.startsWith('#') && trimmed.includes('@');
});

if (!hasOwnerRule) {
  console.error('\n❌ CODEOWNERS has no active owner rules.');
  process.exit(1);
}

const violations = PLACEHOLDER_PATTERNS.filter((pattern) => content.includes(pattern));
if (violations.length > 0) {
  console.error('\n❌ CODEOWNERS contains placeholder values:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('✅ CODEOWNERS check passed.');
