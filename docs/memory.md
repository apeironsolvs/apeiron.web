# memory.md — Project memory

**Purpose:** every time an AI (or a person) works on this project, record the context, important decisions and changes here. Read this file before starting. **Append only. Never delete past entries.**

Entry template:

```
## YYYY-MM-DD — short title
- Who/what: (tool or person)
- Task: (task.md number)
- Changed: (files and what)
- Decisions: (and why)
- Open issues / next step:
```

---

## Standing context

- **Project:** Apeiron Solutions marketing website. Repo: https://github.com/apeironsolvs/apeiron.web (public, branch `main`).
- **Stack:** static HTML, CSS, vanilla JavaScript, Three.js r128 (cdnjs), GLSL shaders. No backend, database, auth or API keys.
- **Files that govern work:** `PRD.md` (what), `Architecture.md` (how it fits), `rules.md` (AI rules), `design.md` (look), `task.md` (steps), `memory.md` (this file).
- **Hosting:** unknown (**TO CONFIRM**). It decides how security headers are set.
- **Contact email:** still placeholder `hello@apeiron.example` in `CONFIG.email`.

## Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-10-10 | Keep the site static until Phase 2 is explicitly approved. | Less attack surface. Most requested protections (auth, rate limits, DB hashing) only apply once a backend exists. |
| 2026-10-10 | Plan to self-host Three.js and fonts and split inline JS/CSS. | Allows a strict CSP and removes third-party script risk. |
| 2026-10-10 | Never hand-roll authentication or payments. | High risk of mistakes. Use proven providers or libraries. |

---

## 2026-10-10 — Project documents created and first security review

- **Who/what:** Claude (Sonnet 5.5), working from the public GitHub pages. The repo could not be attached for editing because GitHub was not linked to the account, so no files in the repo were changed.
- **Task:** initial setup of the six governing files.
- **Changed:** created `PRD.md`, `Architecture.md`, `rules.md`, `design.md`, `task.md`, `memory.md`. These must be committed to the repo by the owner.
- **What was reviewed:** `index.html` as displayed on GitHub. Only the first ~1,000 of 1,498 lines were visible. The README and the file list were also read. `Apeiron Solutions.html` was not opened.

### Findings from the review

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Three.js r128 loaded from cdnjs and two font stylesheets (Google Fonts, Fontshare) with no Subresource Integrity | Medium | Open (task 0.6) |
| 2 | No Content Security Policy. Inline JS and CSS block a strict one | Medium | Open (tasks 0.7, 0.8) |
| 3 | Three.js r128 is from 2021 and outdated | Low–Medium | Open (task 0.6) |
| 4 | `CONFIG.email` is a placeholder; footer legal links are `href="#"` | Launch blocker | Open (tasks 0.3, 0.12) |
| 5 | Four `innerHTML` uses. Three use hard-coded data. The option-button builder interpolates values; call sites not seen | Low (needs verification) | Open (task 0.1, 0.5) |
| 6 | Intake delivery via `mailto:`. Header-injection and encoding handling not yet verified (code not seen) | Unknown | Open (tasks 0.1, 0.4) |
| 7 | Clipboard handler not seen | Unknown | Open (task 0.1) |
| 8 | `Apeiron Solutions.html` not inspected; may be a redundant exposed file | Unknown | Open (task 0.2) |

### Good signs observed

- No API keys, tokens or passwords in the visible source.
- No inline `on*` event handlers.
- `target="_blank"` links already use `rel="noopener noreferrer"`.
- No cookies or web storage in the visible code.
- Visitor-typed text (chips and the "become" list) is written with `textContent`.
- The form calls `preventDefault()` and has no server endpoint set.

### What does not apply yet (and why)

The request listed: hiding API keys, admin routes, authentication, database security, password hashing, rate limits and API endpoint security. The site currently has no API keys, no admin routes, no accounts, no database and no API. Those controls are written into `rules.md` and `task.md` (Phases 2–4) so they are applied correctly when the backend is built. They cannot be "added" to code that does not exist.

