import { App } from "@modelcontextprotocol/ext-apps";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

const app = new App({ name: "Product Card", version: "1.0.0" });

function render(product: Product): void {
  const container = document.getElementById("product-container");
  if (!container) return;

  const nameEl = document.getElementById("product-name");
  const priceEl = document.getElementById("product-price");
  const categoryEl = document.getElementById("product-category");
  const imageEl = document.getElementById("product-image") as HTMLImageElement | null;

  if (nameEl) nameEl.textContent = product.name;
  if (priceEl) priceEl.textContent = `₹${product.price.toLocaleString("en-IN")}`;
  if (categoryEl) categoryEl.textContent = product.category;
  if (imageEl) {
    imageEl.src = product.image;
    imageEl.alt = product.name;
  }

  container.dataset.productId = String(product.id);
  container.style.display = "";
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      // Support both direct product and nested product field
      const product: Product = data.product ?? data;
      if (product.id !== undefined) {
        render(product);
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
  const container = document.getElementById("product-container");
  const productId = container?.dataset.productId ? Number(container.dataset.productId) : undefined;

  if (action === "add-to-cart" && productId !== undefined) {
    await app.callServerTool({ name: "add_to_cart", arguments: { productId } });
  }

  // "details" action is handled by the host via data-action="details"
});

app.connect();
