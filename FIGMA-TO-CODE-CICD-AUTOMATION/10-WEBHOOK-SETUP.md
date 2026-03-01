# 10 — Webhook-Driven Auto-Sync

> Go from "designer saves in Figma" to "PR opened with updated tokens" in under 60 seconds — fully automatic.

---

## Overview

The previous docs describe **scheduled** pipelines (nightly cron) and **manual** triggers (`workflow_dispatch`). This document adds **real-time webhook-triggered sync**: the moment a designer publishes a library or saves a file in Figma, a webhook fires, and within seconds a GitHub Actions workflow pulls the updated tokens, rebuilds widgets, and opens a PR.

### Architecture

```
┌─────────────┐  webhook POST   ┌──────────────────────┐  repository_dispatch  ┌────────────────────┐
│   Figma     │ ──────────────► │  Webhook Receiver    │ ─────────────────────► │  GitHub Actions    │
│  (designer) │                 │  (Node.js / 4848)    │                        │  figma-webhook-    │
│             │                 │  or cloud function   │                        │  sync.yml          │
└─────────────┘                 └──────────────────────┘                        └────────────────────┘
                                                                                       │
                                                                              ┌────────▼────────┐
                                                                              │ Pull → Generate  │
                                                                              │ → Sync → Build   │
                                                                              │ → Verify → PR    │
                                                                              └─────────────────┘
```

### Involved Files

| File | Purpose |
|------|---------|
| `.github/workflows/figma-webhook-sync.yml` | GitHub Actions workflow triggered by `repository_dispatch` |
| `scripts/figma-webhook-receiver.mjs` | HTTP server that converts Figma webhooks into GitHub dispatches |
| `scripts/figma-webhook-manage.mjs` | CLI tool to create/list/delete Figma webhooks |

---

## Prerequisites

- Completed [01-ONE-TIME-SETUP.md](./01-ONE-TIME-SETUP.md) (PAT, file key, secrets)
- A GitHub Personal Access Token with `repo` scope (for `repository_dispatch`)
- A publicly accessible URL for the webhook receiver (or ngrok for local testing)

---

## Step 1 — Set Up GitHub Secrets

The webhook workflow needs these secrets (in addition to any you already configured):

```bash
# If not already set:
gh secret set FIGMA_ACCESS_TOKEN --body "figd_YOUR_TOKEN"
gh secret set FIGMA_FILE_KEY --body "dbPjFeLfAFp8Sz9YGPs0CZ"
gh secret set FIGMA_REGION --body "us"
```

---

## Step 2 — Deploy the Webhook Receiver

The receiver is a lightweight Node.js HTTP server that:
1. Receives POST from Figma
2. Validates the passcode
3. Filters by file key (ignores unrelated file updates)
4. Dispatches `repository_dispatch` to GitHub, which triggers the Actions workflow

### Option A: Run Locally (Development / Testing)

```bash
# Set environment variables
export FIGMA_WEBHOOK_PASSCODE="your-secret-passcode"
export GITHUB_TOKEN="ghp_your_token_with_repo_scope"
export GITHUB_REPO="Kari-Basavaraj/MCP-UI-DEMO-ECOMV2"
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"

# Start the receiver
npm run webhook:start
# or directly:
node scripts/figma-webhook-receiver.mjs
```

The receiver listens on port **4848** by default (override with `PORT` env var).

For local development, use **ngrok** to expose it:

```bash
ngrok http 4848
# Copy the https URL, e.g., https://abc123.ngrok-free.app
```

### Option B: Deploy to Cloud (Production)

Deploy the webhook receiver as a cloud function or container:

| Platform | How |
|----------|-----|
| **Vercel** | Wrap in a serverless function at `api/figma-webhook.js` |
| **AWS Lambda** | Behind API Gateway, environment variables in Lambda config |
| **Google Cloud Run** | Containerize with Dockerfile, set env vars in GCP console |
| **Railway / Fly.io** | Deploy as a Node.js app, configure env vars in dashboard |

The receiver is a single-file server with zero npm dependencies — it runs anywhere Node.js runs.

### Option C: Use the Built-in Next.js API Route (Recommended)

The web-client already includes a production-ready webhook receiver at `web-client/app/api/figma-webhook/route.ts`. This deploys automatically with your Next.js app — no separate infrastructure needed.

**Setup:**

1. Set environment variables on your hosting platform (Vercel, etc.):
   ```bash
   FIGMA_WEBHOOK_SECRET=your-passcode
   GITHUB_DISPATCH_TOKEN=ghp_your_pat_with_repo_scope
   GITHUB_REPO=Kari-Basavaraj/MCP-UI-DEMO-ECOMV2
   FIGMA_FILE_KEY=dbPjFeLfAFp8Sz9YGPs0CZ
   ```

2. Your webhook URL becomes: `https://your-deployed-domain.com/api/figma-webhook`

3. Health check: `GET /api/figma-webhook` returns `{ status: "healthy" }`

**Advantages over Option B:**
- Zero additional infrastructure — ships with the app
- Shares the same deployment pipeline (Vercel, etc.)
- Includes request ID tracking and structured error responses
- `vercel.json` already configures `maxDuration: 30` and security headers

See [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md) for the complete production deployment guide.

---

## Step 3 — Register the Figma Webhook

### Using the CLI Tool

