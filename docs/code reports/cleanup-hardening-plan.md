# MCP-UI-DEMO-ECOMV2 Cleanup and Hardening Plan

Date: 2026-02-27
Goal: Execute a concrete, ranked hardening roadmap with exact file-level tasks, acceptance criteria, and rollout order.

## Execution Status (Updated 2026-02-28)

| Workstream | Status | Notes |
|---|---|---|
| W1 Session-scoped state | Completed | Implemented on branch `codex/bas-113` |
| W2 Endpoint hardening | Completed | Implemented on branch `codex/bas-114` |
| W3 Script portability | Completed | Implemented on branch `codex/bas-115` |
| W4 Dead runtime archive | Completed | Implemented on branch `codex/bas-116` |
| W5 Connection lifecycle | Completed | Implemented on branch `codex/bas-117` |
| W6 Token governance | Completed | Implemented on branch `codex/bas-118` |
| W7 Test expansion | Completed | Implemented on branch `codex/bas-119` |
| W8 Docs alignment | In Progress | Current branch `codex/bas-120` |
| W9 Parity consolidation | Planned | Next branch `codex/bas-121` |

## 1) Planning Framework

Ranking model:
- Impact: user-visible risk, correctness, operational stability.
- Risk: chance of regressions/security incidents if unaddressed.
- Effort: estimated engineering effort.

Prioritization labels:
- P0: Do first. High impact/high risk.
- P1: Next wave. Medium-high impact.
- P2: Cleanup and optimization.

## 2) Priority Matrix (Impact/Risk)

| ID | Workstream | Priority | Impact | Risk if Deferred | Effort |
|---|---|---|---|---|---|
| W1 | Session-scoped state for cart/wishlist/order | P0 | Very High | Very High | Medium |
| W2 | Endpoint hardening for mutable tool calls | P0 | High | High | Medium |
| W3 | Script portability and path normalization | P0 | High | High | Low-Med |
| W4 | Remove/archive dead legacy runtime code | P1 | Medium | Medium | Low |
| W5 | MCP connection lifecycle correctness in frontend | P1 | Medium | Medium | Medium |
| W6 | Token source-of-truth and sync governance | P1 | Medium | Medium | Medium |
| W7 | Test expansion (behavior + state + endpoint guards) | P1 | High | Medium | Medium |
| W8 | Doc alignment with current app-router architecture | P2 | Medium | Low | Low |
| W9 | Parity automation consolidation and CI integration | P2 | Medium | Low-Med | Medium |

## 3) Detailed Workstreams and File-Level Tasks

## W1) Session-Scoped State (P0)

Objective:
- Replace global in-memory state with user/session-scoped state.

Current risk location:
- `mcp-server/src/index.js`

Tasks:
1. Introduce `stateStore` keyed by stable session/user id.
2. Thread user/session id through tool execution path.
3. Migrate tools (`add_to_cart`, `remove_from_cart`, `get_cart`, wishlist, checkout/order) to read/write per-session state.
4. Preserve backward compatibility if no session id is supplied (safe fallback profile).

Proposed file changes:
- `mcp-server/src/index.js`
- `mcp-server/src/openaiProxy.js` (if session context needs propagation)
- `web-client/app/api/chat/route.ts` (ensure user id is always provided)
- `web-client/lib/user-id.ts` and chat payload (already present, verify enforcement)

Acceptance criteria:
- Two concurrent users do not share cart/wishlist.
- Server restart behavior is explicit (in-memory session state reset documented).
- All mutable tools pass tests under isolated session contexts.

## W2) Endpoint Hardening (P0)

Objective:
- Prevent unauthorized or accidental mutable tool execution in non-local contexts.

Current risk location:
- `mcp-server/src/openaiProxy.js`

Tasks:
1. Add environment-guarded auth mode for `/api/mcp/call` and mutable `/api/tools/:toolName` calls.
2. Add allowlist for mutable tools.
3. Add optional origin checks and stricter CORS mode for production.
4. Add request validation and size guard for arguments.
5. Add minimal rate limiting for tool call endpoints.

Proposed file changes:
- `mcp-server/src/openaiProxy.js`
- `mcp-server/.env.example`
- `README.md` (security run modes)

Acceptance criteria:
- Mutable calls rejected without valid auth mode/token when enabled.
- Read-only tools remain accessible in local dev.
- Security config is documented and testable.

## W3) Script Portability and Path Normalization (P0)

Objective:
- Make scripts runnable across machines without manual path surgery.

Current risk locations:
- `scripts/batch-embed-figma-images.py`
- `fix-accent-tokens.sh`
- other scripts with absolute paths to external folders.

Tasks:
1. Replace hardcoded absolute paths with repo-relative paths and env vars.
2. Add shared script config file (`scripts/config.example.env`).
3. Fail fast with clear errors when required env vars are missing.
4. Update script docs and command examples.

Proposed file changes:
- `scripts/*.mjs`, `scripts/*.py`, `fix-accent-tokens.sh`
- add `scripts/README.md`
- `README.md`

Acceptance criteria:
- Fresh clone can run designated scripts after setting env vars.
- No script references old `MCP-UI-Demo-EcomV1` paths.

## W4) Remove/Archive Dead Runtime Code (P1)

Objective:
- Reduce maintenance confusion by eliminating inactive runtime paths.

Likely candidates:
- `mcp-server/src/products-app.ts`
- `mcp-server/src/cart-app.ts`
- `mcp-server/products-app.html`
- `mcp-server/cart-app.html`
- `mcp-server/src/index.js.bak`

Tasks:
1. Confirm non-usage via grep/import checks.
2. Move to `archive/` or remove.
3. Update docs to reflect active runtime only.

