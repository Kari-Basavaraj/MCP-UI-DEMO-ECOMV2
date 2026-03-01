# 01 — One-Time Setup

> Everything you need to configure **once** before the pipeline works. Estimated time: 15–20 minutes.

---

## Prerequisites

| Requirement | Minimum Version | Check command |
|---|---|---|
| Node.js | 22+ | `node -v` |
| npm | 10+ | `npm -v` |
| Git | 2.30+ | `git --version` |
| GitHub CLI (`gh`) | 2.0+ | `gh --version` |
| Figma account | Professional or Enterprise | — |

---

## Step 1 — Generate a Figma Personal Access Token (PAT)

1. Go to [https://www.figma.com/settings](https://www.figma.com/settings)
2. Scroll to **Personal access tokens**
3. Click **Generate new token**
4. Configure scopes:

| Scope | Required | Why |
|---|---|---|
| **File content** (read) | Yes | Pull variables, read file metadata |
| **Variables** (read + write) | Yes | Pull and push design tokens |
| **Code Connect** (write) | Yes | Publish component links |
| **Webhooks** (read) | Optional | For future webhook triggers |

5. Copy the token (starts with `figd_`) — you won't see it again.

### Verify the token locally

```bash
export FIGMA_ACCESS_TOKEN="figd_YOUR_TOKEN_HERE"
curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/me" | jq .
```

Expected output: your Figma user profile with `id`, `email`, `handle`.

---

## Step 2 — Identify Your Figma File Key

The file key is the string in a Figma URL between `/design/` and the next `/`:

```
https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?...
                              ^^^^^^^^^^^^^^^^^^^^^^^^
                              This is your file key
```

### Verify the file key

```bash
export FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"
curl -s -H "Authorization: Bearer $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_KEY?depth=1" | jq '.name'
```

Expected: your Figma file name (e.g., `"MCPUI-DS-V2"`).

---

## Step 3 — Configure GitHub Secrets

### Required secrets

```bash
# Set secrets via GitHub CLI
gh secret set FIGMA_ACCESS_TOKEN --body "figd_YOUR_TOKEN_HERE"
gh secret set FIGMA_FILE_KEY     --body "dbPjFeLfAFp8Sz9YGPs0CZ"
gh secret set FIGMA_REGION       --body "us-east-1"
```

### Required repository variables

```bash
# Enable Code Connect publish in CI
gh variable set FIGMA_CODECONNECT_PUBLISH --body "true"
```

### Create the `figma-write` environment

The push and Code Connect workflows require a GitHub environment for write operations:

1. Go to **Settings → Environments** in your GitHub repo
2. Click **New environment**
3. Name it: `figma-write`
4. Add these environment secrets:
   - `FIGMA_ACCESS_TOKEN` — same PAT as the repo secret
   - `FIGMA_FILE_KEY` — same file key
   - `FIGMA_REGION` — same region (e.g., `us-east-1`)
5. (Optional) Add **required reviewers** for extra safety on push operations

### Verify secrets are set

```bash
gh secret list
gh variable list
```

---

## Step 4 — Clone and Install Dependencies

```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git
cd YOUR_REPO

# Install all workspace dependencies
npm run install:all
```

This runs `npm install` in three locations:
- Root (`/`)
- `mcp-server/`
- `web-client/`

---

## Step 5 — Configure `figma/sync.config.json`

This is the **central configuration file** for the entire pipeline. Create or edit it:

```json
{
  "primaryFileKey": "YOUR_FIGMA_FILE_KEY",
  "region": "us-east-1",
  "writeMode": "ci-enabled",
  "codeConnectMode": "publish-enabled",
  "routes": {
    "pull": "ci",
    "push": "ci",
    "publish": "ci"
  },
  "canary": {
    "enabled": true,
    "collectionNames": ["Canary", "MCP-UI Canary"],
    "maxVariables": 25
  },
  "requiredComponentsPath": "figma/code-connect/required-components.json",
  "mappingSourcePath": "figma/code-connect/mappings.source.json"
}
```

### Key decisions

| Setting | Conservative (start here) | Aggressive (full CI) |
|---|---|---|
| `writeMode` | `"office-only"` | `"ci-enabled"` |
| `codeConnectMode` | `"verify-only"` | `"publish-enabled"` |
| `routes.push` | `"office"` | `"ci"` |
| `routes.publish` | `"office"` | `"ci"` |
| `canary.enabled` | `true` | `false` (or expanded scope) |

> **Recommendation**: Start with `writeMode: "office-only"` and `routes.push: "office"`. Verify pull works in CI first, then graduate to full Route B.

---

## Step 6 — Configure `figma/figma.config.json`

This file tells the `@figma/code-connect` CLI where to find your components:

```json
{
  "codeConnect": {
    "parser": "react",
    "include": [
      "web-client/components/**/*.{ts,tsx}",
      "web-client/app/**/*.{ts,tsx}",
      "mcp-server/src/widgets/**/*.ts"
    ],
    "exclude": [
      "**/*.test.*",
      "**/*.spec.*",
      "**/node_modules/**"
    ]
  }
}
```

---

## Step 7 — Set Up Local Environment Variables

Add to your shell profile (`.zshrc`, `.bashrc`, etc.):

```bash
# Figma CI/CD pipeline
export FIGMA_ACCESS_TOKEN="figd_YOUR_TOKEN_HERE"
export FIGMA_FILE_KEY="YOUR_FIGMA_FILE_KEY"
export FIGMA_REGION="us-east-1"

# Optional: enable write operations from local machine
# export FIGMA_WRITE_CONTEXT="office"
```

Reload your shell:

```bash
source ~/.zshrc
```

---

## Step 8 — Run the Probe

The probe script tests all 4 API capabilities and recommends a route:

```bash
npm run figma:probe
```

Expected output:

```json
{
  "ok": true,
  "selectedRoute": "Route B",
  "output": [
    "docs/code reports/figma-capability-probe.json",
    "docs/code reports/figma-capability-probe.md"
  ]
}
```

| Probe | What it tests |
|---|---|
| Variables GET | Can CI read variables from Figma? |
| Code Connect Parse | Can the CLI parse `.figma.tsx` files? |
| Code Connect Publish | Is the publish command available? |
| Variables Write | Can CI write variables back to Figma? |

### Interpreting results

| Result | Meaning | Action |
|---|---|---|
| Route B | All 4 probes pass | Full CI is possible |
| Route A | Read + parse work, write/publish fail | Check PAT scopes or environment |
| Route C | Read fails | Check PAT, file key, network access |

---

## Step 9 — Initial Pull (First Sync)

Run the complete pull pipeline to generate your first token files:

```bash
npm run figma:sync:pull
```

This executes in order:
1. `figma:pull:variables` — Fetches raw variable data from Figma API
2. `figma:normalize:variables` — Normalizes the payload, resolves modes
3. `figma:generate:tokens` — Generates `figma-tokens-light.css` and `figma-tokens-dark.css`
4. `tokens:sync` — Mirrors tokens from `mcp-server/tokens/` to `web-client/tokens/`
5. `figma:verify` — Runs all verification checks

### Verify output files exist

```bash
ls -la mcp-server/tokens/figma-tokens-*.css
ls -la web-client/tokens/figma-tokens-*.css
ls -la tokens/figma/variables.raw.json
ls -la tokens/figma/variables.normalized.json
ls -la tokens/figma/.variable-ids.json
```

---

## Step 10 — Verify CI Passes

Push your changes and confirm all workflows pass:

```bash
git add -A
git commit -m "chore: initial figma sync setup"
git push origin main
```

Check workflow runs:

```bash
gh run list --limit 5
```

All three auto-triggered workflows should pass:
- **CI Core** — Token drift check + build + verify
- **Figma Pull Variables** — (Only on schedule/dispatch)
- **Figma Code Connect Sync** — Generate + verify (+ optional publish)

---

## Checklist

- [ ] Figma PAT generated with correct scopes
- [ ] `FIGMA_ACCESS_TOKEN` set as GitHub secret
- [ ] `FIGMA_FILE_KEY` set as GitHub secret
- [ ] `FIGMA_REGION` set as GitHub secret
- [ ] `figma-write` environment created with secrets
- [ ] `FIGMA_CODECONNECT_PUBLISH` variable set to `true`
- [ ] `figma/sync.config.json` configured
- [ ] `figma/figma.config.json` configured
- [ ] `npm run install:all` completed
- [ ] `npm run figma:probe` returns Route A or B
- [ ] `npm run figma:sync:pull` generates token files
- [ ] CI workflows pass on push

---

*Next: [02-ARCHITECTURE.md](./02-ARCHITECTURE.md) — Understand how all the pieces fit together*
