# Figma ↔ Code CI/CD Automation — Executive Playbook

> **The streamlined reference for teams that want to understand, operate, and customize the Figma ↔ Code pipeline without reading 4,700 lines.**
>
> This Executive edition covers the same system as the [Full Playbook](./Figma-Code-CICD-Automation-Playbook-Full.md) but consolidates redundant content, uses cross-references, and highlights decisions over mechanics.

**Version**: 1.0 · **Last updated**: 2026-03-01 · **Repo**: [MCP-UI-DEMO-ECOMV2](https://github.com/Kari-Basavaraj/MCP-UI-DEMO-ECOMV2)

---

## Table of Contents

1. [What This System Does](#1-what-this-system-does)
2. [Quick Start](#2-quick-start)
3. [Architecture at a Glance](#3-architecture-at-a-glance)
4. [Setup (One-Time)](#4-setup-one-time)
5. [Pull: Figma → Code](#5-pull-figma--code)
6. [Push: Code → Figma](#6-push-code--figma)
7. [CI/CD Pipelines](#7-cicd-pipelines)
8. [Code Connect](#8-code-connect)
9. [Webhook Auto-Sync](#9-webhook-auto-sync)
10. [Safety Model](#10-safety-model)
11. [Essential Commands](#11-essential-commands)
12. [Configuration Quick Ref](#12-configuration-quick-ref)
13. [Troubleshooting Cheat Sheet](#13-troubleshooting-cheat-sheet)
14. [How to Fork & Customize](#14-how-to-fork--customize)

---

## 1. What This System Does

A **production-grade, bidirectional pipeline** keeping Figma design tokens and code in continuous sync:

```
Figma Variables ◄─────────────────────────► CSS Custom Properties (--sds-*)
                 Pull (read-only, safe)
                 Push (guarded, explicit)
```

| Capability | How |
|------------|-----|
| **Figma → Code** | Pull variables → normalize → generate CSS → mirror → PR | 
| **Code → Figma** | Parse CSS → map IDs → rollback snapshot → push via API |
| **Code Connect** | Link 12 components in Figma Dev Mode to their code |
| **Webhooks** | Real-time: Figma save → webhook → GitHub Actions → auto-merge PR |
| **Safety** | 13 independent guards, fail-closed, rollback snapshots |

### Two Modes

| Mode | For | Guide |
|------|-----|-------|
| **Manual** | Local dev, debugging, one-off syncs | [§11 Commands](#11-essential-commands) |
| **Production** | Zero-touch automation, team workflows | [§9 Webhooks](#9-webhook-auto-sync) |

---

## 2. Quick Start

```bash
# Clone, install, sync
git clone https://github.com/Kari-Basavaraj/MCP-UI-DEMO-ECOMV2.git && cd MCP-UI-DEMO-ECOMV2
export FIGMA_ACCESS_TOKEN="figd_..." FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"
npm run install:all
npm run figma:probe        # Verify API access (expect Route A or B)
npm run figma:sync:pull    # Pull tokens from Figma → CSS
npm run dev                # Start all 3 services (MCP :8787, Web :3000, Webhook :4848)
```

---

## 3. Architecture at a Glance

### Script Pipeline

```
figma-pull-variables → figma-normalize-variables → figma-generate-tokens → sync-tokens → figma-verify
                                                                                              │
figma-push-variables ◄────────────────────────────────────────────────────────────────────────┘
                                                                                              │
figma-codeconnect-generate → figma-codeconnect-verify → figma-codeconnect-publish ◄──────────┘
```

### Key Files

| File | Role |
|------|------|
| `figma/sync.config.json` | Central config — writeMode, routes, canary |
| `tokens/figma/variables.normalized.json` | Normalized Figma variables |
| `tokens/figma/.variable-ids.json` | CSS var → Figma ID lookup |
| `mcp-server/tokens/figma-tokens-{light,dark}.css` | Canonical CSS tokens |
| `web-client/tokens/figma-tokens-{light,dark}.css` | Mirror (auto-synced) |
| `figma/code-connect/components/*.figma.tsx` | 12 Code Connect component files |
| `scripts/figma-lib.mjs` | Shared library (PATHS, API client, utilities) |

### Token Naming

```
--sds-{category}-{subcategory}-{variant}
  │     │              │           │
  │     │              │           └─ default, secondary, hover, ...
  │     │              └─────────── brand, danger, positive, ...
  │     └──────────────────────── color, size, typo, comp
  └────────────────────────────── namespace (Design System)
```

### Route System

| Route | Pull | Push | Publish | Risk |
|-------|------|------|---------|------|
| **C** | ❌ | ❌ | ❌ | Lowest — fix auth |
| **A** | ✅ | ❌ | ❌ | Medium — CI reads only |
| **B** | ✅ | ✅ | ✅ | Highest (guarded) — full CI |

---

## 4. Setup (One-Time)

### Prerequisites

Node.js 22+, npm 10+, git, `gh` CLI, Figma Pro/Enterprise account.

### Figma PAT

Generate at [figma.com/settings](https://www.figma.com/settings) with scopes: **File content** (read), **Variables** (read+write), **Code Connect** (write), **Webhooks** (read, optional).

### GitHub Configuration

```bash
# Secrets
gh secret set FIGMA_ACCESS_TOKEN --body "figd_..."
gh secret set FIGMA_FILE_KEY --body "YOUR_KEY"
gh secret set FIGMA_REGION --body "us-east-1"

# Variable
gh variable set FIGMA_CODECONNECT_PUBLISH --body "true"

# Environment: create "figma-write" at Settings → Environments
# Add same 3 secrets + optional required reviewers

# Auto-merge (for webhook sync)
gh api repos/OWNER/REPO -X PATCH -f allow_auto_merge=true
```

### Configuration

Edit `figma/sync.config.json`:

```json
{
  "primaryFileKey": "YOUR_KEY",
  "writeMode": "office-only",      // Start conservative
  "codeConnectMode": "verify-only",
  "routes": { "pull": "ci", "push": "office", "publish": "office" },
  "canary": { "enabled": true, "collectionNames": ["Canary"], "maxVariables": 25 }
}
```

Graduate to `"ci-enabled"` / `"publish-enabled"` / `routes: "ci"` after validation.

### Verify

```bash
npm run figma:probe         # Route A or B = success
npm run figma:sync:pull     # Pull tokens
npm run figma:verify        # 5 checks pass
```

---

## 5. Pull: Figma → Code

**Safe, read-only** — never writes to Figma.

```bash
npm run figma:sync:pull    # One command: pull → normalize → generate → sync → verify
```

### What Happens

1. GET variables from Figma API → `variables.raw.json`
2. Normalize → flat `{ cssVar, value, modes }` → `variables.normalized.json`
3. Generate CSS → `:root { --sds-*: value; }` with light/dark modes
4. Mirror → copy to `web-client/tokens/`
5. Verify → 5 integrity checks

### Triggers

| Where | When |
|-------|------|
| Local | `npm run figma:sync:pull` |
| CI | Daily 03:00 UTC (cron) |
| Webhook | Real-time on Figma save (→ PR → auto-merge) |

### After Pull, Rebuild Widgets

```bash
npm --prefix mcp-server run build
```

---

## 6. Push: Code → Figma

**Destructive — 6 safety guards** protect every push.

```bash
npm run figma:sync:push               # Dry-run (always do this first)
npm run figma:sync:push -- --apply    # Writes to Figma for real
```

### What Happens

1. Parse CSS → `{ cssVar: value }` map
2. Map to Figma IDs via `.variable-ids.json`
3. Convert CSS → Figma format (`#hex` → `{ r, g, b, a }`, strip `px`, etc.)
4. Apply 6 guards: WriteMode, Route, Canary, Library, Rollback, Count
5. POST to Figma API

### Rollback

```bash
ls tokens/figma/rollback-*.json     # Snapshots before each push
git revert HEAD && npm run figma:sync:push -- --apply
```

---

## 7. CI/CD Pipelines

### 6 Workflows — Summary

| # | Workflow | Trigger | Writes? | Key Feature |
|---|----------|---------|---------|-------------|
| 1 | **CI Core** | Push + PR | No | Token drift check gates every build |
| 2 | **Pull Variables** | Daily 03:00 + manual | No | Creates PR on `codex/figma-pull-variables` |
| 3 | **Push Variables** | Daily 04:00 (dry) + manual | Yes | `figma-write` environment |
| 4 | **Code Connect** | Path change + daily 03:30 | Yes | Conditional on `FIGMA_CODECONNECT_PUBLISH` |
| 5 | **Webhook Sync** | `repository_dispatch` | No | Rebuilds widgets + auto-merges PR |
| 6 | **Health Monitor** | Daily 06:00 + manual | No | Creates/closes issues on webhook failure |

### Timeline

```
Real-time ─── Webhook Sync ────── webhook → pull → build → PR → auto-merge
03:00 UTC ─── Pull Variables ──── safety net pull
03:30 UTC ─── Code Connect ────── generate → verify → publish
04:00 UTC ─── Push Variables ──── dry-run (manual apply)
06:00 UTC ─── Health Monitor ──── webhook alive check
On push   ─── CI Core ─────────── build + test + drift + verify
```

### Webhook Sync vs Pull Variables

| | Pull Variables | Webhook Sync |
|-|----------------|--------------|
| Trigger | Cron | Real-time webhook |
| Widget rebuild | ❌ | ✅ |
| Auto-merge | ❌ | ✅ |
| Concurrency | None | Cancel-in-progress |

---

## 8. Code Connect

Links 12 components to their code so developers see implementation in Figma Dev Mode.

### Components

ProductGrid · ProductCard · ProductDetail · CartView · CartSummary · SearchBar · CategoryFilter · CheckoutForm · PriceTag · ReviewRating · OrderConfirmation · Wishlist

### Pipeline

```bash
npm run figma:codeconnect:generate     # Build mappings.generated.json
npm run figma:codeconnect:verify       # Check all 12 components
npm run figma:codeconnect:publish -- --apply   # Push to Figma Dev Mode
```

### Adding a Component

1. Create in Figma → note node ID
2. Add to `required-components.json` + `mappings.source.json`
3. Create `.figma.tsx` file with `figma.connect(url, { example: () => <YourComponent /> })`
4. Run generate → verify → publish

---

## 9. Webhook Auto-Sync

```
Figma save → Webhook POST → Receiver validates → repository_dispatch → GitHub Actions → PR → Auto-merge
                                                                                              (~60 seconds)
```

### Setup

1. **Deploy receiver** — Option A: local `npm run webhook:start` + ngrok. Option B: cloud (Vercel, AWS). Option C (recommended): built-in `web-client/app/api/figma-webhook/route.ts` — deploys with your app.
2. **Register webhooks**:
   ```bash
   node scripts/figma-webhook-manage.mjs create \
     --url https://YOUR_URL/webhook --team-id YOUR_TEAM_ID \
     --passcode "your-passcode" --event-type LIBRARY_PUBLISH
   ```
3. **Test**: `npm run webhook:test`

### Event Types

| Event | When | For |
|-------|------|-----|
| `FILE_UPDATE` | Every save | Development |
| `LIBRARY_PUBLISH` | Intentional publish | **Production** |

---

## 10. Safety Model

### 13 Guards (Fail-Closed)

| # | Guard | Protects Against |
|---|-------|-----------------|
| 1 | Secret | No token = no API calls |
| 2 | Write Mode | Accidental writes in read-only env |
| 3 | Route Gating | Writes from wrong context |
| 4 | Canary | Scope creep on push |
| 5 | Rollback Snapshot | Data loss (backup before every push) |
| 6 | Library Filter | 400 errors from remote variables |
| 7 | CC Mode | Accidental publish |
| 8 | Unresolved IDs | Publishing placeholder node IDs |
| 9 | Token Drift | mcp-server ≠ web-client tokens |
| 10 | Typography | Missing required font-size tokens |
| 11 | Alias Cycles | Circular variable references |
| 12 | Webhook Passcode | Unauthorized payloads |
| 13 | Concurrency | Parallel webhook runs |

### Coverage Matrix

| Guard | Pull | Push | Publish | Verify | Webhook |
|-------|------|------|---------|--------|---------|
| 1–3 | ✅/— | ✅ | ✅ | — | ✅ |
| 4–6 | — | ✅ | — | — | ✅ |
| 7–8 | — | — | ✅ | ✅ | ✅ |
| 9–11 | ✅ | ✅ | — | ✅ | ✅ |
| 12–13 | — | — | — | — | ✅ |

---

## 11. Essential Commands

### Read-Only (Safe Anytime)

| Command | Purpose |
|---------|---------|
| `npm run figma:probe` | Test API + recommend route |
| `npm run figma:sync:pull` | Full pull pipeline (5 steps) |
| `npm run figma:verify` | 5-check verification |
| `npm run tokens:check` | Token drift check |
| `npm run figma:codeconnect:generate` | Generate CC mappings |
| `npm run figma:codeconnect:verify` | Verify CC mappings |

### Write (Careful)

| Command | Purpose |
|---------|---------|
| `npm run figma:sync:push` | Dry-run push |
| `npm run figma:sync:push -- --apply` | Write to Figma |
| `npm run figma:codeconnect:publish -- --apply` | Publish to Dev Mode |
| `npm run figma:sync:full -- --apply-push --apply-publish` | Full sync + writes |

### Dev

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start MCP (:8787) + Web (:3000) + Webhook (:4848) |
| `npm run figma:sync:local` | Instant local pull + rebuild (~10s) |
| `npm --prefix mcp-server run build` | Rebuild 12 widgets |

### Webhooks

| Command | Purpose |
|---------|---------|
| `npm run webhook:start` | Local receiver on :4848 |
| `npm run webhook:manage -- list` | List registered webhooks |
| `npm run webhook:manage -- create` | Register webhook |
| `npm run webhook:test` | Send test payload |

---

## 12. Configuration Quick Ref

### sync.config.json

| Key | Values | Default |
|-----|--------|---------|
| `writeMode` | `disabled` · `office-only` · `ci-enabled` | `office-only` |
| `codeConnectMode` | `verify-only` · `publish-enabled` | `verify-only` |
| `routes.{pull,push,publish}` | `ci` · `office` · `manual` | varies |
| `canary.enabled` | `true` · `false` | `false` |
| `canary.maxVariables` | number | `25` |

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `FIGMA_ACCESS_TOKEN` | Yes | API authentication |
| `FIGMA_FILE_KEY` | Yes* | Figma file identifier |
| `FIGMA_REGION` | No | API region (`us-east-1`) |
| `FIGMA_WRITE_CONTEXT` | For writes | Must match `routes.*` |
| `FIGMA_WEBHOOK_PASSCODE` | For webhooks | Webhook validation |
| `GITHUB_TOKEN` | For webhooks | `repo` scope PAT |

### GitHub Secrets & Variables

| Type | Name | Used By |
|------|------|---------|
| Secret | `FIGMA_ACCESS_TOKEN` | All workflows |
| Secret | `FIGMA_FILE_KEY` | All workflows |
| Secret | `FIGMA_REGION` | All workflows |
| Variable | `FIGMA_CODECONNECT_PUBLISH` | Code Connect Sync |
| Environment | `figma-write` | Push + Publish workflows |

---

## 13. Troubleshooting Cheat Sheet

### Quick Diagnostics

```bash
npm run figma:probe     # API connectivity
npm run figma:verify    # Token integrity
npm run tokens:check    # Token drift
```

### Top Issues

| Symptom | Fix |
|---------|-----|
| `Missing FIGMA_ACCESS_TOKEN` | `export FIGMA_ACCESS_TOKEN="figd_..."` |
| `403 Forbidden` | Regenerate PAT with correct scopes |
| `404 Not Found` | Verify file key from Figma URL |
| `token-drift` in CI | `npm run tokens:sync` + commit |
| `writeMode=disabled` | Set `writeMode: "ci-enabled"` in sync.config.json |
| Push `filteredUpdates: 0` | Check `canary.collectionNames` match Figma collections |
| Webhook not firing | Re-create: `webhook:manage -- create`. Check status ≠ INACTIVE |
| No PR created | No changes detected — expected when tokens unchanged |
| Auto-merge fails | `gh api repos/OWNER/REPO -X PATCH -f allow_auto_merge=true` |

### Recovery

```bash
# Full token reset
rm -f tokens/figma/variables.*.json tokens/figma/.variable-ids.json
npm run figma:sync:pull

# Rollback bad push
git revert HEAD && npm run figma:sync:push -- --apply
```

---

## 14. How to Fork & Customize

### Step-by-Step

```bash
# 1. Fork
gh repo fork Kari-Basavaraj/MCP-UI-DEMO-ECOMV2 --clone && cd MCP-UI-DEMO-ECOMV2

# 2. Clean project-specific content
rm -rf screenshots/ assets/product-images/
rm -f tokens/figma/variables.{raw,normalized}.json tokens/figma/.variable-ids.json

# 3. Update your Figma file key everywhere:
#    - figma/sync.config.json → primaryFileKey
#    - figma/code-connect/components/*.figma.tsx → URLs
#    - figma/code-connect/mappings.source.json → nodeId values
#    - GitHub secrets → FIGMA_FILE_KEY

# 4. Update component node IDs for YOUR Figma file
#    (get node IDs from Figma → right-click → Copy/Paste as → Copy link)

# 5. Run setup
npm run install:all && npm run figma:probe && npm run figma:sync:pull
```

### What to Customize

| Area | How |
|------|-----|
| **Token namespace** | Change `--sds-*` → `--your-prefix-*` in `figma-lib.mjs` + `token-name-map.json` |
| **UI framework** | Pipeline outputs CSS custom properties — works with React, Vue, Svelte, vanilla |
| **Your components** | Clear `required-components.json`, add your own `.figma.tsx` files |
| **CI platform** | Scripts are plain Node.js ESM; only workflow YAML is GitHub-specific |
| **Cron schedules** | Edit `schedule` blocks in `.github/workflows/*.yml` |

### Removing Features You Don't Need

| Don't Need | Remove |
|------------|--------|
| Code Connect | `figma/code-connect/`, `figma-codeconnect-*.mjs`, codeconnect workflow |
| Push (Code→Figma) | Set `writeMode: "disabled"`, remove push workflow |
| Webhooks | Remove webhook workflow, health workflow, receiver scripts, API route |
| CI entirely | Delete `.github/workflows/`, use commands locally |

---

*Executive Playbook v1.0 — 2026-03-01 — For the full version with all code examples and detailed walkthroughs, see [Figma-Code-CICD-Automation-Playbook-Full.md](./Figma-Code-CICD-Automation-Playbook-Full.md)*
