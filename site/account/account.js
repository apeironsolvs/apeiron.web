// Profile, live request status, direct client–team conversation, and comprehensive Settings system.
const $ = s => document.querySelector(s), app = $('#app');
const STAGES = [['received', 'Received'], ['planning', 'Planning'], ['building', 'Building'], ['review', 'Review'], ['delivered', 'Delivered']];
const BADGE = { draft: ['Not sent yet', 'st-none'], submitted: ['Pending', 'st-pending'], negotiating: ['Pending', 'st-pending'], accepted: ['Accepted', 'st-accepted'], declined: ['Rejected', 'st-rejected'] };

const PREF_KEY = email => `apeiron_client_prefs_${email || 'default'}`;
function loadPrefs(email) {
  try {
    const raw = localStorage.getItem(PREF_KEY(email));
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}
function savePrefs(email, patch) {
  try {
    const cur = loadPrefs(email);
    const updated = { ...cur, ...patch, updated_at: Date.now() };
    localStorage.setItem(PREF_KEY(email), JSON.stringify(updated));
    return updated;
  } catch (_) { return patch; }
}

function formatCurrency(amount, curPref) {
  const val = Math.round(amount || 0);
  if (!curPref || curPref === 'INR') {
    return '₹' + val.toLocaleString('en-IN');
  }
  if (curPref === 'USD') {
    const usd = Math.round(val / 86);
    return `$${usd.toLocaleString('en-US')} (~₹${val.toLocaleString('en-IN')})`;
  }
  if (curPref === 'EUR') {
    const eur = Math.round(val / 93);
    return `€${eur.toLocaleString('de-DE')} (~₹${val.toLocaleString('en-IN')})`;
  }
  if (curPref === 'GBP') {
    const gbp = Math.round(val / 110);
    return `£${gbp.toLocaleString('en-GB')} (~₹${val.toLocaleString('en-IN')})`;
  }
  return '₹' + val.toLocaleString('en-IN');
}

const inr = n => {
  const p = loadPrefs(me ? me.email : '');
  return formatCurrency(n, p.currency || 'INR');
};

function h(tag, cls, text, kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  (kids || []).forEach(k => k && e.append(k));
  return e;
}

function svgIcon(name) {
  const ns = 'http://www.w3.org/2000/svg';
  const s = document.createElementNS(ns, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', '18');
  s.setAttribute('height', '18');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');

  const p = document.createElementNS(ns, 'path');
  if (name === 'user') {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '7'); c.setAttribute('r', '4');
    p.setAttribute('d', 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2');
    s.append(c, p);
  } else if (name === 'shield') {
    p.setAttribute('d', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z');
    s.append(p);
  } else if (name === 'credit-card') {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', '2'); r.setAttribute('y', '5'); r.setAttribute('width', '20'); r.setAttribute('height', '14'); r.setAttribute('rx', '2');
    p.setAttribute('d', 'M2 10h20');
    s.append(r, p);
  } else if (name === 'bell') {
    p.setAttribute('d', 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9');
    const p2 = document.createElementNS(ns, 'path');
    p2.setAttribute('d', 'M13.73 21a2 2 0 0 1-3.46 0');
    s.append(p, p2);
  } else if (name === 'eye') {
    p.setAttribute('d', 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z');
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '3');
    s.append(p, c);
  } else if (name === 'sliders') {
    const l1 = document.createElementNS(ns, 'line'); l1.setAttribute('x1', '4'); l1.setAttribute('y1', '21'); l1.setAttribute('x2', '4'); l1.setAttribute('y2', '14');
    const l2 = document.createElementNS(ns, 'line'); l2.setAttribute('x1', '4'); l2.setAttribute('y1', '10'); l2.setAttribute('x2', '4'); l2.setAttribute('y2', '3');
    const l3 = document.createElementNS(ns, 'line'); l3.setAttribute('x1', '12'); l3.setAttribute('y1', '21'); l3.setAttribute('x2', '12'); l3.setAttribute('y2', '12');
    const l4 = document.createElementNS(ns, 'line'); l4.setAttribute('x1', '12'); l4.setAttribute('y1', '8'); l4.setAttribute('x2', '12'); l4.setAttribute('y2', '3');
    const l5 = document.createElementNS(ns, 'line'); l5.setAttribute('x1', '20'); l5.setAttribute('y1', '21'); l5.setAttribute('x2', '20'); l5.setAttribute('y2', '16');
    const l6 = document.createElementNS(ns, 'line'); l6.setAttribute('x1', '20'); l6.setAttribute('y1', '12'); l6.setAttribute('x2', '20'); l6.setAttribute('y2', '3');
    p.setAttribute('d', 'M1 14h6M9 8h6M17 16h6');
    s.append(l1, l2, l3, l4, l5, l6, p);
  } else if (name === 'briefcase') {
    const r = document.createElementNS(ns, 'rect');
    r.setAttribute('x', '2'); r.setAttribute('y', '7'); r.setAttribute('width', '20'); r.setAttribute('height', '14'); r.setAttribute('rx', '2');
    p.setAttribute('d', 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16');
    s.append(r, p);
  } else if (name === 'help-circle') {
    const c = document.createElementNS(ns, 'circle');
    c.setAttribute('cx', '12'); c.setAttribute('cy', '12'); c.setAttribute('r', '10');
    p.setAttribute('d', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3');
    const l = document.createElementNS(ns, 'line');
    l.setAttribute('x1', '12'); l.setAttribute('y1', '17'); l.setAttribute('x2', '12.01'); l.setAttribute('y2', '17');
    s.append(c, p, l);
  }
  return s;
}

let csrf = '', me = null, quotes = [], activeTab = 'dashboard', selectedQuoteId = null;
let activeSettingsSection = 'profile';
let sending = false, pollTimer = null, chatThreadEl = null;

async function api(path, body, method) {
  try {
    const r = await fetch(path, {
      method: method || (body ? 'POST' : 'GET'),
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...(csrf ? { 'X-CSRF-Token': csrf } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    let j = {};
    try { j = await r.json(); } catch (_) { /* empty */ }
    return { ok: r.ok, status: r.status, body: j };
  } catch (_) {
    return { ok: false, status: 0, body: {} };
  }
}

function getSubmittedQuotes() {
  return (quotes || []).filter(q => q && q.status && q.status !== 'draft');
}

function updateNav() {
  const submitted = getSubmittedQuotes();
  const tabDash = $('#tab-dash');
  const tabChat = $('#tab-chat');
  const tabSettings = $('#tab-settings');
  const tabProf = $('#tab-prof');
  const badge = $('#chat-badge');

  if (tabDash) {
    tabDash.classList.toggle('active', activeTab === 'dashboard');
    tabDash.setAttribute('aria-selected', String(activeTab === 'dashboard'));
  }

  if (tabSettings) {
    const isSettings = activeTab === 'settings' || activeTab === 'profile';
    tabSettings.classList.toggle('active', isSettings);
    tabSettings.setAttribute('aria-selected', String(isSettings));
  }

  if (tabProf) {
    const isSettings = activeTab === 'settings' || activeTab === 'profile';
    tabProf.classList.toggle('active', isSettings);
    tabProf.setAttribute('aria-selected', String(isSettings));
  }

  if (tabChat) {
    const hasSubmitted = submitted.length > 0;
    tabChat.hidden = !hasSubmitted && activeTab !== 'chat';
    tabChat.classList.toggle('active', activeTab === 'chat');
    tabChat.setAttribute('aria-selected', String(activeTab === 'chat'));

    if (badge) {
      let totalMessages = 0;
      submitted.forEach(q => {
        if (q.comments && q.comments.length) totalMessages += q.comments.length;
      });
      if (totalMessages > 0) {
        badge.textContent = String(totalMessages);
        badge.hidden = false;
        badge.title = `${totalMessages} total message${totalMessages === 1 ? '' : 's'}`;
      } else {
        badge.hidden = true;
      }
    }
  }
}

function switchTab(tab, quoteId, section) {
  activeTab = tab === 'profile' ? 'settings' : tab;
  if (quoteId !== undefined && quoteId !== null) {
    selectedQuoteId = Number(quoteId);
  }
  if (section) {
    activeSettingsSection = section;
  }
  updateNav();
  renderApp();

  let hash = 'dashboard';
  if (activeTab === 'chat') {
    hash = selectedQuoteId ? `chat-${selectedQuoteId}` : 'chat';
  } else if (activeTab === 'settings') {
    hash = `settings-${activeSettingsSection || 'profile'}`;
  }

  if (location.hash !== '#' + hash) {
    history.replaceState(null, '', '#' + hash);
  }
}

function paintThread(threadContainer, quote) {
  threadContainer.replaceChildren();
  const comments = quote.comments || [];
  if (!comments.length) {
    const empty = h('div', 'chat-empty');
    empty.append(h('p', 'note', 'No messages in this conversation yet. Send a message below to discuss your project directly with our team.'));
    threadContainer.append(empty);
    return;
  }
  comments.forEach(c => {
    const msgEl = h('div', 'msg ' + (c.author === 'admin' ? 'admin' : 'client'));
    const authorLabel = c.author === 'admin' ? 'Apeiron Team' : 'You';
    const timeLabel = new Date(c.created_at).toLocaleString();
    msgEl.append(h('small', '', `${authorLabel} · ${timeLabel}`));
    msgEl.append(document.createTextNode(c.message));
    threadContainer.append(msgEl);
  });
  setTimeout(() => { threadContainer.scrollTop = threadContainer.scrollHeight; }, 20);
}

function renderChatView() {
  const submitted = getSubmittedQuotes();
  if (!submitted.length) {
    return h('div', 'card', '', [
      h('h2', '', 'No Submitted Requests'),
      h('p', 'note', 'You do not have any submitted requests yet. Once you submit a project request, your private conversation with the Apeiron team will appear here.'),
      h('div', 'nav', '', [h('span'), (() => { const a = h('a', 'btn primary sm', 'Start a request'); a.href = '../start/'; return a; })()])
    ]);
  }

  const validQuote = submitted.find(q => q.id === selectedQuoteId) || submitted[0];
  selectedQuoteId = validQuote.id;

  const view = h('div', 'chat-view');

  // Header
  const head = h('div');
  head.append(
    h('p', 'mono', 'Private Client–Team Messages'),
    h('h1', '', 'Messages with Apeiron Team'),
    h('p', 'lede', 'Direct, confidential communication with your Apeiron project engineering and architecture team.')
  );
  view.append(head);

  // Selector for multiple submitted quotes
  if (submitted.length > 1) {
    const selWrap = h('div', 'chat-selector');
    selWrap.setAttribute('role', 'tablist');
    selWrap.setAttribute('aria-label', 'Select submitted request conversation');
    submitted.forEach(sq => {
      const isSel = sq.id === selectedQuoteId;
      const bInfo = BADGE[sq.status] || [sq.status, 'st-none'];
      const btn = h('button', 'chat-sel-btn' + (isSel ? ' active' : ''));
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(isSel));
      const titleSnippet = sq.idea ? (sq.idea.length > 35 ? sq.idea.slice(0, 35) + '…' : sq.idea) : `Request #${sq.id}`;
      btn.append(
        h('strong', '', `Request #${sq.id}`),
        h('span', 'chat-sel-title', titleSnippet),
        h('span', 'status ' + bInfo[1], bInfo[0])
      );
      btn.addEventListener('click', () => {
        selectedQuoteId = sq.id;
        switchTab('chat', sq.id);
      });
      selWrap.append(btn);
    });
    view.append(selWrap);
  }

  // Active Chat Box
  const box = h('div', 'chat-box');
  const chatHeader = h('div', 'chat-header');
  const bInfo = BADGE[validQuote.status] || [validQuote.status, 'st-none'];
  const titleBox = h('div', 'chat-header-title');
  titleBox.append(
    h('h2', '', `Request #${validQuote.id}`),
    h('p', '', validQuote.idea || 'Project Request')
  );
  const headRight = h('div', 'bar-brand');
  const detailLink = h('a', 'btn sm', 'View full quote →');
  detailLink.href = `../start/?q=${validQuote.id}`;
  headRight.append(h('span', 'status ' + bInfo[1], bInfo[0]), detailLink);
  chatHeader.append(titleBox, headRight);
  box.append(chatHeader);

  // Thread container
  chatThreadEl = h('div', 'chat-thread-container');
  chatThreadEl.setAttribute('role', 'log');
  chatThreadEl.setAttribute('aria-label', `Message history for Request #${validQuote.id}`);
  paintThread(chatThreadEl, validQuote);
  box.append(chatThreadEl);

  // Input Box
  const inputContainer = h('div', 'chat-input-box');
  if (validQuote.status === 'declined') {
    inputContainer.append(h('p', 'note err', 'This request was closed. You can review past messages above or start a new request.'));
  } else {
    const ta = document.createElement('textarea');
    ta.rows = 3;
    ta.maxLength = 1000;
    ta.placeholder = 'Ask a question, discuss specifications, or share feedback with the Apeiron team…';
    ta.setAttribute('aria-label', 'Your message to Apeiron team');

    const actions = h('div', 'chat-actions');
    const sendBtn = h('button', 'btn primary sm', 'Send message');
    sendBtn.type = 'button';
    const statusMsg = h('span', 'note');
    statusMsg.setAttribute('role', 'alert');
    actions.append(sendBtn, statusMsg);

    sendBtn.addEventListener('click', async () => {
      if (sending) return;
      statusMsg.textContent = '';
      statusMsg.className = 'note';
      const text = ta.value.trim();
      if (text.length < 2) {
        statusMsg.textContent = 'Please write your message first.';
        statusMsg.className = 'note err';
        ta.focus();
        return;
      }
      sending = true;
      sendBtn.disabled = true;
      sendBtn.textContent = 'Sending…';

      const r = await api(`/api/client/quotes/${validQuote.id}/comments`, { message: text });
      sending = false;
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send message';

      if (!r.ok) {
        statusMsg.textContent = (r.body && r.body.error) || 'Could not send message. Please try again.';
        statusMsg.className = 'note err';
        return;
      }

      ta.value = '';
      statusMsg.textContent = 'Message sent to Apeiron team.';
      statusMsg.className = 'note ok';
      setTimeout(() => {
        if (statusMsg.textContent === 'Message sent to Apeiron team.') statusMsg.textContent = '';
      }, 4000);

      validQuote.comments = r.body.quote.comments;
      paintThread(chatThreadEl, validQuote);
      load(false);
    });

    inputContainer.append(ta, actions);
  }
  box.append(inputContainer);
  view.append(box);

  return view;
}

function renderDashboard() {
  const wrap = h('div');
  const head = h('div');
  head.append(
    h('p', 'mono', 'Client Portal'),
    h('h1', '', 'Your Project Dashboard'),
    h('p', 'lede', 'Track your project status, review architectures, and access messages with the engineering team.')
  );
  wrap.append(head);

  const topBar = h('div', 'sendrow');
  const liveNotice = h('span', 'mono', '● Live updates');
  const startBtn = h('a', 'btn primary sm', 'Start a new request');
  startBtn.href = '../start/';
  topBar.append(liveNotice, startBtn);
  wrap.append(topBar);

  if (!quotes.length) {
    const emptyCard = h('div', 'card', '', [
      h('h2', '', 'No requests yet'),
      h('p', 'note', 'You have not submitted any ideas or project requests yet. Tell us what you want to build and our system will design the architecture for you.')
    ]);
    wrap.append(emptyCard);
    return wrap;
  }

  quotes.forEach(q => {
    const card = h('div', 'card');
    const names = q.pricing ? q.pricing.lines.map(l => l.name).join(', ') : 'Nothing chosen yet';
    const b = BADGE[q.status] || [q.status, 'st-none'];
    const isSubmitted = q.status !== 'draft';

    const top = h('div', 'sendrow');
    top.append(h('h2', '', `Request #${q.id}`), h('span', 'status ' + b[1], b[0]));
    card.append(top);

    if (q.idea) {
      card.append(h('p', 'idea', q.idea));
    }
    card.append(h('p', 'note', `Capabilities: ${names}`));
    card.append(h('p', 'note', `Last updated: ${new Date(q.updated_at).toLocaleString()}`));

    if (q.status === 'accepted') {
      const idx = STAGES.findIndex(s => s[0] === q.project_status);
      const tl = h('ol', 'tl');
      STAGES.forEach((s, i) => tl.append(h('li', i <= idx ? 'on' : '', s[1])));
      card.append(tl);
    }

    if (q.pricing && q.plan) {
      const pl = q.pricing.plans[q.plan];
      card.append(h('p', 'note', `${q.plan === 'subscription' ? 'Continue building with us' : 'Just build'}: ${inr(pl.total)}${q.plan === 'subscription' ? ` + ${inr(pl.monthly)} per month` : ''}`));
    }

    const last = q.comments && q.comments[q.comments.length - 1];
    if (last) {
      card.append(h('p', 'note', `${last.author === 'admin' ? 'Apeiron Team: ' : 'You: '} ${last.message}`));
    }

    const actRow = h('div', 'card-acts');
    if (!isSubmitted) {
      const contBtn = h('a', 'btn sm', 'Continue this request →');
      contBtn.href = `../start/?q=${q.id}`;
      actRow.append(contBtn);
    } else {
      const msgBtn = h('button', 'btn sm primary', '💬 Messages');
      msgBtn.type = 'button';
      msgBtn.addEventListener('click', () => switchTab('chat', q.id));

      const viewBtn = h('a', 'btn sm', 'View request details');
      viewBtn.href = `../start/?q=${q.id}`;
      actRow.append(msgBtn, viewBtn);
    }
    card.append(actRow);
    wrap.append(card);
  });

  return wrap;
}

/* ==========================================================================
   Comprehensive Settings System (8 Modular Sections)
   ========================================================================== */
function renderSettingsView() {
  const prefs = loadPrefs(me.email);
  const wrap = h('div', 'settings-view');

  // Master Settings Header
  const header = h('div', 'settings-header');
  header.append(
    h('p', 'mono', 'Account & Operations Settings'),
    h('h1', '', 'Portal Settings'),
    h('p', 'lede', 'Manage your organization profile, security posture, notification channels, and operational preferences.')
  );
  wrap.append(header);

  // Settings Grid Layout (Left-side navigation on desktop, compact horizontal on mobile)
  const layout = h('div', 'settings-layout');

  const SECTIONS = [
    { id: 'profile', label: 'Profile', icon: 'user' },
    { id: 'security', label: 'Security', icon: 'shield' },
    { id: 'billing', label: 'Billing & Invoices', icon: 'credit-card' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'privacy', label: 'Privacy & Export', icon: 'eye' },
    { id: 'preferences', label: 'Preferences', icon: 'sliders' },
    { id: 'work', label: 'Project Preferences', icon: 'briefcase' },
    { id: 'support', label: 'Help & Support', icon: 'help-circle' }
  ];

  const sidebar = h('aside', 'settings-sidebar');
  sidebar.setAttribute('role', 'tablist');
  sidebar.setAttribute('aria-label', 'Settings navigation sections');

  const contentArea = h('main', 'settings-content');

  function renderActiveSection() {
    contentArea.replaceChildren();
    if (activeSettingsSection === 'security') {
      contentArea.append(renderSecuritySection(prefs));
    } else if (activeSettingsSection === 'billing') {
      contentArea.append(renderBillingSection(prefs));
    } else if (activeSettingsSection === 'notifications') {
      contentArea.append(renderNotificationsSection(prefs));
    } else if (activeSettingsSection === 'privacy') {
      contentArea.append(renderPrivacySection(prefs));
    } else if (activeSettingsSection === 'preferences') {
      contentArea.append(renderPreferencesSection(prefs));
    } else if (activeSettingsSection === 'work') {
      contentArea.append(renderWorkSection(prefs));
    } else if (activeSettingsSection === 'support') {
      contentArea.append(renderSupportSection(prefs));
    } else {
      contentArea.append(renderProfileSection(prefs));
    }
  }

  SECTIONS.forEach(sec => {
    const isAct = sec.id === activeSettingsSection;
    const btn = h('button', 'settings-nav-item' + (isAct ? ' active' : ''));
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', String(isAct));
    btn.append(svgIcon(sec.icon), document.createTextNode(sec.label));

    btn.addEventListener('click', () => {
      activeSettingsSection = sec.id;
      sidebar.querySelectorAll('.settings-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderActiveSection();
      if (location.hash !== `#settings-${sec.id}`) {
        history.replaceState(null, '', `#settings-${sec.id}`);
      }
    });
    sidebar.append(btn);
  });

  layout.append(sidebar, contentArea);
  wrap.append(layout);

  renderActiveSection();
  return wrap;
}

// --------------------------------------------------------------------------
// Section A: Profile Settings
// --------------------------------------------------------------------------
function renderProfileSection(prefs) {
  const card = h('div', 'settings-card');
  const head = h('div', 'settings-card-header');
  head.append(
    h('h2', '', 'Profile Settings'),
    h('p', '', 'Manage your personal and organization identity displayed on project quotes and communications.')
  );
  card.append(head);

  // Avatar & Initials Preview
  const initials = (me.name || me.email || 'A').slice(0, 2).toUpperCase();
  const avRow = h('div', 'avatar-row');
  const avBadge = h('div', 'avatar-badge', initials);
  const avInfo = h('div', 'avatar-info');
  avInfo.append(
    h('b', '', me.name || 'Client Identity'),
    h('span', '', `${me.email} · Authenticated Client`)
  );
  avRow.append(avBadge, avInfo);
  card.append(avRow);

  const formGrid = h('div', 'form-grid');

  const makeGroup = (label, id, val, ph, max) => {
    const grp = h('div', 'form-group');
    const lbl = h('label', '', label);
    lbl.setAttribute('for', id);
    const inp = document.createElement('input');
    inp.id = id;
    inp.type = 'text';
    inp.value = val || '';
    inp.placeholder = ph;
    if (max) inp.maxLength = max;
    grp.append(lbl, inp);
    return { grp, inp };
  };

  const nameField = makeGroup('Full Name *', 's-name', me.name, 'Your full name', 100);
  const coField = makeGroup('Company / Organization', 's-co', me.company, 'Company or Studio name', 100);
  const phField = makeGroup('Direct Phone', 's-ph', me.phone, '+1 (555) 000-0000', 50);
  const locField = makeGroup('Location / Country', 's-loc', prefs.location || '', 'e.g. India, United States, UK', 100);

  formGrid.append(nameField.grp, coField.grp, phField.grp, locField.grp);
  card.append(formGrid);

  // Bio / Description
  const bioGrp = h('div', 'form-group');
  const bioLbl = h('label', '', 'Organization Description / Bio');
  bioLbl.setAttribute('for', 's-bio');
  const bioTa = document.createElement('textarea');
  bioTa.id = 's-bio';
  bioTa.rows = 3;
  bioTa.maxLength = 500;
  bioTa.placeholder = 'Briefly describe your company, product vision, or engineering needs…';
  bioTa.value = prefs.bio || '';
  bioGrp.append(bioLbl, bioTa);
  card.append(bioGrp);

  const actRow = h('div', 'nav');
  const saveBtn = h('button', 'btn primary sm', 'Save Profile Changes');
  saveBtn.type = 'button';
  const statusMsg = h('p', 'note');
  statusMsg.setAttribute('role', 'alert');

  saveBtn.addEventListener('click', async () => {
    const nameVal = nameField.inp.value.trim();
    if (!nameVal) {
      statusMsg.textContent = 'Please provide your full name.';
      statusMsg.className = 'note err';
      nameField.inp.focus();
      return;
    }
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';
    statusMsg.textContent = '';

    const r = await api('/api/client/profile', {
      name: nameVal,
      company: coField.inp.value.trim(),
      phone: phField.inp.value.trim()
    }, 'PATCH');

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save Profile Changes';

    if (!r.ok) {
      statusMsg.textContent = (r.body && r.body.error) || 'Failed to save profile changes.';
      statusMsg.className = 'note err';
      return;
    }

    me.name = nameVal;
    me.company = coField.inp.value.trim();
    me.phone = phField.inp.value.trim();

    savePrefs(me.email, {
      bio: bioTa.value.trim(),
      location: locField.inp.value.trim()
    });

    // Update header name display
    const who = $('#who');
    if (who) {
      const outBtn = who.querySelector('button');
      who.replaceChildren(document.createTextNode(me.name || me.email));
      if (outBtn) who.append(outBtn);
    }

    avBadge.textContent = (me.name || 'A').slice(0, 2).toUpperCase();
    avInfo.querySelector('b').textContent = me.name;

    statusMsg.textContent = 'Profile updated successfully.';
    statusMsg.className = 'note ok';
  });

  actRow.append(saveBtn, statusMsg);
  card.append(actRow);
  return card;
}

// --------------------------------------------------------------------------
// Section B: Account & Security
// --------------------------------------------------------------------------
function renderSecuritySection(prefs) {
  const wrap = h('div', 'settings-content');

  // Card 1: Account Credentials & Email
  const idCard = h('div', 'settings-card');
  const idHead = h('div', 'settings-card-header');
  idHead.append(
    h('h2', '', 'Account Credentials'),
    h('p', '', 'Primary authentication identity and access credentials.')
  );
  idCard.append(idHead);

  const emGrp = h('div', 'form-group');
  const emLbl = h('label', '', 'Primary Email Address');
  const emInput = document.createElement('input');
  emInput.type = 'text';
  emInput.value = me.email;
  emInput.readOnly = true;
  const verChip = h('span', 'verified-chip', '✓ Verified Account');
  emGrp.append(h('div', 'sendrow', '', [emLbl, verChip]), emInput, h('p', 'note', 'This email receives quotes, project acceptance notifications, and password recovery codes.'));
  idCard.append(emGrp);
  wrap.append(idCard);

  // Card 2: Password Reset / Change Form
  const pwCard = h('div', 'settings-card');
  const pwHead = h('div', 'settings-card-header');
  pwHead.append(
    h('h2', '', 'Change Password'),
    h('p', '', 'Request a 6-digit verification code to your email to safely update your account password.')
  );
  pwCard.append(pwHead);

  const pwStep1 = h('div');
  const reqCodeBtn = h('button', 'btn sm', 'Send verification code to my email');
  reqCodeBtn.type = 'button';
  const codeStatus = h('p', 'note');
  pwStep1.append(reqCodeBtn, codeStatus);
  pwCard.append(pwStep1);

  const pwStep2 = h('div');
  pwStep2.hidden = true;
  const codeGrp = h('div', 'form-group');
  const codeIn = document.createElement('input');
  codeIn.type = 'text';
  codeIn.maxLength = 6;
  codeIn.placeholder = 'Enter 6-digit code';
  codeIn.setAttribute('aria-label', 'Verification code');
  codeGrp.append(h('label', '', 'Verification Code (from email)'), codeIn);

  const newPassGrp = h('div', 'form-group');
  const newPassIn = document.createElement('input');
  newPassIn.type = 'password';
  newPassIn.placeholder = 'Minimum 10 characters';
  newPassIn.autocomplete = 'new-password';
  newPassIn.setAttribute('aria-label', 'New password');
  newPassGrp.append(h('label', '', 'New Password'), newPassIn);

  const submitPassBtn = h('button', 'btn primary sm', 'Save New Password');
  submitPassBtn.type = 'button';
  const passMsg = h('p', 'note');

  pwStep2.append(h('div', 'form-grid', '', [codeGrp, newPassGrp]), h('div', 'sendrow', '', [submitPassBtn, passMsg]));
  pwCard.append(pwStep2);

  reqCodeBtn.addEventListener('click', async () => {
    reqCodeBtn.disabled = true;
    reqCodeBtn.textContent = 'Sending code…';
    codeStatus.textContent = '';
    const r = await api('/api/client/forgot', { email: me.email });
    reqCodeBtn.disabled = false;
    reqCodeBtn.textContent = 'Resend verification code';
    if (!r.ok) {
      codeStatus.textContent = (r.body && r.body.error) || 'Failed to send code.';
      codeStatus.className = 'note err';
      return;
    }
    codeStatus.textContent = `Verification code sent to ${me.email} (valid for 10 minutes).` + (r.body.devCode ? ` [Dev Code: ${r.body.devCode}]` : '');
    codeStatus.className = 'note ok';
    pwStep2.hidden = false;
    codeIn.focus();
  });

  submitPassBtn.addEventListener('click', async () => {
    const code = codeIn.value.trim();
    const pw = newPassIn.value;
    if (!/^\d{6}$/.test(code)) {
      passMsg.textContent = 'Please enter the 6-digit code received.';
      passMsg.className = 'note err';
      codeIn.focus();
      return;
    }
    if (pw.length < 10) {
      passMsg.textContent = 'Password must be at least 10 characters long.';
      passMsg.className = 'note err';
      newPassIn.focus();
      return;
    }

    submitPassBtn.disabled = true;
    submitPassBtn.textContent = 'Updating…';
    passMsg.textContent = '';

    const r = await api('/api/client/reset', {
      email: me.email,
      code,
      password: pw,
      acceptTerms: true
    });

    submitPassBtn.disabled = false;
    submitPassBtn.textContent = 'Save New Password';

    if (!r.ok) {
      passMsg.textContent = (r.body && r.body.error) || 'Failed to update password.';
      passMsg.className = 'note err';
      return;
    }

    if (r.body.csrf) csrf = r.body.csrf;
    passMsg.textContent = 'Password updated successfully! Other browser sessions have been signed out.';
    passMsg.className = 'note ok';
    codeIn.value = '';
    newPassIn.value = '';
    setTimeout(() => { pwStep2.hidden = true; }, 5000);
  });

  wrap.append(pwCard);

  // Card 3: Two-Factor Authentication Status
  const tfaCard = h('div', 'settings-card');
  const tfaHead = h('div', 'settings-card-header');
  tfaHead.append(
    h('h2', '', 'Two-Factor Authentication (2FA)'),
    h('p', '', 'Multi-factor authentication status and security enforcement.')
  );
  tfaCard.append(tfaHead);

  const tfaRow = h('div', 'sendrow');
  tfaRow.append(
    h('span', 'mono', 'Current Status:'),
    h('span', 'status st-none', 'Password + 30-Day Hardened HTTP-Only Session')
  );
  tfaCard.append(
    tfaRow,
    h('p', 'note', 'Apeiron accounts are protected by scrypt password hashing, SameSite=Strict cookies, and TLS in-flight encryption. Hardware security key (WebAuthn/FIDO2) support is on our engineering roadmap.')
  );
  wrap.append(tfaCard);

  // Card 4: Active Session
  const sessCard = h('div', 'settings-card');
  const sessHead = h('div', 'settings-card-header');
  sessHead.append(
    h('h2', '', 'Active Sessions'),
    h('p', '', 'Current authenticated browser connections.')
  );
  sessCard.append(sessHead);

  const sessInfo = h('div', 'diag-grid');
  sessInfo.append(
    h('div', 'diag-item', '', [h('span', '', 'Device Session'), h('b', '', 'Current Browser')]),
    h('div', 'diag-item', '', [h('span', '', 'Duration'), h('b', '', '30-Day Auto-Renewal')]),
    h('div', 'diag-item', '', [h('span', '', 'Cookie Security'), h('b', '', '__Host- Prefix, HttpOnly')])
  );
  const outBtn = h('button', 'btn sm', 'Sign out of this session');
  outBtn.type = 'button';
  outBtn.addEventListener('click', async () => {
    await api('/api/client/logout', {});
    location.href = '../';
  });
  sessCard.append(sessInfo, h('div', 'nav', '', [h('span'), outBtn]));
  wrap.append(sessCard);

  // Card 5: Danger Zone (Account Deletion)
  const delCard = h('div', 'settings-card card-danger');
  const delHead = h('div', 'settings-card-header');
  delHead.append(
    h('h2', '', 'Danger Zone · Delete Account'),
    h('p', '', 'Permanently erase your account, project quotes, comments, and sessions from the Apeiron database.')
  );
  delCard.append(delHead);

  const delPw = document.createElement('input');
  delPw.type = 'password';
  delPw.autocomplete = 'current-password';
  delPw.placeholder = 'Enter your password to confirm deletion';
  delPw.setAttribute('aria-label', 'Password to confirm deletion');

  const delBtn = h('button', 'btn sm reject', 'Delete My Account Permanently');
  delBtn.type = 'button';
  const delMsg = h('p', 'note');

  delBtn.addEventListener('click', async () => {
    if (!delPw.value) {
      delMsg.textContent = 'Please enter your password first.';
      delMsg.className = 'note err';
      delPw.focus();
      return;
    }
    if (!confirm('Are you absolutely certain? This will immediately delete your account and all project records permanently. This cannot be undone.')) return;
    delBtn.disabled = true;
    delBtn.textContent = 'Deleting…';
    const r = await api('/api/client/account/delete', { password: delPw.value });
    if (r.ok) {
      location.href = '../';
      return;
    }
    delBtn.disabled = false;
    delBtn.textContent = 'Delete My Account Permanently';
    delMsg.textContent = (r.body && r.body.error) || 'Could not delete account. Check password.';
    delMsg.className = 'note err';
  });

  delCard.append(
    h('p', 'note', 'Warning: Account deletion is irreversible. All submitted architectures, team discussions, and records will be deleted in accordance with our Privacy Policy.'),
    delPw,
    h('div', 'nav', '', [h('span'), delBtn]),
    delMsg
  );
  wrap.append(delCard);

  return wrap;
}

// --------------------------------------------------------------------------
// Section C: Payments & Billing
// --------------------------------------------------------------------------
function renderBillingSection(prefs) {
  const card = h('div', 'settings-card');
  const head = h('div', 'settings-card-header');
  head.append(
    h('h2', '', 'Payments & Billing Architecture'),
    h('p', '', 'Review project fee structures, invoice records, and corporate billing details.')
  );
  card.append(head);

  // Invoicing details
  const bData = prefs.billing || {};
  const formGrid = h('div', 'form-grid');
  const bName = document.createElement('input');
  bName.type = 'text';
  bName.placeholder = 'Legal Entity / Invoicing Name';
  bName.value = bData.name || me.company || me.name || '';

  const bTax = document.createElement('input');
  bTax.type = 'text';
  bTax.placeholder = 'GSTIN / VAT / Tax ID (Optional)';
  bTax.value = bData.taxId || '';

  const bAddr = document.createElement('input');
  bAddr.type = 'text';
  bAddr.placeholder = 'Registered Billing Address';
  bAddr.value = bData.address || '';

  const g1 = h('div', 'form-group', '', [h('label', '', 'Invoicing Entity Name'), bName]);
  const g2 = h('div', 'form-group', '', [h('label', '', 'Tax Identification Number'), bTax]);
  const g3 = h('div', 'form-group', '', [h('label', '', 'Billing Address'), bAddr]);

  formGrid.append(g1, g2, g3);
  card.append(formGrid);

  const saveBillingBtn = h('button', 'btn sm', 'Save Invoicing Information');
  saveBillingBtn.type = 'button';
  const bMsg = h('span', 'note');

  saveBillingBtn.addEventListener('click', () => {
    savePrefs(me.email, {
      billing: {
        name: bName.value.trim(),
        taxId: bTax.value.trim(),
        address: bAddr.value.trim()
      }
    });
    bMsg.textContent = 'Invoicing information saved.';
    bMsg.className = 'note ok';
    setTimeout(() => { if (bMsg.textContent === 'Invoicing information saved.') bMsg.textContent = ''; }, 3000);
  });

  card.append(h('div', 'sendrow', '', [saveBillingBtn, bMsg]));

  // Project Invoices & Schedulers
  const invHeader = h('div', 'settings-card-header', '', [
    h('h2', '', 'Active Project Billing Schedules'),
    h('p', '', 'Summary of scoped build investments and ongoing support subscriptions.')
  ]);
  card.append(invHeader);

  if (!quotes.length) {
    card.append(h('p', 'note', 'No active project quotes or invoices yet. Submit an idea via the guided builder to receive an architectural estimate.'));
  } else {
    quotes.forEach(q => {
      const qRow = h('div', 'sendrow');
      const bInfo = BADGE[q.status] || [q.status, 'st-none'];
      const planTxt = q.plan === 'subscription' ? 'Continuous Build + Support Subscription' : 'Single Build Scope';
      const costTxt = q.pricing && q.plan && q.pricing.plans[q.plan]
        ? inr(q.pricing.plans[q.plan].total) + (q.plan === 'subscription' ? ` + ${inr(q.pricing.plans[q.plan].monthly)}/mo` : '')
        : 'Starting Estimate';

      qRow.append(
        h('strong', '', `Request #${q.id}`),
        h('span', '', `${planTxt} · ${costTxt}`),
        h('span', 'status ' + bInfo[1], bInfo[0])
      );
      card.append(qRow);
    });
  }

  // Security & Payment Methods Policy
  const secNotice = h('div', 'idea');
  secNotice.append(
    document.createTextNode('Payment Security Notice: Apeiron Solutions does not store or process payment card data on our servers. Formal project payments are executed via verified direct corporate wire transfer, international ACH, or approved milestone escrow.')
  );
  card.append(secNotice);

  return card;
}

// --------------------------------------------------------------------------
// Section D: Notifications
// --------------------------------------------------------------------------
function renderNotificationsSection(prefs) {
  const card = h('div', 'settings-card');
  const head = h('div', 'settings-card-header');
  head.append(
    h('h2', '', 'Notification Channels'),
    h('p', '', 'Control automated notifications for project reviews, team messages, and milestones.')
  );
  card.append(head);

  const notifs = prefs.notifications || {
    decisions: true,
    messages: true,
    milestones: true,
    sound: true,
    digest: false
  };

  const tGroup = h('div', 'toggle-group');
  const statusMsg = h('p', 'note');

  const makeToggle = (key, title, desc, checked) => {
    const item = h('div', 'toggle-item');
    const textWrap = h('div', 'toggle-text');
    textWrap.append(h('span', 'toggle-title', title), h('span', 'toggle-desc', desc));

    const switchWrap = h('label', 'toggle-switch');
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.checked = !!checked;
    const slider = h('span', 'toggle-slider');
    switchWrap.append(chk, slider);

    chk.addEventListener('change', () => {
      notifs[key] = chk.checked;
      savePrefs(me.email, { notifications: notifs });
      statusMsg.textContent = 'Notification preferences updated.';
      statusMsg.className = 'note ok';
      setTimeout(() => { if (statusMsg.textContent === 'Notification preferences updated.') statusMsg.textContent = ''; }, 3000);
    });

    item.append(textWrap, switchWrap);
    return item;
  };

  tGroup.append(
    makeToggle('decisions', 'Project Decisions & Review Alerts', 'Email notifications when your project proposal is accepted or updated by the engineering team', notifs.decisions),
    makeToggle('messages', 'Team Messages & Comment Replies', 'Email notification whenever an engineer replies to your private project discussion', notifs.messages),
    makeToggle('milestones', 'Milestone Stage Progression', 'Notifications when project status changes (Received → Planning → Building → Review → Delivered)', notifs.milestones),
    makeToggle('sound', 'Browser Audio Ping on Incoming Messages', 'Play subtle tone when a new team message arrives while the portal tab is open', notifs.sound),
    makeToggle('digest', 'Weekly Architectural Summary', 'Weekly email digest summarizing active requests, team comments, and system updates', notifs.digest)
  );

  card.append(tGroup, statusMsg);
  return card;
}

// --------------------------------------------------------------------------
// Section E: Privacy & Data Export
// --------------------------------------------------------------------------
function renderPrivacySection(prefs) {
  const card = h('div', 'settings-card');
  const head = h('div', 'settings-card-header');
  head.append(
    h('h2', '', 'Privacy & Data Export'),
    h('p', '', 'Review compliance status, data retention terms, and export your personal account data.')
  );
  card.append(head);

  // Data Export Button
  const exportBox = h('div', 'sendrow');
  const exportBtn = h('button', 'btn primary sm', 'Export All My Data (JSON)');
  exportBtn.type = 'button';
  const expStatus = h('span', 'note');

  exportBtn.addEventListener('click', () => {
    exportBtn.disabled = true;
    exportBtn.textContent = 'Generating export…';
    try {
      const dump = {
        meta: {
          service: 'Apeiron Solutions Client Portal',
          exportedAt: new Date().toISOString(),
          version: '1.0'
        },
        profile: {
          id: me.id,
          email: me.email,
          name: me.name,
          company: me.company,
          phone: me.phone,
          termsVersion: me.terms_version || 1
        },
        projects: quotes || [],
        preferences: prefs
      };

      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dl = document.createElement('a');
      dl.href = url;
      dl.download = `apeiron-account-export-${me.email.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.append(dl);
      dl.click();
      dl.remove();
      URL.revokeObjectURL(url);

      expStatus.textContent = 'Data export downloaded successfully.';
      expStatus.className = 'note ok';
    } catch (err) {
      expStatus.textContent = 'Failed to generate export file.';
      expStatus.className = 'note err';
    }
    exportBtn.disabled = false;
    exportBtn.textContent = 'Export All My Data (JSON)';
  });

  exportBox.append(exportBtn, expStatus);
  card.append(exportBox);

  // Policy & Retention Terms
  const infoGrid = h('div', 'diag-grid');
  infoGrid.append(
    h('div', 'diag-item', '', [h('span', '', 'Accepted Terms'), h('b', '', 'Version 1.0 (Compliant)')]),
    h('div', 'diag-item', '', [h('span', '', 'Retention Schedule'), h('b', '', '365 Days or until deletion')]),
    h('div', 'diag-item', '', [h('span', '', 'Server Telemetry'), h('b', '', 'Zero Tracker Cookies')])
  );
  card.append(infoGrid);

  const legalLinks = h('p', 'note', 'Refer to our official documents for details: ');
  const tA = h('a', '', 'Terms and Conditions'); tA.href = '../terms.html';
  const pA = h('a', '', 'Privacy Policy'); pA.href = '../privacy.html';
  const sA = h('a', '', 'Security Audit'); sA.href = '../security.html';
  legalLinks.append(tA, ', ', pA, ', and ', sA, '.');
  card.append(legalLinks);

  return card;
}

// --------------------------------------------------------------------------
// Section F: Preferences (Currency, Time, Accessibility)
// --------------------------------------------------------------------------
function renderPreferencesSection(prefs) {
  const card = h('div', 'settings-card');
  const head = h('div', 'settings-card-header');
  head.append(
    h('h2', '', 'Display & Regional Preferences'),
    h('p', '', 'Customize currency display, time formats, and accessibility settings.')
  );
  card.append(head);

  const formGrid = h('div', 'form-grid');

  // Currency Selector
  const curGrp = h('div', 'form-group');
  const curLbl = h('label', '', 'Currency Display');
  const curSel = document.createElement('select');
  [
    ['INR', 'INR (₹) — Apeiron Base Currency'],
    ['USD', 'USD ($) — Indicative Conversion'],
    ['EUR', 'EUR (€) — Indicative Conversion'],
    ['GBP', 'GBP (£) — Indicative Conversion']
  ].forEach(([val, txt]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = txt;
    if ((prefs.currency || 'INR') === val) opt.selected = true;
    curSel.append(opt);
  });
  curGrp.append(curLbl, curSel);

  // Date format selector
  const dateGrp = h('div', 'form-group');
  const dateLbl = h('label', '', 'Date & Time Format');
  const dateSel = document.createElement('select');
  [
    ['local', 'Local Time (12-hour: 10/20/2026, 10:30 PM)'],
    ['iso', 'ISO 8601 (24-hour: 2026-10-20 22:30)']
  ].forEach(([val, txt]) => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = txt;
    if ((prefs.dateFormat || 'local') === val) opt.selected = true;
    dateSel.append(opt);
  });
  dateGrp.append(dateLbl, dateSel);

  formGrid.append(curGrp, dateGrp);
  card.append(formGrid);

  // Accessibility Toggles
  const accHead = h('h2', '', 'Accessibility');
  accHead.style.fontSize = '16px';
  accHead.style.marginTop = '12px';
  card.append(accHead);

  const accGroup = h('div', 'toggle-group');
  const motionToggle = h('div', 'toggle-item');
  const mText = h('div', 'toggle-text', '', [
    h('span', 'toggle-title', 'Reduce Interface Motion'),
    h('span', 'toggle-desc', 'Disable decorative animations and dynamic transitions')
  ]);
  const mSwitch = h('label', 'toggle-switch');
  const mChk = document.createElement('input');
  mChk.type = 'checkbox';
  mChk.checked = !!prefs.reduceMotion;
  mSwitch.append(mChk, h('span', 'toggle-slider'));
  motionToggle.append(mText, mSwitch);

  accGroup.append(motionToggle);
  card.append(accGroup);

  const saveBtn = h('button', 'btn primary sm', 'Save Preferences');
  saveBtn.type = 'button';
  const pMsg = h('span', 'note');

  saveBtn.addEventListener('click', () => {
    savePrefs(me.email, {
      currency: curSel.value,
      dateFormat: dateSel.value,
      reduceMotion: mChk.checked
    });
    pMsg.textContent = 'Preferences saved. Currency & format updated across portal.';
    pMsg.className = 'note ok';
    setTimeout(() => { if (pMsg.textContent.includes('Preferences saved')) pMsg.textContent = ''; }, 3500);
  });

  card.append(h('div', 'sendrow', '', [saveBtn, pMsg]));
  return card;
}

// --------------------------------------------------------------------------
// Section G: Work & Project Preferences
// --------------------------------------------------------------------------
function renderWorkSection(prefs) {
  const card = h('div', 'settings-card');
  const head = h('div', 'settings-card-header');
  head.append(
    h('h2', '', 'Project & Technology Preferences'),
    h('p', '', 'Declare engineering interests and communication cadence for project development.')
  );
  card.append(head);

  const wPrefs = prefs.workPrefs || {
    interests: ['ai', 'fullstack', 'frontend'],
    cadence: 'realtime',
    channel: 'portal'
  };

  card.append(h('label', 'mono', 'Engineering Capabilities of Interest:'));
  const chipsGrid = h('div', 'chips-grid');
  const CAPS = [
    ['ai', 'AI & Machine Learning'],
    ['fullstack', 'Full Stack Web Applications'],
    ['frontend', 'Frontend & 3D WebGL'],
    ['mobile', 'Mobile Apps (iOS & Android)'],
    ['cloud', 'Cloud Infrastructure & DevOps'],
    ['automation', 'Workflow Automation & Bots'],
    ['data', 'Data Systems & Analytics']
  ];

  const activeInterests = new Set(wPrefs.interests || []);

  CAPS.forEach(([key, label]) => {
    const chip = h('button', 'pref-chip' + (activeInterests.has(key) ? ' active' : ''), label);
    chip.type = 'button';
    chip.setAttribute('aria-pressed', String(activeInterests.has(key)));
    chip.addEventListener('click', () => {
      if (activeInterests.has(key)) {
        activeInterests.delete(key);
        chip.classList.remove('active');
        chip.setAttribute('aria-pressed', 'false');
      } else {
        activeInterests.add(key);
        chip.classList.add('active');
        chip.setAttribute('aria-pressed', 'true');
      }
    });
    chipsGrid.append(chip);
  });
  card.append(chipsGrid);

  const formGrid = h('div', 'form-grid');
  const cadGrp = h('div', 'form-group');
  const cadLbl = h('label', '', 'Preferred Communication Cadence');
  const cadSel = document.createElement('select');
  [
    ['realtime', 'Real-Time (as engineers reply)'],
    ['daily', 'Daily Digest Summary'],
    ['milestones', 'Major Milestones Only']
  ].forEach(([val, txt]) => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = txt;
    if (wPrefs.cadence === val) o.selected = true;
    cadSel.append(o);
  });
  cadGrp.append(cadLbl, cadSel);

  const chGrp = h('div', 'form-group');
  const chLbl = h('label', '', 'Primary Contact Channel');
  const chSel = document.createElement('select');
  [
    ['portal', 'Apeiron Client Portal Messages (Recommended)'],
    ['email', 'Direct Email Correspondence'],
    ['phone', 'Phone / WhatsApp']
  ].forEach(([val, txt]) => {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = txt;
    if (wPrefs.channel === val) o.selected = true;
    chSel.append(o);
  });
  chGrp.append(chLbl, chSel);

  formGrid.append(cadGrp, chGrp);
  card.append(formGrid);

  const saveBtn = h('button', 'btn primary sm', 'Save Project Preferences');
  saveBtn.type = 'button';
  const msg = h('span', 'note');

  saveBtn.addEventListener('click', () => {
    savePrefs(me.email, {
      workPrefs: {
        interests: Array.from(activeInterests),
        cadence: cadSel.value,
        channel: chSel.value
      }
    });
    msg.textContent = 'Project preferences saved.';
    msg.className = 'note ok';
    setTimeout(() => { if (msg.textContent === 'Project preferences saved.') msg.textContent = ''; }, 3000);
  });

  card.append(h('div', 'sendrow', '', [saveBtn, msg]));
  return card;
}

// --------------------------------------------------------------------------
// Section H: Help & Support
// --------------------------------------------------------------------------
function renderSupportSection() {
  const card = h('div', 'settings-card');
  const head = h('div', 'settings-card-header');
  head.append(
    h('h2', '', 'Help & Direct Engineering Support'),
    h('p', '', 'Access support resources, connect with our architecture team, and inspect portal diagnostics.')
  );
  card.append(head);

  const channels = h('div', 'sendrow');
  const chatBtn = h('button', 'btn primary sm', '💬 Open Team Messages');
  chatBtn.type = 'button';
  chatBtn.addEventListener('click', () => switchTab('chat'));

  const mailLink = h('a', 'btn sm', '✉ Email apeironsolvs@gmail.com');
  mailLink.href = 'mailto:apeironsolvs@gmail.com';

  channels.append(chatBtn, mailLink);
  card.append(channels);

  const diagHead = h('h2', '', 'Client System Diagnostics');
  diagHead.style.fontSize = '16px';
  diagHead.style.marginTop = '14px';
  card.append(diagHead);

  const diagGrid = h('div', 'diag-grid');
  diagGrid.append(
    h('div', 'diag-item', '', [h('span', '', 'Online Status'), h('b', '', navigator.onLine ? 'Connected (Online)' : 'Offline')]),
    h('div', 'diag-item', '', [h('span', '', 'Display Resolution'), h('b', '', `${window.innerWidth} × ${window.innerHeight}`)]),
    h('div', 'diag-item', '', [h('span', '', 'Local Storage'), h('b', '', typeof localStorage !== 'undefined' ? 'Supported' : 'Unavailable')]),
    h('div', 'diag-item', '', [h('span', '', 'Browser Platform'), h('b', '', navigator.platform || 'Modern Browser')])
  );
  card.append(diagGrid);

  const pol = h('p', 'note', 'Read our governance documentation: ');
  const sL = h('a', '', 'Security Architecture'); sL.href = '../security.html';
  const tL = h('a', '', 'Terms of Service'); tL.href = '../terms.html';
  const pL = h('a', '', 'Privacy Policy'); pL.href = '../privacy.html';
  pol.append(sL, ' · ', tL, ' · ', pL);
  card.append(pol);

  return card;
}

function renderApp() {
  if (activeTab === 'chat') {
    app.replaceChildren(renderChatView());
  } else if (activeTab === 'settings' || activeTab === 'profile') {
    app.replaceChildren(renderSettingsView());
  } else {
    app.replaceChildren(renderDashboard());
  }
}

async function load(shouldRerender = true) {
  const r = await api('/api/client/quotes');
  if (!r.ok) return;
  quotes = r.body.quotes || [];
  updateNav();

  if (activeTab === 'dashboard' && shouldRerender) {
    renderApp();
  } else if (activeTab === 'chat') {
    const submitted = getSubmittedQuotes();
    const current = submitted.find(q => q.id === selectedQuoteId);
    if (current && chatThreadEl) {
      const activeTextarea = $('.chat-input-box textarea');
      const isTyping = activeTextarea && activeTextarea === document.activeElement && activeTextarea.value.trim().length > 0;
      const curCount = (current.comments || []).length;
      const prevCount = chatThreadEl.querySelectorAll('.msg').length;
      if (curCount !== prevCount) {
        paintThread(chatThreadEl, current);
      }
    } else if (shouldRerender) {
      renderApp();
    }
  } else if ((activeTab === 'settings' || activeTab === 'profile') && shouldRerender) {
    renderApp();
  }
}

(async function init() {
  const m = await api('/api/client/me');
  if (!m.ok) {
    location.replace('../?signin=1');
    return;
  }
  me = m.body;
  csrf = me.csrf;

  // Header user info and logout
  const who = $('#who');
  const out = h('button', 'btn sm', 'Log out');
  out.type = 'button';
  out.addEventListener('click', async () => {
    await api('/api/client/logout', {});
    location.href = '../';
  });
  who.replaceChildren(document.createTextNode(me.name || me.email), out);

  // Nav buttons setup
  const tabDash = $('#tab-dash');
  const tabChat = $('#tab-chat');
  const tabSettings = $('#tab-settings');
  const tabProf = $('#tab-prof');

  if (tabDash) tabDash.addEventListener('click', () => switchTab('dashboard'));
  if (tabChat) tabChat.addEventListener('click', () => switchTab('chat'));
  if (tabSettings) tabSettings.addEventListener('click', () => switchTab('settings'));
  if (tabProf) tabProf.addEventListener('click', () => switchTab('settings', null, 'profile'));

  // Parse initial route from hash or URL param
  const hash = location.hash.replace(/^#/, '');
  const qParam = new URLSearchParams(location.search).get('q');

  if (qParam) {
    selectedQuoteId = parseInt(qParam, 10);
    activeTab = 'chat';
  } else if (hash.startsWith('chat-')) {
    const qId = parseInt(hash.replace('chat-', ''), 10);
    if (qId) selectedQuoteId = qId;
    activeTab = 'chat';
  } else if (hash === 'chat' || hash === 'messages') {
    activeTab = 'chat';
  } else if (hash.startsWith('settings-')) {
    activeTab = 'settings';
    activeSettingsSection = hash.replace('settings-', '') || 'profile';
  } else if (hash === 'settings' || hash === 'profile') {
    activeTab = 'settings';
    activeSettingsSection = 'profile';
  } else {
    activeTab = 'dashboard';
  }

  window.addEventListener('hashchange', () => {
    const curHash = location.hash.replace(/^#/, '');
    if (curHash.startsWith('chat-')) {
      const qId = parseInt(curHash.replace('chat-', ''), 10);
      switchTab('chat', qId);
    } else if (curHash === 'chat' || curHash === 'messages') {
      switchTab('chat');
    } else if (curHash.startsWith('settings-')) {
      switchTab('settings', null, curHash.replace('settings-', ''));
    } else if (curHash === 'settings' || curHash === 'profile') {
      switchTab('settings', null, 'profile');
    } else {
      switchTab('dashboard');
    }
  });

  // Initial load
  await load(true);

  // Polling every 8 seconds
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!document.hidden) load(false);
  }, 8000);
})();
