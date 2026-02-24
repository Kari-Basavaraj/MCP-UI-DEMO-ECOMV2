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
