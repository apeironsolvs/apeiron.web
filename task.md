# task.md — Project breakdown

Version 0.1 · 2026-10-10

Work top to bottom. Tick `[x]` when done and log it in `memory.md`. A phase's **security gate** must pass before the next phase starts.

---

## Phase 0 — Harden the current static site (do first)

Why first: the site is live-able today and has real, fixable issues.

- [ ] **0.1** Review the rest of `index.html` (an audit only covered the first ~1,000 of 1,498 lines). Check the intake submit logic, `mailto:` builder, clipboard handler and every `buildOpts` call site.
- [ ] **0.2** Decide what `Apeiron Solutions.html` is. Delete it if it is a duplicate.
- [ ] **0.3** Replace `hello@apeiron.example` in `CONFIG.email` with the real address.
- [ ] **0.4** Make the `mailto:` builder safe: `encodeURIComponent` on all parts, strip line breaks, cap field lengths.
- [ ] **0.5** Confirm `innerHTML` is only ever fed hard-coded data. Convert to DOM methods where practical.
- [ ] **0.6** Self-host Three.js (upgrade from r128, pin the version) and the four fonts as woff2. Remove all third-party script and style domains.
- [ ] **0.7** Split inline CSS and JS into `css/` and `js/` (see `Architecture.md`).
- [ ] **0.8** Add security headers at the host (decide host first). Test with securityheaders.com.
- [ ] **0.9** Add `.gitignore`, `.well-known/security.txt`, `robots.txt`, `sitemap.xml`.
- [ ] **0.10** Scan git history for secrets (for example with gitleaks). Rotate anything found.
- [ ] **0.11** Add `prefers-reduced-motion` and no-WebGL fallbacks.
- [ ] **0.12** Create real Privacy, Terms and Security pages and link them.

**Security gate 0:** no secrets in history, no third-party script domains, CSP active without `unsafe-eval`, all headers present, intake form cannot inject into email headers.

## Phase 1 — Launch readiness

- [ ] **1.1** Decide hosting and domain. Enable HTTPS and HSTS.
- [ ] **1.2** Decide intake delivery: keep `mailto:` or move to a form service or backend.
- [ ] **1.3** Content review: remove any unverified claims, finalise copy.
- [ ] **1.4** Accessibility pass (keyboard, contrast, screen reader).
- [ ] **1.5** Performance pass (Lighthouse 90+, mobile frame rate for WebGL).
- [ ] **1.6** SEO basics: titles, descriptions, Open Graph, favicon.
- [ ] **1.7** Cross-browser test.

**Gate 1:** Lighthouse 90+ across the board, manual test checklist passed.

## Phase 2 — Login (needs approval; introduces a backend)

Before starting: write the decision in `memory.md` (provider vs. custom, hosting, database).

- [ ] **2.1** Choose an auth approach. Prefer a managed provider or a well-maintained library over custom code.
- [ ] **2.2** Sign-up, login, logout, password reset by email, email verification.
- [ ] **2.3** Passwords hashed with Argon2id or bcrypt (cost 12+).
- [ ] **2.4** Secure sessions: `HttpOnly`, `Secure`, `SameSite` cookies, expiry, rotation on login.
- [ ] **2.5** Rate limiting and lockout on login and reset.
- [ ] **2.6** Roles: `user` and `admin`. Server-side checks on every protected route (deny by default).
- [ ] **2.7** Server-side input validation with a schema. Generic error messages.
- [ ] **2.8** CSRF protection and CORS limited to the site origin.
- [ ] **2.9** Secrets in host environment variables. Separate dev and prod values.
- [ ] **2.10** Tests: wrong password, locked account, expired session, accessing another user's data, accessing admin as a normal user.

**Gate 2:** all tests in 2.10 pass, dependency audit clean, no secrets in repo.

## Phase 3 — Dashboard

- [ ] **3.1** Define what a user sees (**TO CONFIRM**).
- [ ] **3.2** Protected routes that require login.
- [ ] **3.3** Every data query is scoped to the logged-in user (prevent access to other users' records).
- [ ] **3.4** Admin area on a separate path, admin role required, MFA recommended.
- [ ] **3.5** Database with least-privilege role, not publicly reachable, encrypted backups.
- [ ] **3.6** Audit log for sensitive actions.
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
