# 05 — CI/CD Pipelines

> All 5 GitHub Actions workflows explained step-by-step. Complete YAML reference.

---

## Pipeline Overview

| Workflow                     | File                         | Trigger                                               | Purpose                                    | Writes to Figma?     |
| ---------------------------- | ---------------------------- | ----------------------------------------------------- | ------------------------------------------ | -------------------- |
| **CI Core**                  | `ci-core.yml`                | Push to `main` + PRs                                  | Build, test, verify, drift check           | No                   |
| **Figma Pull Variables**     | `figma-pull-variables.yml`   | Daily 03:00 UTC + manual                              | Pull → normalize → generate → PR           | No                   |
| **Figma Push Variables**     | `figma-push-variables.yml`   | Daily 04:00 UTC + manual                              | Push CSS values → Figma                    | Yes (with `--apply`) |
| **Figma Code Connect Sync**  | `figma-codeconnect-sync.yml` | Push to code-connect paths + daily 03:30 UTC + manual | Generate, verify, publish mappings         | Yes (publish)        |
| **Figma Webhook Sync** ⚡    | `figma-webhook-sync.yml`     | Figma webhook → `repository_dispatch` + manual        | Pull + build widgets + PR + auto-merge     | No                   |

### Execution Timeline (Daily Schedule + Webhook)

```text
Real-time ─── Figma Webhook Sync ────── Webhook → pull → build → PR → auto-merge  ⚡ NEW
03:00 UTC ─── Figma Pull Variables ──── Pull + normalize + generate + PR (safety net)
03:30 UTC ─── Figma Code Connect Sync ─ Generate + verify + publish
04:00 UTC ─── Figma Push Variables ──── Dry-run push (daily)
On push  ──── CI Core ───────────────── Build + test + drift check + verify
```

---

## Workflow 1: CI Core

**File**: `.github/workflows/ci-core.yml`  
**Purpose**: The quality gate. Runs on every push and PR. Does NOT interact with Figma API directly (except via `figma:verify`).

### Trigger — CI Core

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

### Steps — CI Core

| Step                  | Command                             | What it does                                  | Failure =                                 |
| --------------------- | ----------------------------------- | --------------------------------------------- | ----------------------------------------- |
| Checkout              | `actions/checkout@v4`               | Clone repo                                    | —                                         |
| Setup Node            | `actions/setup-node@v4` (22)        | Install Node.js                               | —                                         |
| Install root deps     | `npm ci`                            | Install root dependencies                     | Build failure                             |
| Install mcp-server    | `npm --prefix mcp-server ci`        | Install mcp-server deps                       | Build failure                             |
| Install web-client    | `npm --prefix web-client ci`        | Install web-client deps                       | Build failure                             |
| **Token drift check** | `npm run tokens:check`              | Verify mcp-server/tokens == web-client/tokens | **CI fails** if tokens differ             |
| Build widgets         | `npm --prefix mcp-server run build` | Vite build all 12 widgets                     | Build failure                             |
| Test mcp-server       | `npm --prefix mcp-server test`      | Run server tests                              | Test failure                              |
| Build web-client      | `npm --prefix web-client run build` | Next.js production build                      | Build failure                             |
| **Figma verify**      | `npm run figma:verify`              | 5-check verification suite                    | **CI fails** on missing files, bad tokens |
| Upload artifacts      | `actions/upload-artifact@v4`        | Save verification reports                     | —                                         |

### Key Insight: Token Drift Check

The drift check (`npm run tokens:check`) runs `scripts/sync-tokens.mjs check`:

```javascript
// Compares files byte-for-byte
const source = readFileSync(sourcePath, "utf8"); // mcp-server/tokens/
const target = readFileSync(targetPath, "utf8"); // web-client/tokens/
if (source !== target) {
  console.error(`drift: ${file} differs from mcp-server/tokens`);
  process.exit(1); // Fails CI
}
```

**Fix**: Run `npm run tokens:sync` locally and commit.

---

## Workflow 2: Figma Pull Variables

**File**: `.github/workflows/figma-pull-variables.yml`  
**Purpose**: Automated pull from Figma → generate tokens → open PR.

### Trigger — Pull Variables

