# MCP-UI-DEMO-ECOMV2 Codebase Analysis Report

Date: 2026-02-27
Scope: Full repository architecture and runtime analysis (source, config, docs, scripts, tests). Binary screenshot/base64 artifacts were not inspected line-by-line.

## Status Note (Updated 2026-02-28)

This report reflects the baseline analysis used to create workstreams W1–W9. Implementation has advanced through W7, and W8 documentation alignment is in progress. For latest execution status, refer to:
- `docs/code reports/cleanup-hardening-plan.md` (Execution Status table)
- Linear tracker issue `BAS-112`

## 1) Executive Summary

This repository implements an MCP-powered ecommerce chat experience with interactive widgets. The system is split cleanly into:
- `web-client`: Next.js app-router chat host and widget renderer.
- `mcp-server`: MCP tool server, resource provider, and HTTP/SSE bridge.
- `shared`: shared catalog model.

The active runtime path is coherent and functional. Main architectural strengths are:
- Clear MCP tool/resource contract.
- Good widget-host action bridge (`postMessage` protocol).
- Visual parity workflow and scripts.

Primary risks are:
- Global in-memory business state for cart/wishlist (cross-user collision risk).
- Legacy/dead code and historical scripts that target another repo/path.
- Frontend MCP connection status logic is optimistic.
- Inconsistencies between docs and current implementation path.

## 2) Repository Structure and Responsibilities

Top-level key folders/files:
- `web-client/`: Next.js runtime and UI.
- `mcp-server/`: MCP server, tools, widgets, and proxy bridge.
- `shared/catalog.mjs`: source-of-truth product dataset.
- `scripts/`: capture/parity/Figma automation scripts.
- `tests/visual-diff.spec.ts`: visual and token audit tests.
- `docs/`: architecture/process notes and parity outputs.

Package-level intent:
- Root `package.json`: convenience orchestration (`dev:server`, `dev:client`).
- `mcp-server/package.json`: widget build pipeline and server dev mode.
- `web-client/package.json`: Next.js app and AI SDK dependencies.

## 3) Runtime Architecture (Active Path)

### 3.1 Chat and Tool Execution

Active route:
- `web-client/app/api/chat/route.ts`

Flow:
1. Request payload includes messages + selected model + MCP server list.
2. Route initializes MCP tools via `initializeMCPClients(...)`.
3. Route calls `streamText(...)` with strict system prompt and tool policies.
4. Model may invoke tools in multiple steps (`maxSteps: 20`).
5. Route streams response back to UI.

Model provider:
- `web-client/ai/providers.ts`
- Uses OpenRouter-compatible endpoint via `@ai-sdk/openai`.

### 3.2 MCP Tool Discovery and Invocation

Bridge module:
- `web-client/lib/mcp-client.ts`

Key behavior:
- Derives base URL from configured SSE URL by removing `/sse` suffix.
- Fetches tool list from `GET /api/mcp/tools`.
- Calls tools via `POST /api/mcp/call`.
- Removes large embedded UI HTML from LLM content and retains lightweight `_uiResources` references.
- Attaches `_mcpServerUrl` for frontend resource fetch.

### 3.3 MCP Server and Resource Layer

Server entry:
- `mcp-server/src/index.js`

Key responsibilities:
- Registers 12 UI resources (widget HTML URIs).
- Registers ecommerce tools (`get_products`, `search_products`, `filter_products`, cart/wishlist/checkout/reviews/price).
- Preloads built widget HTML from `mcp-server/dist/widgets`.
- Injects tool result payload into widget HTML via `window.__MCP_TOOL_RESULT__`.
- Keeps mutable state in process globals (`cart`, `wishlist`, `lastOrderId`).

Proxy/transport layer:
- `mcp-server/src/openaiProxy.js`

Endpoints:
- `POST /api/openai/chat`: OpenAI-compatible pass-through.
- `GET /api/tools`, `POST /api/tools/:toolName`: direct list/call helper.
- `GET /sse`, `POST /messages`: MCP SSE transport.
- `GET /api/mcp/tools`, `POST /api/mcp/call`, `GET /api/mcp/resource`: HTTP bridge for frontend compatibility.

## 4) Widget System Architecture

Source:
- Markup/CSS templates: `mcp-server/widgets/*.html`
- Behavior scripts: `mcp-server/src/widgets/*.ts`
- Shared base styles: `mcp-server/src/widgets/shared.css`
- Build output: `mcp-server/dist/widgets/*.html`

Build mechanism:
- `mcp-server/vite.config.ts` + `vite-plugin-singlefile`.
- Builds each widget as a self-contained HTML artifact.

Host communication protocol:
- `mcp-server/src/widgets/bridge.ts`

Protocol:
- Widget emits `postMessage` actions to parent:
  - `type: "tool"` with tool name + params
  - `type: "prompt"`, `type: "link"`, `type: "ui-size-change"`
