import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
  applyHostFonts,
} from "@modelcontextprotocol/ext-apps";

// ─── Types ────────────────────────────────────────────────
interface CartItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  cartId?: number;
}
interface ToolData {
  cart?: CartItem[];
  total?: number;
  count?: number;
  success?: boolean;
  message?: string;
  action?: string;
  product?: CartItem;
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
  .items { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; }
  .item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px; background: var(--color-background-secondary, #1e1e24);
    border-radius: var(--border-radius-lg, 12px); border: 1px solid var(--color-border-primary, #3f3f46);
    transition: all 0.15s;
  }
  .item:hover { border-color: var(--color-border-secondary, #52525b); }
  .item-left { display: flex; align-items: center; gap: 12px; }
  .item .emoji { font-size: 28px; }
  .item-info h4 { font-size: 14px; font-weight: 600; }
  .item-info .meta { font-size: 12px; color: var(--color-text-secondary, #a1a1aa); margin-top: 2px; }
  .remove-btn {
    padding: 7px 14px; border-radius: var(--border-radius-md, 8px); border: none;
    background: #ef444420; color: #ef4444; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;
  }
  .remove-btn:hover { background: #ef444440; }
  .remove-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .total-bar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 18px; background: var(--color-background-secondary, #1e1e24);
    border-radius: var(--border-radius-lg, 12px); border: 1px solid var(--color-border-primary, #3f3f46);
  }
  .total-bar .label { font-size: 16px; font-weight: 600; }
  .total-bar .amount { font-size: 22px; font-weight: 700; color: #4ade80; }
  .empty { text-align: center; padding: 40px; color: var(--color-text-secondary, #a1a1aa); font-size: 14px; }
`;

// ─── DOM Setup ────────────────────────────────────────────
const root = document.getElementById("root")!;
const style = document.createElement("style");
style.textContent = STYLES;
document.head.appendChild(style);

// ─── Render ───────────────────────────────────────────────
function render(data: ToolData) {
  const cart = data.cart || [];
  const total = data.total ?? cart.reduce((s, i) => s + i.price, 0);

  if (cart.length === 0) {
    root.innerHTML = `
      <div class="header">
        <h2>Shopping Cart</h2>
      </div>
      <div class="empty">Your cart is empty</div>
    `;
    return;
  }

  root.innerHTML = `
    <div class="header">
      <h2>Shopping Cart</h2>
      <span class="count">${cart.length} item${cart.length !== 1 ? "s" : ""}</span>
    </div>
    <div class="items">
      ${cart
        .map(
          (item) => `
        <div class="item">
          <div class="item-left">
            <span class="emoji">${item.image}</span>
            <div class="item-info">
              <h4>${item.name}</h4>
              <div class="meta">${item.category} · ₹${item.price.toLocaleString()}</div>
            </div>
          </div>
          <button class="remove-btn" data-id="${item.id}">Remove</button>
        </div>`
        )
        .join("")}
    </div>
    <div class="total-bar">
      <span class="label">Total</span>
      <span class="amount">₹${total.toLocaleString()}</span>
    </div>
  `;

  // Wire Remove buttons
  root.querySelectorAll<HTMLButtonElement>(".remove-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const productId = Number(btn.dataset.id);
      btn.disabled = true;
      btn.textContent = "Removing...";
      try {
        const result = await app.callServerTool({
          name: "remove_from_cart",
          arguments: { productId },
        });
        const text = result.content?.find((c) => c.type === "text")?.text;
        if (text) render(JSON.parse(text));
      } catch (e) {
        console.error("remove_from_cart failed:", e);
        btn.disabled = false;
        btn.textContent = "Remove";
      }
    });
  });
}

// ─── App Setup ────────────────────────────────────────────
const app = new App({ name: "Cart App", version: "1.0.0" });

app.ontoolresult = (result) => {
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (text) {
    try {
      render(JSON.parse(text));
    } catch {}
  }
};

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

// Bootstrap: check for injected data (legacy pattern)
const injected = (window as any).__MCP_TOOL_RESULT__;
if (injected) {
  render(injected);
}

app.connect();
