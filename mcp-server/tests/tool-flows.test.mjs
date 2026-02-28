import test from "node:test";
import assert from "node:assert/strict";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { createMCPServer } from "../src/index.js";

async function createClient() {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createMCPServer();
  const client = new Client({ name: "mcp-test-client", version: "1.0.0" });
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  return client;
}

async function callTool(client, name, args = {}) {
  return client.callTool({ name, arguments: args });
}

function getStructured(result) {
  return result.structuredContent;
}

test("core cart flow: add, get, remove", async () => {
  const client = await createClient();

  const initialCart = getStructured(await callTool(client, "get_cart"));
  assert.equal(initialCart.count, 0);

  const added = getStructured(await callTool(client, "add_to_cart", { productId: 1 }));
  assert.equal(added.success, true);
  assert.equal(added.count, 1);
  assert.equal(added.cart[0].id, 1);

  const cart = getStructured(await callTool(client, "get_cart"));
  assert.equal(cart.count, 1);
  assert.ok(cart.total > 0);

  const removed = getStructured(await callTool(client, "remove_from_cart", { productId: 1 }));
  assert.equal(removed.success, true);
  assert.equal(removed.count, 0);
});

test("checkout flow: place_order clears cart and returns order details", async () => {
  const client = await createClient();

  await callTool(client, "add_to_cart", { productId: 2 });
  await callTool(client, "add_to_cart", { productId: 3 });

  const checkout = getStructured(await callTool(client, "checkout"));
  assert.equal(checkout.count, 2);
  assert.ok(checkout.total > 0);

  const order = getStructured(
    await callTool(client, "place_order", {
      name: "Test User",
      email: "test@example.com",
      address: "123 Demo Street",
      city: "Bengaluru",
      pin: "560001",
    })
  );
  assert.match(order.orderId, /^ORD-/);
  assert.equal(order.items.length, 2);
  assert.ok(order.total > 0);

  const postOrderCart = getStructured(await callTool(client, "get_cart"));
  assert.equal(postOrderCart.count, 0);
});

test("wishlist flow: add deduplicates and remove works", async () => {
  const client = await createClient();

  const first = getStructured(await callTool(client, "add_to_wishlist", { productId: 4 }));
  assert.equal(first.success, true);
  assert.equal(first.count, 1);

  const second = getStructured(await callTool(client, "add_to_wishlist", { productId: 4 }));
  assert.equal(second.count, 1);

  const removed = getStructured(await callTool(client, "remove_from_wishlist", { productId: 4 }));
  assert.equal(removed.success, true);
  assert.equal(removed.count, 0);
});
