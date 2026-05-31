#!/usr/bin/env bash
# Studio P — Blue-Green Deployment Manager
#
# Blue  = main branch    → studiop.sz  (production)
# Green = staging branch → Vercel preview URL (tested before going live)
#
# Usage:
#   ./scripts/blue-green.sh status        — show current deployment state
#   ./scripts/blue-green.sh deploy-green  — push HEAD to staging (builds green)
#   ./scripts/blue-green.sh promote       — merge staging → main (goes live)
#   ./scripts/blue-green.sh rollback      — revert production to previous deployment
#   ./scripts/blue-green.sh diff          — show commits in green not yet in blue

set -euo pipefail

BLUE_BRANCH="main"
GREEN_BRANCH="staging"

# ── Helpers ────────────────────────────────────────────────────────────────

_require_clean_tree() {
  if ! git diff --quiet HEAD 2>/dev/null; then
    echo "Error: uncommitted changes — commit or stash first." >&2
    exit 1
  fi
}

_require_tool() {
  if ! command -v "$1" &>/dev/null; then
    echo "Error: '$1' is required but not installed." >&2
    exit 1
  fi
}

# ── Commands ───────────────────────────────────────────────────────────────

cmd_status() {
  echo "╔══════════════════════════════════════╗"
  echo "║   Studio P — Blue-Green Status       ║"
  echo "╚══════════════════════════════════════╝"
  echo ""

  local blue_sha green_sha
  blue_sha=$(git rev-parse --short "origin/$BLUE_BRANCH" 2>/dev/null || echo "not found")
  green_sha=$(git rev-parse --short "origin/$GREEN_BRANCH" 2>/dev/null || echo "not deployed")

  echo "  BLUE  (production) → $BLUE_BRANCH:   $blue_sha"
  echo "  GREEN (staging)    → $GREEN_BRANCH: $green_sha"
  echo ""

  # Commits in green ahead of blue
  local ahead
  ahead=$(git rev-list --count "origin/$BLUE_BRANCH..origin/$GREEN_BRANCH" 2>/dev/null || echo "?")
  if [ "$green_sha" != "not deployed" ]; then
    echo "  Green is $ahead commit(s) ahead of blue."
    echo "  Run 'diff' to see what would be promoted."
  fi
  echo ""

  echo "  Recent Vercel deployments:"
  vercel ls --limit 5 2>/dev/null \
    | sed 's/^/    /' \
    || echo "    (run 'vercel login' to list deployments)"
}

cmd_deploy_green() {
  _require_clean_tree

  echo "Pushing HEAD → $GREEN_BRANCH (green environment)..."
  git push origin "HEAD:refs/heads/$GREEN_BRANCH" --force-with-lease
  echo ""
  echo "✓ Green deployment triggered on Vercel."
  echo ""
  echo "  The preview URL will be listed in the Vercel dashboard under"
  echo "  the '$GREEN_BRANCH' branch. It usually takes ~90 seconds to build."
  echo ""
  echo "  Test the preview, then run:"
  echo "    ./scripts/blue-green.sh promote"
}

cmd_promote() {
  _require_clean_tree

  git fetch origin "$BLUE_BRANCH" "$GREEN_BRANCH"

  local ahead
  ahead=$(git rev-list --count "origin/$BLUE_BRANCH..origin/$GREEN_BRANCH" 2>/dev/null || echo 0)

  if [ "$ahead" -eq 0 ]; then
    echo "Nothing to promote — green is identical to blue."
    exit 0
  fi

  echo "Promoting $ahead commit(s) from green → blue (production)..."
  echo ""

  local current_branch
  current_branch=$(git rev-parse --abbrev-ref HEAD)

  git checkout "$BLUE_BRANCH"
  git reset --hard "origin/$BLUE_BRANCH"

  # --no-ff gives a clear promotion commit in the git log
  git merge "origin/$GREEN_BRANCH" --no-ff \
    -m "deploy: promote staging → production"

  git push origin "$BLUE_BRANCH"
  git checkout "$current_branch"

  echo ""
  echo "✓ Green promoted — Vercel is deploying to production now."
  echo "  Monitor: vercel ls --limit 3"
  echo ""
  echo "  To rollback if anything goes wrong:"
  echo "    ./scripts/blue-green.sh rollback"
}

cmd_rollback() {
  _require_tool vercel

  echo "Rolling back production to the previous Vercel deployment..."
  vercel rollback --yes
  echo ""
  echo "✓ Production rolled back instantly (no redeploy needed)."
  echo ""
  echo "  Note: git history is unchanged. To re-promote when ready:"
  echo "    ./scripts/blue-green.sh promote"
}

cmd_diff() {
  git fetch origin "$BLUE_BRANCH" "$GREEN_BRANCH" 2>/dev/null

  local ahead
  ahead=$(git rev-list --count "origin/$BLUE_BRANCH..origin/$GREEN_BRANCH" 2>/dev/null || echo 0)

  if [ "$ahead" -eq 0 ]; then
    echo "Green is identical to blue — nothing to promote."
  else
    echo "=== $ahead commit(s) in green not yet in blue ==="
    git log --oneline "origin/$BLUE_BRANCH..origin/$GREEN_BRANCH"
  fi
}

# ── Entry point ────────────────────────────────────────────────────────────

case "${1:-status}" in
  status)       cmd_status       ;;
  deploy-green) cmd_deploy_green ;;
  promote)      cmd_promote      ;;
  rollback)     cmd_rollback     ;;
  diff)         cmd_diff         ;;
  *)
    echo "Usage: $0 [status|deploy-green|promote|rollback|diff]"
    echo ""
    echo "  status        Show current blue/green deployment state"
    echo "  deploy-green  Push HEAD to staging (triggers Vercel green build)"
    echo "  promote       Merge staging → main (goes live on production)"
    echo "  rollback      Revert production to previous Vercel deployment"
    echo "  diff          Show commits in green not yet promoted to blue"
    exit 1
    ;;
esac
