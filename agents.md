# MCP Ecommerce Playground — Agent Rules & Memory

> This file helps AI agents remember critical project details, rules, and constraints.
> Update this file whenever a significant decision or fix is made.

---

## 1. Project Architecture

### Stack
| Layer | Tech | Path |
|-------|------|------|
| **Web Client** | Next.js + Turbopack, Tailwind v4, @ai-sdk/react | `web-client/` |
| **MCP Server** | Express + @modelcontextprotocol/sdk, port 8787 | `mcp-server/` |
| **Widget Build** | Vite + vite-plugin-singlefile → self-contained HTML | `mcp-server/widgets/` (source HTML), `mcp-server/src/widgets/` (TS + CSS) |
| **Built Widgets** | Single-file HTML with all JS/CSS inlined | `mcp-server/dist/widgets/` |
| **Design Tokens** | CSS custom properties from Figma MCPUI-DS-V1 | `mcp-server/tokens/figma-tokens-{light,dark}.css` |

### Widget Communication Protocol
- Widgets use `bridge.ts` (NOT ext-apps SDK) to talk to the host
- `callTool(toolName, params)` → `window.parent.postMessage({type:"tool", payload:{toolName, params}}, "*")`
- Host `UIResourceRenderer` catches these → `handleUiAction` → `ACTION_TO_NATURAL_LANGUAGE` → user message → LLM acts
- **NEVER** use `@modelcontextprotocol/ext-apps` `callServerTool()` — it sends JSON-RPC which the host doesn't understand

### Build Command
```bash
cd mcp-server && npm run build
```
This builds all 12 widgets. After building, restart the MCP server:
```bash
kill $(lsof -i :8787 -t) 2>/dev/null; cd mcp-server && node src/index.js &
```

---

## 2. The 12 Widgets

| Widget | Source HTML | Source TS | Has Actions | Tokenized |
|--------|-----------|----------|-------------|-----------|
| product-grid | ✅ | ✅ bridge | Filter tabs, Add to Cart, View Details | ✅ Full |
| product-card | ✅ | ✅ bridge | Add to Cart, View Details | ✅ Full |
| product-detail | ✅ | ✅ bridge | Add to Cart, Add to Wishlist, Size, Qty | ✅ Full |
| cart-view | ✅ | ✅ bridge | Remove item, Checkout, Continue shopping | ✅ Full |
| cart-summary | ✅ | ✅ bridge | Open Cart, Place Order | ✅ Full |
| wishlist | ✅ | ✅ bridge | Move to Cart, Remove | ✅ Full |
| search-bar | ✅ | ✅ bridge | Search, Select, Tag search | ✅ Full |
| category-filter | ✅ | ✅ bridge | Filter by category | ✅ Full |
| checkout-form | ✅ | ✅ bridge | Place Order (with validation) | ✅ Full |
| order-confirmation | ✅ | ✅ bridge | Continue Shopping | ✅ Full |
| price-tag | ✅ | ✅ render only | None (read-only) | ✅ Full |
| review-rating | ✅ | ✅ render only | None (read-only) | ✅ Full |

---

## 3. Figma Parity Rules — MANDATORY

### Token Usage
- **EVERY** color in widget CSS must use `var(--sds-*)` tokens from `figma-tokens-light.css`
- **NO** hardcoded hex colors allowed (except in data like image URLs)
- Mapping: `#ffffff` → `var(--sds-color-background-default-default)`, `#f5f5f5` → `var(--sds-color-background-default-secondary)`, `#d9d9d9` → `var(--sds-color-border-default-default)`, etc.

### Typography
- Font family: `Inter` via `var(--sds-typo-body-font-family)` or `inherit` (shared.css sets it)
- Size tokens: 14px=`var(--sds-typo-body-size-small)`, 16px=`var(--sds-typo-body-size-medium)`, 20px=`var(--sds-typo-body-size-large)`, 24px=`var(--sds-typo-heading-size-base)`, 32px=`var(--sds-typo-heading-size-large)`
- Weight: 400=regular, 600=strong/semibold, 700=bold (headings)

### Spacing & Sizing
- Padding: 4px=`var(--sds-size-padding-xs)`, 8px=`var(--sds-size-padding-sm)`, 16px=`var(--sds-size-padding-lg)`, 24px=`var(--sds-size-padding-xl)`, 32px=`var(--sds-size-padding-xxl)`
- Gap/Space: 4px=`var(--sds-size-space-100)`, 8px=`var(--sds-size-space-200)`, 12px=`var(--sds-size-space-300)`, 16px=`var(--sds-size-space-400)`, 24px=`var(--sds-size-space-600)`
- Border radius: 4px=`var(--sds-size-radius-100)`, 8px=`var(--sds-size-radius-200)`, 16px=`var(--sds-size-radius-400)`, 9999px=`var(--sds-size-radius-full)`

