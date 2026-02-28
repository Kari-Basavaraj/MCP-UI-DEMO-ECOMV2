import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'mcp-server', 'dist', 'widgets');
const OUT_DIR = path.join(ROOT, 'screenshots', 'actual');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const WIDGETS = [
  {
    name: 'product-card',
    width: 420,
    height: 800,
    mockData: {
      product: {
        id: 1,
        name: 'Nike Air Max 90',
        category: 'Footwear',
        price: 4999,
        originalPrice: 6499,
        image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=420&fit=crop&q=80',
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
  const summary = [];

  for (const widget of WIDGETS) {
    const htmlFile = path.join(DIST_DIR, `${widget.name}.html`);
    const outFile = path.join(OUT_DIR, `${widget.name}.png`);
    if (!fs.existsSync(htmlFile)) {
      summary.push({ name: widget.name, status: 'missing-built-widget', htmlFile });
      continue;
    }

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

    await page.goto(`file://${htmlFile}`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(300);
    await page.evaluate(async () => {
      await document.fonts?.ready;
      const images = Array.from(document.images || []);
      await Promise.all(images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.addEventListener('load', resolve, { once: true });
          img.addEventListener('error', resolve, { once: true });
        });
      }));
    });

    const contentHeight = await page.evaluate(() => {
      const body = document.body;
      let maxBottom = 0;
      for (const child of body.children) {
        const rect = child.getBoundingClientRect();
        if (rect.bottom > maxBottom) maxBottom = rect.bottom;
      }
      return Math.ceil(maxBottom) + 24;
    });

    const clipH = Math.min(Math.max(contentHeight, 100), widget.height);

    await page.screenshot({
      path: outFile,
      clip: { x: 0, y: 0, width: widget.width, height: clipH },
    });

    summary.push({ name: widget.name, status: 'ok', width: widget.width, height: clipH, outFile });
    await context.close();
  }

  await browser.close();
  const okCount = summary.filter((s) => s.status === 'ok').length;
  const missingCount = summary.filter((s) => s.status !== 'ok').length;
  console.log(JSON.stringify({ generated: okCount, missing: missingCount, summary }, null, 2));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
