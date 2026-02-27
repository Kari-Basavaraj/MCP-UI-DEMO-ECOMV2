#!/bin/bash
cd /Users/kari.basavaraj.k.m/Documents/code/MCP-UI-Demo-EcomV1/mcp-server/widgets

for f in *.html; do
  echo "Processing $f..."
  
  # Order matters - replace longer token names first
  sed -i '' 's/--sds-color-accent-text-on-light/--sds-color-text-brand-default/g' "$f"
  sed -i '' 's/--sds-color-accent-text/--sds-color-text-brand-on-brand/g' "$f"
  sed -i '' 's/--sds-color-accent-hover/--sds-color-background-brand-hover/g' "$f"
  sed -i '' 's/--sds-color-accent-light/--sds-color-background-brand-tertiary/g' "$f"
  sed -i '' 's/--sds-color-accent-subtle/--sds-color-background-brand-tertiary/g' "$f"
  
  # Context-aware accent-default: background
  sed -i '' 's/background: var(--sds-color-accent-default)/background: var(--sds-color-background-brand-default)/g' "$f"
  # Context-aware accent-default: color
  sed -i '' 's/color: var(--sds-color-accent-default)/color: var(--sds-color-text-brand-default)/g' "$f"
  # Context-aware accent-default: border-color
  sed -i '' 's/border-color: var(--sds-color-accent-default)/border-color: var(--sds-color-border-brand-default)/g' "$f"
  # Context-aware accent-default: border shorthand
  sed -i '' 's/border: 1px solid var(--sds-color-accent-default)/border: 1px solid var(--sds-color-border-brand-default)/g' "$f"
  # accent-color CSS property
  sed -i '' 's/accent-color: var(--sds-color-accent-default)/accent-color: var(--sds-color-background-brand-default)/g' "$f"
  
  # Star colors
  sed -i '' 's/#f59e0b/var(--sds-color-background-warning-default)/g' "$f"
  
  # space-500 → 20px
  sed -i '' 's/var(--sds-size-space-500)/20px/g' "$f"
done

echo "Done! Checking for any remaining accent references..."
grep -rn 'sds-color-accent' *.html || echo "All accent references cleaned!"
