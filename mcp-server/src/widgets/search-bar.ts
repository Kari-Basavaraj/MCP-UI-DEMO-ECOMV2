import { App } from "@modelcontextprotocol/ext-apps";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

const app = new App({ name: "Search Bar", version: "1.0.0" });

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 300;

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

async function performSearch(query: string): Promise<void> {
  if (!query.trim()) {
    clearResults();
    return;
  }

  const result = await app.callServerTool({ name: "search_products", arguments: { query } });
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      const products: Product[] = data.products ?? [];
      renderResults(products);
    } catch {
      // ignore
    }
  }
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      if (data.products) {
        renderResults(data.products);
      }
    } catch {
      // ignore parse errors
    }
  }
};

function setupListeners(): void {
  const input = document.getElementById("search-input") as HTMLInputElement | null;

  if (input) {
    input.addEventListener("input", () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        performSearch(input.value);
      }, DEBOUNCE_MS);
    });
  }
}

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === "clear-search") {
    const input = document.getElementById("search-input") as HTMLInputElement | null;
    if (input) input.value = "";
    clearResults();
  }

  // "select-product" action is left to the host
});

// Set up input listeners once DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupListeners);
} else {
  setupListeners();
}

// Fallback: read pre-injected data when ext-apps bridge is not available
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  renderResults(_injected.products ?? []);
}

app.connect();
