#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage:"
  echo "  bash tools/ops/ci-step-summary.sh <title> <summary_line> [parsed_summary]"
}

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage
  exit 1
fi

if [[ -z "${GITHUB_STEP_SUMMARY:-}" ]]; then
  echo "GITHUB_STEP_SUMMARY is not set"
  exit 1
fi

title="$1"
summary_line="$2"
parsed_summary="${3:-}"

{
  echo "### ${title}"
  echo ""
  echo "- ${summary_line}"
  if [[ -n "$parsed_summary" ]]; then
    echo "- Parsed summary: ${parsed_summary}"
  fi
} >> "$GITHUB_STEP_SUMMARY"
