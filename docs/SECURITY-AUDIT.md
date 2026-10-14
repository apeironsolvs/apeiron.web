# Security audit — 2026-10-13 (version 9)

**Method.** Every item below was checked by running something: the automated tests (`npm test`, 41 tests), the browser test (`python tests/smoke.py`, 73 checks covering the whole client and admin journey), and live probes against a server started in production mode. A search for keys, tokens and private-key blocks found nothing. **Not done:** a professional penetration test, tests on the live host, tests on real phones, and a real inbox delivery test.

## Your security list, item by item
| # | You asked for | Status | Evidence | What is left |
|---|---|---|---|---|
| 1 | Hide API keys | Done | No keys in code, docs or browser files; secrets scan clean; `.gitignore` blocks `.env`, `*.pem`, `*.key`, databases | Put real values only in `.env` or host settings |
| 2 | Check environment variables | Done | `.env.example` lists names only; server warns at start-up about missing email, missing staff IP list, non-https webhook/origin; refuses a data folder inside the site folder | Fill `.env` on the live server |
| 3 | Protect admin routes | Done | The admin area is now a **separate website** (own port, bound to this computer by default). The public website returns 404 for every admin page and API; the admin website returns 404 for every public/client route. Login, lockout, CSRF, rate limit, never framed, never cached; optional `ADMIN_ALLOWED_IPS` | **Set `ADMIN_ALLOWED_IPS` or a firewall/VPN live.** No second factor (MFA) yet |
| 4 | Authentication and access control | Done | Clients: email + password (hashed), 30-day remembered login, Terms acceptance required to create an account and re-required if the Terms change; staff: separate login. Clients can only reach their own rows (tested); client and staff sessions cannot open each other's areas (tested) | Custom auth: move to a managed provider (or add email verification and MFA) before payments. Registration does not verify the email address |
| 5 | Sanitize forms | Done | Server-side validation on every field; control characters and line breaks stripped; honeypot; length caps | — |
| 6 | Protect against XSS | Done | CSP with no inline script and no eval; all server text written with `textContent`; browser test proves a script payload is shown as plain text in the builder and the admin panel | CSP still allows inline *styles* |
| 7 | Rate limits | Done | Limits on enquiries, sign-in codes, code checks, staff login, quotes (see rules.md section 9); tested | Limiter is in memory: fine for one server |
| 8 | Secure the API | Done | JSON only, size caps, Origin check, no CORS, no stack traces; unknown routes 404; prices computed server-side | — |
| 9 | Check core settings | Done | Request/header timeouts, body caps, GET/HEAD only for files (PUT returns 405), config guards | — |
| 10 | Security headers | Done | Probe (production mode) shows CSP, HSTS, nosniff, referrer policy, permissions policy, COOP on pages; API replies `no-store` | Re-check on the live host (securityheaders.com) |
| 11 | Debug mode off | Done | No debug mode or endpoints; generic error replies; logs hold no bodies, emails or codes | — |
| 12 | Update dependencies | **Partly** | The server has **0** npm packages. The one outside library, Three.js, is **r128 (2021)** | Upgrade Three.js and re-test the 3D scene (see `DEPENDENCIES.md`) |
| 13 | Remove what is not needed | Done | Duplicate site copy, install snippets, duplicate fonts, unused code removed in earlier rounds | — |
| 14 | Exposed files hidden | Done | Probe: `/.env`, `/.git/config`, `/server/index.js`, `/data/apeiron.db`, `/docs/memory.md`, `/package.json`, `/_headers`, `/tests/…`, `/scripts/…`, path traversal all return 404; database and secret file types blocked even inside the site folder | — |
| 15 | Secure the database | Mostly | Parameterised queries (injection test), owner-only folder, `secure_delete`, auto-purge after retention, audit log, `npm run backup` | SQLite file is not encrypted by the app: use an encrypted disk/volume and encrypted backups stored off the server |
| 16 | Hash passwords | Done | scrypt N=2^16 r=8 p=2 with per-password salt for clients and staff; plain passwords are never stored, logged or returned; first admin password is read from `.env` once and stored only as a hash | Argon2id was requested; not available without a package (recorded exception). The `ADMIN_PASSWORD` line must be deleted from `.env` after first start |
| 17 | Full security audit | Done (this file) | — | Book an independent penetration test before taking payments or sensitive data |

## New in version 9 (owner request)
- Password accounts replaced email-code sign-in; mandatory Terms and Privacy acceptance (version tracked); 30-day remembered login; password reset by emailed code; self-service account deletion.
- Request workflow: Pending (red) / Accepted (green) / Rejected, admin approve/reject with messages, comment threads, emails to staff and clients.
- Separate admin website. Tests added for: Terms refusal, weak passwords, duplicate and takeover attempts, lockout, remembered session, terms-version change blocking login, reset-code rules, ownership isolation, CSRF on staff actions, the public/admin split, first-admin creation from `.env`, account deletion.
- Found by looking at the real screens: the admin sign-in form stayed visible after login (a styling rule overrode the hidden attribute). Fixed.
- Found by tests: the admin website's pages were cached like public pages; it now sends `no-store`.

## Other findings fixed in earlier rounds
- Your uploaded folder mixed old and new files: new folders (server, admin, start, account, projects) sat next to **30 older files** that still used the previous form, had a header policy that blocked the demo windows, and ran only 11 of the tests. All replaced; nothing of yours was lost (no file had been edited by you).
- Added: database/secret file-type blocking, start-up configuration guard, staff IP allow-list, backup script, and tests for each.

## Remaining risks, in plain words
1. Three.js r128 is old (2021). It is not a known hole in how this site uses it, but it should be upgraded.
2. Staff login has no second factor. An allow-list plus a long password is the current protection.
3. Anyone can register with any email address (no email verification), so notification emails could be triggered towards someone else's address; sign-ups are rate limited. Anyone who can read a client's email can reset that client's password.
4. One server only: the rate limiter and the database are local to it.
5. The privacy and terms text are drafts for a lawyer; prices and the contact email are placeholders.