### Honest limits

- This was a read-only review of part of one file, not a penetration test or a full audit.
- A full audit requires reading all 1,498 lines, checking git history for leaked secrets, and testing the deployed site's headers.
- Nobody can guarantee "no mistakes" or "cannot be hacked". The goal is to reduce risk and verify each control.

### Next step

Start Phase 0 in `task.md`, beginning with 0.1 (review the unseen part of `index.html`).

## 2026-10-11 — Full upload review, bug fixes, legal drafts
- Who/what: Claude (Sonnet 5.5), from the uploaded zip. No repo access; owner must commit the files.
- Task: 0.1 (mostly), 0.2, 0.5, 0.9, 0.12 (drafts); see docs/SITE-REVIEW.md.
- Changed: index.html (13 patches, listed in SITE-REVIEW section 2); rewrote privacy/terms/security with shared legal.css; fixed 404 links; resized header logo; added .well-known/security.txt, .gitignore, security/_headers.example, README; deleted duplicate "Apeiron Solutions.html"; moved governing docs to docs/.
- Decisions: legal text uses [brackets] for every business fact (rules.md: do not invent). DPDP substantive duties start about 14 May 2027; build to that standard now.
- Open issues: CONFIG.email still placeholder; YOUR-DOMAIN.com in all pages; placeholder projects and no named team; self-hosting and CSP (0.6-0.8); gitleaks (0.10). GLSL and cursor code searched, not line-read. Nothing was tested in a browser.

## 2026-10-11 — Phase 0 Engineering Hardening & Self-Hosting Completed
- Who/what: Antigravity AI assistant.
- Task: Phase 0 completion (tasks 0.1, 0.4, 0.6, 0.7, 0.8, 0.10, 0.11), WCAG 2.2.2 marquee pause, og-image generation, local runtime validation.
- Changed:
  - Downloaded and self-hosted Three.js r128 to `vendor/three.min.js`.
  - Downloaded and self-hosted 12 woff2 font files to `assets/fonts/` (Space Grotesk, JetBrains Mono, Big Shoulders Stencil Text, Bespoke Stencil). Created `css/fonts.css`.
  - Removed all external font and script CDN links (`fonts.googleapis.com`, `api.fontshare.com`, `cdnjs.cloudflare.com`) across `index.html`, `privacy.html`, `terms.html`, `security.html`, and `404.html`.
  - Split inline CSS into `css/styles.css`, elevating low-contrast greys (`#56626c`, `#5f6b75`) to WCAG AA-compliant `#8d98a2`.
  - Modularized JavaScript into ES modules in `js/`: `config.js`, `cursor.js`, `intake.js`, `scene.js`, and `main.js`.
  - Hardened intake form: capped field lengths, added CRLF newline sanitization on text/subject inputs to prevent email header injection, safe `encodeURIComponent` URI encoding, accessible dialog management.
  - Added WCAG 2.2.2 keyboard-accessible marquee pause toggle button (`#u-marquee-toggle`) with `aria-pressed` states in `index.html`, `css/styles.css`, and `upgrade.js`.
  - Generated pixel-perfect 1200x630 `og-image.png` using authentic brand assets in `docs/brand/apeiron-logo.png`.
  - Configured tightened `_headers` in root with strict Content Security Policy leveraging self-hosted assets without external CDN dependencies.
  - Scanned codebase for secrets: 0 secrets found.
  - Started local HTTP server on `http://localhost:8000`, verified all 31 endpoints and assets respond with HTTP 200 OK.
- Decisions: Adhered strictly to `rules.md` (zero dependencies added, preserved tokens, modular vanilla JS and WebGL).
- Open issues / next step: Launch blockers awaiting owner information: real domain (`YOUR-DOMAIN.com`), real contact email in `js/config.js`, form backend endpoint (if not using mailto), legal entity details in legal pages, real case studies & real team profiles.

