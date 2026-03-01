#!/usr/bin/env bash
# ============================================================================
# Figma ↔ Code CI/CD — One-Click Setup
# ============================================================================
# Usage:
#   chmod +x FIGMA-TO-CODE-CICD-AUTOMATION/scripts/setup.sh
#   ./FIGMA-TO-CODE-CICD-AUTOMATION/scripts/setup.sh
#
# This script walks you through the full initial setup of the Figma-to-Code
# CI/CD pipeline. It checks prerequisites, prompts for credentials, configures
# GitHub secrets, runs an initial pull, and verifies the pipeline.
# ============================================================================

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Helpers
info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✅${NC} $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
fail()    { echo -e "${RED}❌${NC} $1"; exit 1; }
step()    { echo -e "\n${BOLD}━━━ Step $1: $2 ━━━${NC}"; }

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Figma ↔ Code CI/CD Pipeline — Setup Wizard    ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ──────────────────────────────────────────────────────────────────────
# Step 1: Check prerequisites
# ──────────────────────────────────────────────────────────────────────
step "1/8" "Checking prerequisites"

MISSING=()

command -v node >/dev/null 2>&1 || MISSING+=("node")
command -v npm  >/dev/null 2>&1 || MISSING+=("npm")
command -v git  >/dev/null 2>&1 || MISSING+=("git")
command -v gh   >/dev/null 2>&1 || MISSING+=("gh (GitHub CLI)")

if [ ${#MISSING[@]} -gt 0 ]; then
  fail "Missing tools: ${MISSING[*]}\n   Install them and re-run this script."
fi

# Check Node.js version (need >= 18)
NODE_MAJOR=$(node -e "console.log(process.version.split('.')[0].replace('v',''))")
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js >= 18 required (found v$NODE_MAJOR). Upgrade and re-run."
fi

# Check gh auth
if ! gh auth status >/dev/null 2>&1; then
  warn "GitHub CLI not authenticated. Run: gh auth login"
  read -rp "Press Enter after authenticating, or Ctrl+C to abort... "
fi

success "Prerequisites: node $(node -v), npm $(npm -v), git $(git --version | cut -d' ' -f3), gh $(gh --version | head -1 | awk '{print $NF}')"

# ──────────────────────────────────────────────────────────────────────
# Step 2: Detect repository root
# ──────────────────────────────────────────────────────────────────────
step "2/8" "Detecting repository"

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [ -z "$REPO_ROOT" ]; then
  fail "Not inside a git repository. Clone the repo first and cd into it."
fi

cd "$REPO_ROOT"
info "Repository root: $REPO_ROOT"

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "unknown")
info "Remote: $REMOTE_URL"

# Extract owner/repo
REPO_SLUG=$(echo "$REMOTE_URL" | sed -E 's#.*github.com[:/]([^/]+/[^/.]+)(\.git)?$#\1#')
info "Repository: $REPO_SLUG"

success "Repository detected"

# ──────────────────────────────────────────────────────────────────────
# Step 3: Collect Figma credentials
# ──────────────────────────────────────────────────────────────────────
step "3/8" "Collecting Figma credentials"

echo ""
info "You'll need:"
info "  1. A Figma Personal Access Token (PAT)"
info "     → Create at: https://www.figma.com/developers/api#access-tokens"
info "     → Required scopes: File content (Read), Variables (Read+Write)"
info "  2. Your Figma file key"
info "     → From URL: figma.com/design/{FILE_KEY}/..."
echo ""

# Check if already set in environment
if [ -n "${FIGMA_ACCESS_TOKEN:-}" ]; then
  info "FIGMA_ACCESS_TOKEN already set in environment"
  read -rp "   Use existing token? [Y/n] " USE_EXISTING_TOKEN
  if [[ "${USE_EXISTING_TOKEN,,}" == "n" ]]; then
    unset FIGMA_ACCESS_TOKEN
  fi
fi

if [ -z "${FIGMA_ACCESS_TOKEN:-}" ]; then
  read -rsp "   Enter Figma PAT (input hidden): " FIGMA_ACCESS_TOKEN
  echo ""
  export FIGMA_ACCESS_TOKEN
fi

# Validate token with a quick API call
info "Validating token..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/me")

if [ "$HTTP_CODE" != "200" ]; then
  fail "Token validation failed (HTTP $HTTP_CODE). Check your PAT and try again."
fi
success "Token validated"

# File key
EXISTING_KEY=$(node -e "
  try {
    const c = JSON.parse(require('fs').readFileSync('figma/sync.config.json','utf8'));
    console.log(c.primaryFileKey || '');
  } catch(e) { console.log(''); }
" 2>/dev/null || echo "")

if [ -n "$EXISTING_KEY" ] && [ "$EXISTING_KEY" != '${FIGMA_FILE_KEY}' ]; then
  info "File key found in sync.config.json: $EXISTING_KEY"
  read -rp "   Use this file key? [Y/n] " USE_EXISTING_KEY
  if [[ "${USE_EXISTING_KEY,,}" != "n" ]]; then
    FIGMA_FILE_KEY="$EXISTING_KEY"
  fi
fi

if [ -z "${FIGMA_FILE_KEY:-}" ]; then
  read -rp "   Enter Figma file key: " FIGMA_FILE_KEY
fi

export FIGMA_FILE_KEY

# Validate file key
info "Validating file key..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-Figma-Token: $FIGMA_ACCESS_TOKEN" \
  "https://api.figma.com/v1/files/$FIGMA_FILE_KEY/variables/local")

if [ "$HTTP_CODE" != "200" ]; then
  fail "File key validation failed (HTTP $HTTP_CODE). Check the key and permissions."
fi
success "File key validated: $FIGMA_FILE_KEY"

