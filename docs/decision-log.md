# Decision Log

Tracks architecture and implementation decisions so changes remain reversible, auditable, and easier to reason about.

## How to use

- Add one entry per meaningful decision.
- Keep entries short and factual.
- Include rationale and rollback notes.
- Prefer newest entries at the top.

## Decision Update Checklist

- Capture the decision on the same day it is made.
- Mark status (`Proposed`, `Accepted`, or `Reverted`).
- Record why alternatives were not chosen (1-2 lines max).
- Add rollback steps that can be executed without guesswork.
- Link impacted files and commit hash after committing.
- If scope changes later, add a new entry instead of rewriting history.

## Decision Template

```md
## [YYYY-MM-DD] <Short decision title>
- Status: Proposed | Accepted | Reverted
- Context: Why this decision was needed.
- Decision: What we chose.
- Rationale: Why this option was selected.
- Impact: What changes because of this.
- Rollback: How to safely undo.
- Related: PR/commit/file references.
```

---

## [2026-02-24] Use server as single source of tool truth

- Status: Accepted
- Context: Client-side simulated tool logic could diverge from server-side MCP behavior.
- Decision: Added server HTTP tool endpoints and routed client tool execution through them.
- Rationale: Keeps chat/product/cart state aligned with backend MCP tool responses.
- Impact: Chat UI now consumes authoritative tool output from the server API.
- Rollback: Revert proxy tool endpoints and switch `executeMCPTool` back to local-only simulation.
- Related: `mcp-server/src/openrouterProxy.js`, `mcp-server/src/index.js`, `web-client/src/App.tsx`

## [2026-02-24] Add MCP Apps-compatible UI metadata and URIs

- Status: Accepted
- Context: Existing tool responses used legacy custom URI conventions and lacked MCP Apps linkage metadata.
- Decision: Added `_meta.ui.resourceUri` in tool definitions and moved resource URIs to `ui://...`.
- Rationale: Improves forward-compatibility with MCP Apps host conventions.
- Impact: Tool metadata now advertises explicit UI resources aligned with spec direction.
- Rollback: Revert tool metadata and URI scheme updates in server definitions.
- Related: `mcp-server/src/index.js`

## [2026-02-24] Standardize shared catalog as ESM module

- Status: Accepted
- Context: CommonJS shared module usage caused browser/runtime import issues in Vite.
- Decision: Replaced `shared/catalog.js` with `shared/catalog.mjs` and updated imports.
- Rationale: Ensures compatibility across server ESM and browser bundling.
- Impact: Shared product/category source works reliably in both client and server.
- Rollback: Restore previous file/module format and corresponding imports.
- Related: `shared/catalog.mjs`, `mcp-server/src/index.js`, `web-client/src/App.tsx`

## [2026-02-24] Adopt TDD for chat/tool-state changes

- Status: Accepted
- Context: Chat and product/cart state drift issues were hard to catch manually.
- Decision: Added unit tests first for tool-state transitions before refactoring runtime logic.
- Rationale: Locks expected behavior and prevents regressions in cart/product synchronization.
- Impact: `web-client` now includes a repeatable test flow for tool state (`npm test`).
- Rollback: Remove Vitest setup and `toolState` tests/modules if test tooling is no longer desired.
- Related: `web-client/src/lib/toolState.ts`, `web-client/src/lib/toolState.test.ts`, `web-client/package.json`

## [2026-02-24] Centralize chat tool-state mutation logic

- Status: Accepted
- Context: Tool execution logic in `App.tsx` relied on captured state and caused sync mismatches.
- Decision: Introduced a pure `applyToolAction` function and routed tool mutations through it.
- Rationale: Deterministic state transitions make UI and chat behavior consistent.
- Impact: Cart/product updates now use a single state engine, and chat resources stay aligned.
- Rollback: Restore inline switch-based mutation logic in `App.tsx` and remove `toolState` module.
- Related: `web-client/src/App.tsx`, `web-client/src/lib/toolState.ts`

## [2026-02-24] Add explicit AI integration status checks

- Status: Accepted
- Context: It was unclear whether chat responses came from OpenRouter or fallback mode.
- Decision: Extended proxy health response and surfaced AI status in the chat header.
- Rationale: Makes model-integration state visible and easier to debug in local/dev environments.
- Impact: Users can confirm if API key/model integration is active without inspecting network logs.
- Rollback: Revert health payload and remove header status indicator.
- Related: `mcp-server/src/openrouterProxy.js`, `web-client/src/App.tsx`

## [2026-02-24] Route OpenRouter through local server proxy

- Status: Accepted
- Context: Client-side API key usage exposed secrets in browser builds.
- Decision: Added a backend proxy endpoint for OpenRouter calls.
- Rationale: Keeps secrets server-side and reduces accidental key leakage risk.
- Impact: Client now calls local API; server requires OpenRouter env variables.
- Rollback: Revert proxy files and switch client back to direct OpenRouter call.
- Related: `mcp-server/src/openrouterProxy.js`, `mcp-server/src/index.js`, `web-client/src/App.tsx`

## [2026-02-24] Centralize product catalog into shared module

- Status: Accepted
- Context: Product/catalog data was duplicated across server and client.
- Decision: Introduced shared catalog source and imported it from both apps.
- Rationale: Avoids data drift and reduces maintenance overhead.
- Impact: One source of truth for products and categories.
- Rollback: Restore local in-file arrays and remove shared module imports.
- Related: `shared/catalog.js`, `mcp-server/src/index.js`, `web-client/src/App.tsx`

## [2026-02-24] Track env setup via examples and docs

- Status: Accepted
- Context: Setup was implicit and mixed with client-side secret handling.
- Decision: Added `.env.example` files and updated setup docs.
- Rationale: Improves onboarding and keeps sensitive values out of committed files.
- Impact: Clear configuration path for local dev and team setup.
- Rollback: Remove examples and revert README setup section.
- Related: `mcp-server/.env.example`, `web-client/.env.example`, `README.md`, `.gitignore`
