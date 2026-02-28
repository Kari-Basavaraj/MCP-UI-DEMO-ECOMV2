# Figma CI/CD Tracker

- Project: `MCP-UI-DEMO-ECOMV2`
- Figma file: `p3SdnPiT3DYRtOu2CZs97P`
- Figma URL: https://www.figma.com/design/p3SdnPiT3DYRtOu2CZs97P/MCPUI-DS-V2--Copy-?node-id=3002-348&t=uaJoCobwzJmzRjym-1
- Parent issue: `BAS-139` (In Progress)
- Last updated: 2026-02-28

| Key | Title | Status | Linear | Evidence |
| --- | --- | --- | --- | --- |
| FGC-01 | Capability probes and route selection engine | In Progress | BAS-140 | `scripts/figma-probe.mjs` |
| FGC-02 | Pull + normalize + token generation pipeline | In Progress | BAS-141 | `scripts/figma-pull-variables.mjs`, `scripts/figma-normalize-variables.mjs`, `scripts/figma-generate-tokens.mjs` |
| FGC-03 | Push pipeline with canary and rollback guards | In Progress | BAS-142 | `scripts/figma-push-variables.mjs` |
| FGC-04 | Code Connect generate/verify contracts | In Progress | BAS-143 | `scripts/figma-codeconnect-generate.mjs`, `scripts/figma-codeconnect-verify.mjs` |
| FGC-05 | Code Connect publish with office fallback | In Progress | BAS-144 | `scripts/figma-codeconnect-publish.mjs` |
| FGC-06 | Core CI workflow and parity gates | In Progress | BAS-145 | `.github/workflows/ci-core.yml` |
| FGC-07 | Scheduled pull workflow with PR automation | In Progress | BAS-146 | `.github/workflows/figma-pull-variables.yml` |
| FGC-08 | Scheduled push workflow with protected apply path | In Progress | BAS-147 | `.github/workflows/figma-push-variables.yml` |
| FGC-09 | Office laptop handoff and execution bundle | In Progress | BAS-148 | `docs/code reports/figma-codeconnect-office-handoff.md`, `docs/code reports/office-copilot-figma-codeconnect-cicd-playbook.md` |
| FGC-10 | Baseline run, audit, and closure report | In Progress | BAS-149 | `docs/code reports/figma-sync-verification.md` |

## Current Route Signal

- `npm run figma:probe` currently selects `Route C` in this environment.
- Read/verify/generate flows are active locally.
- Apply publish/push requires office-auth context or upgraded CI capability.