```yaml
on:
  workflow_dispatch: # Manual trigger
  schedule:
    - cron: "0 3 * * *" # Daily at 03:00 UTC
```

### Environment — Pull Variables

```yaml
env:
  FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_ACCESS_TOKEN }}
  FIGMA_FILE_KEY: ${{ secrets.FIGMA_FILE_KEY }}
  FIGMA_REGION: ${{ secrets.FIGMA_REGION }}

permissions:
  contents: write # Needed for commit
  pull-requests: write # Needed for PR creation
```

### Steps — Pull Variables

| Step             | Command                              | What it does                       |
| ---------------- | ------------------------------------ | ---------------------------------- |
| Pull variables   | `npm run figma:pull:variables`       | Fetch raw variables from API       |
| Normalize        | `npm run figma:normalize:variables`  | Flatten and resolve modes          |
| Generate tokens  | `npm run figma:generate:tokens`      | Produce CSS custom property files  |
| Sync tokens      | `npm run tokens:sync`                | Mirror to web-client/              |
| Verify           | `npm run figma:verify`               | Run 5-check validation suite       |
| Upload artifacts | `actions/upload-artifact@v4`         | Save raw/normalized JSON + reports |
| **Create PR**    | `peter-evans/create-pull-request@v6` | Opens PR with changed files        |

### PR Configuration — Pull Variables

```yaml
- uses: peter-evans/create-pull-request@v6
  with:
    commit-message: "chore(figma): sync variables from figma"
    branch: codex/figma-pull-variables
    title: "chore(figma): sync variables from figma"
    labels: |
      automation
      figma
    add-paths: |
      mcp-server/tokens/figma-tokens-light.css
      mcp-server/tokens/figma-tokens-dark.css
      web-client/tokens/figma-tokens-light.css
      web-client/tokens/figma-tokens-dark.css
      tokens/figma/variables.raw.json
      tokens/figma/variables.normalized.json
      tokens/figma/.variable-ids.json
      docs/code reports/figma-sync-verification.json
      docs/code reports/figma-sync-verification.md
```

If no files changed, the action does nothing (no empty PRs).

---

## Workflow 3: Figma Push Variables

**File**: `.github/workflows/figma-push-variables.yml`  
**Purpose**: Push CSS token values back to Figma. Default: dry-run. Apply: manual trigger only.

### Trigger — Push Variables

```yaml
on:
  workflow_dispatch:
    inputs:
      apply:
        type: boolean
        required: false
        default: false
        description: "Apply push to Figma (otherwise dry-run)"
  schedule:
    - cron: "0 4 * * *" # Daily at 04:00 UTC (dry-run)
```

### Environment — Push Variables

```yaml
environment: figma-write # Protected environment with optional approval
env:
  FIGMA_ACCESS_TOKEN: ${{ secrets.FIGMA_ACCESS_TOKEN }}
  FIGMA_FILE_KEY: ${{ secrets.FIGMA_FILE_KEY }}
  FIGMA_REGION: ${{ secrets.FIGMA_REGION }}
  FIGMA_WRITE_CONTEXT: ci # Enables CI-mode writes
```

### Steps — Push Variables

| Step                        | Command                                   | What it does                           |
| --------------------------- | ----------------------------------------- | -------------------------------------- |
| Probe capabilities          | `npm run figma:probe`                     | Test all 4 API capabilities            |
| Normalize + generate + sync | 3 commands                                | Regenerate tokens from normalized data |
| **Push dry-run**            | `npm run figma:push:variables`            | Compute diffs, no API write            |
| **Push apply**              | `npm run figma:push:variables -- --apply` | Actually write to Figma (manual only)  |
| Verify                      | `npm run figma:verify`                    | Post-push validation                   |
| Upload artifacts            | `actions/upload-artifact@v4`              | Save probe + push reports              |

### Conditional Apply Logic — Push Variables

```yaml
# Dry-run: runs on schedule OR when dispatch doesn't request apply
- name: Push variables dry-run
  if: ${{ github.event_name != 'workflow_dispatch' || !inputs.apply }}
  run: npm run figma:push:variables

# Apply: only when manually dispatched with apply=true
- name: Push variables apply
  if: ${{ github.event_name == 'workflow_dispatch' && inputs.apply }}
  run: npm run figma:push:variables -- --apply
```

