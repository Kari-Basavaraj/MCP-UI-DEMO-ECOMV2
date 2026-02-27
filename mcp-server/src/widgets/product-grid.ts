import { callTool } from "./bridge";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  image: string;
}

let allProducts: Product[] = [];
let activeFilter = "All";

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function renderFilterTabs(categories: string[]): void {
  const tabsEl = document.getElementById("filter-tabs");
  if (!tabsEl) return;
  const cats = ["All", ...categories.filter((c) => c !== "All")];
  tabsEl.innerHTML = cats
    .map(
      (cat) =>
        `<button class="pg-tab${activeFilter === cat ? " pg-tab--active" : ""}" data-action="local-filter" data-category="${cat}">${cat}</button>`
    )
    .join("");
}

function formatOriginalPrice(p: Product): string {
  const orig = p.originalPrice ?? Math.round(p.price * 1.3);
  return `₹${orig.toLocaleString("en-IN")}`;
}

function renderGrid(products: Product[]): void {
  const grid = document.getElementById("product-grid");
  const countEl = document.getElementById("product-count");
  if (!grid) return;
  if (countEl) countEl.textContent = `${products.length} products`;
  if (products.length === 0) {
    grid.innerHTML = `<p class="empty-state">No products found.</p>`;
    return;
  }
  grid.innerHTML = products
    .map(
      (p) => `
    <div class="pg-product" data-action="details" data-product-id="${p.id}">
      <div class="pg-product__thumb">
        <img class="pg-product__img" src="${p.image}" alt="${p.name}" />
        <span class="pg-product__cat-tag">${p.category}</span>
      </div>
      <div class="pg-product__info">
        <h3 class="pg-product__name">${p.name}</h3>
        <div class="pg-product__price-row">
          <span class="pg-product__price-original">${formatOriginalPrice(p)}</span>
          <span class="pg-product__price">${formatPrice(p.price)}</span>
        </div>
        <div class="pg-product__actions">
          <button class="pg-product__btn" data-action="add-to-cart" data-product-id="${p.id}">Add to Cart</button>
          <button class="pg-product__btn--secondary" data-action="details" data-product-id="${p.id}">Details</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

function applyFilter(category: string): void {
  activeFilter = category;
  const filtered =
    category === "All"
      ? allProducts
      : allProducts.filter((p) => p.category === category);
  renderGrid(filtered);
  document.querySelectorAll<HTMLButtonElement>(".pg-tab").forEach((btn) => {
    btn.classList.toggle("pg-tab--active", btn.dataset.category === category);
  });
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  const action = btn.dataset.action;
  const productId = btn.dataset.productId ? Number(btn.dataset.productId) : undefined;

  if (action === "local-filter") {
    applyFilter(btn.dataset.category ?? "All");
    return;
  }
  if (action === "open-search") {
    callTool("search_products", { query: "" });
    return;
  }
  if (action === "add-to-cart" && productId !== undefined) {
    btn.textContent = "Adding…";
    (btn as HTMLButtonElement).disabled = true;
    callTool("add_to_cart", { productId });
    setTimeout(() => { btn.textContent = "Add to Cart"; (btn as HTMLButtonElement).disabled = false; }, 2000);
    return;
  }
  if (action === "details" && productId !== undefined) {
    if ((e.target as HTMLElement).closest('[data-action="add-to-cart"]')) return;
    callTool("get_product_detail", { productId });
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  allProducts = (_injected.products ?? []);
  const categories = _injected.categories ?? [...new Set(allProducts.map((p: Product) => p.category))];
  renderFilterTabs(categories);
  renderGrid(allProducts);
}
