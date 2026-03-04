#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage:"
  echo "  bash tools/ops/ci-smoke-summary.sh <title> <summary_prefix> <log_file> [context_line ...]"
}

if [[ $# -lt 3 ]]; then
  usage
  exit 1
fi

title="$1"
summary_prefix="$2"
log_file="$3"
shift 3

summary_line=$(node tools/ops/smoke-summary-cli.mjs extract "$summary_prefix" "$log_file")
parsed_summary=$(node tools/ops/smoke-summary-cli.mjs parse "$summary_prefix" "$summary_line")

echo "${title} run summary"
for context_line in "$@"; do
  echo "- ${context_line}"
done
echo "- ${summary_line}"

bash tools/ops/ci-step-summary.sh "$title" "$summary_line" "$parsed_summary"