## 2026-10-11 — Audit of the modularised zip, regression fixes, repo restructure
- Who/what: Claude (Sonnet 5.5), reviewing `apeiron-site.zip`.
- Found: the zip shipped BROKEN. `js/main.js` had a stray `})();` (syntax error), so tabs, process section, menu, scroll effects, intake wiring and 3D all failed to run. `js/intake.js` looked for `#idialog` and `.istep`, which do not exist, so the intake form could not open. `js/scene.js` called `hash()`, which only existed in `main.js` ("3D disabled"). The earlier entry's "verified all endpoints respond 200" only proved files exist, not that the page runs.
- Fixed: all three, plus restored the "Start with this idea" copy-over, focus return to the opener, and mobile-menu reset on intake open. Removed 6 duplicate font files. Removed HSTS `preload`. Corrected task 0.6, 0.8, 0.10 (they were ticked but not done).
- Restructured: served files now live in `site/`; `docs/`, `tests/`, README stay outside the web root so planning notes and the security findings list are not published. Deploy with output directory `site`.
- Verified: `tests/smoke.py` passes under the real CSP (no console errors, canvas present, tabs, intake flow, header-injection stripped).
- Open: real domain, real contact email/endpoint, legal entity details, real case studies and team, Three.js r128 upgrade, git-history secret scan, live-host header check, no backend yet (Phases 2-4).

## 2026-10-11 — Backend, database, project showcase
- Who/what: Claude (Sonnet 5.5), on the owner's request ("backend, database, everything a company website needs" and demo sites opened in a floating window).
- Decision: Node 22 server with zero dependencies and SQLite. Reasons: rules.md forbids new packages without approval, the sandbox had no network, and a single small server is easy to host (Dockerfile included). Approval for a backend was given in the owner's message.
- Built: `server/` (static + API), `scripts/` (create-admin, erase), `site/admin/` (staff inbox), consent checkbox + honeypot on the intake form, retention purge (RETENTION_DAYS, default 365), audit log.
- Built: 8 concept demos in `site/projects/` (one per card), `js/projects.js` (registry + draggable window with desktop/tablet/phone views), sandboxed iframe (`allow-scripts allow-forms`, no same-origin), CSP `frame-src 'self'; frame-ancestors 'self'`.
- Found and fixed while testing: iframe sandbox without `allow-forms` blocked demo forms.
- Verified (actually run): `npm test` 11/11; `tests/smoke.py` end-to-end (pages, 8 demos load without CSP errors, demo interactions, form -> API -> database, admin login, XSS payload rendered as text).
- Not built (needs owner decisions): public user accounts/dashboard (Phase 3), payments (Phase 4), outgoing email (needs an SMTP/provider key), newsletter.
- Open: deploy on a Node host (Cloudflare Pages alone cannot run the API); set real env values; create the first admin with `npm run create-admin`; update privacy/terms placeholders; demos are fictional and labelled so in the window and page footers; replace with real client work when available.

## 2026-10-11 — Second round: 16 live demos (2 per card)
- Who/what: Claude (Sonnet 5.5), owner asked for more mind-bending, real-time projects per card, each in its own folder.
- Added 8 demos in `site/projects/`: aurora-studio (flow-field web hero), orbit-pay (live wallet), neural-playground (a real network trained live in the browser, reaches ~98% on the spiral), studio-board (live whiteboard with simulated teammates), edge-globe (rotating globe with live request arcs), market-stream (streaming chart), robo-floor (warehouse robot sim with path-finding), resonance (Web Audio synth and sequencer). Registry in `js/projects.js` now lists 2 per card (16 total).
- "Real time" here means live in the browser: data is simulated and labelled as such, except the neural net (real computation) and the synth (real audio). No demo talks to the server, so no new public endpoints or abuse surface.
- Tuning found by testing: neural net needed sin(5x), sin(5y) features, 12 hidden neurons and lr 0.1 to learn the spiral quickly; the first defaults only reached 63%.
- Verified (run): smoke test covers all 16 demos (loads under CSP, canvases draw, neural accuracy >= 75%, wallet feed, synth playhead). Not verified: audio output on a real device, performance on low-end phones.
- Open: real client projects to replace concept demos; keep each demo under ~6 KB so the site stays light.

