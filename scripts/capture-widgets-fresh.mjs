#!/usr/bin/env node
/**
 * Capture fresh screenshots of all 12 widgets using Playwright.
 * Uses REAL catalog data from shared/catalog.mjs.
 * Widget dimensions match the Figma design compositions.
 *
 * Usage: node scripts/capture-widgets-fresh.mjs
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'mcp-server', 'dist', 'widgets');
const TOKENS_FILE = path.join(ROOT, 'mcp-server', 'tokens', 'figma-tokens-light.css');
const OUT_DIR = path.join(ROOT, 'screenshots', 'actual');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Real catalog ────────────────────────────────────────────────────────
const products = [
  { id: 1, name: 'Nike Air Max 90', category: 'Footwear', price: 4999, originalPrice: 6499, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&q=80', description: 'Lightweight running shoes with Air Max cushioning for all-day comfort and style.' },
  { id: 2, name: 'Classic Crew T-Shirt', category: 'Clothing', price: 1999, originalPrice: 2499, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&q=80', description: 'Premium cotton crew neck tee with a relaxed fit. Soft, breathable, and built to last.' },
  { id: 3, name: 'Sport Flex Cap', category: 'Accessories', price: 999, originalPrice: 1299, image: 'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=400&h=400&fit=crop&q=80', description: 'Adjustable sports cap with moisture-wicking sweatband for active lifestyles.' },
  { id: 4, name: 'Urban Bomber Jacket', category: 'Clothing', price: 3999, originalPrice: 4999, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=400&fit=crop&q=80', description: 'Modern bomber jacket with premium zip closure, ribbed cuffs, and satin lining.' },
  { id: 5, name: 'Ultra Boost Sneakers', category: 'Footwear', price: 5999, originalPrice: 7499, image: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400&h=400&fit=crop&q=80', description: 'Energy-returning Boost cushioning for responsive comfort on every run.' },
  { id: 6, name: 'Chronograph Watch', category: 'Accessories', price: 2999, originalPrice: 3999, image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop&q=80', description: 'Precision chronograph with stainless steel case and genuine leather strap.' },
  { id: 7, name: 'Trail Utility Backpack', category: 'Accessories', price: 1999, originalPrice: 2499, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&q=80', description: 'Durable 30L backpack with padded laptop sleeve and weather-resistant shell.' },
  { id: 8, name: 'Flex Training Shorts', category: 'Clothing', price: 1499, originalPrice: 1899, image: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&h=400&fit=crop&q=80', description: 'Lightweight training shorts with 4-way stretch fabric and zippered pockets.' },
];

const categories = ['All', 'Footwear', 'Clothing', 'Accessories'];

// ── Widget definitions with REAL data and Figma-matched dimensions ──────
const WIDGETS = [
  {
    name: 'product-card',
    width: 320,   // Figma: 320×315
    maxHeight: 600,
    mockData: {
      product: products[0], // Nike Air Max 90
    },
  },
  {
    name: 'product-grid',
    width: 1360,  // Figma: 1360×635
    maxHeight: 1000,
    mockData: {
      products: products.slice(0, 6), // first 6 products
      categories: categories,
    },
  },
  {
    name: 'product-detail',
    width: 860,   // Figma: 860×442
    maxHeight: 800,
    mockData: {
      product: {
        ...products[0],
        inStock: true,
      },
    },
  },
  {
    name: 'cart-view',
    width: 480,   // Figma: 480×577
    maxHeight: 900,
    mockData: {
      view: 'cart',
      total: products[0].price + products[3].price + products[2].price,
      count: 3,
      cart: [
        { ...products[0], cartId: 1 },
        { ...products[3], cartId: 2 },
        { ...products[2], cartId: 3 },
      ],
    },
  },
  {
    name: 'cart-summary',
    width: 360,   // Figma: 360×371
    maxHeight: 600,
    mockData: {
      view: 'cart_summary',
      cart: [{}, {}, {}],
      total: products[0].price + products[3].price + products[2].price,
      count: 3,
    },
  },
  {
    name: 'wishlist',
    width: 800,   // Figma: 800×429
    maxHeight: 800,
    mockData: [
      products[1], // Classic Crew T-Shirt
      products[5], // Chronograph Watch
      products[6], // Trail Utility Backpack
    ],
  },
  {
    name: 'search-bar',
    width: 600,   // Figma: 600×328
    maxHeight: 600,
    mockData: {
      products: [products[0], products[4], products[2]], // mix of results
    },
  },
  {
    name: 'category-filter',
    width: 280,   // Figma: 280×378
    maxHeight: 600,
    mockData: {
      categories: ['Footwear', 'Clothing', 'Accessories'],
      products: products,
    },
  },
  {
    name: 'checkout-form',
    width: 480,   // Figma: 480×609
    maxHeight: 900,
    mockData: {
      total: 9997,
    },
  },
  {
    name: 'order-confirmation',
    width: 520,   // Figma: 520×729
    maxHeight: 1000,
    mockData: {
      orderId: 'ORD-20260226-001',
      total: 9997,
      estimatedDelivery: 'March 3, 2026',
      items: [
        { ...products[0], cartId: 1 },
        { ...products[3], cartId: 2 },
        { ...products[2], cartId: 3 },
      ],
    },
  },
  {
    name: 'price-tag',
    width: 320,   // Figma: 320×285
    maxHeight: 500,
    mockData: {
      product: {
        ...products[0],
        inStock: true,
      },
    },
  },
  {
    name: 'review-rating',
    width: 400,   // Figma: 400×363
    maxHeight: 700,
    mockData: {
      reviews: [
        { id: 1, username: 'Priya S.', date: 'Feb 20, 2026', rating: 5, text: 'Absolutely love these shoes! Great cushioning and stylish design.' },
        { id: 2, username: 'Rahul M.', date: 'Feb 18, 2026', rating: 4, text: 'Comfortable fit, true to size. Delivery was quick too.' },
        { id: 3, username: 'Anita K.', date: 'Feb 15, 2026', rating: 5, text: 'Best running shoes I have owned. Worth every penny!' },
      ],
      averageRating: 4.7,
      count: 3,
    },
  },
];

async function run() {
  console.log('🚀 Launching Playwright to capture widget screenshots...\n');

  const browser = await chromium.launch({ headless: true });
  const summary = [];

  for (const widget of WIDGETS) {
    const htmlFile = path.join(DIST_DIR, `${widget.name}.html`);
    const outFile = path.join(OUT_DIR, `${widget.name}.png`);

    if (!fs.existsSync(htmlFile)) {
      console.log(`  ⚠️  ${widget.name}: HTML file not found, skipping`);
      continue;
    }

    // Create context with enough viewport height for content
    const context = await browser.newContext({
      viewport: { width: widget.width, height: widget.maxHeight },
      deviceScaleFactor: 2, // Retina quality
    });
    const page = await context.newPage();

    // Inject mock data before page load
    if (widget.mockData) {
      await page.addInitScript((data) => {
        window.__MCP_TOOL_RESULT__ = data;
      }, widget.mockData);
    }

    // Load the widget HTML
    await page.goto(`file://${htmlFile}`, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for images to load and content to settle
    await page.waitForTimeout(3000);

    // Measure actual content height
    const contentHeight = await page.evaluate(() => {
      const body = document.body;
      const html = document.documentElement;
      // Get the full scrollable content height
      const maxH = Math.max(
        body.scrollHeight, body.offsetHeight,
        html.clientHeight, html.scrollHeight, html.offsetHeight
      );
      // Also check direct children bounds
      let maxBottom = 0;
      for (const child of body.children) {
        const rect = child.getBoundingClientRect();
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      }
      return Math.ceil(Math.max(maxBottom, maxH));
    });

    const clipH = Math.min(Math.max(contentHeight, 100), widget.maxHeight);

    await page.screenshot({
      path: outFile,
      clip: { x: 0, y: 0, width: widget.width, height: clipH },
    });

    const stat = fs.statSync(outFile);
    console.log(`  ✅ ${widget.name.padEnd(20)} ${widget.width}×${clipH}  (${Math.round(stat.size / 1024)}KB)`);
    summary.push({ name: widget.name, width: widget.width, height: clipH, sizeKB: Math.round(stat.size / 1024) });

    await context.close();
  }

  await browser.close();
  console.log(`\n🎉 Captured ${summary.length} widget screenshots → ${OUT_DIR}`);
  console.log(JSON.stringify(summary, null, 2));
}

run().catch(err => { console.error(err); process.exit(1); });
