#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage:"
  echo "  bash tools/ops/ci-api-lifecycle.sh start <auth_mode> <log_file> <pid_file>"
  echo "  bash tools/ops/ci-api-lifecycle.sh wait <base_url> [attempts] [sleep_seconds]"
  echo "  bash tools/ops/ci-api-lifecycle.sh stop <pid_file>"
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

command="$1"
shift

case "$command" in
  start)
    if [[ $# -ne 3 ]]; then
      usage
      exit 1
    fi

    auth_mode="$1"
    log_file="$2"
    pid_file="$3"

    AUTH_MODE="$auth_mode" npm run dev:api > "$log_file" 2>&1 &
    echo $! > "$pid_file"
    ;;

  wait)
    if [[ $# -lt 1 || $# -gt 3 ]]; then
      usage
      exit 1
    fi

    base_url="$1"
    attempts="${2:-30}"
    sleep_seconds="${3:-1}"

    for ((i=1; i<=attempts; i+=1)); do
      if curl -fsS "$base_url/health" >/dev/null; then
        exit 0
      fi
      sleep "$sleep_seconds"
    done

    echo "API did not become ready in time"
    exit 1
    ;;

  stop)
    if [[ $# -ne 1 ]]; then
      usage
      exit 1
    fi

    pid_file="$1"
    if [[ -f "$pid_file" ]]; then
      kill "$(cat "$pid_file")" || true
    fi
    ;;

  *)
    usage
    exit 1
    ;;
esac