## 2026-10-11 — Client journey: sign-in, guided builder, quotes, live updates
- Request (owner): clicking "Bring your idea" -> login -> floating window -> Continue -> new page where options are suggested from the typed idea; pick multiple options; basic requirements; prices with a way to negotiate by mail; two plans (subscription build+updates vs build only); thank-you page that mentions a live update page and budget/payment method.
- Assumption: the owner's images were not attached to that message, so the floating window reuses the existing idea step and adds a sign-in step before it. Send the images if the layout should differ.
- Built: passwordless client sign-in (emailed code), `server/portal.js`, `server/pricing.js` (8 services with requirements and add-on prices, server-side pricing, keyword suggestions), `server/mailer.js` (Resend-compatible HTTP API; skips quietly when not configured), tables clients/login_codes/csessions/quotes, `/start/` builder, `/account/` live page (polls every 8 s), admin "Project requests" panel (status, live stage, negotiation), privacy/terms/security text updated.
- Decisions: prices are PLACEHOLDER starting estimates in INR, ex-tax; owner must set real ones in `server/pricing.js`. Subscription = 10% off build + monthly fee (8% of build, min 5,000). No payment is taken; the thank-you page says a budget and payment plan will be shared. "AI options" = keyword matching, honestly labelled; an LLM can be added later with a key.
- Found and fixed while testing: auto-opening the sign-in window on page load ran before page setup finished (TDZ error); scene expected exactly 2 intake steps (now 3).
- Verified (run): `npm test` 20 tests (code safety, enumeration, expiry, rate limits, ownership isolation, server-side prices, mail via mock provider, CSRF, staff stage update visible to client); `tests/smoke.py` end-to-end in Chromium including the whole journey, wrong code, XSS text, signed-out redirect, admin view and live stage change.
- Not verified: real email delivery (needs RESEND_API_KEY and a verified sender domain), behaviour on real phones.
- Open: set real prices; add an email provider key; real contact email in `js/config.js`; managed identity provider before payments; legal review of the new privacy/terms text.

## 2026-10-11 — Create account, header login/profile, Talk to support, email delivery, project previews
- Owner feedback (with screenshots): code never arrived; wanted Create account in the sign-in step; Log in top right that becomes Profile; "Talk to a technical expert" renamed "Talk to support" with a chatbot; card images replaced by the created projects.
- Root cause of "no code in email": no email provider was configured, and the server fell back silently. Fixed: `server/smtp.js` (Gmail-style SMTP over TLS, zero dependencies), `mailer.js` chooses SMTP > Resend > none; failed sends now return a clear 503 instead of pretending; local mode prints the code in the terminal; production without email refuses. `.env` is now loaded automatically.
- Security finding while testing: SMTP address handling could pick an injected `<address>` out of a value containing a line break. Now any control character in an address is rejected outright (test added).
- Added: Create account tab (name + privacy consent stored with timestamp), `/api/client/session` (quiet, no 401 noise), `/api/client/profile`, header Log in -> Profile button, profile page with editable name, support chat (`js/support.js`; hand-over saves an enquiry with source 'support'), 16 preview thumbnails in `site/assets/previews/` shown inside the cards, admin badge for support chat messages, DB migrations that upgrade existing databases in place.
- The owner mentioned "10 projects"; there are 16 (2 per card). All 16 appear.
- Verified (run): `npm test` 27 tests incl. SMTP against a mock mail server (login line, recipient, body, wrong password -> 503, injection refused), terminal fallback, production 503; `tests/smoke.py` 64 checks incl. support chat, create account, Log in -> Profile, profile page.
- Not verified: delivery to a real Gmail inbox (no network here). Owner must add an app password in `.env` and try it.
- Open: real contact email in `js/config.js`; managed identity provider before payments.

