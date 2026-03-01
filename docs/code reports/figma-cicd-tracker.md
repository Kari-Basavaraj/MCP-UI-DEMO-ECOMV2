# Figma CI/CD Tracker

- Project: `MCP-UI-DEMO-ECOMV2`
- Figma file: `dbPjFeLfAFp8Sz9YGPs0CZ`
- Figma URL: https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2--Copy-?node-id=3002-348&t=uaJoCobwzJmzRjym-1
- Parent issue: `BAS-139` (In Progress)
- Last updated: 2026-02-28

| Key | Title | Status | Linear | Evidence |
| --- | --- | --- | --- | --- |
| FGC-01 | Capability probes and route selection engine | Done | BAS-140 | `scripts/figma-probe.mjs` → Route C selected |
| FGC-02 | Pull + normalize + token generation pipeline | In Progress | BAS-141 | `scripts/figma-pull-variables.mjs`, `scripts/figma-normalize-variables.mjs`, `scripts/figma-generate-tokens.mjs` (Variables API 403) |
| FGC-03 | Push pipeline with canary and rollback guards | In Progress | BAS-142 | `scripts/figma-push-variables.mjs` (Variables API 403) |
| FGC-04 | Code Connect generate/verify contracts | Done | BAS-143 | `scripts/figma-codeconnect-generate.mjs` (12/12), `scripts/figma-codeconnect-verify.mjs` (--strict PASSED) |
| FGC-05 | Code Connect publish with office fallback | Done | BAS-144 | `scripts/figma-codeconnect-publish.mjs --apply` → 12/12 uploaded. Commit `3f8859e`. Report: `docs/code reports/figma-codeconnect-publish-2026-02-28T18-12-59-747Z.json` |
| FGC-06 | Core CI workflow and parity gates | Done | BAS-145 | `.github/workflows/ci-core.yml` present |
| FGC-07 | Scheduled pull workflow with PR automation | Done | BAS-146 | `.github/workflows/figma-pull-variables.yml` present |
| FGC-08 | Scheduled push workflow with protected apply path | Done | BAS-147 | `.github/workflows/figma-push-variables.yml` present |
| FGC-09 | Office laptop handoff and execution bundle | Done | BAS-148 | Executed from office laptop. 12 frames converted to Components in Figma, 12 `.figma.tsx` files created and published. |
| FGC-10 | Baseline run, audit, and closure report | Done | BAS-149 | `docs/code reports/figma-sync-verification.md` — 0 failures. All 12 widgets mapped and published. |

## Current Route Signal

- `npm run figma:probe` selects `Route C` (Variables API 403, Code Connect OK).
- Code Connect publish fully operational from office laptop.
- Variables pull/push blocked by Enterprise Variables API entitlement.

## Publish Evidence (2026-02-28)

- **Commit**: `3f8859e` (pushed to `main`)
- **12 Components Published** to Figma via `npx @figma/code-connect connect publish`
- **Figma Nodes Converted**: 12 widget frames → COMPONENT nodes in "Widget Compositions" page
- **Node ID Mapping**:
  - ProductGrid: `3068:13907`
  - ProductCard: `3068:14121`
  - ProductDetail: `3068:13922`
  - CartView: `3068:13935`
  - CartSummary: `3068:13956`
  - Wishlist: `3068:14087`
  - SearchBar: `3068:13974`
  - CategoryFilter: `3068:13992`
  - CheckoutForm: `3068:14012`
  - OrderConfirmation: `3068:14069`
  - PriceTag: `3068:14037`
  - ReviewRating: `3068:14054`
