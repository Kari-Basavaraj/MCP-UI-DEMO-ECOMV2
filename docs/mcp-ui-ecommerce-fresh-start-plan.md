# MCP-UI Ecommerce Fresh-Start Plan

## Current State

- Existing codebase is archived at `_archive/MCP-UI-Demo-EcomV1-2026-02-25.tar.gz`.
- Fresh references cloned under `fresh/`:
	- `fresh/mcp-ui`
	- `fresh/ext-apps`
- New starter app created at `fresh/ecommerce-mcp-playground` from `ext-apps/examples/quickstart`.

## Architecture Target

Use MCP Apps standard end-to-end:

1. MCP server tool defines `_meta.ui.resourceUri`.
2. Resource URI uses `ui://ecommerce/...`.
3. Host renders widget in sandboxed iframe via `AppRenderer`/host equivalent.
4. Widget posts UI actions (tool calls) through host bridge.

## Phase Plan

## Phase 0 — Baseline

- Keep legacy app unchanged in archive.
- Work only in `fresh/ecommerce-mcp-playground`.
- Preserve minimal starter shape from quickstart.

Exit criteria:

- `npm install` and `npm start` run in the fresh workspace.

## Phase 1 — Ecommerce MCP Tool Surface

Implement server tools with typed inputs and deterministic outputs:

- `search_products`
- `filter_products`
- `get_products`
- `add_to_cart`
- `remove_from_cart`
- `get_cart`

Each interactive tool should include `_meta.ui.resourceUri` mapped to resource(s):

- `ui://ecommerce/products/list`
- `ui://ecommerce/product/card`
- `ui://ecommerce/cart/summary`

Exit criteria:

- Tool calls produce valid content payload + linked UI resource URIs.

## Phase 2 — Widget Implementation

Build three widgets in `mcp-app.html` + `src/`:

1. Product list grid
2. Product card detail
3. Cart summary

Behavior requirements:

- No direct backend calls from widget iframe.
- Actions emitted via postMessage tool actions.
- Server remains source of truth for cart state.

Exit criteria:

- End-to-end chat flow: search → add → view cart → remove.

## Phase 3 — Design System Integration

Create a first-pass ecommerce widget design system in Figma:

- Base tokens: color, spacing, radius, typography, elevation
- Modes: `light`, `dark` (minimum)
- Components:
	- Product card
	- Product list row/grid item
	- Cart line item
	- Cart summary footer

Exit criteria:

- Token names stable and approved.
- Component API (props/variants) agreed.

## Phase 4 — Figma ↔ Code Sync Loop

Implement bidirectional workflow using:

- Figma MCP (design retrieval/context)
- Figma Code Connect CLI (component mapping)
- Figma Variables API (token source synchronization)

Detailed flow is documented in `docs/figma-sync-workflow.md`.

Exit criteria:

- Token pull updates code tokens automatically.
- Component mapping is reviewable in both Figma and code.

## Phase 5 — Validation + Hardening

- Add deterministic smoke tests for tool payloads and cart transitions.
- Add visual checks for widget rendering under both theme modes.
- Validate host safety assumptions (sandbox, link handling, allowed actions).

Exit criteria:

- Stable demo script for stakeholders.

## Delivery Sequence (Recommended)

1. Implement MCP tools and wire `_meta.ui.resourceUri`.
2. Build product list + cart summary widgets.
3. Create Figma variables + components.
4. Add Code Connect mapping.
5. Add automated variable sync script/GitHub Action.

## Risks and Mitigations

- Host differences in UI-action handling
	- Mitigation: keep widget action payloads simple (`tool` + params).
- Token naming churn in early design
	- Mitigation: freeze token schema before automation.
- Figma board/API auth constraints in headless tooling
	- Mitigation: keep a manual fallback procedure and store file keys in env.
