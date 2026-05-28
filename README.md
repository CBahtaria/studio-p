# Studio P — Barbershop Platform

Precision barbershop in Manzini, Eswatini. Production-grade booking platform with real auth, member portal, and admin dashboard.

## Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19, TypeScript, Vite 8            |
| UI         | Radix UI, Tailwind CSS 3.4, custom CSS  |
| Auth       | Supabase Auth (email + Google + Apple)  |
| Database   | Supabase (PostgreSQL) + RLS             |
| Edge Funcs | Supabase Edge Functions (Deno)          |
| Deployment | Vercel (free `.vercel.app` domain)      |
| Email      | Resend (free tier: 3k emails/month)     |
| Desktop    | Pake (Tauri-based native wrapper)       |

## Local Setup

```bash
git clone <repo>
cd studio-p-prod
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

Open http://localhost:5173. Set `VITE_ENABLE_DEMO_MODE=true` for demo login.

## Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy project URL and anon key to `.env.local`
3. Run migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```
4. Enable Google OAuth: Dashboard → Authentication → Providers → Google
5. Enable Apple OAuth: Dashboard → Authentication → Providers → Apple
6. Set email confirmation: Dashboard → Authentication → Settings → Enable email confirmations

## Vercel Deployment

```bash
npm install -g vercel
vercel login
vercel --prod
```

Or connect your GitHub repo in Vercel dashboard for automatic deploys. Set env vars in Vercel dashboard (Settings → Environment Variables):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_ENABLE_DEMO_MODE=false`

Your free domain: `https://<project-name>.vercel.app`

## Desktop App (Pake)

```bash
npm install -g pake-cli
pake https://studio-p.vercel.app --name "Studio P" --width 1280 --height 800
```

Or use `pake.json` config. Outputs a native `.dmg` / `.exe` / `.AppImage`.

## Environment Variables

| Variable                | Required | Description                        |
|-------------------------|----------|------------------------------------|
| `VITE_SUPABASE_URL`     | ✅       | Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY`| ✅       | Supabase anon key (safe to expose) |
| `VITE_GOOGLE_CLIENT_ID` | OAuth    | Google OAuth client ID             |
| `VITE_APPLE_SERVICE_ID` | OAuth    | Apple Sign In service ID           |
| `VITE_ENABLE_DEMO_MODE` | Dev      | `true` to show demo login          |
| `VITE_WHATSAPP_NUMBER`  | Optional | WhatsApp contact number            |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Edge functions only               |
| `RESEND_API_KEY`        | Optional | Email notifications                |

## Architecture

```
src/
├── auth/           AuthService — Supabase auth orchestrator
├── components/     AuthModal, EmailVerification, AgentPanel
├── core/           Logger, Monitor, OS detection (singletons)
├── hooks/          useAuth, useProfile, usePreferences
├── lib/            supabase client, Zod validation schemas
├── portals/        LandingPage, AdminPortal, ViewerEditorPortals
├── services/       BookingService, NotificationService
└── types/          Canonical TypeScript types

supabase/
├── migrations/     001_schema → 002_rls → 003_triggers → 004_ratelimit
├── functions/      validate-booking, send-notification (Deno edge)
└── config.toml     Local dev config
```

## Security

- Email verification required on sign-up
- Sessions managed by Supabase (httpOnly cookies via PKCE flow)
- Row Level Security on all tables
- Rate limiting: 5 auth attempts / 15 min, 5 bookings / day
- CSP, HSTS, X-Frame-Options headers via `vercel.json`
- Demo mode disabled in production

## User Roles

| Role   | Access                                      |
|--------|---------------------------------------------|
| Admin  | Full dashboard, all bookings, user mgmt     |
| Editor | Content management, gallery, announcements  |
| Viewer | Own bookings, member portal, preferences    |
