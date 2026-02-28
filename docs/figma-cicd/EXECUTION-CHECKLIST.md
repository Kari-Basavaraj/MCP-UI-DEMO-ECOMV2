# Figma CICD Execution Checklist (Office Laptop)

## Phase A: Environment

1. Set env vars:
   - `FIGMA_ACCESS_TOKEN`
   - `FIGMA_FILE_KEY=p3SdnPiT3DYRtOu2CZs97P`
   - `FIGMA_REGION=us-east-1`
   - `FIGMA_WRITE_CONTEXT=office`
2. Install deps:
   - `npm ci`
   - `npm --prefix mcp-server ci`
   - `npm --prefix web-client ci`

## Phase B: Preflight

1. `npm run figma:probe`
2. `npm run figma:verify`
3. `npm run figma:codeconnect:generate`
4. `npm run figma:codeconnect:verify -- --strict`

Expected:
- strict verify passes with no placeholder node IDs.

## Phase C: Figma File Preparation

1. Open Figma file `p3SdnPiT3DYRtOu2CZs97P`.
2. For each required component ID, capture real node ID.
3. Update `figma/code-connect/mappings.source.json`.
4. Re-run strict verify.

## Phase D: Publish + Evidence

1. Dry-run publish:
   - `npm run figma:codeconnect:publish`
2. Apply publish:
   - `FIGMA_WRITE_CONTEXT=office npm run figma:codeconnect:publish -- --apply`
3. Re-verify:
   - `npm run figma:verify`
4. Save evidence:
   - publish report JSON path
   - verification report path
   - commit SHA

## Phase E: CI/CD Enablement

1. Set GitHub secrets:
   - `FIGMA_ACCESS_TOKEN`
   - `FIGMA_FILE_KEY=p3SdnPiT3DYRtOu2CZs97P`
   - `FIGMA_REGION`
2. Validate workflows:
   - `.github/workflows/ci-core.yml`
   - `.github/workflows/figma-pull-variables.yml`
   - `.github/workflows/figma-codeconnect-sync.yml`
   - `.github/workflows/figma-push-variables.yml`

## Phase F: Tracking

1. Update `docs/code reports/figma-cicd-tracker.*`.
2. Update Linear BAS-139 and relevant FGC issue with evidence.
