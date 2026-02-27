#!/usr/bin/env node
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const catalog = await import("../shared/catalog.mjs");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  const products = catalog.products.slice(0, 4).map((p) => ({
    id: p.id, name: p.name, category: p.category,
    price: p.price, image: p.image,
  }));
  const data = { products, categories: ["All", "Footwear", "Clothing", "Accessories"] };

  await page.addInitScript({
    content: `window.__MCP_TOOL_RESULT__ = ${JSON.stringify(data)};`,
  });

  const widgetPath = path.resolve("mcp-server/dist/widgets/product-grid.html");
  await page.goto("file://" + widgetPath, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  const box = await page.evaluate(() => {
    const el = document.querySelector(".pg-wrap") || document.body;
    const r = el.getBoundingClientRect();
    return { width: Math.ceil(r.width), height: Math.ceil(r.height) };
  });

  await page.setViewportSize({
    width: Math.max(box.width + 40, 1000),
    height: box.height + 40,
  });
  await page.waitForTimeout(500);

  await page.screenshot({
    path: "screenshots/actual/product-grid.png",
    clip: {
      x: 0, y: 0,
      width: Math.max(box.width + 40, 1000),
      height: box.height + 40,
    },
  });

  console.log(`Saved: screenshots/actual/product-grid.png (${box.width}x${box.height})`);
  await browser.close();
})();
