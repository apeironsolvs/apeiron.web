// The build journey: 1 describe it -> 2 options found from your words -> 3 basic requirements -> 4 choose how to work with us
// -> 5 review, comment and send. Prices always come from the server. Text is written with textContent only.
import { CONFIG } from '../js/config.js';
const $ = s => document.querySelector(s), app = $('#app'), params = new URLSearchParams(location.search);
let me, cat, quote, analysis = { keys: [], reasons: {}, reqs: {} }, step = 0, plan = '', csrf = '', payNote = '', poll = null;
const TOTAL = 5, inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches, wait = ms => new Promise(r => setTimeout(r, reduce ? 50 : ms));
function h(tag, cls, text, kids) { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; (kids || []).forEach(k => k && e.append(k)); return e; }
async function api(path, body, method) {
  const opt = { method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) } };
  if (body) opt.body = JSON.stringify(body);
  try { const r = await fetch(path, opt); let j = {}; try { j = await r.json(); } catch (_) { /* empty */ } return { ok: r.ok, status: r.status, body: j }; } catch (_) { return { ok: false, status: 0, body: {} }; }
}
const bar = n => { const d = h('div', 'steps'); for (let i = 0; i < TOTAL; i++) { const x = document.createElement('i'); if (i <= n) x.className = 'on'; d.append(x); } return d; };
const head = (n, title, lede) => [bar(n), h('p', 'mono', `Step ${n + 1} of ${TOTAL}`), h('h1', '', title), lede ? h('p', 'lede', lede) : null];
const nav = (back, label, onNext, disabled) => { const n = h('div', 'nav'), b = h('button', 'btn', 'Back'), x = h('button', 'btn primary', label); b.type = x.type = 'button'; b.hidden = !back; b.addEventListener('click', back || (() => {})); x.disabled = !!disabled; x.addEventListener('click', onNext); n.append(b, x); return { n, x }; };
const go = n => { clearInterval(poll); step = n; render(); window.scrollTo(0, 0); };
const err = () => { const e = h('p', 'err'); e.setAttribute('role', 'alert'); return e; };
const badge = status => { const m = { draft: ['Not sent yet', 'st-none'], submitted: ['Pending', 'st-pending'], negotiating: ['Pending', 'st-pending'], accepted: ['Accepted', 'st-accepted'], declined: ['Rejected', 'st-rejected'] }[status] || [status, 'st-none']; const b = h('span', 'status ' + m[1], m[0]); b.setAttribute('role', 'status'); return b; };
async function analysing(lines) {
  const box = h('div', 'card analyse'), list = h('ul', 'alist'); box.append(h('h2', '', 'Analysing…'), list); app.replaceChildren(box);
  for (const t of lines) { list.append(h('li', '', t)); await wait(520); }
}
async function save(a) {
  const r = await api(`/api/client/quotes/${quote.id}`, { services: quote.services, reqs: quote.reqs, notes: quote.notes }, 'PUT');
  if (!r.ok) { a.textContent = r.body.error || 'Could not save. Please try again.'; return false; }
  quote = r.body.quote; return true;
}

