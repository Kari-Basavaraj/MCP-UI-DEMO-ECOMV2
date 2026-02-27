# MCP Ecommerce Playground — Comprehensive Session Log

> **Date**: 2026-02-26  
> **Purpose**: End-to-end record of all decisions, issues, fixes, root causes, and research across the entire active thread. Written so a NEW agent thread can continue without repeating any work.  
> **Status at end of session**: All 12 widgets built and deployed. Multiple visual/functional fixes applied. Some known remaining issues documented below.

---

## Table of Contents

1. [Project Overview & Architecture](#1-project-overview--architecture)
2. [File Map — What Lives Where](#2-file-map--what-lives-where)
3. [The 12 Widgets — Current State](#3-the-12-widgets--current-state)
4. [Chronological Work Log](#4-chronological-work-log)
5. [ROOT CAUSE: Widget Button Failures (ext-apps SDK)](#5-root-cause-widget-button-failures-ext-apps-sdk)
6. [Bridge.ts — The Solution](#6-bridgets--the-solution)
7. [Tool-Invocation Rendering Pipeline (THE critical file)](#7-tool-invocation-rendering-pipeline-the-critical-file)
8. [Design Token System](#8-design-token-system)
9. [Issues Found & Fixed This Session](#9-issues-found--fixed-this-session)
10. [Issues Still Remaining / Known Bugs](#10-issues-still-remaining--known-bugs)
11. [System Prompt Engineering](#11-system-prompt-engineering)
12. [Build & Deploy Process](#12-build--deploy-process)
13. [Skeleton / Loading UX](#13-skeleton--loading-ux)
14. [Common Pitfalls — DO NOT REPEAT](#14-common-pitfalls--do-not-repeat)
15. [File-by-File Change Log (This Session)](#15-file-by-file-change-log-this-session)
16. [Figma Parity Rules](#16-figma-parity-rules)
17. [What To Do Next](#17-what-to-do-next)

---

## 1. Project Overview & Architecture

### Stack

| Layer | Tech | Path | Port |
|-------|------|------|------|
| Web Client | Next.js 15 + Turbopack, Tailwind v4, `@ai-sdk/react` | `web-client/` | 3000 |
| MCP Server | Express + `@modelcontextprotocol/sdk`, SSE transport | `mcp-server/` | 8787 |
| Widget Build | Vite + `vite-plugin-singlefile` → self-contained HTML | `mcp-server/widgets/` (HTML), `mcp-server/src/widgets/` (TS+CSS) | — |
| Built Widgets | Single-file HTML with all JS/CSS inlined | `mcp-server/dist/widgets/` | — |
| Design Tokens | CSS custom properties from Figma MCPUI-DS-V1 | `mcp-server/tokens/figma-tokens-{light,dark}.css` | — |
| Shared Catalog | 8 products, 3 categories | `shared/catalog.mjs` | — |

### How It All Connects

```
User types in chat → Next.js app → POST /api/chat (route.ts)
  → streamText() with system prompt + MCP tools
  → LLM calls a tool (e.g. get_products)
  → MCP server executes tool, returns JSON + resource URI
  → tool-invocation.tsx receives result
  → Fetches widget HTML from /api/mcp/resource?uri=...
  → Injects __MCP_TOOL_RESULT__ + theme into HTML
  → Renders iframe via UIResourceRenderer (@mcp-ui/client)
  → Widget JS reads __MCP_TOOL_RESULT__ and populates DOM
  → User clicks button in widget
  → bridge.ts sends postMessage to parent
  → tool-invocation.tsx handleUiAction catches it
  → Converts to natural language via ACTION_TO_NATURAL_LANGUAGE
  → Appends as user message → LLM processes → calls next tool
```

### Widget Communication Protocol

**CRITICAL**: Widgets use `bridge.ts` (NOT `@modelcontextprotocol/ext-apps` SDK) to talk to the host.

- `callTool(toolName, params)` → `window.parent.postMessage({type:"tool", payload:{toolName, params}}, "*")`
- Host `UIResourceRenderer` catches these → `handleUiAction` callback → `ACTION_TO_NATURAL_LANGUAGE` map → user message → LLM acts
- **NEVER** use `@modelcontextprotocol/ext-apps` `callServerTool()` — it sends JSON-RPC 2.0 which the host **doesn't understand**

---

## 2. File Map — What Lives Where

### Web Client (`web-client/`)

| File | Purpose | Lines | Key Details |
|------|---------|-------|-------------|
| `app/api/chat/route.ts` | API route for chat, contains THE system prompt | ~126 | `streamText()`, `maxSteps: 20`, system prompt with tool rules |
| `app/globals.css` | Global CSS: theme vars, skeleton shimmer, widget-appear animation | ~123 | Light/dark theme vars, `@keyframes shimmer`, `animate-widget-appear`, `shimmer-text` |
| `app/page.tsx` | Main page layout | — | Chat + sidebar |
| `components/tool-invocation.tsx` | **THE MOST IMPORTANT FILE** — widget rendering pipeline | ~711 | Skeleton → loading → iframe → follow-ups. See Section 7. |
| `components/chat.tsx` | Chat component with `useChat` | — | Passes `append` to tool-invocation |
| `components/message.tsx` | Message bubble rendering | — | Renders tool invocations inline |
| `lib/mcp-client.ts` | MCP client initialization, SSE transport | — | Normalizes mimeType to `text/html` |
| `lib/context/theme-context.tsx` | Theme context provider | — | `theme` state, broadcasts to iframes |

### MCP Server (`mcp-server/`)

| File | Purpose | Key Details |
|------|---------|-------------|
| `src/index.js` | MCP server entry — tools, resources, state, HTTP bridge | 465 lines. Registers 17 tools + 12 resources. Pre-loads all widget HTML at startup. |
| `src/openrouterProxy.js` (or `openaiProxy.js`) | OpenRouter/OpenAI proxy | API key forwarding |
| `src/widgets/bridge.ts` | Widget ↔ host communication bridge | 35 lines. `callTool()`, `sendPrompt()`, `openLink()` |
| `src/widgets/shared.css` | Base styles for ALL widgets | 341 lines. Tokens, button/card/input classes, body flex centering |
| `src/widgets/*.ts` | Per-widget TypeScript (12 files) | Event handlers, DOM population, bridge calls |
| `widgets/*.html` | Per-widget source HTML (12 files) | `<style>` block + `<body>` markup. Vite entry points. |
| `dist/widgets/*.html` | Built widgets (single-file, inlined JS/CSS) | What the server actually serves. **Must run `npm run build` after changes.** |
| `tokens/figma-tokens-light.css` | 273 CSS custom properties (light mode) | `--sds-color-*`, `--sds-typo-*`, `--sds-size-*`, `--sds-comp-*` |
| `tokens/figma-tokens-dark.css` | Dark mode token overrides | Same property names, different values |

### Shared

| File | Purpose |
|------|---------|
| `shared/catalog.mjs` | Product catalog (8 products, 3 categories) |
| `agents.md` | Agent rules & memory (created in prior sessions) |
| `docs/session-log-2026-02-26.md` | THIS FILE |

---

## 3. The 12 Widgets — Current State

All 12 widgets are **fully built, tokenized, and using bridge.ts** as of end of this session.

| Widget | Source HTML | Source TS | Communication | Tokenized | Actions | Max Width |
|--------|-----------|----------|---------------|-----------|---------|-----------|
| product-grid | `widgets/product-grid.html` | `src/widgets/product-grid.ts` | bridge.ts | ✅ | Filter tabs, Add to Cart, View Details | 1360px (wrapper) |
| product-card | `widgets/product-card.html` | `src/widgets/product-card.ts` | bridge.ts | ✅ | Add to Cart, View Details | 320px |
| product-detail | `widgets/product-detail.html` | `src/widgets/product-detail.ts` | bridge.ts | ✅ | Add to Cart, Add to Wishlist, Size, Qty | 860px |
| cart-view | `widgets/cart-view.html` | `src/widgets/cart-view.ts` | bridge.ts | ✅ | Remove item, Checkout, Continue shopping | 480px |
| cart-summary | `widgets/cart-summary.html` | `src/widgets/cart-summary.ts` | bridge.ts | ✅ | Open Cart, Place Order | 360px |
| wishlist | `widgets/wishlist.html` | `src/widgets/wishlist.ts` | bridge.ts | ✅ | Move to Cart, Remove | 800px |
| search-bar | `widgets/search-bar.html` | `src/widgets/search-bar.ts` | bridge.ts | ✅ | Search, Select, Tag search | 600px |
| category-filter | `widgets/category-filter.html` | `src/widgets/category-filter.ts` | bridge.ts | ✅ | Filter by category | 280px |
| checkout-form | `widgets/checkout-form.html` | `src/widgets/checkout-form.ts` | bridge.ts | ✅ | Place Order (with validation) | 480px |
| order-confirmation | `widgets/order-confirmation.html` | `src/widgets/order-confirmation.ts` | bridge.ts | ✅ | Continue Shopping | 520px |
| price-tag | `widgets/price-tag.html` | `src/widgets/price-tag.ts` | none (read-only) | ✅ | None | 320px |
| review-rating | `widgets/review-rating.html` | `src/widgets/review-rating.ts` | none (read-only) | ✅ | None | 400px |

**Key**: price-tag and review-rating are display-only widgets. They don't import bridge.ts because they have no interactive buttons — they just read `__MCP_TOOL_RESULT__` and render.

---

## 4. Chronological Work Log

### Phase 1 — Foundation (Prior Sessions)
- Built MCP ecommerce playground with 12 widgets, MCP server, Next.js chat playground
- Synced Figma design system variables (361+ vars, 10 collections)
- Built 14 widget compositions and variable-bound widgets in Figma (Light + Dark)
- Rewrote all 12 widget HTML/CSS/TS files to match Figma compositions
- Built all 12 widgets successfully with zero build errors

### Phase 2 — UX Polish (Prior Sessions)
- Added quick action buttons to chat
- Rewrote system prompt for better tool selection
- Reduced streaming throttle for snappier feel
- Fixed skeleton visibility issues
- Added widget appear animations (`animate-widget-appear`)
- Fixed dual/layered widget rendering bugs
- Fixed flickering on re-render
- Reduced LLM verbosity after tool calls

### Phase 3 — ext-apps SDK Root Cause Discovery (Prior Sessions)
- **THE BIG DISCOVERY**: Widget buttons were silently failing
- Root cause: `@modelcontextprotocol/ext-apps` SDK sends JSON-RPC 2.0 messages
- But `UIResourceRenderer` (from `@mcp-ui/client`) expects UIActionResult format
- Solution: Created `bridge.ts` utility using direct `postMessage` with UIActionResult format
- Rewrote all 10 interactive widget TS files to use bridge.ts instead of ext-apps SDK
- See Section 5 for full details

### Phase 4 — Tokenization & Testing (Prior Sessions)
- Created `agents.md` comprehensive documentation
- Fixed skeleton/loading: added `get_categories` to WIDGET_TOOLS set, 400ms min skeleton display, shimmer-text CSS
- Added "View Details" button to product grid
- **Tokenized ALL 12 widget HTML files** — replaced every hardcoded hex color with `var(--sds-*)` tokens
- Used a Python script to batch-replace across all files (shell heredocs fail with TS template literals)
- Built all 12 widgets, verified zero hardcoded hex in built output
- Created Playwright visual diff test suite (13 tests, all passing)

### Phase 5 — THIS SESSION: Bug Fixes From User Screenshots

User reported (with 11 screenshots):
> "strange widget flickering, images missing, no parity with figma designs, widget not fitting into widget containers, state management, some places show adding... and loading... even after next widgets shows, widget alignments"

#### Comprehensive Audit
Ran a sub-agent to audit all 12 widget HTML and TS files. Found:

1. **6 widgets with fixed `width` instead of `max-width`**  
   - product-detail (860px), checkout-form (480px), order-confirmation (520px), wishlist (800px), review-rating (400px), price-tag (320px)
   - Cause: Overflow / not fitting into iframe container

2. **7 widget TS files with buttons that never reset**  
   - product-grid ("Adding…"), product-detail ("Adding…", "Saving…"), cart-view ("Loading…"), wishlist ("Moving…"), checkout-form ("Processing…"), product-card ("Adding…")
   - Cause: `callTool()` is fire-and-forget — no callback to reset button state

3. **Checkout form PIN error visible by default**  
   - `<span class="co-error" id="error-pin">Please enter a valid PIN code</span>` — text was hardcoded in HTML

4. **2 widgets still using ext-apps SDK**  
   - price-tag.ts and review-rating.ts — never migrated to bridge.ts (they're read-only, so buttons worked fine, but they still imported ext-apps unnecessarily)

5. **1 hardcoded hex in review-rating.ts**  
   - `#757575` in empty state: `<p style="color:#757575;">No reviews yet.</p>`

6. **Widget body not centered in iframe**  
   - shared.css body had no flexbox centering

7. **LLM still outputting verbose text after tool calls**  
   - System prompt said "max 15 words" but was not enforced strongly enough

#### All Fixes Applied (in order)

**Fix 1: Widget container overflow** (6 HTML files)
- Changed `.pd-card { width: 860px }` → `max-width: 860px; width: 100%` (product-detail.html)
- Changed `.co-card { width: 480px }` → `max-width: 480px; width: 100%` (checkout-form.html)
- Changed `.oc-card { width: 520px }` → `max-width: 520px; width: 100%` (order-confirmation.html)
- Changed `.wl-card { width: 800px }` → `max-width: 800px; width: 100%` (wishlist.html)
- Changed `.rv-card { width: 400px }` → `max-width: 400px; width: 100%` (review-rating.html)
- Changed `.pt-card { width: 320px }` → `max-width: 320px; width: 100%` (price-tag.html)
- Also fixed product-detail responsive layout:
  - `.pd-image`: `width: 430px; height: 442px` → `flex: 0 0 50%; max-width: 430px; min-height: 350px`
  - `.pd-add-cart`: `width: 266px` → `flex: 1`
  - `.pd-add-wishlist`: `width: 104px` → `min-width: 104px`
  - `.oc-continue-btn`: `width: 169px` → `min-width: 169px`

**Fix 2: Stuck button states** (6 TS files)
- Added `setTimeout` auto-reset after bridge.ts `callTool()`:
  - product-grid.ts: "Adding…" → "Add to Cart" after 2s
  - product-detail.ts: "Adding…" → "Add to Cart" after 2s; "Saving…" → "♡ Wishlist" after 2s
  - cart-view.ts: "Loading…" → "Proceed to Checkout" after 2s
  - wishlist.ts: "Moving…" → "Move to Cart" after 2s
  - product-card.ts: "Adding…" → "Add to Cart" after 2s
  - checkout-form.ts: "Processing…" → original button text after 3s
    - **Special case**: checkout-form.ts had `_injected` declared AFTER the event listener. Could not reference `_injected` in the listener. Solution: used `dataset.origText` on the button to store the original text, then reset via setTimeout.

**Fix 3: Checkout PIN error** (1 HTML file)
- Changed `<span class="co-error" id="error-pin">Please enter a valid PIN code</span>` to `<span class="co-error" id="error-pin"></span>`

**Fix 4: price-tag.ts ext-apps SDK removal**
- Removed `import { App } from "@modelcontextprotocol/ext-apps"`
- Removed `const app = new App(...)`, `app.ontoolresult` handler, `app.connect()`
- Kept only the `render()` function and `__MCP_TOOL_RESULT__` fallback
- No bridge.ts needed — it's a read-only display widget

**Fix 5: review-rating.ts ext-apps SDK removal + hex fix**
- Same ext-apps removal pattern as price-tag.ts
- Fixed `color:#757575` → `color:var(--sds-color-text-default-secondary)` in empty state

**Fix 6: Widget body centering** (shared.css)
- Added to body rule:
  ```css
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 100vh;
  padding: var(--sds-size-padding-lg);
  ```

**Fix 7: System prompt strengthening** (route.ts)
- Changed from "max 15 words" to "max 10 words"
- Added explicit prohibitions:
  - Do NOT mention product names, prices, descriptions, or image URLs
  - Do NOT use markdown: no tables, no bullet lists, no bold, no links
  - Do NOT paste or reference any URL (especially image URLs)
  - Do NOT list or enumerate items the widget already shows
  - Do NOT describe what the widget contains

**Fix 8: "MCP HTML Resource" label investigation**
- Investigated UIResourceRenderer source code in `@mcp-ui/client`
- Found: "MCP HTML Resource (Embedded Content)" is only the iframe `title` attribute (accessibility/screen-reader only)
- It's NOT a visible label on the page
- No fix needed

#### Post-Fix Verification
- Built all 12 widgets: `cd mcp-server && npm run build` — all successful, zero errors
- Restarted MCP server: all 12 widget HTML files loaded
- Verified: `grep -l "ext-apps\|@modelcontextprotocol" dist/widgets/*.html` → **CLEAN** (no ext-apps)
- Verified: `grep "#757575" src/widgets/review-rating.ts` → **CLEAN** (no hardcoded hex)
- Note: `#757575` still appears in built HTML because the **token CSS files** define `--sds-color-text-default-secondary: #757575` — this is expected and correct

---

## 5. ROOT CAUSE: Widget Button Failures (ext-apps SDK)

This was the single biggest issue in the project. Documenting in detail so it's never repeated.

### The Problem
Widget buttons (Add to Cart, Checkout, etc.) would click but nothing would happen. No tool call, no LLM response, nothing.

### The Investigation
1. Checked widget HTML — buttons had correct `data-action` attributes
2. Checked widget TS — event listeners were correctly delegated via `[data-action]`
3. Checked UIResourceRenderer — receiving messages correctly
4. **Found**: ext-apps SDK's `callServerTool()` sends **JSON-RPC 2.0** formatted messages
5. **But**: UIResourceRenderer expects **UIActionResult** format: `{type: "tool", payload: {toolName, params}}`
6. The messages were silently dropped because format didn't match

### The Solution
Created `bridge.ts` — a 35-line utility that sends postMessages in the correct UIActionResult format:
```typescript
export function callTool(toolName: string, params: Record<string, any> = {}): void {
  window.parent.postMessage(
    { type: "tool", payload: { toolName, params } },
    "*"
  );
}
```

### The Migration
- Rewrote all 10 interactive widget TS files to import from `./bridge` instead of `@modelcontextprotocol/ext-apps`
- Replaced `app.callServerTool(name, params)` with `callTool(name, params)`
- Removed `const app = new App(...)` and `app.connect()` boilerplate
- 2 read-only widgets (price-tag, review-rating) were migrated this session — they don't need bridge.ts at all, just `__MCP_TOOL_RESULT__` injection

### How tool-invocation.tsx handles it
In `handleUiAction` callback:
```typescript
if (actionResult.type === "tool") {
  const { toolName, params } = actionResult.payload;
  const toNatural = ACTION_TO_NATURAL_LANGUAGE[toolName];
  userMessageContent = toNatural
    ? toNatural(params || {})
    : `Please run ${toolName} with ${JSON.stringify(params)}`;
}
// Then: append({ role: "user", content: userMessageContent })
// LLM sees it as a user message and calls the tool
```

---

## 6. Bridge.ts — The Solution

**Location**: `mcp-server/src/widgets/bridge.ts` (35 lines)

Three exports:
- `callTool(toolName, params)` — Fire a tool call (LLM will execute and show new widget)
- `sendPrompt(prompt)` — Send natural language text through the chat
- `openLink(url)` — Open an external link in new tab

All three use `window.parent.postMessage()` with UIActionResult-compatible format.

**Usage in widget TS files** (example from product-grid.ts):
```typescript
import { callTool } from "./bridge";

// In event handler:
if (action === "add-to-cart") {
  callTool("add_to_cart", { productId });
}
```

---

## 7. Tool-Invocation Rendering Pipeline (THE critical file)

**Location**: `web-client/components/tool-invocation.tsx` (~711 lines)

This is the most complex and important file in the client. Understand it before making ANY widget-related change.

### Key Data Structures

```typescript
// tools/widgets set — determines which tools get widget rendering vs JSON collapse
const WIDGET_TOOLS = new Set([
  "get_products", "search_products", "filter_products",
  "get_product_detail", "get_price_info", "get_categories",
  "get_cart", "get_cart_summary", "add_to_cart", "remove_from_cart",
  "checkout", "place_order", "get_reviews",
  "get_wishlist", "add_to_wishlist", "remove_from_wishlist",
]);

// Min heights for iframe before auto-resize kicks in
const TOOL_MIN_HEIGHTS: Record<string, number> = { ... };

// Human-readable loading/done labels
const TOOL_STATUS_LABELS: Record<string, {loading, done}> = { ... };

// Maps widget button actions to natural language for LLM
const ACTION_TO_NATURAL_LANGUAGE: Record<string, (params) => string> = { ... };

// Contextual follow-up suggestion chips
const FOLLOW_UP_SUGGESTIONS: Record<string, string[]> = { ... };
```

### Rendering States (in priority order)

1. **Widget loaded** (`hasWidget = htmlResourceContents.length > 0`)
   - Renders: rounded card → iframe via UIResourceRenderer → debug toggle → follow-up chips
   - Animation: `animate-widget-appear`

2. **Loading** (`isRunning || isLoadingWidget || (widgetTool && result && !hasWidget && !fetchFailed)`)
   - Renders: spinner + shimmer-text label + per-tool WidgetSkeleton
   - Minimum skeleton display: 400ms (via `skeletonMinRef`)

3. **Non-widget tool** (fallback)
   - Renders: compact collapsible with JSON args/result

### Resource Fetch Flow

```
result arrives → check for _uiResources + _mcpServerUrl
  → setIsLoadingWidget(true)
  → fetch /api/mcp/resource?uri=...
  → inject <script>window.__MCP_TOOL_RESULT__=...</script>
  → inject theme attribute + theme change listener
  → normalize mimeType to 'text/html'
  → wait for 400ms minimum skeleton time
  → setHtmlResourceContents(fetched)
  → setIsLoadingWidget(false)
```

### Theme Broadcasting
```typescript
// On theme change, broadcast to all iframes
useEffect(() => {
  if (!hasWidget) return;
  document.querySelectorAll('iframe').forEach(iframe => {
    iframe.contentWindow?.postMessage({ type: 'theme-change', theme }, '*');
  });
}, [theme, hasWidget]);
```

### Anti-Flicker Measures
- `fetchedUrisRef` prevents duplicate fetches when result reference changes during streaming
- `abortRef` cancels in-flight fetches when new result arrives
- `skeletonMinRef` ensures skeleton shows for at least 400ms
- Widget renders with `animate-widget-appear` CSS animation (0.4s cubic-bezier)

---

## 8. Design Token System

### Token Sources
- **Light**: `mcp-server/tokens/figma-tokens-light.css` (273 custom properties)
- **Dark**: `mcp-server/tokens/figma-tokens-dark.css` (overrides)
- **Origin**: Synced from Figma MCPUI-DS-V1 design system

### Token Categories
- `--sds-color-background-*` — backgrounds (default, brand, danger, positive, warning, neutral)
- `--sds-color-text-*` — text colors
- `--sds-color-border-*` — border colors
- `--sds-typo-*` — typography (font-family, size, weight, line-height)
- `--sds-size-*` — spacing (padding, space, radius)
- `--sds-comp-*` — component-level tokens (card, button, input, badge, image)

### How Tokens Flow Into Widgets
1. `shared.css` imports both token files: `@import '../../tokens/figma-tokens-light.css'`
2. Vite build inlines shared.css into each widget HTML
3. `data-theme="dark"` on `<html>` activates dark mode overrides
4. Theme is injected at runtime via `document.documentElement.setAttribute('data-theme', theme)`

### Hex → Token Mapping (for future reference)
| Hex | Token |
|-----|-------|
| `#ffffff` | `var(--sds-color-background-default-default)` |
| `#f5f5f5` | `var(--sds-color-background-default-secondary)` |
| `#d9d9d9` | `var(--sds-color-border-default-default)` |
| `#1e1e1e` | `var(--sds-color-text-default-default)` |
| `#757575` | `var(--sds-color-text-default-secondary)` |
| `#b3b3b3` | `var(--sds-color-text-default-tertiary)` |
| `#2c2c2c` | `var(--sds-color-background-brand-default)` |
| `#900b09` / `#8f0b09` | `var(--sds-color-text-danger-default)` |
| `#eb221e` | `var(--sds-color-background-danger-default)` |
| `#02542d` | `var(--sds-color-text-positive-default)` |
| `#14ae5c` | `var(--sds-color-background-positive-default)` |
| `#e8b931` / `#f5a623` | `var(--sds-color-background-warning-default)` |
| `rgba(0,0,0,0.5)` | `var(--sds-color-background-utilities-overlay)` |
| `#444444` | `var(--sds-color-border-brand-secondary)` |

---

## 9. Issues Found & Fixed This Session

### Issue 1: Widgets Overflowing Container
- **Symptom**: Widgets extend beyond iframe width, horizontal scroll
- **Root Cause**: Fixed `width:` instead of `max-width:` in 6 widget HTML `<style>` blocks
- **Fix**: Changed to `max-width: Xpx; width: 100%` across product-detail, checkout-form, order-confirmation, wishlist, review-rating, price-tag
- **Extra**: Made product-detail image responsive with `flex: 0 0 50%`, buttons with `flex: 1` / `min-width`

### Issue 2: Buttons Stuck in Loading State
- **Symptom**: "Adding…", "Loading…", "Moving…", "Processing…" text stays forever
- **Root Cause**: `callTool()` via bridge.ts is fire-and-forget — no callback/promise to know when tool completes
- **Fix**: Added `setTimeout(() => { btn.textContent = "Original Text"; btn.disabled = false; }, 2000)` after each `callTool()`. 3s for checkout (longer processing).
- **Why setTimeout and not a proper callback**: The bridge sends a postMessage to the parent frame. The parent processes it asynchronously (LLM call). There's no round-trip mechanism to notify the widget when done. A new widget will render for the next tool result anyway, so the reset is just visual feedback.
- **Special case — checkout-form.ts**: The `_injected` variable (tool result data) is declared AFTER the event listener setup in the code. So the listener can't reference `_injected` directly. Solution: stored original button text in `payBtn.dataset.origText` during the `_injected` block, then read from `dataset.origText` in the setTimeout reset.

### Issue 3: Checkout PIN Error Visible on Load
- **Symptom**: "Please enter a valid PIN code" error message shows before user types anything
- **Root Cause**: Error text was hardcoded in HTML: `<span class="co-error" id="error-pin">Please enter a valid PIN code</span>`
- **Fix**: Cleared to `<span class="co-error" id="error-pin"></span>`. The validation JS sets the text on submit.

### Issue 4: ext-apps SDK Still in price-tag.ts and review-rating.ts
- **Symptom**: Unnecessary import, extra bundle size, potential runtime errors
- **Root Cause**: These 2 read-only widgets were missed during the initial bridge.ts migration
- **Fix**: Removed entire ext-apps import/usage. Kept only `render()` function + `__MCP_TOOL_RESULT__` fallback. No bridge.ts needed since they have no buttons.

### Issue 5: Hardcoded #757575 in review-rating.ts
- **Symptom**: Dark mode won't properly style the "No reviews yet" empty state
- **Root Cause**: Inline style `color:#757575` in dynamically generated HTML string
- **Fix**: Changed to `color:var(--sds-color-text-default-secondary)`

### Issue 6: Widgets Not Centered in iframe
- **Symptom**: Widgets stuck to left edge of iframe
- **Root Cause**: `shared.css` body had `margin: 0` but no flexbox centering
- **Fix**: Added `display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: var(--sds-size-padding-lg)`

### Issue 7: LLM Verbose Output After Tool Calls
- **Symptom**: LLM writes paragraphs with product descriptions, image URLs, markdown tables after showing a widget
- **Root Cause**: System prompt rule was "max 15 words" — not strict enough
- **Fix**: Tightened to "max 10 words" with explicit FORBIDDEN list: no URLs, no markdown, no data repetition

---

## 10. Issues Still Remaining / Known Bugs

These were identified but NOT fully fixed. PICK UP HERE in the next session.

### 10.1 Widget Flickering on Re-render
- **Symptom**: Occasionally, when scrolling up to old messages, widgets briefly flash/re-render
- **Possible causes**:
  - React re-renders the ToolInvocation component when message state changes
  - `htmlResourceContents` state resets on component unmount/remount
  - The `result` reference may change during streaming (though `fetchedUrisRef` should prevent re-fetch)
- **What to investigate**: Check if `ToolInvocation` is being unmounted and remounted when scrolling. Consider memoizing at the messages level or persisting htmlResourceContents outside the component.

### 10.2 Images Occasionally Missing
- **Symptom**: Product images show as broken/missing in some widgets
- **Possible causes**:
  - Unsplash rate limiting (unlikely with ?w=&h= params)
  - Image URL not being passed correctly in tool result data
  - Widget HTML `<img>` tag not getting the URL from `__MCP_TOOL_RESULT__` data
- **What to investigate**: Check if `product.image` field is correctly populated in the MCP server tool responses. Verify the widget TS correctly assigns `img.src = product.image`.

### 10.3 LLM Still Sometimes Verbose
- **Symptom**: Despite strengthened prompt, some models still output long text after tool calls
- **Root cause**: LLM behavior varies by model. The system prompt helps but isn't enforced by code.
- **Possible solutions**:
  - Post-process LLM output to truncate text after tool calls
  - Use `maxTokens` or `stop` sequences in streamText config
  - Add a client-side filter that hides text content after a tool invocation in the same message

### 10.4 Figma Parity Gaps
- **Symptom**: Some widgets don't perfectly match Figma compositions
- **What to check**:
  - Product grid card spacing, image aspect ratios
  - Button hover states
  - Input field focus ring styles
  - Dark mode contrast ratios
  - Font weight consistency (some text should be 600 but may be 400)

### 10.5 Product Grid Fixed-Width Cards
- **Detail**: `product-grid.html` has `.pg-product { width: 300px }` — this is fixed width but works in the flexbox context because the wrapper is `max-width: 1360px` with `flex-wrap: wrap`. May need attention if the container is smaller than 620px (2×300 + gap).

### 10.6 MCP Server Still Uses ext-apps in index.js
- **Detail**: `mcp-server/src/index.js` imports `registerAppResource` and `RESOURCE_MIME_TYPE` from `@modelcontextprotocol/ext-apps/server`. This is the SERVER-SIDE registration (not client-side communication) — it's fine. But worth noting in case the ext-apps package is deprecated.

### 10.7 agents.md Tokenization Column Outdated
- **Detail**: The table in agents.md Section 2 shows several widgets as "⚠️ Needs tokens" — this is outdated. ALL 12 widgets are now fully tokenized. Should update agents.md.

---

## 11. System Prompt Engineering

**Location**: `web-client/app/api/chat/route.ts` lines 26-93

### Current Rules (as of end of session)

1. **Product catalog** embedded directly in prompt (8 products, 3 categories with IDs and prices)
2. **Tool selection table** — maps user intent → exact tool to call
3. **Key decisions** — specific disambiguation rules (search vs filter vs browse vs price)
4. **Widget-triggered actions** — treat button clicks like typed messages, no confirmation needed
5. **Response format after tool calls** — MAX 10 words, explicit FORBIDDEN list
6. **Conversation style** — warm, concise, emoji, suggest next steps

### What Works
- Tool selection is generally correct
- Widget-triggered actions (button clicks) work well
- Follow-up suggestions guide the flow naturally

### What Doesn't Work Perfectly
- LLMs sometimes still output verbose responses after tool calls (model-dependent)
- Some models forget the product catalog and make up prices
- Occasionally picks wrong tool (e.g., get_product_detail when user said "show me shoes" → should be search_products)

---

## 12. Build & Deploy Process

### Build Command
```bash
cd mcp-server && npm run build
```

This:
1. `rm -rf dist/widgets && mkdir -p dist/widgets`
2. For each of 12 widgets: `cross-env INPUT=widgets/$WIDGET.html vite build`
3. Vite compiles TS, inlines CSS (shared.css + widget styles), inlines JS
4. `vite-plugin-singlefile` produces one self-contained HTML file per widget
5. Output: `dist/widgets/*.html` (~37-43 KB each)

### Restart Server
```bash
kill $(lsof -i :8787 -t) 2>/dev/null; cd mcp-server && node src/index.js &
```

Server reads all 12 dist HTML files at startup and caches them in memory. **Must restart after build.**

### Web Client
```bash
cd web-client && npm run dev
```
Turbopack auto-reloads on file changes (no build needed for client changes).

### Verification Commands
```bash
# Check no ext-apps references in built widgets
grep -l "ext-apps\|@modelcontextprotocol" mcp-server/dist/widgets/*.html || echo "CLEAN"

# Check no hardcoded hex in widget TS source
grep -rn "#[0-9a-fA-F]\{6\}" mcp-server/src/widgets/*.ts | grep -v "var(--" || echo "CLEAN"

# Check widget bundle sizes
ls -la mcp-server/dist/widgets/*.html
```

---

## 13. Skeleton / Loading UX

### How It Works
1. Tool call starts (`state="call"`) → Show spinner + shimmer-text label + tool-specific skeleton
2. Skeleton shows for **minimum 400ms** (prevents flash for fast responses)
3. Result arrives → Fetch widget HTML from MCP server → Keep showing skeleton
4. HTML fetched → Inject data + theme → Set iframe content
5. Widget renders → Fade in with `animate-widget-appear` (0.4s cubic-bezier)

### Per-Tool Skeletons
Each tool has a custom skeleton component in `WidgetSkeleton` that mirrors the real widget's layout:
- **Product grid**: header + filter pills + 2×2 card grid with shimmer
- **Product detail**: image (left half) + text blocks (right half)
- **Cart**: title + 2 item rows + total bar
- **Checkout/Order**: title + form fields + button
- **Reviews**: title + rating distribution bars + review cards
- **Price tag**: name + badge row + large price + description
- **Wishlist**: title + 3 horizontal cards
- **Categories**: header + filter pills + list items

### CSS Classes (in globals.css)
- `.skeleton-shimmer` — animated gradient shimmer (light gray → dark gray → light gray)
- `.skeleton-block` — static gray block
- `.skeleton-container` — outer wrapper with border and padding
- `.shimmer-text` — pulsing opacity animation for loading text labels
- `.animate-widget-appear` — slide-up + fade-in for widget entrance
- Dark mode variants for all skeleton classes

---

## 14. Common Pitfalls — DO NOT REPEAT

1. **ext-apps SDK in widgets**: NEVER import `@modelcontextprotocol/ext-apps` in widget TS files. Always use `bridge.ts` for interactive widgets. Read-only widgets don't need any imports.

2. **Shell heredocs for .ts files**: Fail silently due to template literals (`${...}`) and `!` being interpreted by the shell. Always use the `create_file` tool or Python scripts. Never use `cat << 'EOF' > file.ts`.

3. **`create_file` on existing files**: The `create_file` tool fails with "File already exists" error. Use `replace_string_in_file` or `multi_replace_string_in_file` instead.

4. **Hardcoded colors**: ANY hex color in widget CSS/TS breaks dark mode and diverges from Figma. Always use `var(--sds-*)` tokens. Exception: hex values inside token definition files themselves (figma-tokens-*.css).

5. **Body style overrides in widget HTML**: DON'T add `body { background: #f5f5f5 }` in widget HTML. `shared.css` sets the body styles globally. Widget HTML `<style>` should only contain widget-specific styles.

6. **Fixed width instead of max-width**: Widget cards must use `max-width: Xpx; width: 100%` to be responsive inside iframes. Never use bare `width: Xpx`.

7. **Button state not resetting**: `callTool()` is fire-and-forget. Always add `setTimeout` to reset button text/disabled state after 2-3 seconds.

8. **Build required after ANY change**: Changes to `.ts`, `.css`, or `.html` widget sources are NOT live. Must run `npm run build` in mcp-server and restart the server.

9. **checkout-form.ts _injected ordering**: The `_injected = (window as any).__MCP_TOOL_RESULT__` block is at the END of checkout-form.ts — event listeners defined before it can't reference `_injected` directly. Use `dataset.*` attributes as a workaround to pass data.

10. **UIResourceRenderer title attribute**: The `title="MCP HTML Resource (Embedded Content)"` is just an iframe accessibility attribute, NOT a visible label. Don't try to hide it with CSS.

11. **Token hex in built output**: Running `grep "#757575" dist/widgets/*.html` will find matches — these are from the **token CSS files** that define the variable values. This is expected. The important thing is that widget-specific CSS and JS use `var(--sds-*)` references.

12. **WIDGET_TOOLS set**: If you add a new tool to the MCP server that returns a widget, you MUST add its name to the `WIDGET_TOOLS` set in `tool-invocation.tsx`. Otherwise it renders as a JSON collapse instead of an iframe widget.

---

## 15. File-by-File Change Log (This Session)

### Modified Files

| File | What Changed |
|------|-------------|
| `mcp-server/widgets/product-detail.html` | `.pd-card` max-width, `.pd-image` flex responsive, `.pd-add-cart` flex, `.pd-add-wishlist` min-width |
| `mcp-server/widgets/checkout-form.html` | `.co-card` max-width, cleared PIN error default text |
| `mcp-server/widgets/order-confirmation.html` | `.oc-card` max-width, `.oc-continue-btn` min-width |
| `mcp-server/widgets/wishlist.html` | `.wl-card` max-width |
| `mcp-server/widgets/review-rating.html` | `.rv-card` max-width |
| `mcp-server/widgets/price-tag.html` | `.pt-card` max-width |
| `mcp-server/src/widgets/product-grid.ts` | Add-to-cart button setTimeout reset |
| `mcp-server/src/widgets/product-detail.ts` | Add-to-cart + wishlist button setTimeout reset |
| `mcp-server/src/widgets/cart-view.ts` | Checkout button setTimeout reset |
| `mcp-server/src/widgets/wishlist.ts` | Move-to-cart button setTimeout reset |
| `mcp-server/src/widgets/checkout-form.ts` | Place-order button setTimeout reset with dataset.origText pattern |
| `mcp-server/src/widgets/product-card.ts` | Add-to-cart button setTimeout reset |
| `mcp-server/src/widgets/price-tag.ts` | Full rewrite: removed ext-apps SDK, kept render + __MCP_TOOL_RESULT__ only |
| `mcp-server/src/widgets/review-rating.ts` | Full rewrite: removed ext-apps SDK + fixed #757575 → token |
| `mcp-server/src/widgets/shared.css` | Added body flex centering + padding |
| `web-client/app/api/chat/route.ts` | Strengthened post-tool-call response rules (max 10 words, explicit FORBIDDEN list) |

### NOT Modified (but relevant)

| File | Why Relevant |
|------|-------------|
| `web-client/components/tool-invocation.tsx` | Core rendering pipeline — no changes needed this session |
| `web-client/app/globals.css` | Skeleton/animation CSS — no changes needed |
| `mcp-server/src/index.js` | Server entry — no changes needed |
| `mcp-server/src/widgets/bridge.ts` | Bridge utility — no changes needed (working correctly) |
| `agents.md` | Needs update (tokenization column outdated) |

---

## 16. Figma Parity Rules

### Typography
- Font family: `Inter` set in `shared.css` body, inherited by all widgets
- Size tokens: 14px = `--sds-typo-body-size-small`, 16px = `--sds-typo-body-size-medium`, 20px = `--sds-typo-body-size-large`, 24px = `--sds-typo-heading-size-base`, 32px = `--sds-typo-heading-size-large`
- Weight: 400 = regular, 600 = semibold (buttons, headings), 700 = bold

### Spacing
- Padding: 4/8/16/24/32px via `--sds-size-padding-{xs,sm,lg,xl,xxl}`
- Gap/Space: 4/8/12/16/24px via `--sds-size-space-{100,200,300,400,600}`
- Border radius: 4/8/16/9999px via `--sds-size-radius-{100,200,400,full}`

### Component Tokens
- Card: bg, border, radius, padding, shadow, shadow-hover
- Button: radius, height-sm/md/lg, radius-full
- Input: height, radius, border, border-focus, bg
- Badge: radius, bg, text

### Dark Mode
- Activated via `data-theme="dark"` on `<html>` element
- Token CSS files handle the overrides (e.g., backgrounds flip from light to dark)
- Theme is injected into iframes at render time and updated via `theme-change` postMessage

---

## 17. What To Do Next

### Immediate Priority
1. **Test all 12 widgets end-to-end** — Open the app, try each flow:
   - Browse products → View details → Add to cart → View cart → Checkout → Place order
   - Search → Select result → Add to wishlist → View wishlist → Move to cart
   - Filter by category → Check price → Show reviews
   
2. **Fix any remaining flickering** — Monitor for widget re-renders on scroll. If found, investigate React component lifecycle and memoization.

3. **Fix any missing images** — Check if all 8 product images load correctly from Unsplash URLs.

4. **Update agents.md** — The tokenization status table is outdated. All widgets are now ✅ Full.

### Medium Priority
5. **Improve dark mode** — Test all 12 widgets in dark mode. Check contrast ratios, missed token usages.

6. **Performance audit** — Check widget bundle sizes. Target < 45KB each. Currently 37-43KB.

7. **Playwright tests** — Run existing 13 tests. Update snapshots if widget layout changed.

### Nice To Have
8. **Consider widget state persistence** — Currently widgets are stateless (rendered fresh each time). Could cache widget HTML in a message-level store so scrolling up doesn't cause re-fetch.

9. **Error boundaries** — Add React error boundary around ToolInvocation to prevent one widget crash from breaking the entire chat.

10. **Accessibility** — Add ARIA labels to widget buttons, test with screen reader.

---

## Appendix A: Product Catalog

| ID | Name | Category | Price (₹) | Unsplash Photo ID |
|----|------|----------|-----------|-------------------|
| 1 | Nike Air Max 90 | Footwear | 4,999 | photo-1542291026-7eec264c27ff |
| 2 | Classic Crew T-Shirt | Clothing | 1,999 | photo-1521572163474-6864f9cf17ab |
| 3 | Sport Flex Cap | Accessories | 999 | photo-1588850561407-ed78c334e67a |
| 4 | Urban Bomber Jacket | Clothing | 3,999 | photo-1551028719-00167b16eac5 |
| 5 | Ultra Boost Sneakers | Footwear | 5,999 | photo-1608231387042-66d1773070a5 |
| 6 | Chronograph Watch | Accessories | 2,999 | photo-1524592094714-0f0654e20314 |
| 7 | Trail Utility Backpack | Accessories | 1,999 | photo-1553062407-98eeb64c6a62 |
| 8 | Flex Training Shorts | Clothing | 1,499 | photo-1591195853828-11db59a44f6b |

Image URL pattern: `https://images.unsplash.com/{photo-id}?w={WIDTH}&h={HEIGHT}&fit=crop&q=80`

---

## Appendix B: MCP Server Tools (17 total)

| Tool Name | Parameters | Widget | Returns |
|-----------|-----------|--------|---------|
| get_products | none | product-grid | All 8 products |
| search_products | query: string | product-grid | Filtered products matching query |
| filter_products | category: string | product-grid | Products in category |
| get_product_detail | productId: number | product-detail | Single product details |
| get_price_info | productId: number | price-tag | Price breakdown |
| get_reviews | productId: number | review-rating | Reviews + average rating |
| get_categories | none | category-filter | 3 categories |
| add_to_cart | productId: number, quantity?: number | cart-view | Updated cart |
| remove_from_cart | productId: number | cart-view | Updated cart |
| get_cart | none | cart-view | Current cart |
| get_cart_summary | none | cart-summary | Cart total + item count |
| checkout | none | checkout-form | Empty checkout form |
| place_order | name, address, city, pin, phone | order-confirmation | Order confirmation |
| get_wishlist | none | wishlist | Current wishlist |
| add_to_wishlist | productId: number | wishlist | Updated wishlist |
| remove_from_wishlist | productId: number | wishlist | Updated wishlist |

Note: The 17th tool is a text-only tool or the count includes overlapping registrations. Check `src/index.js` for the exact list.

---

*Last updated: 2026-02-26 end of session*
*Build status: All 12 widgets built ✅ | MCP server running on :8787 ✅ | Web client on :3000 ✅*
