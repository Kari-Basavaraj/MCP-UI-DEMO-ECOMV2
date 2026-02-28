# Agentation Automation Runbook

Last updated: 2026-02-28

## What Is Automated

1. Agentation annotation events are ingested via webhook.
2. Comments are persisted to:
`docs/code reports/agentation-comments-tracker.json`
3. A human-readable tracker is regenerated on every event:
`docs/code reports/agentation-comments-tracker.md`
4. Status transitions are automatic:
- `annotation.add` / `annotation.update` -> `pending` (or provided status)
- `submit` -> `acknowledged` for pending comments in that submit payload
- `annotation.delete` / `annotations.clear` -> `dismissed`
5. Resolutions can be posted through API with commit context.
6. Optional Linear sync can auto-create/update issues and move states from comment status.
7. Linear sync is now project-scoped by default to prevent random issue creation outside the dedicated project.

## Required Runtime

1. MCP server running on `:8787`
2. Agentation toolbar webhook enabled (default now):
`http://localhost:8787/api/agentation/webhook`

## API Endpoints

1. Ingest webhook event:
`POST /api/agentation/webhook`
2. List comments:
`GET /api/agentation/comments`
3. Resolve a comment:
`POST /api/agentation/comments/:annotationId/resolve`
4. Backfill from Agentation sync server:
`POST /api/agentation/import`
5. Tracker + integration overview:
`GET /api/agentation/overview`
6. Manual Linear sync:
`POST /api/agentation/sync-linear`

## Example Commands

```bash
# Backfill all live Agentation session annotations
curl -sS -X POST http://localhost:8787/api/agentation/import \
  -H 'Content-Type: application/json' \
  -d '{"endpoint":"http://localhost:4747"}' | jq

# List all tracked comments
curl -sS http://localhost:8787/api/agentation/comments | jq

# Resolve one annotation with commit context
curl -sS -X POST \
  http://localhost:8787/api/agentation/comments/mm61qy6e-y6egax/resolve \
  -H 'Content-Type: application/json' \
  -d '{
    "summary":"Provider badge now renders provider SVG logo and adapts to theme.",
    "commitSha":"<git-sha>",
    "commitUrl":"<optional-url>",
    "resolvedBy":"agent"
  }' | jq

# Manual full sync to Linear (requires env config)
curl -sS -X POST http://localhost:8787/api/agentation/sync-linear \
  -H 'Content-Type: application/json' \
  -d '{"syncAll":true,"reason":"manual-backfill"}' | jq
```

## Linear Automation Config (Optional)

Set these in `mcp-server/.env`:

```bash
AGENTATION_LINEAR_ENABLED=true
LINEAR_API_KEY=lin_api_xxx
AGENTATION_LINEAR_TEAM_ID=<team-id>
# Required in strict mode (default):
# AGENTATION_LINEAR_PROJECT_ID=<project-id>
# AGENTATION_LINEAR_ENFORCE_PROJECT=true
# Optional repo key override (otherwise inferred from cwd folder name):
# AGENTATION_LINEAR_ACTIVE_PROJECT_KEY=MCP-UI-DEMO-ECOMV2
# Optional multi-repo map (JSON or key:value pairs):
# AGENTATION_LINEAR_PROJECT_MAP={"MCP-UI-DEMO-ECOMV2":"<project-id>"}
# Optional safety check for existing linked issues:
# AGENTATION_LINEAR_VERIFY_ISSUE_SCOPE=true
# Optional:
# AGENTATION_LINEAR_ASSIGNEE_ID=<user-id>
# AGENTATION_LINEAR_LABEL_ID=<label-id>
```

### Project Routing Rules (No-Random-Issues Guard)

1. `AGENTATION_LINEAR_ENFORCE_PROJECT=true` means no issue create/update unless active project resolves to a Linear project ID.
2. Project resolution order:
- `AGENTATION_LINEAR_PROJECT_ID` (highest priority)
- `AGENTATION_LINEAR_PROJECT_MAP[AGENTATION_LINEAR_ACTIVE_PROJECT_KEY or repo-folder-name]`
3. If no project is resolved in strict mode, sync is skipped with reason:
- `linear-project-not-configured-for-active-project`
4. For existing linked issues, scope verification (enabled by default) blocks updates when:
- issue team does not match configured team
- issue project differs from resolved project
- issue has no project while a project is required

### Configuration Examples

Single-repo strict routing:

```bash
AGENTATION_LINEAR_ENABLED=true
LINEAR_API_KEY=lin_api_xxx
AGENTATION_LINEAR_TEAM_ID=team_abc
AGENTATION_LINEAR_PROJECT_ID=project_mcp_ui_demo
AGENTATION_LINEAR_ENFORCE_PROJECT=true
```

Multi-repo host with one service binary:

```bash
AGENTATION_LINEAR_ENABLED=true
LINEAR_API_KEY=lin_api_xxx
AGENTATION_LINEAR_TEAM_ID=team_abc
AGENTATION_LINEAR_ENFORCE_PROJECT=true
AGENTATION_LINEAR_PROJECT_MAP={"MCP-UI-DEMO-ECOMV2":"project_mcp_ui_demo","AnotherRepo":"project_other"}
AGENTATION_LINEAR_ACTIVE_PROJECT_KEY=MCP-UI-DEMO-ECOMV2
```

### Status mapping

- `pending` -> Linear `unstarted`
- `acknowledged` -> Linear `started`
- `resolved` -> Linear `completed`
- `dismissed` -> Linear `canceled` (fallback: `completed`)

## File-Level Implementation Map

1. Webhook + comments API routes:
`mcp-server/src/openaiProxy.js`
2. Tracker persistence + status logic:
`mcp-server/src/agentationTracker.js`
3. Toolbar default webhook wiring:
`web-client/components/agentation-toolbar.tsx`
4. Tests:
- `mcp-server/tests/agentation-tracker.test.mjs`
- `mcp-server/tests/openai-proxy-routes.test.mjs`
