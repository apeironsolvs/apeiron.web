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
  const show = on => {
    $('login').hidden = on; $('app').hidden = !on; $('out').hidden = !on;
    if ($('admin-settings-btn')) $('admin-settings-btn').hidden = !on;
    if (!on) {
      clearInterval(poll); $('who').textContent = '';
      if ($('m-pending')) $('m-pending').textContent = '0';
      if ($('m-accepted')) $('m-accepted').textContent = '0';
      if ($('m-total')) $('m-total').textContent = '0';
      if ($('m-messages')) $('m-messages').textContent = '0';
      const d = $('admin-settings-dialog'); if (d && d.open) d.close();
    }
  };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const NAMES = { frontend: 'Frontend', fullstack: 'Full stack', mobile: 'Mobile app', ai: 'AI', automation: 'Automation', cloud: 'Cloud', data: 'Data', custom: 'Custom' };
  const BADGE = { draft: ['Draft', 'b-draft'], submitted: ['Pending', 'b-pending'], negotiating: ['Pending', 'b-pending'], accepted: ['Accepted', 'b-accepted'], declined: ['Rejected', 'b-rejected'] };
  const STAGES = ['received', 'planning', 'building', 'review', 'delivered'];
  const STAGE_LABELS = { received: 'Received', planning: 'Planning', building: 'Building', review: 'Review', delivered: 'Delivered' };
  const when = t => new Date(t).toLocaleString();

  // ---------- project requests ----------
  const busy = () => { const a = document.activeElement; return a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && a.value; };
  async function loadQuotes(force) {
    if (!force && busy()) return;                       // do not wipe a reply someone is typing
    const r = await api('/api/admin/quotes'); if (r.status === 401) return show(false); if (!r.ok) return;
    const allQuotes = r.body.rows || [];
    const f = $('qf').value, rows = allQuotes.filter(q => !f || q.status === f || (f === 'submitted' && q.status === 'negotiating'));
    $('c-req').textContent = String(allQuotes.filter(q => q.status === 'submitted').length);

    // Update Executive Metrics Bar
    const pendingCount = allQuotes.filter(q => q.status === 'submitted' || q.status === 'negotiating').length;
    const acceptedCount = allQuotes.filter(q => q.status === 'accepted').length;
    if ($('m-pending')) $('m-pending').textContent = String(pendingCount);
    if ($('m-accepted')) $('m-accepted').textContent = String(acceptedCount);
    if ($('m-total')) $('m-total').textContent = String(allQuotes.length);

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
      for (const c of q.comments) {
        const m = el('div', 'msg ' + c.author);
        const authName = c.author === 'admin' ? 'Apeiron Operations' : 'Client';
        m.append(el('small', '', `${authName} · ${when(c.created_at)}`), document.createTextNode(c.message));
        thread.append(m);
      }
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

      // Project stage progression visualizer and controls
      const stage = el('div', 'stage');
      const stageHead = el('div', 'stage-head');
      stageHead.append(el('span', 'stage-title', 'PROJECT PROGRESSION PIPELINE'));

      const progress = el('div', 'stage-progress');
      const curStage = q.project_status || 'received';
      const curIdx = Math.max(0, STAGES.indexOf(curStage));

      const stepEls = [];
      STAGES.forEach((s, idx) => {
        const step = el('div', 'stage-step');
        if (idx < curIdx) step.classList.add('is-done');
        else if (idx === curIdx) step.classList.add('is-current');
        const dot = el('span', 'stage-dot');
        const lbl = el('span', 'stage-lbl', STAGE_LABELS[s]);
        step.append(dot, lbl);
        progress.append(step);
        stepEls.push(step);
      });

      const ctrlWrap = el('div', 'stage-controls');
      const ps = el('select'), sv = el('button', '', 'Save stage');
      ps.setAttribute('aria-label', 'Live project stage shown to the client');
      sv.type = 'button';
      for (const s of STAGES) {
        const o = el('option', '', 'Stage: ' + s);
        o.value = s;
        o.selected = s === q.project_status;
        ps.append(o);
      }

      ps.addEventListener('change', () => {
        const targetIdx = Math.max(0, STAGES.indexOf(ps.value));
        stepEls.forEach((st, i) => {
          st.className = 'stage-step';
          if (i < targetIdx) st.classList.add('is-done');
          else if (i === targetIdx) st.classList.add('is-current');
        });
      });

      sv.addEventListener('click', async () => {
        const x = await api('/api/admin/quotes/' + q.id, { method: 'PATCH', body: JSON.stringify({ project_status: ps.value }) });
        sv.textContent = x.ok ? 'Saved' : 'Failed';
        setTimeout(() => { sv.textContent = 'Save stage'; }, 2000);
      });

      ctrlWrap.append(ps, sv);
      stage.append(stageHead, progress, ctrlWrap);
      row.append(stage);
      box.append(row);
    }
  }

  // ---------- simple messages (support chat, contact) ----------
  async function loadMessages() {
    const p = new URLSearchParams({ q: $('q').value, status: $('st').value, limit: '50' });
    const r = await api('/api/admin/enquiries?' + p); if (r.status === 401) return show(false); if (!r.ok) return;
    const allEnquiries = r.body.rows || [];
    const newCount = allEnquiries.filter(e => e.status === 'new').length;
    $('c-msg').textContent = String(newCount);
    if ($('m-messages')) $('m-messages').textContent = String(newCount);

    const list = $('list'); list.replaceChildren();
    if (!allEnquiries.length) list.append(el('p', 'meta', 'No messages yet.'));
    for (const e of allEnquiries) {
      const row = el('article', 'row'), h = el('h3', '', e.name);
      if (e.source === 'support') h.append(el('span', 'badge b-info', 'support chat'));
      h.append(el('span', 'badge b-info', e.status));
      row.append(h, el('div', 'meta', `${e.email}${e.company ? ' · ' + e.company : ''}${e.phone ? ' · ' + e.phone : ''} · ${when(e.created_at)}`), el('p', 'idea', e.idea));
      const act = el('div', 'act'), sel = el('select'), notes = el('textarea'), save = el('button', '', 'Save'), del = el('button', '', 'Delete');
      for (const s of ['new', 'contacted', 'qualified', 'closed', 'spam']) { const o = el('option', '', s); o.value = s; o.selected = s === e.status; sel.append(o); }
      notes.value = e.notes; notes.placeholder = 'Private notes'; notes.maxLength = 2000; notes.setAttribute('aria-label', 'Notes'); save.type = del.type = 'button';
      save.addEventListener('click', async () => { const x = await api('/api/admin/enquiries/' + e.id, { method: 'PATCH', body: JSON.stringify({ status: sel.value, notes: notes.value }) }); save.textContent = x.ok ? 'Saved' : 'Failed'; if (x.ok) h.lastChild.textContent = sel.value; });
      del.addEventListener('click', async () => { if (confirm('Delete this message permanently?') && (await api('/api/admin/enquiries/' + e.id, { method: 'DELETE' })).ok) loadMessages(); });
      act.append(sel, notes, save, del); row.append(act); list.append(row);
    }
  }

  const loadAdminPrefs = () => { try { return JSON.parse(localStorage.getItem('apeiron_admin_prefs') || '{}'); } catch (_) { return {}; } };
  const saveAdminPrefs = p => { try { localStorage.setItem('apeiron_admin_prefs', JSON.stringify({ ...loadAdminPrefs(), ...p })); } catch (_) {} };
  const setPollRate = ms => {
    clearInterval(poll);
    if (ms > 0) {
      poll = setInterval(() => { if (!document.hidden) loadQuotes(false); }, ms);
    }
  };

  function enter(email) {
    $('who').textContent = email; show(true);
    const prefs = loadAdminPrefs();
    const rate = prefs.pollInterval !== undefined ? Number(prefs.pollInterval) : 15000;
    if (prefs.density === 'compact') $('app').classList.add('compact-density');
    else $('app').classList.remove('compact-density');

    setTimeout(() => { loadQuotes(true); loadMessages(); }, 50);
    setPollRate(rate);
  }

  // Admin settings dialog wiring
  const sBtn = $('admin-settings-btn'), sDlg = $('admin-settings-dialog'), sClose = $('admin-settings-close'), sSave = $('admin-settings-save');
  if (sBtn && sDlg) {
    sBtn.addEventListener('click', () => {
      const prefs = loadAdminPrefs();
      if ($('admin-who-static')) $('admin-who-static').textContent = $('who').textContent || 'Staff Administrator';
      if ($('admin-pref-poll')) $('admin-pref-poll').value = String(prefs.pollInterval !== undefined ? prefs.pollInterval : 15000);
      if ($('admin-pref-density')) $('admin-pref-density').value = prefs.density || 'standard';
      if ($('admin-pref-sound')) $('admin-pref-sound').checked = prefs.sound !== false;
      if ($('admin-settings-msg')) $('admin-settings-msg').textContent = '';
      if (typeof sDlg.showModal === 'function') sDlg.showModal(); else sDlg.setAttribute('open', '');
    });
    if (sClose) sClose.addEventListener('click', () => { if (typeof sDlg.close === 'function') sDlg.close(); else sDlg.removeAttribute('open'); });
    if (sSave) {
      sSave.addEventListener('click', () => {
        const rate = Number($('admin-pref-poll').value);
        const density = $('admin-pref-density').value;
        const sound = $('admin-pref-sound').checked;
        saveAdminPrefs({ pollInterval: rate, density, sound });
        setPollRate(rate);
        if (density === 'compact') $('app').classList.add('compact-density');
        else $('app').classList.remove('compact-density');
        if ($('admin-settings-msg')) {
          $('admin-settings-msg').textContent = 'Preferences saved.';
          setTimeout(() => { if (sDlg.open && typeof sDlg.close === 'function') sDlg.close(); }, 800);
        }
      });
    }
  }

  $('login').addEventListener('submit', async ev => {
    ev.preventDefault(); $('lerr').textContent = '';
    const btn = $('login').querySelector('button[type="submit"]') || $('login').querySelector('button.primary') || $('login').querySelector('button');
    if (btn) btn.disabled = true;
    const r = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ email: $('em').value, password: $('pw').value }) });
    if (btn) btn.disabled = false;
    $('pw').value = '';
    if (!r.ok) { $('lerr').textContent = r.status === 429 ? 'Too many attempts. Try again later.' : 'Invalid email or password.'; return; }
    csrf = r.body.csrf; enter(r.body.email);
  });
  $('out').addEventListener('click', async () => {
    await api('/api/admin/logout', { method: 'POST' });
    csrf = '';
    show(false);
    $('quotes').replaceChildren();
    $('list').replaceChildren();
  });
  const tab = which => {
    const req = which === 'req';
    $('t-req').setAttribute('aria-selected', String(req));
    $('t-msg').setAttribute('aria-selected', String(!req));
    $('p-req').hidden = !req;
    $('p-msg').hidden = req;
  };
  $('t-req').addEventListener('click', () => tab('req')); $('t-msg').addEventListener('click', () => tab('msg'));
  $('qf').addEventListener('change', () => loadQuotes(true));
  for (const id of ['q', 'st']) $(id).addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(loadMessages, 250); });
  (async () => { const r = await api('/api/admin/me'); if (r.ok) { csrf = r.body.csrf; enter(r.body.email); } })();
})();
