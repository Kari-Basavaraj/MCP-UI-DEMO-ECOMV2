# MCP-UI E-commerce Playground

Interactive MCP-based e-commerce demo with a Next.js chat host and an Express MCP server that renders 12 tokenized HTML widgets.

## Architecture

- `web-client/`: Next.js App Router UI (`next dev --turbopack -p 3000`).
- `mcp-server/`: Express API + MCP bridge on port `8787`.
- `mcp-server/widgets/`: Widget source HTML.
- `mcp-server/src/widgets/`: Widget TS logic + shared CSS.
- `mcp-server/dist/widgets/`: Built single-file widget artifacts.
- `mcp-server/tokens/`: Canonical Figma token CSS.
- `shared/catalog.mjs`: Product catalog data.

## Tech Stack

- Frontend: Next.js 15, React 19, Tailwind v4, `@mcp-ui/client`.
- Server: Express 4, `@modelcontextprotocol/sdk`.
- Widget build: Vite + `vite-plugin-singlefile`.
- AI bridge: OpenRouter via `web-client/app/api/chat` (`OPENROUTER_API_KEY`).

## Quick Start

### Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm

### Install

```bash
npm run install:all
```

### Run (recommended)

```bash
npm run dev:clean
```

This starts:

- MCP/HTTP bridge at `http://localhost:8787`
- Next.js web client at `http://localhost:3000`

In a second terminal, verify both services:

```bash
npm run dev:health
```

### Run separately

Terminal 1:

```bash
cd mcp-server
npm run dev
```

Terminal 2:

```bash
cd web-client
npm run dev
```

## Build

Build widgets + server artifacts:

```bash
npm --prefix mcp-server run build
```

Build frontend:

```bash
npm --prefix web-client run build
```

## Environment

Set `web-client/.env.local` from `web-client/.env.example`:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

For the MCP server, set `mcp-server/.env` from `mcp-server/.env.example`:

```bash
API_PORT=8787
```

Optional (legacy route only: `POST /api/openai/chat` in `mcp-server/src/openaiProxy.js`):

```bash
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
```

Without `OPENROUTER_API_KEY`, `web-client` model listing and chat (`/api/models`, `/api/chat`) fail.

## UI Resource URIs

Widgets are served as MCP UI resources via `ui://ecommerce/*.html`, including:

- `ui://ecommerce/product-grid.html`
- `ui://ecommerce/product-detail.html`
- `ui://ecommerce/cart-view.html`
- `ui://ecommerce/checkout-form.html`
- `ui://ecommerce/order-confirmation.html`

## Token Governance

Canonical token source is `mcp-server/tokens`.
Web-client token files live in `web-client/tokens` and should be kept aligned with the canonical source.

## Figma → Production Pipeline (CI/CD)

Design token changes in Figma are automatically synced to production. No manual steps required.

### How it works

```
Figma Publish → LIBRARY_PUBLISH webhook → Vercel endpoint → GitHub Actions → Production
```

1. Designer changes a variable in Figma (e.g. brand color)
2. Designer clicks **Publish** in the Figma Library Manager
3. Figma sends a `LIBRARY_PUBLISH` webhook to the Vercel endpoint
4. Endpoint deduplicates (30s window) and dispatches to GitHub Actions
5. Workflow runs: pull variables → normalize → generate CSS → sync tokens → rebuild widgets → commit & push
6. Vercel auto-deploys from the push

**Time to production:** ~2 minutes from Figma Publish.

### Key files

| File | Purpose |
|------|---------|
| `web-client/app/api/figma-webhook/route.ts` | Webhook receiver with dedup |
| `.github/workflows/figma-webhook-sync.yml` | Full sync workflow |
| `scripts/figma-pull-variables.mjs` | Pull variables from Figma API |
| `scripts/figma-normalize-variables.mjs` | Normalize the variable payload |
| `scripts/figma-generate-tokens.mjs` | Generate CSS token files |
| `scripts/sync-tokens.mjs` | Copy tokens to web-client |
| `mcp-server/tokens/figma-tokens-light.css` | Generated light theme tokens |

### Required secrets (GitHub Actions)

- `FIGMA_ACCESS_TOKEN` — Figma API personal access token
- `FIGMA_FILE_KEY` — Figma file key (e.g. `dbPjFeLfAFp8Sz9YGPs0CZ`)
- `GH_PAT_TOKEN` — GitHub PAT with `repo` scope (needed to trigger Vercel from push)
- `VERCEL_DEPLOY_HOOK` — Vercel deploy hook URL

### Required env vars (Vercel)

- `GITHUB_DISPATCH_TOKEN` — GitHub PAT for dispatching
- `GITHUB_REPO` — e.g. `Kari-Basavaraj/MCP-UI-DEMO-ECOMV2`
- `FIGMA_FILE_KEY` — Same as above
- `FIGMA_WEBHOOK_SECRET` — Set to empty string (passcode check skipped)

## Testing

Server test suite:

```bash
npm --prefix mcp-server test
```

Visual parity suite:

```bash
npx playwright test tests/visual-diff.spec.ts
```

## Documentation

- [docs/decision-log.md](docs/decision-log.md)
- [docs/code reports/codebase-analysis-report.md](docs/code%20reports/codebase-analysis-report.md)
- [docs/code reports/cleanup-hardening-plan.md](docs/code%20reports/cleanup-hardening-plan.md)
- [docs/code reports/figma-cicd-rollout-log.md](docs/code%20reports/figma-cicd-rollout-log.md)
