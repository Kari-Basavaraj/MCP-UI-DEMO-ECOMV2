import { App } from "@modelcontextprotocol/ext-apps";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  originalPrice?: number;
  inStock?: boolean;
}

type PriceState = "on-sale" | "regular" | "out-of-stock";

const app = new App({ name: "Price Tag", version: "1.0.0" });

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function getPriceState(product: Product): PriceState {
  if (product.inStock === false) return "out-of-stock";
  if (product.originalPrice && product.originalPrice > product.price) return "on-sale";
  return "regular";
}

function render(product: Product): void {
  const container = document.getElementById("price-tag");
  if (!container) return;

  const state = getPriceState(product);
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  let priceHTML = "";

  switch (state) {
    case "on-sale":
      priceHTML = `
        <div class="price-tag price-tag--on-sale">
          <span class="price-tag__badge">${discount}% OFF</span>
          <div class="price-tag__prices">
            <span class="price-tag__original"><s>${formatPrice(product.originalPrice!)}</s></span>
            <span class="price-tag__sale">${formatPrice(product.price)}</span>
          </div>
          <span class="price-tag__savings">You save ${formatPrice(product.originalPrice! - product.price)}</span>
        </div>
      `;
      break;

    case "regular":
      priceHTML = `
        <div class="price-tag price-tag--regular">
          <span class="price-tag__current">${formatPrice(product.price)}</span>
        </div>
      `;
      break;

    case "out-of-stock":
      priceHTML = `
        <div class="price-tag price-tag--out-of-stock">
          <span class="price-tag__current price-tag__current--dimmed">${formatPrice(product.price)}</span>
          <span class="price-tag__stock-label">Out of Stock</span>
        </div>
      `;
      break;
  }

  container.innerHTML = priceHTML;
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      if (data.product) {
        render(data.product);
      } else if (data.id && data.price !== undefined) {
        // Direct product object
        render(data as Product);
      }
    } catch {
      /* fallback */
    }
  }
};

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  const action = btn.dataset.action;

  switch (action) {
    case "refresh-price": {
      const productId = Number(btn.dataset.productId);
      if (productId) {
        await app.callServerTool({
          name: "get_product_detail",
          arguments: { productId },
        });
      }
      break;
    }
  }
});

// Fallback: read pre-injected data when ext-apps bridge is not available
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  render(_injected.product ?? (_injected.id && _injected.price ? _injected : null));
}

app.connect();
