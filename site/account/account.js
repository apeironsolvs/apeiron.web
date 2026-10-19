// Profile, live request status, and direct client–team conversation interface.
const $ = s => document.querySelector(s), app = $('#app');
const STAGES = [['received', 'Received'], ['planning', 'Planning'], ['building', 'Building'], ['review', 'Review'], ['delivered', 'Delivered']];
const BADGE = { draft: ['Not sent yet', 'st-none'], submitted: ['Pending', 'st-pending'], negotiating: ['Pending', 'st-pending'], accepted: ['Accepted', 'st-accepted'], declined: ['Rejected', 'st-rejected'] };
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

function h(tag, cls, text, kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  (kids || []).forEach(k => k && e.append(k));
  return e;
}

let csrf = '', me = null, quotes = [], activeTab = 'dashboard', selectedQuoteId = null;
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
  const tabProf = $('#tab-prof');
  const badge = $('#chat-badge');

  if (tabDash) {
    tabDash.classList.toggle('active', activeTab === 'dashboard');
    tabDash.setAttribute('aria-selected', String(activeTab === 'dashboard'));
  }

  if (tabProf) {
    tabProf.classList.toggle('active', activeTab === 'profile');
    tabProf.setAttribute('aria-selected', String(activeTab === 'profile'));
  }

  if (tabChat) {
    const hasSubmitted = submitted.length > 0;
    tabChat.hidden = !hasSubmitted;
    tabChat.classList.toggle('active', activeTab === 'chat');
    tabChat.setAttribute('aria-selected', String(activeTab === 'chat'));

    if (hasSubmitted && badge) {
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

  // If currently on chat tab but no submitted quotes exist, switch back to dashboard
  if (activeTab === 'chat' && submitted.length === 0) {
    switchTab('dashboard');
  }
}

function switchTab(tab, quoteId) {
  activeTab = tab;
  if (quoteId !== undefined && quoteId !== null) {
    selectedQuoteId = Number(quoteId);
  }
  updateNav();
  renderApp();

  const hash = tab === 'chat' ? (selectedQuoteId ? `chat-${selectedQuoteId}` : 'chat') : (tab === 'profile' ? 'profile' : 'dashboard');
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

function renderProfileView() {
  const wrap = h('div');
  const head = h('div');
  head.append(
    h('p', 'mono', 'Account Settings'),
    h('h1', '', 'Profile and Security'),
    h('p', 'lede', 'Manage your contact details, security credentials, and account preferences.')
  );
  wrap.append(head);

  // Profile Card
  const field = (label, val, max, ph) => {
    const i = document.createElement('input');
    i.type = 'text';
    i.maxLength = max;
    i.value = val || '';
    i.placeholder = ph;
    i.setAttribute('aria-label', label);
    return i;
  };
  const nameIn = field('Your name', me.name, 100, 'Your name');
  const coIn = field('Company', me.company, 100, 'Company (optional)');
  const phIn = field('Phone', me.phone, 50, 'Phone (optional)');
  const save = h('button', 'btn sm', 'Save details');
  const msg = h('p', 'note');
  const prof = h('div', 'card');
  save.type = 'button';
  save.addEventListener('click', async () => {
    if (!nameIn.value.trim()) {
      msg.textContent = 'Please enter your name.';
      msg.className = 'note err';
      return;
    }
    const r = await api('/api/client/profile', { name: nameIn.value, company: coIn.value, phone: phIn.value }, 'PATCH');
    msg.textContent = r.ok ? 'Details saved.' : (r.body.error || 'Could not save.');
    msg.className = r.ok ? 'note ok' : 'note err';
    if (r.ok) me.name = nameIn.value;
  });
  prof.append(
    h('h2', '', 'Contact Details'),
    h('p', 'note', `Logged in as ${me.email}. You stay logged in on this device for 30 days.`),
    nameIn, coIn, phIn,
    h('div', 'nav', '', [h('span'), save]),
    msg
  );
  wrap.append(prof);

  // Delete Account Card
  const pw = document.createElement('input');
  pw.type = 'password';
  pw.autocomplete = 'current-password';
  pw.placeholder = 'Your password to confirm';
  pw.setAttribute('aria-label', 'Password to confirm deletion');
  const del = h('button', 'btn sm', 'Delete my account');
  const dm = h('p', 'note');
  const dz = h('div', 'card');
  del.type = 'button';
  del.addEventListener('click', async () => {
    if (!pw.value) {
      dm.textContent = 'Enter your password first.';
      dm.className = 'note err';
      return;
    }
    if (!confirm('Delete your account and all your requests permanently? This cannot be undone.')) return;
    const r = await api('/api/client/account/delete', { password: pw.value });
    if (r.ok) { location.href = '../'; return; }
    dm.textContent = r.body.error || 'Could not delete.';
    dm.className = 'note err';
  });
  dz.append(
    h('h2', '', 'Delete my account'),
    h('p', 'note', 'This removes your account and all your requests from our database. See our Privacy Policy for details.'),
    pw,
    h('div', 'nav', '', [h('span'), del]),
    dm
  );
  wrap.append(dz);

  // Legal Notice
  const legal = h('p', 'note', 'Read our ');
  const tl = h('a', '', 'Terms and Conditions');
  const pl = h('a', '', 'Privacy Policy');
  tl.href = '../terms.html';
  pl.href = '../privacy.html';
  legal.append(tl, ' and ', pl, '.');
  wrap.append(legal);

  return wrap;
}

function renderApp() {
  if (activeTab === 'chat') {
    app.replaceChildren(renderChatView());
  } else if (activeTab === 'profile') {
    app.replaceChildren(renderProfileView());
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
  const tabProf = $('#tab-prof');

  if (tabDash) tabDash.addEventListener('click', () => switchTab('dashboard'));
  if (tabChat) tabChat.addEventListener('click', () => switchTab('chat'));
  if (tabProf) tabProf.addEventListener('click', () => switchTab('profile'));

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
  } else if (hash === 'profile' || hash === 'settings') {
    activeTab = 'profile';
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
    } else if (curHash === 'profile') {
      switchTab('profile');
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