// ---- step 0: describe it
function stepPrompt() {
  const w = h('div'), ta = document.createElement('textarea'), e = err();
  ta.maxLength = 1000; ta.rows = 6; ta.setAttribute('aria-label', 'What do you want to build'); ta.placeholder = 'For example: a mobile app for my cafe where customers order ahead and pay online, with a dashboard where I can see sales.';
  ta.value = params.get('idea') || (params.get('need') ? `I am interested in: ${params.get('need')}. ` : '');
  const ex = h('div', 'chips');
  ['A mobile app for my business with online payments', 'A website with a booking system and admin dashboard', 'An AI chatbot that answers my customers using our documents', 'Automate our lead follow-up with WhatsApp and email'].forEach(t => { const c = h('button', 'chip', t); c.type = 'button'; c.addEventListener('click', () => { ta.value = t; ta.focus(); }); ex.append(c); });
  const nx = nav(null, 'Continue →', async () => {
    e.textContent = ''; const idea = ta.value.trim(); if (idea.length < 3) { e.textContent = 'Tell us a little about what you want to build, in a sentence or two.'; return; }
    nx.x.disabled = true; const r = await api('/api/client/quotes', { idea });
    if (!r.ok) { nx.x.disabled = false; e.textContent = r.body.error || 'Something went wrong. Please try again.'; return; }
    const g = await api(`/api/client/quotes/${r.body.id}`); if (!g.ok) { nx.x.disabled = false; e.textContent = 'Something went wrong. Please try again.'; return; }
    quote = g.body.quote; analysis = g.body.analysis; history.replaceState(null, '', `?q=${quote.id}`);
    await analysing(['Reading what you wrote…', 'Matching it to what we build…', 'Preparing your options…']); go(1);
  });
  w.append(...head(0, 'What do you want to build?', 'Describe your idea in your own words. We will look at it and suggest what you need.'), ta, h('p', 'note', 'Need inspiration? Tap an example:'), ex, e, nx.n); setTimeout(() => ta.focus(), 50);
  return w;
}
// ---- step 1: options from the analysis
function stepOptions() {
  const sel = new Set(quote.services), w = h('div'), grid = h('div', 'grid'), e = err();
  const nx = nav(() => go(0), 'Continue →', async () => {
    e.textContent = ''; nx.x.disabled = true; quote.services = [...sel];
    quote.reqs = Object.fromEntries(quote.services.map(k => [k, (quote.reqs[k] && quote.reqs[k].length) ? quote.reqs[k] : (analysis.reqs[k] || [])]));
    if (!(await save(e))) { nx.x.disabled = false; return; }
    await analysing(['Looking at your choices…', 'Working out the basics each one needs…']); go(2);
  }, !sel.size);
  w.append(...head(1, 'Here is what we think you need.', 'From your idea we picked the best fit and highlighted it. Choose as many options as you need, and change our picks freely.'), h('p', 'idea', quote.idea), grid);
  for (const [k, s] of Object.entries(cat.services)) {
    const why = (analysis.reasons[k] || []).filter(Boolean), b = h('button', 'opt', '', [h('span', 'tick'), h('b', '', s.name), h('span', '', s.blurb), h('span', '', ` from ${inr(s.base)}`)]);
    if (analysis.keys.includes(k)) b.append(h('div', '', '', [h('span', 'sugg', 'Suggested for you')]), why.length ? h('span', 'why', 'You mentioned: ' + why.join(', ')) : null);
    b.type = 'button'; b.setAttribute('aria-pressed', sel.has(k));
    b.addEventListener('click', () => { sel.has(k) ? sel.delete(k) : sel.add(k); b.setAttribute('aria-pressed', sel.has(k)); nx.x.disabled = !sel.size; });
    grid.append(b);
  }
  w.append(e, nx.n); return w;
}
// ---- step 2: basic requirements
function stepReqs() {
  const w = h('div'), e = err(); w.append(...head(2, 'Tell us the basics.', 'We ticked what your idea suggests. Add or remove anything. Included items cost nothing extra.'));
  for (const k of quote.services) {
    const s = cat.services[k], card = h('div', 'card'); card.append(h('h2', '', s.name));
    for (const [rk, r] of Object.entries(s.reqs)) {
      const cb = document.createElement('input'), lb = h('label', '', r.label), row = h('div', 'req', '', [cb, lb, h('em', '', r.price ? '+' + inr(r.price) : 'Included')]);
      cb.type = 'checkbox'; cb.id = `r-${k}-${rk}`; lb.htmlFor = cb.id; cb.checked = (quote.reqs[k] || []).includes(rk);
      cb.addEventListener('change', () => { const set = new Set(quote.reqs[k] || []); cb.checked ? set.add(rk) : set.delete(rk); quote.reqs[k] = [...set]; });
      card.append(row);
    }
    const note = document.createElement('input'); note.type = 'text'; note.maxLength = 500; note.placeholder = 'Anything specific about this? (optional)'; note.value = quote.notes[k] || ''; note.setAttribute('aria-label', `Notes for ${s.name}`);
    note.addEventListener('input', () => { quote.notes[k] = note.value; }); card.append(note); w.append(card);
  }
  const nx = nav(() => go(1), 'Continue →', async () => { e.textContent = ''; nx.x.disabled = true; if (!(await save(e))) { nx.x.disabled = false; return; } await analysing(['Adding up your selection…', 'Preparing your two options…']); go(3); });
  w.append(e, nx.n); return w;
}
// ---- step 3: two ways to work with us
function stepPlan() {
  const p = quote.pricing.plans, w = h('div'), grid = h('div', 'plans'); w.append(...head(3, 'How would you like to work with us?', 'Choose one. You can still talk to us about it before anything is final.'));
  const mk = (key, title, big, sub, items) => { const b = h('button', 'opt plan', '', [h('span', 'tick'), h('b', '', title), h('div', 'price', big), h('span', '', sub), h('ul', '', '', items.map(t => h('li', '', t)))]); b.type = 'button'; b.setAttribute('aria-pressed', plan === key); b.addEventListener('click', () => { plan = key; [...grid.children].forEach(c => c.setAttribute('aria-pressed', c === b)); nx.x.disabled = false; }); return b; };
  grid.append(mk('subscription', 'Continue building with us', inr(p.subscription.total), `build cost, then ${inr(p.subscription.monthly)} per month`, ['We build it, then keep improving it', 'Updates and fixes as you grow', 'Subscription plan: your build price includes a 10% discount']),
              mk('build', 'Just build, then leave', inr(p.build.total), 'one-time build cost', ['We build it and hand it over', 'No subscription, no monthly fee', 'Future updates are quoted separately']));
  const nx = nav(() => go(2), 'Review and send →', () => go(4), !plan); w.append(grid, nx.n); return w;
}
// ---- step 4: review, negotiate, send
function stepReview() {
  const pr = quote.pricing, sub = plan === 'subscription', total = pr.plans[plan].total, monthly = sub ? pr.plans.subscription.monthly : 0, sent = quote.status !== 'draft';
  const w = h('div'), card = h('div', 'card'), e = err();
  w.append(...head(4, sent ? 'Your request.' : 'Review and send.', sent ? 'You can follow it here. This page updates by itself.' : 'Check everything, add a comment if you like, then send.'));
  for (const l of pr.lines) { card.append(h('div', 'row', '', [h('b', '', l.name), h('b', '', inr(l.total))]), h('div', 'row sub', '', [h('span', '', 'Base build'), h('span', '', inr(l.base))])); l.add.forEach(a => card.append(h('div', 'row sub', '', [h('span', '', a.label), h('span', '', a.price ? inr(a.price) : 'Included')]))); }
  card.append(h('div', 'row', '', [h('span', '', 'Selected options total'), h('span', '', inr(pr.subtotal))]));
  if (sub) card.append(h('div', 'row', '', [h('span', '', 'Subscription discount on the build'), h('span', '', '− ' + inr(pr.subtotal - total))]));
  card.append(h('div', 'row total', '', [h('span', '', sub ? 'Build cost' : 'Build cost (one-time, no subscription)'), h('span', '', inr(total))]));
  if (sub) card.append(h('div', 'row', '', [h('span', '', 'Subscription fee (updates and fixes)'), h('span', '', inr(monthly) + ' per month')]));
  w.append(card, h('div', 'card', '', [h('h2', '', 'Payment details'), h('p', 'note', sub ? `You pay ${inr(total)} for the build, then ${inr(monthly)} every month while you stay on the subscription. ${payNote}` : `You pay ${inr(total)} once for the build. There is no subscription. ${payNote}`)]));
  const thread = h('div', 'thread'); const paint = () => { thread.replaceChildren(); (quote.comments || []).forEach(c => thread.append(h('div', 'msg ' + c.author, '', [h('small', '', (c.author === 'admin' ? 'Apeiron' : 'You') + ' · ' + new Date(c.created_at).toLocaleString()), document.createTextNode(c.message)]))); }; paint();
  const neg = h('div', 'card'), ta = document.createElement('textarea'), send = h('button', 'btn primary', sent ? 'Send comment' : 'Send'), stat = badge(quote.status), row = h('div', 'sendrow'), note = h('p', 'note');
  ta.maxLength = 1000; ta.setAttribute('aria-label', 'Your comment'); ta.placeholder = 'For example: my budget is ₹2,00,000. Can we drop the dashboard or do it in phases?'; send.type = 'button';
  neg.append(h('h2', '', 'You can negotiate'), h('p', 'note', 'Write a comment with your budget or what you would change. We reply here and by email.'), thread, ta);
  row.append(send, stat); neg.append(row, note, e);
  send.addEventListener('click', async () => {
    e.textContent = ''; note.textContent = ''; const text = ta.value.trim(); send.disabled = true;
    if (quote.status === 'draft') {
      const r = await api(`/api/client/quotes/${quote.id}/submit`, { plan, comment: text });
      if (!r.ok) { send.disabled = false; e.textContent = r.body.error || 'Could not send. Please try again.'; return; }
      const g = await api(`/api/client/quotes/${quote.id}`); if (g.ok) quote = g.body.quote; ta.value = ''; go(4); return;
    }
    if (text.length < 2) { send.disabled = false; e.textContent = 'Write your comment first.'; return; }
    const r = await api(`/api/client/quotes/${quote.id}/comments`, { message: text }); send.disabled = false;
    if (!r.ok) { e.textContent = r.body.error || 'Could not send. Please try again.'; return; }
    quote = r.body.quote; ta.value = ''; paint(); note.textContent = 'Comment sent.'; note.className = 'note ok';
  });
  if (quote.status === 'declined') send.disabled = true;
  w.append(neg);
  if (sent) {
    const msg = h('p', 'note'); const say = () => { msg.textContent = quote.status === 'accepted' ? 'Approved by Apeiron. We will contact you about the next steps.' : quote.status === 'declined' ? 'This request was not approved as sent. You are welcome to start a new one.' : 'Waiting for Apeiron to review. This turns green when it is approved.'; };
    say(); w.append(msg);
    poll = setInterval(async () => {
      if (document.hidden) return; const g = await api(`/api/client/quotes/${quote.id}`); if (!g.ok) return;
      const was = quote.status, n = (g.body.quote.comments || []).length, had = (quote.comments || []).length; quote = g.body.quote;
      if (quote.status !== was) { stat.replaceWith(Object.assign(badge(quote.status))); go(4); } else if (n !== had) { paint(); }
      say();
    }, 6000);
  }
  const a = h('a', 'btn', 'All my requests'); a.href = '../account/'; w.append(h('div', 'nav', '', [sent ? a : h('button', 'btn', 'Back'), h('span')]));
  if (!sent) { w.lastChild.firstChild.addEventListener('click', () => go(3)); }
  return w;
}
function render() { app.replaceChildren([stepPrompt, stepOptions, stepReqs, stepPlan, stepReview][step]()); }

(async function init() {
  const m = await api('/api/client/me'); if (!m.ok) { location.replace('../?signin=1'); return; }
  me = m.body; csrf = me.csrf; const who = $('#who'), dash = h('a', 'btn sm', 'Dashboard'), out = h('button', 'btn sm', 'Log out'); dash.href = '../account/'; who.append(dash, me.name || me.email, out);
  out.addEventListener('click', async () => { await api('/api/client/logout', {}); location.href = '../'; });
  const c = await api('/api/catalog'); if (!c.ok) { app.replaceChildren(h('p', 'err', 'Something went wrong. Please refresh the page.')); return; }
  cat = c.body; payNote = c.body.paymentNote || '';
  const id = params.get('q');
  if (!id) { step = 0; render(); return; }
  const g = await api(`/api/client/quotes/${encodeURIComponent(id)}`);
  if (!g.ok) { app.replaceChildren(h('p', 'err', 'We could not find that request.'), (() => { const a = h('a', 'btn', 'Start a new one'); a.href = '../start/'; return a; })()); return; }
  quote = g.body.quote; analysis = g.body.analysis; plan = quote.plan || '';
  step = quote.status !== 'draft' ? 4 : 1; if (step === 4 && !plan) plan = 'build'; render();
})();
