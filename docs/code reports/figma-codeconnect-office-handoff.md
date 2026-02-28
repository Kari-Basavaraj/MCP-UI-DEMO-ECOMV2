# Figma Code Connect Office Handoff

This runbook is for enterprise-auth office context where publish/write operations are permitted.

## Preconditions

1. Clone is up to date on the target branch.
2. `FIGMA_ACCESS_TOKEN` is exported in the shell.
3. `FIGMA_FILE_KEY` points to the primary design-system file.
4. `FIGMA_WRITE_CONTEXT=office` is set.
5. `figma/sync.config.json` allows the intended mode:
   - `codeConnectMode=publish-enabled` for publish apply
   - `writeMode=office-only` or `ci-allowed`

## Install / validation

```bash
npm ci
npm run figma:probe
npm run figma:codeconnect:generate
npm run figma:codeconnect:verify
```

## Publish Code Connect mappings

Dry-run validation:

```bash
npm run figma:codeconnect:publish
```

Apply publish:

```bash
FIGMA_WRITE_CONTEXT=office npm run figma:codeconnect:publish -- --apply
```

Expected output:
- JSON status payload in terminal
- report in `docs/code reports/figma-codeconnect-publish-*.json`

## Push variables to Figma

Dry-run:

```bash
npm run figma:push:variables
```

Apply push:

```bash
FIGMA_WRITE_CONTEXT=office npm run figma:push:variables -- --apply
```

Expected output:
- report in `docs/code reports/figma-push-report-*.json`
- rollback snapshot in `tokens/figma/rollback-*.json`

## Full office execution

```bash
FIGMA_WRITE_CONTEXT=office npm run figma:sync:full -- --apply-publish --apply-push
```

## Rollback / recovery

1. Token rollback from git:

```bash
git checkout -- mcp-server/tokens/figma-tokens-light.css mcp-server/tokens/figma-tokens-dark.css web-client/tokens/figma-tokens-light.css web-client/tokens/figma-tokens-dark.css
```

2. Figma variable rollback source:
- inspect the latest `tokens/figma/rollback-*.json`
- re-run controlled push using prior values (manual/automated replay)

3. Code Connect rollback:
- use `npx figma connect unpublish` for the specific mapping set in office context
- revert mapping source changes in git if needed

## Common errors

1. 403 from Variables API:
- token lacks entitlement or file permissions for write
- switch to Route A/C and keep CI verify-only

2. parse works but publish fails:
- keep publish in office route only
- confirm enterprise seat and project permissions

3. unresolved node IDs:
- update `figma/code-connect/mappings.source.json` with exact node IDs before apply

4. region mismatch:
- set `FIGMA_REGION` and align with `figma/sync.config.json`
