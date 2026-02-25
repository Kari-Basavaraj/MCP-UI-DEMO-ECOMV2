# Figma Variables ↔ Code Sync Guide

> Comprehensive two-way sync workflow for the **MCP-UI Ecommerce** codebase.
>
> References:
> - [mcpui.dev](https://mcpui.dev/)
> - [MCP-UI-Org/mcp-ui](https://github.com/MCP-UI-Org/mcp-ui)
> - [modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps)
> - [Figma Variables REST API](https://www.figma.com/developers/api#variables)

---

## Table of Contents

1. [Codebase Token Architecture](#1-codebase-token-architecture)
2. [Flow A — Figma Variables → Code in GitHub](#2-flow-a--figma-variables--code-in-github)
3. [Flow B — Code in GitHub → Figma Variables](#3-flow-b--code-in-github--figma-variables)
4. [Shared Infrastructure](#4-shared-infrastructure)
5. [Variable Rename Warnings](#5-variable-rename-warnings)
6. [Quick Reference — API Endpoints](#6-quick-reference--api-endpoints)

---

## 1. Codebase Token Architecture

### Where tokens live today

| Layer | File | Token style | Example |
|-------|------|------------|---------|
| CSS custom properties | `web-client/src/index.css` `:root` | `--primary`, `--border`, `--radius` | `--primary: #111111` |
| SDS design system vars | `web-client/src/index.css` (consumed) | `--sds-color-*`, `--sds-radius-*` | `--sds-color-background-brand-default` |
| MCP server inline HTML | `mcp-server/src/index.js` | Hardcoded hex in `style=""` | `color: #4361ee`, `color: #1a1a2e` |
| Shared catalog | `shared/catalog.mjs` | Product data (no tokens) | — |

### SDS dependency

```jsonc
// web-client/package.json
"sds": "github:figma/sds"   // Figma Simple Design System
```

SDS already provides CSS custom properties (`--sds-color-*`, `--sds-radius-*`, etc.) that map 1-to-1 with Figma variable collections.

### What needs tokenization

The MCP server's inline HTML in `generateProductListHtml()` and `generateCartHtml()` uses hardcoded hex values that must be replaced with token references:

| Hardcoded value | Semantic meaning | Target token |
|----------------|------------------|-------------|
| `#4361ee` | Brand / accent | `--sds-color-background-brand-default` |
| `#1a1a2e` | Text heading | `--sds-color-text-default-default` |
| `#666` | Text secondary | `--sds-color-text-default-secondary` |
| `#fff` | Surface card | `--sds-color-background-default-default` |
| `#ff6b6b` | Danger / remove | `--danger` → map to Figma `color/red/*` |
| `#f8f9fa` | Surface subtle | `--sds-color-background-default-secondary` |

### MCP-UI rendering context

Tools in `mcp-server/src/index.js` declare `_meta.ui.resourceUri` (e.g. `ui://ecommerce/products/list`).
The `web-client` renders them via `@mcp-ui/client`'s `UIResourceRenderer`.
Inline HTML returned by the server is rendered inside an iframe — so tokens must either be:
- Injected as a `<style>` block within the HTML string, **or**
- Served via a shared CSS file accessible from the iframe origin.

The recommended path: generate a `tokens/figma-tokens.css` file from Figma variables and inject it as a `<style>` preamble in server-generated HTML.

---

## 2. Flow A — Figma Variables → Code in GitHub

> **Use when: Figma is the design system source of truth.**
> Designers change tokens in Figma; code stays in sync automatically.

### Architecture

```
┌─────────────┐     Step 1: Trigger      ┌─────────────┐
│  Your users  │ ──────────────────────► │  GitHub      │
│  (designers) │  manual dispatch or      │  Actions     │
└─────────────┘  schedule                 │  workflow    │
                                          └──────┬──────┘
                                                 │
                                  Step 2: GET    │    Step 4: Commit
                                  /variables     │    token files
                                                 │
                                          ┌──────▼──────┐
                                          │   Figma     │
                                          │   REST API  │
                                          └─────────────┘
                                                 │
                                  Step 3: Map    │
                                  & translate    │
                                                 ▼
                                          ┌─────────────┐
                                          │  Your       │
                                          │  codebase   │
                                          └─────────────┘
```

### Step 1 — Trigger workflow when design system changes

Use a manually-triggered GitHub Actions workflow. Add `on: workflow_dispatch` with a `file_key` input so you can target specific Figma files.

```yaml
# .github/workflows/figma-pull-variables.yml
name: Sync Figma variables to tokens
on:
  workflow_dispatch:
    inputs:
      file_key:
        description: 'The file key of the Figma file to pull from'
        required: true
```

### Step 2 — Get variables from Figma

Call the **GET local variables API** with the file key. This returns all **variable collections** and all **variables** in the file.

```
GET https://api.figma.com/v1/files/{file_key}/variables/local
Authorization: Bearer {FIGMA_ACCESS_TOKEN}
```

Response shape (relevant fields):

```jsonc
{
  "variableCollections": {
    "VariableCollectionId:11:2": {
      "id": "VariableCollectionId:11:2",
      "name": "Semantics",       // collection name
      "defaultModeId": "11:0",
      "modes": [
        { "modeId": "11:0", "name": "Light" },
        { "modeId": "11:14", "name": "Dark" }
      ]
    }
  },
  "variables": {
    "VariableId:302:3354": {
      "id": "VariableId:302:3354",
      "name": "text/text-on-success",   // slash-delimited path
      "resolvedType": "COLOR",
      "valuesByMode": {
        "11:0": { "type": "VARIABLE_ALIAS", "id": "VariableId:5:11" },
        "11:14": { "type": "VARIABLE_ALIAS", "id": "VariableId:5:25" }
      },
      "scopes": ["ALL_SCOPES"]
    }
  }
}
```

**Key concepts visible in the Figma UI:**
- **Semantics** = a collection
- **Light** and **Dark** = modes
- **text-on-success** = a variable
- Variable values can be direct RGBA or `VARIABLE_ALIAS` references (follow the chain to resolve)

### Step 3 — Connect the dots (map + translate)

Map Figma variable names to this project's CSS custom property names and translate RGBA floats to hex.

**Mapping rules for this codebase:**

| Figma variable path | CSS custom property | Notes |
|---------------------|-------------------|-------|
| `text/text-on-success` | `--sds-color-text-on-success` | SDS naming |
| `text/text-on-brand` | `--sds-color-text-on-brand` | |
| `text/text-primary` | `--sds-color-text-default-default` | Semantic alias |
| `surface/*` | `--sds-color-background-*` | |
| `border/*` | `--sds-color-border-*` | |
| `color/green/100` | `--color-green-100` | Primitive, resolved via alias chain |

**Translation: RGBA floats → hex**

Figma returns colors as `{ r: 0.85, g: 0.91, b: 0.98, a: 1 }`.
Convert: `r × 255 → hex`, `g × 255 → hex`, `b × 255 → hex`.

```js
// scripts/figma-pull-variables.mjs (to be created)
function figmaRgbaToHex({ r, g, b, a }) {
  const toHex = (v) => Math.round(v * 255).toString(16).padStart(2, '0');
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  return a < 1 ? `${hex}${toHex(a)}` : hex;
}
```

**Alias resolution:**

If a variable's value is `{ "type": "VARIABLE_ALIAS", "id": "VariableId:5:11" }`, look up that ID in the variables map and resolve recursively until you get a concrete RGBA/number value.

**Output files for this codebase:**

| Output file | Purpose | Consumed by |
|-------------|---------|------------|
| `tokens/figma/variables.raw.json` | Raw API response (cache) | Scripts |
| `tokens/figma/variables.normalized.json` | Flattened name→value map per mode | Scripts |
| `tokens/figma-tokens.css` | CSS custom properties (Light mode default) | `web-client/src/index.css` via `@import`, and MCP server HTML preamble |
| `tokens/figma-tokens-dark.css` | Dark mode overrides | Optional `prefers-color-scheme` |

Example generated `tokens/figma-tokens.css`:

```css
/* Auto-generated from Figma — DO NOT EDIT MANUALLY */
/* Collection: Semantics, Mode: Light */
:root {
  --sds-color-text-on-success: #14ae5c;
  --sds-color-text-on-info: #4361ee;
  --sds-color-text-on-critical: #ec221f;
  --sds-color-text-on-warning: #e5a000;
  --sds-color-text-on-brand: #ffffff;
  --sds-color-text-default-default: #111111;
  --sds-color-text-default-secondary: #757575;
  /* ... */
}
```

### Step 4 — Write variables to codebase (commit)

Use a GitHub Actions step or `git` to commit the generated token files and optionally open a PR.

```yaml
# .github/workflows/figma-pull-variables.yml (continued)
jobs:
  sync-variables-to-code:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Sync variables
        run: node scripts/figma-pull-variables.mjs
        env:
          FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_ACCESS_TOKEN }}
          FIGMA_FILE_KEY: ${{ github.event.inputs.file_key }}
      - name: Commit report
        run: |
          git config --global user.name 'figma-sync-bot'
          git config --global user.email 'bot@users.noreply.github.com'
          git add tokens/
          git commit -am "Update design tokens from Figma" || echo "No changes"
          git push
```

### How this connects to MCP-UI rendering

After tokens are committed:

1. `web-client/src/index.css` imports `tokens/figma-tokens.css` — all SDS vars update automatically.
2. `mcp-server/src/index.js` reads `tokens/figma-tokens.css` at startup and injects it as a `<style>` block in every `generateProductListHtml()` / `generateCartHtml()` response — so `UIResourceRenderer` iframes get correct tokens.
3. The `@mcp-ui/client` / `@mcp-ui/server` handshake is unaffected — only visual tokens change.

---

## 3. Flow B — Code in GitHub → Figma Variables

> **Use when: codebase is the design system source of truth.**
> Engineers change tokens in code; Figma stays in sync automatically.

### Architecture

```
┌─────────────┐     Step 1: Trigger      ┌─────────────┐
│  GitHub      │ ──────────────────────► │  GitHub      │
│  (push to    │  on: push               │  Actions     │
│  token paths)│  paths filter            │  workflow    │
└─────────────┘                           └──────┬──────┘
                                                 │
                                  Step 2: GET    │    Step 4: POST
                                  /variables     │    /variables
                                  (read IDs)     │    (write values)
                                                 │
                                          ┌──────▼──────┐
                                          │   Figma     │
                                          │   REST API  │
                                          └─────────────┘
                                                 │
                                  Step 3: Map    │    Step 5: Publish
                                  code tokens    │    library updates
                                  to Figma IDs   │    (manual in Figma)
                                                 ▼
                                          ┌─────────────┐
                                          │  Your       │
                                          │  codebase   │
                                          └─────────────┘
```

### Step 1 — Trigger workflow when design system changes

Use `on: push` with a `paths` filter so the workflow only runs when token files change.

```yaml
# .github/workflows/figma-push-variables.yml
name: Sync tokens to Figma
on:
  push:
    paths:
      - 'tokens/**'
      - 'web-client/src/index.css'
```

For this codebase, the relevant token source paths are:
- `tokens/figma-tokens.css` (if generated tokens are manually edited)
- `web-client/src/index.css` (if `:root` block is the canonical source)

### Step 2 — Get variables from Figma (read current state)

Same API call as Flow A — you need the current variable IDs, collection IDs, and mode IDs to construct the POST body.

```
GET https://api.figma.com/v1/files/{file_key}/variables/local
```

Unless you've stored these IDs in a local metadata file (recommended), you must GET them every time.

**Recommended: maintain a mapping file**

```jsonc
// tokens/figma/.variable-ids.json
{
  "collectionId": "VariableCollectionId:11:2",
  "modes": {
    "Light": "11:0",
    "Dark": "11:14"
  },
  "variables": {
    "--sds-color-text-on-success": "VariableId:302:3354",
    "--sds-color-text-default-default": "VariableId:302:3360",
    "--sds-color-background-brand-default": "VariableId:302:3370"
    // ...
  }
}
```

### Step 3 — Connect the dots (code → Figma mapping)

Start with the file(s) that were changed in your code. Map code token names back to Figma variable IDs, and translate hex values to Figma RGBA floats.

**Mapping rules for this codebase (reverse of Flow A):**

| CSS custom property | Figma variable path | Translation |
|-------------------|---------------------|-------------|
| `--primary: #111111` | `text/text-primary` | hex → RGBA floats |
| `--success: #14ae5c` | `text/text-on-success` | hex → RGBA floats |
| `--danger: #ec221f` | `text/text-on-critical` | hex → RGBA floats |

**Translation: hex → RGBA floats**

```js
// scripts/figma-push-variables.mjs (to be created)
function hexToFigmaRgba(hex) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const a = h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
  return { r, g, b, a };
}
```

**Connect themes/variants to Figma modes:**

In this codebase, the Tailwind-like config maps to Figma modes:
- `Light` theme → Figma mode `11:0` (default)
- `Dark` theme → Figma mode `11:14`

Each CSS class like `.theme-light .text-on-success { color: var(--green-100); }` corresponds to setting the value for variable `text/text-on-success` in mode `Light` to the resolved RGBA of `--green-100`.

### Step 4 — Write variables to Figma (POST)

Call the **POST variables API** to upsert values back to Figma.

```
POST https://api.figma.com/v1/files/{file_key}/variables
Authorization: Bearer {FIGMA_ACCESS_TOKEN}
Content-Type: application/json
```

Request body:

```json
{
  "variableModeValues": [
    {
      "variableId": "VariableId:302:3354",
      "modeId": "11:0",
      "value": {
        "r": 0.0784313725490196,
        "g": 0.6823529411764706,
        "b": 0.3607843137254902,
        "a": 1
      }
    }
  ]
}
```

Each entry targets one variable + one mode. Batch all changed values into a single POST.

**GitHub Actions step:**

```yaml
jobs:
  sync-tokens-to-figma:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Push tokens to Figma
        run: node scripts/figma-push-variables.mjs
        env:
          FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_ACCESS_TOKEN }}
          FIGMA_FILE_KEY: ${{ secrets.FIGMA_FILE_KEY }}
```

### Step 5 — Publish library updates (manual)

After the design file is updated via API, go into the **Figma UI** to:

1. **Publish your libraries** to make the updates available to other files.
2. Figma makes the updates available in every file where the variable is used.
3. Individual file owners can **accept the design system changes** whenever they're ready.

> This step cannot be automated — it requires a human with publish permissions in Figma.

---

## 4. Shared Infrastructure

### npm scripts (to add to root `package.json`)

```jsonc
{
  "scripts": {
    "figma:pull": "node scripts/figma-pull-variables.mjs",
    "figma:push": "node scripts/figma-push-variables.mjs",
    "figma:verify": "node scripts/figma-verify-tokens.mjs"
  }
}
```

### File structure after setup

```
tokens/
  figma/
    variables.raw.json          # Cached GET response
    variables.normalized.json   # Flattened name→value per mode
    .variable-ids.json          # Stable ID mapping (gitignored: no)
  figma-tokens.css              # Generated CSS custom properties (Light)
  figma-tokens-dark.css         # Generated CSS custom properties (Dark)
scripts/
  figma-pull-variables.mjs      # Flow A script
  figma-push-variables.mjs      # Flow B script
  figma-verify-tokens.mjs       # Drift detection
.github/
  workflows/
    figma-pull-variables.yml    # Flow A workflow
    figma-push-variables.yml    # Flow B workflow
```

### Environment / secrets

| Secret | Used by | Where to store |
|--------|---------|----------------|
| `FIGMA_ACCESS_TOKEN` | Both flows | GitHub Actions secret + `.env.local` for local dev |
| `FIGMA_FILE_KEY` | Both flows | GitHub Actions secret or workflow input |

### Consuming tokens in MCP-UI server HTML

The MCP server generates inline HTML for `UIResourceRenderer` iframes. To use Figma-synced tokens instead of hardcoded hex:

```js
// mcp-server/src/index.js — proposed pattern
import { readFileSync } from 'fs';
const TOKEN_CSS = readFileSync('../tokens/figma-tokens.css', 'utf-8');

function wrapWithTokens(html) {
  return `<style>${TOKEN_CSS}</style>${html}`;
}

// Then in generateProductListHtml():
// Replace: color: #4361ee  → color: var(--sds-color-background-brand-default)
// Replace: color: #1a1a2e  → color: var(--sds-color-text-default-default)
// And wrap: return wrapWithTokens(html);
```

---

## 5. Variable Rename Warnings

> **Renaming variables can break your integration.**

### Value updates — safe ✅

Syncing a new value for an existing variable name is straightforward. The sync code matches by name and updates the value.

```
Original:  color.gray.50  →  value: "#f3f4f6"
Modified:  color.gray.50  →  value: "new_color"
Result:    ✅ Detected as update, synced correctly
```

### Name renames — dangerous ⚠️

If there is no stable identifier in the tokens file, your sync code **cannot tell the difference** between a rename and a deletion + addition.

```
Original:  color.gray.50      →  value: "#f3f4f6"
Modified:  color.gray.50_new  →  value: "#f3f4f6"
Result:    ❌ Interpreted as NEW variable; old references orphaned
```

**Mitigation for this codebase:**
- Always use the Figma variable **ID** (e.g. `VariableId:302:3354`) as the stable identifier in `.variable-ids.json`.
- If a CSS custom property is renamed in code, update the mapping file in the same commit.
- Add a CI check that flags any mapping entries whose variable IDs no longer exist in the GET response.

---

## 6. Quick Reference — API Endpoints

| Operation | Method | Endpoint | Auth |
|-----------|--------|----------|------|
| Get all variables + collections | GET | `https://api.figma.com/v1/files/{file_key}/variables/local` | Bearer token |
| Upsert variable values | POST | `https://api.figma.com/v1/files/{file_key}/variables` | Bearer token |
| Get file metadata | GET | `https://api.figma.com/v1/files/{file_key}` | Bearer token |

### Figma MCP (for agent-assisted workflows in VS Code)

```jsonc
// .mcp.json (workspace root)
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

Figma MCP tools available for agent sessions: `get_design_context`, `get_metadata`, `get_variable_defs`, `get_screenshot`, `get_figjam`.

---

## Decision Summary

| Question | Decision for this project |
|----------|--------------------------|
| Which direction is primary? | **Figma → Code** (Flow A) is the default for design tokens |
| Token format in repo? | CSS custom properties (aligned with SDS) |
| Where do tokens get consumed? | `web-client` via CSS import + `mcp-server` via injected `<style>` in HTML strings |
| How to handle Dark mode? | Separate `figma-tokens-dark.css` with `@media (prefers-color-scheme: dark)` override |
| CI automation? | GitHub Actions with `workflow_dispatch` (pull) and `push` path filter (push) |
| Rename safety? | Stable ID mapping in `tokens/figma/.variable-ids.json` |
