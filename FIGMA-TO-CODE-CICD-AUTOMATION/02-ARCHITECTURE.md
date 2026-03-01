# 02 — System Architecture

> How every file, script, and workflow connects. The complete dependency map.

---

## High-Level Architecture

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         FIGMA (Cloud)                                  ║
║                                                                        ║
║  ┌──────────────────────┐    ┌──────────────────────────┐              ║
║  │  Variables API        │    │  Code Connect Service     │              ║
║  │  GET  /v1/files/…/    │    │  @figma/code-connect CLI  │              ║
║  │       variables/local │    │  parse │ publish          │              ║
║  │  POST /v1/files/…/    │    └──────────────────────────┘              ║
║  │       variables       │                                              ║
║  └───────────┬───────────┘                                              ║
╚══════════════╪══════════════════════════════════════════════════════════╝
               │ HTTPS (Bearer token)
               │
╔══════════════╪══════════════════════════════════════════════════════════╗
║              │          LOCAL / CI RUNNER                               ║
║              ▼                                                          ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │                    scripts/ (13 ESM modules)                    │    ║
║  │                                                                 │    ║
║  │  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────┐   │    ║
║  │  │ figma-lib   │  │ figma-normalizer│  │ figma-probe      │   │    ║
║  │  │ (shared)    │  │ (transform)     │  │ (route selector) │   │    ║
║  │  └──────┬──────┘  └────────┬────────┘  └──────────────────┘   │    ║
║  │         │                  │                                   │    ║
║  │  ┌──────┴────────┐  ┌─────┴──────────┐  ┌─────────────────┐  │    ║
║  │  │ pull-variables│  │ normalize-vars │  │ generate-tokens │  │    ║
║  │  │ (API → JSON)  │──▶ (JSON → JSON)  │──▶ (JSON → CSS)    │  │    ║
║  │  └───────────────┘  └────────────────┘  └────────┬────────┘  │    ║
║  │                                                   │           │    ║
║  │  ┌────────────────┐  ┌────────────────┐  ┌───────┴────────┐  │    ║
║  │  │ push-variables │  │ sync-tokens    │  │ verify         │  │    ║
║  │  │ (CSS → API)    │◀─│ (mirror copy)  │◀─│ (5 checks)     │  │    ║
║  │  └────────────────┘  └────────────────┘  └────────────────┘  │    ║
║  │                                                               │    ║
║  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────┐  │    ║
║  │  │ codeconnect-     │  │ codeconnect-     │  │ codeconnect│  │    ║
║  │  │ generate         │──▶ verify           │──▶ publish    │  │    ║
║  │  └──────────────────┘  └──────────────────┘  └────────────┘  │    ║
║  │                                                               │    ║
║  │  ┌──────────────────────────────────────────────────────────┐ │    ║
║  │  │ Orchestrators: sync-pull │ sync-push │ sync-full        │ │    ║
║  │  └──────────────────────────────────────────────────────────┘ │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
║                                                                        ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │                    GitHub Actions (4 workflows)                  │    ║
║  │  ci-core │ figma-pull-variables │ figma-push-variables │         │    ║
║  │          │ figma-codeconnect-sync                                │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

## Script Inventory

### Shared Library

| Script | Purpose | Exports |
|---|---|---|
| `figma-lib.mjs` | Shared constants, utilities, API client | `PATHS`, `figmaApi()`, `loadSyncConfig()`, `readJson()`, `writeJson()`, `runCommand()`, `formatCssValue()`, `parseCssVariables()`, `componentAliasBlock()`, `appendRolloutLog()` |
| `figma-normalizer.mjs` | Raw API payload → normalized structure | `normalizeFigmaVariables()` |

### Pipeline Scripts (Atomic)

| Script | Input | Output | Side Effects |
|---|---|---|---|
| `figma-pull-variables.mjs` | Figma API | `variables.raw.json`, `variables.normalized.json`, `.variable-ids.json` | API read |
| `figma-normalize-variables.mjs` | `variables.raw.json` | `variables.normalized.json`, `.variable-ids.json` | None |
| `figma-generate-tokens.mjs` | `variables.normalized.json` | `figma-tokens-light.css`, `figma-tokens-dark.css` | None |
| `sync-tokens.mjs` | `mcp-server/tokens/*.css` | `web-client/tokens/*.css` | File copy |
| `figma-push-variables.mjs` | `*.css` + `.variable-ids.json` | Push report JSON | API write (with `--apply`) |
| `figma-probe.mjs` | Figma API + CLI | Probe report JSON + MD | 4 API/CLI calls |
| `figma-verify.mjs` | All artifacts | Verification report JSON + MD | Runs sub-scripts |
| `figma-codeconnect-generate.mjs` | `mappings.source.json` | `mappings.generated.json` | None |
| `figma-codeconnect-verify.mjs` | `mappings.generated.json` | Console JSON | None |
| `figma-codeconnect-publish.mjs` | `mappings.generated.json` | Publish report JSON | CLI publish (with `--apply`) |

