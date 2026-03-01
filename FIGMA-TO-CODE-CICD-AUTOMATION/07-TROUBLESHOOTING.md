# 07 — Troubleshooting

> Every error we've encountered, why it happened, and how to fix it.

---

## Quick Diagnostic Commands

Run these first when something breaks:

```bash
# Check environment is configured
echo "TOKEN: ${FIGMA_ACCESS_TOKEN:0:10}..."
echo "FILE_KEY: $FIGMA_FILE_KEY"
echo "REGION: $FIGMA_REGION"
echo "WRITE_CONTEXT: $FIGMA_WRITE_CONTEXT"

# Test API connectivity
curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/me" | jq '.handle'

# Run probe (tests all 4 capabilities)
npm run figma:probe
cat docs/code\ reports/figma-capability-probe.md

# Run verify (5 checks)
npm run figma:verify
cat docs/code\ reports/figma-sync-verification.md

# Check token drift
npm run tokens:check
```

---

## Error Reference

### Authentication & API Errors

---

#### `Missing FIGMA_ACCESS_TOKEN`

**Symptom**: Any script fails immediately with this message.

**Cause**: Environment variable not set.

**Fix**:

```bash
export FIGMA_ACCESS_TOKEN="figd_YOUR_TOKEN_HERE"
```

For CI: Ensure `FIGMA_ACCESS_TOKEN` is set in GitHub Secrets (repo level) and in the `figma-write` environment.

---

#### `Figma variables pull failed (403): Forbidden`

**Symptom**: Pull script fails with HTTP 403.

**Cause**: PAT doesn't have the required scopes, or token has expired.

**Fix**:

