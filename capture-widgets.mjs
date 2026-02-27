/**
 * Playwright script to capture real browser screenshots of all 12 MCP ecommerce widgets.
 * Each widget HTML is self-contained (built by Vite + viteSingleFile).
 * We inject mock data via window.__MCP_TOOL_RESULT__ before the page loads.
 * Screenshots are cropped to the actual rendered content area (2x retina).
 */
import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, 'mcp-server', 'dist', 'widgets');
const OUT_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const WIDGETS = [
  {
    name: 'product-card',
    width: 420,
    height: 800,
    mockData: {
      product: {
        id: 1, name: 'Classic Cotton Kurta', category: 'Clothing',
        price: 1499, image: 'https://picsum.photos/seed/kurta/400/300',
      },
    },
  },
  {
    name: 'product-grid',
    width: 950,
    height: 1200,
    mockData: {
      products: [
        { id: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
        { id: 2, name: 'Wireless Earbuds', category: 'Electronics', price: 2999, image: 'https://picsum.photos/seed/earbuds/400/300' },
        { id: 3, name: 'Handmade Leather Wallet', category: 'Accessories', price: 899, image: 'https://picsum.photos/seed/wallet/400/300' },
        { id: 4, name: 'Steel Water Bottle', category: 'Home & Kitchen', price: 599, image: 'https://picsum.photos/seed/bottle/400/300' },
      ],
    },
  },
  {
    name: 'cart-view',
    width: 520,
    height: 800,
    mockData: {
      view: 'cart', total: 2398, count: 2,
      cart: [
        { cartId: 1, id: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
        { cartId: 2, id: 3, name: 'Handmade Leather Wallet', category: 'Accessories', price: 899, image: 'https://picsum.photos/seed/wallet/400/300' },
      ],
    },
  },
  {
    name: 'cart-summary',
    width: 420,
    height: 500,
    mockData: { view: 'cart_summary', cart: [{}, {}], total: 2398, count: 2 },
  },
  {
    name: 'search-bar',
    width: 520,
    height: 600,
    mockData: {
      products: [
        { id: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
        { id: 2, name: 'Wireless Earbuds', category: 'Electronics', price: 2999, image: 'https://picsum.photos/seed/earbuds/400/300' },
      ],
    },
  },
  {
    name: 'category-filter',
    width: 950,
    height: 1000,
    mockData: {
      categories: ['Clothing', 'Electronics', 'Accessories', 'Home & Kitchen'],
      products: [
        { id: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
        { id: 2, name: 'Wireless Earbuds', category: 'Electronics', price: 2999, image: 'https://picsum.photos/seed/earbuds/400/300' },
        { id: 3, name: 'Handmade Leather Wallet', category: 'Accessories', price: 899, image: 'https://picsum.photos/seed/wallet/400/300' },
      ],
    },
  },
  {
    name: 'checkout-form',
    width: 520,
    height: 900,
    mockData: null,
  },
  {
    name: 'price-tag',
    width: 420,
    height: 500,
    mockData: {
      product: {
        id: 1, name: 'Classic Cotton Kurta', category: 'Clothing',
        price: 1499, originalPrice: 2499,
        image: 'https://picsum.photos/seed/kurta/400/300', inStock: true,
      },
    },
  },
  {
    name: 'review-rating',
    width: 520,
    height: 900,
    mockData: {
      reviews: [
        { id: 1, username: 'Priya S.', date: 'Feb 20, 2026', rating: 5, text: 'Absolutely love this! Great quality and fits perfectly.' },
        { id: 2, username: 'Rahul M.', date: 'Feb 18, 2026', rating: 4, text: 'Good product, delivery was a bit slow though.' },
        { id: 3, username: 'Anita K.', date: 'Feb 15, 2026', rating: 3, text: 'Decent quality for the price. Color slightly different from the picture.' },
      ],
      averageRating: 4.0, count: 3,
    },
  },
  {
    name: 'order-confirmation',
    width: 540,
    height: 800,
    mockData: {
      orderId: 'ORD-20260226-001', total: 2398, estimatedDelivery: 'March 3, 2026',
      items: [
        { id: 1, cartId: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
        { id: 3, cartId: 2, name: 'Handmade Leather Wallet', category: 'Accessories', price: 899, image: 'https://picsum.photos/seed/wallet/400/300' },
      ],
    },
  },
  {
    name: 'wishlist',
    width: 950,
    height: 800,
    // render(_injected) expects Product[] directly
    mockData: [
      { id: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
      { id: 2, name: 'Wireless Earbuds', category: 'Electronics', price: 2999, image: 'https://picsum.photos/seed/earbuds/400/300' },
      { id: 4, name: 'Steel Water Bottle', category: 'Home & Kitchen', price: 599, image: 'https://picsum.photos/seed/bottle/400/300' },
    ],
  },
  {
    name: 'product-detail',
    width: 860,
    height: 900,
    mockData: {
      product: {
        id: 1, name: 'Classic Cotton Kurta', category: 'Clothing',
        price: 1499, originalPrice: 2499,
        image: 'https://picsum.photos/seed/kurta/400/300',
        description: 'A timeless cotton kurta crafted with premium fabric. Perfect for both casual and semi-formal occasions. Features intricate thread work and a comfortable fit.',
        inStock: true,
      },
    },
  },
];

async function run() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const widget of WIDGETS) {
    const htmlFile = path.join(DIST_DIR, `${widget.name}.html`);
    const outFile = path.join(OUT_DIR, `${widget.name}.png`);

    console.log(`Capturing ${widget.name}...`);

    const context = await browser.newContext({
      viewport: { width: widget.width, height: widget.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    if (widget.mockData) {
      await page.addInitScript((data) => {
        window.__MCP_TOOL_RESULT__ = data;
      }, widget.mockData);
    }

    try {
      await page.goto(`file://${htmlFile}`, { waitUntil: 'load', timeout: 10000 });
    } catch (e) {
      console.log(`  Warning: ${e.message}`);
    }

    await page.waitForTimeout(2500);

    // Measure the actual rendered content height
    const contentHeight = await page.evaluate(() => {
      const body = document.body;
      // Get the max bottom of all direct children
      let maxBottom = 0;
      for (const child of body.children) {
        const rect = child.getBoundingClientRect();
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      }
      return Math.ceil(maxBottom) + 24; // 24px bottom padding
    });

    const clipH = Math.min(Math.max(contentHeight, 100), widget.height);
    console.log(`  Content height: ${contentHeight}px, clipping to: ${widget.width}x${clipH}`);

    await page.screenshot({
      path: outFile,
      clip: { x: 0, y: 0, width: widget.width, height: clipH },
    });

    const stats = fs.statSync(outFile);
    console.log(`  Saved (${(stats.size / 1024).toFixed(1)}KB)`);
    results.push({ name: widget.name, path: outFile, width: widget.width, height: clipH, sizeKB: (stats.size / 1024).toFixed(1) });

    await context.close();
  }

  await browser.close();
  
  console.log('\n=== Summary ===');
  for (const r of results) {
    console.log(`  ${r.name.padEnd(22)} ${r.width}x${r.height}  ${r.sizeKB}KB`);
  }
  console.log(`\nDone! ${results.length} screenshots in ${OUT_DIR}`);
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