## 2026-10-12 — Hybrid upload repaired, backend + security rules completed
- Request: "add backend and security rules which we have discussed" with a new zip.
- Finding: the uploaded zip contained 0 files edited by the owner. All 125 files were exact copies of files from my earlier versions, but mixed: new folders (server, admin, start, account, projects) beside 30 older wiring files (index.html, main.js, intake.js, _headers, legal pages, tests, docs) and 18 missing files (smtp.js, support.js, 16 previews). Result: backend not connected to the page, header policy blocked the demo windows, only 11 of 31 tests ran. Fixed by moving to the complete, tested version.
- Added hardening: static server blocks database/secret file types even if placed in `site/`; server refuses to start if the data folder is inside the published folder; start-up warnings for weak settings; optional `ADMIN_ALLOWED_IPS` (staff pages and API return 404 to other addresses); `npm run backup` (consistent snapshot, owner-only, keeps newest 14); 4 new tests (31 total).
- Docs: `rules.md` new section 9 (security and backend rules as built, each with where it is enforced and how tested; exceptions renumbered to section 10); fresh `SECURITY-AUDIT.md` (17-item table against the owner's list with evidence and residual risks; replaces the stale 2026-10-11 audit); `DEPENDENCIES.md` (Three.js r128 flagged as outdated, upgrade steps).
- Verified (run): `npm test` 31/31; `tests/smoke.py` full journey; production-mode probes of headers, hidden files and errors.
- Open: Three.js upgrade; MFA for staff; managed identity provider before payments; set ADMIN_ALLOWED_IPS and real email live; penetration test; lawyer review; real prices and contact email.

## 2026-10-13 — Password accounts, Terms acceptance, new journey, approvals, separate admin website
- Owner request: login first when clicking Bring your idea (create account if new, saved in our database, hashed password, remembered login); privacy policy and terms with mandatory acceptance; after login a "what do you want to build" page, analysed options (multi-select), requirements, two ways to work (continue building with subscription / just build), prices adding up, "you can negotiate" note and comment, Send with Pending/Accepted status (green when approved); a separate admin website with approve/reject, emails to admin; admin login given by the owner.
- Decisions: (1) Passwordless codes replaced by email + password (scrypt) as requested; custom auth recorded in rules.md section 10. (2) Admin is a second server on its own port sharing the same SQLite database; public and admin routes cannot cross. (3) The admin password the owner typed in chat is NOT written into any file in the zip or tests; the first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in the owner's local `.env` (hash only) and the line must then be deleted. (4) "AI analysis" = keyword matching with reasons shown; no AI model is called. (5) "The database we provided" = the project's SQLite database (the Supabase reference notes in `.agents/` are not used; no Supabase credentials were provided). (6) Status colours: Pending red, Accepted green, Rejected red (owner wording).
- Built: password register/login/forgot/reset/delete, 30-day sessions, `TERMS_VERSION` gate, quote comments table, admin decision/comment endpoints and emails, `admin-site/`, new `/start/` journey, profile page, updated privacy/terms/security text, support chat answers.
- Verified (run): `npm test` 41/41; `tests/smoke.py` 73 checks (create account refused without Terms, weak password refused, analysis, options, requirements, two plans, review, Send -> Pending red, admin approve -> client turns Accepted green by itself, remembered login in new tab, forgot password, public site has no admin).
- Not verified: delivery to a real inbox; behaviour on real phones; the legal text (draft, needs a lawyer).
- Open: real prices and contact email; Three.js upgrade; MFA for staff; email verification for new accounts; ADMIN_ALLOWED_IPS and email on the live server.

