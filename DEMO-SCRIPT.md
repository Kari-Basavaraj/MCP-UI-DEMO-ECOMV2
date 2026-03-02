# MCP Ecommerce — Live Demo Script

> **Duration:** ~10 minutes  
> **Goal:** Show the fully automated Figma → Code → Deploy pipeline end-to-end  

---

## Pre-Demo Setup (do before audience arrives)

1. Open these 4 tabs:
   - **Figma:** https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ
   - **GitHub Actions:** https://github.com/Kari-Basavaraj/MCP-UI-DEMO-ECOMV2/actions
   - **Vercel Dashboard:** https://vercel.com/basavarajs-projects-3a19efa2/mcp-ui-demo-ecomv2
   - **Live App:** https://mcp-ui-demo-ecomv2.vercel.app
2. Open **VS Code** with the repo
3. Start the local dev server:
   ```bash
   cd mcp-server && node src/index.js &
   cd ../web-client && npm run dev &
   ```
4. Open http://localhost:3000 to confirm local app is running

---

## Act 1 — Show the Product (2 min)

### 1.1 — Live App
> *"This is an AI-powered ecommerce assistant built with MCP (Model Context Protocol)."*

- Open **https://mcp-ui-demo-ecomv2.vercel.app**
- Type: **"Show me products"** → Product Grid widget renders
- Click **"View Details"** on a product → Product Detail widget
- Click **"Add to Cart"** → Cart updates
- Type: **"Show my cart"** → Cart View widget
- Type: **"Checkout"** → Checkout Form widget

> *"Every UI you see is a self-contained widget served by the MCP server. There are 12 widgets total — product grid, cart, checkout, wishlist, search, and more."*

### 1.2 — Architecture (30 sec)
> *"The stack is: Next.js web client, MCP server on Express, and Vite-built single-file HTML widgets. The AI decides which tool/widget to show based on the user's message."*

---

## Act 2 — Show the Design System Connection (2 min)

### 2.1 — Figma Design Tokens
- Switch to **Figma** tab
- Open the **Variables** panel (click the grid icon in the right sidebar)
- Show the variable collections: colors, typography, spacing
- Point out a specific variable, e.g. `sds-color-background-brand-default` = `#2c2c2c`

> *"Every color, font size, spacing value, and radius in the code comes from these Figma variables. No hardcoded hex values."*

### 2.2 — Code Connect (Figma Dev Mode)
- Switch to **Dev Mode** in Figma (toggle at top-right)
- Click on any widget composition (e.g., Product Card)
- In the right panel, scroll to **Code Connect** section
- Show the code snippet that appears — it maps directly to the widget source

> *"We have 100 Code Connect bindings published — for every widget in Light, Dark, and Code-Match themes. Developers see the exact source file and usage in Dev Mode."*

---

## Act 3 — The Magic: Change Figma → Auto-Deploy (4 min)

> *"Now I'll change a design token in Figma, and you'll see it automatically flow to production code — no manual steps."*

### 3.1 — Make the Change in Figma
- In Figma, open **Variables** panel
- Find `sds-color-background-brand-default`
- **Change it** from `#2c2c2c` to `#0066FF` (a blue)
- **Save the file** (Cmd+S)

> *"I just changed the brand color from black to blue. Watch what happens."*

### 3.2 — Watch the Pipeline (Real-Time)
- Switch to the **GitHub Actions** tab
- **Within 5-10 seconds**, a new workflow run appears: **"Figma Webhook Sync"**
- Click in to show the live log

> *"Figma fired a webhook to our Vercel endpoint, which triggered a GitHub Action via repository_dispatch. The pipeline is now:"*

Show the steps running:
1. **Pull variables from Figma API** — fetches the latest variable JSON
2. **Normalize variables** — flattens Figma's nested structure  
3. **Generate CSS token files** — produces `figma-tokens-light.css` and `figma-tokens-dark.css`
4. **Sync tokens to web-client** — copies tokens for the Next.js app
5. **Rebuild all 12 widgets** — Vite builds single-file HTML bundles
6. **Verify pipeline** — validates everything is consistent
7. **Create PR** — opens a pull request with the diff
8. **Auto-merge** — squash-merges when CI passes

