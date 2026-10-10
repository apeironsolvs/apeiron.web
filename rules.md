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
