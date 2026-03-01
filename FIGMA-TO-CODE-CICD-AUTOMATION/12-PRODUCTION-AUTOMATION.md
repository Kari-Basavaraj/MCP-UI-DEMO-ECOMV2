# 12 — Production Automation Guide

> Zero-touch design-to-code sync. A designer saves in Figma → tokens update → widgets rebuild → PR opens → auto-merges. No human intervention required.

---

## When to Use This Guide

| Scenario | Use Production Automation? |
|----------|---------------------------|
| Continuous design ops for a live product | ✅ Yes |
| Team with multiple designers pushing changes | ✅ Yes |
| Want real-time sync without manual CLI work | ✅ Yes |
| Quick local test of a single token change | ❌ Use [11-MANUAL-DEVELOPER-GUIDE.md](./11-MANUAL-DEVELOPER-GUIDE.md) |

---

## Architecture Overview

```
┌──────────────┐     webhook POST     ┌─────────────────────┐     repository_dispatch     ┌──────────────────────┐
│              │ ────────────────────► │                     │ ───────────────────────────► │                      │
│    Figma     │                       │  Webhook Receiver   │                              │   GitHub Actions     │
│  (designer)  │                       │  (cloud / local)    │                              │   figma-webhook-     │
│              │                       │  Port 4848          │                              │   sync.yml           │
└──────────────┘                       └─────────────────────┘                              └──────────┬───────────┘
                                                                                                      │
                                                                                           ┌──────────▼───────────┐
                                                                                           │  Pipeline:           │
                                                                                           │  1. Pull variables   │
                                                                                           │  2. Normalize        │
                                                                                           │  3. Generate CSS     │
                                                                                           │  4. Sync tokens      │
                                                                                           │  5. Build widgets    │
                                                                                           │  6. Verify           │
                                                                                           │  7. Create PR        │
                                                                                           │  8. Auto-merge       │
                                                                                           └──────────────────────┘
```

### End-to-End Flow

1. **Designer saves** a file or publishes a library in Figma
2. **Figma fires** a `FILE_UPDATE` or `LIBRARY_PUBLISH` webhook
3. **Webhook receiver** validates the passcode + file key, then sends a `repository_dispatch` to GitHub
4. **GitHub Actions** runs: pull → normalize → generate CSS → sync → rebuild widgets → verify
5. **Diff detection** — if tokens changed, a PR is created on `codex/figma-webhook-sync`
6. **Auto-merge** — the PR squash-merges when CI passes
7. **No changes?** — workflow logs success and exits, no empty PR created

**Time**: ~60 seconds from Figma save to PR opened.

---

## Setup Checklist

### Step 1 — GitHub Secrets

```bash
# Required secrets (set once)
gh secret set FIGMA_ACCESS_TOKEN --body "figd_YOUR_PERSONAL_ACCESS_TOKEN"
gh secret set FIGMA_FILE_KEY --body "dbPjFeLfAFp8Sz9YGPs0CZ"
gh secret set FIGMA_REGION --body "us"
```

### Step 2 — Enable Auto-Merge on Repository

```bash
gh api repos/YOUR_OWNER/YOUR_REPO -X PATCH -f allow_auto_merge=true
```

For auto-merge to work, you also need **branch protection rules** with required status checks:

