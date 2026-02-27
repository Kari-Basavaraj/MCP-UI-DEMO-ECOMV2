import { callTool } from "./bridge";

interface ValidationError {
  field: string;
  message: string;
}

const REQUIRED_FIELDS = [
  { name: "firstName", label: "First Name" },
  { name: "lastName", label: "Last Name" },
  { name: "address", label: "Address" },
  { name: "city", label: "City" },
  { name: "pin", label: "PIN Code" },
  { name: "cardNumber", label: "Card Number" },
  { name: "expiry", label: "Expiry" },
  { name: "cvv", label: "CVV" },
];

function validate(): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of REQUIRED_FIELDS) {
    const input = document.getElementById(`field-${f.name}`) as HTMLInputElement | null;
    if (!input) continue;
    const value = input.value.trim();
    if (!value) {
      errors.push({ field: f.name, message: `${f.label} is required` });
      continue;
    }
    if (f.name === "pin" && !/^\d{6}$/.test(value)) {
      errors.push({ field: f.name, message: "Please enter a valid PIN code" });
    }
    if (f.name === "cardNumber" && value.replace(/\s/g, "").length < 13) {
      errors.push({ field: f.name, message: "Please enter a valid card number" });
    }
    if (f.name === "expiry" && !/^\d{2}\/\d{2}$/.test(value)) {
      errors.push({ field: f.name, message: "Use MM/YY format" });
    }
    if (f.name === "cvv" && !/^\d{3,4}$/.test(value)) {
      errors.push({ field: f.name, message: "CVV must be 3 or 4 digits" });
    }
  }
  return errors;
}

function showErrors(errors: ValidationError[]): void {
  for (const f of REQUIRED_FIELDS) {
    const errorEl = document.getElementById(`error-${f.name}`);
    const inputEl = document.getElementById(`field-${f.name}`);
    if (errorEl) errorEl.textContent = "";
    if (inputEl) inputEl.classList.remove("co-input--error");
  }
  for (const error of errors) {
    const errorEl = document.getElementById(`error-${error.field}`);
    const inputEl = document.getElementById(`field-${error.field}`);
    if (errorEl) errorEl.textContent = error.message;
    if (inputEl) inputEl.classList.add("co-input--error");
  }
}

function getFormData(): Record<string, string> {
  const data: Record<string, string> = {};
  for (const f of REQUIRED_FIELDS) {
    const input = document.getElementById(`field-${f.name}`) as HTMLInputElement | null;
    if (input) data[f.name] = input.value.trim();
  }
  return data;
}

document.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
  if (!btn) return;
  if (btn.dataset.action === "place-order") {
    const errors = validate();
    showErrors(errors);
    if (errors.length > 0) {
      const first = document.getElementById(`field-${errors[0].field}`);
      first?.focus();
      return;
    }
    const formData = getFormData();
    const origText = (document.getElementById("pay-btn") as HTMLElement)?.dataset.origText || "Place Order";
    btn.textContent = "Processing…";
    (btn as HTMLButtonElement).disabled = true;
    callTool("place_order", formData);
    setTimeout(() => { btn.textContent = origText; (btn as HTMLButtonElement).disabled = false; }, 3000);
  }
});

const _injected = (window as any).__MCP_TOOL_RESULT__;
if (_injected && _injected.total) {
  const payBtn = document.getElementById("pay-btn");
  if (payBtn) {
    const text = `Pay ₹${_injected.total.toLocaleString("en-IN")}`;
    payBtn.textContent = text;
    payBtn.dataset.origText = text;
  }
}
