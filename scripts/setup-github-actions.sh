#!/usr/bin/env bash
# GitHub Actions CI/CD Setup Script
# Run this to configure required secrets, variables, and environments.
#
# Prerequisites:
#   1. GitHub CLI installed and authenticated: gh auth login
#   2. FIGMA_ACCESS_TOKEN set in your shell (Figma personal access token)
#
# Usage:
#   ./scripts/setup-github-actions.sh

set -euo pipefail

REPO="Kari-Basavaraj/MCP-UI-DEMO-ECOMV2"
FIGMA_FILE_KEY="dbPjFeLfAFp8Sz9YGPs0CZ"

echo "=== GitHub Actions CI/CD Setup for $REPO ==="
echo ""

# Check gh auth
if ! gh auth status &>/dev/null; then
  echo "ERROR: GitHub CLI not authenticated. Run: gh auth login"
  exit 1
fi

# Check FIGMA_ACCESS_TOKEN
if [[ -z "${FIGMA_ACCESS_TOKEN:-}" ]]; then
  echo "ERROR: FIGMA_ACCESS_TOKEN not set."
  echo "  Export it: export FIGMA_ACCESS_TOKEN=figd_..."
  exit 1
fi

echo "1/5  Setting secret: FIGMA_ACCESS_TOKEN"
echo "$FIGMA_ACCESS_TOKEN" | gh secret set FIGMA_ACCESS_TOKEN --repo "$REPO"

echo "2/5  Setting secret: FIGMA_FILE_KEY"
echo "$FIGMA_FILE_KEY" | gh secret set FIGMA_FILE_KEY --repo "$REPO"

echo "3/5  Setting secret: FIGMA_REGION (empty = default US)"
echo "" | gh secret set FIGMA_REGION --repo "$REPO"

echo "4/5  Setting variable: FIGMA_CODECONNECT_PUBLISH=true"
gh variable set FIGMA_CODECONNECT_PUBLISH --body "true" --repo "$REPO" 2>/dev/null || \
  echo "  (variable may already exist — update manually if needed)"

echo "5/5  Creating environment: figma-write"
# gh doesn't have a direct "create environment" command,
# but setting a secret scoped to the environment creates it.
echo "$FIGMA_ACCESS_TOKEN" | gh secret set FIGMA_ACCESS_TOKEN \
  --repo "$REPO" --env "figma-write" 2>/dev/null || \
  echo "  (create 'figma-write' environment manually in repo Settings > Environments)"

echo ""
echo "=== Done ==="
echo ""
echo "Verify at: https://github.com/$REPO/settings/secrets/actions"
echo ""
echo "Required secrets:"
echo "  FIGMA_ACCESS_TOKEN  — Figma personal access token (figd_...)"
echo "  FIGMA_FILE_KEY      — $FIGMA_FILE_KEY"
echo "  FIGMA_REGION        — (blank for US, or 'eu' for EU)"
echo ""
echo "Required variable:"
echo "  FIGMA_CODECONNECT_PUBLISH — 'true' to enable Code Connect publish in CI"
echo ""
echo "Required environment:"
echo "  figma-write — protects variable push workflow (Settings > Environments)"
echo "    Add FIGMA_ACCESS_TOKEN as environment secret"
echo "    Optional: require reviewer approval for pushes"
echo ""
echo "Trigger a test run:"
echo "  gh workflow run 'Figma Pull Variables' --repo $REPO"
