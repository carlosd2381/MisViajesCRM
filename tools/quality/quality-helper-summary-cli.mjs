import {
  QUALITY_HELPER_TESTS_SUMMARY_PREFIX,
  formatQualitySummaryLine,
  parseQualitySummaryLine
} from './quality-summary-helpers.mjs';

function printUsage() {
  console.error('Usage:');
  console.error('  node tools/quality/quality-helper-summary-cli.mjs format <passCount> <failCount>');
  console.error('  node tools/quality/quality-helper-summary-cli.mjs parse <summaryLine>');
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

if (command === 'format') {
  if (args.length !== 2) {
    printUsage();
    process.exit(1);
  }

  const pass = Number(args[0]);
  const failCount = Number(args[1]);
  if (!Number.isFinite(pass) || !Number.isFinite(failCount)) {
    fail('format command requires numeric passCount and failCount');
  }

  const line = formatQualitySummaryLine(QUALITY_HELPER_TESTS_SUMMARY_PREFIX, {
    pass,
    fail: failCount
  });

  console.log(line);
  process.exit(0);
}

if (command === 'parse') {
  if (args.length !== 1) {
    printUsage();
    process.exit(1);
  }

  const parsed = parseQualitySummaryLine(args[0], QUALITY_HELPER_TESTS_SUMMARY_PREFIX);
  if (!parsed || typeof parsed.pass !== 'number' || typeof parsed.fail !== 'number') {
    fail('Invalid QUALITY_HELPER_TESTS_SUMMARY contract output');
  }

  console.log(JSON.stringify(parsed));
  process.exit(0);
}

printUsage();
process.exit(1);
