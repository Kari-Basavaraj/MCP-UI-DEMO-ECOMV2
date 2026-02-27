import { callTool } from "./bridge";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(wishlist: Product[]): void {
  const countEl = document.getElementById("wl-count");
  const gridEl = document.getElementById("wl-grid");
  if (!gridEl) return;

  if (!wishlist || wishlist.length === 0) {
    if (countEl) countEl.textContent = "0 items";
    gridEl.innerHTML = `
      <div class="wl-empty">
        <div class="wl-empty__icon">♡</div>
        <h2 class="wl-empty__title">Your wishlist is empty</h2>
        <p class="wl-empty__text">Save items you love to your wishlist.</p>
      </div>`;
    return;
  }

  if (countEl) countEl.textContent = `${wishlist.length} item${wishlist.length !== 1 ? "s" : ""}`;

  gridEl.innerHTML = wishlist
    .map(
      (p) => `
    <div class="wl-item" data-product-id="${p.id}">
      <div class="wl-item__img-wrap">
        <img src="${p.image}" alt="${p.name}" />
        <button class="wl-item__remove" data-action="remove" data-product-id="${p.id}" title="Remove">✕</button>
      </div>
      <div class="wl-item__info">
        <span class="wl-item__cat">${p.category}</span>
        <h3 class="wl-item__name">${p.name}</h3>
        <span class="wl-item__price">${formatPrice(p.price)}</span>
      </div>
      <hr class="wl-item__divider" />
      <button class="wl-item__move-btn" data-action="move-to-cart" data-product-id="${p.id}">Move to Cart</button>
    </div>`
    )
    .join("");
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  const productId = Number(btn.dataset.productId);

  if (btn.dataset.action === "move-to-cart" && productId) {
    btn.textContent = "Moving…";
    (btn as HTMLButtonElement).disabled = true;
    callTool("add_to_cart", { productId });
    setTimeout(() => { btn.textContent = "Move to Cart"; (btn as HTMLButtonElement).disabled = false; }, 2000);
  } else if (btn.dataset.action === "remove" && productId) {
    const item = btn.closest(".wl-item");
    if (item) (item as HTMLElement).style.opacity = "0.4";
    callTool("remove_from_wishlist", { productId });
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) render(_injected.wishlist ?? _injected);
