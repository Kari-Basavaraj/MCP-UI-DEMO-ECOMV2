# Figma ↔ Code CI/CD Automation — Playbook Overview

> **The definitive guide to fully automated, bidirectional design-token and component synchronization between Figma and code.**

---

## What This Playbook Covers

This playbook documents a **production-grade, bidirectional CI/CD pipeline** that keeps Figma design tokens (variables) and Code Connect component mappings in continuous sync with a codebase. It is framework-agnostic in principle, though this implementation targets a **Next.js + Tailwind** web client and an **Express MCP server** backend.

**Bidirectional** means:

| Direction | What happens | When |
| --- | --- | --- |
| **Figma → Code** | A designer changes a color, spacing value, or typography token in Figma. CI detects the change, pulls variables, normalizes them, generates canonical CSS custom properties, mirrors them across workspaces, and opens a PR. | Nightly schedule, manual trigger, or **real-time via Figma webhooks** |
| **Code → Figma** | An engineer edits a CSS token file directly. CI reads the diff, converts CSS values back to Figma's Variable format, takes a rollback snapshot, and pushes the update to the Figma file via the REST API. | Manual trigger with `--apply` flag |

---

## Playbook Structure

| Document | Purpose |
| --- | --- |
| [00-OVERVIEW.md](./00-OVERVIEW.md) | This file — executive summary and navigation |
| [01-ONE-TIME-SETUP.md](./01-ONE-TIME-SETUP.md) | First-time setup: PAT, secrets, config, dependencies |
| [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) | System architecture, pipeline flow, file dependency map |
| [03-FIGMA-TO-CODE.md](./03-FIGMA-TO-CODE.md) | Pull workflow: Figma variable changes → CSS tokens |
| [04-CODE-TO-FIGMA.md](./04-CODE-TO-FIGMA.md) | Push workflow: CSS changes → Figma variables |
| [05-CICD-PIPELINES.md](./05-CICD-PIPELINES.md) | All GitHub Actions workflows explained step-by-step |
| [06-CODE-CONNECT.md](./06-CODE-CONNECT.md) | Figma Code Connect: component linking, publish, verify |
| [07-TROUBLESHOOTING.md](./07-TROUBLESHOOTING.md) | Common errors, diagnostic commands, recovery procedures |
| [08-CONFIGURATION-REFERENCE.md](./08-CONFIGURATION-REFERENCE.md) | Every config file, key, and value documented |
| [09-SAFETY-PATTERNS.md](./09-SAFETY-PATTERNS.md) | All 11 safety guards and how they protect production |
| [10-WEBHOOK-SETUP.md](./10-WEBHOOK-SETUP.md) | Real-time webhook-triggered sync: Figma save → PR in seconds |
| [11-MANUAL-DEVELOPER-GUIDE.md](./11-MANUAL-DEVELOPER-GUIDE.md) | Step-by-step manual local workflow — no deployment required |
| [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md) | Zero-touch deployed pipeline: webhook → PR → auto-merge |
| [scripts/setup.sh](./scripts/setup.sh) | One-click bootstrap for new team members |
| [README.md](./README.md) | Quick-start for engineers who just want to get going |

---

## Key Principles

### 1. Tokens Are the Source of Truth — In Both Directions

- Figma variables are the **design** source of truth.
- CSS custom properties (`--sds-*`) are the **code** source of truth.
- The pipeline guarantees **convergence**: whichever side changes, the other side is updated.

### 2. Safety First

The pipeline has **11 independent safety guards** that prevent accidental overwrites, data loss, or scope leaks:

