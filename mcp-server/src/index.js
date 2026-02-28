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
import { fileURLToPath, pathToFileURL } from "node:url";
import { startOpenAIProxy } from "./openaiProxy.js";
import catalog from "../../shared/catalog.mjs";

const { products, categories } = catalog;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Paths ───────────────────────────────────────────────────────────────
const DIST_DIR = path.join(__dirname, "..", "dist");

// ── Resource URIs (one per widget) ─────────────────────────────────────
const RESOURCE_URIS = {
  productCard: "ui://ecommerce/product-card.html",
  productDetail: "ui://ecommerce/product-detail.html",
  productGrid: "ui://ecommerce/product-grid.html",
  cartView: "ui://ecommerce/cart-view.html",
  cartSummary: "ui://ecommerce/cart-summary.html",
  categoryFilter: "ui://ecommerce/category-filter.html",
  searchBar: "ui://ecommerce/search-bar.html",
  checkoutForm: "ui://ecommerce/checkout-form.html",
  orderConfirmation: "ui://ecommerce/order-confirmation.html",
  reviewRating: "ui://ecommerce/review-rating.html",
  priceTag: "ui://ecommerce/price-tag.html",
  wishlist: "ui://ecommerce/wishlist.html",
};

const DIST_FILES = {
  productCard: "widgets/product-card.html",
  productDetail: "widgets/product-detail.html",
  productGrid: "widgets/product-grid.html",
  cartView: "widgets/cart-view.html",
  cartSummary: "widgets/cart-summary.html",
  categoryFilter: "widgets/category-filter.html",
  searchBar: "widgets/search-bar.html",
  checkoutForm: "widgets/checkout-form.html",
  orderConfirmation: "widgets/order-confirmation.html",
  reviewRating: "widgets/review-rating.html",
  priceTag: "widgets/price-tag.html",
  wishlist: "widgets/wishlist.html",
};

function missingWidgetHtml(key) {
  return `<html><body style="font-family:sans-serif;padding:2rem;color:#888;">Widget "${key}" not built — run <code>npm run build</code></body></html>`;
}

// ── Widget HTML cache (reloads when dist file changes) ──────────────────
const widgetHtml = {};
const widgetMTime = {};
const widgetReadErrors = new Set();
let loadedCount = 0;

function loadWidgetHtmlFromDisk(key, { force = false } = {}) {
  const file = DIST_FILES[key];
  if (!file) return "";
  const filePath = path.join(DIST_DIR, file);

  try {
    const stat = fs.statSync(filePath);
    if (!force && widgetHtml[key] && widgetMTime[key] === stat.mtimeMs) {
      return widgetHtml[key];
    }
    const html = fs.readFileSync(filePath, "utf-8");
    widgetHtml[key] = html;
    widgetMTime[key] = stat.mtimeMs;
    widgetReadErrors.delete(key);
    return html;
  } catch (error) {
    if (!widgetReadErrors.has(key)) {
      console.error(`⚠ Failed to read widget "${key}" from ${filePath}: ${error?.message || error}`);
      widgetReadErrors.add(key);
    }
    return widgetHtml[key] || "";
  }
}

for (const key of Object.keys(DIST_FILES)) {
  if (loadWidgetHtmlFromDisk(key, { force: true })) {
    loadedCount++;
  }
}
console.error(`✓ Loaded ${loadedCount}/${Object.keys(DIST_FILES).length} widget HTML files from dist/`);

/** Inject tool result data into pre-built HTML */
function embedData(key, data) {
  const html = loadWidgetHtmlFromDisk(key);
  if (!html) {
    return missingWidgetHtml(key);
  }
  const tag = `<script>window.__MCP_TOOL_RESULT__=${JSON.stringify(data)};</script>`;
  return html.replace("</head>", `${tag}</head>`);
}

// ── In-memory state (session scoped) ────────────────────────────────────
const FALLBACK_SESSION_ID = "anonymous";
const sessionStore = new Map();

function withUserId(schema = {}) {
  return {
    ...schema,
    userId: z.string().optional().describe("Session user identifier"),
  };
}

function normalizeSessionId(userId) {
  if (typeof userId !== "string") return FALLBACK_SESSION_ID;
  const trimmed = userId.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_SESSION_ID;
}

