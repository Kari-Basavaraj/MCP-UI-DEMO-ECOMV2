# Worktree Map (Reversible Setup)

This directory contains per-issue isolated worktrees for parallel execution.

## Remove One Worktree
```bash
git worktree remove .worktrees/BAS-113
```

## Remove All Issue Worktrees
```bash
for d in .worktrees/BAS-*; do git worktree remove "$d"; done
```

## Delete Issue Branches After Worktree Removal
```bash
for b in codex/bas-113 codex/bas-114 codex/bas-115 codex/bas-116 codex/bas-117 codex/bas-118 codex/bas-119 codex/bas-120 codex/bas-121; do git branch -D "$b"; done
```

## Prune Metadata
```bash
git worktree prune
```
