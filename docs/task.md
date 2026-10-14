# task.md — Project breakdown

Version 0.1 · 2026-10-10

Work top to bottom. Tick `[x]` when done and log it in `memory.md`. A phase's **security gate** must pass before the next phase starts.

---

## Phase 0 — Harden the current static site (do first)

Why first: the site is live-able today and has real, fixable issues.

- [x] **0.1** Review the rest of `index.html` (an audit only covered the first ~1,000 of 1,498 lines). Check the intake submit logic, `mailto:` builder, clipboard handler and every `buildOpts` call site.
- [x] **0.2** Decide what `Apeiron Solutions.html` is. Delete it if it is a duplicate.
- [ ] **0.3** Replace `hello@apeiron.example` in `CONFIG.email` with the real address (launch blocker: owner supply).
- [x] **0.4** Make the `mailto:` builder safe: `encodeURIComponent` on all parts, strip line breaks, cap field lengths.
- [x] **0.5** Confirm `innerHTML` is only ever fed hard-coded data. Convert to DOM methods where practical.
- [~] **0.6** Self-host Three.js and fonts. DONE: fonts self-hosted (6 unique woff2), no third-party domains. OPEN: Three.js is still r128 (2021); upgrading needs visual regression testing of `js/scene.js`.
- [x] **0.7** Split inline CSS and JS into `css/` and `js/` (see `Architecture.md`).
- [~] **0.8** Security headers: `site/_headers` written and verified with `tests/smoke.py` (no CSP violations). OPEN: confirm on the live host with securityheaders.com.
- [x] **0.9** Add `.gitignore`, `.well-known/security.txt`, `robots.txt`, `sitemap.xml`.
- [ ] **0.10** Scan git history for secrets. Working tree scanned clean on 2026-10-11, but history has not been scanned (no `.git` in the zip). Run `gitleaks detect` in the real repo.
- [x] **0.11** Add `prefers-reduced-motion` and no-WebGL fallbacks.
- [x] **0.12** Create real Privacy, Terms and Security pages and link them.

**Security gate 0:** no secrets in history, no third-party script domains, CSP active without `unsafe-eval`, all headers present, intake form cannot inject into email headers.

## Phase 1 — Launch readiness

- [x] **0.19** Password accounts + mandatory Terms, new build journey, approve/reject workflow with Pending/Accepted/Rejected, separate admin website, admin emails.
- [ ] **0.20** Verify new accounts' email addresses; add a second factor for staff.
- [x] **0.16** Hybrid upload repaired; start-up config guard, hidden database file types, staff IP allow-list, backup script, SECURITY-AUDIT.md, DEPENDENCIES.md, rules.md section 9.
- [ ] **0.17** Upgrade Three.js from r128 and re-test the 3D scene (see docs/DEPENDENCIES.md).
- [ ] **0.18** Add a second factor (MFA) for staff login.
- [x] **0.15** Client journey (sign-in, builder, quotes, live update page, admin requests panel). Prices are placeholders.
- [x] **0.14** Backend (enquiries API + staff inbox + SQLite), project showcase (8 demos + floating window), consent checkbox and honeypot on the form.
- [x] **0.13** Fix regressions from the JS split: stray `})();` in `main.js`, intake module bound to missing `#idialog`, missing `hash()` in `scene.js`. Added `tests/smoke.py`.

- [ ] **1.1** Decide hosting and domain. Enable HTTPS and HSTS.
- [ ] **1.2** Decide intake delivery: keep `mailto:` or move to a form service or backend.
- [ ] **1.3** Content review: remove any unverified claims, finalise copy.
- [ ] **1.4** Accessibility pass (keyboard, contrast, screen reader).
- [ ] **1.5** Performance pass (Lighthouse 90+, mobile frame rate for WebGL).
- [ ] **1.6** SEO basics: titles, descriptions, Open Graph, favicon.
- [ ] **1.7** Cross-browser test.

**Gate 1:** Lighthouse 90+ across the board, manual test checklist passed.

## Phase 2 — Login (backend approved 2026-10-11 by the owner; staff-only part DONE, public accounts still open)

Before starting: write the decision in `memory.md` (provider vs. custom, hosting, database).

- [x] **2.1** Auth approach: custom, minimal, staff-only (admin inbox), built only from Node built-ins (`crypto.scrypt`, random session tokens). Public user accounts should use a managed provider (see memory.md 2026-10-11).
- [ ] **2.2** Sign-up, login, logout, password reset by email, email verification.
- [x] **2.3** Passwords hashed with scrypt N=2^16, r=8, p=2 (OWASP-listed; Argon2id is not in Node 22 built-ins).
- [x] **2.4** Sessions: HttpOnly, SameSite=Strict, Secure in production, random 256-bit token (only its hash stored), 8 h absolute and 2 h idle expiry, rotation on login.
- [x] **2.5** Rate limit per IP on login (10 per 15 min); account lockout after 5 failures for 15 min.
- [ ] **2.6** Roles: `user` and `admin`. Server-side checks on every protected route (deny by default).
- [x] **2.7** Server-side validation on every endpoint; one generic error for all login failures.
- [x] **2.8** CSRF token on every state-changing admin call; Origin check; no CORS headers (same-origin only).
- [~] **2.9** Secrets only via environment variables (`.env.example`). OPEN: set real values on the host.
- [~] **2.10** `tests/api.test.mjs` (11 tests): wrong password, lockout, no session, no CSRF, logout kills session, traversal, injection, rate limits. OPEN: expired-session test; tests for public user accounts.

**Gate 2:** all tests in 2.10 pass, dependency audit clean, no secrets in repo.

## Phase 3 — Dashboard

- [ ] **3.1** Define what a user sees (**TO CONFIRM**).
- [ ] **3.2** Protected routes that require login.
- [ ] **3.3** Every data query is scoped to the logged-in user (prevent access to other users' records).
- [ ] **3.4** Admin area on a separate path, admin role required, MFA recommended.
- [~] **3.5** Database: SQLite file in `data/`, not served (tested), `secure_delete` on. OPEN: encrypted backups on the host.
- [x] **3.6** Audit log table records login, lockout, update, delete, export, erase.
- [ ] **3.7** Dashboard UI built to `design.md`.

**Gate 3:** access-control tests pass (user cannot see another user's data or admin pages).

## Phase 4 — Payments

- [ ] **4.1** Choose a payment provider and pricing model (**TO CONFIRM**).
- [ ] **4.2** Use the provider's hosted checkout. No card data on our servers.
- [ ] **4.3** Webhook endpoint with signature verification and idempotency.
- [ ] **4.4** Store only provider customer and payment IDs.
- [ ] **4.5** Receipts, failed-payment handling, refunds process.
- [ ] **4.6** Test mode end to end before any live key is used. Live keys only in production environment variables.
- [ ] **4.7** Review tax and legal requirements (**TO CONFIRM**).

**Gate 4:** test-mode purchases, failures and refunds work. Webhook rejects unsigned requests.

## Phase 5 — Ongoing

- [ ] Monthly dependency updates and audit.
- [ ] Quarterly security review and header re-test.
- [ ] Backup restore test.
- [ ] Update `memory.md` after every session.
