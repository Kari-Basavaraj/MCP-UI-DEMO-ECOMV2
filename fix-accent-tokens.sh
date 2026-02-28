#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WIDGETS_DIR="${WIDGETS_DIR:-$ROOT_DIR/mcp-server/widgets}"

if [[ ! -d "$WIDGETS_DIR" ]]; then
  echo "Error: widgets directory not found: $WIDGETS_DIR"
  echo "Set WIDGETS_DIR to override."
  exit 1
fi

cd "$WIDGETS_DIR"

sed_in_place() {
  local expr="$1"
  local file="$2"
  if sed --version >/dev/null 2>&1; then
    sed -i "$expr" "$file"
  else
    sed -i '' "$expr" "$file"
  fi
}

for f in *.html; do
  echo "Processing $f..."
  
  # Order matters - replace longer token names first
  sed_in_place 's/--sds-color-accent-text-on-light/--sds-color-text-brand-default/g' "$f"
  sed_in_place 's/--sds-color-accent-text/--sds-color-text-brand-on-brand/g' "$f"
  sed_in_place 's/--sds-color-accent-hover/--sds-color-background-brand-hover/g' "$f"
  sed_in_place 's/--sds-color-accent-light/--sds-color-background-brand-tertiary/g' "$f"
  sed_in_place 's/--sds-color-accent-subtle/--sds-color-background-brand-tertiary/g' "$f"
  
  # Context-aware accent-default: background
  sed_in_place 's/background: var(--sds-color-accent-default)/background: var(--sds-color-background-brand-default)/g' "$f"
  # Context-aware accent-default: color
  sed_in_place 's/color: var(--sds-color-accent-default)/color: var(--sds-color-text-brand-default)/g' "$f"
  # Context-aware accent-default: border-color
  sed_in_place 's/border-color: var(--sds-color-accent-default)/border-color: var(--sds-color-border-brand-default)/g' "$f"
  # Context-aware accent-default: border shorthand
  sed_in_place 's/border: 1px solid var(--sds-color-accent-default)/border: 1px solid var(--sds-color-border-brand-default)/g' "$f"
  # accent-color CSS property
  sed_in_place 's/accent-color: var(--sds-color-accent-default)/accent-color: var(--sds-color-background-brand-default)/g' "$f"
  
  # Star colors
  sed_in_place 's/#f59e0b/var(--sds-color-background-warning-default)/g' "$f"
  
  # space-500 → 20px
  sed_in_place 's/var(--sds-size-space-500)/20px/g' "$f"
done

echo "Done! Checking for any remaining accent references..."
grep -rn 'sds-color-accent' *.html || echo "All accent references cleaned!"
