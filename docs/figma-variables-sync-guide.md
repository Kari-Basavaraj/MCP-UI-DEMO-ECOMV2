# Figma Variables Sync Guide (Implemented Contracts)

This guide documents the concrete script contracts used by this repository for two-way token sync.

## 1) Architecture

Canonical token source:
- `mcp-server/tokens/figma-tokens-light.css`
- `mcp-server/tokens/figma-tokens-dark.css`

Mirror token source:
- `web-client/tokens/figma-tokens-light.css`
- `web-client/tokens/figma-tokens-dark.css`

Normalization artifacts:
- `tokens/figma/variables.raw.json`
- `tokens/figma/variables.normalized.json`
- `tokens/figma/.variable-ids.json`
- `tokens/figma/token-name-map.json`

## 2) Environment Variables

Required for Figma API calls:
- `FIGMA_ACCESS_TOKEN`
- `FIGMA_FILE_KEY` (or `figma/sync.config.json -> primaryFileKey`)

Recommended:
- `FIGMA_REGION`

Required for guarded apply modes:
- `FIGMA_WRITE_CONTEXT=office` when `writeMode=office-only`

## 3) Script Contracts

## `npm run figma:pull:variables`

Purpose:
- Pull raw variables payload from Figma.
- Persist normalized representation and variable ID index.

Input:
- Figma API `GET /v1/files/{file_key}/variables/local`

Output:
- `tokens/figma/variables.raw.json`
- `tokens/figma/variables.normalized.json`
- `tokens/figma/.variable-ids.json`

Exit:
- `0` on success
- non-zero on API/auth errors

## `npm run figma:normalize:variables`

Purpose:
- Rebuild normalized artifacts from existing raw payload.

Input:
- `tokens/figma/variables.raw.json`

Output:
- `tokens/figma/variables.normalized.json`
- `tokens/figma/.variable-ids.json`

Exit:
- non-zero if raw payload missing/invalid

## `npm run figma:generate:tokens`

Purpose:
- Generate canonical light/dark CSS token files from normalized payload.
- Preserve component alias compatibility block.

Input:
- `tokens/figma/variables.normalized.json`

Output:
- `mcp-server/tokens/figma-tokens-light.css`
- `mcp-server/tokens/figma-tokens-dark.css`

## `npm run figma:push:variables`

Purpose:
- Build `variableModeValues` payload from canonical CSS + ID map.
- Dry-run by default.
- Apply only when explicitly requested.

Command forms:

```bash
npm run figma:push:variables
npm run figma:push:variables -- --apply
```

Apply safeguards:
1. `writeMode` must not be `disabled`
2. if `writeMode=office-only`, requires `FIGMA_WRITE_CONTEXT=office`
3. canary constraints (`collectionNames`, `maxVariables`) enforced

Apply behavior:
- captures rollback snapshot as `tokens/figma/rollback-*.json`
- sends `POST /v1/files/{file_key}/variables`
- writes report `docs/code reports/figma-push-report-*.json`

## `npm run figma:probe`

Purpose:
- Determine route (A/B/C) from capabilities.

Probes:
1. variables read probe
2. Code Connect parse probe
3. Code Connect publish command probe
4. variables write probe

Output:
- `docs/code reports/figma-capability-probe.json`
- `docs/code reports/figma-capability-probe.md`

## `npm run figma:verify`

Purpose:
- Repo-level parity gate.

Checks:
1. `npm run tokens:check`
2. required token presence from `tokens/figma/token-name-map.json`
3. typography unit sanity (`font-weight` must not use `px`)
4. Code Connect mapping generation + verification

Output:
- `docs/code reports/figma-sync-verification.json`
- `docs/code reports/figma-sync-verification.md`

Fails when any gate fails.

## 4) Code Connect Contracts

## `npm run figma:codeconnect:generate`

Input:
- `figma/code-connect/mappings.source.json`
- `figma/code-connect/required-components.json`

Output:
- `figma/code-connect/mappings.generated.json`

Behavior:
- ensures required IDs exist in source mapping
- resolves source file existence

## `npm run figma:codeconnect:verify`

Checks:
- required component coverage
- source path existence
- placeholder node IDs (warning unless strict)

Strict mode:

```bash
npm run figma:codeconnect:verify -- --strict
```

## `npm run figma:codeconnect:publish`

Default:
- dry-run parse/publish capability validation only

Apply mode:

```bash
FIGMA_WRITE_CONTEXT=office npm run figma:codeconnect:publish -- --apply
```

Apply safeguards:
1. `codeConnectMode` must be `publish-enabled`
2. route publish policy honored (`office` requires office context)
3. unresolved node IDs block apply

Report:
- `docs/code reports/figma-codeconnect-publish-*.json`

## 5) Orchestrators

## Pull orchestrator

```bash
npm run figma:sync:pull
```

Sequence:
1. pull
2. normalize
3. generate tokens
4. sync mirrors
5. verify

## Push orchestrator

```bash
npm run figma:sync:push
npm run figma:sync:push -- --apply
```

## Full orchestrator

```bash
npm run figma:sync:full
npm run figma:sync:full -- --apply-publish
npm run figma:sync:full -- --apply-push --apply-publish
```

Sequence:
1. probe
2. pull pipeline
3. codeconnect generate/verify/publish (dry-run unless apply)
4. push pipeline (apply only when route allows)

## 6) CI Alignment

Workflows:
- `ci-core.yml`: continuous gate, includes `figma:verify`
- `figma-pull-variables.yml`: scheduled pull + PR
- `figma-codeconnect-sync.yml`: mapping generation/verify + optional publish
- `figma-push-variables.yml`: scheduled dry-run push, guarded apply path

## 7) Troubleshooting

1. 401/403 on pull:
   - validate token scope and file access
   - verify file key value

2. push blocked in office-only mode:
   - set `FIGMA_WRITE_CONTEXT=office`

3. codeconnect parse failure:
   - validate `figma/figma.config.json`
   - run `npx figma connect parse --config figma/figma.config.json`

4. verify fails for `font-weight` units:
   - remove `px` from weight values in generated source path before apply

5. mapping verify fails due placeholders:
   - update `figma/code-connect/mappings.source.json` with real node IDs
   - regenerate mappings
