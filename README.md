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

- MCP Server on stdio
- Web Client at <http://localhost:5173>
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

The MCP server returns HTML resources for:

- Product lists (`ecommerce://products/list`)
- Cart view (`ecommerce://cart/view`)

These are rendered inside the chat interface for a seamless experience.

## Project Structure

```text
.
├── docs/
│   └── decision-log.md        # Architecture and implementation decisions
├── package.json              # Root package.json
├── mcp-server/
│   ├── package.json
│   └── src/
│       └── index.js          # MCP Server with tools
└── web-client/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx           # Main React app
        ├── index.css         # Styles
        └── vite-env.d.ts
```

## Documentation

- Decision log: [docs/decision-log.md](docs/decision-log.md)

## License

MIT
