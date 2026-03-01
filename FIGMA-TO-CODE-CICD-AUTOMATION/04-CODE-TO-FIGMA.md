# 04 — Code → Figma (Push Workflow)

> An engineer changes a CSS token value. Here's exactly how that change flows back to Figma.

---

## Overview

The push workflow reads CSS custom property files, converts values back to Figma's internal format, and pushes them to the Figma file via the Variables API. This is the **reverse direction** of the pull workflow.

```
Engineer changes --sds-color-background-brand-default: #1a56db;
  in mcp-server/tokens/figma-tokens-light.css
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

## When It Runs

| Trigger | Where | Notes |
|---|---|---|
| `cron: '0 4 * * *'` | GitHub Actions | Daily at 04:00 UTC (**dry-run only** by default) |
| `workflow_dispatch` + `apply: true` | GitHub Actions | Manual trigger with apply flag |
| `npm run figma:sync:push -- --apply` | Local terminal | With explicit `--apply` flag |

### Dry-run vs Apply

By default, the push script runs in **dry-run mode**:
- It computes all updates that **would** be pushed
- It writes a report with sample values
- It does **NOT** call the Figma API to apply changes

To actually push, you must pass `--apply`:

```bash
# Dry-run (safe, no changes made)
npm run figma:push:variables

# Apply (writes to Figma)
npm run figma:push:variables -- --apply
```

---

## Step-by-Step Walkthrough

### Step 1 — Parse CSS Files

The script reads both token files and extracts all CSS custom properties:

```
mcp-server/tokens/figma-tokens-light.css → { "--sds-color-brand-default": "#2c2c2c", ... }
mcp-server/tokens/figma-tokens-dark.css  → { "--sds-color-brand-default": "#d9d9d9", ... }
```

The `parseCssVariables()` function (from `figma-lib.mjs`) uses regex to extract `--name: value;` pairs.

---

### Step 2 — Load Variable ID Mapping

The script reads `tokens/figma/.variable-ids.json` (generated during the last pull) to map each CSS variable name to its Figma identifiers:

```json
{
  "--sds-color-background-brand-default": {
    "variableId": "VariableID:28:10",
    "figmaName": "Brand/800",
    "collectionId": "VariableCollectionId:28:0",
    "collectionName": "Primitives",
    "modes": {
      "Light": "28:0",
      "Dark": "28:1"
    }
  }
}
```

Variables without a mapping (or with `TODO` placeholder IDs) are **skipped**.

---

### Step 3 — Convert CSS Values to Figma Format

The `parseCssValueToFigma()` function converts:

| CSS Value | Figma Value |
|---|---|
| `#2c2c2c` | `{ r: 0.172549, g: 0.172549, b: 0.172549, a: 1 }` |
| `#2c2c2c80` | `{ r: 0.172549, g: 0.172549, b: 0.172549, a: 0.501961 }` |
| `rgba(44, 44, 44, 0.5)` | `{ r: 0.172549, g: 0.172549, b: 0.172549, a: 0.5 }` |
| `16px` | `16` |
| `400` | `400` (unitless for font-weight) |
| `true` | `true` (boolean) |

---

### Step 4 — Build Update Payload

For each CSS variable with a valid mapping:
1. Find the corresponding `variableId` and `modeId`
2. Convert the CSS value to Figma format
3. Create an update entry: `{ collectionId, variableId, modeId, value }`

Light-mode and dark-mode values produce **separate** update entries (different `modeId`s but potentially the same `variableId`).

---

### Step 5 — Apply Safety Guards

Before pushing, multiple guards are checked:

#### Guard 1: WriteMode
```javascript
if (config.writeMode === 'disabled') throw new Error('...');
if (config.writeMode === 'office-only' && FIGMA_WRITE_CONTEXT !== 'office') throw new Error('...');
```

| writeMode | Behavior |
|---|---|
| `disabled` | Push always blocked |
| `office-only` | Requires `FIGMA_WRITE_CONTEXT=office` |
| `ci-enabled` | Allows push from CI or local |

#### Guard 2: Canary Filter

If `canary.enabled` is `true`, only variables belonging to the named collections are included:

```javascript
// Only push variables in "Canary" or "MCP-UI Canary" collections
const allowed = new Set(config.canary.collectionNames);
filteredUpdates = updates.filter(u => allowed.has(u.collectionName.toLowerCase()));
```

