import { callTool } from "./bridge";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

let activeCategory = "";
let allProducts: Product[] = [];

const CATEGORY_EMOJIS: Record<string, string> = {
  All: "📦",
  Footwear: "👟",
  Clothing: "👕",
  Accessories: "⌚",
};

function getCategoryCount(category: string): number {
  if (category === "" || category === "All") return allProducts.length;
  return allProducts.filter((p) => p.category === category).length;
}

function renderCategories(categories: string[]): void {
  const container = document.getElementById("category-filter");
  if (!container) return;

  const allRow = `<button class="cf-row${activeCategory === "" ? " active" : ""}" data-action="filter" data-category="">
    <span class="cf-row__emoji">${CATEGORY_EMOJIS["All"] || "📦"}</span>
    <span class="cf-row__name">All</span>
    <span class="cf-row__count">${getCategoryCount("")}</span>
  </button>`;

  container.innerHTML =
    allRow +
    categories
      .filter((cat) => cat !== "All")
      .map(
        (cat) =>
          `<button class="cf-row${activeCategory === cat ? " active" : ""}" data-action="filter" data-category="${cat}">
            <span class="cf-row__emoji">${CATEGORY_EMOJIS[cat] || "🏷️"}</span>
            <span class="cf-row__name">${cat}</span>
            <span class="cf-row__count">${getCategoryCount(cat)}</span>
          </button>`
      )
      .join("");
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  if (btn.dataset.action === "filter") {
    const category = btn.dataset.category ?? "";
    activeCategory = category;

    // Update active row styling immediately
    const container = document.getElementById("category-filter");
    if (container) {
      container.querySelectorAll(".cf-row").forEach((row) => {
        row.classList.remove("active");
        if ((row as HTMLElement).dataset.category === category) {
          row.classList.add("active");
        }
      });
    }

    // Fire through the chat so LLM shows the right grid
    if (category === "") {
      callTool("get_products", {});
    } else {
      callTool("filter_products", { category });
    }
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  if (_injected.products) allProducts = _injected.products;
  renderCategories(_injected.categories ?? []);
}
