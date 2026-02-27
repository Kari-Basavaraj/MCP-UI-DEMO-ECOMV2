import "./bridge"; // auto-resize

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

function formatPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}

function render(product: Product): void {
  const nameEl = document.getElementById("pt-name");
  const descEl = document.getElementById("pt-desc");
  const offTagEl = document.getElementById("pt-off-tag");
  const salePriceEl = document.getElementById("pt-sale-price");
  const originalPriceEl = document.getElementById("pt-original-price");
  const savingsEl = document.getElementById("pt-savings");
  const emiEl = document.getElementById("pt-emi");
  const imgEl = document.getElementById("pt-img") as HTMLImageElement | null;

  if (nameEl) nameEl.textContent = product.name;
  if (descEl) descEl.textContent = product.description || "Premium product with advanced features";
  if (imgEl && product.image) {
    imgEl.src = product.image;
    imgEl.alt = product.name;
  }

  const discount =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0;

  if (offTagEl) offTagEl.textContent = `${discount}% OFF`;
  if (salePriceEl) salePriceEl.textContent = formatPrice(product.price);
  if (originalPriceEl) originalPriceEl.textContent = product.originalPrice ? formatPrice(product.originalPrice) : "";
  if (savingsEl) savingsEl.textContent = product.originalPrice ? `You save ${formatPrice(product.originalPrice - product.price)}` : "";

  const emiMonthly = Math.round(product.price / 12);
  if (emiEl) emiEl.textContent = `EMI from ${formatPrice(emiMonthly)}/month`;
}

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected) {
  const p = _injected.product ?? (_injected.id && _injected.price ? _injected : null);
  if (p) render(p);
}
