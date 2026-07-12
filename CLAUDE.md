# Studio P — CLAUDE.md

Precision barbershop booking platform (Manzini, Eswatini). Production stack: React 19 + TypeScript + Vite, Radix UI, Tailwind CSS, Supabase (auth + PostgreSQL + RLS + Edge Functions), Vercel deployment, Resend email.

Audience: barbershop staff and clients. Auth paths: email, Google, Apple via Supabase Auth.

---

## Blocking Gates (must be satisfied before any commit to main)

**Phase 1 — Secret scan. Never proceed past this step until it passes.**
```bash
gitleaks detect --source . --no-git
```
`gitleaks detect` must return 0 findings. No Supabase service-role keys, Resend API keys, or Stripe keys in source. `VITE_*` public anon key is acceptable in `.env.example` only, never in committed `.env.local`.

**Phase 2 — Type check.**
```bash
npm run type-check
```
Zero TypeScript errors. Type errors are not warnings — they are blockers.

**Phase 3 — Lint.**
```bash
npm run lint
```
Zero lint errors before commit. Warnings are acceptable only if pre-existing and documented.

**Phase 4 — Build.**
```bash
npm run build
```
Must produce a clean build with no errors. Bundle size regressions over 10% require a documented justification.

---

## Model Routing

- **Sonnet 4.6**: component implementation, Supabase query edits, form logic, hook changes, Tailwind/CSS work.
- **Opus 4.7**: auth flow design, RLS policy review, multi-file coordination, security-touching changes.
- **Haiku 4.5**: file reads, grep, existence checks, quick type lookups.

---

## Review Rubric

An agent's work is **APPROVED** only if ALL of the following hold:

| # | Criterion | How to verify |
|---|-----------|---------------|
| a | Every file the agent claims to have touched has a visible diff | `git diff --name-only` matches the agent's report |
| b | Every finding has a fix AND a verification step | Finding IDs map 1-to-1 in the agent record below |
| c | No new secrets committed | `gitleaks detect` → 0 findings |
| d | Every test the agent named actually ran and passed | Test output included in agent record, no skips |
| e | No doc claim contradicts source | Cross-check any prose claim against the actual file before marking done |

---

## Agent Record Schema

```yaml
agent:         # agent ID or session label
model:         # opus | sonnet | haiku
phase:         # phase number or name within the task
status:        # DONE | NEEDS_REVIEW | BLOCKED
files_touched:
  - src/components/BookingForm.tsx
findings:
  - id:          F-001
    severity:    high | medium | low | info
    title:       Short description
    fix:         What was changed
    verified_by: Command or manual step that confirmed the fix
tests_run:
  - name: type-check + lint + build
    command: npm run type-check && npm run lint && npm run build
tests_result: PASS | FAIL | SKIP
residual_risk: >
  Any known limitation, deferred item, or assumption that must be
  revisited before production release.
```

---

## Key Constraints

- **RLS on every table.** Supabase Row Level Security must be enabled on every table that holds user data. A migration that creates a table without RLS is a blocker.
- **No Supabase service-role key on the client.** Only `VITE_SUPABASE_ANON_KEY` (public) goes into Vite env. Service-role key stays server-side (Edge Functions only).
- **Auth guard on every portal route.** Any route under `/portals/` or `/admin/` must check session before rendering. No client-only auth gates — enforce at the route level.
- **`esc()` or equivalent for user-controlled data rendered into HTML.** No raw `innerHTML` with untrusted input.
- **`prefers-reduced-motion` guard on every new animation.**
- No TypeScript `any` in new code. Use proper types or `unknown` with a type guard.

## Deployment

```bash
# Lint + type-check + build before deploying
npm run lint && npm run type-check && npm run build

# Deploy via Vercel CLI
vercel --prod
```

Do not push directly to main without passing all four blocking gates.
