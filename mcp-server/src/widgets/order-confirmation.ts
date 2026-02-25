import { App } from "@modelcontextprotocol/ext-apps";

interface OrderItem {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  cartId: number;
}

interface OrderData {
  orderId: string;
  items: OrderItem[];
  total: number;
  estimatedDelivery: string;
}

const app = new App({ name: "Order Confirmation", version: "1.0.0" });

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(order: OrderData): void {
  const container = document.getElementById("order-confirmation");
  if (!container) return;

  container.innerHTML = `
    <div class="order-confirmation">
      <div class="order-confirmation__header">
        <div class="order-confirmation__icon">✓</div>
        <h1 class="order-confirmation__title">Order Confirmed!</h1>
        <p class="order-confirmation__subtitle">Thank you for your purchase</p>
      </div>

      <div class="order-confirmation__details">
        <div class="order-confirmation__row">
          <span class="order-confirmation__label">Order Number</span>
          <span class="order-confirmation__value" id="order-number">${order.orderId}</span>
        </div>
        <div class="order-confirmation__row">
          <span class="order-confirmation__label">Estimated Delivery</span>
          <span class="order-confirmation__value" id="delivery-date">${order.estimatedDelivery}</span>
        </div>
      </div>

      <div class="order-confirmation__items">
        <h2 class="order-confirmation__section-title">Items Ordered</h2>
        <ul class="order-confirmation__item-list" id="order-items">
          ${order.items
            .map(
              (item) => `
            <li class="order-confirmation__item">
              <img class="order-confirmation__item-image" src="${item.image}" alt="${item.name}" />
              <div class="order-confirmation__item-info">
                <span class="order-confirmation__item-name">${item.name}</span>
                <span class="order-confirmation__item-category">${item.category}</span>
              </div>
              <span class="order-confirmation__item-price">${formatPrice(item.price)}</span>
            </li>`
            )
            .join("")}
        </ul>
      </div>

      <div class="order-confirmation__total">
        <span class="order-confirmation__total-label">Total</span>
        <span class="order-confirmation__total-value" id="order-total">${formatPrice(order.total)}</span>
      </div>

      <div class="order-confirmation__actions">
        <button class="order-confirmation__continue-btn" data-action="continue">Continue Shopping</button>
      </div>
    </div>
  `;
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data: OrderData = JSON.parse(text);
      if (data.orderId) {
        render(data);
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
    case "continue":
      // Notify host or navigate back to product listing
      await app.callServerTool({
        name: "get_products",
        arguments: {},
      });
      break;
  }
});

// Fallback: read pre-injected data when ext-apps bridge is not available
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  render(_injected);
}

app.connect();
