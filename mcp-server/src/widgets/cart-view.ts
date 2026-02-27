import { callTool } from "./bridge";

interface CartItem {
  cartId: number;
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

interface CartData {
  view: string;
  cart: CartItem[];
  total: number;
  count: number;
}

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(data: CartData): void {
  const emptyEl = document.getElementById("empty-cart");
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  const countEl = document.getElementById("cart-count");

  if (countEl) countEl.textContent = `${data.count} items`;

  if (data.cart.length === 0) {
    if (emptyEl) emptyEl.style.display = "";
    if (itemsEl) itemsEl.style.display = "none";
  } else {
    if (emptyEl) emptyEl.style.display = "none";
    if (itemsEl) {
      itemsEl.style.display = "";
      itemsEl.innerHTML = data.cart
        .map(
          (item) => `
        <div class="cart-item" data-product-id="${item.id}">
          <img src="${item.image}" alt="${item.name}" class="cart-item__image" />
          <div class="cart-item__info">
            <span class="cart-item__name">${item.name}</span>
            <span class="cart-item__category">${item.category}</span>
            <span class="cart-item__qty">Qty: 1</span>
          </div>
          <span class="cart-item__price">${formatPrice(item.price)}</span>
          <button class="cart-item__remove" data-action="remove" data-product-id="${item.id}" aria-label="Remove ${item.name}">✕</button>
        </div>`
        )
        .join("");
    }
  }
  if (totalEl) totalEl.textContent = formatPrice(data.total);
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  if (btn.dataset.action === "remove") {
    const productId = btn.dataset.productId ? Number(btn.dataset.productId) : undefined;
    if (productId !== undefined) {
      // Visual removal
      const row = btn.closest(".cart-item");
      if (row) (row as HTMLElement).style.opacity = "0.4";
      callTool("remove_from_cart", { productId });
    }
  }
  if (btn.dataset.action === "checkout") {
    btn.textContent = "Loading…";
    (btn as HTMLButtonElement).disabled = true;
    callTool("checkout", {});
    setTimeout(() => { btn.textContent = "Proceed to Checkout"; (btn as HTMLButtonElement).disabled = false; }, 2000);
  }
  if (btn.dataset.action === "continue") {
    callTool("get_products", {});
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) render(_injected);
