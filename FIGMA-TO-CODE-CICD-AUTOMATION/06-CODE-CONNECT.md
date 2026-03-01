# 06 — Code Connect

> Link Figma design components to their code implementations so developers see live code in Figma Dev Mode.

---

## What Is Code Connect?

[Figma Code Connect](https://www.figma.com/developers/code-connect) links Figma design components to their source code implementations. When a developer selects a component in Figma's **Dev Mode**, they see the actual code that implements it — not auto-generated CSS/HTML.

```text
Figma Dev Mode:
┌──────────────────────────────────────────┐
│  ProductGrid (selected)                  │
│                                          │
│  Code:                                   │
│  ┌────────────────────────────────────┐  │
│  │ <ProductGrid                      │  │
│  │   products={products}             │  │
│  │   onFilter={handleFilter}         │  │
│  │   onAddToCart={handleAddToCart}    │  │
│  │ />                                │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Source: web-client/components/...       │
└──────────────────────────────────────────┘
```

---

## Architecture

### File Structure

```text
figma/
  figma.config.json             ← Code Connect CLI configuration
  code-connect/
    mappings.source.json        ← Hand-maintained: 12 component definitions
    mappings.generated.json     ← Auto-generated: enriched with fileKey, existence checks
    required-components.json    ← List of components that MUST exist
    components/
      ProductGrid.figma.tsx     ← Component link file
      ProductCard.figma.tsx
      ProductDetail.figma.tsx
      CartView.figma.tsx
      CartSummary.figma.tsx
      SearchBar.figma.tsx
      CategoryFilter.figma.tsx
      CheckoutForm.figma.tsx
      PriceTag.figma.tsx
      ReviewRating.figma.tsx
      OrderConfirmation.figma.tsx
      Wishlist.figma.tsx
```

### 12 Components

| Component         | Node ID     | Source File                                                 |
| ----------------- | ----------- | ----------------------------------------------------------- |
| ProductGrid       | `5007:4606` | `figma/code-connect/components/ProductGrid.figma.tsx`       |
| ProductCard       | `5007:4605` | `figma/code-connect/components/ProductCard.figma.tsx`       |
| ProductDetail     | `5007:4607` | `figma/code-connect/components/ProductDetail.figma.tsx`     |
| CartView          | `5007:4608` | `figma/code-connect/components/CartView.figma.tsx`          |
| CartSummary       | `5007:4609` | `figma/code-connect/components/CartSummary.figma.tsx`       |
| SearchBar         | `5007:4610` | `figma/code-connect/components/SearchBar.figma.tsx`         |
| CategoryFilter    | `5007:4611` | `figma/code-connect/components/CategoryFilter.figma.tsx`    |
| CheckoutForm      | `5007:4612` | `figma/code-connect/components/CheckoutForm.figma.tsx`      |
| PriceTag          | `5007:4613` | `figma/code-connect/components/PriceTag.figma.tsx`          |
| ReviewRating      | `5007:4614` | `figma/code-connect/components/ReviewRating.figma.tsx`      |
| OrderConfirmation | `5007:4615` | `figma/code-connect/components/OrderConfirmation.figma.tsx` |
| Wishlist          | `5007:4667` | `figma/code-connect/components/Wishlist.figma.tsx`          |

---

## How `.figma.tsx` Files Work

Each `.figma.tsx` file uses the `@figma/code-connect` API to declare a link between a Figma node and a code component:

```tsx
import figma from "@figma/code-connect";

figma.connect(
  "https://www.figma.com/design/dbPjFeLfAFp8Sz9YGPs0CZ/MCPUI-DS-V2?node-id=5007:4606",
  {
    example: () => (
      <ProductGrid
        products={products}
        onFilter={handleFilter}
        onAddToCart={handleAddToCart}
        onViewDetails={handleViewDetails}
      />
    ),
  },
);
```

### Anatomy of the URL

```text
https://www.figma.com/design/{FILE_KEY}/{FILE_NAME}?node-id={NODE_ID}
                              ▲                              ▲
                              │                              │
                    figma/sync.config.json          Figma Component ID
                    primaryFileKey                  (colon replaced by hyphen in URL)
```

### Important Rules

1. **Node IDs must refer to COMPONENT nodes** (not frames or groups)
2. **Node IDs are encoded** in URLs: `5007:4606` → `5007-4606` (colon → hyphen)
3. **File key must match** the file where the component lives
4. **The `example` function** shows the code snippet developers see in Dev Mode

---

## Pipeline Steps

### Step 1: Generate Mappings

**Command**: `npm run figma:codeconnect:generate`  
**Script**: `scripts/figma-codeconnect-generate.mjs`

Reads `mappings.source.json` and `required-components.json`, then generates `mappings.generated.json` with:

- Resolved file key
- Source file existence check
- Missing component detection

### Step 2: Verify Mappings

**Command**: `npm run figma:codeconnect:verify`  
**Script**: `scripts/figma-codeconnect-verify.mjs`

Runs 3 checks:

| Check                | What it validates                            | Flag            |
| -------------------- | -------------------------------------------- | --------------- |
| Missing required     | All required components have a mapping entry | Always checked  |
| Missing source files | `.figma.tsx` files exist on disk             | Always checked  |
| Placeholder node IDs | No `TODO` or empty node IDs                  | `--strict` flag |

### Step 3: Publish (Optional)

**Command**: `npm run figma:codeconnect:publish -- --apply`  
**Script**: `scripts/figma-codeconnect-publish.mjs`

What it does:

1. Checks `codeConnectMode` guard (must be `publish-enabled`)
2. Checks `routes.publish` guard (must match `FIGMA_WRITE_CONTEXT`)
3. Checks for unresolved node IDs (blocks publish if any found)
4. Runs `@figma/code-connect` CLI parse to validate
5. Runs `@figma/code-connect` CLI publish to push code links to Figma

### Safety Guards for Publish

```text
codeConnectMode: "publish-enabled"    ← Must be set in sync.config.json
routes.publish: "ci"                  ← Must match FIGMA_WRITE_CONTEXT
No TODO node IDs                      ← All 12 components must have real node IDs
CLI parse succeeds                    ← .figma.tsx files must be valid
```

---

## Adding a New Component

### 1. Create the component in Figma

- Create a new component (not a frame) in the Figma file
- Note its node ID (right-click → "Copy link" → extract `node-id` from URL)

### 2. Add to `required-components.json`

```json
{
  "components": [
    // ... existing entries ...
    {
      "id": "my-new-widget",
      "componentName": "MyNewWidget",
      "required": true
    }
  ]
}
```

### 3. Add to `mappings.source.json`

```json
{
  "mappings": [
    // ... existing entries ...
    {
      "id": "my-new-widget",
      "componentName": "MyNewWidget",
      "label": "React",
      "nodeId": "1234:5678",
      "source": "figma/code-connect/components/MyNewWidget.figma.tsx",
      "notes": ""
    }
  ]
}
```

### 4. Create the `.figma.tsx` file

```tsx
import figma from "@figma/code-connect";

figma.connect(
  "https://www.figma.com/design/YOUR_FILE_KEY/YOUR_FILE_NAME?node-id=1234-5678",
  {
    example: () => <MyNewWidget prop1={value1} prop2={value2} />,
  },
);
```

### 5. Verify and publish

```bash
npm run figma:codeconnect:generate
npm run figma:codeconnect:verify
npm run figma:codeconnect:publish -- --apply
```

---

## Node ID Migration

If you move to a new Figma file (e.g., V1 → V2), you'll need to remap all node IDs:

1. Create/clone all components in the new file
2. Note the new node IDs
3. Update `mappings.source.json` with new node IDs
4. Update each `.figma.tsx` file URL with new file key and node ID
5. Run `figma:codeconnect:generate` + `figma:codeconnect:verify`

### Automation Script

For bulk remapping, use a script like:

```python
import json, re, os

OLD_TO_NEW = {
    "1234:5678": "5007:4606",
    # ... all 12 mappings
}

OLD_FILE_KEY = "old_key"
NEW_FILE_KEY = "new_key"

# Update mappings.source.json
# Update each *.figma.tsx file
# ...
```

---

## Troubleshooting

| Issue                                     | Cause                           | Fix                                          |
| ----------------------------------------- | ------------------------------- | -------------------------------------------- |
| `Missing generated mappings`              | Didn't run generate first       | `npm run figma:codeconnect:generate`         |
| `missingSourceFiles`                      | `.figma.tsx` file doesn't exist | Create the file                              |
| `placeholderNodeIds`                      | Node ID is `TODO` or empty      | Fill in the real node ID from Figma          |
| `Code Connect parse failed`               | Invalid `.figma.tsx` syntax     | Check file for syntax errors                 |
| `Code Connect publish failed`             | Wrong PAT scopes or file key    | Re-check PAT has Code Connect write scope    |
| `Cannot publish with unresolved node IDs` | Some node IDs are still `TODO`  | Update `mappings.source.json` and regenerate |

---

_Next: [07-TROUBLESHOOTING.md](./07-TROUBLESHOOTING.md) — Comprehensive error resolution guide_