Acceptance criteria:
- `rg` shows no active references to removed runtime artifacts.
- Build/dev scripts remain green.

## W5) MCP Connection Lifecycle Correctness (P1)

Objective:
- Ensure frontend server status reflects actual reachability and callability.

Current location:
- `web-client/lib/context/mcp-context.tsx`

Tasks:
1. Replace optimistic “connected” transitions with concrete tool list health probe.
2. Track and display last successful interaction timestamp.
3. Add explicit retry/backoff behavior.
4. Improve status UI messaging for transport mismatch.

Proposed file changes:
- `web-client/lib/context/mcp-context.tsx`
- `web-client/components/mcp-server-config.tsx`

Acceptance criteria:
- UI only marks connected after successful `/api/mcp/tools` fetch.
- Failed probes show actionable status.

## W6) Token Source-of-Truth Governance (P1)

Objective:
- Prevent drift between `mcp-server/tokens` and `web-client/tokens`.

Tasks:
1. Decide canonical token location (recommended: `mcp-server/tokens` or root `tokens/`).
2. Replace duplicates with generated/synced outputs.
3. Add sync script + validation check.

Proposed file changes:
- `mcp-server/tokens/*.css`
- `web-client/tokens/*.css`
- add `scripts/sync-tokens.mjs` (or equivalent)
- `README.md` + docs updates

Acceptance criteria:
- Single source of truth established.
- CI or local check fails on token divergence.

## W7) Test Expansion for Core Risk Paths (P1)

Objective:
- Add automated confidence for behavior and safety-critical paths.

Current baseline:
- `tests/visual-diff.spec.ts`

Tasks:
1. Add server-level tests for mutable tools with session isolation.
2. Add endpoint tests for auth/guard behavior.
3. Add widget action-loop tests (tool action -> host append -> tool call).
4. Keep visual tests as regression suite.

Proposed file additions:
- `mcp-server/tests/*.test.*`
- `web-client/tests/*.test.*` (or equivalent)

Acceptance criteria:
- CI test suite covers session isolation and endpoint protection.

## W8) Documentation Alignment (P2)

Objective:
- Align docs with current app-router and bridge architecture.

Tasks:
1. Update outdated references to old paths/components.
2. Add one concise architecture map as source-of-truth.
3. Ensure setup and run instructions match actual scripts.

Proposed file changes:
- `README.md`
- `docs/decision-log.md`
- `docs/figma-sync-workflow.md`
- `docs/figma-variables-sync-guide.md`

Acceptance criteria:
- New contributor can set up and run without contradiction.

## W9) Parity Automation Consolidation (P2)

Objective:
- Reduce script sprawl and standardize parity workflow.

Tasks:
1. Consolidate overlapping capture scripts.
2. Standardize one entrypoint command for parity cycle.
3. Add CI optional parity job with artifact upload.

Proposed file changes:
- `scripts/capture-widgets-*.mjs`
- `scripts/compare-widget-parity.mjs`
- root `package.json` scripts

Acceptance criteria:
- One documented parity workflow command chain.
- Deterministic output paths and report format.

## 4) Phase Plan and Sequencing

Phase 0 (prep):
1. Branch and baseline tests/build.
2. Capture current parity report and server behavior snapshot.

Phase 1 (P0 hardening):
1. W1 session-scoped state.
2. W2 endpoint hardening.
3. W3 script portability.

Phase 2 (P1 reliability):
1. W4 dead code cleanup.
2. W5 connection lifecycle correctness.
3. W6 token governance.
4. W7 risk-path test expansion.

Phase 3 (P2 consolidation):
1. W8 docs alignment.
2. W9 parity automation consolidation.

## 5) Verification Gates per Phase

Gate A (after Phase 1):
- Server tool behavior verified under two distinct users.
- Protected mutable endpoints behave as configured.
- Script smoke test succeeds on clean machine config.

Gate B (after Phase 2):
- No references to archived dead runtime code.
- MCP status UI reflects real health.
- Token drift checks pass.
- New behavior/security tests pass.

Gate C (after Phase 3):
- Docs are consistent and runnable.
- Single parity command flow documented and validated.

## 6) Implementation Checklist (Actionable)

P0 Checklist:
- [ ] Introduce session-keyed store in `mcp-server/src/index.js`.
- [ ] Enforce session context from `web-client/app/api/chat/route.ts` payloads.
- [ ] Add mutable endpoint guardrails in `mcp-server/src/openaiProxy.js`.
- [ ] Normalize hardcoded script paths across `scripts/` and `fix-accent-tokens.sh`.

P1 Checklist:
- [ ] Archive/remove confirmed dead runtime files in `mcp-server/`.
- [ ] Improve status probe logic in `web-client/lib/context/mcp-context.tsx`.
- [ ] Define canonical token source and sync checks.
- [ ] Add core tests for session isolation + endpoint auth + action loop.

P2 Checklist:
- [ ] Update all stale architecture/setup docs.
- [ ] Merge duplicate parity scripts and add single command entrypoint.

## 7) Suggested Ownership

Backend owner:
- W1, W2, W4, backend side of W7.

Frontend owner:
- W5, frontend side of W7, docs updates in W8.

Design/tooling owner:
- W6, W9, parity process docs.

## 8) Deliverable Outputs

Expected artifacts at completion:
- Hardened server endpoints and session-safe state model.
- Portable and documented scripts.
- Streamlined runtime codebase (dead paths removed).
- Expanded test suite for critical paths.
- Aligned docs + standardized parity workflow.

## 9) Immediate Next Step Recommendation

Start with W1 + W2 in one tightly scoped implementation cycle, because they remove the highest correctness and safety risk in current architecture.
