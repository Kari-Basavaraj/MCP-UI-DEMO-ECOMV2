import { callTool } from "./bridge";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description?: string;
  originalPrice?: number;
  inStock?: boolean;
}

let selectedSize = "M";
let quantity = 1;
let currentProductId = 0;

function fmt(p: number): string {
  return `₹${p.toLocaleString("en-IN")}`;
}

function render(product: Product): void {
  currentProductId = product.id;
  const img = document.getElementById("pd-img") as HTMLImageElement | null;
  if (img) { img.src = product.image; img.alt = product.name; }

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  const badge = document.getElementById("pd-badge");
  if (badge) {
    if (discount > 0) { badge.textContent = `${discount}% OFF`; badge.style.display = ""; }
    else { badge.style.display = "none"; }
  }
  const cat = document.getElementById("pd-category");
  if (cat) cat.textContent = product.category.toUpperCase();
  const name = document.getElementById("pd-name");
  if (name) name.textContent = product.name;
  const cur = document.getElementById("pd-current");
  if (cur) cur.textContent = fmt(product.price);
  const orig = document.getElementById("pd-original");
  if (orig) {
    if (product.originalPrice && discount > 0) { orig.textContent = fmt(product.originalPrice); orig.style.display = ""; }
    else { orig.style.display = "none"; }
  }
  const discEl = document.getElementById("pd-discount");
  if (discEl) {
    if (discount > 0) { discEl.textContent = `${discount}% OFF`; discEl.style.display = ""; }
    else { discEl.style.display = "none"; }
  }
  const desc = document.getElementById("pd-desc");
  if (desc) desc.textContent = product.description || "";
  quantity = 1;
  updateQuantityDisplay();
  selectedSize = "M";
  updateSizeButtons();
}

function updateQuantityDisplay(): void {
  const el = document.getElementById("qty-display");
  if (el) el.textContent = String(quantity);
}

function updateSizeButtons(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-action='select-size']").forEach((btn) => {
    btn.classList.toggle("pd-size-btn--active", btn.dataset.size === selectedSize);
  });
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  switch (btn.dataset.action) {
    case "select-size":
      selectedSize = btn.dataset.size || "M";
      updateSizeButtons();
      break;
    case "increase-qty":
      quantity = Math.min(quantity + 1, 10);
      updateQuantityDisplay();
      break;
    case "decrease-qty":
      quantity = Math.max(quantity - 1, 1);
      updateQuantityDisplay();
      break;
    case "add-to-cart":
      if (currentProductId) {
        btn.textContent = "Adding…";
        (btn as HTMLButtonElement).disabled = true;
        callTool("add_to_cart", { productId: currentProductId });
        setTimeout(() => { btn.textContent = "Add to Cart"; (btn as HTMLButtonElement).disabled = false; }, 2000);
      }
      break;
    case "add-to-wishlist":
      if (currentProductId) {
        btn.textContent = "Saving…";
        (btn as HTMLButtonElement).disabled = true;
        callTool("add_to_wishlist", { productId: currentProductId });
        setTimeout(() => { btn.textContent = "♡ Wishlist"; (btn as HTMLButtonElement).disabled = false; }, 2000);
      }
      break;
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) render(_injected.product);
