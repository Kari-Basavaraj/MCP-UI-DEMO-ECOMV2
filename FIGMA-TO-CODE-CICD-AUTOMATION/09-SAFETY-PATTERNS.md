# 09 — Safety Patterns

> 11 guards that prevent accidental writes, drift, and broken deployments.

Every guard is **fail-closed** — if conditions aren't met, the operation aborts. This document explains each guard, where it's enforced, and how to work with it.

---

## Guard Inventory

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

---

## 1. Secret Guard

**Where**: Every script that calls the Figma API (via `figmaApi()` in `figma-lib.mjs`)

**What it does**: Checks for `FIGMA_ACCESS_TOKEN` environment variable before making any API call.

**How it works**:
```javascript
// In figma-lib.mjs → figmaApi()
const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) throw new Error('FIGMA_ACCESS_TOKEN not set');
```

**When it triggers**: Always, if the token is missing or empty.

**Fix**: Set the token:
```bash
export FIGMA_ACCESS_TOKEN="figd_..."
```

---

## 2. Write Mode Guard

**Where**: `figma-push-variables.mjs` (line ~50)

**What it does**: Prevents push operations unless `writeMode` in `sync.config.json` allows it.

**Logic**:
```
writeMode = "disabled"      → ALWAYS blocked
writeMode = "office-only"   → Allowed if FIGMA_WRITE_CONTEXT = "office"
writeMode = "ci-enabled"    → Allowed if FIGMA_WRITE_CONTEXT = "ci" or "office"
```

**Failure message**:
```
❌ Write blocked: writeMode="office-only" but FIGMA_WRITE_CONTEXT="ci"
```

**Fix**: Either:
1. Change `writeMode` in `sync.config.json`
2. Set the correct `FIGMA_WRITE_CONTEXT` environment variable

---

## 3. Route Gating

**Where**: `figma-push-variables.mjs` and `figma-codeconnect-publish.mjs`

**What it does**: Compares `routes.push` (or `routes.publish`) against `FIGMA_WRITE_CONTEXT`. They must match.

**Logic**:
```
routes.push = "ci"      → Requires FIGMA_WRITE_CONTEXT = "ci"
routes.push = "office"  → Requires FIGMA_WRITE_CONTEXT = "office"
routes.push = "manual"  → All automated writes blocked
```

**Failure message**:
```
❌ Route guard: routes.push="office" does not match FIGMA_WRITE_CONTEXT="ci"
```

