import { readFileSync } from 'node:fs';
import { parseSmokeSummaryLine } from './smoke-summary-helpers.mjs';

function printUsage() {
  console.error('Usage:');
  console.error('  node tools/ops/smoke-summary-cli.mjs extract <prefix> <logFilePath>');
  console.error('  node tools/ops/smoke-summary-cli.mjs parse <prefix> <summaryLine>');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);

if (!command) {
  printUsage();
  process.exit(1);
}

if (command === 'extract') {
  if (args.length !== 2) {
    printUsage();
    process.exit(1);
  }

  const [prefix, logFilePath] = args;
  const content = readFileSync(logFilePath, 'utf8');
  const expectedStart = `${prefix} `;
  const lines = content.split(/\r?\n/);

  let summaryLine = null;
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith(expectedStart)) {
      summaryLine = trimmedLine;
    }
  }

  if (!summaryLine) {
    fail(`${prefix} line not found in output`);
  }

  console.log(summaryLine);
  process.exit(0);
}

if (command === 'parse') {
  if (args.length !== 2) {
    printUsage();
    process.exit(1);
  }

  const [prefix, summaryLine] = args;
  const parsed = parseSmokeSummaryLine(summaryLine, prefix);
  if (!parsed) {
    fail(`Summary line does not match prefix ${prefix}`);
  }

  console.log(JSON.stringify(parsed));
  process.exit(0);
}

printUsage();
process.exit(1);
