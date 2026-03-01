# 11 — Manual Developer Workflow Guide

> Run the entire Figma ↔ Code pipeline from your terminal. No CI/CD, no webhooks, no cloud — just you and the CLI.

---

## When to Use This Guide

| Scenario | Use Manual Workflow? |
|----------|---------------------|
| Quick design change to test locally | ✅ Yes |
| One-off token pull before a release | ✅ Yes |
| Debugging pipeline failures | ✅ Yes |
| Push CSS changes back to Figma | ✅ Yes |
| Continuous automated sync in production | ❌ Use [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md) |

---

## Prerequisites

Before running any pipeline command, ensure:

```bash
# 1. Set environment variables (or add to .env / shell profile)
export FIGMA_ACCESS_TOKEN="figd_YOUR_PERSONAL_ACCESS_TOKEN"
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"
export FIGMA_REGION="us"

# 2. Install dependencies (if not done)
npm install
npm --prefix mcp-server install
npm --prefix web-client install

# 3. Verify API connectivity
npm run figma:probe
```

Expected probe output:

```
✓ Variables Read  — 490+ variables across 3 collections
✓ Variables Write — can set variable values
✓ Code Connect    — can publish component links
✓ Webhooks        — team webhook access available
```

---

## Starting Local Dev — One Command

Run **everything** (MCP server + web client + webhook receiver) with a single command:

```bash
npm run dev
```

This starts 3 processes in parallel with color-coded output:

| Service | Port | Color |
|---------|------|-------|
| MCP Server | `:8787` | Blue |
| Web Client (Next.js) | `:3000` | Green |
| Webhook Receiver | `:4848` | Magenta |

### First-Time Setup

Before running `npm run dev` for the first time, create your local env file:

```bash
# 1. Copy the template
cp .env.example .env.local

# 2. Fill in your values (the file is gitignored — safe for secrets)
#    Required:
#      FIGMA_ACCESS_TOKEN  — Your Figma personal access token
#      FIGMA_WEBHOOK_PASSCODE — Passcode from webhook registration
#      GITHUB_TOKEN — GitHub PAT with repo scope
```

The webhook receiver auto-loads `.env.local` from the project root — no need to manually export variables.

### What Happens When You Save in Figma

With `npm run dev` running:

```
Designer saves in Figma
  → Figma fires webhook to localhost:4848
  → Receiver validates passcode + file key
  → Dispatches repository_dispatch to GitHub
  → GitHub Actions: pull → normalize → generate → build → PR → auto-merge
  → git pull locally to get the changes
```

For **instant local updates** without waiting for the GitHub round-trip (~47s), run:

```bash
npm run figma:sync:local
```

This pulls tokens from Figma and rebuilds widgets locally in ~10 seconds.

---

## Workflow A — Pull Tokens from Figma (Read-Only)

**Use when**: A designer changed colors, typography, or spacing in Figma, and you want to update your code.

### One Command (Recommended)

```bash
npm run figma:sync:pull
```

This runs the full 5-step pipeline:

```
Pull variables → Normalize → Generate CSS → Sync to web-client → Verify
```

If any step fails, the pipeline stops immediately with a clear error.

### Step-by-Step (For Debugging)

If the one-command approach fails, run each step individually:

```bash
# Step 1: Pull raw variables from Figma API
npm run figma:pull:variables

# Step 2: Normalize (flatten, resolve modes, map to CSS names)
npm run figma:normalize:variables

# Step 3: Generate CSS token files (light + dark)
npm run figma:generate:tokens

# Step 4: Copy tokens from mcp-server/ to web-client/
npm run tokens:sync

# Step 5: Verify everything is correct
npm run figma:verify
```

### Inspect Results

```bash
# Check how many variables were pulled
cat tokens/figma/variables.normalized.json | jq '.stats'

# Check which mode was selected as "Light"
cat tokens/figma/variables.normalized.json | jq '.modeSelection'

# View a specific token
grep "brand-default" mcp-server/tokens/figma-tokens-light.css

# List all CSS variables (first 20)
grep -E "^\s+--sds-" mcp-server/tokens/figma-tokens-light.css | head -20

# Check for token drift between mcp-server and web-client
npm run tokens:check
```

### Rebuild Widgets After Token Pull

After pulling tokens, **rebuild the widgets** so they pick up the new values:

```bash
npm --prefix mcp-server run build
```

This Vite build inlines the updated CSS tokens into all 12 widget HTML files in `mcp-server/dist/widgets/`.

### Test Locally

Start both servers and verify the changes visually:

```bash
# Terminal 1: MCP Server (port 8787)
cd mcp-server && node src/index.js

# Terminal 2: Web Client (port 3000)
cd web-client && npm run dev
```

Open `http://localhost:3000` and interact with the widgets to confirm token changes are reflected.

---

## Workflow B — Push Token Changes to Figma (Write)

**Use when**: You changed CSS token values in code and want to push them back to Figma.

### Dry-Run First (Always)

```bash
npm run figma:sync:push
```

This shows what _would_ change in Figma without actually writing anything:

```
Dry-run: 3 variables would be updated:
  --sds-color-background-brand-default: #2c2c2c → #0066FF
  --sds-color-border-brand-secondary: #444444 → #004499
  --sds-color-text-brand-default: #ffffff → #ffffff (no change)
```

### Apply the Push

Only after reviewing the dry-run output:

```bash
npm run figma:sync:push -- --apply
```

Six safety guards protect you:
1. **Write Mode Guard** — checks `writeMode` config
2. **Route Gating** — checks `FIGMA_WRITE_CONTEXT`
3. **Canary Guard** — limits scope if in canary mode
4. **Library Filter** — skips read-only library variables
5. **Rollback Snapshot** — saves current state before writing
6. **Variable Count** — sanity check on payload size

