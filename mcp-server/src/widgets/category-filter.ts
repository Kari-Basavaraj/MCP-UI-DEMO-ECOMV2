import { App } from "@modelcontextprotocol/ext-apps";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

interface FilterResult {
  categories?: string[];
  products?: Product[];
}

const app = new App({ name: "Category Filter", version: "1.0.0" });

let activeCategory = "";

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function renderCategories(categories: string[]): void {
  const container = document.getElementById("category-filter");
  if (!container) return;

  const allPill = `<button class="pill${activeCategory === "" ? " active" : ""}" data-action="filter" data-category="">All</button>`;

  container.innerHTML =
    allPill +
    categories
      .map(
        (cat) =>
          `<button class="pill${activeCategory === cat ? " active" : ""}" data-action="filter" data-category="${cat}">${cat}</button>`
      )
      .join("");
}

function renderProducts(products: Product[]): void {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<p class="empty-state">No products in this category.</p>`;
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
    <div class="product-card" data-product-id="${p.id}">
      <img src="${p.image}" alt="${p.name}" class="product-card__image" />
      <div class="product-card__body">
        <h3 class="product-card__name">${p.name}</h3>
        <span class="product-card__category">${p.category}</span>
        <span class="product-card__price">${formatPrice(p.price)}</span>
      </div>
    </div>`
    )
    .join("");
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data: FilterResult = JSON.parse(text);
      if (data.categories) {
        renderCategories(data.categories);
      }
      if (data.products) {
        renderProducts(data.products);
      }
    } catch {
      // ignore parse errors
    }
  }
};

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.dataset.action;

  if (action === "filter") {
    const category = btn.dataset.category ?? "";
    activeCategory = category;

    // Update active pill immediately
    const container = document.getElementById("category-filter");
    if (container) {
      container.querySelectorAll(".pill").forEach((pill) => {
        pill.classList.remove("active");
        if ((pill as HTMLElement).dataset.category === category) {
          pill.classList.add("active");
        }
      });
    }

    if (category === "") {
      // Fetch all products
      const result = await app.callServerTool({ name: "get_products", arguments: {} });
      const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
      if (text) {
        try {
          const data = JSON.parse(text);
          if (data.products) renderProducts(data.products);
          if (data.categories) renderCategories(data.categories);
        } catch {
          // ignore
        }
      }
    } else {
      const result = await app.callServerTool({ name: "filter_products", arguments: { category } });
      const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
      if (text) {
        try {
          const data = JSON.parse(text);
          if (data.products) renderProducts(data.products);
          if (data.categories) renderCategories(data.categories);
        } catch {
          // ignore
        }
      }
    }
  }
});

// Fallback: read pre-injected data when ext-apps bridge is not available
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  renderCategories(_injected.categories ?? []);
  renderProducts(_injected.products ?? []);
}

app.connect();
