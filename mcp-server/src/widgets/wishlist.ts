import { App } from "@modelcontextprotocol/ext-apps";

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
}

const app = new App({ name: "Wishlist", version: "1.0.0" });

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(wishlist: Product[]): void {
  const container = document.getElementById("wishlist-container");
  if (!container) return;

  const emptyState = `
    <div class="wishlist__empty">
      <div class="wishlist__empty-icon">♡</div>
      <h2 class="wishlist__empty-title">Your wishlist is empty</h2>
      <p class="wishlist__empty-text">Save items you love to your wishlist and revisit them anytime.</p>
      <button class="wishlist__browse-btn" data-action="browse">Browse Products</button>
    </div>
  `;

  if (!wishlist || wishlist.length === 0) {
    container.innerHTML = `<div class="wishlist">${emptyState}</div>`;
    return;
  }

  container.innerHTML = `
    <div class="wishlist">
      <div class="wishlist__header">
        <h1 class="wishlist__title">My Wishlist</h1>
        <span class="wishlist__count">${wishlist.length} item${wishlist.length !== 1 ? "s" : ""}</span>
      </div>

      <div class="wishlist__grid">
        ${wishlist
          .map(
            (product) => `
          <div class="wishlist__card" data-product-id="${product.id}">
            <div class="wishlist__card-image">
              <img src="${product.image}" alt="${product.name}" />
              <button class="wishlist__remove-btn" data-action="remove" data-product-id="${product.id}" title="Remove from Wishlist">✕</button>
            </div>
            <div class="wishlist__card-info">
              <span class="wishlist__card-category">${product.category}</span>
              <h3 class="wishlist__card-name">${product.name}</h3>
              <span class="wishlist__card-price">${formatPrice(product.price)}</span>
            </div>
            <button class="wishlist__move-cart-btn" data-action="move-to-cart" data-product-id="${product.id}">Move to Cart</button>
          </div>`
          )
          .join("")}
      </div>
    </div>
  `;
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      if (data.wishlist) {
        render(data.wishlist);
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
    case "move-to-cart": {
      const productId = Number(btn.dataset.productId);
      if (productId) {
        await app.callServerTool({
          name: "add_to_cart",
          arguments: { productId },
        });
        await app.callServerTool({
          name: "remove_from_wishlist",
          arguments: { productId },
        });
      }
      break;
    }

    case "remove": {
      const productId = Number(btn.dataset.productId);
      if (productId) {
        await app.callServerTool({
          name: "remove_from_wishlist",
          arguments: { productId },
        });
      }
      break;
    }

    case "browse":
      await app.callServerTool({
        name: "get_products",
        arguments: {},
      });
      break;
  }
});

app.connect();