See [09-SAFETY-PATTERNS.md](./09-SAFETY-PATTERNS.md) for details.

### Verify After Push

```bash
npm run figma:verify
```

---

## Workflow C — Full Bidirectional Sync

**Use when**: You want to pull, verify, generate Code Connect mappings, and optionally push — all in one go.

```bash
# Full sync (dry-run mode, no writes)
npm run figma:sync:full

# With push applied
npm run figma:sync:full -- --apply-push

# With Code Connect publish applied
npm run figma:sync:full -- --apply-publish

# Both
npm run figma:sync:full -- --apply-push --apply-publish
```

The full sync runs:

```
Probe API → Pull + Normalize + Generate + Sync (Workflow A)
  → Generate Code Connect → Verify Code Connect
  → Publish Code Connect (if --apply-publish)
  → Push to Figma (if --apply-push)
```

---

## Workflow D — Code Connect Only

**Use when**: You added or modified widget components and need to update Figma Dev Mode links.

```bash
# Generate Code Connect mappings
npm run figma:codeconnect:generate

# Verify all 12 components have valid mappings
npm run figma:codeconnect:verify

# Publish to Figma Dev Mode (writes to Figma)
npm run figma:codeconnect:publish -- --apply
```

---

## Workflow E — Webhook Management

**Use when**: You need to create, inspect, or delete Figma webhooks for automated sync.

```bash
# List all webhooks for your team
node scripts/figma-webhook-manage.mjs list --team-id YOUR_TEAM_ID

# Create a new FILE_UPDATE webhook
node scripts/figma-webhook-manage.mjs create \
  --url https://your-receiver-url/webhook \
  --team-id YOUR_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type FILE_UPDATE

# Create a LIBRARY_PUBLISH webhook
node scripts/figma-webhook-manage.mjs create \
  --url https://your-receiver-url/webhook \
  --team-id YOUR_TEAM_ID \
  --passcode "your-secret-passcode" \
  --event-type LIBRARY_PUBLISH

# Delete a webhook
node scripts/figma-webhook-manage.mjs delete --webhook-id WEBHOOK_ID

# Send a test payload to a local receiver
node scripts/figma-webhook-manage.mjs test --url http://localhost:4848
```

---

## Quick Reference — All Manual Commands

### Read-Only (Safe)

| Command | What It Does |
|---------|--------------|
| `npm run figma:probe` | Test API connectivity and recommend route |
| `npm run figma:pull:variables` | Pull raw variables from Figma |
| `npm run figma:normalize:variables` | Normalize raw variables |
| `npm run figma:generate:tokens` | Generate CSS token files |
| `npm run tokens:sync` | Copy tokens mcp-server → web-client |
| `npm run tokens:check` | Check for token drift (no fix) |
| `npm run figma:verify` | Run 5-check verification suite |
| `npm run figma:sync:pull` | All 5 pull steps in sequence |
| `npm run figma:codeconnect:generate` | Generate Code Connect mappings |
| `npm run figma:codeconnect:verify` | Verify Code Connect mappings |

### Write Operations (Careful)

| Command | What It Does |
|---------|--------------|
| `npm run figma:sync:push` | Dry-run push — shows what would change |
| `npm run figma:sync:push -- --apply` | Actually write to Figma |
| `npm run figma:codeconnect:publish -- --apply` | Publish Code Connect to Figma Dev Mode |
| `npm run figma:sync:full -- --apply-push --apply-publish` | Full sync with all writes enabled |

### Webhook Management

| Command | What It Does |
|---------|--------------|
| `npm run webhook:start` | Start local webhook receiver (port 4848) |
| `npm run webhook:manage -- list --team-id ID` | List webhooks |
| `npm run webhook:manage -- create --url URL --team-id ID --passcode PW --event-type TYPE` | Create webhook |
| `npm run webhook:test` | Send test payload to local receiver |

### Build & Serve

| Command | What It Does |
|---------|--------------|
| `npm --prefix mcp-server run build` | Build all 12 widgets |
| `cd mcp-server && node src/index.js` | Start MCP server on port 8787 |
| `cd web-client && npm run dev` | Start web client on port 3000 |

---

## Common Scenarios

### "I just pulled tokens but the widgets look the same"

You need to rebuild widgets after pulling tokens:

```bash
npm run figma:sync:pull           # Pull + generate tokens
npm --prefix mcp-server run build  # Rebuild widgets with new tokens
# Restart MCP server if running
```

### "CI is failing with token-drift"

Your mcp-server tokens and web-client tokens are out of sync:

```bash
npm run tokens:sync  # Copy mcp-server/tokens → web-client/tokens
git add -A && git commit -m "fix: sync tokens"
```

### "I want to test a Figma change without committing"

```bash
npm run figma:sync:pull                   # Pull latest from Figma
npm --prefix mcp-server run build          # Rebuild widgets
cd mcp-server && node src/index.js &       # Start MCP server
cd web-client && npm run dev               # Start web client
# Test at http://localhost:3000
# When done, discard changes:
git checkout -- .
```

### "I want to commit the current state and push to GitHub"

```bash
npm run figma:sync:pull           # Pull latest
npm --prefix mcp-server run build  # Rebuild
npm run figma:verify               # Verify everything

git add -A
git commit -m "chore(figma): sync tokens from Figma"
git push origin main
```

---

*See also: [03-FIGMA-TO-CODE.md](./03-FIGMA-TO-CODE.md) for detailed step-by-step explanations of each pipeline stage.*

*Next: [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md) — Fully automated production workflow*