**Why two guards**: Write Mode (guard #2) controls *whether* writes are allowed. Route Gating controls *where* writes are allowed. Both must pass.

**Fix**: Set `routes.push` or `routes.publish` to match your execution context.

---

## 4. Canary Guard

**Where**: `figma-push-variables.mjs`, after building payload

**What it does**: When `canary.enabled` is `true`, limits push scope to named collections and enforces a maximum variable count.

**Logic**:
```javascript
if (canary.enabled) {
  // Filter to only allowed collections
  const allowed = canary.collectionNames.map(n => n.toLowerCase());
  payload = payload.filter(v => allowed.includes(v.collectionName.toLowerCase()));
  
  // Enforce count limit
  if (payload.length > canary.maxVariables) {
    throw new Error(`Canary limit: ${payload.length} > ${canary.maxVariables}`);
  }
}
```

**Use case**: When first enabling push, start with a small "canary" collection to test:
```json
{
  "canary": {
    "enabled": true,
    "collectionNames": ["Canary"],
    "maxVariables": 25
  }
}
```

**When to disable**: After verifying push works correctly in CI:
```json
{
  "canary": { "enabled": false }
}
```

---

## 5. Rollback Snapshot

**Where**: `figma-push-variables.mjs`, before writing

**What it does**: Saves a timestamped JSON snapshot of all variable values *before* pushing. If push causes damage, you can restore from snapshot.

**How it works**:
```javascript
// Before push, save current state
const snapshot = await figmaApi(`/v1/files/${fileKey}/variables/local`);
const ts = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(`tokens/figma/.rollback-${ts}.json`, JSON.stringify(snapshot, null, 2));
```

**Snapshot location**: `tokens/figma/.rollback-{timestamp}.json`

**Recovery**:
```bash
# 1. List snapshots
ls -la tokens/figma/.rollback-*.json

# 2. Identify the pre-damage snapshot
# 3. Use the values to manually restore via Figma UI or a custom script
```

> Note: Rollback snapshots are `.gitignore`d to avoid committing sensitive data. They exist only on the machine that performed the push.

---

## 6. Library Variable Filter

**Where**: `figma-push-variables.mjs`, during payload construction

**What it does**: Filters out variables that come from external Figma libraries. Only variables owned by the target file are included in push payloads.

**Why**: Pushing to library-imported variables causes `400` errors from the Figma API. These variables are read-only in the consuming file.

**How it works**:
```javascript
// During variable iteration
for (const variable of allVariables) {
  // Skip variables from external libraries
  if (variable.remote) continue;
  
  // Skip variables whose collection belongs to a subscribed library
  if (libraryCollectionIds.has(variable.variableCollectionId)) continue;
  
  payload.push(buildVariableUpdate(variable));
}
```

**Symptom when missing**:
```
400 Bad Request: Cannot modify variables from subscribed library
```

---

## 7. Code Connect Mode Guard

**Where**: `figma-codeconnect-publish.mjs`, at startup

**What it does**: Blocks publish when `codeConnectMode` is not `"publish-enabled"`.

**Logic**:
```
codeConnectMode = "verify-only"      → Generate + verify allowed, publish BLOCKED
codeConnectMode = "publish-enabled"  → All operations allowed
```

**Failure message**:
```
⏩ Skipping publish: codeConnectMode="verify-only"
```

**Fix**: Update `sync.config.json`:
```json
{ "codeConnectMode": "publish-enabled" }
```

---

## 8. Unresolved Node ID Guard

**Where**: `figma-codeconnect-publish.mjs`, before CLI invocation

**What it does**: Scans all `.figma.tsx` files for placeholder node IDs (`0:0`, `XXXX:0`, or empty strings). Blocks publish if any are found.

**Why**: Publishing with placeholder IDs creates broken Code Connect links in Figma Dev Mode.

**How it works**:
```javascript
const findings = verify();
if (findings.placeholderNodeIds.length > 0) {
  console.error('❌ Unresolved node IDs found:');
  for (const f of findings.placeholderNodeIds) {
    console.error(`   ${f.component} → ${f.nodeId} in ${f.source}`);
  }
  process.exit(1);
}
```

**Fix**: Replace placeholder IDs in `.figma.tsx` files:
1. Open the component in Figma
2. Copy the node ID from the URL (everything after `node-id=`)
3. Replace the placeholder in the `.figma.tsx` file
4. Update `mappings.source.json` with the new ID
5. Run `npm run figma:codeconnect:generate` to update generated mappings

---

## 9. Token Drift Check

**Where**: `figma-verify.mjs` (check #2), `tokens:check` script, `ci-core.yml` workflow

**What it does**: Compares tokens in `mcp-server/tokens/` against `web-client/tokens/`. If they differ, the build fails.

**Why**: Both apps must use identical tokens. Drift means one app looks different from the other.

**How it works**:
```javascript
// sync-tokens.mjs → check mode
const mcpLight = fs.readFileSync('mcp-server/tokens/figma-tokens-light.css');
const webLight = fs.readFileSync('web-client/tokens/figma-tokens-light.css');

if (!mcpLight.equals(webLight)) {
  console.error('❌ Token drift detected: figma-tokens-light.css differs');
  process.exit(1);
}
```

**Fix**:
```bash
npm run tokens:sync
```

This copies `mcp-server/tokens/*.css` → `web-client/tokens/*.css`.

---

## 10. Typography Sanity

**Where**: `figma-verify.mjs` (check #4)

**What it does**: Ensures the generated CSS contains required font-size tokens.

**Required tokens** (minimum):
```css
--sds-typo-body-size-small    /* 14px */
--sds-typo-body-size-medium   /* 16px */
--sds-typo-body-size-large    /* 20px */
--sds-typo-heading-size-base  /* 24px */
--sds-typo-heading-size-large /* 32px */
```

**Why**: If the font-size pipeline breaks (e.g., unit stripping goes wrong), every widget becomes unreadable. This check catches it immediately.

**Fix**: If font sizes are missing:
1. Check `tokens/figma/token-name-map.json` for correct mappings
2. Verify the Figma file has Typography variables in a collection
3. Re-run `npm run figma:sync:pull`

---

## 11. Alias Cycle Detection

**Where**: `figma-normalizer.mjs`, during variable resolution

**What it does**: Detects circular references in Figma variable aliases (e.g., A → B → C → A) and breaks the cycle to prevent infinite loops.

**How it works**:
```javascript
function resolveAlias(variableId, visited = new Set()) {
  if (visited.has(variableId)) {
    console.warn(`⚠ Alias cycle detected: ${[...visited, variableId].join(' → ')}`);
    return null; // Break cycle
  }
  visited.add(variableId);
  // ... resolve the alias chain
}
```

**Why**: Figma allows creating circular variable aliases through the UI. Without detection, the normalizer would stack overflow.

**Fix**: Fix the cycle in Figma:
1. Open the Variables panel
2. Find the variables mentioned in the cycle warning
3. Break one of the alias references by setting a concrete value

---

## Guard Coverage Matrix

This table shows which guards protect each operation:

| Guard | Pull | Push | Publish | Verify | CI |
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

---

## Adding a New Guard

To add a new safety guard to the pipeline:

1. **Identify the risk**: What can go wrong?
2. **Choose the enforcement point**: Which script should check?
3. **Implement fail-closed**: Default to blocking if unsure
4. **Add to verification**: Include in `figma:verify` if applicable
5. **Log clearly**: Include actionable error messages
6. **Document**: Add to this file and to `07-TROUBLESHOOTING.md`

Example template:
```javascript
// Guard: [Name]
const condition = checkSomething();
if (!condition) {
  console.error('❌ [Guard Name]: [What went wrong]');
  console.error('   Fix: [How to fix it]');
  process.exit(1);
}
console.log('✅ [Guard Name]: passed');
```

---

*Next: [README.md](./README.md) — Quick-start guide*