# ──────────────────────────────────────────────────────────────────────
# Step 4: Set GitHub secrets
# ──────────────────────────────────────────────────────────────────────
step "4/8" "Configuring GitHub secrets"

read -rp "   Set GitHub repository secrets now? [Y/n] " SET_SECRETS
if [[ "${SET_SECRETS,,}" != "n" ]]; then
  info "Setting repository secrets..."
  
  echo "$FIGMA_ACCESS_TOKEN" | gh secret set FIGMA_ACCESS_TOKEN --repo "$REPO_SLUG"
  success "FIGMA_ACCESS_TOKEN set"
  
  echo "$FIGMA_FILE_KEY" | gh secret set FIGMA_FILE_KEY --repo "$REPO_SLUG"
  success "FIGMA_FILE_KEY set"

  echo "us-east-1" | gh secret set FIGMA_REGION --repo "$REPO_SLUG"
  success "FIGMA_REGION set"

  # Check if figma-write environment exists, create if not
  info "Checking figma-write environment..."
  if gh api "repos/$REPO_SLUG/environments/figma-write" >/dev/null 2>&1; then
    info "figma-write environment already exists"
  else
    info "Creating figma-write environment..."
    gh api --method PUT "repos/$REPO_SLUG/environments/figma-write" >/dev/null 2>&1 || true
  fi

  # Set secrets for figma-write environment
  echo "$FIGMA_ACCESS_TOKEN" | gh secret set FIGMA_ACCESS_TOKEN --repo "$REPO_SLUG" --env figma-write
  echo "$FIGMA_FILE_KEY" | gh secret set FIGMA_FILE_KEY --repo "$REPO_SLUG" --env figma-write
  echo "us-east-1" | gh secret set FIGMA_REGION --repo "$REPO_SLUG" --env figma-write
  success "figma-write environment secrets set"

  # Set FIGMA_WRITE_CONTEXT variable
  gh variable set FIGMA_WRITE_CONTEXT --repo "$REPO_SLUG" --env figma-write --body "ci" 2>/dev/null || true
  success "FIGMA_WRITE_CONTEXT variable set"

  # Set Code Connect publish variable
  gh variable set FIGMA_CODECONNECT_PUBLISH --repo "$REPO_SLUG" --body "true" 2>/dev/null || true
  success "FIGMA_CODECONNECT_PUBLISH variable set"
else
  warn "Skipping GitHub secrets. Set them manually before using CI."
fi

# ──────────────────────────────────────────────────────────────────────
# Step 5: Install dependencies
# ──────────────────────────────────────────────────────────────────────
step "5/8" "Installing dependencies"

info "Installing root dependencies..."
npm install --no-audit --no-fund 2>&1 | tail -1

if [ -d "mcp-server" ]; then
  info "Installing mcp-server dependencies..."
  (cd mcp-server && npm install --no-audit --no-fund 2>&1 | tail -1)
fi

if [ -d "web-client" ]; then
  info "Installing web-client dependencies..."
  (cd web-client && npm install --no-audit --no-fund 2>&1 | tail -1)
fi

success "Dependencies installed"

# ──────────────────────────────────────────────────────────────────────
# Step 6: Run probe
# ──────────────────────────────────────────────────────────────────────
step "6/8" "Running capability probe"

info "Testing Figma API capabilities..."
npm run figma:probe 2>&1 | grep -E "✅|❌|Route" | head -10

success "Probe complete — check docs/code reports/figma-capability-probe.md for details"

# ──────────────────────────────────────────────────────────────────────
# Step 7: Initial pull
# ──────────────────────────────────────────────────────────────────────
step "7/8" "Running initial token pull"

info "Pulling variables from Figma → code..."
npm run figma:sync:pull 2>&1 | grep -E "✅|❌|wrote|tokens" | head -20

success "Initial pull complete"

# Show generated files
echo ""
info "Generated files:"
[ -f "tokens/figma/variables.raw.json" ]        && success "tokens/figma/variables.raw.json"        || warn "tokens/figma/variables.raw.json missing"
[ -f "tokens/figma/variables.normalized.json" ]  && success "tokens/figma/variables.normalized.json"  || warn "tokens/figma/variables.normalized.json missing"
[ -f "mcp-server/tokens/figma-tokens-light.css" ] && success "mcp-server/tokens/figma-tokens-light.css" || warn "mcp-server/tokens/figma-tokens-light.css missing"
[ -f "mcp-server/tokens/figma-tokens-dark.css" ]  && success "mcp-server/tokens/figma-tokens-dark.css"  || warn "mcp-server/tokens/figma-tokens-dark.css missing"
[ -f "web-client/tokens/figma-tokens-light.css" ]  && success "web-client/tokens/figma-tokens-light.css"  || warn "web-client/tokens/figma-tokens-light.css missing"

# ──────────────────────────────────────────────────────────────────────
# Step 8: Verify
# ──────────────────────────────────────────────────────────────────────
step "8/8" "Running verification"

info "Running full verification suite..."
npm run figma:verify 2>&1 | grep -E "✅|❌|⚠|PASS|FAIL" | head -20

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║             Setup Complete! 🎉                  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Push changes:   git add -A && git commit -m 'feat: initial Figma sync' && git push"
echo "  2. Verify CI:      gh run list --limit 5"
echo "  3. Read the guide: FIGMA-TO-CODE-CICD-AUTOMATION/00-OVERVIEW.md"
echo ""
echo "Common commands:"
echo "  npm run figma:sync:pull         Pull changes from Figma"
echo "  npm run figma:sync:push         Push to Figma (dry-run)"
echo "  npm run figma:sync:push --apply Push to Figma (for real)"
echo "  npm run figma:verify            Run all checks"
echo ""
