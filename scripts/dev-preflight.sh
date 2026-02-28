#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

kill_listener() {
  local port="$1"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    echo "[dev-preflight] stopping stale listener(s) on :${port} -> ${pids//$'\n'/, }"
    # shellcheck disable=SC2086
    kill ${pids} 2>/dev/null || true
    sleep 1
  fi

  local remaining
  remaining="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [[ -n "${remaining}" ]]; then
    echo "[dev-preflight] forcing stop on :${port} -> ${remaining//$'\n'/, }"
    # shellcheck disable=SC2086
    kill -9 ${remaining} 2>/dev/null || true
    sleep 1
  fi
}

kill_listener 3000
kill_listener 8787

find "${ROOT_DIR}/web-client" -maxdepth 1 -type d -name ".next.corrupt.*" -print0 2>/dev/null | while IFS= read -r -d '' dir; do
  echo "[dev-preflight] removing stale cache dir ${dir}"
  rm -rf "${dir}"
done

echo "[dev-preflight] done"

# quick sanity for required env file
if [[ ! -f "${ROOT_DIR}/web-client/.env.local" ]]; then
  echo "[dev-preflight] warning: web-client/.env.local missing"
fi