```bash
# Create a FILE_UPDATE webhook
node scripts/figma-webhook-manage.mjs create \
  --url https://your-domain.com/webhook \
  --team-id YOUR_FIGMA_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type FILE_UPDATE

# Also create a LIBRARY_PUBLISH webhook (recommended)
node scripts/figma-webhook-manage.mjs create \
  --url https://your-domain.com/webhook \
  --team-id YOUR_FIGMA_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type LIBRARY_PUBLISH
```

### Finding Your Team ID

Your Figma team ID is in the URL when you're on your team page:

```
https://www.figma.com/files/team/1234567890/...
                              ^^^^^^^^^^
                              This is your team ID
```

### Using the Figma API directly

```bash
curl -X POST "https://api.figma.com/v2/webhooks" \
  -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "FILE_UPDATE",
    "team_id": "YOUR_TEAM_ID",
    "endpoint": "https://your-domain.com/webhook",
    "passcode": "your-secret-passcode",
    "description": "Figma→Code auto-sync"
  }'
```

### List existing webhooks

```bash
node scripts/figma-webhook-manage.mjs list --team-id YOUR_TEAM_ID
```

---

## Step 4 — Test the Pipeline

### 4a. Send a test payload to the local receiver

```bash
# Make sure the receiver is running first
node scripts/figma-webhook-manage.mjs test --url http://localhost:4848
```

### 4b. Trigger the GitHub Actions workflow manually

```bash
gh workflow run figma-webhook-sync.yml \
  -f reason="Manual test of webhook pipeline"
```

### 4c. End-to-end test

1. Start the webhook receiver locally (with ngrok)
2. Make a small change in Figma (e.g., change a color value)
3. Save the file
4. Watch the receiver logs — it should dispatch to GitHub
5. Check GitHub Actions — the workflow should run
6. A PR should be created on branch `codex/figma-webhook-sync`

---

## Step 5 — Verify the Workflow

Check the GitHub Actions tab:

```bash
gh run list --workflow=figma-webhook-sync.yml --limit 5
```

View the latest run:

```bash
gh run view --workflow=figma-webhook-sync.yml
```

---

## How the Workflow Works

The `figma-webhook-sync.yml` workflow does the following when triggered:

```
1. Checkout code
2. Setup Node.js 22 + cache
3. Install dependencies (root + mcp-server)
4. Pull variables from Figma API
5. Normalize variables
6. Generate CSS tokens (light + dark)
7. Sync tokens to both workspaces
8. Build all 12 widgets
9. Run figma:verify for validation
10. Create/update PR on branch codex/figma-webhook-sync
```

The PR includes:
- Updated token CSS files
- Rebuilt widget HTML files
- Labels: `figma-sync`, `automated`
- Auto-assigned reviewers (configurable)

---

## Event Types

| Figma Event | GitHub Dispatch Type | When It Fires |
|-------------|---------------------|---------------|
| `FILE_UPDATE` | `figma_file_update` | Any save to the Figma file |
| `LIBRARY_PUBLISH` | `figma_library_publish` | Library version is published |

**Recommendation**: Use `LIBRARY_PUBLISH` for production — it fires only on intentional publishes, not every save. Use `FILE_UPDATE` for development/testing.

---

## Security

### Passcode Validation

The webhook receiver validates the `passcode` field in every incoming payload. Set a strong, unique passcode when creating the webhook and store it as an environment variable.

### GitHub Token Scope

The `GITHUB_TOKEN` used by the receiver needs only the `repo` scope to create `repository_dispatch` events. Use a fine-grained PAT with minimal permissions.

### Rate Limiting

The receiver includes basic protections:
- Ignores events for non-matching file keys
- Only processes `FILE_UPDATE` and `LIBRARY_PUBLISH` events
- Returns 200 for unknown events (to prevent Figma from retrying)

For production, consider adding:
- IP allowlisting (Figma webhook IPs)
- Request signing verification
- Rate limiting middleware

---

## Troubleshooting

### Webhook not firing

1. Check webhook status: `node scripts/figma-webhook-manage.mjs list --team-id YOUR_ID`
2. Figma may disable webhooks that return errors. Re-create if status is `DISABLED`.
3. Ensure the endpoint URL is publicly reachable (Figma can't reach localhost).

### Receiver not dispatching to GitHub

1. Check `GITHUB_TOKEN` has `repo` scope
2. Verify `GITHUB_REPO` format is `owner/repo`
3. Check receiver logs for error messages

### Workflow not running after dispatch

1. Verify the workflow file exists on the default branch
2. Check that `repository_dispatch` types match: `figma_file_update` or `figma_library_publish`
3. Run `gh api repos/{owner}/{repo}/dispatches -X POST -f event_type=figma_file_update` to test

### PR not created

1. Check if branch `codex/figma-webhook-sync` already exists with conflicts
2. Verify the workflow has write permissions (check `permissions:` block)
3. Look at the "Create PR" step output in the Actions log

---

## Summary

| Component | Status | Location |
|-----------|--------|----------|
| Webhook workflow | ✅ Created | `.github/workflows/figma-webhook-sync.yml` |
| Webhook receiver | ✅ Created | `scripts/figma-webhook-receiver.mjs` |
| Webhook CLI tool | ✅ Created | `scripts/figma-webhook-manage.mjs` |
| Webhook setup guide | ✅ This doc | `FIGMA-TO-CODE-CICD-AUTOMATION/10-WEBHOOK-SETUP.md` |

---

*Added: 2025-02-26*
