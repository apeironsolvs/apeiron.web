# design.md — Design system for Apeiron Solutions

Version 0.1 · 2026-10-10. Tokens below were taken from the current `index.html`. If the CSS changes, update this file in the same commit.

**Visual identity in one line:** dark, technical, calm. A near-black canvas, one electric cyan accent, frosted-glass panels and a living 3D particle field.

---

## 1. Colour tokens

### Core

| Token | Value | Use |
|---|---|---|
| `--ink` | `#06080a` | Page background |
| `--panel` | `#0d1216` | Cards and dialogs |
| `--line` | `#1c252c` | Borders and dividers |
| `--text` | `#edf1f4` | Primary text |
| `--mute` | `#8d98a2` | Secondary text |
| `--cyan` | `#38d5ff` | Primary accent, links, focus, particles |

### Supporting

| Value | Use |
|---|---|
| `#67e8f9` | Light cyan, hover and highlights |
| `#a78bfa` | Violet, secondary accent |
| `#f43f5e` | Rose, alerts and rare emphasis |
| `#ff8f8f` | Form error text |
| `#021218` | Text on cyan buttons |
| `#c3ccd4`, `#b8c2cb` | Body copy on dark panels |

### Contrast rules (against `#06080a`)

- `--text` and `--mute` pass WCAG AA for body text (`--mute` is about 6.8:1).
- `#56626c` and `#5f6b75` are only about 3:1 to 3.2:1. Use them for decoration or large text only, never small body copy. Check before use.
- Never use colour alone to show state. Pair with an icon or text.

## 2. Glass system

Existing CSS variables, to be reused and not redefined:

- Backgrounds: `--glass-bg-subtle`, `--glass-bg-primary`, `--glass-bg-focal`, `--glass-bg-solid`
- Borders: `--glass-border-subtle`, `--glass-border-primary`, `--glass-border-hover`, `--glass-border-focal`
- Highlights: `--glass-highlight`, `--glass-highlight-subtle`
- Shadows: `--glass-shadow-level1`, `--glass-shadow-level2`, `--glass-shadow-level3`
- Blur: `--glass-blur-subtle`, `--glass-blur-primary`, `--glass-blur-focal`

**Elevation ladder:** subtle (supporting cards) → primary (default panels) → focal (the one thing the eye should land on per screen).

Provide a solid fallback background where `backdrop-filter` is unsupported.

## 3. Typography

| Role | Font | Notes |
|---|---|---|
| Body and UI (`--f`) | Space Grotesk | 16px base, line-height 1.6 |
| Headings (`--fh`) | Big Shoulders Stencil Text / Bespoke Stencil | Uppercase or tight tracking, large display sizes |
| Code, labels, data (`--m`) | JetBrains Mono | Small caps-style labels, step numbers |

- Always include system fallbacks.
- Self-host as woff2 with `font-display: swap` (see `Architecture.md`).
- Fluid sizing with `clamp()`. Keep line length 60–75 characters.

## 4. Spacing, shape, layout

- 8px spacing scale: 4, 8, 16, 24, 32, 48, 64, 96.
- Section vertical padding: 96px desktop, 64px mobile.
- Max content width about 1200px, centred. 16px side gutters on mobile.
- Radius: 8px small controls, 16px cards, 999px pills.
- Mobile first. Breakpoints near 640, 960, 1280.

## 5. Components

| Component | Behaviour |
|---|---|
| Primary button | Cyan fill, `#021218` text, glow on hover, visible focus ring |
| Secondary button | Glass fill, cyan border on hover |
| Glass card | Primary glass background, 1px glass border, level-2 shadow |
| Accordion ("What We Build") | One panel open at a time, paired 3D model, keyboard operable, `aria-expanded` |
| Process rail | Buttons for each stage, active state in cyan |
| Intake dialog | Native `<dialog>`, multi-step, progress indicator, labels on every field, inline error text with `aria-live` |
| Chips and option buttons | Pill shape, selected state shown by fill and a check mark |
| Footer | Muted text, cyan on link hover |

## 6. Motion

- Easing: `cubic-bezier(0.22, 1, 0.36, 1)`. Durations 150–400ms for UI, longer for reveals.
- Scroll reveal is word by word, staggered, once per element.
- Particle field: cyan points with connecting lines and shape morphing. Pause when the tab is hidden and lower the count on mobile.
- Cursor trail: cyan to white-core gradient with film grain, fades after idle. Disabled on touch devices.
- **`prefers-reduced-motion: reduce`:** turn off morphing, trail and word reveal. Show content immediately and keep a static background.

## 7. Accessibility

- Visible focus on every interactive element (cyan outline, 2px with offset).
- Full keyboard support for dialog and accordion. Focus is trapped in the dialog and returned on close.
- Alt text on meaningful images. Decorative canvas is `aria-hidden="true"`.
- Minimum tap target 44×44px.

## 8. Voice and content

- Confident, plain, specific. No hype words, no invented numbers or testimonials.
- Short sentences. One idea per paragraph.