```bash
# Optional: Set up branch protection (recommended for production)
gh api repos/YOUR_OWNER/YOUR_REPO/branches/main/protection -X PUT \
  -H "Accept: application/vnd.github+json" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["CI Core"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

> **Note**: Without branch protection + required checks, auto-merge will show a warning but the PR will still be created. You can merge manually.

### Step 3 — Deploy the Webhook Receiver

The receiver (`scripts/figma-webhook-receiver.mjs`) is a single-file Node.js HTTP server with **zero npm dependencies**. It runs anywhere Node.js runs.

#### Option A: Cloud Function (Recommended for Production)

Deploy to any serverless platform:

| Platform | Deployment |
|----------|-----------|
| **Vercel** | Wrap in `api/figma-webhook.js` serverless function |
| **AWS Lambda** | Behind API Gateway, env vars in Lambda config |
| **Google Cloud Run** | Containerize, set env vars in GCP console |
| **Railway / Fly.io** | Deploy as Node.js app, configure env vars in dashboard |
| **Azure Functions** | HTTP trigger function, env vars in Application Settings |

Required environment variables for the receiver:

```bash
FIGMA_WEBHOOK_PASSCODE="your-secret-passcode"
GITHUB_TOKEN="ghp_your_token_with_repo_scope"  # Fine-grained PAT with repo scope
GITHUB_REPO="Kari-Basavaraj/MCP-UI-DEMO-ECOMV2"
FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"
PORT=4848  # Optional, defaults to 4848
```

#### Option B: Always-On Server

```bash
# On a VPS or container
export FIGMA_WEBHOOK_PASSCODE="your-secret-passcode"
export GITHUB_TOKEN="ghp_your_token_with_repo_scope"
export GITHUB_REPO="Kari-Basavaraj/MCP-UI-DEMO-ECOMV2"
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"

# Run with process manager
pm2 start scripts/figma-webhook-receiver.mjs --name figma-webhook
# or
nohup node scripts/figma-webhook-receiver.mjs &
```

#### Option C: Local with ngrok (Development / Testing)

```bash
# Terminal 1: Start receiver
npm run webhook:start

# Terminal 2: Expose via ngrok
ngrok http 4848
# Copy the https URL → use as webhook endpoint
```

### Step 4 — Register Figma Webhooks

Register two webhooks — one for file saves, one for library publishes:

```bash
# FILE_UPDATE — fires on every file save (good for testing)
node scripts/figma-webhook-manage.mjs create \
  --url https://YOUR_DEPLOYED_URL/webhook \
  --team-id YOUR_FIGMA_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type FILE_UPDATE

# LIBRARY_PUBLISH — fires only on intentional publishes (recommended for production)
node scripts/figma-webhook-manage.mjs create \
  --url https://YOUR_DEPLOYED_URL/webhook \
  --team-id YOUR_FIGMA_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type LIBRARY_PUBLISH
```

#### Finding Your Figma Team ID

Your team ID is in the URL when viewing your team page:

```
https://www.figma.com/files/team/1609792196781393010/...
                                ^^^^^^^^^^^^^^^^^
                                This is your team ID
```

> ⚠️ **Do not confuse with the organization/workspace ID** (the first number in the URL path). Use the number after `/team/`.

#### Verify Registration

```bash
node scripts/figma-webhook-manage.mjs list --team-id YOUR_TEAM_ID
```

Expected output:

```
ID: 3992255 | Type: FILE_UPDATE    | Status: ACTIVE | URL: https://...
ID: 3992257 | Type: LIBRARY_PUBLISH | Status: ACTIVE | URL: https://...
```

### Step 5 — Test End-to-End

```bash
# 1. Send a test payload to your receiver
npm run webhook:test

# 2. Check GitHub Actions for the triggered workflow
gh run list --workflow=figma-webhook-sync.yml --limit 3

