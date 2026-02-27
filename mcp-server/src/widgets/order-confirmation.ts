import { callTool } from "./bridge";

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

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(order: OrderData): void {
  const orderNumEl = document.getElementById("order-number");
  const deliveryEl = document.getElementById("delivery-date");
  const itemsEl = document.getElementById("order-items");
  const totalEl = document.getElementById("order-total");

  if (orderNumEl) orderNumEl.textContent = order.orderId;
  if (deliveryEl) deliveryEl.textContent = order.estimatedDelivery;
  if (totalEl) totalEl.textContent = formatPrice(order.total);

  if (itemsEl) {
    itemsEl.innerHTML = order.items
      .map(
        (item) => `
      <div class="oc-item">
        <img class="oc-item__thumb" src="${item.image}" alt="${item.name}" />
        <div class="oc-item__info">
          <span class="oc-item__name">${item.name}</span>
          <span class="oc-item__cat">${item.category}</span>
        </div>
        <span class="oc-item__price">${formatPrice(item.price)}</span>
      </div>`
      )
      .join("");
  }
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  if (btn.dataset.action === "continue") {
    callTool("get_products", {});
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected && _injected.orderId) render(_injected);
