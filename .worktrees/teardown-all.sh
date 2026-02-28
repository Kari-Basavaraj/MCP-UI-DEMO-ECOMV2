#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

for d in .worktrees/BAS-*; do
  [ -d "$d" ] && git worktree remove "$d"
done

for b in codex/bas-113 codex/bas-114 codex/bas-115 codex/bas-116 codex/bas-117 codex/bas-118 codex/bas-119 codex/bas-120 codex/bas-121; do
  git branch -D "$b" 2>/dev/null || true
done

git worktree prune
