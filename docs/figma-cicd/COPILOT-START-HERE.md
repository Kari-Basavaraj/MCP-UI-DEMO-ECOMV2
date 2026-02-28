# Copilot Start Here: Figma Code Connect + CI/CD

Use this document as the first prompt context in VS Code Copilot Chat.

## Objective

Prepare the live Figma file and complete Code Connect + CI/CD readiness for this repo.

- Repo: `MCP-UI-DEMO-ECOMV2`
- Figma file key: `p3SdnPiT3DYRtOu2CZs97P`
- Primary config file: `figma/sync.config.json`

## What Copilot Should Read First

1. `docs/figma-cicd/EXECUTION-CHECKLIST.md`
2. `docs/code reports/office-copilot-figma-codeconnect-cicd-playbook.md`
3. `figma/code-connect/mappings.source.json`
4. `figma/code-connect/required-components.json`

## Minimum Command Sequence

Run these in order and do not skip:

```bash
npm ci
npm run figma:probe
npm run figma:codeconnect:generate
npm run figma:codeconnect:verify -- --strict
npm run figma:verify
```

If strict verify fails on placeholder node IDs, fill node IDs in `figma/code-connect/mappings.source.json` and repeat.

## Publish Sequence (office only)

Only after strict verify passes and write policy is correct:

```bash
npm run figma:codeconnect:publish
FIGMA_WRITE_CONTEXT=office npm run figma:codeconnect:publish -- --apply
```

## Safety Rules for Copilot

1. Do not change token scripts or workflow guards unless explicitly requested.
2. Do not bypass `writeMode` and route policies in `figma/sync.config.json`.
3. Keep mapping changes limited to `nodeId` and validated source paths.
4. Always re-run `figma:verify` after changes.
5. Keep commits focused and reversible.
