# Contributing to Studio P

## Prerequisites

- Node 20+
- npm 10+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npm i -g supabase`)
- [gh CLI](https://cli.github.com/) (for managing PRs)

## Local Setup

```bash
git clone https://github.com/<your-org>/studio-p.git
cd studio-p
npm install
cp .env.example .env.local   # then fill in your Supabase credentials
npm run dev
```

## Branch Naming

| Prefix | Use for |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `chore/` | Tooling, deps, config |
| `docs/` | Documentation only |
| `refactor/` | Code restructure without behaviour change |

Example: `feat/add-instagram-gallery`, `fix/booking-rate-limit`

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Google Calendar sync
fix: prevent double-booking on same slot
chore: upgrade Supabase client to v2.50
```

## Before Opening a PR

1. `npm run type-check` — zero errors
2. `npm run build` — clean build
3. `npm run lint` — no new lint warnings
4. Test the change locally against a real Supabase project (not just demo mode)

## Supabase Migrations

If your change requires a schema change:

1. Create a new file: `supabase/migrations/00N_description.sql`
2. Number it sequentially after the last migration
3. Include both the `UP` migration and a comment describing the change
4. Test with `npx supabase db push` against your local/staging project

## Edge Functions

Edge functions live in `supabase/functions/<name>/index.ts` and run on Deno.

Deploy a single function:
```bash
npx supabase functions deploy <name>
```

## Code Style

- TypeScript strict mode — no `any`, no unused vars
- No inline `// TODO` comments — open a GitHub issue instead
- Components: named exports, co-located types
- Hooks: single responsibility, return typed objects

## Getting Help

Open a [GitHub Discussion](../../discussions) or tag `@cbartaria1` in an issue.