### Component Tokens
- Card: bg=`var(--sds-comp-card-bg)`, border=`var(--sds-comp-card-border)`, radius=`var(--sds-comp-card-radius)`, padding=`var(--sds-comp-card-padding)`, shadow=`var(--sds-comp-card-shadow)`
- Button: radius=`var(--sds-comp-button-radius)`, heights: sm=36px, md=44px, lg=48px
- Input: height=48px, radius=8px, border=`var(--sds-comp-input-border)`
- Badge: radius=9999px

### Hardcoded Color → Token Mapping
| Hex | Token |
|-----|-------|
| `#ffffff` | `var(--sds-color-background-default-default)` |
| `#f5f5f5` | `var(--sds-color-background-default-secondary)` |
| `#d9d9d9` | `var(--sds-color-border-default-default)` |
| `#1e1e1e` | `var(--sds-color-text-default-default)` |
| `#757575` | `var(--sds-color-text-default-secondary)` |
| `#b3b3b3` | `var(--sds-color-text-default-tertiary)` |
| `#2c2c2c` | `var(--sds-color-background-brand-default)` |
| `#900b09` | `var(--sds-color-text-danger-default)` / `--sds-color-border-danger-default` |
| `#8f0b09` | `var(--sds-color-text-danger-default)` |
| `#eb221e` | `var(--sds-color-background-danger-default)` |
| `#02542d` | `var(--sds-color-text-positive-default)` |
| `#14ae5c` | `var(--sds-color-background-positive-default)` |
| `#ebffee` | `var(--sds-color-background-positive-tertiary)` |
| `#fee9e7` | `var(--sds-color-background-danger-tertiary)` |
| `#e8b931` / `#f5a623` | `var(--sds-color-background-warning-default)` |
| `#e5e5e5` | `var(--sds-color-background-default-secondary-hover)` |
| `rgba(0,0,0,0.5)` | `var(--sds-color-background-utilities-overlay)` |
| `#444444` | `var(--sds-color-border-brand-secondary)` |

---

## 4. Widget Flow Map — Entry & Exit Points

### Complete User Journey
```
START → get_products (Product Grid)
  ├── Filter tab click → LOCAL filter (same widget, no server call)
  ├── Card click → get_product_detail (Product Detail)
  ├── "Add to Cart" → add_to_cart → Cart confirmation
  └── Follow-up chips: "Filter by Footwear", "Search for watches"

get_product_detail (Product Detail)
  ├── "Add to Cart" → add_to_cart
  ├── "Add to Wishlist" → add_to_wishlist
  └── Follow-up chips: "Show reviews", "Check price"

add_to_cart → (Cart View mini or confirmation)
  └── Follow-up chips: "View my cart", "Continue shopping", "Checkout"

get_cart (Cart View)
  ├── Remove item → remove_from_cart
  ├── "Checkout" → checkout (Checkout Form)
  └── "Continue Shopping" → get_products

checkout (Checkout Form)
  └── "Place Order" → place_order (Order Confirmation)

place_order (Order Confirmation)
  └── "Continue Shopping" → get_products

search_products (Product Grid with results)
  ├── Select product → get_product_detail
  └── Follow-up chips: "Browse all", "View cart"

get_wishlist (Wishlist)
  ├── "Move to Cart" → add_to_cart + remove_from_wishlist
  ├── Remove → remove_from_wishlist
  └── Follow-up chips: "Browse more", "View cart"

get_price_info (Price Tag) — standalone pricing widget
get_reviews (Review Rating) — standalone review widget
get_categories (Category Filter) → filter click → filter_products/get_products
get_cart_summary (Cart Summary) → "Open Cart" / "Place Order"
```

### Every Widget Must Be Reachable
- **Product Grid**: Entry point (default), also from "Continue Shopping", "Browse products"
- **Product Card**: Shown inline in search results (search-bar widget)
- **Product Detail**: From product grid card click, search result select, follow-up chip
- **Cart View**: From "View my cart", follow-up chips, cart summary "Open Cart"
- **Cart Summary**: From "Cart total", "Order summary" prompts
- **Wishlist**: From "My wishlist", follow-up chips
- **Search Bar**: From "Search for..." prompts (shows input + trending + results)
- **Category Filter**: From "Show categories" prompt
- **Checkout Form**: From cart "Checkout" button, follow-up chips
- **Order Confirmation**: From checkout "Place Order" button
- **Price Tag**: From "Check price" for a specific product
- **Review Rating**: From "Show reviews" for a specific product