### How to Trigger an Apply Push from CI

1. Go to **GitHub → Actions → Figma Push Variables**
2. Click **Run workflow**
3. Check **"Apply push to Figma"**
4. Click **Run workflow**

---

## Workflow 4: Figma Code Connect Sync

**File**: `.github/workflows/figma-codeconnect-sync.yml`  
**Purpose**: Keep Code Connect mappings synced. Generate, verify, and optionally publish to Figma Dev Mode.

### Trigger — Code Connect

```yaml
on:
  workflow_dispatch: # Manual
  schedule:
    - cron: "30 3 * * *" # Daily at 03:30 UTC
  push:
    paths: # Auto-trigger on relevant file changes
      - "figma/code-connect/**"
      - "web-client/components/**"
      - "mcp-server/src/widgets/**"
      - "scripts/figma-codeconnect-*.mjs"
```

### Steps — Code Connect

| Step             | Command                                        | What it does                                         |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Generate         | `npm run figma:codeconnect:generate`           | Build `mappings.generated.json` from source          |
| Verify           | `npm run figma:codeconnect:verify`             | Check all 12 required components have valid mappings |
| **Publish**      | `npm run figma:codeconnect:publish -- --apply` | Push code links to Figma Dev Mode                    |
| Upload artifacts | `actions/upload-artifact@v4`                   | Save generated mappings + publish report             |

### Publish Gate — Code Connect

Publish is conditional on a repository variable:

```yaml
- name: Optional publish in CI route
  if: ${{ vars.FIGMA_CODECONNECT_PUBLISH == 'true' }}
  run: npm run figma:codeconnect:publish -- --apply
```

To enable/disable publish:

```bash
# Enable
gh variable set FIGMA_CODECONNECT_PUBLISH --body "true"

# Disable
gh variable set FIGMA_CODECONNECT_PUBLISH --body "false"
```

---

## Workflow 5: Figma Webhook Sync ⚡

**File**: `.github/workflows/figma-webhook-sync.yml`  
**Purpose**: Real-time webhook-triggered sync. Designer saves in Figma → PR with updated tokens + rebuilt widgets in ~60 seconds. Fully automatic.

### Trigger — Webhook Sync

```yaml
on:
  repository_dispatch:
    types:
      - figma_file_update       # From FILE_UPDATE webhook
      - figma_library_publish   # From LIBRARY_PUBLISH webhook

  workflow_dispatch:            # Manual trigger for testing
    inputs:
      reason: { type: string, default: 'Manual test' }
      auto_merge: { type: boolean, default: true }
```

### Concurrency — Webhook Sync

```yaml
concurrency:
  group: figma-webhook-sync
  cancel-in-progress: true    # Latest webhook wins
```

### Steps — Webhook Sync

| Step                  | Command                                  | What it does                                    |
| --------------------- | ---------------------------------------- | ----------------------------------------------- |
| Log trigger context   | —                                        | Record event type, file key, timestamp          |
| Validate file key     | —                                        | Reject webhooks for non-matching files          |
| Checkout              | `actions/checkout@v4`                    | Clone repo                                      |
| Setup Node            | `actions/setup-node@v4` (22)             | Install Node.js with npm cache                  |
| Install dependencies  | `npm ci` (root + mcp-server + web-client) | Install all deps                               |
| Check secrets         | —                                        | Fail early if FIGMA_ACCESS_TOKEN missing        |
| Pull variables        | `npm run figma:pull:variables`           | Fetch from Figma API                            |
| Normalize             | `npm run figma:normalize:variables`      | Flatten, resolve modes                          |
| Generate CSS          | `npm run figma:generate:tokens`          | Produce light + dark token files                |
| Sync tokens           | `npm run tokens:sync`                    | Mirror to web-client/                           |
| **Build widgets**     | `npm --prefix mcp-server run build`      | Vite rebuild all 12 widgets *(unique to this workflow)* |
| Verify                | `npm run figma:verify`                   | 5-check validation suite                        |
| Diff summary          | `git add -A && git diff --cached`         | Stage all + detect actual changes               |
| **Create PR**         | `peter-evans/create-pull-request@v6`     | Open/update PR on `codex/figma-webhook-sync`    |
| **Auto-merge**        | `gh pr merge --auto --squash`            | Squash-merge when CI passes                     |
| No changes summary    | —                                        | Log success if tokens already match             |