# 3. View the latest run
gh run view --workflow=figma-webhook-sync.yml
```

Or trigger the workflow directly:

```bash
gh workflow run figma-webhook-sync.yml -f reason="Production test"
```

---

## What the Workflow Does

The `figma-webhook-sync.yml` runs these steps:

| # | Step | Command | Purpose |
|---|------|---------|---------|
| 1 | Log trigger context | — | Record what triggered the sync |
| 2 | Validate file key | — | Reject webhooks for other files |
| 3 | Checkout code | `actions/checkout@v4` | Get latest code |
| 4 | Setup Node.js | `actions/setup-node@v4` | Node 22 + npm cache |
| 5 | Install dependencies | `npm ci` (root + mcp-server + web-client) | Install all deps |
| 6 | Check secrets | — | Fail early if secrets missing |
| 7 | Pull variables | `npm run figma:pull:variables` | Fetch from Figma API |
| 8 | Normalize | `npm run figma:normalize:variables` | Flatten + resolve modes |
| 9 | Generate CSS | `npm run figma:generate:tokens` | Produce light + dark CSS |
| 10 | Sync tokens | `npm run tokens:sync` | Mirror to web-client |
| 11 | Build widgets | `npm --prefix mcp-server run build` | Vite build all 12 widgets |
| 12 | Verify | `npm run figma:verify` | 5-check validation |
| 13 | Diff summary | `git add -A && git diff --cached` | Detect actual changes |
| 14 | Create PR | `peter-evans/create-pull-request@v6` | Open/update PR |
| 15 | Auto-merge | `gh pr merge --auto --squash` | Squash-merge when CI passes |

### Concurrency Control

```yaml
concurrency:
  group: figma-webhook-sync
  cancel-in-progress: true
```

If a second webhook fires while the first is still running, the first run is cancelled. Latest changes always win.

### Diff Detection

The workflow uses reliable staged diff detection:

```bash
git add -A                              # Stage all changes
git diff --cached --name-only | wc -l   # Count changed files
```

If zero files changed, the workflow logs success and exits without creating a PR.

---

## Production Recommendations

### Use LIBRARY_PUBLISH Over FILE_UPDATE

| Event | When It Fires | Recommended For |
|-------|--------------|-----------------|
| `FILE_UPDATE` | Every save (can fire frequently) | Development/testing |
| `LIBRARY_PUBLISH` | Only when a designer explicitly publishes | **Production** |

`LIBRARY_PUBLISH` prevents noise from work-in-progress saves. A designer makes multiple edits, then deliberately publishes — triggering exactly one sync.

### Monitoring

```bash
# Check recent webhook workflow runs
gh run list --workflow=figma-webhook-sync.yml --limit 10

# View a specific run's logs
gh run view RUN_ID --log

# View only failed runs
gh run list --workflow=figma-webhook-sync.yml --status=failure --limit 5

# View failed step logs
gh run view RUN_ID --log-failed
```

### Alerts

Set up GitHub notification rules:

1. **GitHub → Settings → Notifications** → Enable email for workflow failures
2. **Slack integration**: Use GitHub's Slack app to post workflow status to a channel
3. **Custom webhook**: Add a notification step to the workflow YAML:

```yaml
# Add to figma-webhook-sync.yml after auto-merge step (optional)
- name: Notify on failure
  if: failure()
  run: |
    curl -X POST "$SLACK_WEBHOOK_URL" \
      -H "Content-Type: application/json" \
      -d '{"text":"⚠️ Figma webhook sync failed! Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"}'
```

### Webhook Health

Figma will **disable** webhooks that consistently return errors. Monitor and re-create if needed:

```bash
# Check webhook status
node scripts/figma-webhook-manage.mjs list --team-id YOUR_TEAM_ID

# If a webhook shows DISABLED, delete it and create a new one
node scripts/figma-webhook-manage.mjs delete --webhook-id WEBHOOK_ID
node scripts/figma-webhook-manage.mjs create \
  --url https://YOUR_URL/webhook \
  --team-id YOUR_TEAM_ID \
  --passcode "your-passcode" \
  --event-type LIBRARY_PUBLISH
