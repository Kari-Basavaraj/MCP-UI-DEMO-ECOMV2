# 08 — Configuration Reference

> Every configuration file, every key, every value — documented.

---

## Configuration Files Overview

| File                                          | Purpose                                       | Managed By                   |
| --------------------------------------------- | --------------------------------------------- | ---------------------------- |
| `figma/sync.config.json`                      | Central pipeline configuration                | Hand-edited                  |
| `figma/figma.config.json`                     | Code Connect CLI configuration                | Hand-edited                  |
| `figma/code-connect/mappings.source.json`     | Component-to-Figma-node mapping (source)      | Hand-edited                  |
| `figma/code-connect/required-components.json` | List of required components                   | Hand-edited                  |
| `figma/code-connect/mappings.generated.json`  | Enriched mappings (auto-generated)            | `figma:codeconnect:generate` |
| `tokens/figma/token-name-map.json`            | CSS variable name overrides + required tokens | Hand-edited                  |
| `tokens/figma/.variable-ids.json`             | Figma variable ID lookup (auto-generated)     | `figma:pull:variables`       |

---

## `figma/sync.config.json`

The **most important file** — every script reads this.

```json
{
  "primaryFileKey": "dbPjFeLfAFp8Sz9YGPs0CZ",
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

### Key Reference

| Key                      | Type       | Default                                         | Description                                                                              |
| ------------------------ | ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `primaryFileKey`         | `string`   | —                                               | Figma file key. Falls back to `$FIGMA_FILE_KEY` env var if set to `${FIGMA_FILE_KEY}`    |
| `region`                 | `string`   | `"us-east-1"`                                   | Figma API region. Sent as `X-Figma-Region` header. Override with `$FIGMA_REGION` env var |
| `writeMode`              | `string`   | `"office-only"`                                 | Controls write permissions. See table below                                              |
| `codeConnectMode`        | `string`   | `"verify-only"`                                 | Controls Code Connect publish. See table below                                           |
| `routes.pull`            | `string`   | `"ci"`                                          | Context for pull operations (currently advisory)                                         |
| `routes.push`            | `string`   | `"office"`                                      | Context for push operations. Compared against `$FIGMA_WRITE_CONTEXT`                     |
| `routes.publish`         | `string`   | `"office"`                                      | Context for Code Connect publish. Compared against `$FIGMA_WRITE_CONTEXT`                |
| `canary.enabled`         | `boolean`  | `false`                                         | When true, limits push scope to named collections                                        |
| `canary.collectionNames` | `string[]` | `[]`                                            | Collections allowed for push (case-insensitive match)                                    |
| `canary.maxVariables`    | `number`   | `25`                                            | Maximum number of variables allowed per push (safety limit)                              |
| `requiredComponentsPath` | `string`   | `"figma/code-connect/required-components.json"` | Path to required components list                                                         |
| `mappingSourcePath`      | `string`   | `"figma/code-connect/mappings.source.json"`     | Path to hand-maintained mappings                                                         |

### `writeMode` Values

| Value           | Behavior                                                                      |
| --------------- | ----------------------------------------------------------------------------- |
| `"disabled"`    | All push operations blocked, regardless of flags                              |
| `"office-only"` | Push requires `FIGMA_WRITE_CONTEXT=office`. Use for local-only writes         |
| `"ci-enabled"`  | Push allowed from CI (with `FIGMA_WRITE_CONTEXT=ci`) or local (with `office`) |

### `codeConnectMode` Values

| Value               | Behavior                                                |
| ------------------- | ------------------------------------------------------- |
| `"verify-only"`     | Code Connect generate + verify allowed; publish blocked |
| `"publish-enabled"` | Full pipeline: generate + verify + publish allowed      |

### `routes` Values

| Value      | Meaning                                                                            |
| ---------- | ---------------------------------------------------------------------------------- |
| `"ci"`     | Operation is intended for CI. Must match `FIGMA_WRITE_CONTEXT=ci` for push/publish |
| `"office"` | Operation is intended for local/office. Must match `FIGMA_WRITE_CONTEXT=office`    |
| `"manual"` | Operation is manual only (route C)                                                 |

### Recommended Configurations

#### Conservative (Route A — Start Here)

```json
{
  "writeMode": "office-only",
  "codeConnectMode": "verify-only",
  "routes": { "pull": "ci", "push": "office", "publish": "office" },
  "canary": {
    "enabled": true,
    "collectionNames": ["Canary"],
    "maxVariables": 25
  }
}
```

#### Full Automation (Route B)

```json
{
  "writeMode": "ci-enabled",
  "codeConnectMode": "publish-enabled",
  "routes": { "pull": "ci", "push": "ci", "publish": "ci" },
  "canary": { "enabled": false }
}
```

---

## `figma/figma.config.json`

Configuration for the `@figma/code-connect` CLI tool.

```json
{
  "codeConnect": {
    "parser": "react",
    "include": [
      "web-client/components/**/*.{ts,tsx}",
      "web-client/app/**/*.{ts,tsx}",
      "mcp-server/src/widgets/**/*.ts"
    ],
    "exclude": ["**/*.test.*", "**/*.spec.*", "**/node_modules/**"]
  }
}
```

| Key       | Description                            |
| --------- | -------------------------------------- |
| `parser`  | Language parser. `"react"` for JSX/TSX |
| `include` | Glob patterns for source files to scan |
| `exclude` | Glob patterns to exclude from scanning |

---

## `figma/code-connect/mappings.source.json`

Hand-maintained file that maps each component to its Figma node and source file.

```json
{
  "fileKey": "dbPjFeLfAFp8Sz9YGPs0CZ",
  "mappings": [
    {
      "id": "product-grid",
      "componentName": "ProductGrid",
      "label": "React",
      "nodeId": "5007:4606",
      "source": "figma/code-connect/components/ProductGrid.figma.tsx",
      "notes": ""
    }
  ]
}
```

| Key             | Description                                           |
| --------------- | ----------------------------------------------------- |
| `id`            | Unique identifier matching `required-components.json` |
| `componentName` | Human-readable component name                         |
| `label`         | Language/framework label (e.g., "React")              |
| `nodeId`        | Figma node ID (format: `XXXX:YYYY`)                   |
| `source`        | Relative path to the `.figma.tsx` file                |
| `notes`         | Optional notes for this mapping                       |

---

## `figma/code-connect/required-components.json`

List of components that **must** have valid Code Connect mappings for CI to pass.

```json
{
  "components": [
    { "id": "product-grid", "componentName": "ProductGrid", "required": true },
    { "id": "product-card", "componentName": "ProductCard", "required": true },
    {
      "id": "product-detail",
      "componentName": "ProductDetail",
      "required": true
    },
    { "id": "cart-view", "componentName": "CartView", "required": true },
    { "id": "cart-summary", "componentName": "CartSummary", "required": true },
    { "id": "search-bar", "componentName": "SearchBar", "required": true },
    {
      "id": "category-filter",
      "componentName": "CategoryFilter",
      "required": true
    },
    {
      "id": "checkout-form",
      "componentName": "CheckoutForm",
      "required": true
    },
    { "id": "price-tag", "componentName": "PriceTag", "required": true },
    {
      "id": "review-rating",
      "componentName": "ReviewRating",
      "required": true
    },
    {
      "id": "order-confirmation",
      "componentName": "OrderConfirmation",
      "required": true
    },
    { "id": "wishlist", "componentName": "Wishlist", "required": true }
  ]
}
```

| Key             | Description                                   |
| --------------- | --------------------------------------------- |
| `id`            | Must match the `id` in `mappings.source.json` |
| `componentName` | Display name                                  |
| `required`      | If `true`, verification fails when missing    |

---

## `tokens/figma/token-name-map.json`

Custom overrides for CSS variable name inference. The normalizer uses this to map Figma variable names to specific CSS custom property names.

```json
{
  "Brand/800": "--sds-color-background-brand-default",
  "Neutral/100": "--sds-color-background-default-secondary",
  "requiredTokens": [
    "--sds-color-background-default-default",
    "--sds-color-text-default-default",
    "--sds-comp-card-bg"
  ]
}
```

| Key                        | Description                                                                                   |
| -------------------------- | --------------------------------------------------------------------------------------------- |
| `{FigmaName}` → `{CSSVar}` | Override the auto-generated CSS variable name for a specific Figma variable                   |
| `requiredTokens`           | Array of CSS variable names that must exist in the generated CSS (verified by `figma:verify`) |

---

## Environment Variables

| Variable              | Required    | Default                 | Description                                                    |
| --------------------- | ----------- | ----------------------- | -------------------------------------------------------------- |
| `FIGMA_ACCESS_TOKEN`  | Yes         | —                       | Figma Personal Access Token                                    |
| `FIGMA_FILE_KEY`      | Conditional | From `sync.config.json` | Figma file key (overrides config)                              |
| `FIGMA_REGION`        | No          | `"us-east-1"`           | API region (overrides config)                                  |
| `FIGMA_WRITE_CONTEXT` | For writes  | —                       | Must match `routes.push`/`routes.publish` for write operations |

---

## npm Scripts Reference

All scripts are defined in the root `package.json`:

### Core Pipeline

| Script                      | Command                                      | Description                                |
| --------------------------- | -------------------------------------------- | ------------------------------------------ |
| `figma:pull:variables`      | `node scripts/figma-pull-variables.mjs`      | Fetch variables from Figma API             |
| `figma:normalize:variables` | `node scripts/figma-normalize-variables.mjs` | Normalize raw payload                      |
| `figma:generate:tokens`     | `node scripts/figma-generate-tokens.mjs`     | Generate CSS custom property files         |
| `tokens:sync`               | `node scripts/sync-tokens.mjs sync`          | Mirror tokens mcp-server → web-client      |
| `tokens:check`              | `node scripts/sync-tokens.mjs check`         | Check for token drift (CI gate)            |
| `figma:push:variables`      | `node scripts/figma-push-variables.mjs`      | Push CSS values to Figma (dry-run default) |

### Code Connect

| Script                       | Command                                       | Description                      |
| ---------------------------- | --------------------------------------------- | -------------------------------- |
| `figma:codeconnect:generate` | `node scripts/figma-codeconnect-generate.mjs` | Generate mappings.generated.json |
| `figma:codeconnect:verify`   | `node scripts/figma-codeconnect-verify.mjs`   | Verify all required mappings     |
| `figma:codeconnect:publish`  | `node scripts/figma-codeconnect-publish.mjs`  | Publish to Figma Dev Mode        |

### Diagnostics

| Script         | Command                         | Description                              |
| -------------- | ------------------------------- | ---------------------------------------- |
| `figma:probe`  | `node scripts/figma-probe.mjs`  | Test 4 API capabilities, recommend route |
| `figma:verify` | `node scripts/figma-verify.mjs` | Run 5-check verification suite           |

### Orchestrators

| Script            | Command                            | Description                                                   |
| ----------------- | ---------------------------------- | ------------------------------------------------------------- |
| `figma:sync:pull` | `node scripts/figma-sync-pull.mjs` | Full pull pipeline (5 steps)                                  |
| `figma:sync:push` | `node scripts/figma-sync-push.mjs` | Full push pipeline. `--apply` for writes                      |
| `figma:sync:full` | `node scripts/figma-sync-full.mjs` | Complete bidirectional sync. `--apply-push` `--apply-publish` |

---

## GitHub Actions Configuration

### Secrets

| Name                 | Scope                                  | Used By             |
| -------------------- | -------------------------------------- | ------------------- |
| `FIGMA_ACCESS_TOKEN` | Repository + `figma-write` environment | All Figma workflows |
| `FIGMA_FILE_KEY`     | Repository + `figma-write` environment | All Figma workflows |
| `FIGMA_REGION`       | Repository + `figma-write` environment | All Figma workflows |

### Variables

| Name                        | Value                 | Used By                    |
| --------------------------- | --------------------- | -------------------------- |
| `FIGMA_CODECONNECT_PUBLISH` | `"true"` or `"false"` | Code Connect Sync workflow |

### Environments

| Name          | Purpose                           | Optional Guards                  |
| ------------- | --------------------------------- | -------------------------------- |
| `figma-write` | Write operations (push + publish) | Required reviewers, branch rules |

---

## File Paths (PATHS constant)

All paths are defined in `scripts/figma-lib.mjs`:

| Constant              | Path                                             | Generated By                                          |
| --------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| `syncConfig`          | `figma/sync.config.json`                         | Hand-edited                                           |
| `figmaConfig`         | `figma/figma.config.json`                        | Hand-edited                                           |
| `mappingSource`       | `figma/code-connect/mappings.source.json`        | Hand-edited                                           |
| `mappingGenerated`    | `figma/code-connect/mappings.generated.json`     | `figma:codeconnect:generate`                          |
| `requiredComponents`  | `figma/code-connect/required-components.json`    | Hand-edited                                           |
| `tokenNameMap`        | `tokens/figma/token-name-map.json`               | Hand-edited                                           |
| `variablesRaw`        | `tokens/figma/variables.raw.json`                | `figma:pull:variables`                                |
| `variablesNormalized` | `tokens/figma/variables.normalized.json`         | `figma:pull:variables` or `figma:normalize:variables` |
| `variableIds`         | `tokens/figma/.variable-ids.json`                | `figma:pull:variables` or `figma:normalize:variables` |
| `lightCss`            | `mcp-server/tokens/figma-tokens-light.css`       | `figma:generate:tokens`                               |
| `darkCss`             | `mcp-server/tokens/figma-tokens-dark.css`        | `figma:generate:tokens`                               |
| `webLightCss`         | `web-client/tokens/figma-tokens-light.css`       | `tokens:sync`                                         |
| `webDarkCss`          | `web-client/tokens/figma-tokens-dark.css`        | `tokens:sync`                                         |
| `verificationJson`    | `docs/code reports/figma-sync-verification.json` | `figma:verify`                                        |
| `verificationMd`      | `docs/code reports/figma-sync-verification.md`   | `figma:verify`                                        |
| `probeJson`           | `docs/code reports/figma-capability-probe.json`  | `figma:probe`                                         |
| `probeMd`             | `docs/code reports/figma-capability-probe.md`    | `figma:probe`                                         |
| `rolloutLog`          | `docs/code reports/figma-cicd-rollout-log.md`    | All scripts                                           |

---

## Webhook & Production Configuration

### Webhook Receiver Environment Variables

These are used by the Next.js API route (`web-client/app/api/figma-webhook/route.ts`) and/or the standalone receiver (`scripts/figma-webhook-receiver.mjs`):

| Variable | Purpose | Example |
|----------|---------|---------|
| `FIGMA_WEBHOOK_SECRET` | Passcode to validate incoming Figma webhooks | `mcpui-wh-2026-ds-test` |
| `GITHUB_DISPATCH_TOKEN` | GitHub PAT with `repo` scope for `repository_dispatch` | `ghp_...` |
| `GITHUB_REPO` | Target repo in `owner/repo` format | `Kari-Basavaraj/MCP-UI-DEMO-ECOMV2` |
| `FIGMA_FILE_KEY` | Figma file key to filter webhooks | `dbPjFeLfAFp8Sz9YGPs0CZ` |

### Health Monitor Variables (GitHub)

| Variable | Purpose | Set via |
|----------|---------|---------|
| `FIGMA_WEBHOOK_URL` | Webhook receiver URL for health check pings | `gh variable set FIGMA_WEBHOOK_URL --body "https://..."` |

### Vercel Configuration

**File**: `web-client/vercel.json`

```json
{
  "functions": {
    "app/api/figma-webhook/route.ts": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/figma-webhook",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Webhook-Related Files

| File | Purpose |
|------|---------|
| `web-client/app/api/figma-webhook/route.ts` | Production webhook receiver (deploys with Next.js app) |
| `scripts/figma-webhook-receiver.mjs` | Standalone local/dev webhook receiver (port 4848) |
| `scripts/figma-webhook-manage.mjs` | CLI tool for webhook CRUD (create/list/delete) |
| `.github/workflows/figma-webhook-sync.yml` | GitHub Actions workflow triggered by webhooks |
| `.github/workflows/webhook-health.yml` | Daily health monitor for webhook infrastructure |
| `web-client/vercel.json` | Vercel deployment config with webhook route settings |

---

_Next: [09-SAFETY-PATTERNS.md](./09-SAFETY-PATTERNS.md) — All 13 safety guards explained_