function getSessionState(userId) {
  const sessionId = normalizeSessionId(userId);
  let session = sessionStore.get(sessionId);
  if (!session) {
    session = { cart: [], wishlist: [], lastOrderId: 0 };
    sessionStore.set(sessionId, session);
  }
  return session;
}

function cartTotal(cart) {
  return cart.reduce((s, i) => s + i.price, 0);
}

function generateOrderId(session) {
  session.lastOrderId++;
  return `ORD-${Date.now()}-${String(session.lastOrderId).padStart(3, "0")}`;
}

function getEstimatedDelivery() {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

// ── Server Factory ──────────────────────────────────────────────────────
export function createMCPServer() {
  const server = new McpServer({
    name: "ecommerce-mcp-server",
    version: "2.0.0",
  });

  // ── Register all 12 widget resources ──────────────────────────────────
  for (const [key, uri] of Object.entries(RESOURCE_URIS)) {
    registerAppResource(server, uri, uri, {
      mimeType: RESOURCE_MIME_TYPE,
    }, async () => ({
      contents: [{
        uri,
        mimeType: RESOURCE_MIME_TYPE,
        text: loadWidgetHtmlFromDisk(key) || missingWidgetHtml(key),
      }],
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TOOLS — Products
  // ═══════════════════════════════════════════════════════════════════════

  registerAppTool(server, "get_products", {
    description: "Get all available products in a grid view",
    inputSchema: withUserId(),
    _meta: { ui: { resourceUri: RESOURCE_URIS.productGrid } },
  }, async () => {
    const data = { products, categories, message: `Here are all ${products.length} available products` };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.productGrid, mimeType: RESOURCE_MIME_TYPE, text: embedData("productGrid", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "search_products", {
    description: "Search for products by name, category, or keyword",
    inputSchema: withUserId({ query: z.string().describe("Search query for product name or category") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.searchBar } },
  }, async ({ query }) => {
    const q = (query ?? "").toLowerCase();
    const results = products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );
    const data = { products: results, query, message: `Found ${results.length} product(s) matching "${query}"` };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.searchBar, mimeType: RESOURCE_MIME_TYPE, text: embedData("searchBar", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "filter_products", {
    description: "Filter products by category (All, Footwear, Clothing, or Accessories)",
    inputSchema: withUserId({ category: z.string().describe("Category to filter by") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.categoryFilter } },
  }, async ({ category }) => {
    const results = category === "All" ? products : products.filter((p) => p.category === category);
    const data = { products: results, categories, category, message: `${results.length} product(s) in "${category}"` };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.categoryFilter, mimeType: RESOURCE_MIME_TYPE, text: embedData("categoryFilter", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "get_product_detail", {
    description: "Show detailed product view with size, quantity, and add-to-cart options",
    inputSchema: withUserId({ productId: z.number().describe("ID of the product to show details for") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.productDetail } },
  }, async ({ productId }) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { content: [{ type: "text", text: JSON.stringify({ message: "Product not found" }) }] };
    }
    const data = {
      product: {
        ...product,
        description: product.description || "Premium quality product from a trusted brand. Designed for comfort and durability.",
        originalPrice: product.originalPrice || Math.round(product.price * 1.25),
        inStock: true,
      },
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.productDetail, mimeType: RESOURCE_MIME_TYPE, text: embedData("productDetail", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "get_price_info", {
    description: "Show price tag with sale, regular, or out-of-stock variants",
    inputSchema: withUserId({ productId: z.number().describe("ID of the product to show price for") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.priceTag } },
  }, async ({ productId }) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { content: [{ type: "text", text: JSON.stringify({ message: "Product not found" }) }] };
    }
    const data = {
      product: { ...product, originalPrice: product.originalPrice || Math.round(product.price * 1.3), inStock: true },
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.priceTag, mimeType: RESOURCE_MIME_TYPE, text: embedData("priceTag", data) } },
      ],
      structuredContent: data,
    };
  });

  server.tool("get_categories",
    "Get all available product categories",
    withUserId(),
    async () => {
      const data = { categories, message: `Categories: ${categories.join(", ")}` };
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  // ═══════════════════════════════════════════════════════════════════════
  // TOOLS — Cart
  // ═══════════════════════════════════════════════════════════════════════

  registerAppTool(server, "get_cart", {
    description: "Show the shopping cart with all items",
    inputSchema: withUserId(),
    _meta: { ui: { resourceUri: RESOURCE_URIS.cartView } },
  }, async ({ userId } = {}) => {
    const session = getSessionState(userId);
    const total = cartTotal(session.cart);
    const data = {
      view: "cart",
      cart: session.cart,
      total,
      count: session.cart.length,
      message: `${session.cart.length} item(s) in cart. Total: ₹${total}`,
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.cartView, mimeType: RESOURCE_MIME_TYPE, text: embedData("cartView", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "get_cart_summary", {
    description: "Show a compact cart badge with item count and total",
    inputSchema: withUserId(),
    _meta: { ui: { resourceUri: RESOURCE_URIS.cartSummary } },
  }, async ({ userId } = {}) => {
    const session = getSessionState(userId);
    const total = cartTotal(session.cart);
    const data = { view: "cart", cart: session.cart, total, count: session.cart.length };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.cartSummary, mimeType: RESOURCE_MIME_TYPE, text: embedData("cartSummary", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "add_to_cart", {
    description: "Add a product to the shopping cart",
    inputSchema: withUserId({ productId: z.number().describe("ID of the product to add") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.cartView } },
  }, async ({ productId, userId }) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, message: "Product not found" }) }] };
    }
    const session = getSessionState(userId);
    session.cart.push({ ...product, cartId: Date.now() });
    const total = cartTotal(session.cart);
    const data = {
      view: "cart",
      success: true,
      message: `Added "${product.name}" to cart`,
      cart: session.cart,
      total,
      count: session.cart.length,
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.cartView, mimeType: RESOURCE_MIME_TYPE, text: embedData("cartView", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "remove_from_cart", {
    description: "Remove a product from the shopping cart",
    inputSchema: withUserId({ productId: z.number().describe("ID of the product to remove") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.cartView } },
  }, async ({ productId, userId }) => {
    const session = getSessionState(userId);
    const idx = session.cart.findIndex((i) => i.id === productId);
    if (idx === -1) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, message: "Product not in cart" }) }] };
    }
    const removed = session.cart.splice(idx, 1)[0];
    const total = cartTotal(session.cart);
    const data = {
      view: "cart",
      success: true,
      message: `Removed "${removed.name}" from cart`,
      cart: session.cart,
      total,
      count: session.cart.length,
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.cartView, mimeType: RESOURCE_MIME_TYPE, text: embedData("cartView", data) } },
      ],
      structuredContent: data,
    };
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TOOLS — Checkout / Orders
  // ═══════════════════════════════════════════════════════════════════════

  registerAppTool(server, "checkout", {
    description: "Show the checkout form for placing an order",
    inputSchema: withUserId(),
    _meta: { ui: { resourceUri: RESOURCE_URIS.checkoutForm } },
  }, async ({ userId } = {}) => {
    const session = getSessionState(userId);
    const total = cartTotal(session.cart);
    const data = { cart: session.cart, total, count: session.cart.length, message: "Please fill in your shipping and payment details" };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.checkoutForm, mimeType: RESOURCE_MIME_TYPE, text: embedData("checkoutForm", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "place_order", {
    description: "Place an order with shipping and payment details",
    inputSchema: withUserId({
      name: z.string().describe("Full name"),
      email: z.string().describe("Email address"),
      phone: z.string().optional().describe("Phone number"),
      address: z.string().describe("Street address"),
      city: z.string().describe("City"),
      state: z.string().optional().describe("State"),
      pin: z.string().describe("PIN code"),
      paymentMethod: z.string().optional().describe("Payment method"),
    }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.orderConfirmation } },
  }, async (args) => {
    const session = getSessionState(args.userId);
    const orderId = generateOrderId(session);
    const items = [...session.cart];
    const total = cartTotal(session.cart);
    session.cart = [];
    const data = {
      orderId,
      items,
      total,
      estimatedDelivery: getEstimatedDelivery(),
      shippingAddress: `${args.name}, ${args.address}, ${args.city} - ${args.pin}`,
      message: `Order ${orderId} placed! Total: ₹${total}`,
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.orderConfirmation, mimeType: RESOURCE_MIME_TYPE, text: embedData("orderConfirmation", data) } },
      ],
      structuredContent: data,
    };
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TOOLS — Reviews
  // ═══════════════════════════════════════════════════════════════════════

  registerAppTool(server, "get_reviews", {
    description: "Show reviews and ratings for a product",
    inputSchema: withUserId({ productId: z.number().describe("ID of the product to show reviews for") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.reviewRating } },
  }, async ({ productId }) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { content: [{ type: "text", text: JSON.stringify({ message: "Product not found" }) }] };
    }
    const reviews = [
      { id: 1, username: "Anita Kumar", date: "Feb 18, 2026", rating: 5, text: `Absolutely love this ${product.name}! Super comfortable and excellent build quality.` },
      { id: 2, username: "Rahul Sharma", date: "Feb 10, 2026", rating: 4, text: "Good product overall. Sizing runs a little small so order one size up." },
      { id: 3, username: "Priya Menon", date: "Jan 28, 2026", rating: 3, text: "Decent for the price. Fast delivery and great packaging." },
    ];
    const data = { reviews, averageRating: 4.0, count: reviews.length, productName: product.name };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.reviewRating, mimeType: RESOURCE_MIME_TYPE, text: embedData("reviewRating", data) } },
      ],
      structuredContent: data,
    };
  });

  // ═══════════════════════════════════════════════════════════════════════
  // TOOLS — Wishlist
  // ═══════════════════════════════════════════════════════════════════════

  registerAppTool(server, "get_wishlist", {
    description: "Show the user's wishlist",
    inputSchema: withUserId(),
    _meta: { ui: { resourceUri: RESOURCE_URIS.wishlist } },
  }, async ({ userId } = {}) => {
    const session = getSessionState(userId);
    const data = {
      wishlist: session.wishlist,
      count: session.wishlist.length,
      message: `${session.wishlist.length} item(s) in wishlist`,
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.wishlist, mimeType: RESOURCE_MIME_TYPE, text: embedData("wishlist", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "add_to_wishlist", {
    description: "Add a product to the wishlist",
    inputSchema: withUserId({ productId: z.number().describe("ID of the product to add to wishlist") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.wishlist } },
  }, async ({ productId, userId }) => {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, message: "Product not found" }) }] };
    }
    const session = getSessionState(userId);
    if (!session.wishlist.find((w) => w.id === productId)) {
      session.wishlist.push(product);
    }
    const data = {
      success: true,
      wishlist: session.wishlist,
      count: session.wishlist.length,
      message: `Added "${product.name}" to wishlist`,
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.wishlist, mimeType: RESOURCE_MIME_TYPE, text: embedData("wishlist", data) } },
      ],
      structuredContent: data,
    };
  });

  registerAppTool(server, "remove_from_wishlist", {
    description: "Remove a product from the wishlist",
    inputSchema: withUserId({ productId: z.number().describe("ID of the product to remove from wishlist") }),
    _meta: { ui: { resourceUri: RESOURCE_URIS.wishlist } },
  }, async ({ productId, userId }) => {
    const session = getSessionState(userId);
    const idx = session.wishlist.findIndex((w) => w.id === productId);
    if (idx === -1) {
      return { content: [{ type: "text", text: JSON.stringify({ success: false, message: "Product not in wishlist" }) }] };
    }
    const removed = session.wishlist.splice(idx, 1)[0];
    const data = {
      success: true,
      wishlist: session.wishlist,
      count: session.wishlist.length,
      message: `Removed "${removed.name}" from wishlist`,
    };
    return {
      content: [
        { type: "text", text: JSON.stringify(data) },
        { type: "resource", resource: { uri: RESOURCE_URIS.wishlist, mimeType: RESOURCE_MIME_TYPE, text: embedData("wishlist", data) } },
      ],
      structuredContent: data,
    };
  });

  return server;
}

function isMainModule() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  // ── Start HTTP + SSE ──────────────────────────────────────────────────
  const apiPort = Number(process.env.API_PORT || process.env.PORT || 8787);
  startOpenAIProxy({ port: apiPort, createMCPServer });

  // ── Optionally start stdio transport (only when stdin is piped) ───────
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
}
