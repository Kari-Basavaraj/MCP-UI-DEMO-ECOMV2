# Figma Sync Workflow (Implemented)

This runbook defines how this repository keeps Figma variables and Code Connect mappings synchronized with code, using a hybrid execution model.

Detailed office execution playbook:
- `docs/code reports/office-copilot-figma-codeconnect-cicd-playbook.md`

## Scope

- Repository: `MCP-UI-DEMO-ECOMV2`
- Primary file key: configured in `figma/sync.config.json` (`primaryFileKey`)
- Canonical token outputs:
  - `mcp-server/tokens/figma-tokens-light.css`
  - `mcp-server/tokens/figma-tokens-dark.css`
- Mirror token outputs:
  - `web-client/tokens/figma-tokens-light.css`
  - `web-client/tokens/figma-tokens-dark.css`
- Code Connect contracts:
  - `figma/code-connect/mappings.source.json`
  - `figma/code-connect/required-components.json`
  - `figma/code-connect/mappings.generated.json`

## Route Matrix

| Route | Pull/Verify | Push Variables | Publish Code Connect | When used |
| --- | --- | --- | --- | --- |
| Route A | CI/local | Office fallback | Office fallback | Default rollout route |
| Route B | CI/local | CI allowed | CI allowed | All probes pass |
| Route C | CI/local verify-only | Office/manual only | Office/manual only | CI auth/capability constrained |

Route selection is produced by `npm run figma:probe` and saved to:
- `docs/code reports/figma-capability-probe.json`
- `docs/code reports/figma-capability-probe.md`

## Required Probes

1. Variables read probe: `GET /v1/files/:file_key/variables/local`
2. Code Connect parse probe (`npx figma connect parse`)
3. Code Connect publish command probe
4. Variables write probe (`POST /v1/files/:file_key/variables` with empty `variableModeValues`)

Selection logic:
1. Read + parse + publish + write pass -> Route B
2. Read + parse pass but publish/write fail -> Route A
3. Otherwise -> Route C

## Commands

### Capability + verification

```bash
npm run figma:probe
npm run figma:verify
```

### Pull flow (Figma -> code)

```bash
npm run figma:pull:variables
npm run figma:normalize:variables
npm run figma:generate:tokens
npm run tokens:sync
npm run figma:verify
```

Shortcut:

```bash
npm run figma:sync:pull
```

### Push flow (code -> Figma)

Default is dry-run:

```bash
npm run figma:push:variables
npm run figma:sync:push
```

Apply mode (guarded by config + context):

```bash
FIGMA_WRITE_CONTEXT=office npm run figma:push:variables -- --apply
FIGMA_WRITE_CONTEXT=office npm run figma:sync:push -- --apply
```

### Code Connect flow

```bash
npm run figma:codeconnect:generate
npm run figma:codeconnect:verify
npm run figma:codeconnect:publish
```

Apply publish (requires publish-enabled mode and office context when configured):

```bash
FIGMA_WRITE_CONTEXT=office npm run figma:codeconnect:publish -- --apply
```

### End-to-end orchestration

```bash
npm run figma:sync:full
npm run figma:sync:full -- --apply-publish
npm run figma:sync:full -- --apply-push --apply-publish
```

`figma:sync:full` always runs probe first and follows selected route safeguards.

## Configuration Contract

File: `figma/sync.config.json`

Required keys:
1. `primaryFileKey`
2. `region`
3. `writeMode` (`office-only` | `ci-allowed` | `disabled`)
4. `codeConnectMode` (`verify-only` | `publish-enabled`)
5. `routes.pull`, `routes.push`, `routes.publish`
6. `canary.enabled`, `canary.collectionNames`, `canary.maxVariables`
7. `requiredComponentsPath`
8. `mappingSourcePath`

## Artifact Contract

Generated artifacts:
- `tokens/figma/variables.raw.json`
- `tokens/figma/variables.normalized.json`
- `tokens/figma/.variable-ids.json`
- `docs/code reports/figma-sync-verification.json`
- `docs/code reports/figma-sync-verification.md`
- `docs/code reports/figma-cicd-rollout-log.md`

Optional apply artifacts:
- `tokens/figma/rollback-*.json`
- `docs/code reports/figma-push-report-*.json`
- `docs/code reports/figma-codeconnect-publish-*.json`

## CI Workflows

- `.github/workflows/ci-core.yml`
- `.github/workflows/figma-pull-variables.yml`
- `.github/workflows/figma-codeconnect-sync.yml`
- `.github/workflows/figma-push-variables.yml`

## Safety Rules

1. `writeMode=office-only` blocks apply operations unless `FIGMA_WRITE_CONTEXT=office`.
2. Canary limits push scope to configured collections and count threshold.
3. Verification fails on:
   - token drift,
   - missing required tokens,
   - invalid typography units (e.g. `font-weight: 400px`),
   - missing/unresolved Code Connect mapping contracts.
4. No secrets are stored in repo; use environment variables and GitHub secrets.
