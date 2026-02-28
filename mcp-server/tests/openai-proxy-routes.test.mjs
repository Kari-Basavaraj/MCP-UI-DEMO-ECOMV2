import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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

test("agentation webhook routes persist and resolve comments", async (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agentation-routes-"));
  const trackerJson = path.join(tempRoot, "tracker.json");
  const trackerMd = path.join(tempRoot, "tracker.md");

  const previousJson = process.env.AGENTATION_TRACKER_PATH;
  const previousMd = process.env.AGENTATION_TRACKER_MARKDOWN_PATH;
  process.env.AGENTATION_TRACKER_PATH = trackerJson;
  process.env.AGENTATION_TRACKER_MARKDOWN_PATH = trackerMd;

  const server = startOpenAIProxy({
    port: 0,
    listTools: async () => [],
    executeTool: async () => ({ ok: true }),
  });

  t.after(() => {
    server.close();
    if (previousJson == null) {
      delete process.env.AGENTATION_TRACKER_PATH;
    } else {
      process.env.AGENTATION_TRACKER_PATH = previousJson;
    }
    if (previousMd == null) {
      delete process.env.AGENTATION_TRACKER_MARKDOWN_PATH;
    } else {
      process.env.AGENTATION_TRACKER_MARKDOWN_PATH = previousMd;
    }
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const webhookRes = await fetch(`${baseUrl}/api/agentation/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      event: "annotation.add",
      annotation: {
        id: "ann-route-1",
        sessionId: "sess-route-1",
        url: "http://localhost:3000/",
        comment: "provider logo should use real icon",
        element: "ProviderBadge",
        elementPath: ".chat .provider-badge",
        status: "pending",
        timestamp: Date.now(),
      },
    }),
  });
  assert.equal(webhookRes.status, 200);
  const webhookBody = await webhookRes.json();
  assert.equal(webhookBody.ok, true);
  assert.equal(webhookBody.processedCount, 1);
  assert.equal(typeof webhookBody.linear, "object");
  assert.equal(webhookBody.linear.skipped, true);

  const listRes = await fetch(`${baseUrl}/api/agentation/comments`);
  assert.equal(listRes.status, 200);
  const listed = await listRes.json();
  assert.equal(listed.total, 1);
  assert.equal(listed.comments[0].id, "ann-route-1");
  assert.equal(listed.comments[0].status, "pending");

  const resolveRes = await fetch(`${baseUrl}/api/agentation/comments/ann-route-1/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      summary: "Fixed provider badge to render SVG logo.",
      commitSha: "deadbee",
    }),
  });
  assert.equal(resolveRes.status, 200);
  const resolved = await resolveRes.json();
  assert.equal(resolved.ok, true);
  assert.equal(resolved.comment.status, "resolved");
  assert.equal(resolved.comment.resolution.commitSha, "deadbee");
  assert.equal(typeof resolved.linear, "object");

  const overviewRes = await fetch(`${baseUrl}/api/agentation/overview`);
  assert.equal(overviewRes.status, 200);
  const overview = await overviewRes.json();
  assert.equal(overview.ok, true);
  assert.equal(typeof overview.linear, "object");

  const syncRes = await fetch(`${baseUrl}/api/agentation/sync-linear`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ syncAll: true }),
  });
  assert.equal(syncRes.status, 200);
  const sync = await syncRes.json();
  assert.equal(sync.skipped, true);
  assert.equal(sync.reason, "linear-sync-disabled");

  assert.equal(fs.existsSync(trackerJson), true);
  assert.equal(fs.existsSync(trackerMd), true);
});
