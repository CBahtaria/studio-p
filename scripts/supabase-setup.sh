#!/usr/bin/env bash
# Studio P — Supabase project setup helper
# Usage: bash scripts/supabase-setup.sh

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[info]${NC}  $*"; }
success() { echo -e "${GREEN}[ok]${NC}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}  $*"; }
error()   { echo -e "${RED}[error]${NC} $*"; exit 1; }

echo ""
echo "  ╔══════════════════════════════╗"
echo "  ║   Studio P — Supabase Setup  ║"
echo "  ╚══════════════════════════════╝"
echo ""

# ── 1. Check prerequisites ───────────────────────────────────────────────────

command -v node  >/dev/null 2>&1 || error "Node.js is required. Install from https://nodejs.org"
command -v npx   >/dev/null 2>&1 || error "npx is required (comes with npm 5.2+)"

info "Node $(node -v) detected"

# ── 2. .env.local ─────────────────────────────────────────────────────────────

if [ ! -f ".env.local" ]; then
  warn ".env.local not found — creating from .env.example"
  cp .env.example .env.local
  echo ""
  echo "  Open .env.local and fill in:"
  echo "    VITE_SUPABASE_URL     → your Supabase project URL"
  echo "    VITE_SUPABASE_ANON_KEY → your Supabase anon key"
  echo ""
  read -r -p "  Press Enter once you've saved .env.local..."
fi

# ── 3. Validate required vars ─────────────────────────────────────────────────

source .env.local 2>/dev/null || true

[ -z "${VITE_SUPABASE_URL:-}" ]      && error "VITE_SUPABASE_URL is not set in .env.local"
[ -z "${VITE_SUPABASE_ANON_KEY:-}" ] && error "VITE_SUPABASE_ANON_KEY is not set in .env.local"

success "VITE_SUPABASE_URL = $VITE_SUPABASE_URL"

# ── 4. Link Supabase project ──────────────────────────────────────────────────

PROJECT_REF=$(echo "$VITE_SUPABASE_URL" | sed 's|https://||' | cut -d. -f1)
info "Linking to Supabase project: $PROJECT_REF"

npx supabase link --project-ref "$PROJECT_REF" || \
  warn "Could not auto-link. You may need to run: npx supabase login"

# ── 5. Push migrations ────────────────────────────────────────────────────────

info "Pushing database migrations..."
npx supabase db push
success "Migrations applied"

# ── 6. Deploy edge functions ──────────────────────────────────────────────────

if [ -d "supabase/functions" ]; then
  info "Deploying edge functions..."
  for fn in supabase/functions/*/; do
    fn_name=$(basename "$fn")
    npx supabase functions deploy "$fn_name" && success "Deployed: $fn_name" || warn "Failed: $fn_name"
  done
fi

# ── 7. Done ───────────────────────────────────────────────────────────────────

echo ""
success "Supabase setup complete!"
echo ""
echo "  Next steps:"
echo "  1. Enable Google/Apple OAuth in Supabase Dashboard → Auth → Providers"
echo "  2. Set VITE_ENABLE_DEMO_MODE=false in Vercel project settings"
echo "  3. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel env vars"
echo "  4. (Optional) Set RESEND_API_KEY in Supabase edge function secrets"
echo ""
