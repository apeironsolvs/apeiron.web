# Architecture — Apeiron Solutions Website

Version 0.1 · 2026-10-10

This file explains how the project is organised, how the parts connect, and where the security boundaries are. Read it with `PRD.md` and `rules.md`.

---

## 1. Current state (what exists in the repo today)

```
apeiron.web/
├── index.html                 # The whole site: HTML + inline CSS + inline JS (about 1,500 lines)
├── Apeiron Solutions.html     # Not inspected. Probably a duplicate or variant. See "Cleanup" below.
└── README.md                  # Project description and local run instructions
```

- **Stack:** HTML5, CSS3, vanilla JavaScript (ES6+), Three.js r128 from cdnjs, custom GLSL shaders.
- **Fonts:** Space Grotesk, JetBrains Mono (Google Fonts); Big Shoulders Stencil Text and Bespoke Stencil (Google Fonts and Fontshare).
- **Backend:** none. **Database:** none. **Auth:** none. **API keys:** none found.
- **Run locally:** `python -m http.server 8000`, then open `http://localhost:8000`.

### Runtime data flow (today)

```
Visitor's browser
  └─ loads index.html
       ├─ cdnjs.cloudflare.com  → three.min.js (r128)
       ├─ fonts.googleapis.com / fonts.gstatic.com → fonts
       └─ api.fontshare.com → fonts

Intake form (#iform)
  user input → client-side validation → preventDefault()
            → build summary text
            → open mailto: link to CONFIG.email   (CONFIG.endpoint is empty)
            → optional "Copy summary" to clipboard
```

No visitor data is stored by the site. Everything leaves the browser through the visitor's own email client.

## 2. Target structure (recommended)

Split the single file so a strict Content Security Policy becomes possible (inline scripts and styles force `unsafe-inline`).

```
apeiron.web/
├── index.html                 # Markup only, links to css/ and js/
├── css/
│   └── styles.css             # Design tokens (see design.md) and all styles
├── js/
│   ├── main.js                # Boot, scroll reveal, accordion, process rail
│   ├── scene.js               # Three.js particle constellation and morphing
│   ├── cursor.js              # WebGL cursor trail
│   ├── intake.js              # Wizard, validation, summary, clipboard, delivery
│   └── config.js              # PUBLIC settings only (contact email, endpoint URL). Never secrets.
├── vendor/
│   └── three.min.js           # Self-hosted, version pinned
├── assets/
│   ├── fonts/                 # Self-hosted woff2 files
│   └── img/
├── .well-known/
│   └── security.txt           # Where to report vulnerabilities
├── robots.txt
├── sitemap.xml
├── _headers  (or vercel.json) # Security headers. Format depends on host (see section 5)
├── .gitignore                 # Must list .env*, node_modules, OS junk
├── PRD.md  Architecture.md  rules.md  design.md  task.md  memory.md
└── README.md
```

### How the files connect

- `index.html` loads `css/styles.css`, then `vendor/three.min.js`, then `js/*.js` as ES modules with `defer`.
- `main.js` imports `scene.js`, `cursor.js` and `intake.js` and starts them. Each module exports one `init()` function.
- `intake.js` reads settings from `config.js` and is the only module that handles visitor-entered personal data.
- `config.js` is public. Anything placed in it is visible to every visitor.

### Cleanup before launch

- Diff `Apeiron Solutions.html` against `index.html`. If it is redundant, delete it. Extra copies of pages are extra attack and confusion surface.
- Replace the placeholder email `hello@apeiron.example`.
- Replace the three `href="#"` footer links with real pages.

## 3. Security boundaries

| Boundary | Rule |
|---|---|
| Browser code is public | Never put secrets, tokens or private keys in HTML, CSS, JS or git. |
| Third-party scripts | Self-host Three.js and fonts. If a CDN is kept, use `integrity` and `crossorigin` (Subresource Integrity). |
| User input | Treated as untrusted. Written to the page with `textContent`, never `innerHTML`. |
| `innerHTML` | Allowed only with hard-coded data. Four spots exist today (capabilities, projects, process stages, option buttons). The option-button builder interpolates values and must never receive visitor input. |
| Delivery of intake data | `mailto:` today. If a server endpoint is added, see section 4. |

## 4. When a backend is added (Phase 2+)

Do not build this until `task.md` Phase 2 is approved. Recommended shape:

```
Browser ── HTTPS ──> Edge/CDN (headers, WAF, rate limit)
                        └──> API (server-side only)
                               ├── Auth (managed provider or proven library, never hand-rolled)
                               ├── Database (parameterised queries / ORM, least-privilege role)
                               └── Payments (hosted checkout from the provider; webhooks verified by signature)
```

Required controls:

- **Secrets:** environment variables on the host, never in the repo. Separate values per environment. Rotate on any suspected leak.
- **Auth:** passwords hashed with Argon2id (or bcrypt cost 12+), sessions in `HttpOnly; Secure; SameSite` cookies, MFA for admins, lockout and rate limit on login.
- **Access control:** deny by default. Every route checks the session and the role on the server. Hiding a link in the UI is not protection. Admin routes live under a separate path and require an admin role.
- **Forms and API:** validate every field on the server with a schema, set body size limits, return generic error messages, add rate limiting and bot protection (honeypot plus a CAPTCHA such as Cloudflare Turnstile).
- **CORS:** allow only the site's own origin.
- **Database:** not reachable from the public internet, row-level access rules, encrypted backups, no shared admin credentials.
- **Payments:** card data never touches our servers. Use the provider's hosted fields or checkout. Verify webhook signatures. Store only the provider's customer and payment IDs.
- **Logging:** log security events (logins, failures, permission denials). Never log passwords, tokens or card data.

## 5. Security headers (set at the host)

Headers cannot be set from HTML alone. A `<meta>` CSP is a partial fallback and cannot do `frame-ancestors`. How to set them depends on hosting (**TO CONFIRM**):

- Netlify or Cloudflare Pages: `_headers` file.
- Vercel: `vercel.json`.
- GitHub Pages: custom headers are not supported. Put Cloudflare in front, or move host.

Target headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

This policy only works after inline JS and CSS are moved into separate files and fonts and Three.js are self-hosted. If a WebGL shader is built from inline strings it is fine, but any `eval` or `new Function` is not allowed.

## 6. Dependencies

Currently zero package-managed dependencies. Three.js r128 is from 2021 and unpatched. Plan to upgrade to a current release, pin the version, and self-host it. If `package.json` is added later, commit the lockfile and run `npm audit` in CI.
