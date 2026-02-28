# Office Copilot Playbook: Figma -> Code Connect -> CI/CD (MCP-UI-DEMO-ECOMV2)

This runbook is for your **office laptop + VS Code + GitHub Copilot** to finish live Figma preparation and enable production-safe automation.

## Goal

Connect the real Figma design system file to repository automation so that:
1. Variables/tokens can be verified and synchronized safely.
2. Code Connect mappings are complete and publish-ready.
3. CI/CD workflows run continuously with proper guardrails.

Primary file key (confirmed): `p3SdnPiT3DYRtOu2CZs97P`

Suggested file URL:
`https://www.figma.com/design/p3SdnPiT3DYRtOu2CZs97P/`

## What Is Already Prepared In Repo

These are already implemented in this repository:
1. Hybrid route and probe engine (`Route A/B/C`): `scripts/figma-probe.mjs`
2. Pull/normalize/generate/push/verify scripts (`figma:*` in root `package.json`)
3. Code Connect contracts:
   - `figma/code-connect/mappings.source.json`
   - `figma/code-connect/required-components.json`
   - `figma/code-connect/mappings.generated.json`
4. CI workflows:
   - `.github/workflows/ci-core.yml`
   - `.github/workflows/figma-pull-variables.yml`
   - `.github/workflows/figma-codeconnect-sync.yml`
   - `.github/workflows/figma-push-variables.yml`
5. Tracker and runbooks under `docs/code reports/`

Current known blocker in non-office environments:
- Variables API read/write returns `403` there, so route resolves to `Route C`.

## Phase 0: Clone + Baseline Setup (Office Laptop)

1. Clone repo and open in VS Code.
2. Install dependencies:

```bash
npm ci
npm --prefix mcp-server ci
npm --prefix web-client ci
```

3. Confirm key scripts exist:

```bash
npm run | rg "figma:|tokens:"
```

## Phase 1: Configure Environment Variables

Set these in your shell or `.env.local` (do not commit secrets):

```bash
export FIGMA_ACCESS_TOKEN="<office-token>"
export FIGMA_FILE_KEY="p3SdnPiT3DYRtOu2CZs97P"
export FIGMA_REGION="us-east-1"
export FIGMA_WRITE_CONTEXT="office"
```

Optional for CI route expansion:

```bash
export CODECONNECT_ACCESS_TOKEN="<if-required-by-your-org/setup>"
```

## Phase 2: Verify Route and Baseline Health

Run:

```bash
npm run figma:probe
npm run figma:verify
```

Expected:
1. `figma:probe` returns Route A or B (Route C means auth/permission still blocked).
2. `figma:verify` passes.

Artifacts:
- `docs/code reports/figma-capability-probe.json`
- `docs/code reports/figma-sync-verification.json`

## Phase 3: Prepare the Figma File for Code Connect (Manual Figma UI Actions)

This is the key part that was intentionally left as placeholders.

## 3.1 Confirm component inventory in Figma

Ensure the file contains components corresponding to all required IDs in:
- `figma/code-connect/required-components.json`

Required component IDs:
1. `product-grid`
2. `product-card`
3. `product-detail`
4. `cart-view`
5. `cart-summary`
6. `wishlist`
7. `search-bar`
8. `category-filter`
9. `checkout-form`
10. `order-confirmation`
11. `price-tag`
12. `review-rating`

## 3.2 Capture node IDs for each component

For each component in Figma:
1. Select component node.
2. Copy link to selection.
3. Extract `node-id` from URL (example `3002-348` -> `3002:348`).
4. Record it in a temporary table.

Recommended table format:

| id | componentName | nodeId |
| --- | --- | --- |
| product-grid | ProductGridWidget | 3002:348 |
| ... | ... | ... |

## 3.3 Update mappings source file

Edit:
- `figma/code-connect/mappings.source.json`

For each entry:
1. Replace `"nodeId": "TODO_NODE_ID"` with actual `"nodeId": "<x:y>"`.
2. Keep `source` paths aligned to the actual code/widget file.
3. Keep `fileKey` as `p3SdnPiT3DYRtOu2CZs97P`.

## Phase 4: Validate Mappings Locally

Run:

```bash
npm run figma:codeconnect:generate
npm run figma:codeconnect:verify -- --strict
```

Expected:
1. `mappings.generated.json` regenerated.
2. Strict verify passes with `placeholderNodeIds=0`.

