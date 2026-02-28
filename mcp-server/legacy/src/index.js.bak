import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startOpenAIProxy } from "./openaiProxy.js";
import catalog from "../../shared/catalog.mjs";

const { products, categories } = catalog;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Paths & URIs ────────────────────────────────────────────
const DIST_DIR = path.join(__dirname, "..", "dist");
const PRODUCTS_URI = "ui://ecommerce/products-app.html";
const CART_URI = "ui://ecommerce/cart-app.html";

// ── Pre-built UI HTML (cached at startup) ───────────────────
let productsHtml = "";
let cartHtml = "";
try {
  productsHtml = fs.readFileSync(path.join(DIST_DIR, "products-app.html"), "utf-8");
  cartHtml = fs.readFileSync(path.join(DIST_DIR, "cart-app.html"), "utf-8");
  console.error("✓ Loaded UI HTML from dist/");
} catch {
  console.error("⚠ dist/ HTML not found — run `npm run build` first");
}

/** Inject data into pre-built HTML so UIResourceRenderer can show it without ext-apps protocol */
function embedData(html, data) {
  if (!html) return `<html><body style="font-family:sans-serif;padding:2rem;color:#888;">UI not built — run <code>npm run build</code></body></html>`;
  const tag = `<script>window.__MCP_TOOL_RESULT__=${JSON.stringify(data)};</script>`;
  return html.replace("</head>", `${tag}</head>`);
}

// ── In-memory cart (shared across sessions) ─────────────────
let cart = [];

// ── Server Factory ──────────────────────────────────────────
export function createMCPServer() {
  const server = new McpServer({
    name: "ecommerce-mcp-server",
    version: "1.0.0",
  });

  // ─── Resources (ext-apps hosts fetch these separately) ────
  registerAppResource(server, PRODUCTS_URI, PRODUCTS_URI, {
    mimeType: RESOURCE_MIME_TYPE,
  }, async () => ({
    contents: [{ uri: PRODUCTS_URI, mimeType: RESOURCE_MIME_TYPE, text: productsHtml }],
  }));

  registerAppResource(server, CART_URI, CART_URI, {
    mimeType: RESOURCE_MIME_TYPE,
  }, async () => ({
    contents: [{ uri: CART_URI, mimeType: RESOURCE_MIME_TYPE, text: cartHtml }],
  }));

  // ─── Tools ────────────────────────────────────────────────

  registerAppTool(server, "get_products", {
    description: "Get all available products in the store",
    inputSchema: {},
    _meta: { ui: { resourceUri: PRODUCTS_URI } },
  }, async () => {
    const data = { products, categories, message: `Here are all ${products.length} products` };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: PRODUCTS_URI, mimeType: RESOURCE_MIME_TYPE, text: embedData(productsHtml, data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "search_products", {
    description: "Search for products by name or keyword",
    inputSchema: { query: z.string().describe("Search query for product name") },
    _meta: { ui: { resourceUri: PRODUCTS_URI } },
  }, async ({ query }) => {
    const q = query.toLowerCase();
    const results = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
    const data = { products: results, categories, query, message: `Found ${results.length} product(s) matching "${query}"` };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: PRODUCTS_URI, mimeType: RESOURCE_MIME_TYPE, text: embedData(productsHtml, data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "filter_products", {
    description: "Filter products by category (All, Footwear, Clothing, or Accessories)",
    inputSchema: { category: z.string().describe("Category: All, Footwear, Clothing, or Accessories") },
    _meta: { ui: { resourceUri: PRODUCTS_URI } },
  }, async ({ category }) => {
    const results = category === "All" ? products : products.filter((p) => p.category === category);
    const data = { products: results, categories, category, message: `Found ${results.length} product(s) in "${category}"` };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: PRODUCTS_URI, mimeType: RESOURCE_MIME_TYPE, text: embedData(productsHtml, data) } },
      ],
      structuredContent: data,
    };
  });

  server.tool("get_categories",
    "Get all available product categories",
    {},
    async () => {
      const data = { categories, message: `Categories: ${categories.join(", ")}` };
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    }
  );

  registerAppTool(server, "add_to_cart", {
    description: "Add a product to the shopping cart",
    inputSchema: { productId: z.number().describe("ID of the product to add") },
    _meta: { ui: { resourceUri: CART_URI } },
  }, async ({ productId }) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, message: "Product not found" }) }] };
    }
    cart.push({ ...product, cartId: Date.now() });
    const total = cart.reduce((s, i) => s + i.price, 0);
    const data = { success: true, message: `Added "${product.name}" to cart`, cart, total, cartCount: cart.length };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: CART_URI, mimeType: RESOURCE_MIME_TYPE, text: embedData(cartHtml, data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "remove_from_cart", {
    description: "Remove a product from the shopping cart",
    inputSchema: { productId: z.number().describe("ID of the product to remove") },
    _meta: { ui: { resourceUri: CART_URI } },
  }, async ({ productId }) => {
    const idx = cart.findIndex((i) => i.id === productId);
    if (idx === -1) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, message: "Product not in cart" }) }] };
    }
    const removed = cart.splice(idx, 1)[0];
    const total = cart.reduce((s, i) => s + i.price, 0);
    const data = { success: true, message: `Removed "${removed.name}" from cart`, cart, total, cartCount: cart.length };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: CART_URI, mimeType: RESOURCE_MIME_TYPE, text: embedData(cartHtml, data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "get_cart", {
    description: "Get the current shopping cart contents",
    inputSchema: {},
    _meta: { ui: { resourceUri: CART_URI } },
  }, async () => {
    const total = cart.reduce((s, i) => s + i.price, 0);
    const data = { cart, total, count: cart.length, message: `You have ${cart.length} item(s) in cart. Total: ₹${total}` };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: CART_URI, mimeType: RESOURCE_MIME_TYPE, text: embedData(cartHtml, data) } },
      ],
      structuredContent: data,
    };
  });

  return server;
}

// ── Start HTTP + SSE ────────────────────────────────────────
const apiPort = Number(process.env.API_PORT || process.env.PORT || 8787);
startOpenAIProxy({ port: apiPort, createMCPServer });

// ── Optionally start stdio transport (only when stdin is piped) ──
if (process.env.MCP_STDIO === "1" || (!process.stdin.isTTY && process.env.MCP_STDIO !== "0")) {
  async function main() {
    const transport = new StdioServerTransport();
    const server = createMCPServer();
    await server.connect(transport);
    console.error("E-commerce MCP Server running on stdio");
  }

  main().catch((err) => {
    console.error("Stdio transport error:", err);
  });
} else {
  console.error("Stdio transport skipped (HTTP-only mode)");
}
