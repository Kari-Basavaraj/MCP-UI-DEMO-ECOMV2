# GitHub Actions CI/CD Setup

## Overview

Four workflows automate the Figma ↔ Code pipeline:

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI Core** | `ci-core.yml` | Push to `main`, PRs | Build, test, token drift check, verify |
| **Figma Pull Variables** | `figma-pull-variables.yml` | Daily 3 AM UTC, manual | Pull Figma variables → CSS tokens → auto-PR |
| **Figma Code Connect Sync** | `figma-codeconnect-sync.yml` | Daily 3:30 AM UTC, manual, path changes | Generate + verify + publish Code Connect |
| **Figma Push Variables** | `figma-push-variables.yml` | Daily 4 AM UTC, manual | Push code-side token changes back to Figma |

## Required Configuration

### 1. Repository Secrets

Go to **Settings → Secrets and variables → Actions → Secrets**:

| Secret | Value | Used By |
|--------|-------|---------|
| `FIGMA_ACCESS_TOKEN` | Figma personal access token (`figd_...`) | Pull, Push, Code Connect |
| `FIGMA_FILE_KEY` | `dbPjFeLfAFp8Sz9YGPs0CZ` | Pull, Push, Code Connect |
| `FIGMA_REGION` | _(blank for US, `eu` for EU)_ | Pull, Push, Code Connect |

### 2. Repository Variables

Go to **Settings → Secrets and variables → Actions → Variables**:

| Variable | Value | Purpose |
|----------|-------|---------|
| `FIGMA_CODECONNECT_PUBLISH` | `true` | Enables Code Connect publish in CI |

### 3. Environment: `figma-write`

Go to **Settings → Environments → New environment**:

- **Name**: `figma-write`
- **Protection rules** (recommended):
  - Required reviewers: Add 1+ reviewer
  - Only allow `main` branch
- **Environment secrets**:
  - Add `FIGMA_ACCESS_TOKEN` here too (for push protection isolation)

### Quick Setup Script

```bash
# Authenticate GitHub CLI first
gh auth login

# Then run the setup script
export FIGMA_ACCESS_TOKEN=figd_your_token_here
./scripts/setup-github-actions.sh
```

## Workflow Details

### CI Core (`ci-core.yml`)

Runs on every push and PR. No Figma API access needed (offline checks only).

**Steps:**
1. Install all 3 workspaces (root, mcp-server, web-client)
2. `tokens:check` — verify token CSS files haven't drifted between mcp-server and web-client
3. Build widgets (`mcp-server`)
4. Run mcp-server tests
5. Build web-client (Next.js)
6. `figma:verify` — check required tokens exist in CSS, no font-weight violations, etc.
7. Upload verification artifacts

### Figma Pull Variables (`figma-pull-variables.yml`)

Pulls current Figma variables and creates a PR with updated CSS tokens.

**Pipeline:** `pull → normalize → generate → sync → verify`

**Auto-PR:** Uses `peter-evans/create-pull-request@v6` to create/update a PR on the `codex/figma-pull-variables` branch with all token changes.

### Figma Code Connect Sync (`figma-codeconnect-sync.yml`)

Keeps Code Connect mappings in sync. Triggers on:
- Changes to `figma/code-connect/**`, `web-client/components/**`, `mcp-server/src/widgets/**`
- Daily schedule
- Manual dispatch

**Steps:** Generate mappings → Verify (12/12) → Optionally publish (if `FIGMA_CODECONNECT_PUBLISH=true`)

### Figma Push Variables (`figma-push-variables.yml`)

Pushes code-side token changes back to Figma. Protected by `figma-write` environment.

- Scheduled runs are **dry-run only** (safe)
- Manual dispatch with `apply=true` performs the actual push
- Always runs `figma:verify` after push

## Testing Workflows

```bash
# Trigger pull workflow manually
gh workflow run "Figma Pull Variables" --repo Kari-Basavaraj/MCP-UI-DEMO-ECOMV2

# Trigger Code Connect sync
gh workflow run "Figma Code Connect Sync" --repo Kari-Basavaraj/MCP-UI-DEMO-ECOMV2

# Trigger push (dry-run)
gh workflow run "Figma Push Variables" --repo Kari-Basavaraj/MCP-UI-DEMO-ECOMV2

# Trigger push (apply)
gh workflow run "Figma Push Variables" --repo Kari-Basavaraj/MCP-UI-DEMO-ECOMV2 -f apply=true

# Watch a running workflow
gh run list --repo Kari-Basavaraj/MCP-UI-DEMO-ECOMV2 --limit 5
gh run watch --repo Kari-Basavaraj/MCP-UI-DEMO-ECOMV2
```

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| 403 on Variables API | Wrong auth header | Ensure `X-Figma-Token` header (not `Bearer`) |
| `figma:verify` fails with missing tokens | Token CSS not regenerated | Run `npm run figma:sync:pull` locally, commit |
| Code Connect "not a component" | Figma node is a Frame, not Component | Convert to Component in Figma |
| `npm ci` fails | Missing package-lock.json | Run `npm install` and commit lock file |
| Push workflow blocked | `figma-write` environment requires approval | Approve in GitHub Actions UI |
