# Studio P — Architecture Decisions

## 1. Module Boundaries

```
types/          ← zero dependencies (imported by all)
core/           ← depends on types only
auth/           ← depends on types + core
services/       ← depends on types + core
components/     ← depends on types + core + services
portals/        ← depends on everything
App.tsx         ← assembles all portals + auth
```

No circular dependencies. Each layer imports only from layers below it.

## 2. Auth Flow

```
User clicks "Continue with Google"
  → AuthModal calls authService.signIn('google')
  → AuthService gets GoogleAuthProvider from its provider map
  → GoogleAuthProvider.signIn() → opens OAuth popup (prod) / simulates (demo)
  → GoogleAuthProvider.getUserInfo(token) → fetches profile from Google API
  → AuthService.buildProfile() → creates UserProfile with defaults
  → AuthService saves to localStorage (for session persistence)
  → AuthService.setUser() binds userId to Logger
  → AuthModal shows profile-complete step (phone optional)
  → User confirms → App receives UserProfile → routes to correct portal
```

## 3. Logger Design

- **Singleton**: one logger instance for the entire app lifetime
- **Ring buffer**: avoids unbounded memory growth (capped at 500 entries)
- **Observer pattern**: React components subscribe to live entries for DevLogPanel
- **Level stripping**: `debug` logs are stripped in production at runtime (not just hidden)
- **Session correlation**: every entry carries `sessionId` so you can filter a session's logs

## 4. Booking Validation (Agent Orchestration)

The parallel agent system is designed to be replaced with real Supabase Edge Functions:

```
Current (client-side simulation):
  Promise.all([runAgent(), ...]) → synthetic delays

Production (server-side):
  POST /api/bookings/validate
    → Supabase Edge Function orchestrates:
      - State Agent  (validate request fields)
      - Security Agent (rate limiting, abuse detection)
      - DB Agent (check barber availability, write booking)
      - RLS Agent (verify anon key policies)
    → Returns { approved, bookingId, confidence }
```

## 5. CSS Architecture

No Tailwind in the final bundle — pure CSS custom properties. This keeps the bundle lean and gives full control over the design system without a purge step.

Design tokens live in `:root` in `index.css`. Portal themes override `--port-*` variables at the component level using `useEffect` + `documentElement.style.setProperty`. This ensures:
- Zero style conflicts between portals
- Instant portal theme switching
- No class toggling on `<body>`

## 6. Session Storage

```
localStorage key: studiop_auth_v1
Value: { token: OAuthToken, profile: UserProfile }
Expiry: checked on load (token.expiresAt > Date.now())
```

For production, replace with httpOnly cookies + server-side session validation.

## 7. OS Adaptive UI

`detectOS()` runs once at module import time, not inside React. The result (`osInfo`) is a stable singleton used by:
- `MacBar` (hidden on mobile)
- `Dock` (position adjusted per OS)
- `App` (padding top/bottom)
- `--bar-h` CSS variable (set via `documentElement.style.setProperty`)

## 8. Adding a New OAuth Provider

1. Create `src/auth/providers/TwitterAuthProvider.ts` implementing `IAuthProvider`
2. Register it in `AuthService` constructor: `this.providers.set('twitter', new TwitterAuthProvider())`
3. Add a button in `AuthModal.tsx`
4. Add `'twitter'` to the `AuthProvider` union type in `types/index.ts`

Zero changes to core logic.
