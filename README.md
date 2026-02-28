# MCP E-Commerce Application

A full-stack e-commerce application built with MCP-UI, React, TypeScript, and integrated with OpenAI for AI-powered shopping assistance.

## Architecture

```text
/mcp-server       - MCP Server with tools for product search, filter, and cart
/web-client       - React application with @mcp-ui/client integration
```

## Features

1. **Product Search** - Search products by name or keyword
2. **Category Filter** - Filter by Footwear, Clothing, or Accessories
3. **Add to Cart** - Add products to shopping cart
4. **Remove from Cart** - Remove products from cart
5. **Cart Summary** - View cart total and items
6. **AI Assistant** - Chat with OpenAI-powered AI to help with shopping

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **MCP**: @modelcontextprotocol/sdk, @mcp-ui/client
- **AI**: OpenAI API
- **Design**: Custom CSS with modern e-commerce styling

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. **Install root dependencies:**

   ```bash
   npm install
    ```

2. **Install server dependencies:**

   ```bash
   cd mcp-server
   npm install
   cd ..
    ```

3. **Install client dependencies:**

   ```bash
   cd web-client
   npm install
   cd ..
    ```

### Running the Application

#### Option 1: Run both servers (recommended)

```bash
npm run dev
```

This will start:

- MCP Server HTTP bridge on <http://localhost:8787>
- Web Client at <http://localhost:3000>
- OpenAI proxy at <http://localhost:8787>

#### Option 2: Run separately

Terminal 1 - MCP Server:

```bash
cd mcp-server
npm run dev
```

Terminal 2 - Web Client:

```bash
cd web-client
npm run dev
```

### OpenAI API Setup

To use the AI assistant with OpenAI:

1. Get an API key from <https://platform.openai.com/>.
2. Create `mcp-server/.env` from [mcp-server/.env.example](mcp-server/.env.example) and set:

   ```bash
    OPENAI_API_KEY=your-actual-api-key
    OPENAI_MODEL=gpt-4o-mini
   API_PORT=8787
    ```

3. (Optional) Create `web-client/.env` from [web-client/.env.example](web-client/.env.example) if you need to override the proxy base URL.

The application still works in demo mode without an API key, using fallback responses.

### Secure Run Mode (recommended for shared/staging environments)

The MCP HTTP bridge now supports env-gated guardrails for mutable tools.

Add these to `mcp-server/.env` when running outside local development:

```bash
MCP_SECURITY_MODE=strict
MCP_ALLOWED_ORIGINS=https://your-app.example.com
MCP_BRIDGE_AUTH_ENABLED=true
MCP_BRIDGE_AUTH_TOKEN=strong-random-token
MCP_MUTATING_TOOL_ALLOWLIST=add_to_cart,remove_from_cart,checkout,place_order,add_to_wishlist,remove_from_wishlist
MCP_MAX_ARGUMENT_BYTES=8192
MCP_RATE_LIMIT_ENABLED=true
MCP_RATE_LIMIT_WINDOW_MS=60000
MCP_RATE_LIMIT_MAX_REQUESTS=120
```

Notes:
- Auth and rate limit checks apply to mutable `/api/mcp/call` tool invocations.
- Keep `MCP_BRIDGE_AUTH_ENABLED=false` in local dev unless your client sends auth headers.
- `MCP_SECURITY_MODE=strict` enforces the `MCP_ALLOWED_ORIGINS` CORS allowlist.

### Token Governance

Canonical token source is `mcp-server/tokens`. Keep `web-client/tokens` in sync with:

```bash
npm run tokens:sync
```

Validate no drift before commits/CI:

```bash
npm run tokens:check
```

## MCP Tools

The server provides the following tools:

| Tool | Description |
| --- | --- |
| `search_products` | Search products by name/keyword |
| `filter_products` | Filter by category |
| `add_to_cart` | Add product to cart |
| `remove_from_cart` | Remove product from cart |
| `get_cart` | Get cart contents |
| `get_products` | Get all products |
| `get_categories` | Get all categories |

## Mock Products

| ID | Name | Category | Price |
| --- | --- | --- | --- |
| 1 | Nike Shoes | Footwear | ₹4,999 |
| 2 | Adidas T-Shirt | Clothing | ₹1,999 |
| 3 | Puma Cap | Accessories | ₹999 |
| 4 | Nike Jacket | Clothing | ₹3,999 |
| 5 | Adidas Sneakers | Footwear | ₹5,999 |
| 6 | Puma Watch | Accessories | ₹2,999 |
| 7 | Nike Bag | Accessories | ₹1,999 |
| 8 | Adidas Shorts | Clothing | ₹1,499 |

## Example Interactions

- "Show me Nike products"
- "What footwear do you have?"
- "Add the Puma Watch to my cart"
- "Show my cart"
- "What's in my cart?"

## UI Resources

The MCP server returns widget HTML resources under `ui://ecommerce/*` (for example:
`ui://ecommerce/product-grid.html`, `ui://ecommerce/cart-view.html`, `ui://ecommerce/product-detail.html`).
These are rendered inside the chat interface for a seamless experience.

## Project Structure

```text
.
├── docs/
│   └── decision-log.md        # Architecture and implementation decisions
├── package.json              # Root package.json
├── mcp-server/
│   ├── package.json
│   ├── legacy/               # Archived legacy runtime artifacts (non-active)
│   └── src/
│       └── index.js          # MCP Server with tools
└── web-client/
    ├── package.json
    ├── app/                  # Next.js app routes
    ├── components/           # Chat and UI components
    └── lib/                  # MCP client + utilities
```

## Documentation

- Decision log: [docs/decision-log.md](docs/decision-log.md)

## Script Bootstrap & Troubleshooting

Many utility scripts in `scripts/` support optional Figma automation.

1. Read setup instructions: [scripts/README.md](scripts/README.md)
2. Prefer env-based path configuration (`FOXY_TOOL_CALL` or `FOXY_ROOT`) over absolute paths.
3. If a script fails with a path error, verify:
   - `FOXY_TOOL_CALL` points to `foxy-tool-call.mjs`, or
   - `FOXY_ROOT/scripts/foxy-tool-call.mjs` exists.
4. For image-embedding scripts, verify `PRODUCT_IMAGE_DIR` (or default `assets/product-images`) exists.

## License

MIT