---

## 5. Loading UX Rules

### Skeleton → Widget Transition
1. Tool call starts (`state="call"`) → Show spinner + shimmer text + tool-specific skeleton
2. Result arrives → Fetch widget HTML from server → Keep showing skeleton (`isLoadingWidget=true`)
3. HTML fetched → Inject `__MCP_TOOL_RESULT__` + theme → Set iframe content
4. Widget renders → Fade in with `animate-widget-appear`

### Skeleton Design Matches Widget Layout
Each tool has a custom skeleton in `WidgetSkeleton` that mirrors the real widget's layout:
- Product grid skeleton = header + filter pills + 2×2 card grid
- Product detail skeleton = image left + text right
- Cart skeleton = title + item rows + total
- Checkout skeleton = title + form fields + button
- Review skeleton = title + rating bars + review cards

---

## 6. Product Catalog (8 Products)

| ID | Name | Category | Price (₹) | Image |
|----|------|----------|-----------|-------|
| 1 | Nike Air Max 90 | Footwear | 4,999 | unsplash photo-1542291026-7eec264c27ff |
| 2 | Classic Crew T-Shirt | Clothing | 1,999 | unsplash photo-1521572163474-6864f9cf17ab |
| 3 | Sport Flex Cap | Accessories | 999 | unsplash photo-1588850561407-ed78c334e67a |
| 4 | Urban Bomber Jacket | Clothing | 3,999 | unsplash photo-1551028719-00167b16eac5 |
| 5 | Ultra Boost Sneakers | Footwear | 5,999 | unsplash photo-1608231387042-66d1773070a5 |
| 6 | Chronograph Watch | Accessories | 2,999 | unsplash photo-1524592094714-0f0654e20314 |
| 7 | Trail Utility Backpack | Accessories | 1,999 | unsplash photo-1553062407-98eeb64c6a62 |
| 8 | Flex Training Shorts | Clothing | 1,499 | unsplash photo-1591195853828-11db59a44f6b |

### Image URL Pattern
```
https://images.unsplash.com/photo-{ID}?w={WIDTH}&h={HEIGHT}&fit=crop&q=80
```

---

## 7. Testing Checklist

### Visual Parity (Figma vs Code)
- [ ] Every widget uses ONLY CSS custom property tokens
- [ ] No hardcoded hex colors in any widget HTML `<style>` block
- [ ] Font sizes match Figma spec (14/16/20/24/32px via tokens)
- [ ] Border radius matches (4/8/16/9999px via tokens)
- [ ] Card padding is 24px (`var(--sds-size-padding-xl)`)
- [ ] Button heights: sm=36px, md=44px, lg=48px
- [ ] Images use correct Unsplash URLs from catalog
- [ ] Dark mode works via `data-theme="dark"` and token overrides

### Functional Testing
- [ ] Product grid filter tabs work (All/Footwear/Clothing/Accessories)
- [ ] "Add to Cart" in grid → triggers add_to_cart tool call
- [ ] "View Details" in grid → triggers get_product_detail
- [ ] Product detail size/qty selectors work locally
- [ ] Product detail "Add to Cart" → triggers tool call
- [ ] Cart view "Remove" → triggers remove_from_cart
- [ ] Cart view "Checkout" → triggers checkout
- [ ] Checkout form validation works (focus first error)
- [ ] Checkout "Place Order" → triggers place_order
- [ ] Order confirmation "Continue Shopping" → triggers get_products
- [ ] Wishlist "Move to Cart" → triggers add_to_cart
- [ ] Search bar input + search button → triggers search_products
- [ ] Category filter click → triggers filter_products/get_products
- [ ] Follow-up chips appear and are clickable
- [ ] Skeleton loading appears for every tool call

### Performance
- [ ] Widget bundles are <50KB each (except price-tag/review-rating with ext-apps legacy)
- [ ] No console errors in widget iframes
- [ ] Theme changes broadcast to all iframes on toggle

---

## 8. Common Pitfalls — DO NOT REPEAT

