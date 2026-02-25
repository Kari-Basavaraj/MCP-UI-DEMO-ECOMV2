import { App } from "@modelcontextprotocol/ext-apps";

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  pattern?: string;
}

interface ValidationError {
  field: string;
  message: string;
}

const app = new App({ name: "Checkout Form", version: "1.0.0" });

const FIELDS: FormField[] = [
  { name: "name", label: "Full Name", type: "text", required: true, placeholder: "Enter your full name" },
  { name: "email", label: "Email Address", type: "email", required: true, placeholder: "you@example.com" },
  { name: "phone", label: "Phone Number", type: "tel", required: false, placeholder: "+91 XXXXX XXXXX" },
  { name: "address", label: "Street Address", type: "text", required: true, placeholder: "House no., Street name" },
  { name: "city", label: "City", type: "text", required: true, placeholder: "City" },
  { name: "state", label: "State", type: "text", required: false, placeholder: "State" },
  { name: "pin", label: "PIN Code", type: "text", required: true, placeholder: "6-digit PIN", pattern: "\\d{6}" },
];

const PAYMENT_METHODS = [
  { value: "upi", label: "UPI" },
  { value: "card", label: "Credit / Debit Card" },
  { value: "cod", label: "Cash on Delivery" },
  { value: "netbanking", label: "Net Banking" },
];

function renderForm(): void {
  const container = document.getElementById("checkout-container");
  if (!container) return;

  container.innerHTML = `
    <div class="checkout">
      <h1 class="checkout__title">Checkout</h1>
      <form class="checkout__form" id="checkout-form" novalidate>
        <fieldset class="checkout__fieldset">
          <legend class="checkout__legend">Shipping Details</legend>
          ${FIELDS.map(
            (field) => `
            <div class="checkout__field" data-field="${field.name}">
              <label class="checkout__label" for="field-${field.name}">
                ${field.label}${field.required ? ' <span class="checkout__required">*</span>' : ""}
              </label>
              <input
                class="checkout__input"
                id="field-${field.name}"
                name="${field.name}"
                type="${field.type}"
                placeholder="${field.placeholder || ""}"
                ${field.required ? "required" : ""}
                ${field.pattern ? `pattern="${field.pattern}"` : ""}
              />
              <span class="checkout__error" id="error-${field.name}"></span>
            </div>`
          ).join("")}
        </fieldset>

        <fieldset class="checkout__fieldset">
          <legend class="checkout__legend">Payment Method</legend>
          <div class="checkout__payment-methods">
            ${PAYMENT_METHODS.map(
              (method, i) => `
              <label class="checkout__payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="${method.value}"
                  ${i === 0 ? "checked" : ""}
                  class="checkout__radio"
                />
                <span class="checkout__payment-label">${method.label}</span>
              </label>`
            ).join("")}
          </div>
        </fieldset>

        <div class="checkout__actions">
          <button type="submit" class="checkout__submit-btn" data-action="place-order">Place Order</button>
        </div>
      </form>
    </div>
  `;

  const form = document.getElementById("checkout-form") as HTMLFormElement;
  form?.addEventListener("submit", handleSubmit);
}

function validate(): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of FIELDS) {
    if (!field.required) continue;

    const input = document.getElementById(`field-${field.name}`) as HTMLInputElement | null;
    if (!input) continue;

    const value = input.value.trim();

    if (!value) {
      errors.push({ field: field.name, message: `${field.label} is required` });
      continue;
    }

    if (field.name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push({ field: field.name, message: "Please enter a valid email address" });
    }

    if (field.name === "pin" && !/^\d{6}$/.test(value)) {
      errors.push({ field: field.name, message: "PIN code must be 6 digits" });
    }
  }

  return errors;
}

function showErrors(errors: ValidationError[]): void {
  // Clear all previous errors
  for (const field of FIELDS) {
    const errorEl = document.getElementById(`error-${field.name}`);
    const inputEl = document.getElementById(`field-${field.name}`);
    if (errorEl) errorEl.textContent = "";
    if (inputEl) inputEl.classList.remove("checkout__input--error");
  }

  // Show new errors
  for (const error of errors) {
    const errorEl = document.getElementById(`error-${error.field}`);
    const inputEl = document.getElementById(`field-${error.field}`);
    if (errorEl) errorEl.textContent = error.message;
    if (inputEl) inputEl.classList.add("checkout__input--error");
  }
}

function getFormData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const field of FIELDS) {
    const input = document.getElementById(`field-${field.name}`) as HTMLInputElement | null;
    if (input) data[field.name] = input.value.trim();
  }

  const paymentRadio = document.querySelector<HTMLInputElement>(
    'input[name="paymentMethod"]:checked'
  );
  data.paymentMethod = paymentRadio?.value || "upi";

  return data;
}

async function handleSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const errors = validate();
  showErrors(errors);

  if (errors.length > 0) {
    // Focus the first field with an error
    const firstErrorField = document.getElementById(`field-${errors[0].field}`);
    firstErrorField?.focus();
    return;
  }

  const formData = getFormData();

  const submitBtn = document.querySelector<HTMLButtonElement>("[data-action='place-order']");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Placing Order…";
  }

  await app.callServerTool({
    name: "place_order",
    arguments: formData,
  });

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order";
  }
}

app.ontoolresult = (result) => {
  const text = (result.content?.find((c: any) => c.type === "text") as any)?.text;
  if (text) {
    try {
      const data = JSON.parse(text);
      if (data.orderId) {
        // Order placed successfully — could render confirmation inline
        const container = document.getElementById("checkout-container");
        if (container) {
          container.innerHTML = `
            <div class="checkout__success">
              <div class="checkout__success-icon">✓</div>
              <h2 class="checkout__success-title">Order Placed Successfully!</h2>
              <p class="checkout__success-order-id">Order ID: <strong>${data.orderId}</strong></p>
              <p class="checkout__success-delivery">Estimated Delivery: ${data.estimatedDelivery}</p>
              <p class="checkout__success-total">Total: ₹${data.total.toLocaleString("en-IN")}</p>
              <button class="checkout__continue-btn" data-action="continue-shopping">Continue Shopping</button>
            </div>
          `;
        }
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
    case "continue-shopping":
      await app.callServerTool({
        name: "get_products",
        arguments: {},
      });
      break;
  }
});

// Initial render
renderForm();

// Fallback: read pre-injected data when ext-apps bridge is not available
const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected && _injected.orderId) {
  // Show order success
  const container = document.getElementById("checkout-form");
  if (container) container.innerHTML = `<div class="success"><h2>✅ Order #${_injected.orderId}</h2><p>Total: ₹${_injected.total?.toLocaleString("en-IN") ?? "0"}</p></div>`;
}

app.connect();
