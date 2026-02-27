import { callTool } from "./bridge";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
}

function render(product: Product): void {
  const container = document.getElementById("product-container");
  if (!container) return;
  const nameEl = document.getElementById("product-name");
  const priceEl = document.getElementById("product-price");
  const originalPriceEl = document.getElementById("product-original-price");
  const categoryEl = document.getElementById("product-category");
  const imageEl = document.getElementById("product-image") as HTMLImageElement | null;

  if (nameEl) nameEl.textContent = product.name;
  if (priceEl) priceEl.textContent = `₹${product.price.toLocaleString("en-IN")}`;
  if (originalPriceEl) {
    if (product.originalPrice && product.originalPrice > product.price) {
      originalPriceEl.textContent = `₹${product.originalPrice.toLocaleString("en-IN")}`;
      originalPriceEl.style.display = "";
    } else {
      originalPriceEl.style.display = "none";
    }
  }
  if (categoryEl) categoryEl.textContent = product.category;
  if (imageEl) { imageEl.src = product.image; imageEl.alt = product.name; }
  container.dataset.productId = String(product.id);
  container.style.display = "";
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  const container = document.getElementById("product-container");
  const productId = container?.dataset.productId ? Number(container.dataset.productId) : undefined;

  if (btn.dataset.action === "add-to-cart" && productId !== undefined) {
    btn.textContent = "Adding…";
    (btn as HTMLButtonElement).disabled = true;
    callTool("add_to_cart", { productId });
    setTimeout(() => { btn.textContent = "Add to Cart"; (btn as HTMLButtonElement).disabled = false; }, 2000);
  }
  if (btn.dataset.action === "details" && productId !== undefined) {
    callTool("get_product_detail", { productId });
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) render(_injected.product ?? _injected);
