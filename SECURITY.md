# Security Policy — Studio P

## Supported Versions
| Version | Supported |
|---------|-----------|
| main    | ✅ |
| staging | ✅ |

## Reporting a Vulnerability

Email: charleskris9@gmail.com  
Subject: `[SECURITY] <brief description>`

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

We respond within 72 hours. Do not publicly disclose until we've had a chance to remediate.

## Security Measures
- No Supabase service-role key on the client (anon key only via `VITE_SUPABASE_ANON_KEY`)
- Supabase RLS enforced on every table holding user data
- Auth guard on every portal and admin route
- All dependencies audited weekly via gitleaks
- CSP enforced via Vercel headers configuration
- No `innerHTML` with untrusted input — `esc()` used for all user-controlled data

## Known Incidents

**SEC-001 / SEC-002**: A Supabase service_role JWT and anon key were committed in `test-e2e.mjs`
(commit `ba2af40`).

**Partial remediation applied (2026-08-02):** Hardcoded values replaced with `process.env.SUPABASE_ANON_KEY`
and `process.env.SUPABASE_SERVICE_KEY` with a hard fail if env vars are missing. Both copies of the
file (`test-e2e.mjs` and `docs/studio-p-prod/test-e2e.mjs`) are fixed.

**Remaining manual steps (must be done before treating as resolved):**

1. Rotate both keys in the Supabase dashboard: Project Settings → API → "Reset" service_role key and anon key.
   The committed values are now dead but rotation is the only guarantee.

2. Purge from git history:
   ```bash
   pip install git-filter-repo
   git filter-repo --invert-paths --path test-e2e.mjs --path docs/studio-p-prod/test-e2e.mjs
   # Then re-add the clean versions and force-push:
   git push origin main --force
   ```
   Warning: this rewrites history. All forks/clones must be re-cloned after this.

3. After force-push, verify: `git log --all --oneline -- test-e2e.mjs` → no commits with the old content.
