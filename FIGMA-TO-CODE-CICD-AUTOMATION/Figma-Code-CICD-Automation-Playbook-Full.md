# Figma ↔ Code CI/CD Automation — Complete Playbook

> **The definitive, single-document reference for automated, bidirectional design-token and component synchronization between Figma and code.**
>
> This playbook consolidates all 14 automation documents into one comprehensive guide. Everything you need — setup, architecture, workflows, safety, troubleshooting, and production deployment — is here.

**Version**: 1.0 · **Last updated**: 2026-03-01 · **Repo**: [MCP-UI-DEMO-ECOMV2](https://github.com/Kari-Basavaraj/MCP-UI-DEMO-ECOMV2)

---

## Master Table of Contents

- [Part 1 — Overview & Quick Start](#part-1--overview--quick-start)
  - [1.1 What This Playbook Covers](#11-what-this-playbook-covers)
  - [1.2 5-Minute Quick Start](#12-5-minute-quick-start)
  - [1.3 Key Principles](#13-key-principles)
  - [1.4 Pipeline at a Glance](#14-pipeline-at-a-glance)
  - [1.5 Technology Stack](#15-technology-stack)
  - [1.6 Two Modes of Operation](#16-two-modes-of-operation)
  - [1.7 Who Is This For?](#17-who-is-this-for)
- [Part 2 — One-Time Setup](#part-2--one-time-setup)
  - [2.1 Prerequisites](#21-prerequisites)
  - [2.2 Generate a Figma PAT](#22-generate-a-figma-pat)
  - [2.3 Identify Your Figma File Key](#23-identify-your-figma-file-key)
  - [2.4 Configure GitHub Secrets](#24-configure-github-secrets)
  - [2.5 Clone and Install Dependencies](#25-clone-and-install-dependencies)
  - [2.6 Configure sync.config.json](#26-configure-syncconfigjson)
  - [2.7 Configure figma.config.json](#27-configure-figmaconfigjson)
  - [2.8 Set Up Local Environment Variables](#28-set-up-local-environment-variables)
  - [2.9 Run the Probe](#29-run-the-probe)
  - [2.10 Initial Pull (First Sync)](#210-initial-pull-first-sync)
  - [2.11 Verify CI Passes](#211-verify-ci-passes)
  - [2.12 Setup Checklist](#212-setup-checklist)
- [Part 3 — System Architecture](#part-3--system-architecture)
  - [3.1 High-Level Architecture](#31-high-level-architecture)
  - [3.2 Script Inventory](#32-script-inventory)
  - [3.3 File Dependency Map](#33-file-dependency-map)
  - [3.4 Data Flow: Pull (Figma → Code)](#34-data-flow-pull-figma--code)
  - [3.5 Data Flow: Push (Code → Figma)](#35-data-flow-push-code--figma)
  - [3.6 Data Flow: Code Connect](#36-data-flow-code-connect)
  - [3.7 Token Naming Convention](#37-token-naming-convention)
  - [3.8 Route System](#38-route-system)
- [Part 4 — Figma → Code (Pull Workflow)](#part-4--figma--code-pull-workflow)
  - [4.1 Overview](#41-overview)
  - [4.2 When It Runs](#42-when-it-runs)
  - [4.3 Step-by-Step Walkthrough](#43-step-by-step-walkthrough)
  - [4.4 Running Locally](#44-running-locally)
  - [4.5 In CI (GitHub Actions)](#45-in-ci-github-actions)
  - [4.6 What Could Go Wrong](#46-what-could-go-wrong)
- [Part 5 — Code → Figma (Push Workflow)](#part-5--code--figma-push-workflow)
  - [5.1 Overview](#51-overview)
  - [5.2 When It Runs](#52-when-it-runs)
  - [5.3 Dry-Run vs Apply](#53-dry-run-vs-apply)
  - [5.4 Step-by-Step Walkthrough](#54-step-by-step-walkthrough)
  - [5.5 Running Locally](#55-running-locally)
  - [5.6 In CI (GitHub Actions)](#56-in-ci-github-actions)
  - [5.7 Rollback Procedure](#57-rollback-procedure)
  - [5.8 Safety Summary](#58-safety-summary)
- [Part 6 — CI/CD Pipelines](#part-6--cicd-pipelines)
  - [6.1 Pipeline Overview](#61-pipeline-overview)
  - [6.2 Workflow 1: CI Core](#62-workflow-1-ci-core)
  - [6.3 Workflow 2: Figma Pull Variables](#63-workflow-2-figma-pull-variables)
  - [6.4 Workflow 3: Figma Push Variables](#64-workflow-3-figma-push-variables)
  - [6.5 Workflow 4: Figma Code Connect Sync](#65-workflow-4-figma-code-connect-sync)
  - [6.6 Workflow 5: Figma Webhook Sync](#66-workflow-5-figma-webhook-sync)
  - [6.7 Workflow 6: Webhook Health Monitor](#67-workflow-6-webhook-health-monitor)
  - [6.8 Artifact Downloads](#68-artifact-downloads)
  - [6.9 Required GitHub Configuration Summary](#69-required-github-configuration-summary)
- [Part 7 — Code Connect](#part-7--code-connect)
  - [7.1 What Is Code Connect?](#71-what-is-code-connect)
  - [7.2 Architecture](#72-architecture)
  - [7.3 How .figma.tsx Files Work](#73-how-figmatsx-files-work)
  - [7.4 Pipeline Steps](#74-pipeline-steps)
  - [7.5 Adding a New Component](#75-adding-a-new-component)
  - [7.6 Node ID Migration](#76-node-id-migration)
- [Part 8 — Configuration Reference](#part-8--configuration-reference)
  - [8.1 Configuration Files Overview](#81-configuration-files-overview)
  - [8.2 sync.config.json — Deep Dive](#82-syncconfigjson--deep-dive)
  - [8.3 figma.config.json](#83-figmaconfigjson)
  - [8.4 mappings.source.json](#84-mappingssourcejson)
  - [8.5 required-components.json](#85-required-componentsjson)
  - [8.6 token-name-map.json](#86-token-name-mapjson)
  - [8.7 Environment Variables](#87-environment-variables)
  - [8.8 npm Scripts Reference](#88-npm-scripts-reference)
  - [8.9 GitHub Actions Configuration](#89-github-actions-configuration)
  - [8.10 File Paths (PATHS Constant)](#810-file-paths-paths-constant)
  - [8.11 Webhook & Production Configuration](#811-webhook--production-configuration)
- [Part 9 — Safety Patterns](#part-9--safety-patterns)
  - [9.1 Guard Inventory](#91-guard-inventory)
  - [9.2 Guards 1–6: Write Pipeline Guards](#92-guards-16-write-pipeline-guards)
  - [9.3 Guards 7–8: Code Connect Guards](#93-guards-78-code-connect-guards)
  - [9.4 Guards 9–11: Verification Guards](#94-guards-911-verification-guards)
  - [9.5 Guards 12–13: Webhook Guards](#95-guards-1213-webhook-guards)
  - [9.6 Guard Coverage Matrix](#96-guard-coverage-matrix)
  - [9.7 Adding a New Guard](#97-adding-a-new-guard)
- [Part 10 — Webhook-Driven Auto-Sync](#part-10--webhook-driven-auto-sync)
  - [10.1 Overview](#101-overview)
  - [10.2 Prerequisites](#102-prerequisites)
  - [10.3 Deploy the Webhook Receiver](#103-deploy-the-webhook-receiver)
  - [10.4 Register the Figma Webhook](#104-register-the-figma-webhook)
  - [10.5 Test the Pipeline](#105-test-the-pipeline)
  - [10.6 How the Workflow Works](#106-how-the-workflow-works)
  - [10.7 Event Types](#107-event-types)
  - [10.8 Security](#108-security)
- [Part 11 — Manual Developer Guide](#part-11--manual-developer-guide)
  - [11.1 When to Use This Guide](#111-when-to-use-this-guide)
  - [11.2 Prerequisites](#112-prerequisites)
  - [11.3 Starting Local Dev — One Command](#113-starting-local-dev--one-command)
  - [11.4 Workflow A — Pull Tokens (Read-Only)](#114-workflow-a--pull-tokens-read-only)
  - [11.5 Workflow B — Push Token Changes (Write)](#115-workflow-b--push-token-changes-write)
  - [11.6 Workflow C — Full Bidirectional Sync](#116-workflow-c--full-bidirectional-sync)
  - [11.7 Workflow D — Code Connect Only](#117-workflow-d--code-connect-only)
  - [11.8 Workflow E — Webhook Management](#118-workflow-e--webhook-management)
  - [11.9 Quick Reference — All Commands](#119-quick-reference--all-commands)
  - [11.10 Common Scenarios](#1110-common-scenarios)
- [Part 12 — Production Automation](#part-12--production-automation)
  - [12.1 When to Use This Guide](#121-when-to-use-this-guide)
  - [12.2 Architecture Overview](#122-architecture-overview)
  - [12.3 Setup Checklist](#123-setup-checklist)
  - [12.4 What the Workflow Does](#124-what-the-workflow-does)
  - [12.5 Production Recommendations](#125-production-recommendations)
  - [12.6 Scheduled Automation (Cron)](#126-scheduled-automation-cron)
  - [12.7 Deployment Variants](#127-deployment-variants)
  - [12.8 Manual vs Automated Comparison](#128-manual-vs-automated-comparison)
- [Part 13 — Troubleshooting](#part-13--troubleshooting)
  - [13.1 Quick Diagnostic Commands](#131-quick-diagnostic-commands)
  - [13.2 Authentication & API Errors](#132-authentication--api-errors)
  - [13.3 Token & Build Errors](#133-token--build-errors)
  - [13.4 Push-Specific Errors](#134-push-specific-errors)
  - [13.5 Code Connect Errors](#135-code-connect-errors)
  - [13.6 CI Workflow Errors](#136-ci-workflow-errors)
  - [13.7 Webhook & Automation Errors](#137-webhook--automation-errors)
  - [13.8 Recovery Procedures](#138-recovery-procedures)
  - [13.9 Log Files](#139-log-files)
- [Part 14 — How to Fork & Customize](#part-14--how-to-fork--customize)
  - [14.1 Forking This Repo as a Template](#141-forking-this-repo-as-a-template)
  - [14.2 Customization Checklist](#142-customization-checklist)
  - [14.3 Swapping the UI Framework](#143-swapping-the-ui-framework)
  - [14.4 Token Namespace Customization](#144-token-namespace-customization)
  - [14.5 Adding Your Own Components](#145-adding-your-own-components)
  - [14.6 CI/CD Customization](#146-cicd-customization)
  - [14.7 Removing What You Don't Need](#147-removing-what-you-dont-need)

---

# Part 1 — Overview & Quick Start

## 1.1 What This Playbook Covers

This playbook documents a **production-grade, bidirectional CI/CD pipeline** that keeps Figma design tokens (variables) and Code Connect component mappings in continuous sync with a codebase. It is framework-agnostic in principle, though this implementation targets a **Next.js + Tailwind** web client and an **Express MCP server** backend.

**Bidirectional** means:

| Direction | What happens | When |
| --- | --- | --- |
| **Figma → Code** | A designer changes a color, spacing value, or typography token in Figma. CI detects the change, pulls variables, normalizes them, generates canonical CSS custom properties, mirrors them across workspaces, and opens a PR. | Nightly schedule, manual trigger, or **real-time via Figma webhooks** |
| **Code → Figma** | An engineer edits a CSS token file directly. CI reads the diff, converts CSS values back to Figma's Variable format, takes a rollback snapshot, and pushes the update to the Figma file via the REST API. | Manual trigger with `--apply` flag |

---

## 1.2 5-Minute Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/Kari-Basavaraj/MCP-UI-DEMO-ECOMV2.git
cd MCP-UI-DEMO-ECOMV2

# 2. Run the setup wizard
chmod +x FIGMA-TO-CODE-CICD-AUTOMATION/scripts/setup.sh
./FIGMA-TO-CODE-CICD-AUTOMATION/scripts/setup.sh

# 3. You're done. The wizard handles everything:
#    ✅ Prerequisites check
#    ✅ Figma PAT validation
#    ✅ GitHub secrets configuration
#    ✅ Dependency installation
#    ✅ Initial token pull
#    ✅ Pipeline verification
```

Or manually:

```bash
export FIGMA_ACCESS_TOKEN="figd_..."
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"

npm install
npm run figma:probe          # Test API connectivity
npm run figma:sync:pull      # Pull tokens from Figma
npm run figma:verify         # Verify everything works
```

---

## 1.3 Key Principles

### 1. Tokens Are the Source of Truth — In Both Directions

- Figma variables are the **design** source of truth.
- CSS custom properties (`--sds-*`) are the **code** source of truth.
- The pipeline guarantees **convergence**: whichever side changes, the other side is updated.

### 2. Safety First

The pipeline has **13 independent safety guards** that prevent accidental overwrites, data loss, or scope leaks:

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
12. **Webhook passcode validation** — Rejects unauthorized webhook payloads
13. **Webhook concurrency control** — Prevents parallel runs from creating conflicts

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

## 1.4 Pipeline at a Glance

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

## 1.5 Technology Stack

| Component | Technology | Version |
| --- | --- | --- |
| Runtime | Node.js | 22+ |
| Scripts | Pure ESM (`*.mjs`) | — |
| Figma API | REST v1 Variables + Code Connect CLI | Latest |
| CI | GitHub Actions | v4 actions |
| CSS Format | Custom Properties (`:root {}`) | — |
| Auto-PR | `peter-evans/create-pull-request@v6` | v6 |
| Design Tokens | `--sds-*` namespace | — |
| Webhooks | Figma Webhook API + custom receiver | — |
| Auto-Merge | GitHub `allow_auto_merge` + squash | — |

---

## 1.6 Two Modes of Operation

| Mode | Guide | Who it's for |
|------|-------|--------------|
| **Manual** | [Part 11](#part-11--manual-developer-guide) | Developers who want to run syncs locally, review diffs before committing, or don't have deployment infrastructure. No server needed. |
| **Production Automation** | [Part 12](#part-12--production-automation) | Teams wanting zero-touch automation: Figma save → webhook → GitHub Actions → PR → auto-merge. Requires deploying the web-client (e.g. Vercel). |

Both modes use the same underlying scripts and safety guards. Start with Manual to learn the pipeline, graduate to Production when ready.

---

## 1.7 Who Is This For?

| Role | Start Here |
| --- | --- |
| **New engineer** wants to set up locally | [Part 2 — One-Time Setup](#part-2--one-time-setup) |
| **Designer** wants to understand the sync | [Part 4 — Pull Workflow](#part-4--figma--code-pull-workflow) |
| **DevOps engineer** needs to configure CI | [Part 6 — CI/CD Pipelines](#part-6--cicd-pipelines) → [Part 8 — Configuration](#part-8--configuration-reference) |
| **Team lead** evaluating safety | [Part 9 — Safety Patterns](#part-9--safety-patterns) |
| **Debugging a CI failure** | [Part 13 — Troubleshooting](#part-13--troubleshooting) |
| **Want manual mode** (no deploy) | [Part 11 — Manual Guide](#part-11--manual-developer-guide) |
| **Full production automation** | [Part 10 — Webhooks](#part-10--webhook-driven-auto-sync) → [Part 12 — Production](#part-12--production-automation) |
| **Forking for your own project** | [Part 14 — Fork & Customize](#part-14--how-to-fork--customize) |

---

## 1.8 Essential Commands

| Command | What It Does |
| --- | --- |
| `npm run figma:sync:pull` | Pull Figma → CSS tokens (safe, read-only) |
| `npm run figma:sync:push` | Push CSS → Figma (dry-run, shows what would change) |
| `npm run figma:sync:push -- --apply` | Push CSS → Figma (writes for real) |
| `npm run figma:sync:full` | Full bidirectional sync |
| `npm run figma:verify` | Run 5-check verification suite |
| `npm run figma:probe` | Test API capabilities, recommend route |
| `npm run tokens:sync` | Copy tokens mcp-server → web-client |
| `npm run tokens:check` | Check for token drift between apps |
| `npm run dev` | Start all 3 services (MCP + web client + webhook receiver) |
| `npm run figma:sync:local` | One-command local pull + rebuild (~10s) |
| `npm run webhook:start` | Start local webhook receiver (port 4848) |
| `npm run webhook:manage -- list` | List registered Figma webhooks |
| `npm run webhook:manage -- create` | Register new Figma webhooks |
| `npm run webhook:test` | Send test payload to local receiver |

---

## 1.9 Safety Model

Every write operation passes through multiple guards before reaching the Figma API:

```text
Your code change
    │
    ├── Write Mode Guard ──── Is writeMode "ci-enabled"?
    ├── Route Gating ──────── Does FIGMA_WRITE_CONTEXT match routes.push?
    ├── Canary Guard ──────── Are we in canary mode? If so, limit scope
    ├── Library Filter ────── Skip read-only library variables
    ├── Rollback Snapshot ─── Save current state before writing
    └── Variable Count ────── Sanity check on payload size
    │
    ▼
  Figma API (POST /variables)
```

Details: [Part 9 — Safety Patterns](#part-9--safety-patterns)

---

# Part 2 — One-Time Setup

> Everything you need to configure **once** before the pipeline works. Estimated time: 15–20 minutes.

---

## 2.1 Prerequisites

| Requirement | Minimum Version | Check command |
|---|---|---|
| Node.js | 22+ | `node -v` |
| npm | 10+ | `npm -v` |
| Git | 2.30+ | `git --version` |
| GitHub CLI (`gh`) | 2.0+ | `gh --version` |
| Figma account | Professional or Enterprise | — |

---

## 2.2 Generate a Figma PAT

1. Go to [https://www.figma.com/settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Configure scopes:

| Scope | Required | Why |
|---|---|---|
| **File content** (read) | Yes | Pull variables, read file metadata |
| **Variables** (read + write) | Yes | Pull and push design tokens |
| **Code Connect** (write) | Yes | Publish component links |
| **Webhooks** (read) | Optional | For webhook triggers |

5. Copy the token (starts with `figd_`) — you won't see it again.

### Verify the token locally

```bash
export FIGMA_ACCESS_TOKEN="figd_YOUR_TOKEN_HERE"
curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/me" | jq .
```

Expected output: your Figma user profile with `id`, `email`, `handle`.

---

## 2.3 Identify Your Figma File Key

The file key is the string in a Figma URL between `/design/` and the next `/`:

```
https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?...
                              ^^^^^^^^^^^^^^^^^^^^^^^^
                              This is your file key
```

### Verify the file key

```bash
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"
curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_KEY?depth=1" | jq '.name'
```

Expected: your Figma file name (e.g., `"MCPUI-DS-V2"`).

---

## 2.4 Configure GitHub Secrets

### Required secrets

```bash
gh secret set FIGMA_ACCESS_TOKEN --body "figd_YOUR_TOKEN_HERE"
gh secret set FIGMA_FILE_KEY     --body "dbPjFeLfAFp8Sz9YGPs0CZ"
gh secret set FIGMA_REGION       --body "us-east-1"
```

### Required repository variables

```bash
gh variable set FIGMA_CODECONNECT_PUBLISH --body "true"
```

### Create the `figma-write` environment

The push and Code Connect workflows require a GitHub environment for write operations:

1. Go to **Settings → Environments** in your GitHub repo
2. Click **New environment**
3. Name it: `figma-write`
4. Add these environment secrets:
   - `FIGMA_ACCESS_TOKEN` — same PAT as the repo secret
   - `FIGMA_FILE_KEY` — same file key
   - `FIGMA_REGION` — same region
5. (Optional) Add **required reviewers** for extra safety on push operations

### Verify secrets are set

```bash
gh secret list
gh variable list
```

---

## 2.5 Clone and Install Dependencies

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO

npm run install:all
```

This runs `npm install` in three locations: Root (`/`), `mcp-server/`, `web-client/`.

---

## 2.6 Configure sync.config.json

This is the **central configuration file** for the entire pipeline. Create or edit `figma/sync.config.json`:

```json
{
  "primaryFileKey": "YOUR_FIGMA_FILE_KEY",
  "region": "us-east-1",
  "writeMode": "ci-enabled",
  "codeConnectMode": "publish-enabled",
  "routes": {
    "pull": "ci",
    "push": "ci",
    "publish": "ci"
  },
  "canary": {
    "enabled": true,
    "collectionNames": ["Canary", "MCP-UI Canary"],
    "maxVariables": 25
  },
  "requiredComponentsPath": "figma/code-connect/required-components.json",
  "mappingSourcePath": "figma/code-connect/mappings.source.json"
}
```

### Key decisions

| Setting | Conservative (start here) | Aggressive (full CI) |
|---|---|---|
| `writeMode` | `"office-only"` | `"ci-enabled"` |
| `codeConnectMode` | `"verify-only"` | `"publish-enabled"` |
| `routes.push` | `"office"` | `"ci"` |
| `routes.publish` | `"office"` | `"ci"` |
| `canary.enabled` | `true` | `false` |

> **Recommendation**: Start with `writeMode: "office-only"` and `routes.push: "office"`. Verify pull works in CI first, then graduate to full Route B.

---

## 2.7 Configure figma.config.json

This file tells the `@figma/code-connect` CLI where to find your components (`figma/figma.config.json`):

```json
{
  "codeConnect": {
    "parser": "react",
    "include": [
      "web-client/components/**/*.{ts,tsx}",
      "web-client/app/**/*.{ts,tsx}",
      "mcp-server/src/widgets/**/*.ts"
    ],
    "exclude": ["**/*.test.*", "**/*.spec.*", "**/node_modules/**"]
  }
}
```

---

## 2.8 Set Up Local Environment Variables

Add to your shell profile (`.zshrc`, `.bashrc`, etc.):

```bash
export FIGMA_ACCESS_TOKEN="figd_YOUR_TOKEN_HERE"
export FIGMA_FILE_KEY="YOUR_FIGMA_FILE_KEY"
export FIGMA_REGION="us-east-1"
# Optional: enable write operations from local machine
# export FIGMA_WRITE_CONTEXT="office"
```

Or, for this project specifically, create a `.env.local` file:

```bash
cp .env.example .env.local
# Fill in your values — this file is gitignored
```

---

## 2.9 Run the Probe

```bash
npm run figma:probe
```

Expected output:

```json
{
  "ok": true,
  "selectedRoute": "Route B",
  "output": [
    "docs/code reports/figma-capability-probe.json",
    "docs/code reports/figma-capability-probe.md"
  ]
}
```

| Result | Meaning | Action |
|---|---|---|
| Route B | All 4 probes pass | Full CI is possible |
| Route A | Read + parse work, write/publish fail | Check PAT scopes or environment |
| Route C | Read fails | Check PAT, file key, network access |

---

## 2.10 Initial Pull (First Sync)

```bash
npm run figma:sync:pull
```

This executes in order:
1. `figma:pull:variables` — Fetches raw variable data from Figma API
2. `figma:normalize:variables` — Normalizes the payload, resolves modes
3. `figma:generate:tokens` — Generates CSS files
4. `tokens:sync` — Mirrors tokens from `mcp-server/tokens/` to `web-client/tokens/`
5. `figma:verify` — Runs all verification checks

### Verify output files exist

```bash
ls -la mcp-server/tokens/figma-tokens-*.css
ls -la web-client/tokens/figma-tokens-*.css
ls -la tokens/figma/variables.raw.json
ls -la tokens/figma/variables.normalized.json
ls -la tokens/figma/.variable-ids.json
```

---

## 2.11 Verify CI Passes

```bash
git add -A
git commit -m "chore: initial figma sync setup"
git push origin main
```

Check workflow runs:

```bash
gh run list --limit 5
```

---

## 2.12 Setup Checklist

- [ ] Figma PAT generated with correct scopes
- [ ] `FIGMA_ACCESS_TOKEN` set as GitHub secret
- [ ] `FIGMA_FILE_KEY` set as GitHub secret
- [ ] `FIGMA_REGION` set as GitHub secret
- [ ] `figma-write` environment created with secrets
- [ ] `FIGMA_CODECONNECT_PUBLISH` variable set to `true`
- [ ] `figma/sync.config.json` configured
- [ ] `figma/figma.config.json` configured
- [ ] `npm run install:all` completed
- [ ] `npm run figma:probe` returns Route A or B
- [ ] `npm run figma:sync:pull` generates token files
- [ ] CI workflows pass on push

---

# Part 3 — System Architecture

> How every file, script, and workflow connects. The complete dependency map.

---

## 3.1 High-Level Architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         FIGMA (Cloud)                                  ║
║                                                                        ║
║  ┌──────────────────────┐    ┌──────────────────────────┐              ║
║  │  Variables API        │    │  Code Connect Service     │              ║
║  │  GET  /v1/files/…/    │    │  @figma/code-connect CLI  │              ║
║  │       variables/local │    │  parse │ publish          │              ║
║  │  POST /v1/files/…/    │    └──────────────────────────┘              ║
║  │       variables       │                                              ║
║  └───────────┬───────────┘                                              ║
╚══════════════╪══════════════════════════════════════════════════════════╝
               │ HTTPS (Bearer token)
               │
╔══════════════╪══════════════════════════════════════════════════════════╗
║              │          LOCAL / CI RUNNER                               ║
║              ▼                                                          ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │                    scripts/ (13 ESM modules)                    │    ║
║  │                                                                 │    ║
║  │  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐   │    ║
║  │  │ figma-lib   │  │ figma-normalizer│  │ figma-probe      │   │    ║
║  │  │ (shared)    │  │ (transform)     │  │ (route selector) │   │    ║
║  │  └──────┬──────┘  └────────┬────────┘  └──────────────────┘   │    ║
║  │         │                  │                                   │    ║
║  │  ┌──────┴────────┐  ┌─────┴──────────┐  ┌─────────────────┐  │    ║
║  │  │ pull-variables│  │ normalize-vars │  │ generate-tokens │  │    ║
║  │  │ (API → JSON)  │──▶ (JSON → JSON)  │──▶ (JSON → CSS)    │  │    ║
║  │  └───────────────┘  └────────────────┘  └────────┬────────┘  │    ║
║  │                                                   │           │    ║
║  │  ┌────────────────┐  ┌────────────────┐  ┌───────┴────────┐  │    ║
║  │  │ push-variables │  │ sync-tokens    │  │ verify         │  │    ║
║  │  │ (CSS → API)    │◀─│ (mirror copy)  │◀─│ (5 checks)     │  │    ║
║  │  └────────────────┘  └────────────────┘  └────────────────┘  │    ║
║  │                                                               │    ║
║  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐  │    ║
║  │  │ codeconnect-     │  │ codeconnect-     │  │ codeconnect│  │    ║
║  │  │ generate         │──▶ verify           │──▶ publish    │  │    ║
║  │  └──────────────────┘  └──────────────────┘  └────────────┘  │    ║
║  │                                                               │    ║
║  │  ┌──────────────────────────────────────────────────────────┐ │    ║
║  │  │ Orchestrators: sync-pull │ sync-push │ sync-full        │ │    ║
║  │  └──────────────────────────────────────────────────────────┘ │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
║                                                                        ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │                    GitHub Actions (6 workflows)                  │    ║
║  │  ci-core │ pull-variables │ push-variables │ codeconnect-sync   │    ║
║  │  webhook-sync │ webhook-health                                   │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## 3.2 Script Inventory

### Shared Library

| Script | Purpose | Exports |
|---|---|---|
| `figma-lib.mjs` | Shared constants, utilities, API client | `PATHS`, `figmaApi()`, `loadSyncConfig()`, `readJson()`, `writeJson()`, `runCommand()`, `formatCssValue()`, `parseCssVariables()`, `componentAliasBlock()`, `appendRolloutLog()` |
| `figma-normalizer.mjs` | Raw API payload → normalized structure | `normalizeFigmaVariables()` |

### Pipeline Scripts (Atomic)

| Script | Input | Output | Side Effects |
|---|---|---|---|
| `figma-pull-variables.mjs` | Figma API | `variables.raw.json`, `variables.normalized.json`, `.variable-ids.json` | API read |
| `figma-normalize-variables.mjs` | `variables.raw.json` | `variables.normalized.json`, `.variable-ids.json` | None |
| `figma-generate-tokens.mjs` | `variables.normalized.json` | `figma-tokens-light.css`, `figma-tokens-dark.css` | None |
| `sync-tokens.mjs` | `mcp-server/tokens/*.css` | `web-client/tokens/*.css` | File copy |
| `figma-push-variables.mjs` | `*.css` + `.variable-ids.json` | Push report JSON | API write (with `--apply`) |
| `figma-probe.mjs` | Figma API + CLI | Probe report JSON + MD | 4 API/CLI calls |
| `figma-verify.mjs` | All artifacts | Verification report JSON + MD | Runs sub-scripts |
| `figma-codeconnect-generate.mjs` | `mappings.source.json` | `mappings.generated.json` | None |
| `figma-codeconnect-verify.mjs` | `mappings.generated.json` | Console JSON | None |
| `figma-codeconnect-publish.mjs` | `mappings.generated.json` | Publish report JSON | CLI publish (with `--apply`) |

### Orchestrators

| Script | What it chains | Flags |
|---|---|---|
| `figma-sync-pull.mjs` | pull → normalize → generate → sync → verify | — |
| `figma-sync-push.mjs` | normalize → generate → sync → push → verify | `--apply` |
| `figma-sync-full.mjs` | probe → sync-pull → codeconnect → sync-push | `--apply-push`, `--apply-publish` |

### Webhook Scripts

| Script | Purpose |
|---|---|
| `figma-webhook-receiver.mjs` | HTTP server: validates webhook → dispatches to GitHub |
| `figma-webhook-manage.mjs` | CLI tool for webhook CRUD (create/list/delete/test) |

---

## 3.3 File Dependency Map

```
figma/sync.config.json                  ◀── Central config (all scripts read this)
  │
  ├── scripts/figma-lib.mjs             ◀── loadSyncConfig(), PATHS, figmaApi()
  │     │
  │     ├── scripts/figma-pull-variables.mjs
  │     │     ▼
  │     │   tokens/figma/variables.raw.json
  │     │     ▼
  │     ├── scripts/figma-normalize-variables.mjs (uses figma-normalizer.mjs)
  │     │     ▼
  │     │   tokens/figma/variables.normalized.json
  │     │   tokens/figma/.variable-ids.json
  │     │     ▼
  │     ├── scripts/figma-generate-tokens.mjs
  │     │     ▼
  │     │   mcp-server/tokens/figma-tokens-light.css    ◀── Canonical source
  │     │   mcp-server/tokens/figma-tokens-dark.css     ◀── Canonical source
  │     │     ▼
  │     ├── scripts/sync-tokens.mjs
  │     │     ▼
  │     │   web-client/tokens/figma-tokens-light.css    ◀── Mirror copy
  │     │   web-client/tokens/figma-tokens-dark.css     ◀── Mirror copy
  │     │
  │     ├── scripts/figma-push-variables.mjs
  │     │     ▼
  │     │   tokens/figma/rollback-*.json                ◀── Snapshot before push
  │     │   docs/code reports/figma-push-report-*.json
  │     │
  │     ├── scripts/figma-verify.mjs
  │     │     ▼
  │     │   docs/code reports/figma-sync-verification.json
  │     │   docs/code reports/figma-sync-verification.md
  │     │
  │     └── scripts/figma-probe.mjs
  │           ▼
  │         docs/code reports/figma-capability-probe.json
  │         docs/code reports/figma-capability-probe.md
  │
  ├── figma/figma.config.json           ◀── Code Connect CLI config
  │     ├── figma/code-connect/mappings.source.json     ◀── Hand-maintained
  │     ├── figma/code-connect/required-components.json ◀── 12 required components
  │     ├── figma/code-connect/mappings.generated.json  ◀── Auto-generated
  │     └── figma/code-connect/components/*.figma.tsx   ◀── 12 component files
  │
  └── tokens/figma/token-name-map.json  ◀── Custom name overrides
```

---

## 3.4 Data Flow: Pull (Figma → Code)

```
Figma Variables API
     │  GET /v1/files/{key}/variables/local
     ▼
┌────────────────────────────────────┐
│  variables.raw.json                │  Raw API response + metadata
└────────────────┬───────────────────┘
                 │  figma-normalizer.mjs
                 ▼
┌────────────────────────────────────┐
│  variables.normalized.json         │  Flat array of {cssVar, value, modes}
│  .variable-ids.json                │  Lookup table: cssVar → variableId + modeIds
└────────────────┬───────────────────┘
                 │  figma-generate-tokens.mjs
                 ▼
┌────────────────────────────────────┐
│  figma-tokens-light.css            │  :root { --sds-color-...: #hex; }
│  figma-tokens-dark.css             │  @media (prefers-color-scheme: dark) { ... }
└────────────────┬───────────────────┘
                 │  sync-tokens.mjs
                 ▼
┌────────────────────────────────────┐
│  web-client/tokens/ (mirror)       │  Identical copies for web-client build
└────────────────────────────────────┘
```

---

## 3.5 Data Flow: Push (Code → Figma)

```
figma-tokens-light.css + figma-tokens-dark.css
     │  parseCssVariables()
     ▼
┌────────────────────────────────────┐
│  In-memory: { cssVar: cssValue }   │  e.g., --sds-color-brand: #2c2c2c
└────────────────┬───────────────────┘
                 │  buildVariableModeValues() + .variable-ids.json
                 ▼
┌────────────────────────────────────┐
│  Update payload: [                 │
│    { variableId, modeId, value }   │  Values converted via parseCssValueToFigma()
│  ]                                 │
└────────────────┬───────────────────┘
                 │  Canary filter + Library variable filter
                 ▼
┌────────────────────────────────────┐
│  Rollback snapshot captured        │  GET /variables/local → rollback-*.json
└────────────────┬───────────────────┘
                 │  POST /v1/files/{key}/variables
                 ▼
┌────────────────────────────────────┐
│  Figma Variables Updated           │  Designers see new values in Figma
└────────────────────────────────────┘
```

---

## 3.6 Data Flow: Code Connect

```
figma/code-connect/components/*.figma.tsx
     │  Each file: figma.connect(ComponentUrl, { ... })
     ▼
┌──────────────────────────────────────┐
│  mappings.source.json                │  12 entries: { id, nodeId, source }
│  required-components.json            │  12 required components
└──────────────────┬───────────────────┘
                   │  figma-codeconnect-generate.mjs
                   ▼
┌──────────────────────────────────────┐
│  mappings.generated.json             │  Enriched with fileKey, sourceExists, etc.
└──────────────────┬───────────────────┘
                   │  figma-codeconnect-verify.mjs → figma-codeconnect-publish.mjs
                   ▼
┌──────────────────────────────────────┐
│  @figma/code-connect CLI             │  npx code-connect publish
│  → Figma Dev Mode shows code         │
└──────────────────────────────────────┘
```

---

## 3.7 Token Naming Convention

All CSS custom properties follow the `--sds-*` namespace:

```
--sds-{category}-{subcategory}-{variant}

Examples:
  --sds-color-background-default-default     → #ffffff
  --sds-color-text-default-secondary         → #757575
  --sds-size-padding-lg                      → 16px
  --sds-typo-body-size-medium                → 16px
  --sds-comp-card-bg                         → var(--sds-color-background-default-default)
```

### Categories

| Prefix | Contains |
|---|---|
| `--sds-color-background-*` | Background colors (default, brand, danger, positive, warning, utilities) |
| `--sds-color-text-*` | Text/foreground colors |
| `--sds-color-border-*` | Border colors |
| `--sds-size-padding-*` | Padding values (xs through xxl) |
| `--sds-size-space-*` | Spacing values (100 through 600) |
| `--sds-size-radius-*` | Border radius values |
| `--sds-size-height-*` | Fixed heights (buttons, inputs) |
| `--sds-typo-*` | Typography (font family, sizes, weights, line heights) |
| `--sds-comp-*` | Component aliases (card, button, input, badge) |

### Component Aliases

Component tokens are **not** pulled from Figma. They are computed aliases defined in `figma-lib.mjs → componentAliasBlock()` and appended to the generated CSS:

```css
--sds-comp-card-bg: var(--sds-color-background-default-default);
--sds-comp-card-border: var(--sds-color-border-default-default);
--sds-comp-card-radius: var(--sds-size-radius-400);
```

---

## 3.8 Route System

| Route | Variables Read | CC Parse | CC Publish | Variables Write | CI Behavior |
|---|---|---|---|---|---|
| **Route A** | ✅ | ✅ | ❌ | ❌ | CI reads + verifies; writes require local/office |
| **Route B** | ✅ | ✅ | ✅ | ✅ | Full CI automation |
| **Route C** | ❌ | ❌ | ❌ | ❌ | Manual fallback; fix auth first |

The route is **advisory** — determined by `figma-probe.mjs`. Actual gating is done by `writeMode` and `routes.*` in `sync.config.json`.

---

# Part 4 — Figma → Code (Pull Workflow)

> A designer changes a color in Figma. Here's exactly what happens to get that change into code.

---

## 4.1 Overview

```
Designer changes Brand/800 from #2c2c2c → #1a56db in Figma
     │
     ▼
Pull pipeline runs (scheduled daily at 03:00 UTC or triggered manually)
     │
     ▼
figma-tokens-light.css now contains:
  --sds-color-background-brand-default: #1a56db;
     │
     ▼
Automated PR opened for review
```

---

## 4.2 When It Runs

| Trigger | Where | Notes |
|---|---|---|
| `cron: '0 3 * * *'` | GitHub Actions | Daily at 03:00 UTC |
| `workflow_dispatch` | GitHub Actions | Manual trigger |
| `npm run figma:sync:pull` | Local terminal | Run anytime |
| Figma webhook | GitHub Actions | Real-time, via webhook receiver |

---

## 4.3 Step-by-Step Walkthrough

### Step 1 — Pull Variables from Figma API

**Command**: `npm run figma:pull:variables`

1. Reads `FIGMA_ACCESS_TOKEN` and `FIGMA_FILE_KEY` from environment
2. Calls `GET /v1/files/{file_key}/variables/local`
3. Writes raw response to `tokens/figma/variables.raw.json`
4. Normalizes via `figma-normalizer.mjs` → produces `variables.normalized.json` and `.variable-ids.json`

**Example raw entry**:
```json
{
  "id": "VariableID:28:10",
  "name": "Brand/800",
  "resolvedType": "COLOR",
  "valuesByMode": {
    "28:0": { "r": 0.172, "g": 0.172, "b": 0.172, "a": 1 }
  }
}
```

**Example normalized entry**:
```json
{
  "cssVar": "--sds-color-background-brand-default",
  "figmaName": "Brand/800",
  "variableId": "VariableID:28:10",
  "collectionName": "Primitives",
  "resolvedType": "COLOR",
  "modes": {
    "28:0": { "r": 0.172, "g": 0.172, "b": 0.172, "a": 1 }
  }
}
```

### Step 2 — Normalize Variables

**Command**: `npm run figma:normalize:variables`

Handles: multi-collection merging, mode detection (Light/Dark), CSS variable name inference using `token-name-map.json`, alias resolution.

### Step 3 — Generate CSS Token Files

**Command**: `npm run figma:generate:tokens`

1. Extracts light mode → `:root { }` block
2. Extracts dark mode → `@media (prefers-color-scheme: dark)` + `[data-theme="dark"]` blocks
3. Appends component aliases
4. Writes `mcp-server/tokens/figma-tokens-light.css` and `figma-tokens-dark.css`

**Example light CSS output**:
```css
/* Auto-generated from Figma Variables API — DO NOT EDIT MANUALLY */
:root {
  --sds-color-background-brand-default: #2c2c2c;
  --sds-color-background-danger-default: #eb221e;
  --sds-color-background-default-default: #ffffff;
  /* ... 490+ variables ... */

  /* Component aliases */
  --sds-comp-card-bg: var(--sds-color-background-default-default);
  --sds-comp-card-border: var(--sds-color-border-default-default);
}
```

### Step 4 — Mirror Tokens to Web Client

**Command**: `npm run tokens:sync`

Copies `mcp-server/tokens/*.css` → `web-client/tokens/*.css`.

### Step 5 — Verify Integrity

**Command**: `npm run figma:verify`

| Check | What it validates |
|---|---|
| Required files | All artifact files exist |
| Token drift | `mcp-server/tokens/` matches `web-client/tokens/` |
| Required tokens | All tokens in `token-name-map.json` exist in CSS |
| Typography sanity | `font-weight` values don't have `px` suffix |
| Code Connect | Generate + verify pass |

---

## 4.4 Running Locally

### One-command pull

```bash
npm run figma:sync:pull
```

### Step-by-step (for debugging)

```bash
npm run figma:pull:variables
npm run figma:normalize:variables
npm run figma:generate:tokens
npm run tokens:sync
npm run figma:verify
```

### Inspect intermediate files

```bash
cat tokens/figma/variables.normalized.json | jq '.stats'
cat tokens/figma/variables.normalized.json | jq '.modeSelection'
grep "brand-default" mcp-server/tokens/figma-tokens-light.css
grep -E "^\s+--sds-" mcp-server/tokens/figma-tokens-light.css | head -20
```

### Rebuild widgets after pull

```bash
npm --prefix mcp-server run build
```

---

## 4.5 In CI (GitHub Actions)

The **Figma Pull Variables** workflow runs the 5-step pipeline and creates a PR on branch `codex/figma-pull-variables` with labels `automation` and `figma`.

---

## 4.6 What Could Go Wrong

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Missing FIGMA_ACCESS_TOKEN` | Env var not set | `export FIGMA_ACCESS_TOKEN=figd_...` |
| `Figma variables pull failed (403)` | PAT expired or insufficient scopes | Regenerate PAT |
| `Unable to resolve light mode` | No mode named "Light" in Figma | Check mode names |
| `token-drift` in CI | Forgot `tokens:sync` | Run `npm run tokens:sync` and commit |
| `missing-required-tokens` | Token in name map doesn't exist in Figma | Add variable in Figma or remove from map |

---

# Part 5 — Code → Figma (Push Workflow)

> An engineer changes a CSS token value. Here's exactly how that change flows back to Figma.

---

## 5.1 Overview

```
Engineer changes --sds-color-background-brand-default: #1a56db;
     │
     ▼
Push pipeline runs
     │
     ▼
Figma "Brand/800" variable value updated to #1a56db
     │
     ▼
Designers see the change in Figma immediately
```

> **Important**: Push is a **destructive operation** — it overwrites variable values in Figma. That's why it has more safety guards than pull.

---

## 5.2 When It Runs

| Trigger | Where | Notes |
|---|---|---|
| `cron: '0 4 * * *'` | GitHub Actions | Daily at 04:00 UTC (**dry-run only**) |
| `workflow_dispatch` + `apply: true` | GitHub Actions | Manual with apply flag |
| `npm run figma:sync:push -- --apply` | Local terminal | With explicit `--apply` |

---

## 5.3 Dry-Run vs Apply

```bash
# Dry-run (safe, no changes)
npm run figma:push:variables

# Apply (writes to Figma)
npm run figma:push:variables -- --apply
```

---

## 5.4 Step-by-Step Walkthrough

### Step 1 — Parse CSS Files

Reads both token files and extracts all `--name: value;` pairs.

### Step 2 — Load Variable ID Mapping

Reads `.variable-ids.json` to map CSS var names → Figma identifiers.

### Step 3 — Convert CSS Values to Figma Format

| CSS Value | Figma Value |
|---|---|
| `#2c2c2c` | `{ r: 0.172549, g: 0.172549, b: 0.172549, a: 1 }` |
| `#2c2c2c80` | `{ r: 0.172549, g: 0.172549, b: 0.172549, a: 0.501961 }` |
| `rgba(44, 44, 44, 0.5)` | `{ r: 0.172549, g: 0.172549, b: 0.172549, a: 0.5 }` |
| `16px` | `16` |
| `400` | `400` (unitless for font-weight) |

### Step 4 — Build Update Payload

Creates entries: `{ collectionId, variableId, modeId, value }` for light and dark modes.

### Step 5 — Apply Safety Guards

Six guards: WriteMode, Route Gating, Canary Filter, Library Variable Filter, Rollback Snapshot, Variable Count.

### Step 6 — Capture Rollback Snapshot

Saves timestamped JSON snapshot of all current variable values before writing.

### Step 7 — Push to Figma API

`POST /v1/files/{key}/variables` with the filtered update payload.

### Step 8 — Write Report

JSON report written to `docs/code reports/figma-push-report-{timestamp}.json`.

---

## 5.5 Running Locally

```bash
# Dry-run
npm run figma:push:variables

# Apply
export FIGMA_WRITE_CONTEXT=office
npm run figma:push:variables -- --apply

# Full push orchestrator
npm run figma:sync:push           # dry-run
npm run figma:sync:push -- --apply  # apply
```

---

## 5.6 In CI (GitHub Actions)

Trigger from **Actions → Figma Push Variables → Run workflow → check "Apply push to Figma"**.

---

## 5.7 Rollback Procedure

### Option 1 — Git revert + re-push

```bash
git revert HEAD
npm run figma:push:variables -- --apply
```

### Option 2 — Use rollback snapshot

```bash
ls tokens/figma/rollback-*.json
git checkout HEAD~1 -- mcp-server/tokens/figma-tokens-light.css
npm run figma:push:variables -- --apply
```

---

## 5.8 Safety Summary

| Guard | What it prevents |
|---|---|
| WriteMode | Accidental writes in read-only environments |
| Canary filter | Scope creep — only named collections are writable |
| Max variables | Runaway push of thousands of updates |
| Library filter | 400 errors from trying to write remote variables |
| Rollback snapshot | Data loss — full state captured before every push |
| Dry-run default | Accidental applies — `--apply` must be explicit |

---

# Part 6 — CI/CD Pipelines

> All 6 GitHub Actions workflows explained step-by-step.

---

## 6.1 Pipeline Overview

| Workflow | File | Trigger | Purpose | Writes to Figma? |
| --- | --- | --- | --- | --- |
| **CI Core** | `ci-core.yml` | Push + PRs | Build, test, verify, drift check | No |
| **Figma Pull Variables** | `figma-pull-variables.yml` | Daily 03:00 + manual | Pull → normalize → generate → PR | No |
| **Figma Push Variables** | `figma-push-variables.yml` | Daily 04:00 + manual | Push CSS → Figma | Yes (with `--apply`) |
| **Figma Code Connect Sync** | `figma-codeconnect-sync.yml` | Path-trigger + daily 03:30 + manual | Generate, verify, publish | Yes (publish) |
| **Figma Webhook Sync** | `figma-webhook-sync.yml` | Webhook → `repository_dispatch` + manual | Pull + build + PR + auto-merge | No |
| **Webhook Health Monitor** | `webhook-health.yml` | Daily 06:00 + manual | Verify webhooks alive | No |

### Execution Timeline

```text
Real-time ─── Figma Webhook Sync ────── Webhook → pull → build → PR → auto-merge
03:00 UTC ─── Figma Pull Variables ──── Pull + normalize + generate + PR (safety net)
03:30 UTC ─── Figma Code Connect Sync ─ Generate + verify + publish
04:00 UTC ─── Figma Push Variables ──── Dry-run push (daily)
06:00 UTC ─── Webhook Health Monitor ── Verify webhook infrastructure
On push  ──── CI Core ───────────────── Build + test + drift check + verify
```

---

## 6.2 Workflow 1: CI Core

**File**: `.github/workflows/ci-core.yml`

Runs on every push and PR. The quality gate.

| Step | Command | Failure = |
| --- | --- | --- |
| Install deps | `npm ci` (root + mcp-server + web-client) | Build failure |
| **Token drift check** | `npm run tokens:check` | **CI fails** if tokens differ |
| Build widgets | `npm --prefix mcp-server run build` | Build failure |
| Test mcp-server | `npm --prefix mcp-server test` | Test failure |
| Build web-client | `npm --prefix web-client run build` | Build failure |
| **Figma verify** | `npm run figma:verify` | **CI fails** on bad tokens |

---

## 6.3 Workflow 2: Figma Pull Variables

**File**: `.github/workflows/figma-pull-variables.yml`

Runs daily at 03:00 UTC. Pulls tokens and creates a PR on branch `codex/figma-pull-variables`.

Steps: Pull → Normalize → Generate → Sync → Verify → Create PR.

---

## 6.4 Workflow 3: Figma Push Variables

**File**: `.github/workflows/figma-push-variables.yml`

Runs daily at 04:00 UTC in **dry-run** mode. Apply only via manual `workflow_dispatch` with `apply: true`.

Uses the `figma-write` protected environment.

---

## 6.5 Workflow 4: Figma Code Connect Sync

**File**: `.github/workflows/figma-codeconnect-sync.yml`

Auto-triggers on pushes to `figma/code-connect/**`, `web-client/components/**`, or `mcp-server/src/widgets/**`. Also runs daily at 03:30 UTC.

Publish is conditional on `vars.FIGMA_CODECONNECT_PUBLISH == 'true'`.

---

## 6.6 Workflow 5: Figma Webhook Sync

**File**: `.github/workflows/figma-webhook-sync.yml`

Real-time webhook-triggered sync. Key features:
- **Concurrency**: `cancel-in-progress: true` — latest webhook wins
- **Widget rebuild**: Rebuilds all 12 widgets (unique to this workflow)
- **Auto-merge**: PR squash-merges when CI passes
- **Branch**: `codex/figma-webhook-sync`

| Aspect | Pull Variables (Wf 2) | Webhook Sync (Wf 5) |
|--------|----------------------|---------------------|
| Trigger | Daily cron | Figma webhook |
| Widget rebuild | ❌ | ✅ |
| Auto-merge | ❌ | ✅ |
| Concurrency | None | Cancel-in-progress |

---

## 6.7 Workflow 6: Webhook Health Monitor

**File**: `.github/workflows/webhook-health.yml`

Daily at 06:00 UTC. Checks: webhook status (ACTIVE), endpoint reachability, dispatch connectivity.

- **Failure**: Creates GitHub Issue with label `webhook-alert`
- **Recovery**: Auto-closes `webhook-alert` issues when checks pass

---

## 6.8 Artifact Downloads

| Workflow | Artifact Name | Contents |
| --- | --- | --- |
| CI Core | `figma-verify-artifacts` | Verification JSON + MD |
| Pull Variables | `figma-pull-artifacts` | Raw + normalized + IDs + reports |
| Push Variables | `figma-push-artifacts` | Probe + push reports |
| Code Connect | `figma-codeconnect-artifacts` | Generated mappings + publish report |
| Webhook Sync | `sync-artifacts` | Variables + reports |

```bash
gh run list --limit 10
gh run download <RUN_ID>
```

---

## 6.9 Required GitHub Configuration Summary

### Secrets

| Secret | Used by |
| --- | --- |
| `FIGMA_ACCESS_TOKEN` | All Figma workflows |
| `FIGMA_FILE_KEY` | All Figma workflows |
| `FIGMA_REGION` | All Figma workflows |

### Variables

| Variable | Used by |
| --- | --- |
| `FIGMA_CODECONNECT_PUBLISH` | Code Connect Sync |
| `FIGMA_WEBHOOK_URL` | Health Monitor |

### Environments

| Environment | Used by |
| --- | --- |
| `figma-write` | Push Variables, Code Connect Sync |

### Repository Settings

| Setting | Value | Required by |
|---------|-------|-------------|
| `allow_auto_merge` | `true` | Webhook Sync |

---

# Part 7 — Code Connect

> Link Figma design components to their code implementations.

---

## 7.1 What Is Code Connect?

When a developer selects a component in Figma's **Dev Mode**, they see actual code that implements it — not auto-generated CSS.

```text
Figma Dev Mode:
┌──────────────────────────────────────────┐
│  ProductGrid (selected)                  │
│  Code:                                   │
│  ┌────────────────────────────────────┐  │
│  │ <ProductGrid                      │  │
│  │   products={products}             │  │
│  │   onFilter={handleFilter}         │  │
│  │ />                                │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## 7.2 Architecture

### 12 Components

| Component | Node ID | Source File |
| --- | --- | --- |
| ProductGrid | `5007:4606` | `ProductGrid.figma.tsx` |
| ProductCard | `5007:4605` | `ProductCard.figma.tsx` |
| ProductDetail | `5007:4607` | `ProductDetail.figma.tsx` |
| CartView | `5007:4608` | `CartView.figma.tsx` |
| CartSummary | `5007:4609` | `CartSummary.figma.tsx` |
| SearchBar | `5007:4610` | `SearchBar.figma.tsx` |
| CategoryFilter | `5007:4611` | `CategoryFilter.figma.tsx` |
| CheckoutForm | `5007:4612` | `CheckoutForm.figma.tsx` |
| PriceTag | `5007:4613` | `PriceTag.figma.tsx` |
| ReviewRating | `5007:4614` | `ReviewRating.figma.tsx` |
| OrderConfirmation | `5007:4615` | `OrderConfirmation.figma.tsx` |
| Wishlist | `5007:4667` | `Wishlist.figma.tsx` |

All files in `figma/code-connect/components/`.

---

## 7.3 How .figma.tsx Files Work

```tsx
import figma from "@figma/code-connect";

figma.connect(
  "https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=5007:4606",
  {
    example: () => (
      <ProductGrid
        products={products}
        onFilter={handleFilter}
        onAddToCart={handleAddToCart}
      />
    ),
  },
);
```

**Important Rules**:
1. Node IDs must refer to COMPONENT nodes
2. Node IDs are encoded in URLs: `5007:4606` → `5007-4606`
3. File key must match the file where the component lives

---

## 7.4 Pipeline Steps

| Step | Command | What it does |
| --- | --- | --- |
| Generate | `npm run figma:codeconnect:generate` | Build `mappings.generated.json` |
| Verify | `npm run figma:codeconnect:verify` | Check all 12 required components |
| Publish | `npm run figma:codeconnect:publish -- --apply` | Push code links to Figma Dev Mode |

---

## 7.5 Adding a New Component

1. Create a component in Figma → note its node ID
2. Add to `required-components.json`
3. Add to `mappings.source.json`
4. Create the `.figma.tsx` file
5. Run: `npm run figma:codeconnect:generate && npm run figma:codeconnect:verify && npm run figma:codeconnect:publish -- --apply`

---

## 7.6 Node ID Migration

If you move to a new Figma file, remap all node IDs in `mappings.source.json` and each `.figma.tsx` file URL.

---

# Part 8 — Configuration Reference

> Every configuration file, every key, every value — documented.

---

## 8.1 Configuration Files Overview

| File | Purpose | Managed By |
| --- | --- | --- |
| `figma/sync.config.json` | Central pipeline configuration | Hand-edited |
| `figma/figma.config.json` | Code Connect CLI config | Hand-edited |
| `figma/code-connect/mappings.source.json` | Component-to-node mapping | Hand-edited |
| `figma/code-connect/required-components.json` | Required components list | Hand-edited |
| `figma/code-connect/mappings.generated.json` | Enriched mappings (auto) | `figma:codeconnect:generate` |
| `tokens/figma/token-name-map.json` | CSS name overrides + required tokens | Hand-edited |
| `tokens/figma/.variable-ids.json` | Figma variable ID lookup (auto) | `figma:pull:variables` |

---

## 8.2 sync.config.json — Deep Dive

```json
{
  "primaryFileKey": "dbPjFeLfAFp8Sz9YGPs0CZ",
  "region": "us-east-1",
  "writeMode": "ci-enabled",
  "codeConnectMode": "publish-enabled",
  "routes": { "pull": "ci", "push": "ci", "publish": "ci" },
  "canary": {
    "enabled": true,
    "collectionNames": ["Canary", "MCP-UI Canary"],
    "maxVariables": 25
  }
}
```

### Key Reference

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `primaryFileKey` | `string` | — | Figma file key. Falls back to `$FIGMA_FILE_KEY` |
| `region` | `string` | `"us-east-1"` | Figma API region |
| `writeMode` | `string` | `"office-only"` | Controls write permissions |
| `codeConnectMode` | `string` | `"verify-only"` | Controls Code Connect publish |
| `routes.pull/push/publish` | `string` | varies | Context for operations |
| `canary.enabled` | `boolean` | `false` | Limits push scope |
| `canary.collectionNames` | `string[]` | `[]` | Allowed collections |
| `canary.maxVariables` | `number` | `25` | Max variables per push |

### writeMode Values

| Value | Behavior |
| --- | --- |
| `"disabled"` | All push blocked |
| `"office-only"` | Requires `FIGMA_WRITE_CONTEXT=office` |
| `"ci-enabled"` | Push from CI or local |

### codeConnectMode Values

| Value | Behavior |
| --- | --- |
| `"verify-only"` | Generate + verify; publish blocked |
| `"publish-enabled"` | Full pipeline |

### Recommended Configurations

**Conservative (Route A — Start Here)**:
```json
{
  "writeMode": "office-only",
  "codeConnectMode": "verify-only",
  "routes": { "pull": "ci", "push": "office", "publish": "office" },
  "canary": { "enabled": true, "collectionNames": ["Canary"], "maxVariables": 25 }
}
```

**Full Automation (Route B)**:
```json
{
  "writeMode": "ci-enabled",
  "codeConnectMode": "publish-enabled",
  "routes": { "pull": "ci", "push": "ci", "publish": "ci" },
  "canary": { "enabled": false }
}
```

---

## 8.3 figma.config.json

```json
{
  "codeConnect": {
    "parser": "react",
    "include": ["web-client/components/**/*.{ts,tsx}", "web-client/app/**/*.{ts,tsx}", "mcp-server/src/widgets/**/*.ts"],
    "exclude": ["**/*.test.*", "**/*.spec.*", "**/node_modules/**"]
  }
}
```

---

## 8.4 mappings.source.json

Hand-maintained mapping: each component → Figma node + source file.

---

## 8.5 required-components.json

12 components that must have valid Code Connect mappings for CI to pass.

---

## 8.6 token-name-map.json

Custom overrides for CSS variable name inference + list of required tokens validated by `figma:verify`.

---

## 8.7 Environment Variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `FIGMA_ACCESS_TOKEN` | Yes | — | Figma PAT |
| `FIGMA_FILE_KEY` | Conditional | From config | Figma file key |
| `FIGMA_REGION` | No | `"us-east-1"` | API region |
| `FIGMA_WRITE_CONTEXT` | For writes | — | Must match `routes.push`/`publish` |
| `FIGMA_WEBHOOK_PASSCODE` | For webhooks | — | Webhook passcode |
| `GITHUB_TOKEN` | For webhooks | — | GitHub PAT with `repo` scope |
| `GITHUB_REPO` | For webhooks | — | `owner/repo` format |

---

## 8.8 npm Scripts Reference

### Core Pipeline

| Script | Description |
| --- | --- |
| `figma:pull:variables` | Fetch variables from Figma API |
| `figma:normalize:variables` | Normalize raw payload |
| `figma:generate:tokens` | Generate CSS files |
| `tokens:sync` | Mirror tokens mcp-server → web-client |
| `tokens:check` | Check for token drift (CI gate) |
| `figma:push:variables` | Push CSS to Figma (dry-run default) |

### Code Connect

| Script | Description |
| --- | --- |
| `figma:codeconnect:generate` | Generate mappings.generated.json |
| `figma:codeconnect:verify` | Verify all required mappings |
| `figma:codeconnect:publish` | Publish to Figma Dev Mode |

### Diagnostics

| Script | Description |
| --- | --- |
| `figma:probe` | Test 4 API capabilities, recommend route |
| `figma:verify` | Run 5-check verification suite |

### Orchestrators

| Script | Description |
| --- | --- |
| `figma:sync:pull` | Full pull pipeline (5 steps) |
| `figma:sync:push` | Full push pipeline. `--apply` for writes |
| `figma:sync:full` | Complete bidirectional sync |
| `figma:sync:local` | Quick local pull + rebuild |

### Webhook

| Script | Description |
| --- | --- |
| `webhook:start` | Start local webhook receiver (port 4848) |
| `webhook:manage` | CLI for webhook CRUD |
| `webhook:test` | Send test payload to local receiver |

### Dev

| Script | Description |
| --- | --- |
| `dev` | Start all 3 services (MCP + web + webhook) |

---

## 8.9 GitHub Actions Configuration

### Secrets

| Name | Used By |
| --- | --- |
| `FIGMA_ACCESS_TOKEN` | All Figma workflows |
| `FIGMA_FILE_KEY` | All Figma workflows |
| `FIGMA_REGION` | All Figma workflows |

### Variables

| Name | Value | Used By |
| --- | --- | --- |
| `FIGMA_CODECONNECT_PUBLISH` | `"true"` or `"false"` | Code Connect Sync |
| `FIGMA_WEBHOOK_URL` | Receiver URL | Health Monitor |

### Environments

| Name | Purpose |
| --- | --- |
| `figma-write` | Write operations (push + publish) |

---

## 8.10 File Paths (PATHS Constant)

All paths defined in `scripts/figma-lib.mjs`:

| Constant | Path |
| --- | --- |
| `syncConfig` | `figma/sync.config.json` |
| `figmaConfig` | `figma/figma.config.json` |
| `mappingSource` | `figma/code-connect/mappings.source.json` |
| `mappingGenerated` | `figma/code-connect/mappings.generated.json` |
| `requiredComponents` | `figma/code-connect/required-components.json` |
| `tokenNameMap` | `tokens/figma/token-name-map.json` |
| `variablesRaw` | `tokens/figma/variables.raw.json` |
| `variablesNormalized` | `tokens/figma/variables.normalized.json` |
| `variableIds` | `tokens/figma/.variable-ids.json` |
| `lightCss` | `mcp-server/tokens/figma-tokens-light.css` |
| `darkCss` | `mcp-server/tokens/figma-tokens-dark.css` |
| `webLightCss` | `web-client/tokens/figma-tokens-light.css` |
| `webDarkCss` | `web-client/tokens/figma-tokens-dark.css` |
| `verificationJson` | `docs/code reports/figma-sync-verification.json` |
| `verificationMd` | `docs/code reports/figma-sync-verification.md` |
| `probeJson` | `docs/code reports/figma-capability-probe.json` |
| `probeMd` | `docs/code reports/figma-capability-probe.md` |
| `rolloutLog` | `docs/code reports/figma-cicd-rollout-log.md` |

---

## 8.11 Webhook & Production Configuration

### Webhook Receiver Environment Variables

| Variable | Purpose |
|---|---|
| `FIGMA_WEBHOOK_SECRET` | Validate incoming webhooks |
| `GITHUB_DISPATCH_TOKEN` | GitHub PAT with `repo` scope |
| `GITHUB_REPO` | Target repo (`owner/repo`) |
| `FIGMA_FILE_KEY` | Filter webhooks by file |

### Vercel Configuration (`web-client/vercel.json`)

```json
{
  "functions": {
    "app/api/figma-webhook/route.ts": { "maxDuration": 30 }
  },
  "headers": [
    {
      "source": "/api/figma-webhook",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Webhook-Related Files

| File | Purpose |
|---|---|
| `web-client/app/api/figma-webhook/route.ts` | Production webhook receiver |
| `scripts/figma-webhook-receiver.mjs` | Local/dev webhook receiver |
| `scripts/figma-webhook-manage.mjs` | CLI for webhook CRUD |
| `.github/workflows/figma-webhook-sync.yml` | Webhook-triggered workflow |
| `.github/workflows/webhook-health.yml` | Daily health monitor |

---

# Part 9 — Safety Patterns

> 13 guards that prevent accidental writes, drift, and broken deployments.

Every guard is **fail-closed** — if conditions aren't met, the operation aborts.

---

## 9.1 Guard Inventory

| # | Guard | Script | Blocks |
|---|---|---|---|
| 1 | Secret Guard | All scripts | Any operation without `FIGMA_ACCESS_TOKEN` |
| 2 | Write Mode Guard | `figma-push-variables.mjs` | Push when `writeMode` is wrong |
| 3 | Route Gating | Push + Publish scripts | Write when context ≠ route |
| 4 | Canary Guard | `figma-push-variables.mjs` | Push to non-canary collections |
| 5 | Rollback Snapshot | `figma-push-variables.mjs` | — (creates backup before write) |
| 6 | Library Variable Filter | `figma-push-variables.mjs` | Push to external library variables |
| 7 | Code Connect Mode Guard | `figma-codeconnect-publish.mjs` | Publish when not `publish-enabled` |
| 8 | Unresolved Node ID Guard | `figma-codeconnect-publish.mjs` | Publish with placeholder IDs |
| 9 | Token Drift Check | `figma-verify.mjs`, CI | Deploy when tokens out of sync |
| 10 | Typography Sanity | `figma-verify.mjs` | Tokens missing required font size |
| 11 | Alias Cycle Detection | `figma-normalizer.mjs` | Infinite loops in variable aliases |
| 12 | Webhook Passcode Validation | Webhook receivers | Unauthorized webhook payloads |
| 13 | Webhook Concurrency Control | `figma-webhook-sync.yml` | Parallel runs creating conflicts |

---

## 9.2 Guards 1–6: Write Pipeline Guards

### Guard 1: Secret Guard

Checks for `FIGMA_ACCESS_TOKEN` before any API call. Fix: `export FIGMA_ACCESS_TOKEN="figd_..."`.

### Guard 2: Write Mode Guard

Prevents push unless `writeMode` allows it. `disabled` → always blocked. `office-only` → requires `FIGMA_WRITE_CONTEXT=office`. `ci-enabled` → allows CI or local.

### Guard 3: Route Gating

Compares `routes.push`/`routes.publish` against `FIGMA_WRITE_CONTEXT`. They must match. Write Mode controls *whether* writes are allowed; Route Gating controls *where*.

### Guard 4: Canary Guard

When `canary.enabled=true`, limits push to named collections and enforces `maxVariables` count.

### Guard 5: Rollback Snapshot

Saves timestamped JSON of all variable values before pushing. Location: `tokens/figma/.rollback-{timestamp}.json` (gitignored).

### Guard 6: Library Variable Filter

Filters out variables from external Figma libraries (read-only in the consuming file). Prevents `400 Bad Request` errors.

---

## 9.3 Guards 7–8: Code Connect Guards

### Guard 7: Code Connect Mode Guard

Blocks publish when `codeConnectMode` is not `"publish-enabled"`.

### Guard 8: Unresolved Node ID Guard

Scans `.figma.tsx` files for placeholder node IDs (`0:0`, `XXXX:0`, empty strings). Blocks publish if any found.

---

## 9.4 Guards 9–11: Verification Guards

### Guard 9: Token Drift Check

Compares `mcp-server/tokens/` vs `web-client/tokens/` byte-for-byte. Fix: `npm run tokens:sync`.

### Guard 10: Typography Sanity

Ensures font-size tokens exist (14px, 16px, 20px, 24px, 32px).

### Guard 11: Alias Cycle Detection

Detects circular variable alias references (A → B → C → A) and breaks the cycle. Fix cycles in Figma.

---

## 9.5 Guards 12–13: Webhook Guards

### Guard 12: Webhook Passcode Validation

Every incoming POST must include a `passcode` field matching `FIGMA_WEBHOOK_SECRET`. Mismatches return 401.

### Guard 13: Webhook Concurrency Control

```yaml
concurrency:
  group: figma-webhook-sync
  cancel-in-progress: true
```

Latest webhook wins — prevents duplicate PRs from rapid saves.

---

## 9.6 Guard Coverage Matrix

| Guard | Pull | Push | Publish | Verify | Webhook |
|---|---|---|---|---|---|
| 1. Secret | ✅ | ✅ | ✅ | — | ✅ |
| 2. Write Mode | — | ✅ | — | — | ✅ |
| 3. Route Gating | — | ✅ | ✅ | — | ✅ |
| 4. Canary | — | ✅ | — | — | ✅ |
| 5. Rollback | — | ✅ | — | — | ✅ |
| 6. Library Filter | — | ✅ | — | — | ✅ |
| 7. CC Mode | — | — | ✅ | — | ✅ |
| 8. Unresolved IDs | — | — | ✅ | ✅ | ✅ |
| 9. Token Drift | — | — | — | ✅ | ✅ |
| 10. Typography | — | — | — | ✅ | ✅ |
| 11. Alias Cycles | ✅ | ✅ | — | — | ✅ |
| 12. Passcode | — | — | — | — | ✅ |
| 13. Concurrency | — | — | — | — | ✅ |

---

## 9.7 Adding a New Guard

1. Identify the risk
2. Choose the enforcement point (which script)
3. Implement fail-closed (default to blocking)
4. Add to `figma:verify` if applicable
5. Log clearly with actionable error messages
6. Document in this section

---

# Part 10 — Webhook-Driven Auto-Sync

> Go from "designer saves in Figma" to "PR opened with updated tokens" in under 60 seconds.

---

## 10.1 Overview

```
┌─────────────┐  webhook POST   ┌──────────────────────┐  repository_dispatch  ┌────────────────────┐
│   Figma     │ ──────────────► │  Webhook Receiver    │ ─────────────────────► │  GitHub Actions    │
│  (designer) │                 │  (Node.js / 4848)    │                        │  figma-webhook-    │
│             │                 │  or cloud function   │                        │  sync.yml          │
└─────────────┘                 └──────────────────────┘                        └────────────────────┘
                                                                                       │
                                                                              ┌────────▼────────┐
                                                                              │ Pull → Generate  │
                                                                              │ → Sync → Build   │
                                                                              │ → Verify → PR    │
                                                                              └─────────────────┘
```

### Involved Files

| File | Purpose |
|------|---------|
| `.github/workflows/figma-webhook-sync.yml` | Workflow triggered by `repository_dispatch` |
| `scripts/figma-webhook-receiver.mjs` | HTTP server converting webhooks → GitHub dispatches |
| `scripts/figma-webhook-manage.mjs` | CLI for webhook CRUD |
| `web-client/app/api/figma-webhook/route.ts` | Production receiver (ships with Next.js app) |

---

## 10.2 Prerequisites

- Completed [Part 2 — One-Time Setup](#part-2--one-time-setup)
- A GitHub PAT with `repo` scope
- A publicly accessible URL for the webhook receiver (or ngrok for local)

---

## 10.3 Deploy the Webhook Receiver

### Option A: Run Locally (Development)

```bash
npm run webhook:start
# In another terminal:
ngrok http 4848
```

### Option B: Deploy to Cloud

| Platform | How |
|----------|-----|
| Vercel | Wrap in `api/figma-webhook.js` |
| AWS Lambda | Behind API Gateway |
| Google Cloud Run | Containerize |
| Railway / Fly.io | Deploy as Node.js app |

### Option C: Built-in Next.js API Route (Recommended)

The web-client already includes a production-ready receiver at `web-client/app/api/figma-webhook/route.ts`. Deploys automatically with Next.js — no separate infrastructure.

Set environment variables on your hosting platform:
```bash
FIGMA_WEBHOOK_SECRET=your-passcode
GITHUB_DISPATCH_TOKEN=ghp_your_pat_with_repo_scope
GITHUB_REPO=Kari-Basavaraj/MCP-UI-DEMO-ECOMV2
FIGMA_FILE_KEY=dbPjFeLfAFp8Sz9YGPs0CZ
```

Webhook URL: `https://your-domain.com/api/figma-webhook`

---

## 10.4 Register the Figma Webhook

```bash
# FILE_UPDATE
node scripts/figma-webhook-manage.mjs create \
  --url https://your-domain.com/webhook \
  --team-id YOUR_FIGMA_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type FILE_UPDATE

# LIBRARY_PUBLISH (recommended for production)
node scripts/figma-webhook-manage.mjs create \
  --url https://your-domain.com/webhook \
  --team-id YOUR_FIGMA_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type LIBRARY_PUBLISH
```

### Finding Your Team ID

```
https://www.figma.com/files/team/1609792196781393010/...
                                ^^^^^^^^^^^^^^^^^
                                This is your team ID
```

---

## 10.5 Test the Pipeline

```bash
# Test local receiver
node scripts/figma-webhook-manage.mjs test --url http://localhost:4848

# Trigger workflow manually
gh workflow run figma-webhook-sync.yml -f reason="Manual test"

# Check runs
gh run list --workflow=figma-webhook-sync.yml --limit 5
```

---

## 10.6 How the Workflow Works

```
1. Checkout code
2. Setup Node.js 22 + cache
3. Install dependencies (root + mcp-server)
4. Pull variables from Figma API
5. Normalize variables
6. Generate CSS tokens (light + dark)
7. Sync tokens to both workspaces
8. Build all 12 widgets
9. Run figma:verify
10. Create/update PR on codex/figma-webhook-sync
11. Auto-merge (squash) when CI passes
```

---

## 10.7 Event Types

| Figma Event | GitHub Dispatch Type | When It Fires |
|-------------|---------------------|---------------|
| `FILE_UPDATE` | `figma_file_update` | Any save to the Figma file |
| `LIBRARY_PUBLISH` | `figma_library_publish` | Library version is published |

**Recommendation**: Use `LIBRARY_PUBLISH` for production — fires only on intentional publishes.

---

## 10.8 Security

- **Passcode validation**: Every incoming payload validated against `FIGMA_WEBHOOK_SECRET`
- **Minimal GitHub PAT scope**: Only `repo` access
- **Rate limiting**: Ignores non-matching file keys, unknown events
- **For production**: Consider IP allowlisting, request signing, rate limiting middleware

---

# Part 11 — Manual Developer Guide

> Run the entire pipeline from your terminal. No CI/CD, no webhooks — just you and the CLI.

---

## 11.1 When to Use This Guide

| Scenario | Use Manual? |
|----------|------------|
| Quick design change to test locally | ✅ |
| One-off token pull before a release | ✅ |
| Debugging pipeline failures | ✅ |
| Push CSS changes back to Figma | ✅ |
| Continuous automated sync in production | ❌ Use [Part 12](#part-12--production-automation) |

---

## 11.2 Prerequisites

```bash
export FIGMA_ACCESS_TOKEN="figd_YOUR_PAT"
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"
export FIGMA_REGION="us"

npm install && npm --prefix mcp-server install && npm --prefix web-client install
npm run figma:probe
```

---

## 11.3 Starting Local Dev — One Command

```bash
npm run dev
```

Starts 3 processes in parallel:

| Service | Port | Color |
|---------|------|-------|
| MCP Server | `:8787` | Blue |
| Web Client | `:3000` | Green |
| Webhook Receiver | `:4848` | Magenta |

### First-Time Setup

```bash
cp .env.example .env.local
# Fill in FIGMA_ACCESS_TOKEN, FIGMA_WEBHOOK_PASSCODE, GITHUB_TOKEN
```

### Instant Local Updates (Without GitHub Round-Trip)

```bash
npm run figma:sync:local
```

Pulls tokens from Figma and rebuilds widgets locally in ~10 seconds.

---

## 11.4 Workflow A — Pull Tokens (Read-Only)

```bash
npm run figma:sync:pull
# Runs: pull → normalize → generate → sync → verify
```

Then rebuild widgets:
```bash
npm --prefix mcp-server run build
```

---

## 11.5 Workflow B — Push Token Changes (Write)

```bash
# Dry-run first (always)
npm run figma:sync:push

# Apply after review
npm run figma:sync:push -- --apply
```

---

## 11.6 Workflow C — Full Bidirectional Sync

```bash
npm run figma:sync:full                                    # dry-run
npm run figma:sync:full -- --apply-push                    # with push
npm run figma:sync:full -- --apply-publish                 # with CC publish
npm run figma:sync:full -- --apply-push --apply-publish    # both
```

---

## 11.7 Workflow D — Code Connect Only

```bash
npm run figma:codeconnect:generate
npm run figma:codeconnect:verify
npm run figma:codeconnect:publish -- --apply
```

---

## 11.8 Workflow E — Webhook Management

```bash
node scripts/figma-webhook-manage.mjs list --team-id YOUR_TEAM_ID
node scripts/figma-webhook-manage.mjs create --url URL --team-id ID --passcode PW --event-type FILE_UPDATE
node scripts/figma-webhook-manage.mjs delete --webhook-id WEBHOOK_ID
node scripts/figma-webhook-manage.mjs test --url http://localhost:4848
```

---

## 11.9 Quick Reference — All Commands

### Read-Only (Safe)

| Command | What It Does |
|---------|--------------|
| `npm run figma:probe` | Test API connectivity |
| `npm run figma:sync:pull` | All 5 pull steps |
| `npm run figma:verify` | 5-check verification |
| `npm run tokens:check` | Check for token drift |
| `npm run figma:codeconnect:generate` | Generate CC mappings |
| `npm run figma:codeconnect:verify` | Verify CC mappings |

### Write Operations (Careful)

| Command | What It Does |
|---------|--------------|
| `npm run figma:sync:push` | Dry-run push |
| `npm run figma:sync:push -- --apply` | Write to Figma |
| `npm run figma:codeconnect:publish -- --apply` | Publish CC to Dev Mode |
| `npm run figma:sync:full -- --apply-push --apply-publish` | Full sync with writes |

### Build & Serve

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Start all 3 services |
| `npm --prefix mcp-server run build` | Build all 12 widgets |

---

## 11.10 Common Scenarios

### "I just pulled tokens but the widgets look the same"

```bash
npm run figma:sync:pull
npm --prefix mcp-server run build   # Don't forget this!
```

### "CI is failing with token-drift"

```bash
npm run tokens:sync
git add -A && git commit -m "fix: sync tokens"
```

### "I want to test without committing"

```bash
npm run figma:sync:pull
npm --prefix mcp-server run build
npm run dev
# Test at http://localhost:3000
# When done: git checkout -- .
```

---

# Part 12 — Production Automation

> Zero-touch design-to-code sync. Designer saves → tokens update → widgets rebuild → PR opens → auto-merges. No human intervention.

---

## 12.1 When to Use This Guide

| Scenario | Use Production Automation? |
|----------|---------------------------|
| Continuous design ops for a live product | ✅ |
| Team with multiple designers | ✅ |
| Want real-time sync | ✅ |
| Quick local test | ❌ Use [Part 11](#part-11--manual-developer-guide) |

---

## 12.2 Architecture Overview

```
┌──────────────┐     webhook POST     ┌─────────────────────┐     repository_dispatch     ┌──────────────────────┐
│    Figma     │ ────────────────────► │  Webhook Receiver   │ ───────────────────────────► │   GitHub Actions     │
│  (designer)  │                       │  Port 4848          │                              │   figma-webhook-     │
└──────────────┘                       └─────────────────────┘                              │   sync.yml           │
                                                                                            └──────────┬───────────┘
                                                                                                       │
                                                                                            Pipeline → PR → Auto-merge
```

### End-to-End Flow

1. Designer saves/publishes in Figma
2. Figma fires webhook
3. Receiver validates passcode + file key → `repository_dispatch` to GitHub
4. Actions: pull → normalize → generate → sync → rebuild → verify
5. PR created on `codex/figma-webhook-sync`
6. Auto-merge (squash) when CI passes
7. ~60 seconds end-to-end

---

## 12.3 Setup Checklist

### Step 1 — GitHub Secrets

```bash
gh secret set FIGMA_ACCESS_TOKEN --body "figd_..."
gh secret set FIGMA_FILE_KEY --body "dbPjFeLfAFp8Sz9YGPs0CZ"
gh secret set FIGMA_REGION --body "us"
```

### Step 2 — Enable Auto-Merge

```bash
gh api repos/YOUR_OWNER/YOUR_REPO -X PATCH -f allow_auto_merge=true
```

### Step 3 — Deploy Webhook Receiver

Recommended: Use the built-in Next.js API route (deploys with your app).

### Step 4 — Register Figma Webhooks

```bash
node scripts/figma-webhook-manage.mjs create \
  --url https://YOUR_URL/webhook --team-id YOUR_TEAM_ID \
  --passcode "your-passcode" --event-type FILE_UPDATE

node scripts/figma-webhook-manage.mjs create \
  --url https://YOUR_URL/webhook --team-id YOUR_TEAM_ID \
  --passcode "your-passcode" --event-type LIBRARY_PUBLISH
```

### Step 5 — Test End-to-End

```bash
npm run webhook:test
gh run list --workflow=figma-webhook-sync.yml --limit 3
```

---

## 12.4 What the Workflow Does

| # | Step | Command |
|---|------|---------|
| 1 | Log trigger context | — |
| 2 | Validate file key | — |
| 3 | Checkout code | `actions/checkout@v4` |
| 4 | Setup Node.js | `actions/setup-node@v4` (22) |
| 5 | Install deps | `npm ci` |
| 6 | Check secrets | — |
| 7 | Pull variables | `npm run figma:pull:variables` |
| 8 | Normalize | `npm run figma:normalize:variables` |
| 9 | Generate CSS | `npm run figma:generate:tokens` |
| 10 | Sync tokens | `npm run tokens:sync` |
| 11 | Build widgets | `npm --prefix mcp-server run build` |
| 12 | Verify | `npm run figma:verify` |
| 13 | Diff summary | `git add -A && git diff --cached` |
| 14 | Create PR | `peter-evans/create-pull-request@v6` |
| 15 | Auto-merge | `gh pr merge --auto --squash` |

---

## 12.5 Production Recommendations

### Use LIBRARY_PUBLISH Over FILE_UPDATE

| Event | When It Fires | For |
|-------|--------------|-----|
| `FILE_UPDATE` | Every save | Development/testing |
| `LIBRARY_PUBLISH` | Only on publish | **Production** |

### Monitoring

```bash
gh run list --workflow=figma-webhook-sync.yml --limit 10
gh run view RUN_ID --log-failed
```

### Webhook Health

Check and re-create if `DISABLED`:
```bash
node scripts/figma-webhook-manage.mjs list --team-id YOUR_TEAM_ID
```

### Security Hardening

| Measure | How |
|---------|-----|
| Strong passcode | 32+ char random string |
| Minimal PAT scope | Only `repo` access |
| HTTPS only | Never plain HTTP |
| Rotate credentials | Periodically |

---

## 12.6 Scheduled Automation (Cron)

Safety net — catches anything webhooks miss:

| Time (UTC) | Workflow | What It Does |
|-----------|----------|--------------|
| 03:00 | Pull Variables | Pull + normalize + generate → PR |
| 03:30 | Code Connect Sync | Generate + verify + publish |
| 04:00 | Push Variables | Dry-run push |
| 06:00 | Health Monitor | Verify webhook infrastructure |

---

## 12.7 Deployment Variants

| Level | Architecture |
|-------|-------------|
| **Minimal** | Figma → Local receiver + ngrok → Actions → PR (manual merge) |
| **Standard** | Figma → Cloud function (Vercel) → Actions → PR → Auto-merge |
| **Enterprise** | Figma → Load-balanced receivers → Actions → PR → Required reviews → Merge → Slack → Deploy |

---

## 12.8 Manual vs Automated Comparison

| Aspect | Manual | Automated |
|--------|--------|-----------|
| Trigger | Developer runs CLI | Figma save/publish |
| Latency | Seconds (local) | ~60s (webhook → PR) |
| Widget rebuild | Manual | Automatic |
| PR creation | Manual | Automatic |
| Merge | Manual | Auto-merge |
| Best for | Development, debugging | Production, continuous ops |

---

# Part 13 — Troubleshooting

> Every error we've encountered, why it happened, and how to fix it.

---

## 13.1 Quick Diagnostic Commands

```bash
echo "TOKEN: ${FIGMA_ACCESS_TOKEN:0:10}..."
echo "FILE_KEY: $FIGMA_FILE_KEY"
echo "REGION: $FIGMA_REGION"
echo "WRITE_CONTEXT: $FIGMA_WRITE_CONTEXT"

curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/me" | jq '.handle'

npm run figma:probe
npm run figma:verify
npm run tokens:check
```

---

## 13.2 Authentication & API Errors

| Error | Cause | Fix |
|---|---|---|
| `Missing FIGMA_ACCESS_TOKEN` | Env var not set | `export FIGMA_ACCESS_TOKEN="figd_..."` |
| `Pull failed (403)` | PAT expired or insufficient scopes | Regenerate PAT with Variables read+write scope |
| `Pull failed (404)` | Wrong file key or file deleted | Verify file key: `curl .../v1/files/$FIGMA_FILE_KEY?depth=1` |
| `Push failed (400)` | Attempting to write library variables | Library filter should handle; check for remote vars |

---

## 13.3 Token & Build Errors

| Error | Cause | Fix |
|---|---|---|
| `drift: figma-tokens-light.css differs` | Token files out of sync | `npm run tokens:sync` + commit |
| `unable to resolve light mode` | No "Light" mode in Figma | Check `jq '.modeSelection'` in normalized JSON |
| `missing-required-tokens` | Token in name map missing from CSS | Add variable in Figma or remove from `requiredTokens` |
| `invalid-font-weight-units` | Font-weight has `px` suffix | Check `shouldBeUnitless()` in `figma-lib.mjs` |

---

## 13.4 Push-Specific Errors

| Error | Cause | Fix |
|---|---|---|
| `writeMode=disabled` | Push blocked by config | Set `writeMode: "ci-enabled"` |
| `writeMode=office-only` | Missing write context | `export FIGMA_WRITE_CONTEXT=office` |
| `Canary guard triggered` | Too many variables | Increase `maxVariables` or disable canary |
| `filteredUpdates: 0` | Collection names don't match canary | Check `canary.collectionNames` vs Figma collections |

---

## 13.5 Code Connect Errors

| Error | Cause | Fix |
|---|---|---|
| `Missing generated mappings` | Didn't run generate | `npm run figma:codeconnect:generate` |
| `Cannot publish with unresolved node IDs` | Placeholder IDs | Fill in real node IDs from Figma |
| `Code Connect publish failed` | PAT scope issues | Re-check PAT has Code Connect write scope |

---

## 13.6 CI Workflow Errors

| Error | Cause | Fix |
|---|---|---|
| CI Core passes but Pull fails | Pull needs `FIGMA_ACCESS_TOKEN` secret | Ensure secret is set at repo level |
| Dev Mode shows stale code | Figma caches CC data | Wait 5 min, reload Figma file |
| No automated PR | No token files changed | Expected — no PR when values unchanged |

---

## 13.7 Webhook & Automation Errors

### Webhook Not Firing

| Check | Fix |
|-------|-----|
| Webhook status `INACTIVE` | Re-create via `figma-webhook-manage.mjs create` |
| Endpoint not reachable | Ensure publicly accessible URL |
| Wrong team ID | Use team ID from URL, not org/workspace ID |

### Receiver Not Dispatching

| Check | Fix |
|-------|-----|
| 401 response | Verify `FIGMA_WEBHOOK_SECRET` matches webhook passcode |
| No workflow triggered | Check `GITHUB_DISPATCH_TOKEN` has `repo` scope |
| GitHub API fails | Check outbound HTTPS access |

### Webhook Sync Workflow Fails

| Check | Fix |
|-------|-----|
| No PR created | No token changes — expected behavior |
| Auto-merge fails | Enable: `gh api repos/OWNER/REPO -X PATCH -f allow_auto_merge=true` |
| Merge blocked | Branch protection requires reviews |

### Health Monitor Issues

| Check | Fix |
|-------|-----|
| Always fails | Set `FIGMA_WEBHOOK_URL` variable |
| Stale alerts | Ensure `webhook-alert` label exists |

---

## 13.8 Recovery Procedures

### Full Reset

```bash
rm -f tokens/figma/variables.{raw,normalized}.json tokens/figma/.variable-ids.json
rm -f {mcp-server,web-client}/tokens/figma-tokens-{light,dark}.css
npm run figma:sync:pull
git add -A && git commit -m "fix: full token re-pull"
```

### Rollback a Bad Push

```bash
ls tokens/figma/rollback-*.json    # Find pre-push snapshot
git revert <COMMIT_SHA>            # Revert the CSS change
npm run figma:push:variables -- --apply   # Push reverted values
```

### Wrong File Key

Update `sync.config.json`, `FIGMA_FILE_KEY` env + secret, all `.figma.tsx` URLs, then re-pull.

---

## 13.9 Log Files

| File | Contents |
| --- | --- |
| `docs/code reports/figma-cicd-rollout-log.md` | One-line log of every operation |
| `docs/code reports/figma-sync-verification.json` | Last verification result |
| `docs/code reports/figma-capability-probe.json` | Last probe result |
| `docs/code reports/figma-push-report-*.json` | Push reports (timestamped) |
| `docs/code reports/figma-codeconnect-publish-*.json` | Publish reports |

---

# Part 14 — How to Fork & Customize

> Use this repo as a template for your own Figma ↔ Code pipeline.

---

## 14.1 Forking This Repo as a Template

```bash
# 1. Fork on GitHub (or use "Use this template" if repo is a template)
gh repo fork Kari-Basavaraj/MCP-UI-DEMO-ECOMV2 --clone
cd MCP-UI-DEMO-ECOMV2

# 2. Remove project-specific content
rm -rf screenshots/ assets/product-images/
rm -rf docs/code\ reports/*.json docs/code\ reports/*.md
rm -f tokens/figma/variables.raw.json tokens/figma/variables.normalized.json
rm -f tokens/figma/.variable-ids.json

# 3. Update the Figma file key everywhere
# (see Customization Checklist below)

# 4. Run setup
npm run install:all
npm run figma:probe
npm run figma:sync:pull
```

---

## 14.2 Customization Checklist

After forking, update these files with your project's values:

| What to Change | Where | Example |
|----------------|-------|---------|
| Figma file key | `figma/sync.config.json` → `primaryFileKey` | `"abc123XYZ"` |
| File key in .figma.tsx URLs | `figma/code-connect/components/*.figma.tsx` | Update the URL in each file |
| File key in mappings | `figma/code-connect/mappings.source.json` → `fileKey` | Update the top-level `fileKey` |
| Component node IDs | `mappings.source.json` → each entry's `nodeId` | Get from your Figma file |
| Token namespace | `scripts/figma-lib.mjs` → `componentAliasBlock()` | Change `--sds-*` to `--your-prefix-*` |
| Region | `figma/sync.config.json` → `region` | `"us"` or `"eu-west-1"` |
| GitHub repo path | `GITHUB_REPO` env var | `"your-org/your-repo"` |
| Team ID | Webhook setup commands | Your Figma team ID |
| Canary collections | `figma/sync.config.json` → `canary.collectionNames` | Your Figma collection names |
| Required components | `figma/code-connect/required-components.json` | Your component list |
| Webhook passcode | `FIGMA_WEBHOOK_PASSCODE` env var | Generate a strong random string |

---

## 14.3 Swapping the UI Framework

The token pipeline is framework-agnostic — it outputs standard CSS custom properties. To use with a different framework:

### React / Next.js (Current)
No changes needed. CSS custom properties work natively.

### Vue / Nuxt
1. Replace `web-client/` with your Vue/Nuxt app
2. Import `tokens/figma-tokens-light.css` in your root component
3. Reference tokens with `var(--sds-*)` in your styles
4. Update `figma.config.json` → `include` patterns for `.vue` files

### Svelte / SvelteKit
Same approach — import the CSS, use `var()` in styles.

### Vanilla / Web Components
Import the CSS in your HTML `<head>`, tokens work everywhere.

### Tailwind Integration
Map tokens to Tailwind config:
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: 'var(--sds-color-background-brand-default)',
        danger: 'var(--sds-color-background-danger-default)',
      },
    },
  },
};
```

---

## 14.4 Token Namespace Customization

To change from `--sds-*` to your own prefix:

1. **Update `token-name-map.json`**: Change all `--sds-*` entries to your prefix
2. **Update `figma-lib.mjs`**: Change `componentAliasBlock()` to use your prefix
3. **Update widget CSS**: Search/replace `--sds-` → `--your-prefix-` in all widget HTML files
4. **Re-pull**: `npm run figma:sync:pull` to regenerate with new names

---

## 14.5 Adding Your Own Components

1. **Remove the 12 e-commerce components** (or keep them as examples):
   ```bash
   rm figma/code-connect/components/*.figma.tsx
   ```

2. **Clear required-components.json**:
   ```json
   { "components": [] }
   ```

3. **Add your own components** following the pattern in [Part 7](#part-7--code-connect):
   - Create component in Figma
   - Note the node ID
   - Add to `required-components.json`
   - Add to `mappings.source.json`
   - Create `.figma.tsx` file
   - Run generate → verify → publish

---

## 14.6 CI/CD Customization

### Using Different CI (GitLab CI, CircleCI, etc.)

The pipeline scripts are plain Node.js ESM — they work anywhere Node.js runs. Only the workflow YAML files are GitHub-specific. To port:

1. Keep the `scripts/` directory as-is
2. Create equivalent CI config for your platform
3. Set the same environment variables
4. Run the same `npm run` commands

### Reducing Workflow Scope

If you don't need all 6 workflows:

| What you want | Keep these workflows |
|---------------|---------------------|
| Read-only sync | CI Core + Pull Variables |
| Full bidirectional | CI Core + Pull + Push |
| With Code Connect | + Code Connect Sync |
| With webhooks | + Webhook Sync + Health Monitor |

### Customizing Cron Schedules

Edit the `schedule` blocks in `.github/workflows/*.yml`:
```yaml
schedule:
  - cron: '0 3 * * *'   # Change this to your preferred time
```

---

## 14.7 Removing What You Don't Need

### If you don't use Code Connect
- Delete `figma/code-connect/` directory
- Delete `figma-codeconnect-*.mjs` scripts
- Remove `.github/workflows/figma-codeconnect-sync.yml`
- Set `codeConnectMode: "verify-only"` (or remove the key)

### If you don't need push (Code → Figma)
- Set `writeMode: "disabled"` in `sync.config.json`
- Remove `.github/workflows/figma-push-variables.yml`
- Delete `figma-push-variables.mjs`

### If you don't use webhooks
- Remove `.github/workflows/figma-webhook-sync.yml`
- Remove `.github/workflows/webhook-health.yml`
- Delete `scripts/figma-webhook-receiver.mjs`
- Delete `scripts/figma-webhook-manage.mjs`
- Remove `web-client/app/api/figma-webhook/`

### If you only want local (no CI)
- Keep all scripts
- Delete `.github/workflows/` directory
- Use `npm run figma:sync:pull` / `push` locally

---

# Appendix — Glossary

| Term | Definition |
|------|-----------|
| **Figma Variables** | Design tokens stored in Figma's Variables panel (colors, spacing, etc.) |
| **CSS Custom Properties** | `--sds-*` variables in `:root {}` blocks consumed by widgets/apps |
| **Code Connect** | Figma feature linking design components to code implementations |
| **PAT** | Personal Access Token for Figma API authentication |
| **Canary** | Limited-scope push mode for safe initial testing |
| **Route** | Configuration determining CI automation level (A, B, or C) |
| **Token Drift** | Mismatch between mcp-server and web-client token files |
| **Webhook Receiver** | HTTP server converting Figma webhook events into GitHub dispatches |
| **Rollback Snapshot** | JSON backup of all Figma variables captured before each push |
| **Normalizer** | Script that transforms raw Figma API response into flat CSS-ready format |

---

*End of Playbook — Version 1.0 — 2026-03-01*
