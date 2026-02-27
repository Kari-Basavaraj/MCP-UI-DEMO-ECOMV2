import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'mcp-server', 'dist', 'widgets');

(async () => {
  const browser = await chromium.launch({ headless: true });

  // Check search-bar
  const ctx1 = await browser.newContext({ viewport: { width: 500, height: 450 } });
  const p1 = await ctx1.newPage();
  await p1.addInitScript((d) => { window.__MCP_TOOL_RESULT__ = d; }, {
    products: [
      { id: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
    ]
  });
  await p1.goto('file://' + path.join(DIST, 'search-bar.html'), { waitUntil: 'domcontentloaded', timeout: 10000 });
  await p1.waitForTimeout(1500);
  const html1 = await p1.evaluate(() => document.body.innerHTML.substring(0, 600));
  console.log('=== SEARCH BAR ===');
  console.log(html1);

  // Check wishlist
  const ctx2 = await browser.newContext({ viewport: { width: 900, height: 500 } });
  const p2 = await ctx2.newPage();
  await p2.addInitScript((d) => { window.__MCP_TOOL_RESULT__ = d; }, {
    wishlist: [
      { id: 1, name: 'Classic Cotton Kurta', category: 'Clothing', price: 1499, image: 'https://picsum.photos/seed/kurta/400/300' },
    ]
  });
  await p2.goto('file://' + path.join(DIST, 'wishlist.html'), { waitUntil: 'domcontentloaded', timeout: 10000 });
  await p2.waitForTimeout(1500);
  const html2 = await p2.evaluate(() => document.body.innerHTML.substring(0, 600));
  console.log('\n=== WISHLIST ===');
  console.log(html2);

  // Check cart-summary
  const ctx3 = await browser.newContext({ viewport: { width: 400, height: 300 } });
  const p3 = await ctx3.newPage();
  await p3.addInitScript((d) => { window.__MCP_TOOL_RESULT__ = d; }, {
    view: 'cart_summary', cart: [{}, {}], total: 2398, count: 2
  });
  await p3.goto('file://' + path.join(DIST, 'cart-summary.html'), { waitUntil: 'domcontentloaded', timeout: 10000 });
  await p3.waitForTimeout(1500);
  const html3 = await p3.evaluate(() => document.body.innerHTML.substring(0, 600));
  console.log('\n=== CART SUMMARY ===');
  console.log(html3);

  await browser.close();
})();
