/* ==========================================================================
   Apeiron Solutions — "Talk to support" chat.
   An automated assistant that answers common questions from facts about this site
   (prices come live from /api/catalog) and hands over to a person by email when asked.
   It is NOT an AI model: it matches keywords. Text is written with textContent only.
   ========================================================================== */
export function initSupport() {
  let box, log, chips, input, opener, catalog = null, flow = null, data = {};
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  async function getCatalog() {
    if (catalog) return catalog;
    try { const r = await fetch('/api/catalog'); if (r.ok) catalog = await r.json(); } catch (_) { /* offline */ }
    return catalog;
  }
  function say(text, who = 'bot') { const m = el('div', 'sup-m ' + who, text); log.append(m); log.scrollTop = log.scrollHeight; return m; }
  function offer(items) {          // quick-reply chips: [label, handler]
    chips.replaceChildren();
    items.forEach(([label, fn]) => { const b = el('button', '', label); b.type = 'button'; b.addEventListener('click', () => { say(label, 'me'); chips.replaceChildren(); fn(); }); chips.append(b); });
    log.scrollTop = log.scrollHeight;
  }
  const home = () => offer([['Prices', () => reply('prices')], ['What do you build?', () => reply('build')], ['How does it work?', () => reply('process')], ['Plans', () => reply('plans')], ['Talk to a person', startHuman]]);

  const KB = {
    hello: async () => say('Hi! I am the Apeiron assistant. I can answer questions about what we build, prices and how we work, or pass you to our team.'),
    prices: async () => { const c = await getCatalog(); say(c ? 'Starting prices, before tax:\n' + Object.values(c.services).map(s => `• ${s.name}: from ${inr(s.base)}`).join('\n') + '\n\nThe project builder shows an estimate for exactly what you need. The final price is always confirmed in writing.' : 'Our project builder shows starting prices for each option. The final price is always confirmed in writing.'); offer([['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }], ['Talk to a person', startHuman]]); },
    build: async () => { say('We build websites, full stack products, mobile apps, AI features, automation, cloud setups, data systems and custom software. You can open live demos inside each card in the What We Build section.'); offer([['Show me the demos', () => { close(); document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' }); }], ['Prices', () => reply('prices')]]); },
    process: async () => { say('There are three ways to work with us:\n• Idea Sprint: a short engagement that turns a rough idea into a plan.\n• MVP Build: we design and build the first working version.\n• Product Team: an ongoing team that keeps improving your product after launch.'); offer([['Plans and updates', () => reply('plans')], ['Talk to a person', startHuman]]); },
    plans: async () => { say('In the project builder you choose between two plans:\n• Build only: one price, we build and hand it over.\n• Build and keep improving: a discounted build price plus a monthly fee, and we keep your product updated and fixed.\nYou can change your mind by talking to us.'); offer([['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }]]); },
    time: async () => { say('Timelines depend on the scope. We give a plan and timeline in the written agreement before work starts. An Idea Sprint is the quickest way to get a scoped roadmap.'); offer([['Talk to a person', startHuman]]); },
    pay: async () => { say('We do not take payments on this website. After you approve the scope and price in writing, we share a payment plan in milestones.'); },
    security: async () => { say('Your details are stored in our database and only our team can read them. Your password is stored scrambled (hashed), so nobody can read it. You can read the Privacy Policy and Security pages for details, and ask us to delete your data at any time.'); },
    account: async () => { say('Use "Log in" at the top right, or "Bring your idea". New here? Choose "Create account": add your name, email and a password, and accept the Terms and Privacy Policy. You stay logged in on your device for 30 days. If you forget your password, choose "Forgot your password?" and we email a 6-digit code to set a new one.'); offer([['Log in', () => { close(); document.querySelector('[data-login]')?.click(); }], ['Talk to a person', startHuman]]); },
    thanks: async () => say('You are welcome! Anything else I can help with?'),
    fallback: async () => { say('I am not sure about that one. I can pass your question to our team and they will reply by email.'); offer([['Yes, talk to a person', startHuman], ['Prices', () => reply('prices')], ['What do you build?', () => reply('build')]]); }
  };
  const RULES = [[/\b(human|person|agent|someone|call me|contact|speak|talk to)\b/i, 'human'], [/\b(hi|hello|hey|namaste)\b/i, 'hello'], [/\b(thanks|thank you|thx)\b/i, 'thanks'],
    [/\b(price|prices|pricing|cost|costs|how much|budget|quote|estimate|rate|fees?)\b/i, 'prices'], [/\b(plan|plans|subscription|maintenance|updates?|monthly|support plan)\b/i, 'plans'],
    [/\b(how long|timeline|deadline|duration|weeks?|months?|delivery|when)\b/i, 'time'], [/\b(pay|payment|invoice|upi|card|bank)\b/i, 'pay'], [/\b(secure|security|privacy|data|gdpr|safe|confidential)\b/i, 'security'],
    [/\b(login|log in|sign in|code|otp|account|password|verify)\b/i, 'account'], [/\b(build|services?|offer|website|app|mobile|ai|automation|cloud|demo|projects?)\b/i, 'build'], [/\b(process|how does|how do you|work|sprint|mvp|steps?)\b/i, 'process']];
  async function reply(key) { const t = say('…'); await wait(350); t.remove(); await KB[key](); }

  // ---- hand-over to a person (stored as a "support" enquiry; staff see it in the admin panel)
  function startHuman() { flow = 'name'; data = {}; chips.replaceChildren(); say('Happy to. What is your name?'); input.focus(); }
  async function human(text) {
    if (flow === 'name') { data.name = text.slice(0, 100); flow = 'email'; return say(`Thanks, ${data.name}. What email address should we reply to?`); }
    if (flow === 'email') { if (!/^\S+@\S+\.\S{2,}$/.test(text)) return say('That does not look like an email address. Please try again, like name@company.com.'); data.email = text.slice(0, 254); flow = 'message'; return say('And what would you like to ask or tell us?'); }
    if (flow === 'message') { data.message = text.slice(0, 1000); flow = 'consent'; return offer([['Yes, that is fine', send], ['No, cancel', () => { flow = null; say('No problem. Nothing was saved. You can ask me something else.'); home(); }]]), say('We will store your name, email and message so we can reply, as described in our Privacy Policy. Is that OK?'); }
  }
  async function send() {
    flow = null; const t = say('Sending…');
    try {
      const r = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idea: data.message.length < 3 ? data.message + '...' : data.message, name: data.name, email: data.email, consent: true, source: 'support' }) });
      t.remove();
      if (r.status === 201) { say(`Thank you, ${data.name}. Your message is with our team and we will reply to ${data.email}.`); }
      else if (r.status === 429) say('You have sent several messages recently. Please try again a little later.');
      else say('Sorry, that did not go through. Please try again in a moment.');
    } catch (_) { t.remove(); say('Sorry, I could not reach our server. Please try again in a moment.'); }
    home();
  }

  function build() {
    box = el('div', 'sup'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Support chat'); box.tabIndex = -1; box.hidden = true;
    const bar = el('div', 'sup-bar'), x = el('button', 'sup-x', '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Close chat'); x.addEventListener('click', close);
    bar.append(el('b', '', 'Apeiron support'), el('span', 'sup-tag', 'Automated assistant'), x);
    log = el('div', 'sup-log'); log.setAttribute('aria-live', 'polite'); chips = el('div', 'sup-chips');
    const form = el('form', 'sup-in'); input = el('input'); input.type = 'text'; input.maxLength = 300; input.autocomplete = 'off'; input.placeholder = 'Ask about prices, plans, how it works…'; input.setAttribute('aria-label', 'Type your message');
    const go = el('button', 'btn primary sm', 'Send'); go.type = 'submit'; form.append(input, go);
    form.addEventListener('submit', async e => {
      e.preventDefault(); const t = input.value.trim(); if (!t) return; input.value = ''; say(t, 'me'); chips.replaceChildren();
      if (flow && flow !== 'consent') return human(t);
      if (flow === 'consent') return say('Please choose Yes or No above.');
      const hit = RULES.find(r => r[0].test(t)); if (hit && hit[1] === 'human') return startHuman(); reply(hit ? hit[1] : 'fallback');
    });
    box.append(bar, log, chips, form); document.body.append(box);
    addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) close(); });
  }
  function open(from) {
    if (!box) build(); opener = from || document.activeElement;
    if (box.hidden) { log.replaceChildren(); flow = null; box.hidden = false; KB.hello().then(home); }
    box.focus(); input.focus(); getCatalog();
  }
  function close() { if (!box) return; box.hidden = true; flow = null; if (opener && opener.isConnected && opener.offsetParent !== null) opener.focus(); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-open-support]'); if (b) { e.preventDefault(); open(b); } });
  return { open, close };
}
