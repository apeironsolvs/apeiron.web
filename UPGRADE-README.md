# Apeiron upgrade pack

Everything here is additive. Your WebGL engine, cursor, and intake logic stay untouched.

## 5-minute install
1. Copy all files in this folder into the root of your repo (next to `index.html`).
2. In `index.html` `<head>`: paste the contents of `head-snippet.html` (replace the old JSON-LD block).
3. In `index.html`: paste `sections.html` right above the `<!-- ABOUT -->` comment.
4. Right before `</body>`: add `<script src="upgrade.js" defer></script>`.
5. Footer: change the Privacy / Terms / Security links from `#` to `privacy.html`, `terms.html`, `security.html`.
6. Search every file for `YOUR-DOMAIN.com` and replace with your real domain.

## What this adds
Engagement models (Idea Sprint / MVP Build / Product Team) wired to your existing intake modal, a tech marquee, an FAQ (with FAQ schema for Google), scroll progress bar, back-to-top button, favicon and manifest, canonical + Open Graph + JSON-LD, robots.txt, sitemap.xml, a 404 page, and draft legal pages.

## What still separates this from a real $100K site (needs YOUR input, not code)
1. **Contact path**: `CONFIG.email` is still `hello@apeiron.example` and `endpoint` is empty. Use a real address, and set `endpoint` to a Formspree / Web3Forms / Netlify Forms URL so enquiries arrive without relying on the visitor's mail app.
2. **Projects**: all three cards say "Placeholder". Premium sites live on proof. Even one real case study (screenshots, problem, result) beats everything else here.
3. **Founders / team**: add real names, photos, and short bios. Buyers hire people.
4. **Claims**: "elite engineering squad", "millions of requests", and "weeks, not months" are promises. Keep only what you can deliver, or add proof next to them.
5. **OG image**: make a 1200x630 PNG named `og-image.png` so links look good on LinkedIn, X, and WhatsApp.
6. **Legal pages**: fill the bracketed items and have a lawyer review them.
7. **Duplicate file**: `Apeiron Solutions.html` duplicates `index.html`. Keep one.
8. **Hosting**: deploy on Cloudflare Pages, Netlify, or Vercel (free), connect your domain, then submit `sitemap.xml` in Google Search Console.
9. **Performance check**: run Lighthouse on a mid-range phone. The scroll-driven WebGL scene is heavy, so confirm it holds frame rate and that the `no-gl` fallback works.
10. **Analytics**: add a privacy-friendly tool (Plausible, Umami) and update the privacy page to match.
