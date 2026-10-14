# PRD — Apeiron Solutions Website

Version 0.1 · Written 2026-10-10 · Repo: https://github.com/apeironsolvs/apeiron.web

> Items marked **TO CONFIRM** are things the founders must decide. AI assistants must not invent answers to them. Record the decision in `memory.md`.

---

## 1. What we are building

A public marketing and lead-generation website for **Apeiron Solutions**, a startup. The site presents the company, explains what it builds and how it works, shows the team and projects, and lets a visitor submit a project idea through an intake form.

**Today (v0.1):** a static front-end site. Plain HTML, CSS and vanilla JavaScript, with Three.js (WebGL) for the 3D particle background and cursor trail. No framework, no build step, no backend, no database, no user accounts.

**Later (Phase 2+):** login, a user dashboard and a payment system. These need a backend and change the security model completely. See `task.md` and `Architecture.md`.

## 2. Goals

1. Make a strong first impression and explain the company in under a minute of scrolling.
2. Convert visitors into leads through the project intake wizard.
3. Look and feel distinctive (dark, cyan, glass, 3D) while staying fast and accessible.
4. Be safe by default: no secrets in the repo, no unsafe HTML injection, strict external-resource rules.

## 3. Non-goals (for now)

- No user accounts, admin panel, dashboard or payments in v1.
- No CMS or blog.
- No server-side code until Phase 2 is approved.

## 4. Audience

- Founders and small teams who need software built (**TO CONFIRM** exact target customer).
- Potential partners, collaborators and hires.

## 5. Current page structure (from the repo)

| Section | Anchor | Purpose |
|---|---|---|
| Hero | `#hero` | Headline and primary call to action |
| Problem | `#problem` | The pain being solved |
| Solution | `#solution` | How Apeiron solves it |
| What We Build | `#build` | Accordion of capabilities paired with 3D models |
| How We Work | `#how` | Process stages |
| Idea demo | `#idea` | Interactive "try your idea" input |
| Team | `#people` | The people |
| Custom | `#custom` | Custom work offering |
| Projects | `#projects` | Selected work |
| Why | `#why` | Differentiators |
| Trust | `#trust` | Credibility and security posture |
| About | `#about` | Company story |
| Final CTA | `#cta` | Closing call to action |
| Footer | — | Links: Privacy, Terms, Security, LinkedIn, GitHub |
| Intake dialog | `#intake` | Multi-step project intake form with summary and copy-to-clipboard |

## 6. Functional requirements

### FR-1 Marketing content
All sections above render correctly on desktop and mobile.

### FR-2 Visual effects
- 3D cyan particle constellation background with connecting lines and shape morphing.
- WebGL cursor trail that fades after idle.
- Word-by-word scroll-reveal text.
- Respect `prefers-reduced-motion`: effects must degrade to a static, readable page.

### FR-3 Project intake
- Multi-step wizard collecting: idea, name, email, company (optional), phone (optional) plus option choices.
- Generates a summary the visitor can copy.
- Delivery today: opens an email to `CONFIG.email` (a `mailto:` link). `CONFIG.endpoint` is empty.
- **Open item:** `CONFIG.email` is still the placeholder `hello@apeiron.example`. It must be replaced with a real address before launch.

### FR-4 Legal and trust pages
Privacy, Terms and Security links in the footer currently point to `#`. Real pages are required before launch (**TO CONFIRM** who writes the legal text).

## 7. Non-functional requirements

| Area | Requirement |
|---|---|
| Security | See `rules.md` section 4 and `task.md` Phase 0. No secrets in client code or git history. |
| Performance | Largest Contentful Paint under 2.5 s on a mid-range phone. WebGL pauses when the tab is hidden. |
| Accessibility | WCAG 2.2 AA for text contrast, keyboard navigation for the dialog and accordion, visible focus states. |
| Browser support | Current Chrome, Edge, Safari, Firefox. A non-WebGL fallback shows the content without the 3D layer. |
| SEO | Title, meta description, Open Graph tags, `robots.txt`, `sitemap.xml`. |
| Privacy | Collect only what the intake form needs. No analytics or cookies until a consent approach is decided. |

## 8. Success metrics

- Intake completion rate (started vs. submitted).
- Page load time and Lighthouse scores (Performance, Accessibility, Best Practices, SEO all 90+).
- Zero known high-severity security findings at launch.

## 9. Future scope (Phase 2+)

1. Login and accounts.
2. User dashboard.
3. Payment system.

Each phase has security gates in `task.md`. None starts until the previous phase's gate is passed.

## 10. Open questions (**TO CONFIRM**)

1. Where is the site hosted (GitHub Pages, Netlify, Vercel, other)? This decides how security headers are set.
2. What is the real contact email and domain?
3. Should intake submissions go to a form service or a custom backend instead of `mailto:`?
4. What is `Apeiron Solutions.html` in the repo? It was not inspected. Likely a duplicate or variant of `index.html`.
5. Which countries' privacy rules apply (GDPR, India DPDP, etc.)?
