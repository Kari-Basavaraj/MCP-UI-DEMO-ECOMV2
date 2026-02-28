# Branch Reconciliation Protocol

Purpose: keep `main` as canonical, avoid ambiguous merge state from cherry-pick workflows, and make cleanup reversible.

## 1. Canonical Source Rule
1. `main` is the delivery source of truth.
2. Work branches are implementation vehicles, not historical truth after integration.
3. Merge status must be evaluated by both ancestry and patch-equivalence.

## 2. Required Verification Before Any Cleanup
1. Run ancestry check:
```bash
git merge-base --is-ancestor <branch> main && echo MERGED || echo NOT_ANCESTOR
```
2. Run patch-equivalence check:
```bash
git cherry main <branch>
```
3. Interpret `git cherry`:
- `- <commit>` means patch-equivalent to `main`
- `+ <commit>` means branch has non-equivalent delta vs `main`

## 3. Classification Matrix
1. `NOT_ANCESTOR` + `cherry=-`:
- Equivalent outcome already in `main`.
- Safe cleanup candidate after archive tag.
2. `NOT_ANCESTOR` + `cherry=+`:
- Branch diverges from `main`.
- Do not merge blindly.
- Keep for review, or archive then remove only with explicit approval.
3. `ANCESTOR`:
- Fully merged by history.
- Standard cleanup candidate after archive tag.

## 4. Reversible Cleanup Procedure
1. Create archive tags first for every branch head targeted for cleanup.
2. Record tag -> branch -> commit mapping in a report doc and tracker issue.
3. Remove worktrees.
4. Delete local branches only after tags exist.
5. Never run destructive bulk commands without explicit approval.

## 5. Recovery Procedure
1. Restore deleted branch from archive tag:
```bash
git checkout -b <branch-name> <archive-tag>
```
2. Recreate worktree if needed:
```bash
git worktree add .worktrees/<name> <branch-name>
```

## 6. Integration Guardrails Going Forward
1. Keep one dedicated integration branch per delivery wave.
2. After integration, run a mandatory reconciliation audit (`git cherry` matrix).
3. Update tracker with:
- equivalent branches
- non-equivalent branches
- archive tags
- recovery commands
4. Only then run branch/worktree cleanup.