1. **Secret guard** — No operation runs without `FIGMA_ACCESS_TOKEN`
2. **WriteMode guard** — `writeMode` must be explicitly set to allow writes
3. **Route gating** — Operations are gated to `ci`, `office`, or `manual` contexts
4. **Canary guard** — Limits push scope to named collections + max variable count
5. **Rollback snapshots** — A full variable dump is captured before every push
6. **Library variable filter** — Remote/library variables are skipped automatically
7. **CodeConnectMode guard** — Publish requires explicit enablement
8. **Unresolved nodeId guard** — `TODO` placeholder IDs block publish
9. **Token drift check** — CI fails if `mcp-server/` and `web-client/` tokens diverge
10. **Typography sanity check** — `font-weight` values must be unitless
11. **Alias cycle detection** — Prevents circular variable references

### 3. Auditable

Every operation writes:

- A **JSON report** in `docs/code reports/`
- An entry in the **rollout log** (`docs/code reports/figma-cicd-rollout-log.md`)
- GitHub Actions **artifacts** downloadable from each workflow run

### 4. Incremental Adoption

The route system lets teams ramp up safely:

| Route | Description | Risk |
| --- | --- | --- |
| **Route C** | Manual only — all operations run locally | Lowest |
| **Route A** | CI does read + verify; writes remain manual/office | Medium |
| **Route B** | Full CI — reads, writes, and publish all automated | Highest (but guarded) |

---

## Pipeline at a Glance

```text
┌─────────────┐     ┌─────────────────┐     ┌────────────────────┐
│  Figma File  │────▶│  Variables API   │────▶│  Pull Pipeline     │
│  (Variables) │     │  GET /v1/files/  │     │  pull → normalize  │
│              │◀────│  POST /v1/files/ │◀────│  → generate → sync │
└─────────────┘     └─────────────────┘     └────────────────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │  CSS Token Files   │
                                            │  mcp-server/tokens │
                                            │  web-client/tokens │
                                            └────────────────────┘
                                                      │
                                                      ▼
                                            ┌────────────────────┐
                                            │  CI Core           │
                                            │  Token drift check │
                                            │  Build + test      │
                                            │  Figma verify      │
                                            └────────────────────┘

┌─────────────┐     ┌─────────────────┐     ┌────────────────────┐
│ .figma.tsx   │────▶│ Code Connect    │────▶│  Publish Pipeline  │
│ (12 files)   │     │ CLI parse       │     │  generate → verify │
│              │     │ CLI publish     │     │  → publish         │
└─────────────┘     └─────────────────┘     └────────────────────┘
```

---

## Technology Stack

| Component | Technology | Version |
| --- | --- | --- |
| Runtime | Node.js | 22+ |
| Scripts | Pure ESM (`*.mjs`) | — |
| Figma API | REST v1 Variables + Code Connect CLI | Latest |
| CI | GitHub Actions | v4 actions |
| CSS Format | Custom Properties (`:root {}`) | — |
| Auto-PR | `peter-evans/create-pull-request@v6` | v6 |
| Design Tokens | `--sds-*` namespace | — |

---

## Who Is This For?

| Role | Start Here |
| --- | --- |
| **New engineer** wants to set up locally | [README.md](./README.md) → [01-ONE-TIME-SETUP.md](./01-ONE-TIME-SETUP.md) |
| **Designer** wants to understand the sync | [03-FIGMA-TO-CODE.md](./03-FIGMA-TO-CODE.md) |
| **DevOps engineer** needs to configure CI | [05-CICD-PIPELINES.md](./05-CICD-PIPELINES.md) → [08-CONFIGURATION-REFERENCE.md](./08-CONFIGURATION-REFERENCE.md) |
| **Team lead** evaluating safety | [09-SAFETY-PATTERNS.md](./09-SAFETY-PATTERNS.md) |
| **Debugging a CI failure** | [07-TROUBLESHOOTING.md](./07-TROUBLESHOOTING.md) |
| **Want manual mode** (no deploy) | [11-MANUAL-DEVELOPER-GUIDE.md](./11-MANUAL-DEVELOPER-GUIDE.md) |
| **Full production automation** | [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md) |

---

Last updated: 2026-03-01
