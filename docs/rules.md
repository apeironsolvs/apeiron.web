# rules.md — Rule book for AI assistants

Applies to every AI tool working in this repo (Claude, Copilot, Cursor, others). Read this file, `Architecture.md` and `memory.md` before changing anything. If a rule here conflicts with a user request, stop and ask.

---

## 1. Start and finish routine

1. **Start:** read `memory.md`, then `task.md`. Work only on the current task.
2. **During:** make small changes. One task, one commit.
3. **Finish:** append an entry to `memory.md` (what changed, why, decisions, open issues). Tick the task in `task.md`.
4. Never delete history from `memory.md`. Only append.

## 2. Technology rules

- Current stack: HTML5, CSS3, vanilla JavaScript (ES modules), Three.js (WebGL) with GLSL shaders.
- **Do not add** a framework, bundler, CSS library or npm package without written approval in `memory.md`. Every dependency is attack surface.
- Pin versions. Prefer self-hosted files over CDNs.
- No jQuery, no `eval`, no `new Function`, no `document.write`.
- Keep modules small. One responsibility per file (see `Architecture.md`).
- Follow the tokens in `design.md`. Do not invent new colours, fonts or spacing.

## 3. Do

- Write readable code with short comments explaining *why*.
- Use `textContent` to put any visitor-provided text on the page.
- Validate every input (type, length, format) before use.
- Use `addEventListener`, not inline `onclick` attributes.
- Add `rel="noopener noreferrer"` to every `target="_blank"` link.
- Respect `prefers-reduced-motion` and give WebGL a fallback.
- Keep the site usable by keyboard and screen reader.
- Ask the user when a requirement is unclear or marked **TO CONFIRM**.

## 4. Security rules (non-negotiable)

### Secrets
- Never put API keys, tokens, passwords, private keys or real personal data in code, comments, config files, examples or commit messages.
- Secrets live only in host environment variables or a secret manager. `.env*` files are always in `.gitignore`.
- If a secret is ever committed: treat it as leaked, rotate it immediately, then clean history. Deleting the file is not enough.
- Anything in the browser is public. Do not rely on obscurity.