1. **ext-apps SDK**: NEVER import from `@modelcontextprotocol/ext-apps`. Always use `bridge.ts`.
2. **Shell heredocs for .ts files**: Fail due to template literals and `!`. Use Python scripts or the `create_file` tool.
3. **Hardcoded colors**: Break dark mode and diverge from Figma. Always use tokens.
4. **Body style overrides**: 6 widgets override `body` with hardcoded `#f5f5f5`. Remove these — shared.css handles it.
5. **Widget action buttons silent fail**: If clicking doesn't work, check: (a) `data-action` attribute on the button, (b) event delegation with `[data-action]` selector, (c) bridge.ts is imported.
6. **Build required**: After ANY change to `.ts` or `.html` widget sources, run `npm run build` in mcp-server.
7. **Do not trust ad-hoc restarts**: before reporting a localhost fix, run `npm run dev:clean` then `npm run dev:health` and verify `http://localhost:3000/` has no `Internal Server Error` text.
7. **No raw Internal Server Error responses**: For `web-client/app/api/*` routes, never rely on uncaught throws. Always wrap handlers in `try/catch`, return structured JSON with a `requestId`, and preserve response shape on failure so the UI can degrade gracefully with actionable errors.

---

*Last updated: 2026-02-26*

---

## 9. Parity Automation (Added 2026-02-26)

### New Scripts
- `scripts/capture-widgets-actual.mjs`
  - Captures current built widget renders into `screenshots/actual/`
  - Uses fixed widget dimensions and deterministic mock payloads
  - Uses same visual-capture strategy as `capture-widgets.mjs` (content-height clipping)

- `scripts/compare-widget-parity.mjs`
  - Compares `screenshots/*.png` (reference) vs `screenshots/actual/*.png` (code)
  - Uses `pixelmatch` + `pngjs`
  - Writes:
    - `docs/widget-parity-report.json`
    - `docs/widget-parity-report.md`
    - `screenshots/diff/*.png`

### Commands
```bash
cd /Users/basavarajkm/code/MCP-UI-DEMO-ECOMV2
npm run parity:run
```

### Figma Visual Diff Board
- Created section in `Widget Compositions` page:
  - **Section name**: `Visual Diff — Auto Parity`
  - **Section id**: `3046:24224`
- Each row includes:
  - Figma component clone
  - Code render artifact pointer (`screenshots/actual/<widget>.png`)
  - Diff artifact pointer (`screenshots/diff/<widget>.png`)
  - Code source file references (`mcp-server/widgets/*.html`, `mcp-server/src/widgets/*.ts`)
  - Parity score from `docs/widget-parity-report.md`

### Dependency Additions
- Root `package.json` devDependencies:
  - `pixelmatch`
  - `pngjs`

### Current Focus Widgets (Lowest parity after this run)
1. `product-grid`
2. `category-filter`
3. `product-card`
4. `wishlist`
5. `product-detail`

These should be addressed one-by-one using the parity report + diff images as the acceptance loop.

---

## 10. Agentation FeedbackOps Protocol (Added 2026-02-28)

### Objective
Convert visual annotations into a durable, auditable execution pipeline:
1. capture comment
2. track status
3. link work/commit
4. close with evidence

### Runtime Contract
1. Webhook receiver: `POST /api/agentation/webhook`
2. Tracker files:
- `docs/code reports/agentation-comments-tracker.json`
- `docs/code reports/agentation-comments-tracker.md`
3. Default webhook in toolbar (dev):
- `http://localhost:8787/api/agentation/webhook`

### Status Contract
1. `pending` = new annotation, not yet accepted
2. `acknowledged` = accepted for implementation (auto on `submit`)
3. `resolved` = code change complete with summary/commit context
4. `dismissed` = intentionally not implementing (with reason)

### Linear Sync Contract (Optional, recommended)
1. Env-gated via:
- `AGENTATION_LINEAR_ENABLED`
- `LINEAR_API_KEY`
- `AGENTATION_LINEAR_TEAM_ID`
2. Status mapping:
- pending -> unstarted
- acknowledged -> started
- resolved -> completed
- dismissed -> canceled (fallback completed)
3. Sync endpoints:
- `POST /api/agentation/sync-linear`
- `GET /api/agentation/overview`

### Non-negotiable Rule
For any annotation being closed as `resolved`, include:
1. resolution summary
2. commit SHA
3. optional commit URL

### Linear Scope Rule
1. All Agentation-driven issue sync must be project-scoped to this repository.
2. Do not allow team-level or unscoped issue creation in strict mode.
3. If project routing is missing, sync must skip with an explicit reason and keep tracker as source of truth.

---

## 10. PM Skill Orchestration Policy (Added 2026-02-28)

