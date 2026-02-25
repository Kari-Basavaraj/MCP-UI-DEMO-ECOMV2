import { App } from "@modelcontextprotocol/ext-apps";

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

const app = new App({ name: "Cart View", version: "1.0.0" });

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(data: CartData): void {
  const emptyEl = document.getElementById("empty-cart");
  const itemsEl = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");

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
            <span class="cart-item__price">${formatPrice(item.price)}</span>
          </div>
          <button data-action="remove" data-product-id="${item.id}" class="btn btn--danger" aria-label="Remove ${item.name}">✕</button>
        </div>`
        )
        .join("");
    }
  }

  if (totalEl) totalEl.textContent = formatPrice(data.total);
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data: CartData = JSON.parse(text);
      render(data);
    } catch {
      // ignore parse errors
    }
  }
};

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === "remove") {
    const productId = btn.dataset.productId ? Number(btn.dataset.productId) : undefined;
    if (productId !== undefined) {
      const result = await app.callServerTool({ name: "remove_from_cart", arguments: { productId } });
      const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
      if (text) {
        try {
          const data: CartData = JSON.parse(text);
          render(data);
        } catch {
          // ignore
        }
      }
    }
  }

  // "checkout" action is left to the host via data-action="checkout"
});

// Fallback: read pre-injected data when ext-apps bridge is not available
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  render(_injected);
}

app.connect();