### Input and output (XSS)
- Never assign untrusted data to `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `srcdoc` or `href`/`src` without validation.
- `innerHTML` is allowed only with hard-coded constants.
- Validate URLs: allow only `https:`, `mailto:` and `tel:` schemes.
- Build `mailto:` links with `encodeURIComponent` on every part, and strip line breaks from subject and body fields to prevent header injection.

### External resources
- Prefer self-hosted scripts, styles and fonts.
- Any remaining third-party `<script>` or `<link rel="stylesheet">` needs `integrity` and `crossorigin="anonymous"`.
- Do not load any new third-party domain without approval.

### Headers and hosting
- Security headers are defined in `Architecture.md` section 5. Do not weaken the CSP (no `unsafe-eval`, avoid `unsafe-inline`).
- Debug code, `console.log` of user data, test pages and source maps must not ship to production.

### Dependencies
- Update on a schedule. Run `npm audit` if a `package.json` exists. Remove anything unused.

### If a backend is ever added (only after approval in `task.md`)
- Hash passwords with Argon2id or bcrypt (cost 12+). Never store or log plain passwords.
- Deny by default. Check authentication and role on the server for every protected route, including admin routes.
- Never write your own auth or crypto. Use a vetted provider or library.
- Use parameterised queries or an ORM only. No string-built SQL.
- Validate with a schema on the server. Do not trust client validation.
- Rate-limit login, signup, forms and any public API. Add bot protection on forms.
- Restrict CORS to the site's own origin.
- Cookies: `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict`. Add CSRF protection for state-changing requests.
- Payments: use the provider's hosted checkout. Card data never touches our code. Verify webhook signatures.
- Database must not be publicly reachable. Use least-privilege roles.

## 5. Error handling

- Never show stack traces, file paths, SQL or library versions to visitors.
- Show short, friendly, generic messages: "Something went wrong. Please try again."
- Log technical detail privately (never in the browser console in production).
- Always handle failure paths: WebGL not supported, clipboard blocked, network failure, form validation errors.
- Fail closed: if a security check cannot run, deny the action.
- Never swallow errors silently with an empty `catch`.

## 6. Do NOT

- Do not commit `.env`, keys, credentials, dumps or `node_modules`.
- Do not disable security features to "make it work".
- Do not copy code from unknown sources without reading it fully.
- Do not claim something is secure or tested unless it was actually run and checked.
- Do not add tracking, analytics or cookies without approval.
- Do not rewrite large parts of the site in one go. Small, reviewable changes only.
- Do not change files outside the scope of the current task.
- Do not invent business facts, legal text, customer names or testimonials.

## 7. Git rules

- Branch per task. Clear commit messages: `type: short summary` (for example `fix: validate intake email`).
- Never force-push to `main`.
- Review the diff for secrets before every commit.

## 8. Pre-merge checklist

- [ ] No secrets or personal data in the diff
- [ ] No new `innerHTML` with dynamic data
- [ ] No new third-party domain or dependency
- [ ] Works with keyboard only and with reduced motion on
- [ ] No console errors, no debug output
- [ ] `memory.md` and `task.md` updated

## 9. Backend and security rules (as built and tested)

These rules describe what the code does today. Do not weaken any of them. Each one names where it is enforced and how it is tested.

**Secrets and configuration**
- Never put a key, password, token or private URL in code, docs, tests or the browser. Real values live in `.env` (gitignored) or the host's environment settings. `.env.example` holds names only. *Enforced: `.gitignore`, `.env` read by `server/index.js`; secrets scan in the audit.*
- The server must refuse dangerous setups at start-up: the data folder inside the published folder throws an error; weak or missing settings log a warning (no email, no staff IP list, non-https webhook or origin). *Tested: "refuses to start when the data folder is inside the published folder".*
- `DEV_SHOW_CODE` and `SMTP_SECURE=0` are test aids and are ignored in production. *Tested: production never reveals a code.*

**Exposed files**
- Only `site/` is ever served. `server/`, `scripts/`, `tests/`, `docs/`, `data/`, dotfiles, `_headers`, and files ending in `.db .db-wal .db-shm .sqlite .env .log .pem .key .bak .sql .map` must return 404. *Tested: "path traversal, dotfiles and config files are not served" and "database and secret file types are never served".*
- Static routes accept GET and HEAD only (others get 405).

**Authentication and access control**
- Deny by default. Every `/api/admin/*` route needs a staff session; every `/api/client/*` route (except sign-in and the quiet session check) needs a client session. *Tested: "admin routes deny by default", "everything under /api/client needs a session".*
- A client may only read or change rows with their own `client_id`; another client's id returns 404. *Tested: "clients cannot see or change each other's quotes".*
- Staff passwords: hashed with scrypt (N=2^16, r=8, p=2), 12+ characters, one generic error for every login failure, constant-ish timing for unknown emails, lockout after 5 failures for 15 minutes, IP rate limit. *Tested: login and lockout tests.*
- Client accounts: email + password. Passwords are hashed with scrypt (same settings as staff), never stored or logged in plain text, 10 to 200 characters, not the email, not a very common password. Login: generic error for every failure, IP rate limit, lockout after 5 wrong passwords for 15 minutes. "Remember me" is a 30-day session. Forgot password: emailed 6-digit code, hashed at rest, 10 minutes, 5 tries, single use, same reply for known and unknown emails, resets sign out every other device. Registering with an email that already exists is refused (no account takeover). Accounts can be deleted by their owner (password required). *Tested: the register / login / reset test group.*
- **Terms must be accepted.** Creating an account requires `acceptTerms === true` (Terms and Conditions + Privacy Policy); nothing is created otherwise. Each account stores the accepted version and time. When `TERMS_VERSION` in `server/legal.js` changes, login and reset are refused (HTTP 409, no session) until the new version is accepted. Bump `TERMS_VERSION` whenever the Terms or Privacy Policy change in a way users must agree to again. *Tested: "if the Terms change, login is blocked".*
- **Two websites.** The public website (`PORT`) serves `site/` and the public/client API. The admin website (`ADMIN_PORT`, bound to `ADMIN_HOST`, default 127.0.0.1) serves `admin-site/` and `/api/admin/*` only. Neither can reach the other's routes (404). The admin site is never framed and never cached. *Tested: "the admin website is separate".*
- **Staff accounts are never written into code, docs, tests or zips.** The first admin is created at start-up from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` (stored as a hash; the line must be deleted afterwards) or with `npm run create-admin`. *Tested: "first admin is created from .env settings".*
- Request approval is a staff-only action on the admin website (CSRF protected). Clients see Pending (red), Accepted (green) or Rejected (red); staff and clients are emailed when something needs their attention.
- Sessions: random 256-bit token (only its SHA-256 is stored), `HttpOnly`, `SameSite=Strict`, `Secure` and `__Host-` prefix in production, absolute and idle expiry, destroyed on logout.
- Every state-changing request needs the CSRF token header and a matching Origin. No CORS headers are sent (same-origin only). *Tested: CSRF tests.*
- `ADMIN_ALLOWED_IPS` (optional) makes the whole admin website look non-existent (404) to other addresses. Set it on the live server. *Tested: "staff website allow-list".*

**Input, output and injection**
- Validate every input on the server (type, length, format, allowed values). Never trust the browser, including prices: prices are computed only in `server/pricing.js`. *Tested: "prices come from the server".*
- Database access uses parameterised queries only. Never build SQL from text. *Tested: SQL injection test.*
- Strip line breaks and control characters from single-line fields and from anything placed in an email header or address. SMTP code rejects any address containing control characters. *Tested: "SMTP: address injection is refused".*
- Write server text into pages with `textContent` only. No `innerHTML` with dynamic data. CSV exports neutralise formula cells. *Tested: XSS-as-text checks in `tests/smoke.py`, CSV test.*
- Honeypot field and rate limits protect every public form.

**Rate limits and abuse**
- Public enquiry: 5 per hour per IP. Sign-in codes: 3 per 10 minutes per email, 10 per hour per IP. Code checks: 20 per 15 minutes per IP. Staff login: 10 per 15 minutes per IP. Quotes: 10 per hour per client. Bodies are capped (2 to 8 KB) and requests time out.
- The limiter is in memory (one server). Use a shared store before running several servers.

**Headers and browser rules**
- CSP: `default-src 'self'; script-src 'self'` (no inline script, no eval); frames only from this site; `frame-ancestors 'self'`; `object-src 'none'`; `base-uri 'none'`. Plus HSTS (production), `nosniff`, referrer policy, permissions policy, COOP. Defined in `site/_headers` and applied by the server to every response. *Tested: header and CSP checks, and every page and demo loads with zero CSP violations.*
- Demos run in a sandboxed iframe (`allow-scripts allow-forms`, never `allow-same-origin`).
- API responses are `Cache-Control: no-store`.

**Errors, logging and debug**
- No stack traces, file paths or SQL in responses. Unexpected errors return a generic message; details go to the private log.
- Logs never contain request bodies, emails, codes or passwords. IPs are logged only as a salted hash.
- No debug mode or debug endpoints. `/healthz` returns `{ok:true}` only.

**Data protection**
- The database folder is created owner-only. Old enquiries, quotes and sessions are purged after `RETENTION_DAYS` (default 365). `npm run erase -- email` removes everything for one person. Staff actions are written to `audit_log`.
- `npm run backup` takes a consistent copy (owner-only, newest 14 kept). Backups must be stored encrypted and off the server.

**Dependencies**
- The server has zero npm dependencies. The only third-party code is `site/vendor/three.min.js` (r128, 2021, outdated: see `docs/DEPENDENCIES.md`). Never add a package or a third-party domain without written approval in `memory.md`.
- Before every deploy run `npm test` and `python tests/smoke.py`. Both must pass.

## 10. Approved exceptions (recorded 2026-10-11)

- **Backend added** on the owner's explicit request. Zero npm dependencies on purpose: the server uses only Node 22 built-ins (`http`, `crypto`, `node:sqlite`).
- **Password hashing:** scrypt (N=2^16, r=8, p=2) instead of Argon2id/bcrypt, because Node 22 has no built-in Argon2 and no package may be added. If a vetted library is approved later, move to Argon2id and rehash at next login.
- **"Never write your own auth":** this applies to public user accounts, password reset, email verification and payments. Use a managed provider or vetted library for those. The custom code is limited to one staff-only inbox with no sign-up.
- **Client accounts with passwords (owner request 2026-10-13).** Passwordless codes were replaced by email + password (hashed), a 30-day remembered login and mandatory acceptance of the Terms and Privacy Policy. This is custom public-facing auth: before taking payments or sensitive data, move to a managed identity provider (or add email verification and a second factor).
- **Prices are decided only on the server** (`server/pricing.js`). The browser can never set a price.

