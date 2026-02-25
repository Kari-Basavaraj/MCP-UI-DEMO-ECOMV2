import { App } from "@modelcontextprotocol/ext-apps";

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

const app = new App({ name: "Product Detail", version: "1.0.0" });

let selectedSize = "M";
let quantity = 1;

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(product: Product): void {
  const container = document.getElementById("product-detail");
  if (!container) return;

  const sizes = ["S", "M", "L", "XL"];
  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  container.innerHTML = `
    <div class="product-detail">
      <div class="product-detail__image">
        <img src="${product.image}" alt="${product.name}" />
      </div>
      <div class="product-detail__info">
        <span class="product-detail__category">${product.category}</span>
        <h1 class="product-detail__name">${product.name}</h1>
        <div class="product-detail__price">
          <span class="product-detail__current-price">${formatPrice(product.price)}</span>
          ${
            product.originalPrice && discount > 0
              ? `<span class="product-detail__original-price"><s>${formatPrice(product.originalPrice)}</s></span>
                 <span class="product-detail__discount">${discount}% off</span>`
              : ""
          }
        </div>
        ${product.description ? `<p class="product-detail__description">${product.description}</p>` : ""}

        <div class="product-detail__sizes">
          <span class="product-detail__label">Size:</span>
          <div class="product-detail__size-options">
            ${sizes
              .map(
                (s) =>
                  `<button class="product-detail__size-btn${s === selectedSize ? " product-detail__size-btn--active" : ""}" data-action="select-size" data-size="${s}">${s}</button>`
              )
              .join("")}
          </div>
        </div>

        <div class="product-detail__quantity">
          <span class="product-detail__label">Quantity:</span>
          <div class="product-detail__quantity-controls">
            <button class="product-detail__qty-btn" data-action="decrease-qty">−</button>
            <span class="product-detail__qty-value" id="qty-display">${quantity}</span>
            <button class="product-detail__qty-btn" data-action="increase-qty">+</button>
          </div>
        </div>

        <div class="product-detail__actions">
          <button class="product-detail__add-cart" data-action="add-to-cart" data-product-id="${product.id}">Add to Cart</button>
          <button class="product-detail__add-wishlist" data-action="add-to-wishlist" data-product-id="${product.id}">♡ Add to Wishlist</button>
        </div>
      </div>
    </div>
  `;
}

function updateQuantityDisplay(): void {
  const qtyEl = document.getElementById("qty-display");
  if (qtyEl) qtyEl.textContent = String(quantity);
}

function updateSizeButtons(): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-action='select-size']");
  buttons.forEach((btn) => {
    btn.classList.toggle("product-detail__size-btn--active", btn.dataset.size === selectedSize);
  });
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      if (data.product) {
        render(data.product);
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

    case "add-to-cart": {
      const productId = Number(btn.dataset.productId);
      if (productId) {
        await app.callServerTool({
          name: "add_to_cart",
          arguments: { productId },
        });
      }
      break;
    }

    case "add-to-wishlist": {
      const productId = Number(btn.dataset.productId);
      if (productId) {
        await app.callServerTool({
          name: "add_to_wishlist",
          arguments: { productId },
        });
      }
      break;
    }
  }
});

app.connect();