If strict verify fails:
1. Missing source file: fix `source` path.
2. Missing required mapping: add mapping entry.
3. Placeholder ID: fill node ID.

## Phase 5: Publish Code Connect (Office Context)

## 5.1 Dry run first

```bash
npm run figma:codeconnect:publish
```

Expected:
- Publish dry-run report generated in `docs/code reports/figma-codeconnect-publish-*.json`

## 5.2 Apply publish

Before apply, ensure:
1. `figma/sync.config.json` has `"codeConnectMode": "publish-enabled"`
2. `FIGMA_WRITE_CONTEXT=office`

Then run:

```bash
npm run figma:codeconnect:publish -- --apply
```

## 5.3 Record evidence

Capture and store:
1. Terminal output summary.
2. Publish report JSON path.
3. Commit SHA (after commit).
4. Linear issue comment with evidence.

## Phase 6: Variable Sync (Optional Apply)

## 6.1 Pull and generate

```bash
npm run figma:sync:pull
```

## 6.2 Push dry run

```bash
npm run figma:push:variables
```

## 6.3 Push apply (only if intended)

Before apply:
1. `figma/sync.config.json` write policy is correct.
2. Canary collections are configured.
3. You reviewed dry-run report.

Run:

```bash
npm run figma:push:variables -- --apply
```

## 6.4 Re-verify

```bash
npm run figma:verify
```

## Phase 7: Enable CI/CD in GitHub

Set repository secrets:
1. `FIGMA_ACCESS_TOKEN`
2. `FIGMA_FILE_KEY` = `p3SdnPiT3DYRtOu2CZs97P`
3. `FIGMA_REGION` (if needed)

Optional variable:
- `FIGMA_CODECONNECT_PUBLISH=true` only when CI publish is approved.

For push apply workflow:
- Use protected environment `figma-write` with approvals.

## Phase 8: Commit + PR Protocol

After successful local prep:
1. Commit mapping updates, reports, and any generated artifacts.
2. Open PR with summary:
   - which node IDs were mapped
   - publish result
   - probe route
   - verification result
3. Add Linear updates to `BAS-139` and child `FGC` issues.

## Copilot Chat Prompt Pack (Copy/Paste)

Use these prompts in VS Code Copilot Chat on office laptop.

## Prompt A: Fill Code Connect node IDs safely

```text
Use this repository's figma code connect contracts.
Task: update figma/code-connect/mappings.source.json by replacing TODO_NODE_ID with actual node IDs from my provided table.
Rules:
1) do not change mapping ids/component names/source paths unless inconsistent.
2) keep fileKey as p3SdnPiT3DYRtOu2CZs97P.
3) after edit run npm run figma:codeconnect:generate and npm run figma:codeconnect:verify -- --strict.
4) show a diff-style summary and list any remaining gaps.
```

## Prompt B: Publish readiness check

```text
Validate this repo is publish-ready for figma code connect in office context.
Run:
1) npm run figma:probe
2) npm run figma:codeconnect:generate
3) npm run figma:codeconnect:verify -- --strict
4) npm run figma:codeconnect:publish
Then summarize blockers and exact fixes.
```

## Prompt C: Controlled apply and evidence

```text
Perform office-context code connect publish apply and capture evidence.
Preconditions:
- FIGMA_WRITE_CONTEXT=office
- codeConnectMode=publish-enabled
Commands:
1) npm run figma:codeconnect:publish -- --apply
2) npm run figma:verify
Output required:
- publish report file path
- verification result
- recommended commit message
- linear update text for BAS-139 and FGC child issue
```

## Troubleshooting

1. `403 Forbidden` for variables read/write:
- token lacks access/entitlement for file
- confirm correct account and file permissions

2. parse succeeds but publish apply fails:
- confirm enterprise entitlement and publish permissions
- keep route as office-only publish

3. strict verify fails on placeholder node IDs:
- missing node IDs in mappings source

4. token verify fails on typography weights:
- remove `px` from font-weight variable values in canonical token files

## Done Criteria (Office Execution)

All must be true:
1. `figma:codeconnect:verify -- --strict` passes.
2. `figma:codeconnect:publish -- --apply` succeeds.
3. `figma:verify` passes.
4. Tracker reflects real issue IDs and evidence links.
5. PR includes mapping changes + report artifacts + clear summary.
