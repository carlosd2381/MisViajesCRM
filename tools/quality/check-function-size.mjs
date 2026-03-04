import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = process.cwd();
const TARGET_DIR = join(ROOT, 'src');
const SOFT_MAX_FUNCTION_LINES = 30;
const HARD_MAX_FUNCTION_LINES = 60;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

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

function countEffectiveLines(block) {
  const lines = block.split(/\r?\n/);
  return lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'))
    .length;
}

function findPotentialFunctions(content) {
  const regexes = [
    /function\s+[A-Za-z0-9_]+\s*\([^)]*\)\s*\{/g,
    /const\s+[A-Za-z0-9_]+\s*=\s*(async\s*)?\([^)]*\)\s*=>\s*\{/g,
    /[A-Za-z0-9_]+\s*:\s*(async\s*)?\([^)]*\)\s*=>\s*\{/g
  ];

  const matches = [];
  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push({ index: match.index, signature: match[0] });
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

function extractFunctionBlock(content, startIndex) {
  const openBraceIndex = content.indexOf('{', startIndex);
  if (openBraceIndex === -1) return null;

  let depth = 0;
  for (let index = openBraceIndex; index < content.length; index += 1) {
    const char = content[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) {
      return content.slice(openBraceIndex, index + 1);
    }
  }

  return null;
}

const files = walk(TARGET_DIR);
const warnings = [];
const violations = [];

for (const filePath of files) {
  const content = readFileSync(filePath, 'utf8');
  const functions = findPotentialFunctions(content);

  for (const item of functions) {
    const block = extractFunctionBlock(content, item.index);
    if (!block) continue;

    const lineCount = countEffectiveLines(block);
    if (lineCount > SOFT_MAX_FUNCTION_LINES) {
      warnings.push({ filePath, lineCount, signature: item.signature });
    }

    if (lineCount > HARD_MAX_FUNCTION_LINES) {
      violations.push({ filePath, lineCount, signature: item.signature });
    }
  }
}

if (warnings.length > 0) {
  console.warn(`\n⚠️ Function size target exceeded (soft max ${SOFT_MAX_FUNCTION_LINES} effective lines):`);
  for (const warning of warnings) {
    console.warn(`- ${warning.filePath}: ${warning.lineCount} lines in ${warning.signature}`);
  }
  console.warn('Use excepción documentada en PR/ADR cuando aplique.\n');
}

if (violations.length > 0) {
  console.error(`\n❌ Function size hard cap violated (max ${HARD_MAX_FUNCTION_LINES} effective lines):`);
  for (const violation of violations) {
    console.error(`- ${violation.filePath}: ${violation.lineCount} lines in ${violation.signature}`);
  }
  process.exit(1);
}

console.log('✅ Function size check passed (no hard-cap violations).');