### Objective
Use both Dean Peters repositories without duplicating frameworks or causing routing drift.

### Canonical-First Rule (MANDATORY)
1. Use `Product-Manager-Skills` as the default skill source for PM work.
2. Use prompt-derived skills only where no strong canonical equivalent exists.
3. For broad or ambiguous PM requests, start with the master router skill:
   - `/Users/basavarajkm/.codex/skills/pm-master-orchestrator/SKILL.md`

### Source-of-Truth Mapping
- Full mapping and decisions live in:
  - `docs/pm-prompts-to-skills-matrix-2026-02-28.md`
- Decision outcomes from that matrix:
  - `Link to canonical skills`: 20 assets
  - `Convert now`: 6 source prompt files -> 4 new skills
  - `Keep as reference`: 9 assets

### Prompt-Derived Skills Added
- `/Users/basavarajkm/.codex/skills/pm-prompt-builder/SKILL.md`
- `/Users/basavarajkm/.codex/skills/legacy-spec-to-prd/SKILL.md`
- `/Users/basavarajkm/.codex/skills/strategic-scrum-kickoff/SKILL.md`
- `/Users/basavarajkm/.codex/skills/futuristic-product-faq/SKILL.md`

### Default PM Execution Chain
For "help me figure this out" PM asks, run:
1. `problem-framing-canvas`
2. `prioritization-advisor`
3. `prd-development`
4. `user-story`

### Anti-Drift Rule
- If a prompt-derived skill starts overlapping with an existing canonical skill, deprecate the prompt-derived path and route back to the canonical skill.
- Do not maintain two active skills for the same PM framework unless there is a clear, documented specialization boundary.

### Quick Invocation Pattern
Use this structure in Codex/agents:
```text
Using /Users/basavarajkm/.codex/skills/pm-master-orchestrator/SKILL.md:
1) Ask up to 3 clarifying questions only if routing is unclear.
2) Choose canonical skills first.
3) Execute phase-by-phase and show risks/assumptions.
```

---

## 11. Agentation Standard (Added 2026-02-28)

### Policy (MANDATORY)
- Use [Agentation](https://agentation.dev/) as the default visual feedback system for this repo and all new projects.
- Install and mount Agentation in the frontend root so design/code feedback can be captured with exact element selectors and context.
- Keep Agentation active in development by default; allow opt-out only via explicit env flag.

### Required Setup Pattern
1. Install package in the app workspace:
   - `npm install agentation`
2. Mount the client component at app root (dev-only guard).
3. Register Agentation MCP for local tool workflows:
   - `.mcp.json` server command: `npx -y agentation-mcp server`

### Optional Remote Sync
- Use `endpoint` and `webhookUrl` props when team sync or automation ingestion is required.
- Reference docs:
  - Install: `https://agentation.dev/install`
  - Schema: `https://agentation.dev/schema`
  - Features: `https://agentation.dev/features`
  - MCP: `https://agentation.dev/mcp`
  - API: `https://agentation.dev/api`
  - Webhooks: `https://agentation.dev/webhooks`
  - Intro post: `https://agentation.dev/blog/introducing-agentation-2`
  - Source: `https://github.com/benjitaylor/agentation`

---

## 12. Agentation Skill Routing (Added 2026-02-28)

### Canonical Skill File
- Use `~/.agents/skills/agentation/SKILL.md` as the primary workflow guide when handling Agentation requests.
- Official upstream setup reference is available at `~/.agents/skills/agentation-official/SKILL.md`.
- Official upstream self-driving reference is available at `~/.agents/skills/agentation-self-driving/SKILL.md`.

### Trigger Phrases (MANDATORY)
- Activate this skill when the user mentions:
  - `agentation` / `agentative`
  - `annotate UI` / `visual feedback`
  - `watch mode` / `hands free mode`
  - `critic mode` / `critique mode`
  - `self-driving mode` / `auto-fix UI from annotations`

### Mode Routing
1. **Manual Mode (default)**: read pending annotations, implement fixes, resolve via MCP.
2. **Watch / Hands Free Mode**: loop on incoming annotations and process continuously.
3. **Critic Mode**: generate design critique annotations on the live page.
4. **Self-Driving Mode**: critique + implement + resolve in one loop.

### Repo-Specific Overrides for Codex
- Use project MCP config `.mcp.json` (not `.cursor/mcp.json`) for Agentation server registration.
- For browser-driven critique/self-driving flows, use available Codex browser tooling (Playwright) when `agent-browser` is unavailable.
- Always confirm selected mode before execution; if unclear, default to **Manual**.
