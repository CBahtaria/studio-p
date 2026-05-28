# Studio P — Project Manifest

## Files & Ownership

| File | Owner | Description |
|------|-------|-------------|
| `src/types/index.ts` | All | Canonical type definitions. Change with care — touches every module |
| `src/core/logger.ts` | Platform | Structured logger singleton. Do not instantiate directly |
| `src/core/monitor.ts` | Platform | Perf marks & health. Extend `getHealth()` with real endpoints |
| `src/core/osDetect.ts` | Platform | OS detection. Stable — only change if new OS classes are needed |
| `src/auth/AuthService.ts` | Auth | OAuth orchestrator. Add providers here |
| `src/auth/ProfileService.ts` | Auth | Profile validation & merge. Business rules for user data |
| `src/services/BookingService.ts` | Booking | Agent orchestration. Replace sim functions with real API calls |
| `src/components/AuthModal.tsx` | UI | Sign-in flow. Handles all OAuth UI states |
| `src/components/AgentPanel.tsx` | UI | Agent visualiser. Pure display component |
| `src/components/DevLogPanel.tsx` | Platform | Dev-only log viewer. Safe to leave — no-ops in production |
| `src/portals/LandingPage.tsx` | Marketing | Public site. Static content + service list |
| `src/portals/AdminPortal.tsx` | Admin | Command centre. Add new admin sections to the `NAV` array |
| `src/portals/ViewerEditorPortals.tsx` | Product | Member + editor portals |
| `src/App.tsx` | Core | App shell. Routing, auth state, OS chrome |
| `.env.example` | DevOps | Template for all environment variables |
| `ARCHITECTURE.md` | Architecture | Design decisions & extension guides |
| `bundle.html` | Deploy | Self-contained single-file build |

## Git Conventions

```
feat(auth):    new OAuth provider or auth feature
feat(booking): booking flow changes
fix(ui):       visual/UX fixes
chore:         tooling, deps, config
docs:          README, ARCHITECTURE, comments
```

## Environment Checklist (before deploying)

- [ ] `VITE_GOOGLE_CLIENT_ID` set with correct origins
- [ ] `VITE_APPLE_SERVICE_ID` set and domain verified
- [ ] `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` set
- [ ] `VITE_ENABLE_DEMO_MODE=false`
- [ ] `SUPABASE_SERVICE_KEY` only in server env (never in Vite config)
- [ ] RLS policies applied to all tables
- [ ] CORS allowed origins configured in Supabase

## Dependency Map

```
React 18          — UI
TypeScript 5      — Type safety
Vite 8            — Build + dev server
DM Sans/Mono      — Body + code typography
Cormorant Garamond — Display typography
Supabase (prod)   — DB + Auth + Storage + Edge Functions
Google OAuth      — Gmail sign-in
Apple Sign In     — iCloud sign-in
```

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.2s |
| Time to Interactive | < 2.0s |
| Bundle size (gzip) | < 80KB JS |
| Agent validation round-trip | < 500ms |
| Logger ring buffer | 500 entries |
| Monitor rolling avg window | 50 samples |