1. Go to [Figma Settings → Personal access tokens](https://www.figma.com/settings)
2. Check the token has **File content (read)** and **Variables (read + write)** scopes
3. If expired, generate a new token and update both the local env and GitHub secret

---

#### `Figma variables pull failed (404): Not found`

**Symptom**: Pull script fails with HTTP 404.

**Cause**: Wrong file key or file has been deleted/moved.

**Fix**:

```bash
# Verify the file key
curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_KEY?depth=1" | jq '.name'
```

If the file has a new key, update:

- `figma/sync.config.json` → `primaryFileKey`
- `FIGMA_FILE_KEY` in GitHub Secrets
- All `.figma.tsx` URLs

---

#### `Figma variables push failed (400): Bad Request`

**Symptom**: Push with `--apply` fails with HTTP 400.

**Cause**: Attempting to write remote/library variables that belong to another file.

**Fix**: The library variable filter should handle this automatically. If you still see it:

```bash
# Check which variables have '/' in their ID (remote vars)
cat tokens/figma/.variable-ids.json | jq '[.variables | to_entries[] | select(.value.variableId | contains("/")) | .key]'
```

These variables are read-only because they're imported from another Figma library. The push script filters them out, but if the filter is bypassed, you'll get this error.

---

### Token & Build Errors

---

#### `drift: figma-tokens-light.css differs from mcp-server/tokens`

**Symptom**: CI Core fails at the "Token drift check" step.

**Cause**: `mcp-server/tokens/` and `web-client/tokens/` are out of sync. Usually happens when you regenerate tokens but forget to sync.

**Fix**:

```bash
npm run tokens:sync
git add mcp-server/tokens/ web-client/tokens/
git commit -m "fix: sync tokens to fix drift check"
git push
```

---

#### `unable to resolve light mode tokens from normalized variables`

**Symptom**: Token generation fails.

**Cause**: The normalized variables don't contain a mode auto-detected as "Light".

**Fix**: Check what modes exist in your Figma file:

```bash
cat tokens/figma/variables.normalized.json | jq '.modeSelection'
cat tokens/figma/variables.normalized.json | jq '.modeMeta'
```

If the mode is named something other than "Light" (e.g., "Default"), the normalizer may need an update.

---

#### `missing-required-tokens` in verification

**Symptom**: `figma:verify` fails with missing token findings.

**Cause**: A token listed in `tokens/figma/token-name-map.json` as required doesn't exist in the generated CSS.

**Fix**: Either:

1. Add the missing variable in Figma, then re-pull
2. Remove the token from `token-name-map.json`'s `requiredTokens` array
3. Add a manual override in `token-name-map.json`

---

#### `invalid-font-weight-units` in verification

**Symptom**: `figma:verify` fails with typography violation findings.

**Cause**: A font-weight CSS variable has `px` suffix (e.g., `--sds-typo-body-weight: 400px`).

**Fix**: The `formatCssValue()` function in `figma-lib.mjs` has `shouldBeUnitless()` logic that should prevent this. If it still happens:

1. Check if the variable name contains `font-weight` or ends with `-weight`
2. The normalizer may need the name pattern added to `shouldBeUnitless()`

---

### Push-Specific Errors

---

#### `writeMode=disabled. Push apply is not allowed.`

**Symptom**: Push with `--apply` is blocked.

**Cause**: `sync.config.json` has `writeMode: "disabled"`.

**Fix**: Change `writeMode` in `figma/sync.config.json`:

```json
{ "writeMode": "ci-enabled" }
```

---

#### `writeMode=office-only. Set FIGMA_WRITE_CONTEXT=office`

**Symptom**: Push with `--apply` is blocked in CI or local without context.

**Cause**: `writeMode` is `office-only` but `FIGMA_WRITE_CONTEXT` is not set to `office`.

**Fix**: Either:

```bash
# Option A: Set the context
export FIGMA_WRITE_CONTEXT=office

# Option B: Change to CI-enabled mode
# Edit figma/sync.config.json: "writeMode": "ci-enabled"
```

---

#### `Canary guard triggered: N updates exceed maxVariables=25`

**Symptom**: Push aborts because too many variables would be updated.

**Cause**: The canary filter limited to specific collections, but those collections have more variables than `maxVariables`.

**Fix**: Either:

1. Increase `maxVariables` in `sync.config.json`
2. Disable canary: `"canary": { "enabled": false }`
3. Narrow the collection scope

---

#### Push reports 0 filtered updates

**Symptom**: Push completes but reports `filteredUpdates: 0`.

**Cause**: Canary filter is enabled and no variables match the allowed collection names.

**Fix**: Check the collection names:

```bash
# What collections exist?
cat tokens/figma/variables.normalized.json | jq '[.variables[].collectionName] | unique'

# What does canary allow?
cat figma/sync.config.json | jq '.canary.collectionNames'
```

Ensure the collection names in `canary.collectionNames` exactly match (case-insensitive) the collections in your Figma file.

---

### Code Connect Errors

---

#### `Missing generated mappings. Run npm run figma:codeconnect:generate first.`

**Symptom**: Verify or publish fails because `mappings.generated.json` doesn't exist.

**Fix**:

```bash
npm run figma:codeconnect:generate
```

---

#### `Cannot publish with unresolved node IDs (N)`

**Symptom**: Publish blocked because some components have `TODO` or empty node IDs.

**Fix**:

1. Check which components have placeholder IDs:

```bash
cat figma/code-connect/mappings.generated.json | jq '[.mappings[] | select(.nodeId == "" or .nodeId == "TODO") | .componentName]'
```

2. Get the real node IDs from Figma:
   - Open the component in Figma
   - Right-click → Copy link
   - Extract `node-id` from the URL (format: `XXXX-XXXX`, convert hyphens to colons)

3. Update `figma/code-connect/mappings.source.json` with the node ID

4. Update the corresponding `.figma.tsx` file URL

5. Regenerate: `npm run figma:codeconnect:generate`

---

#### `Code Connect publish failed`

**Symptom**: The `@figma/code-connect` CLI publish command fails.

**Cause**: Usually PAT scope issues or network problems.

**Fix**:

```bash
# Test CLI directly
npx -y @figma/code-connect connect parse --config figma/figma.config.json

# Test publish help
npx -y @figma/code-connect connect publish --help

# Check PAT has Code Connect write scope
curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" "https://api.figma.com/v1/me" | jq '.'
```

---

### CI Workflow Errors

---

#### CI Core passes but Figma Pull Variables fails

**Symptom**: CI Core is green but the pull workflow fails.

**Cause**: CI Core doesn't call the Figma API directly (except verify). Pull workflow needs `FIGMA_ACCESS_TOKEN`.

**Fix**: Ensure `FIGMA_ACCESS_TOKEN` is set as a GitHub Secret (not just as an environment secret).

---

#### Code Connect Sync publishes but Figma Dev Mode shows stale code

**Symptom**: Code Connect publish succeeds but developers see old code snippets.

**Cause**: Figma caches Code Connect data. May take a few minutes to update.

**Fix**: Wait 5 minutes, then reload the Figma file. If still stale, re-publish.

---

#### Automated PR not being created

**Symptom**: Pull workflow succeeds but no PR appears.

**Cause**: No token files changed (Figma values haven't changed since last pull).

**Fix**: This is expected behavior — `peter-evans/create-pull-request` only creates a PR when files actually change.

---

## Recovery Procedures

### Full Reset — Re-pull Everything

```bash
# Delete all generated artifacts
rm -f tokens/figma/variables.raw.json
rm -f tokens/figma/variables.normalized.json
rm -f tokens/figma/.variable-ids.json
rm -f mcp-server/tokens/figma-tokens-light.css
rm -f mcp-server/tokens/figma-tokens-dark.css
rm -f web-client/tokens/figma-tokens-light.css
rm -f web-client/tokens/figma-tokens-dark.css

# Re-pull from scratch
npm run figma:sync:pull

# Commit
git add -A
git commit -m "fix: full token re-pull from Figma"
```

### Rollback a Bad Push

```bash
# List available rollback snapshots
ls -la tokens/figma/rollback-*.json

# Revert the CSS change in git
git log --oneline -5  # Find the commit that changed tokens
git revert <COMMIT_SHA>

# Push the reverted values back to Figma
npm run figma:push:variables -- --apply
```

### Recover from Wrong File Key

```bash
# 1. Update sync.config.json
# 2. Update FIGMA_FILE_KEY environment variable
# 3. Update GitHub secret
# 4. Update all .figma.tsx URLs
# 5. Re-pull
npm run figma:sync:pull
npm run figma:codeconnect:generate
npm run figma:codeconnect:verify
```

---

## Log Files

| File                                                 | Contents                                 | Updated By                           |
| ---------------------------------------------------- | ---------------------------------------- | ------------------------------------ |
| `docs/code reports/figma-cicd-rollout-log.md`        | One-line log of every pipeline operation | All scripts via `appendRolloutLog()` |
| `docs/code reports/figma-sync-verification.json`     | Last verification result                 | `figma:verify`                       |
| `docs/code reports/figma-capability-probe.json`      | Last probe result                        | `figma:probe`                        |
| `docs/code reports/figma-push-report-*.json`         | Push operation reports (timestamped)     | `figma:push:variables`               |
| `docs/code reports/figma-codeconnect-publish-*.json` | Publish operation reports (timestamped)  | `figma:codeconnect:publish`          |

---

_Next: [08-CONFIGURATION-REFERENCE.md](./08-CONFIGURATION-REFERENCE.md) — Every config file, key, and value_
