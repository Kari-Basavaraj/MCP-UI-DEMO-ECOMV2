#!/usr/bin/env bash
set -euo pipefail

check() {
  local name="$1"
  local url="$2"
  local status
  status="$(curl -sS -o /dev/null -w "%{http_code}" "$url" || true)"
  if [[ "$status" != "200" ]]; then
    echo "[dev-health] FAIL ${name} ${url} -> HTTP ${status}"
    return 1
  fi
  echo "[dev-health] OK   ${name} ${url}"
}

check_page_content() {
  local name="$1"
  local url="$2"
  local body
  body="$(curl -sS "$url" || true)"
  if echo "$body" | grep -qi "Internal Server Error"; then
    echo "[dev-health] FAIL ${name} ${url} -> body contains Internal Server Error"
    return 1
  fi
  echo "[dev-health] OK   ${name} body content"
}

check "web-root" "http://localhost:3000/"
check_page_content "web-root" "http://localhost:3000/"
check "web-models" "http://localhost:3000/api/models"
check "mcp-health" "http://localhost:8787/api/health"

echo "[dev-health] all checks passed"