```

### Security Hardening

| Measure | How |
|---------|-----|
| **Strong passcode** | Use a 32+ char random string. Store in environment variables, not code. |
| **Minimal GitHub PAT scope** | Fine-grained PAT with only `repo` access to this repository |
| **HTTPS only** | Never expose the receiver over plain HTTP |
| **IP allowlisting** | If your cloud supports it, restrict to Figma's IP ranges |
| **Rotate credentials** | Rotate the GitHub PAT and webhook passcode periodically |

---

## Comparison: Manual vs Automated

| Aspect | Manual (Doc 11) | Automated (This Doc) |
|--------|-----------------|---------------------|
| **Trigger** | Developer runs CLI command | Figma save/publish fires webhook |
| **Latency** | Seconds (local) | ~60 seconds (webhook → workflow → PR) |
| **Widget rebuild** | Must run `npm --prefix mcp-server run build` separately | Included in workflow automatically |
| **PR creation** | Manual `git commit && git push` | Automatic via GitHub Actions |
| **Merge** | Manual PR review and merge | Auto-merge when CI passes |
| **Best for** | Development, debugging, testing | Production, continuous design ops |
| **Dependencies** | Terminal + Node.js | Webhook receiver + GitHub Actions |
| **Concurrency** | N/A (one developer) | Cancel-in-progress (latest wins) |

### When to Use Both Together

The manual and automated workflows are complementary:

1. **Designer changes tokens in Figma** → Automated webhook syncs → PR auto-merges
2. **Developer needs to debug** a sync failure → Uses manual CLI commands locally
3. **Developer adds a new component** → Runs `figma:codeconnect:generate/publish` manually
4. **Emergency hotfix** to a token → Developer pushes via `figma:sync:push -- --apply` manually
5. **Automated daily health check** → Cron-triggered pull workflow catches any drift

---

## Scheduled Automation (Cron Workflows)

In addition to webhook-driven sync, three scheduled workflows run daily:

| Time (UTC) | Workflow | What It Does |
|-----------|----------|--------------|
| 03:00 | Figma Pull Variables | Pull + normalize + generate → PR |
| 03:30 | Figma Code Connect Sync | Generate + verify + publish mappings |
| 04:00 | Figma Push Variables | Dry-run push (detect code→Figma drift) |

These serve as a **safety net** — even if a webhook is missed, the daily cron will catch the change within 24 hours.

---

## Troubleshooting

### Webhook not firing

| Check | Fix |
|-------|-----|
| Webhook status shows DISABLED | Figma disabled it due to errors. Delete and re-create. |
| Endpoint URL not reachable | Ensure your receiver is deployed and publicly accessible |
| Wrong team ID used | Use the team ID from the URL, not the org/workspace ID |

### Receiver not dispatching to GitHub

| Check | Fix |
|-------|-----|
| `GITHUB_TOKEN` missing or expired | Regenerate PAT with `repo` scope |
| `GITHUB_REPO` format wrong | Must be `owner/repo` (not a URL) |
| `FIGMA_FILE_KEY` mismatch | Receiver ignores webhooks for non-matching files |
| Passcode mismatch | Must match the passcode used when creating the webhook |

### Workflow runs but no PR

| Check | Fix |
|-------|-----|
| "No token changes detected" | Tokens already match — this is expected if no design changes occurred |
| Branch conflicts | Delete branch `codex/figma-webhook-sync` and re-run |
| Permission denied | Check workflow `permissions:` block has `contents: write` + `pull-requests: write` |

### Auto-merge not working

| Check | Fix |
|-------|-----|
| "Auto-merge not available" | Enable auto-merge on repo: `gh api repos/OWNER/REPO -X PATCH -f allow_auto_merge=true` |
| PR stays open | Set up branch protection with required status checks for auto-merge to activate |
| CI failing | Fix the CI failure first — auto-merge waits for all required checks to pass |

---

## Deployment Variants

### Minimal (Development)

```
Figma → [Local receiver + ngrok] → GitHub Actions → PR (manual merge)
```

### Standard (Small Team)

```
Figma → [Cloud function, e.g. Vercel] → GitHub Actions → PR → Auto-merge
```

### Enterprise (Large Org)

```
Figma → [Load-balanced receivers behind API Gateway] → GitHub Actions
  → PR → Required reviews (1-2 approvers) → Merge
  → Slack/Teams notification → Deploy pipeline
```

---

*See also: [10-WEBHOOK-SETUP.md](./10-WEBHOOK-SETUP.md) for detailed webhook receiver internals.*

*Previous: [11-MANUAL-DEVELOPER-GUIDE.md](./11-MANUAL-DEVELOPER-GUIDE.md) — Manual CLI workflows*