- Host consumes actions in:
  - `web-client/components/tool-invocation.tsx`

### 4.1 Widget Rendering in Host

`tool-invocation.tsx` does the heavy lifting:
- Recognizes widget-capable tools.
- Shows per-tool skeleton loaders.
- Fetches `ui://` resources via `/api/mcp/resource`.
- Injects:
  - `window.__MCP_TOOL_RESULT__`
  - active theme (`data-theme`)
  - theme-change listener.
- Renders iframes with `UIResourceRenderer`.
- Translates widget actions back into natural-language user prompts.
- Offers follow-up suggestion chips by tool.

### 4.2 Widget Inventory and Behavioral Coverage

12 widgets are present and wired:
- `product-grid`, `product-card`, `product-detail`
- `cart-view`, `cart-summary`, `wishlist`
- `search-bar`, `category-filter`
- `checkout-form`, `order-confirmation`
- `price-tag`, `review-rating`

Most interactive widgets correctly use `bridge.ts` and local optimistic button states.

## 5) Data and State Model

Catalog:
- `shared/catalog.mjs` defines 8 products and categories.

Mutable state:
- In-memory server globals in `mcp-server/src/index.js`:
  - `cart: []`
  - `wishlist: []`
  - `lastOrderId`

Implications:
- Shared across all users/sessions hitting same server process.
- Server restart resets state.
- No persistence, no user keying, no history.

## 6) Theming and Tokens

MCP server token source:
- `mcp-server/tokens/figma-tokens-light.css`
- `mcp-server/tokens/figma-tokens-dark.css`

Web client host theme layer:
- `web-client/app/globals.css`
- `web-client/lib/context/theme-context.tsx`

Observation:
- Widget styling generally aligns to `--sds-*` conventions.
- There are duplicate token files under `web-client/tokens/` and `mcp-server/tokens/` that should be governed deliberately (single source + sync).

## 7) Testing and Validation Tooling

Visual regression + token checks:
- `tests/visual-diff.spec.ts`

Current checks:
- Captures each built widget.
- Compares snapshots with tolerances.
- Includes hardcoded hex scan in inline styles.

Parity pipeline scripts:
- `scripts/capture-widgets-actual.mjs`
- `scripts/compare-widget-parity.mjs`

Known parity status:
- Lowest parity widgets documented in `docs/widget-parity-report.md` are:
  - `product-grid`
  - `category-filter`
  - `product-card`
  - `wishlist`
  - `product-detail`

## 8) Legacy/Dead/Out-of-Path Code

Likely out-of-path legacy artifacts:
- `mcp-server/src/products-app.ts`
- `mcp-server/src/cart-app.ts`
- `mcp-server/products-app.html`
- `mcp-server/cart-app.html`
- `mcp-server/src/index.js.bak`

These represent older ext-apps style path and are no longer the active widget model.

## 9) Script and Environment Reliability Assessment

Several scripts are useful but currently brittle due to hardcoded local paths and old repo references:
- `scripts/batch-embed-figma-images.py` points to external machine path and EcomV1 paths.
- `fix-accent-tokens.sh` points to external absolute path and old repo naming.
- Multiple helper scripts assume a specific external Figma/Foxy workspace layout.

Risk:
- New contributors cannot reliably run these scripts without manual edits.

## 10) Documentation Consistency Assessment

Positive:
- Rich docs exist for parity and design workflows.
- Session logs capture historical decisions.

Gaps:
- Some docs reference previous project structure (`web-client/src/App.tsx`) not matching current app-router implementation.
- Some process docs are aspirational and not fully mapped to today’s exact scripts.

## 11) Security and Operational Notes

What is good:
- API key usage is server-side for `/api/openai/chat`.
- Frontend does not directly expose provider key.

Risks:
- `POST /api/mcp/call` + global state + no auth can be abused if exposed outside local/trusted environment.
- CORS is permissive (`origin: true`) in proxy server.
- No rate limiting or session isolation on tool operations.

## 12) Priority Findings Summary

P0 (high impact/high risk):
1. Global mutable cart/wishlist state in process scope.
2. Legacy script hardcoding to unrelated paths.
3. Missing explicit auth/guardrails for mutable MCP tool endpoints.

P1 (medium):
1. Dead/legacy code creates confusion and maintenance drag.
2. MCP connection status can appear healthy despite transport ambiguity.
3. Token source duplication and sync drift risk.

P2 (lower):
1. Docs and script naming drift.
2. Parity scripts need standardization and ownership boundaries.

## 13) Current Readiness Snapshot

Build/structure readiness: Good
Widget interaction model: Good
Design parity process: Present but still maturing
Operational hardening: Needs focused P0/P1 work

## 14) Suggested Next Action

Use the companion plan document:
- `docs/code reports/cleanup-hardening-plan.md`

That plan breaks work into impact/risk-ranked phases with exact file-level tasks and verification gates.