And there's a **max variable count** safeguard:
```javascript
if (filteredUpdates.length > config.canary.maxVariables) {
  throw new Error(`Canary guard triggered: ${filteredUpdates.length} exceeds max ${config.canary.maxVariables}`);
}
```

#### Guard 3: Library Variable Filter

Remote/library variables (with `/` in their variableId) cannot be modified and are automatically skipped:

```javascript
filteredUpdates = filteredUpdates.filter(u => !String(u.variableId).includes('/'));
```

---

### Step 6 — Capture Rollback Snapshot

Before applying any changes, the script captures the **entire current state** of all Figma variables:

```javascript
const snapshot = await figmaApi('/v1/files/{file_key}/variables/local', { method: 'GET' });
writeJson(`tokens/figma/rollback-${timestamp}.json`, {
  capturedAt: nowIso(),
  payload: snapshot.data,
});
```

This rollback file can be used to manually restore values if something goes wrong.

---

### Step 7 — Push to Figma API

```javascript
const response = await figmaApi('/v1/files/{file_key}/variables', {
  method: 'POST',
  body: {
    variableModeValues: filteredUpdates.map(({ collectionId, variableId, modeId, value }) => ({
      collectionId, variableId, modeId, value
    }))
  }
});
```

On success, the Figma file is immediately updated. Designers will see the new values.

---

### Step 8 — Write Report

A JSON report is written to `docs/code reports/figma-push-report-{timestamp}.json`:

```json
{
  "generatedAt": "2026-02-28T12:00:00.000Z",
  "dryRun": false,
  "applyRequested": true,
  "writeMode": "ci-enabled",
  "canary": { "enabled": true, "collectionNames": [...], "maxVariables": 25 },
  "stats": {
    "discoveredUpdates": 992,
    "filteredUpdates": 496,
    "skipped": 5
  },
  "response": { "status": 200, "ok": true }
}
```

---

## Running Locally

### Dry-run (recommended first)

```bash
npm run figma:push:variables
```

Check the report:
```bash
ls -la docs/code\ reports/figma-push-report-*.json
cat docs/code\ reports/figma-push-report-*.json | jq '.stats'
```

### Apply push

```bash
# Set write context if writeMode is office-only
export FIGMA_WRITE_CONTEXT=office

# Apply
npm run figma:push:variables -- --apply
```

### Full push orchestrator

```bash
# Dry-run: normalize → generate → sync → push (dry) → verify
npm run figma:sync:push

# Apply: same steps but push actually writes
npm run figma:sync:push -- --apply
```

---

## In CI (GitHub Actions)

The **Figma Push Variables** workflow (`figma-push-variables.yml`) runs with `environment: figma-write`:

```yaml
- name: Push variables dry-run
  if: ${{ github.event_name != 'workflow_dispatch' || !inputs.apply }}
  run: npm run figma:push:variables

- name: Push variables apply
  if: ${{ github.event_name == 'workflow_dispatch' && inputs.apply }}
  run: npm run figma:push:variables -- --apply
```

To push from CI:
1. Go to **Actions → Figma Push Variables**
2. Click **Run workflow**
3. Check **Apply push to Figma** checkbox
4. Click **Run workflow**

---

## Rollback Procedure

If a push introduced incorrect values:

### Option 1 — Re-pull from Figma (if values still correct in Figma)

Not applicable if you just overwrote good Figma values with bad CSS values.

### Option 2 — Use the rollback snapshot

```bash
# List available snapshots
ls tokens/figma/rollback-*.json

# Pick the most recent pre-push snapshot
# The snapshot contains the full variables payload
# You'd need to manually or programmatically restore values

# Quick manual approach: revert the CSS change, then push again
git checkout HEAD~1 -- mcp-server/tokens/figma-tokens-light.css
npm run figma:push:variables -- --apply
```

### Option 3 — Git revert

```bash
git revert HEAD  # Revert the token change commit
npm run figma:push:variables -- --apply  # Push the reverted values
```

---

## Safety Summary

| Guard | What it prevents |
|---|---|
| WriteMode | Accidental writes in read-only environments |
| Canary filter | Scope creep — only named collections are writable |
| Max variables | Runaway push of thousands of updates |
| Library filter | 400 errors from trying to write remote variables |
| Rollback snapshot | Data loss — full state captured before every push |
| Dry-run default | Accidental applies — `--apply` must be explicit |

---

*Next: [05-CICD-PIPELINES.md](./05-CICD-PIPELINES.md) — All GitHub Actions workflows explained*
