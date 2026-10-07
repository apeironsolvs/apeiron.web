# Apeiron Solutions — Web Application

Modern, high-performance interactive website for **Apeiron Solutions** featuring custom WebGL shaders, fluid cursor trails, GSAP-style scroll reveal text animations, and dynamic 3D shape morphing.

## 🚀 Features

- **3D WebGL Cyan Constellation Background**: Pure cyan (`#38d5ff`) glowing 3D particle system with dynamic line connections, field noise, and smooth shape morphing.
- **`GlowCursor` WebGL Fluid Engine**: Multi-segment GLSL gradient cursor trail (`#67E8F9` to `#A78BFA`), hotspot white core, film grain noise, pulse modulation, and 700ms idle auto-fade.
- **`ScrollReveal` Text Animations**: Staggered word-by-word scroll reveal engine (`opacity: 0.10 -> 1.0`, `blur(4px) -> blur(0px)`, and subtle 3° rotation).
- **`HoverExpand_001` Accordion**: Dynamic flex expansion (`flex: 1 1 380px` active vs `flex: 0 0 44px` collapsed) in the *"What We Build"* section, fully integrated with 3D WebGL morphing models.
- **Project Intake & Interactive Modals**: Functional contact forms, step-by-step project intake wizard, dynamic summary generator, and direct clipboard copying.

## 🛠️ Tech Stack

- **HTML5 & CSS3**: Custom design tokens, glassmorphism, responsive grid layout.
- **Three.js & WebGL (GLSL)**: Custom fragment & vertex shaders for rendering 3D particle shapes and fluid cursor trails.
- **Vanilla JavaScript (ES6+)**: Zero bulky framework overhead for instant load times and 60fps animations.

## 💻 Local Development

Simply open `index.html` or `Apeiron Solutions.html` in any modern WebGL-enabled browser:

```bash
# Python local server
python -m http.server 8000
```

Then visit `http://localhost:8000` in your web browser.
