/* ==========================================================================
   Apeiron Solutions — Project showcase: registry + floating demo window.
   Demos are same-origin pages in /projects/<slug>/ shown in a sandboxed iframe.
   To add a project: add an entry below and a folder in site/projects/.
   ========================================================================== */
export const PROJECTS = {
  web:        [{ slug: 'lumen-architects', name: 'Lumen Architects', kind: 'Studio portfolio site' },
               { slug: 'aurora-studio', name: 'Aurora Studio', kind: 'Interactive flow-field site' }],
  mobile:     [{ slug: 'pulse-fitness', name: 'Pulse', kind: 'Fitness app' },
               { slug: 'orbit-pay', name: 'Orbit Pay', kind: 'Live wallet app' }],
  ai:         [{ slug: 'atlas-assist', name: 'Atlas Assist', kind: 'AI support copilot' },
               { slug: 'neural-playground', name: 'Neural Playground', kind: 'Live-trained neural net' }],
  stack:      [{ slug: 'orbit-tasks', name: 'Orbit Tasks', kind: 'Team task board' },
               { slug: 'studio-board', name: 'Studio Board', kind: 'Live team whiteboard' }],
  cloud:      [{ slug: 'skyline-ops', name: 'Skyline Ops', kind: 'Monitoring console' },
               { slug: 'edge-globe', name: 'Edge Globe', kind: 'Global traffic globe' }],
  data:       [{ slug: 'insight-board', name: 'Insight Board', kind: 'Sales analytics' },
               { slug: 'market-stream', name: 'Market Stream', kind: 'Streaming price feed' }],
  automation: [{ slug: 'flowdesk', name: 'FlowDesk', kind: 'Workflow builder' },
               { slug: 'robo-floor', name: 'Robo Floor', kind: 'Warehouse robot sim' }],
  custom:     [{ slug: 'harbor-logistics', name: 'Harbor Logistics', kind: 'Shipment tracking' },
               { slug: 'resonance', name: 'Resonance', kind: 'Synth and sequencer' }]
};
const BY_SLUG = Object.fromEntries(Object.values(PROJECTS).flat().map(p => [p.slug, p]));
const SIZES = { desktop: '100%', tablet: '768px', phone: '390px' };

export function initProjectWindow() {
  let win, frame, title, openLink, loader, opener, drag = null;
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
  const btn = (label, aria, onClick, cls = 'pw-btn') => { const b = el('button', cls, label); b.type = 'button'; b.setAttribute('aria-label', aria); b.addEventListener('click', onClick); return b; };

  // A fresh iframe for every open/close: no stale state, no races, and no extra Back-button history entries.
  function makeFrame() {
    const f = el('iframe'); f.setAttribute('sandbox', 'allow-scripts allow-forms'); f.referrerPolicy = 'no-referrer';
    f.addEventListener('load', () => { if (f === frame && f.getAttribute('src')) loader.hidden = true; });
    return f;
  }
  function swapFrame() { const old = frame; frame = makeFrame(); old.replaceWith(frame); }

  function build() {
    win = el('div', 'pw'); win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', 'Project demo'); win.tabIndex = -1; win.hidden = true;
    const bar = el('div', 'pw-bar');
    const dots = el('span', 'pw-dots'); dots.setAttribute('aria-hidden', 'true'); dots.append(el('i'), el('i'), el('i'));
    title = el('span', 'pw-title');
    const dev = el('span', 'pw-dev');
    Object.keys(SIZES).forEach(k => { const b = btn(k[0].toUpperCase() + k.slice(1), `${k} view`, () => setDevice(k, dev), 'pw-btn pw-dev-btn'); b.dataset.d = k; dev.append(b); });
    openLink = el('a', 'pw-btn', 'New tab ↗'); openLink.target = '_blank'; openLink.rel = 'noopener noreferrer';
    const max = btn('Maximize', 'Maximize window', () => { win.classList.toggle('max'); max.textContent = win.classList.contains('max') ? 'Restore' : 'Maximize'; });
    bar.append(dots, title, dev, openLink, max, btn('✕', 'Close demo', close, 'pw-btn pw-x'));
    const body = el('div', 'pw-body'); loader = el('div', 'pw-load', 'Loading demo…');
    frame = makeFrame(); body.append(loader, frame);
    const note = el('div', 'pw-note', 'Concept demo built by Apeiron Solutions. Fictional company and sample data, not a client project.');
    win.append(bar, body, note); document.body.append(win);

    bar.addEventListener('pointerdown', e => {   // drag by the title bar (desktop only)
      if (e.target.closest('button,a') || win.classList.contains('max') || innerWidth < 760) return;
      const r = win.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      bar.setPointerCapture(e.pointerId); frame.style.pointerEvents = 'none';
    });
    bar.addEventListener('pointermove', e => { if (!drag) return; win.style.left = Math.max(0, Math.min(innerWidth - 120, e.clientX - drag.dx)) + 'px'; win.style.top = Math.max(0, Math.min(innerHeight - 60, e.clientY - drag.dy)) + 'px'; win.style.transform = 'none'; });
    const end = () => { drag = null; frame.style.pointerEvents = ''; };
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
    addEventListener('keydown', e => { if (e.key === 'Escape' && !win.hidden) close(); });
  }
  function setDevice(k, dev) {
    frame.style.width = SIZES[k]; frame.classList.toggle('narrow', k !== 'desktop');
    dev.querySelectorAll('.pw-dev-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === k)));
  }
  function open(slug, from) {
    const p = BY_SLUG[slug]; if (!p) return;              // only registry slugs are ever loaded
    if (!win) build();
    opener = from || document.activeElement;
    const url = `projects/${p.slug}/index.html`;
    title.textContent = `${p.name} · ${p.kind}`; openLink.href = url; loader.hidden = false;
    win.style.left = win.style.top = win.style.transform = ''; win.classList.remove('max');
    swapFrame(); setDevice('desktop', win.querySelector('.pw-dev')); frame.title = `${p.name} demo`;
    frame.src = url; win.hidden = false; document.body.classList.add('pw-open'); win.focus();
  }
  function close() { if (!win) return; win.hidden = true; document.body.classList.remove('pw-open'); swapFrame(); if (opener && opener.isConnected) opener.focus(); }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-proj]'); if (b) { e.preventDefault(); e.stopPropagation(); open(b.dataset.proj, b); }
  });
  return { open, close };
}
