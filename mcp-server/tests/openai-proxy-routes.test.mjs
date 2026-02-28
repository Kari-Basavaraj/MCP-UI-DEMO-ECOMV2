import test from "node:test";
import assert from "node:assert/strict";
import { startOpenAIProxy } from "../src/openaiProxy.js";

test("openai proxy exposes health and tool routes", async (t) => {
  const server = startOpenAIProxy({
    port: 0,
    listTools: async () => [{ name: "get_products" }, { name: "get_cart" }],
    executeTool: async (name, args) => ({ ok: true, name, args }),
  });

  t.after(() => {
    server.close();
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const healthRes = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthRes.status, 200);
  const health = await healthRes.json();
  assert.equal(health.ok, true);
  assert.equal(typeof health.aiConfigured, "boolean");

  const toolsRes = await fetch(`${baseUrl}/api/tools`);
  assert.equal(toolsRes.status, 200);
  const tools = await toolsRes.json();
  assert.deepEqual(tools.tools.map((t) => t.name), ["get_products", "get_cart"]);

  const callRes = await fetch(`${baseUrl}/api/tools/add_to_cart`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ productId: 99 }),
  });
  assert.equal(callRes.status, 200);
  const call = await callRes.json();
  assert.deepEqual(call, { ok: true, name: "add_to_cart", args: { productId: 99 } });
});
