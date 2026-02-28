import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGETS_DIR = path.resolve(__dirname, "../src/widgets");

function readWidget(file) {
  return fs.readFileSync(path.join(WIDGETS_DIR, file), "utf8");
}

function expectActionMapsToTool(source, action, tool) {
  const actionPattern = new RegExp(
    `(dataset\\.action\\s*===\\s*["']${action}["'])|(action\\s*===\\s*["']${action}["'])`,
    "g"
  );
  const toolPattern = new RegExp(`callTool\\(\\s*["']${tool}["']`, "g");
  assert.ok(actionPattern.test(source), `missing action "${action}"`);
  assert.ok(toolPattern.test(source), `missing tool call "${tool}"`);
}

function expectActionExists(source, action) {
  const actionPattern = new RegExp(
    `(dataset\\.action\\s*===\\s*["']${action}["'])|(action\\s*===\\s*["']${action}["'])`,
    "g"
  );
  assert.ok(actionPattern.test(source), `missing action "${action}"`);
}

test("product-grid action wiring contract", () => {
  const source = readWidget("product-grid.ts");
  expectActionMapsToTool(source, "add-to-cart", "add_to_cart");
  expectActionMapsToTool(source, "details", "get_product_detail");
  expectActionMapsToTool(source, "open-search", "search_products");
  expectActionExists(source, "local-filter");
});

test("cart + checkout action wiring contract", () => {
  const cartView = readWidget("cart-view.ts");
  expectActionMapsToTool(cartView, "remove", "remove_from_cart");
  expectActionMapsToTool(cartView, "checkout", "checkout");
  expectActionMapsToTool(cartView, "continue", "get_products");

  const checkoutForm = readWidget("checkout-form.ts");
  expectActionMapsToTool(checkoutForm, "place-order", "place_order");

  const orderConfirmation = readWidget("order-confirmation.ts");
  expectActionMapsToTool(orderConfirmation, "continue", "get_products");
});

test("wishlist + search action wiring contract", () => {
  const wishlist = readWidget("wishlist.ts");
  expectActionMapsToTool(wishlist, "move-to-cart", "add_to_cart");
  expectActionMapsToTool(wishlist, "remove", "remove_from_wishlist");

  const searchBar = readWidget("search-bar.ts");
  expectActionMapsToTool(searchBar, "select-product", "get_product_detail");
  expectActionMapsToTool(searchBar, "tag-search", "search_products");
});