### Orchestrators

| Script | What it chains | Flags |
|---|---|---|
| `figma-sync-pull.mjs` | pull → normalize → generate → sync → verify | — |
| `figma-sync-push.mjs` | normalize → generate → sync → push → verify | `--apply` |
| `figma-sync-full.mjs` | probe → sync-pull → codeconnect (generate+verify+publish) → sync-push | `--apply-push`, `--apply-publish` |

---

## File Dependency Map

```
figma/sync.config.json                  ◀── Central config (all scripts read this)
  │
  ├── scripts/figma-lib.mjs             ◀── loadSyncConfig(), PATHS, figmaApi()
  │     │
  │     ├── scripts/figma-pull-variables.mjs
  │     │     │
  │     │     ▼
  │     │   tokens/figma/variables.raw.json
  │     │     │
  │     │     ▼
  │     ├── scripts/figma-normalize-variables.mjs
  │     │     │   (uses figma-normalizer.mjs)
  │     │     ▼
  │     │   tokens/figma/variables.normalized.json
  │     │   tokens/figma/.variable-ids.json
  │     │     │
  │     │     ▼
  │     ├── scripts/figma-generate-tokens.mjs
  │     │     │
  │     │     ▼
  │     │   mcp-server/tokens/figma-tokens-light.css    ◀── Canonical source
  │     │   mcp-server/tokens/figma-tokens-dark.css     ◀── Canonical source
  │     │     │
  │     │     ▼
  │     ├── scripts/sync-tokens.mjs
  │     │     │
  │     │     ▼
  │     │   web-client/tokens/figma-tokens-light.css    ◀── Mirror copy
  │     │   web-client/tokens/figma-tokens-dark.css     ◀── Mirror copy
  │     │
  │     ├── scripts/figma-push-variables.mjs
  │     │     │
  │     │     ▼
  │     │   tokens/figma/rollback-*.json                ◀── Snapshot before push
  │     │   docs/code reports/figma-push-report-*.json
  │     │
  │     ├── scripts/figma-verify.mjs
  │     │     │
  │     │     ▼
  │     │   docs/code reports/figma-sync-verification.json
  │     │   docs/code reports/figma-sync-verification.md
  │     │
  │     └── scripts/figma-probe.mjs
  │           │
  │           ▼
  │         docs/code reports/figma-capability-probe.json
  │         docs/code reports/figma-capability-probe.md
  │
  ├── figma/figma.config.json           ◀── Code Connect CLI config
  │     │
  │     ├── figma/code-connect/mappings.source.json     ◀── Hand-maintained
  │     ├── figma/code-connect/required-components.json ◀── 12 required components
  │     ├── figma/code-connect/mappings.generated.json  ◀── Auto-generated
  │     └── figma/code-connect/components/*.figma.tsx   ◀── 12 component files
  │
  └── tokens/figma/token-name-map.json  ◀── Custom name overrides
```

---

## Data Flow: Figma → Code (Pull)

```
Figma Variables API
     │
     │  GET /v1/files/{key}/variables/local
     ▼
┌────────────────────────────────────┐
│  variables.raw.json                │  Raw API response + metadata
└────────────────┬───────────────────┘
                 │  figma-normalizer.mjs
                 ▼
┌────────────────────────────────────┐
│  variables.normalized.json         │  Flat array of {cssVar, value, modes}
│  .variable-ids.json                │  Lookup table: cssVar → variableId + modeIds
└────────────────┬───────────────────┘
                 │  figma-generate-tokens.mjs
                 ▼
┌────────────────────────────────────┐
│  figma-tokens-light.css            │  :root { --sds-color-...: #hex; }
│  figma-tokens-dark.css             │  @media (prefers-color-scheme: dark) { ... }
└────────────────┬───────────────────┘
                 │  sync-tokens.mjs
                 ▼
┌────────────────────────────────────┐
│  web-client/tokens/ (mirror)       │  Identical copies for web-client build
└────────────────────────────────────┘
```

---

