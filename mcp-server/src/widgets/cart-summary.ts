import { App } from "@modelcontextprotocol/ext-apps";

interface CartData {
  view: string;
  cart: unknown[];
  total: number;
  count: number;
}

const app = new App({ name: "Cart Summary", version: "1.0.0" });

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(data: CartData): void {
  const countEl = document.getElementById("item-count");
  const totalEl = document.getElementById("cart-total-price");

  if (countEl) {
    countEl.textContent = String(data.count);
    countEl.style.display = data.count > 0 ? "" : "none";
  }

  if (totalEl) {
    totalEl.textContent = formatPrice(data.total);
  }
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data: CartData = JSON.parse(text);
      render(data);
    } catch {
      // ignore parse errors
    }
  }
};

document.addEventListener("click", async (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;

  // "open-cart" action is handled by the host via data-action="open-cart"
});

app.connect();
