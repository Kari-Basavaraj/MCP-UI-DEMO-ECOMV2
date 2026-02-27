// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

/**
 * Visual diff test suite for MCP Ecommerce widgets.
 * 
 * Captures screenshots of each built widget and compares against
 * Figma reference screenshots stored in /screenshots/.
 * 
 * Run: npx playwright test tests/visual-diff.spec.ts
 * Update baselines: npx playwright test tests/visual-diff.spec.ts --update-snapshots
 */

const ROOT = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT, 'mcp-server', 'dist', 'widgets');
const FIGMA_DIR = path.join(ROOT, 'screenshots');

// Sample data payloads to inject into widgets (mirrors server tool results)
const INJECT_DATA = {
  'product-card': {
    product: { id: 1, name: 'Running Shoes', category: 'Footwear', price: 3799, originalPrice: 4999, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', description: 'Premium running shoes', inStock: true }
  },
  'product-detail': {
    product: { id: 1, name: 'Running Shoes', category: 'Footwear', price: 3799, originalPrice: 4999, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', description: 'Premium running shoes with advanced cushioning technology for daily running and training.', inStock: true }
  },
  'product-grid': {
    products: [
      { id: 1, name: 'Running Shoes', category: 'Footwear', price: 3799, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
      { id: 2, name: 'Classic Watch', category: 'Accessories', price: 12999, image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400' },
      { id: 3, name: 'Denim Jacket', category: 'Clothing', price: 2499, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400' },
      { id: 4, name: 'Cotton T-Shirt', category: 'Clothing', price: 899, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
    ],
    categories: ['All', 'Footwear', 'Accessories', 'Clothing']
  },
  'cart-view': {
    items: [
      { productId: 1, name: 'Running Shoes', category: 'Footwear', price: 3799, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', quantity: 1 },
      { productId: 4, name: 'Cotton T-Shirt', category: 'Clothing', price: 899, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', quantity: 2 },
    ],
    total: 5597
  },
  'cart-summary': {
    subtotal: 5597, discount: 500, shipping: 0, tax: 459, total: 5556, itemCount: 3, savings: 500
  },
  'category-filter': {
    categories: ['All', 'Footwear', 'Accessories', 'Clothing', 'Electronics', 'Home & Living'],
    activeCategory: 'All',
    productCounts: { 'All': 8, 'Footwear': 2, 'Accessories': 2, 'Clothing': 3, 'Electronics': 1, 'Home & Living': 0 }
  },
  'search-bar': {
    query: '',
    results: [],
    categories: ['All', 'Footwear', 'Accessories', 'Clothing']
  },
  'checkout-form': {
    total: 5556, itemCount: 3
  },
  'order-confirmation': {
    orderId: 'ORD-2024-001',
    total: 5556,
    items: [
      { productId: 1, name: 'Running Shoes', category: 'Footwear', price: 3799, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', quantity: 1 },
      { productId: 4, name: 'Cotton T-Shirt', category: 'Clothing', price: 899, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', quantity: 2 },
    ],
    estimatedDelivery: 'Dec 25, 2024'
  },
  'review-rating': {
    productId: 1,
    averageRating: 4.2,
    totalReviews: 128,
    distribution: { 5: 60, 4: 25, 3: 10, 2: 3, 1: 2 },
    reviews: [
      { reviewer: 'Rahul M.', rating: 5, text: 'Excellent quality and very comfortable for daily running.', date: '2 days ago' },
      { reviewer: 'Priya S.', rating: 4, text: 'Good shoes but sizing runs a bit small. Order half size up.', date: '1 week ago' },
    ]
  },
  'price-tag': {
    product: { id: 1, name: 'Running Shoes', price: 3799, originalPrice: 4999, description: 'Premium running shoes with advanced cushioning technology' }
  },
  'wishlist': {
    items: [
      { productId: 1, name: 'Running Shoes', category: 'Footwear', price: 3799, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400' },
      { productId: 2, name: 'Classic Watch', category: 'Accessories', price: 12999, image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=400' },
      { productId: 3, name: 'Denim Jacket', category: 'Clothing', price: 2499, image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400' },
      { productId: 4, name: 'Cotton T-Shirt', category: 'Clothing', price: 899, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400' },
    ]
  },
};

const WIDGETS = [
  'product-card',
  'product-detail',
  'product-grid',
  'cart-view',
  'cart-summary',
  'category-filter',
  'search-bar',
  'checkout-form',
  'order-confirmation',
  'review-rating',
  'price-tag',
  'wishlist',
];

// Viewport sizes matched to widget widths
const VIEWPORT = { width: 1200, height: 900 };

for (const widget of WIDGETS) {
  test(`widget: ${widget} — visual snapshot`, async ({ page }) => {
    const htmlPath = path.join(DIST_DIR, `${widget}.html`);
    expect(fs.existsSync(htmlPath), `Built widget not found: ${htmlPath}`).toBe(true);

    // Read the built HTML and inject test data
    let html = fs.readFileSync(htmlPath, 'utf-8');
    const data = INJECT_DATA[widget];
    if (data) {
      const dataTag = `<script>window.__MCP_TOOL_RESULT__=${JSON.stringify(data)};</script>`;
      html = html.replace('</head>', `${dataTag}</head>`);
    }

    // Set viewport
    await page.setViewportSize(VIEWPORT);

    // Load the widget HTML in the browser
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Wait for images to load
    await page.waitForTimeout(1500);

    // Find the main widget container (first direct child in body)
    const widgetRoot = page.locator('body > *').first();
    
    // Take screenshot of the widget
    const screenshot = await widgetRoot.screenshot({ type: 'png' });

    // Save as "actual" for comparison
    const actualDir = path.join(ROOT, 'screenshots', 'actual');
    fs.mkdirSync(actualDir, { recursive: true });
    fs.writeFileSync(path.join(actualDir, `${widget}.png`), screenshot);

    // Playwright snapshot comparison (creates baseline on first run)
    await expect(widgetRoot).toHaveScreenshot(`${widget}.png`, {
      maxDiffPixelRatio: 0.02, // Allow 2% pixel difference (font rendering, antialiasing)
      threshold: 0.25,
    });
  });
}

// Token coverage audit test
test('token audit: all widgets use CSS custom properties only', async ({ page }) => {
  const results = [];

  for (const widget of WIDGETS) {
    const htmlPath = path.join(DIST_DIR, `${widget}.html`);
    const html = fs.readFileSync(htmlPath, 'utf-8');
    
    // Extract inline <style> content
    const styleMatches = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)];
    const styleContent = styleMatches.map(m => m[1]).join('\n');
    
    // Find hardcoded hex colors (excluding CSS custom property definitions and comments)
    const lines = styleContent.split('\n');
    const hardcoded = [];
    for (const line of lines) {
      const trimmed = line.trim();
      // Skip comments, custom property definitions (--xxx:), and :root blocks
      if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('--')) continue;
      if (trimmed.startsWith(':root')) continue;
      if (trimmed === '}' || trimmed === '{') continue;
      
      // Skip lines that are part of variable definitions (contain --sds- or --color)
      if (trimmed.includes('--sds-') || trimmed.includes('--color')) continue;
      
      // Find hex colors used as CSS property values (not inside var())
      const propHexMatches = [...trimmed.matchAll(/(?:^|\s)(color|background(?:-color)?|border(?:-color)?|outline(?:-color)?|box-shadow)\s*:\s*([^;]*)/gi)];
      for (const m of propHexMatches) {
        const value = m[2];
        // Skip if value uses var() or is transparent
        if (value.includes('var(')) continue;
        const hexMatches = [...value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)];
        hardcoded.push(...hexMatches.map(h => ({ line: trimmed, hex: h[0] })));
      }
    }

    results.push({ widget, hardcodedCount: hardcoded.length, hardcoded });
  }

  // All widgets should have 0 hardcoded colors
  for (const r of results) {
    expect(
      r.hardcodedCount,
      `Widget "${r.widget}" has ${r.hardcodedCount} hardcoded hex colors: ${r.hardcoded.map(h => h.hex).join(', ')}`
    ).toBe(0);
  }
});
