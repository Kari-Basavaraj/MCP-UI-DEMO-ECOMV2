# 03 — Figma → Code (Pull Workflow)

> A designer changes a color in Figma. Here's exactly what happens to get that change into code.

---

## Overview

The pull workflow reads Figma design variables via the REST API and transforms them into CSS custom property files that your application consumes at runtime.

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

## When It Runs

| Trigger | Where | Notes |
|---|---|---|
| `cron: '0 3 * * *'` | GitHub Actions | Daily at 03:00 UTC |
| `workflow_dispatch` | GitHub Actions | Manual trigger from Actions tab |
| `npm run figma:sync:pull` | Local terminal | Run anytime |

---

## Step-by-Step Walkthrough

### Step 1 — Pull Variables from Figma API

**Command**: `npm run figma:pull:variables`  
**Script**: `scripts/figma-pull-variables.mjs`

What happens:
1. Reads `FIGMA_ACCESS_TOKEN` and `FIGMA_FILE_KEY` from environment
2. Calls `GET /v1/files/{file_key}/variables/local`
3. Writes the raw API response to `tokens/figma/variables.raw.json`
4. Passes the response through `figma-normalizer.mjs` to produce:
   - `tokens/figma/variables.normalized.json` — flat, mode-resolved variable array
   - `tokens/figma/.variable-ids.json` — lookup table mapping CSS var names to Figma variable IDs + mode IDs

**Example raw entry** (simplified):
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
  "collectionId": "VariableCollectionId:28:0",
  "collectionName": "Primitives",
  "resolvedType": "COLOR",
  "modes": {
    "28:0": { "r": 0.172, "g": 0.172, "b": 0.172, "a": 1 }
  }
}
```

---

### Step 2 — Normalize Variables

**Command**: `npm run figma:normalize:variables`  
**Script**: `scripts/figma-normalize-variables.mjs`

This step can be run independently if you already have a `variables.raw.json` (for example, from a cached download).

What it does:
1. Reads `variables.raw.json`
2. Calls `normalizeFigmaVariables()` from `figma-normalizer.mjs`
3. Resolves variable collections, modes, and the light/dark mode mapping
4. Writes `variables.normalized.json` and `.variable-ids.json`

The normalizer handles:
- Multi-collection merging (Primitives, Semantic Tokens, etc.)
- Mode detection (finds "Light" and "Dark" modes automatically)
- CSS variable name inference using `token-name-map.json` overrides
- Alias resolution (variables referencing other variables)

---

### Step 3 — Generate CSS Token Files

**Command**: `npm run figma:generate:tokens`  
**Script**: `scripts/figma-generate-tokens.mjs`

What it does:
1. Reads `variables.normalized.json`
2. Extracts the **light mode** values → generates `:root { }` block
3. Extracts the **dark mode** values → generates:
   - `@media (prefers-color-scheme: dark) { :root { ... } }` block
   - `[data-theme="dark"] { ... }` block (for manual toggle)
4. Appends **component aliases** (card, button, input, badge tokens)
5. Writes two files:
   - `mcp-server/tokens/figma-tokens-light.css`
   - `mcp-server/tokens/figma-tokens-dark.css`

**Example light CSS output**:
```css
/* Auto-generated from Figma Variables API — DO NOT EDIT MANUALLY */
/* Mode: Light */
/* Generated: 2026-02-28T12:00:00.000Z */
:root {
  --sds-color-background-brand-default: #2c2c2c;
  --sds-color-background-danger-default: #eb221e;
  --sds-color-background-default-default: #ffffff;
  /* ... 490+ more variables ... */

  /* Component aliases preserved for runtime compatibility */
  --sds-comp-card-bg: var(--sds-color-background-default-default);
  --sds-comp-card-border: var(--sds-color-border-default-default);
  /* ... */
}
```

**Example dark CSS output**:
```css
/* Auto-generated from Figma Variables API — DO NOT EDIT MANUALLY */
/* Mode: Dark */

@media (prefers-color-scheme: dark) {
  :root {
    --sds-color-background-brand-default: #d9d9d9;
    /* ... dark overrides ... */
  }
}

