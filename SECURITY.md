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

**SEC-001 / SEC-002**: A Supabase service_role JWT and anon key were committed in `test-e2e.mjs`.  
Status: **Pending remediation** — keys must be rotated in Supabase dashboard, then the file  
must be purged from git history using `git-filter-repo`. Do not merge to main until complete.
