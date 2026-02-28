# Figma CICD Doc Map

## A) Start and Execution

1. `docs/figma-cicd/COPILOT-START-HERE.md` (first read for VS Code Copilot)
2. `docs/figma-cicd/EXECUTION-CHECKLIST.md` (step-by-step run order)
3. `docs/code reports/office-copilot-figma-codeconnect-cicd-playbook.md` (full detailed runbook)

## B) System Design and Contracts

1. `docs/figma-sync-workflow.md` (route matrix + orchestration)
2. `docs/figma-variables-sync-guide.md` (script contracts and I/O)
3. `figma/sync.config.json` (active route/write policy)
4. `figma/code-connect/required-components.json` (coverage contract)
5. `figma/code-connect/mappings.source.json` (authoritative mapping input)

## C) Runtime Evidence and Tracking

1. `docs/code reports/figma-capability-probe.json`
2. `docs/code reports/figma-sync-verification.json`
3. `docs/code reports/figma-cicd-rollout-log.md`
4. `docs/code reports/figma-cicd-tracker.md`

## D) CI/CD Workflows

1. `.github/workflows/ci-core.yml`
2. `.github/workflows/figma-pull-variables.yml`
3. `.github/workflows/figma-codeconnect-sync.yml`
4. `.github/workflows/figma-push-variables.yml`