[data-theme="dark"] {
  --sds-color-background-brand-default: #d9d9d9;
  /* ... same overrides for manual toggle ... */
}
```

---

### Step 4 — Mirror Tokens to Web Client

**Command**: `npm run tokens:sync`  
**Script**: `scripts/sync-tokens.mjs sync`

What it does:
1. Copies `mcp-server/tokens/figma-tokens-light.css` → `web-client/tokens/figma-tokens-light.css`
2. Copies `mcp-server/tokens/figma-tokens-dark.css` → `web-client/tokens/figma-tokens-dark.css`

Why two copies exist:
- `mcp-server/tokens/` — used by widget HTML builds (Vite inlines these)
- `web-client/tokens/` — imported by the Next.js app

The CI Core workflow runs `tokens:check` (not `tokens:sync`) which **fails if the files differ** — this is the drift check.

---

### Step 5 — Verify Integrity

**Command**: `npm run figma:verify`  
**Script**: `scripts/figma-verify.mjs`

Runs 5 checks:

| Check | What it validates | Failure mode |
|---|---|---|
| Required files | All artifact files exist | `missing-file` |
| Token drift | `mcp-server/tokens/` matches `web-client/tokens/` | `token-drift` |
| Required tokens | All tokens in `token-name-map.json` exist in CSS | `missing-required-tokens` |
| Typography sanity | `font-weight` values don't have `px` suffix | `invalid-font-weight-units` |
| Code Connect | Generate + verify pass | `codeconnect-generate-failed` / `codeconnect-verify-failed` |

Writes:
- `docs/code reports/figma-sync-verification.json`
- `docs/code reports/figma-sync-verification.md`

---

## Running Locally

### One-command pull

```bash
npm run figma:sync:pull
```

This runs all 5 steps in sequence. If any step fails, the pipeline stops immediately.

### Step-by-step (for debugging)

```bash
# Step 1: Pull from API
npm run figma:pull:variables

# Step 2: Normalize
npm run figma:normalize:variables

# Step 3: Generate CSS
npm run figma:generate:tokens

# Step 4: Mirror
npm run tokens:sync

# Step 5: Verify
npm run figma:verify
```

### Inspect intermediate files

```bash
# How many variables were pulled?
cat tokens/figma/variables.normalized.json | jq '.stats'

# What mode was selected as "Light"?
cat tokens/figma/variables.normalized.json | jq '.modeSelection'

# List all CSS variables and their values
grep -E "^\s+--sds-" mcp-server/tokens/figma-tokens-light.css | head -20

# Check a specific token
grep "brand-default" mcp-server/tokens/figma-tokens-light.css
```

---

## In CI (GitHub Actions)

The **Figma Pull Variables** workflow (`figma-pull-variables.yml`) runs this pipeline and then creates a PR:

```yaml
- name: Run pull/normalize/generate/sync/verify
  run: |
    npm run figma:pull:variables
    npm run figma:normalize:variables
    npm run figma:generate:tokens
    npm run tokens:sync
    npm run figma:verify

- name: Create PR for token changes
  uses: peter-evans/create-pull-request@v6
  with:
    branch: codex/figma-pull-variables
    title: 'chore(figma): sync variables from figma'
```

The PR includes:
- Updated CSS token files (light + dark, both mcp-server and web-client)
- Updated raw + normalized JSON files
- Updated verification report

---

## What Could Go Wrong

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Missing FIGMA_ACCESS_TOKEN` | Env var not set | `export FIGMA_ACCESS_TOKEN=figd_...` |
| `Figma variables pull failed (403)` | PAT expired or insufficient scopes | Regenerate PAT with Variables read scope |
| `Unable to resolve light mode` | No mode named "Light" in Figma | Check mode names in Figma → update normalizer config |
| `token-drift` in CI | Token files changed without running `tokens:sync` | Run `npm run tokens:sync` and commit |
| `missing-required-tokens` | A token in the name map doesn't exist in Figma | Add the variable in Figma or remove it from `token-name-map.json` |

---

*Next: [04-CODE-TO-FIGMA.md](./04-CODE-TO-FIGMA.md) — Push CSS changes back to Figma*
