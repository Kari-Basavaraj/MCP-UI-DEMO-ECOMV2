import test from "node:test";
import assert from "node:assert/strict";
import { getLinearSyncConfigStatus } from "../src/linearSync.js";

function withEnv(t, entries) {
  const previous = new Map();
  for (const [key, value] of Object.entries(entries)) {
    previous.set(key, process.env[key]);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  t.after(() => {
    for (const [key, value] of previous.entries()) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

test("linear sync config defaults to strict project routing for active repo", (t) => {
  withEnv(t, {
    AGENTATION_LINEAR_ENFORCE_PROJECT: undefined,
    AGENTATION_LINEAR_PROJECT_ID: undefined,
    AGENTATION_LINEAR_PROJECT_MAP: undefined,
    AGENTATION_LINEAR_ACTIVE_PROJECT_KEY: undefined,
  });

  const status = getLinearSyncConfigStatus();
  assert.equal(status.enforceProject, true);
  assert.equal(status.activeProjectKey, "MCP-UI-DEMO-ECOMV2");
  assert.equal(status.hasProjectRouting, false);
  assert.equal(status.projectRoutingReason, "linear-project-not-configured-for-active-project");
});

test("linear sync config resolves project from map when active key matches", (t) => {
  withEnv(t, {
    AGENTATION_LINEAR_PROJECT_ID: undefined,
    AGENTATION_LINEAR_ACTIVE_PROJECT_KEY: "MCP-UI-DEMO-ECOMV2",
    AGENTATION_LINEAR_PROJECT_MAP:
      '{"MCP-UI-DEMO-ECOMV2":"proj-demo","AnotherRepo":"proj-other"}',
  });

  const status = getLinearSyncConfigStatus();
  assert.equal(status.hasProjectRouting, true);
  assert.equal(status.projectRoutingSource, "AGENTATION_LINEAR_PROJECT_MAP");
  assert.equal(status.projectRoutingReason, "");
});

test("linear sync config prefers direct project id over project map", (t) => {
  withEnv(t, {
    AGENTATION_LINEAR_PROJECT_ID: "proj-direct",
    AGENTATION_LINEAR_ACTIVE_PROJECT_KEY: "MCP-UI-DEMO-ECOMV2",
    AGENTATION_LINEAR_PROJECT_MAP:
      '{"MCP-UI-DEMO-ECOMV2":"proj-demo","AnotherRepo":"proj-other"}',
  });

  const status = getLinearSyncConfigStatus();
  assert.equal(status.hasProjectRouting, true);
  assert.equal(status.projectRoutingSource, "AGENTATION_LINEAR_PROJECT_ID");
  assert.equal(status.projectRoutingReason, "");
});
