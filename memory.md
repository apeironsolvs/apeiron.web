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
