// Profile and live request status. The list refreshes by itself; the profile card is built once so typing is never lost.
const $ = s => document.querySelector(s), app = $('#app');
const STAGES = [['received', 'Received'], ['planning', 'Planning'], ['building', 'Building'], ['review', 'Review'], ['delivered', 'Delivered']];
const BADGE = { draft: ['Not sent yet', 'st-none'], submitted: ['Pending', 'st-pending'], negotiating: ['Pending', 'st-pending'], accepted: ['Accepted', 'st-accepted'], declined: ['Rejected', 'st-rejected'] };
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
function h(tag, cls, text, kids) { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; (kids || []).forEach(k => k && e.append(k)); return e; }
let csrf = '', qbox;
async function api(path, body, method) { try { const r = await fetch(path, { method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Token': csrf } : {}) }, body: body ? JSON.stringify(body) : undefined }); let j = {}; try { j = await r.json(); } catch (_) { /* empty */ } return { ok: r.ok, status: r.status, body: j }; } catch (_) { return { ok: false, status: 0, body: {} }; } }
async function load() {
  const r = await api('/api/client/quotes'); if (!r.ok) return;
  const wrap = h('div'); wrap.append(h('h2', '', 'Your requests'), h('span', 'mono', '● Live · updates every few seconds'));
  const start = h('a', 'btn primary sm', 'Start a new request'); start.href = '../start/'; wrap.append(h('div', 'nav', '', [h('span'), start]));
  if (!r.body.quotes.length) wrap.append(h('p', 'lede', 'You have no requests yet.'));
  for (const q of r.body.quotes) {
    const card = h('div', 'card'), names = q.pricing ? q.pricing.lines.map(l => l.name).join(', ') : 'Nothing chosen yet', b = BADGE[q.status] || [q.status, 'st-none'];
    const top = h('div', 'sendrow'); top.append(h('h2', '', `Request #${q.id}`), h('span', 'status ' + b[1], b[0]));
    card.append(top, h('p', 'note', names), h('p', 'note', `Updated ${new Date(q.updated_at).toLocaleString()}`));
    if (q.status === 'accepted') { const idx = STAGES.findIndex(s => s[0] === q.project_status), tl = h('ol', 'tl'); STAGES.forEach((s, i) => tl.append(h('li', i <= idx ? 'on' : '', s[1]))); card.append(tl); }
    if (q.pricing && q.plan) { const pl = q.pricing.plans[q.plan]; card.append(h('p', 'note', `${q.plan === 'subscription' ? 'Continue building with us' : 'Just build'}: ${inr(pl.total)}${q.plan === 'subscription' ? ` + ${inr(pl.monthly)} per month` : ''}`)); }
    const last = q.comments && q.comments[q.comments.length - 1]; if (last && last.author === 'admin') card.append(h('p', 'note', 'Apeiron: ' + last.message));
    const open = h('a', 'btn sm', q.status === 'draft' ? 'Continue this request' : 'Open'); open.href = `../start/?q=${q.id}`; card.append(open); wrap.append(card);
  }
  qbox.replaceChildren(wrap);
}
(async function () {
  const m = await api('/api/client/me'); if (!m.ok) { location.replace('../?signin=1'); return; }
  csrf = m.body.csrf; const out = h('button', 'btn sm', 'Log out'); $('#who').append(m.body.name || m.body.email, out);
  out.addEventListener('click', async () => { await api('/api/client/logout', {}); location.href = '../'; });
  const field = (label, val, max, ph) => { const i = document.createElement('input'); i.type = 'text'; i.maxLength = max; i.value = val || ''; i.placeholder = ph; i.setAttribute('aria-label', label); return i; };
  const nameIn = field('Your name', m.body.name, 100, 'Your name'), coIn = field('Company', m.body.company, 100, 'Company (optional)'), phIn = field('Phone', m.body.phone, 50, 'Phone (optional)');
  const save = h('button', 'btn sm', 'Save details'), msg = h('p', 'note'), prof = h('div', 'card'); save.type = 'button';
  save.addEventListener('click', async () => { if (!nameIn.value.trim()) { msg.textContent = 'Please enter your name.'; msg.className = 'note err'; return; } const r = await api('/api/client/profile', { name: nameIn.value, company: coIn.value, phone: phIn.value }, 'PATCH'); msg.textContent = r.ok ? 'Saved.' : (r.body.error || 'Could not save.'); msg.className = r.ok ? 'note ok' : 'note err'; });
  prof.append(h('h2', '', 'Profile'), h('p', 'note', 'Logged in as ' + m.body.email + '. You stay logged in on this device for 30 days.'), nameIn, coIn, phIn, h('div', 'nav', '', [h('span'), save]), msg);
  // delete account (right to erasure)
  const pw = document.createElement('input'); pw.type = 'password'; pw.autocomplete = 'current-password'; pw.placeholder = 'Your password to confirm'; pw.setAttribute('aria-label', 'Password to confirm deletion');
  const del = h('button', 'btn sm', 'Delete my account'), dm = h('p', 'note'), dz = h('div', 'card'); del.type = 'button';
  del.addEventListener('click', async () => { if (!pw.value) { dm.textContent = 'Enter your password first.'; dm.className = 'note err'; return; } if (!confirm('Delete your account and all your requests permanently? This cannot be undone.')) return; const r = await api('/api/client/account/delete', { password: pw.value }); if (r.ok) { location.href = '../'; return; } dm.textContent = r.body.error || 'Could not delete.'; dm.className = 'note err'; });
  dz.append(h('h2', '', 'Delete my account'), h('p', 'note', 'This removes your account and all your requests from our database. See our Privacy Policy for details.'), pw, h('div', 'nav', '', [h('span'), del]), dm);
  const legal = h('p', 'note', 'Read our '); const tl = h('a', '', 'Terms and Conditions'), pl = h('a', '', 'Privacy Policy'); tl.href = '../terms.html'; pl.href = '../privacy.html'; legal.append(tl, ' and ', pl, '.');
  qbox = h('div'); app.replaceChildren(h('p', 'mono', 'Your account'), h('h1', '', 'Profile and requests.'), prof, qbox, dz, legal);
  await load(); setInterval(() => { if (!document.hidden) load(); }, 8000);
})();