### Key Differences from Workflow 2 (Pull Variables)

| Aspect | Pull Variables (Workflow 2) | Webhook Sync (Workflow 5) |
|--------|---------------------------|--------------------------|
| Trigger | Daily cron + manual | Figma webhook + manual |
| Widget rebuild | ❌ Not included | ✅ Rebuilds all 12 widgets |
| Auto-merge | ❌ Manual review | ✅ Auto-squash-merge |
| Concurrency | None | Cancel-in-progress |
| Branch | `codex/figma-pull-variables` | `codex/figma-webhook-sync` |
| Diff detection | Standard `add-paths` | Staged `git add -A` + `--cached` |

### Infrastructure Required

| Component | Purpose | Setup |
|-----------|---------|-------|
| Webhook receiver | Converts Figma webhooks → GitHub dispatch | `scripts/figma-webhook-receiver.mjs` |
| Figma webhooks | Fire on file save / library publish | Created via `scripts/figma-webhook-manage.mjs` |
| GitHub PAT | Receiver needs `repo` scope to dispatch | Fine-grained PAT |
| Auto-merge | Must be enabled on the repository | `gh api repos/OWNER/REPO -X PATCH -f allow_auto_merge=true` |

See [10-WEBHOOK-SETUP.md](./10-WEBHOOK-SETUP.md) for webhook receiver deployment and [12-PRODUCTION-AUTOMATION.md](./12-PRODUCTION-AUTOMATION.md) for the complete production guide.

---

## Artifact Downloads

Every workflow uploads artifacts that can be downloaded from the GitHub Actions run page:

| Workflow           | Artifact Name                 | Contents                                             |
| ------------------ | ----------------------------- | ---------------------------------------------------- |
| CI Core            | `figma-verify-artifacts`      | Verification JSON + MD, probe reports                |
| Pull Variables     | `figma-pull-artifacts`        | Raw variables, normalized, IDs, verification reports |
| Push Variables     | `figma-push-artifacts`        | Probe report, push report, verification reports      |
| Code Connect Sync  | `figma-codeconnect-artifacts` | Generated mappings, publish report                   |
| Webhook Sync       | *(no artifact upload)*        | Changes captured in PR diff                          |

### Download via CLI

```bash
# List recent workflow runs
gh run list --limit 10

# Download artifacts from a specific run
gh run download <RUN_ID>
```

---

## Required GitHub Configuration Summary

### Secrets (Repository level)

| Secret               | Example                  | Used by              |
| -------------------- | ------------------------ | -------------------- |
| `FIGMA_ACCESS_TOKEN` | `figd_...`               | All Figma workflows  |
| `FIGMA_FILE_KEY`     | `dbPjFeLfAFp8Sz9YGPs0CZ` | All Figma workflows  |
| `FIGMA_REGION`       | `us`                     | All Figma workflows  |

### Variables (Repository level)

| Variable                    | Value             | Used by           |
| --------------------------- | ----------------- | ----------------- |
| `FIGMA_CODECONNECT_PUBLISH` | `true` or `false` | Code Connect Sync |

### Environments

| Environment   | Secrets              | Used by                           |
| ------------- | -------------------- | --------------------------------- |
| `figma-write` | Same 3 Figma secrets | Push Variables, Code Connect Sync |

### Repository Settings

| Setting | Value | Required by |
|---------|-------|------------|
| `allow_auto_merge` | `true` | Webhook Sync auto-merge |

---

## Monitoring

### Check workflow status

```bash
# All recent runs
gh run list --limit 10

# Specific workflow
gh run list --workflow "CI Core" --limit 5
gh run list --workflow "Figma Webhook Sync" --limit 5

# View a failed run's logs
gh run view <RUN_ID> --log-failed
```

### Set up notifications

Go to **GitHub → Settings → Notifications** and enable email alerts for:

- Workflow failures
- Pull request creation (for automated PRs)

---

_Next: [06-CODE-CONNECT.md](./06-CODE-CONNECT.md) — Figma Code Connect component linking_
