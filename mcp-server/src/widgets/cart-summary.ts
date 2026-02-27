import { callTool } from "./bridge";

interface CartData {
  view: string;
  cart: unknown[];
  total: number;
  count: number;
}

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(data: CartData): void {
  const countEl = document.getElementById("item-count");
  const totalEl = document.getElementById("cart-total-price");
  const subtotalEl = document.getElementById("cs-subtotal");
  const discountEl = document.getElementById("cs-discount");
  const taxEl = document.getElementById("cs-tax");
  const savingsEl = document.getElementById("cs-savings");

  if (countEl) countEl.textContent = String(data.count);
  const subtotal = Math.round(data.total * 1.15);
  const discount = subtotal - data.total;
  const tax = Math.round(data.total * 0.05);

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (discountEl) discountEl.textContent = `−${formatPrice(discount)}`;
  if (taxEl) taxEl.textContent = formatPrice(tax);
  if (totalEl) totalEl.textContent = formatPrice(data.total);
  if (savingsEl) savingsEl.textContent = `You save ${formatPrice(discount)} on this order!`;
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  if (btn.dataset.action === "open-cart") {
    callTool("get_cart", {});
  }
  if (btn.dataset.action === "place-order") {
    callTool("checkout", {});
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) render(_injected);