### 3.3 — Show the PR
- Once the workflow completes (~50 sec), click the PR link in the Actions log
- Show the **diff** — CSS token files changed, widgets rebuilt
- Show the PR body: automated description with trigger context

> *"A clean PR was created, reviewed by CI, and auto-merged. Zero manual steps."*

### 3.4 — Verify in Production
- Refresh the **Live App** tab (may take 1-2 min for Vercel to redeploy)
- The brand color is now blue — buttons, headers, all updated

> *"The design change is live in production. Designer saved in Figma, code auto-deployed."*

### 3.5 — Revert (Optional)
- Go back to Figma → change `sds-color-background-brand-default` back to `#2c2c2c`
- Save → same pipeline fires again → reverts to original

---

## Act 4 — Show Copilot + MCP Tooling (2 min)

### 4.1 — Ask Copilot to Use MCP Tools
- In VS Code, open **Copilot Chat**
- Type: **"Show me all products"**
- Copilot calls `get_products` MCP tool → Product Grid widget appears in chat

> *"Copilot is connected to the same MCP server. It can browse products, add to cart, search — all through tool calls."*

### 4.2 — More Tool Demos
Try these prompts:
- **"Search for watches"** → Search Bar + results
- **"Add the Chronograph Watch to my cart"** → `add_to_cart` tool call
- **"Show my cart"** → Cart View widget
- **"What categories are available?"** → Category Filter widget

> *"12 MCP tools, 12 widgets — the AI selects the right tool based on the conversation."*

---

## Act 5 — Under the Hood (1 min, optional)

### Show in VS Code:
- **Token pipeline:** `tokens/figma/variables.raw.json` → `mcp-server/tokens/figma-tokens-light.css`
- **Widget source:** `mcp-server/widgets/product-grid.html` (single-file with CSS custom properties)
- **Webhook route:** `web-client/app/api/figma-webhook/route.ts` (receives Figma events)
- **GitHub Action:** `.github/workflows/figma-webhook-sync.yml` (the full pipeline)

### Key Numbers:
| Metric | Count |
|--------|-------|
| MCP Tools | 12 |
| UI Widgets | 12 |
| Code Connect Bindings | 100 |
| CSS Design Tokens | ~200 variables |
| Automation Workflows | 6 |

---

## Closing Statement

> *"This is a fully automated Design-to-Code CI/CD pipeline:*  
> *1. Designers change tokens in Figma*  
> *2. Webhooks trigger GitHub Actions in seconds*  
> *3. Tokens sync, widgets rebuild, PR is created and auto-merged*  
> *4. Production deploys with zero manual intervention*  
> *5. Developers see Code Connect snippets in Figma Dev Mode*  
> *6. AI assistants interact with the same system through MCP tools*  
>  
> *Design and code stay in sync — automatically, continuously, end-to-end."*

---

## Quick Recovery Commands

If anything breaks during the demo:

```bash
# Restart local servers
cd mcp-server && node src/index.js &
cd ../web-client && npm run dev &

# Manual token sync (if webhook doesn't fire)
npm run figma:pull:variables && npm run figma:normalize:variables && npm run figma:generate:tokens && npm run tokens:sync && npm --prefix mcp-server run build

# Check webhook health
curl -s https://mcp-ui-demo-ecomv2.vercel.app/api/figma-webhook | python3 -m json.tool

# Manual webhook test
curl -s -X POST https://mcp-ui-demo-ecomv2.vercel.app/api/figma-webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type":"FILE_UPDATE","passcode":"mcpui-wh-2026-ds-test","file_key":"dbPjFeLfAFp8Sz9YGPs0CZ","file_name":"MCPUI-DS-V2","timestamp":"2026-03-02T00:00:00Z","triggered_by":{"id":"demo","handle":"demo"}}' | python3 -m json.tool
```
