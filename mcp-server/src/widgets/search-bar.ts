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

function renderResults(products: Product[]): void {
  const resultsEl = document.getElementById("search-results");
  if (!resultsEl) return;

  if (products.length === 0) {
    resultsEl.innerHTML = `<div class="search-results__empty">No results found.</div>`;
    resultsEl.style.display = "";
    return;
  }

  resultsEl.innerHTML = products
    .map(
      (p) => `
    <div class="search-result-item" data-action="select-product" data-product-id="${p.id}">
      <img src="${p.image}" alt="${p.name}" class="search-result-item__image" />
      <div class="search-result-item__info">
        <span class="search-result-item__name">${p.name}</span>
        <span class="search-result-item__price">${formatPrice(p.price)}</span>
      </div>
    </div>`
    )
    .join("");
  resultsEl.style.display = "";
}

function clearResults(): void {
  const resultsEl = document.getElementById("search-results");
  if (resultsEl) {
    resultsEl.innerHTML = "";
    resultsEl.style.display = "none";
  }
}

// Search on Enter key
const searchInput = document.getElementById("search-input") as HTMLInputElement | null;
if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && searchInput.value.trim()) {
      callTool("search_products", { query: searchInput.value.trim() });
    }
  });
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  if (btn.dataset.action === "clear-search") {
    if (searchInput) searchInput.value = "";
    clearResults();
  }
  if (btn.dataset.action === "select-product") {
    const productId = btn.dataset.productId ? Number(btn.dataset.productId) : undefined;
    if (productId !== undefined) {
      callTool("get_product_detail", { productId });
    }
  }
  if (btn.dataset.action === "tag-search") {
    const query = btn.dataset.query ?? "";
    if (searchInput) searchInput.value = query;
    if (query) callTool("search_products", { query });
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected && _injected.products) {
  renderResults(_injected.products);
}
