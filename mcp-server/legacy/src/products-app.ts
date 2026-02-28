import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";

// ─── Types ────────────────────────────────────────────────
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}
interface ToolData {
  products?: Product[];
  categories?: string[];
  query?: string;
  category?: string;
}

// ─── Styles ───────────────────────────────────────────────
const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--font-sans, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
    background: var(--color-background-primary, #0a0a0f);
    color: var(--color-text-primary, #e4e4e7);
    padding: 20px;
  }
  .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .header h2 { font-size: 20px; font-weight: 600; }
  .header .count { font-size: 13px; color: var(--color-text-secondary, #a1a1aa); }
  .categories { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .cat-btn {
    padding: 6px 14px; border-radius: var(--border-radius-md, 8px); border: 1px solid var(--color-border-primary, #3f3f46);
    background: var(--color-background-secondary, #1e1e24); color: var(--color-text-primary, #e4e4e7);
    font-size: 12px; cursor: pointer; transition: all 0.15s;
  }
  .cat-btn:hover { border-color: #4ade80; color: #4ade80; }
  .cat-btn.active { background: #4ade8020; border-color: #4ade80; color: #4ade80; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .card {
    background: var(--color-background-secondary, #1e1e24); border-radius: var(--border-radius-lg, 12px);
    padding: 16px; border: 1px solid var(--color-border-primary, #3f3f46); transition: all 0.2s;
  }
  .card:hover { border-color: var(--color-border-secondary, #52525b); transform: translateY(-2px); }
  .card .emoji { font-size: 40px; text-align: center; margin-bottom: 12px; }
  .card h3 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
  .card .category { font-size: 12px; color: var(--color-text-secondary, #a1a1aa); margin-bottom: 12px; }
  .card .bottom { display: flex; justify-content: space-between; align-items: center; }
  .card .price { font-size: 18px; font-weight: 700; color: #4ade80; }
  .add-btn {
    padding: 7px 14px; border-radius: var(--border-radius-md, 8px); border: none;
    background: #4ade80; color: #0a0a0f; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.15s;
  }
  .add-btn:hover { background: #22c55e; }
  .add-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .empty { text-align: center; padding: 40px; color: var(--color-text-secondary, #a1a1aa); font-size: 14px; }
`;

// ─── DOM Setup ────────────────────────────────────────────
const root = document.getElementById("root")!;
const style = document.createElement("style");
style.textContent = STYLES;
document.head.appendChild(style);

// ─── Render ───────────────────────────────────────────────
function render(data: ToolData) {
  const products = data.products || [];
  const categories = data.categories || [];
  const activeCategory = data.category || "All";

  root.innerHTML = `
    <div class="header">
      <h2>Products</h2>
      <span class="count">${products.length} item${products.length !== 1 ? "s" : ""}</span>
    </div>
    ${
      categories.length > 0
        ? `<div class="categories">${categories
            .map(
              (c) =>
                `<button class="cat-btn${c === activeCategory ? " active" : ""}" data-category="${c}">${c}</button>`
            )
            .join("")}</div>`
        : ""
    }
    ${
      products.length > 0
        ? `<div class="grid">${products
            .map(
              (p) => `
            <div class="card">
              <div class="emoji">${p.image}</div>
              <h3>${p.name}</h3>
              <div class="category">${p.category}</div>
              <div class="bottom">
                <span class="price">₹${p.price.toLocaleString()}</span>
                <button class="add-btn" data-id="${p.id}">Add to Cart</button>
              </div>
            </div>`
            )
            .join("")}</div>`
        : `<div class="empty">No products found</div>`
    }
  `;

  // Wire category buttons
  root.querySelectorAll<HTMLButtonElement>(".cat-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cat = btn.dataset.category!;
      try {
        const result = await app.callServerTool({
          name: "filter_products",
          arguments: { category: cat },
        });
        const text = result.content?.find((c) => c.type === "text")?.text;
        if (text) render({ ...JSON.parse(text), categories });
      } catch (e) {
        console.error("filter_products failed:", e);
      }
    });
  });

  // Wire Add to Cart buttons
  root.querySelectorAll<HTMLButtonElement>(".add-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const productId = Number(btn.dataset.id);
      btn.disabled = true;
      btn.textContent = "Adding...";
      try {
        await app.callServerTool({
          name: "add_to_cart",
          arguments: { productId },
        });
        btn.textContent = "Added ✓";
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = "Add to Cart";
        }, 1500);
      } catch (e) {
        console.error("add_to_cart failed:", e);
        btn.disabled = false;
        btn.textContent = "Add to Cart";
      }
    });
  });
}

// ─── App Setup ────────────────────────────────────────────
const app = new App({ name: "Products App", version: "1.0.0" });

// Handle tool result from host
app.ontoolresult = (result) => {
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (text) {
    try {
      render(JSON.parse(text));
    } catch {}
  }
};

// Handle host context (theme, fonts)
app.onhostcontextchanged = (ctx) => {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
  if (ctx.safeAreaInsets) {
    const { top, right, bottom, left } = ctx.safeAreaInsets;
    document.body.style.padding = `${top}px ${right}px ${bottom}px ${left}px`;
  }
};

app.onteardown = async () => ({});

// ─── Bootstrap ────────────────────────────────────────────
// Check for injected data (legacy embedded resource pattern)
const injected = (window as any).__MCP_TOOL_RESULT__;
if (injected) {
  render(injected);
}

// Connect to host (ext-apps protocol) — may or may not fire ontoolresult
app.connect();
