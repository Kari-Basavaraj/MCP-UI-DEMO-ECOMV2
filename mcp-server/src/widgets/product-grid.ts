import { App } from "@modelcontextprotocol/ext-apps";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

const app = new App({ name: "Product Grid", version: "1.0.0" });

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function renderGrid(products: Product[]): void {
  const grid = document.getElementById("product-grid");
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<p class="empty-state">No products found.</p>`;
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
        <div class="product-card__actions">
          <button data-action="add-to-cart" data-product-id="${p.id}" class="btn btn--primary">Add to Cart</button>
          <button data-action="details" data-product-id="${p.id}" class="btn btn--secondary">Details</button>
        </div>
      </div>
    </div>`
    )
    .join("");
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      const products: Product[] = data.products ?? [];
      renderGrid(products);
    } catch {
      // ignore parse errors
    }
  }
};

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.dataset.action;
  const productId = btn.dataset.productId ? Number(btn.dataset.productId) : undefined;

  if (action === "add-to-cart" && productId !== undefined) {
    const result = await app.callServerTool({ name: "add_to_cart", arguments: { productId } });
    const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
    if (text) {
      try {
        const data = JSON.parse(text);
        // Optionally re-render if the response includes updated product list
        if (data.products) {
          renderGrid(data.products);
        }
      } catch {
        // ignore
      }
    }
  }

  // "details" action is left to the host
});

app.connect();
