import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SOFT_MAX_LINES = 300;
const HARD_MAX_LINES = 450;
const ROOT = process.cwd();
const TARGET_DIR = join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py']);

function walk(dirPath) {
  const entries = readdirSync(dirPath);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next') {
        continue;
      }
      files.push(...walk(fullPath));
      continue;
    }

    if (SOURCE_EXTENSIONS.has(extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

const files = walk(TARGET_DIR);
const warnings = [];
const violations = [];

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8');
  const lineCount = countLines(content);

  if (lineCount > SOFT_MAX_LINES) {
    warnings.push({ filePath, lineCount });
  }

  if (lineCount > HARD_MAX_LINES) {
    violations.push({ filePath, lineCount });
  }
}

if (warnings.length > 0) {
  console.warn(`\n⚠️ File size target exceeded (soft max ${SOFT_MAX_LINES} lines):`);
  for (const warning of warnings) {
    console.warn(`- ${warning.filePath}: ${warning.lineCount} lines`);
  }
  console.warn(`Use excepción documentada en PR/ADR si no se puede dividir de inmediato.\n`);
}

if (violations.length > 0) {
  console.error(`\n❌ File size hard cap violated (max ${HARD_MAX_LINES} lines):`);
  for (const violation of violations) {
    console.error(`- ${violation.filePath}: ${violation.lineCount} lines`);
  }
  process.exit(1);
}

console.log('✅ File size check passed (no hard-cap violations).');
