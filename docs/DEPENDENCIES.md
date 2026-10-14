# Dependencies inventory (2026-10-12)

| Item | Version | Where | Notes |
|---|---|---|---|
| Node.js | 22.5 or newer | runtime | Uses only built-ins: `http`, `crypto`, `tls`, `node:sqlite`. `node:sqlite` is still marked experimental by Node; the server silences that notice. Pin the major version in your host and Docker image. |
| npm packages | **none** | `package.json` | Nothing to `npm audit`. Adding one needs written approval in `memory.md`. |
| Three.js | **r128 (2021)**, MIT | `site/vendor/three.min.js` (590 KB, self-hosted) | OUTDATED. Used only by `site/js/scene.js` for the 3D background. |
| Fonts | Bespoke Stencil, Space Grotesk, JetBrains Mono, Big Shoulders Stencil Text | `site/assets/fonts/` (6 files) | Self-hosted; no third-party requests. |

## How to upgrade Three.js safely
1. Download the latest `three.min.js` build from the official release (npmjs.com/package/three, or the GitHub release) on a trusted machine; check its checksum against the npm registry.
2. Replace `site/vendor/three.min.js`.
3. Run `npm test` and `python tests/smoke.py`, then look at the home page by eye: newer versions removed some old classes, so `scene.js` may need small changes.
4. Update the version number in this file and in `docs/memory.md`.
