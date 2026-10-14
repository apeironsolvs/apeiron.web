// Admin website. All server text is written with textContent (never innerHTML), so a malicious message cannot run script here.
(() => {
  const $ = id => document.getElementById(id);
  let csrf = '', timer = null, poll = null;
  const api = async (path, opt = {}) => {
    const mut = opt.method && opt.method !== 'GET';
    try {
      const r = await fetch(path, { credentials: 'same-origin', ...opt, headers: { 'Content-Type': 'application/json', ...(mut ? { 'X-CSRF-Token': csrf } : {}), ...opt.headers } });
      let body = null; try { body = await r.json(); } catch (_) { /* not json */ }
      return { ok: r.ok, status: r.status, body };
    } catch (_) { return { ok: false, status: 0, body: null }; }
  };
  const el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x !== undefined) e.textContent = x; return e; };
  const show = on => { $('login').hidden = on; $('app').hidden = !on; $('out').hidden = !on; if (!on) { clearInterval(poll); $('who').textContent = ''; } };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const NAMES = { frontend: 'Frontend', fullstack: 'Full stack', mobile: 'Mobile app', ai: 'AI', automation: 'Automation', cloud: 'Cloud', data: 'Data', custom: 'Custom' };
  const BADGE = { draft: ['Draft', 'b-draft'], submitted: ['Pending', 'b-pending'], negotiating: ['Pending', 'b-pending'], accepted: ['Accepted', 'b-accepted'], declined: ['Rejected', 'b-rejected'] };
  const when = t => new Date(t).toLocaleString();

  // ---------- project requests ----------
  const busy = () => { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && a.value; };
  async function loadQuotes(force) {
    if (!force && busy()) return;                       // do not wipe a reply someone is typing
    const r = await api('/api/admin/quotes'); if (r.status === 401) return show(false); if (!r.ok) return;
    const f = $('qf').value, rows = r.body.rows.filter(q => !f || q.status === f || (f === 'submitted' && q.status === 'negotiating'));
    $('c-req').textContent = String(r.body.rows.filter(q => q.status === 'submitted').length);
    const box = $('quotes'); box.replaceChildren();
    if (!rows.length) box.append(el('p', 'meta', 'No requests here yet.'));
    for (const q of rows) {
      const row = el('article', 'row'), h = el('h3', '', `#${q.id} · ${q.name || q.email}`), bd = BADGE[q.status] || [q.status, 'b-info'], badge = el('span', 'badge ' + bd[1], bd[0]); h.append(badge);
      const facts = el('div', 'facts');
      const line = (k, v) => { const d = el('div'); d.append(el('b', '', k + ': '), document.createTextNode(v)); facts.append(d); };
      line('Client', `${q.email}${q.company ? ' · ' + q.company : ''}${q.phone ? ' · ' + q.phone : ''}`);
      line('Wants', q.services.map(s => NAMES[s] || s).join(', ') || 'nothing chosen yet');
      if (q.pricing) line('Estimate', inr(q.pricing.subtotal));
      if (q.plan) line('Plan', `${q.plan === 'subscription' ? 'Build and keep improving' : 'Build only'}: ${inr(q.build_total)}${q.monthly ? ' + ' + inr(q.monthly) + ' per month' : ''}`);
      line('Received', when(q.created_at));
      const thread = el('div', 'thread');
      for (const c of q.comments) { const m = el('div', 'msg ' + c.author); m.append(el('small', '', `${c.author === 'admin' ? 'You' : 'Client'} · ${when(c.created_at)}`), document.createTextNode(c.message)); thread.append(m); }
      row.append(h, facts, el('p', 'idea', q.idea), thread);
      const reply = el('textarea'); reply.maxLength = 1000; reply.placeholder = 'Reply to the client, or add a note to your decision'; reply.setAttribute('aria-label', 'Message to the client');
      const send = el('button', '', 'Send reply'), ok = el('button', 'approve', 'Approve'), no = el('button', 'reject', 'Reject'), msg = el('span', 'meta');
      send.type = ok.type = no.type = 'button';
      const post = async (path, body, label) => { [send, ok, no].forEach(b => { b.disabled = true; }); const x = await api(path, { method: 'POST', body: JSON.stringify(body) }); msg.textContent = x.ok ? label : ((x.body && x.body.error) || 'Failed'); if (x.ok) loadQuotes(true); else [send, ok, no].forEach(b => { b.disabled = false; }); };
      send.addEventListener('click', () => { if (reply.value.trim().length < 2) { msg.textContent = 'Write a reply first.'; return; } post(`/api/admin/quotes/${q.id}/comments`, { message: reply.value }, 'Reply sent'); });
      ok.addEventListener('click', () => { if (confirm(`Approve request #${q.id}? The client will see "Accepted" in green and be emailed.`)) post(`/api/admin/quotes/${q.id}/decision`, { decision: 'accept', message: reply.value }, 'Approved'); });
      no.addEventListener('click', () => { if (confirm(`Reject request #${q.id}? The client will be told.`)) post(`/api/admin/quotes/${q.id}/decision`, { decision: 'reject', message: reply.value }, 'Rejected'); });
      if (q.status === 'accepted') ok.disabled = true; if (q.status === 'declined') no.disabled = true; if (q.status === 'draft') { ok.disabled = no.disabled = true; }
      const act = el('div', 'act'); act.append(reply, send, ok, no); row.append(act, msg);
      const stage = el('div', 'stage'), ps = el('select'), sv = el('button', '', 'Save stage'); ps.setAttribute('aria-label', 'Live project stage shown to the client'); sv.type = 'button';
      for (const s of ['received', 'planning', 'building', 'review', 'delivered']) { const o = el('option', '', 'Stage: ' + s); o.value = s; o.selected = s === q.project_status; ps.append(o); }
      sv.addEventListener('click', async () => { const x = await api('/api/admin/quotes/' + q.id, { method: 'PATCH', body: JSON.stringify({ project_status: ps.value }) }); sv.textContent = x.ok ? 'Saved' : 'Failed'; });
      stage.append(ps, sv); row.append(stage); box.append(row);
    }
  }

  // ---------- simple messages (support chat, contact) ----------
  async function loadMessages() {
    const p = new URLSearchParams({ q: $('q').value, status: $('st').value, limit: '50' });
    const r = await api('/api/admin/enquiries?' + p); if (r.status === 401) return show(false); if (!r.ok) return;
    $('c-msg').textContent = String(r.body.rows.filter(e => e.status === 'new').length);
    const list = $('list'); list.replaceChildren();
    if (!r.body.rows.length) list.append(el('p', 'meta', 'No messages yet.'));
    for (const e of r.body.rows) {
      const row = el('article', 'row'), h = el('h3', '', e.name); if (e.source === 'support') h.append(el('span', 'badge b-info', 'support chat')); h.append(el('span', 'badge b-info', e.status));
      row.append(h, el('div', 'meta', `${e.email}${e.company ? ' · ' + e.company : ''}${e.phone ? ' · ' + e.phone : ''} · ${when(e.created_at)}`), el('p', 'idea', e.idea));
      const act = el('div', 'act'), sel = el('select'), notes = el('textarea'), save = el('button', '', 'Save'), del = el('button', '', 'Delete');
      for (const s of ['new', 'contacted', 'qualified', 'closed', 'spam']) { const o = el('option', '', s); o.value = s; o.selected = s === e.status; sel.append(o); }
      notes.value = e.notes; notes.placeholder = 'Private notes'; notes.maxLength = 2000; notes.setAttribute('aria-label', 'Notes'); save.type = del.type = 'button';
      save.addEventListener('click', async () => { const x = await api('/api/admin/enquiries/' + e.id, { method: 'PATCH', body: JSON.stringify({ status: sel.value, notes: notes.value }) }); save.textContent = x.ok ? 'Saved' : 'Failed'; if (x.ok) h.lastChild.textContent = sel.value; });
      del.addEventListener('click', async () => { if (confirm('Delete this message permanently?') && (await api('/api/admin/enquiries/' + e.id, { method: 'DELETE' })).ok) loadMessages(); });
      act.append(sel, notes, save, del); row.append(act); list.append(row);
    }
  }

  function enter(email) {
    $('who').textContent = email; show(true); loadQuotes(true); loadMessages();
    clearInterval(poll); poll = setInterval(() => { if (!document.hidden) { loadQuotes(false); } }, 15000);
  }
  $('login').addEventListener('submit', async ev => {
    ev.preventDefault(); $('lerr').textContent = '';
    const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: $('em').value, password: $('pw').value }) });
    $('pw').value = '';
    if (!r.ok) { $('lerr').textContent = r.status === 429 ? 'Too many attempts. Try again later.' : 'Invalid email or password.'; return; }
    csrf = r.body.csrf; enter(r.body.email);
  });
  $('out').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }); csrf = ''; show(false); $('quotes').replaceChildren(); $('list').replaceChildren(); });
  const tab = which => { const req = which === 'req'; $('t-req').setAttribute('aria-selected', String(req)); $('t-msg').setAttribute('aria-selected', String(!req)); $('p-req').hidden = !req; $('p-msg').hidden = req; };
  $('t-req').addEventListener('click', () => tab('req')); $('t-msg').addEventListener('click', () => tab('msg'));
  $('qf').addEventListener('change', () => loadQuotes(true));
  for (const id of ['q', 'st']) $(id).addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadMessages, 250); });
  (async () => { const r = await api('/api/admin/me'); if (r.ok) { csrf = r.body.csrf; enter(r.body.email); } })();
})();
