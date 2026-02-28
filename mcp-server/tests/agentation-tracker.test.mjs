import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  listAgentationComments,
  processAgentationWebhook,
  resolveAgentationComment,
} from "../src/agentationTracker.js";

function withTempTracker(t) {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agentation-tracker-"));
  const jsonPath = path.join(tempRoot, "tracker.json");
  const mdPath = path.join(tempRoot, "tracker.md");

  const previousJson = process.env.AGENTATION_TRACKER_PATH;
  const previousMd = process.env.AGENTATION_TRACKER_MARKDOWN_PATH;
  process.env.AGENTATION_TRACKER_PATH = jsonPath;
  process.env.AGENTATION_TRACKER_MARKDOWN_PATH = mdPath;

  t.after(() => {
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

  return { jsonPath, mdPath };
}

test("agentation tracker persists webhook events and auto-acknowledges on submit", (t) => {
  const { jsonPath, mdPath } = withTempTracker(t);

  const annotation = {
    id: "ann-1",
    sessionId: "sess-1",
    url: "http://localhost:3000/",
    comment: "logo should adapt in light and dark mode",
    element: "Provider badge",
    elementPath: ".chat .provider-badge",
    status: "pending",
    timestamp: Date.now(),
  };

  const addResult = processAgentationWebhook({
    event: "annotation.add",
    annotation,
  });
  assert.equal(addResult.ok, true);
  assert.equal(addResult.processedCount, 1);
  assert.equal(addResult.stats.pending, 1);

  const submitResult = processAgentationWebhook({
    event: "submit",
    output: "Please implement this",
    annotations: [annotation],
    url: "http://localhost:3000/",
  });
  assert.equal(submitResult.ok, true);
  assert.equal(submitResult.stats.acknowledged, 1);

  const listed = listAgentationComments();
  assert.equal(listed.total, 1);
  assert.equal(listed.comments[0].status, "acknowledged");

  assert.equal(fs.existsSync(jsonPath), true);
  assert.equal(fs.existsSync(mdPath), true);
});

test("agentation tracker resolves comments with commit context", (t) => {
  withTempTracker(t);

  const annotation = {
    id: "ann-2",
    sessionId: "sess-2",
    url: "http://localhost:3000/",
    comment: "widget container should auto-resize",
    element: "ToolInvocation",
    elementPath: ".message .widget-shell",
    status: "pending",
    timestamp: Date.now(),
  };

  processAgentationWebhook({
    event: "annotation.add",
    annotation,
  });

  const resolved = resolveAgentationComment("ann-2", {
    summary: "Added resize observer and postMessage height sync.",
    commitSha: "abc1234",
    commitUrl: "https://example.com/commit/abc1234",
    resolvedBy: "agent",
  });

  assert.equal(resolved.status, "resolved");
  assert.equal(resolved.resolution.commitSha, "abc1234");
  assert.equal(typeof resolved.resolution.resolvedAt, "string");

  const listed = listAgentationComments({ status: "resolved" });
  assert.equal(listed.total, 1);
  assert.equal(listed.comments[0].id, "ann-2");
});
