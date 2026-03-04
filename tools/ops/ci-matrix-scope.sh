#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage:"
  echo "  bash tools/ops/ci-matrix-scope.sh <event_name> <selected_mode> <selected_locale> <matrix_mode> <matrix_locale>"
}

if [[ $# -ne 5 ]]; then
  usage
  exit 1
fi

event_name="$1"
selected_mode="$2"
selected_locale="$3"
matrix_mode="$4"
matrix_locale="$5"

run_combo=true

if [[ "$event_name" == "workflow_dispatch" ]]; then
  if [[ "$selected_mode" != "both" && "$selected_mode" != "$matrix_mode" ]]; then
    run_combo=false
  fi

  if [[ "$selected_locale" != "both" && "$selected_locale" != "$matrix_locale" ]]; then
    run_combo=false
  fi
fi

echo "run_combo=${run_combo}"