## Data Flow: Code → Figma (Push)

```
figma-tokens-light.css + figma-tokens-dark.css
     │
     │  parseCssVariables()
     ▼
┌────────────────────────────────────┐
│  In-memory: { cssVar: cssValue }   │  e.g., --sds-color-brand: #2c2c2c
└────────────────┬───────────────────┘
                 │  buildVariableModeValues()
                 │  + .variable-ids.json (lookup variableId + modeId)
                 ▼
┌────────────────────────────────────┐
│  Update payload: [                 │
│    { variableId, modeId, value }   │  Values converted via parseCssValueToFigma()
│  ]                                 │
└────────────────┬───────────────────┘
                 │  Canary filter (if enabled)
                 │  Library variable filter
                 ▼
┌────────────────────────────────────┐
│  Rollback snapshot captured        │  GET /variables/local → rollback-*.json
└────────────────┬───────────────────┘
                 │  POST /v1/files/{key}/variables
                 ▼
┌────────────────────────────────────┐
│  Figma Variables Updated           │  Designers see new values in Figma
└────────────────────────────────────┘
```

---

## Data Flow: Code Connect

```
figma/code-connect/components/*.figma.tsx
     │
     │  Each file: figma.connect(ComponentUrl, { ... })
     ▼
┌──────────────────────────────────────┐
│  mappings.source.json                │  12 entries: { id, nodeId, source }
│  required-components.json            │  12 required components
└──────────────────┬───────────────────┘
                   │  figma-codeconnect-generate.mjs
                   ▼
┌──────────────────────────────────────┐
│  mappings.generated.json             │  Enriched with fileKey, sourceExists, etc.
└──────────────────┬───────────────────┘
                   │  figma-codeconnect-verify.mjs (3 checks: required, source, nodeIds)
                   │
                   │  figma-codeconnect-publish.mjs (--apply)
                   ▼
┌──────────────────────────────────────┐
│  @figma/code-connect CLI             │  npx code-connect publish --config ...
│  → Figma Dev Mode shows code         │
└──────────────────────────────────────┘
```

---

## Token Naming Convention

All CSS custom properties follow the `--sds-*` namespace:

```
--sds-{category}-{subcategory}-{variant}

Examples:
  --sds-color-background-default-default     → #ffffff
  --sds-color-text-default-secondary         → #757575
  --sds-size-padding-lg                      → 16px
  --sds-typo-body-size-medium                → 16px
  --sds-comp-card-bg                         → var(--sds-color-background-default-default)
```

### Categories

| Prefix | Contains |
|---|---|
| `--sds-color-background-*` | Background colors (default, brand, danger, positive, warning, utilities) |
| `--sds-color-text-*` | Text/foreground colors |
| `--sds-color-border-*` | Border colors |
| `--sds-size-padding-*` | Padding values (xs through xxl) |
| `--sds-size-space-*` | Spacing values (100 through 600) |
| `--sds-size-radius-*` | Border radius values |
| `--sds-size-height-*` | Fixed heights (buttons, inputs) |
| `--sds-typo-*` | Typography (font family, sizes, weights, line heights) |
| `--sds-comp-*` | Component aliases (card, button, input, badge) |

### Component Aliases

Component tokens are **not** pulled from Figma. They are computed aliases defined in `figma-lib.mjs → componentAliasBlock()` and appended to the generated CSS files:

```css
--sds-comp-card-bg: var(--sds-color-background-default-default);
--sds-comp-card-border: var(--sds-color-border-default-default);
--sds-comp-card-radius: var(--sds-size-radius-400);
/* ... etc */
```

These ensure CSS-level indirection — a component can reference `var(--sds-comp-card-bg)` and the actual color changes automatically when the underlying token changes.

---

## Route System

The probe script evaluates API capabilities and selects a route:

| Route | Variables Read | Code Connect Parse | Code Connect Publish | Variables Write | CI Behavior |
|---|---|---|---|---|---|
| **Route A** | ✅ | ✅ | ❌ | ❌ | CI reads + verifies; writes require local/office |
| **Route B** | ✅ | ✅ | ✅ | ✅ | Full CI automation |
| **Route C** | ❌ | ❌ | ❌ | ❌ | Manual fallback; fix auth first |

The route is **advisory** — it's determined by `figma-probe.mjs` and logged. The actual gating is done by `writeMode` and `routes.*` in `sync.config.json`.

---

*Next: [03-FIGMA-TO-CODE.md](./03-FIGMA-TO-CODE.md) — Step-by-step pull workflow*
