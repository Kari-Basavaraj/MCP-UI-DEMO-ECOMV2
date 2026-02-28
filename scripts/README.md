# Scripts Portability Guide

This directory contains utility scripts for parity tooling and Figma automation.
To keep scripts portable across machines, use environment variables instead of hardcoded paths.

## Required Runtime

- `node` for `.mjs` and MCP helper calls
- `python3` for `.py` scripts

## Environment Variables

- `FOXY_TOOL_CALL`
  - Absolute path to `foxy-tool-call.mjs`
  - Takes highest precedence
- `FOXY_ROOT`
  - Root directory containing `scripts/foxy-tool-call.mjs`
  - Used when `FOXY_TOOL_CALL` is not set
- `JOIN_CHANNEL`
  - Optional, defaults to `default`
- `PRODUCT_IMAGE_DIR`
  - Optional override for product images directory
  - Defaults to `<repo-root>/assets/product-images`
- `WIDGETS_DIR`
  - Optional override for widget HTML directory
  - Defaults to `<repo-root>/mcp-server/widgets`

## Path Resolution Fallback

If `FOXY_TOOL_CALL` and `FOXY_ROOT` are not set, scripts try:

`<repo-root>/../foxy-design-system-master/scripts/foxy-tool-call.mjs`

If unresolved, scripts fail fast with a clear setup error.

## Examples

```bash
# Tokenize widget CSS values (repo-relative default)
python3 scripts/tokenize-widgets.py

# Run with explicit widget directory
WIDGETS_DIR=/path/to/widgets python3 scripts/tokenize-widgets.py

# Export one Figma node image
FOXY_ROOT=/path/to/foxy-design-system-master \
python3 scripts/export-figma-node.py 3036:15036 assets/product-grid-figma-preview.png

# Embed images into Figma nodes
FOXY_TOOL_CALL=/path/to/foxy-design-system-master/scripts/foxy-tool-call.mjs \
PRODUCT_IMAGE_DIR=/path/to/product-images \
python3 scripts/batch-embed-figma-images.py
```
