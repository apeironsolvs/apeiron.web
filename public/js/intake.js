/* ==========================================================================
   Apeiron Solutions — account window ("Bring your idea" starts here).
   Log in, or create an account (name, email, password, accept Terms and Privacy).
   A password reset by emailed code is available. Logins are remembered for 30 days.
   After logging in, "Bring your idea" continues to /start/ (the page where you describe what to build).
   All server calls send JSON and a CSRF token. Text is only ever written with textContent.
   ========================================================================== */
export function initIntake({ config, state, onStateChange }) {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const dialog = $('#intake'), errBox = $('#ierr'), nextBtn = $('#inext'), backBtn = $('#iback');
  let lastFocus = null, me = null, busy = false, mode = 'login', needsTerms = false, after = null;
  const clean = s => (s || '').replace(/[\r\n]+/g, ' ').trim();
  const EMAIL = /^\S+@\S+\.\S{2,}$/;

  async function api(path, body, method) {
    const opt = { method: method || (body ? 'POST' : 'GET'), credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...(me ? { 'X-CSRF-Token': me.csrf } : {}) } };
    if (body) opt.body = JSON.stringify(body);
    try { const r = await fetch(path, opt); let j = {}; try { j = await r.json(); } catch (_) { /* empty */ } return { ok: r.ok, status: r.status, body: j }; }
    catch (_) { return { ok: false, status: 0, body: {} }; }
  }
  const setInert = on => ['#main', '#nav', 'footer', '#menu'].forEach(s => { const e = $(s); if (e) e.inert = on; });
  const say = t => { errBox.textContent = t || ''; };
  const hint = t => { const h = $('#s-hint'); h.hidden = !t; h.textContent = t || ''; };
  const setBusy = (on, label) => { busy = on; nextBtn.disabled = on; if (label) nextBtn.textContent = label; };
  const show = (id, on) => { $(id).hidden = !on; };

  function paintHeader() {           // top-right button: "Log in" before login, "Profile" after
    $$('[data-login]').forEach(b => { b.textContent = me ? 'Profile' : 'Log in'; b.dataset.state = me ? 'in' : 'out'; });
    checkSubmittedMessages();
  }

  async function checkSubmittedMessages() {
    if (!me) return;
    try {
      const r = await api('/api/client/quotes');
      if (r.ok && r.body.quotes) {
        const submitted = r.body.quotes.filter(q => q && q.status && q.status !== 'draft');
        let total = 0;
        submitted.forEach(q => {
          if (q.comments && q.comments.length) total += q.comments.length;
        });
        $$('.nav-chat-badge').forEach(b => {
          if (total > 0) {
            b.textContent = String(total);
            b.hidden = false;
            b.title = `${total} message${total === 1 ? '' : 's'} with Apeiron team`;
          } else {
            b.hidden = true;
          }
        });
        $$('[data-chat-link]').forEach(el => {
          el.classList.toggle('has-messages', total > 0);
        });
      }
    } catch (_) {}
  }
  const startUrl = a => { const p = new URLSearchParams(); if (a && a.idea) p.set('idea', a.idea.slice(0, 600)); else if (a && a.need) p.set('need', a.need.slice(0, 80)); const q = p.toString(); return 'start/' + (q ? '?' + q : ''); };

  function render() {                // one place decides what each mode looks like
    const reg = mode === 'register', fgt = mode === 'forgot', rst = mode === 'reset';
    show('#seg', mode === 'login' || reg); show('#s-namebox', reg); show('#s-codebox', rst); show('#s-passbox', !fgt);
    show('#s-showbox', !fgt); show('#s-termsbox', reg || needsTerms); show('#s-forgot', mode === 'login'); $('#s-forgot').parentElement.hidden = mode !== 'login';
    $('#mode-in').setAttribute('aria-pressed', String(mode === 'login')); $('#mode-up').setAttribute('aria-pressed', String(reg));
    backBtn.hidden = !(fgt || rst);
    const T = { login: ['Log in to continue.', 'Welcome back. Log in and you will stay logged in on this device.', 'Log in', 'Password', 'current-password'],
      register: ['Create your account.', 'Your details are saved securely. Your password is stored scrambled (hashed), so nobody can read it.', 'Create my account', 'Choose a password (at least 10 characters)', 'new-password'],
      forgot: ['Reset your password.', 'Enter your email and we will send you a 6-digit code.', 'Send me a code', 'Password', 'current-password'],
      reset: ['Choose a new password.', 'Enter the code we emailed you and choose a new password.', 'Save new password', 'New password (at least 10 characters)', 'new-password'] }[mode];
    $('#s-title').textContent = T[0]; $('#s-lede').textContent = T[1]; nextBtn.textContent = T[2]; $('#s-passlabel').textContent = T[3]; $('#s-pass').autocomplete = T[4];
    $('#s-kicker').textContent = mode === 'register' ? 'New here?' : 'Apeiron account';
  }
  function setMode(m) { mode = m; needsTerms = false; say(''); hint(''); render(); }

  async function finish(user) {
    me = user; paintHeader();
    if (after && after.chatAfter) { location.href = 'account/#chat'; return; }
    if (location.hash === '#chat') { location.href = 'account/#chat'; return; }
    if (after && !after.stay && (after.idea || after.need)) { location.href = startUrl(after); return; }
    location.href = 'account/';
  }

  async function submit() {
    if (busy) return; say('');
    const email = clean($('#s-email').value).toLowerCase(), pass = $('#s-pass').value, terms = $('#s-terms').checked;
    if (!EMAIL.test(email)) return say('Enter a valid email address, like name@company.com.');
    if (mode === 'forgot') {
      setBusy(true, 'Sending…'); const r = await api('/api/client/forgot', { email }); setBusy(false, 'Send me a code');
      if (r.status === 0) return say('Our server cannot be reached right now. Please try again in a moment.');
      if (!r.ok) return say(r.body.error || 'Could not send the code.');
      mode = 'reset'; render();
      hint(r.body.devCode ? `Local test mode: your code is ${r.body.devCode}` : r.body.delivery === 'terminal' ? 'Email is not set up on this server yet (local mode). If an account exists, its code was printed in the terminal window where you started the site.' : 'If an account exists for that email, we sent a 6-digit code. Check your inbox and spam folder. It works for 10 minutes.');
      return $('#s-code').focus();
    }
    if (!pass) return say('Enter your password.');
    if (mode === 'register') {
      const name = clean($('#s-name').value);
      if (!name) return say('Please add your name.');
      if (pass.length < 10) return say('Use at least 10 characters for your password.');
      if (!terms) return say('You must accept the Terms and Conditions and the Privacy Policy to create an account.');
      setBusy(true, 'Creating…'); const r = await api('/api/client/register', { name, email, password: pass, acceptTerms: true }); setBusy(false, 'Create my account');
      if (r.status === 0) return say('Our server cannot be reached right now. Please try again in a moment.');
      if (!r.ok) return say(r.body.error || 'Could not create the account.');
      $('#s-pass').value = ''; return finish({ email: r.body.email, name: r.body.name, csrf: r.body.csrf });
    }
    if (mode === 'reset') {
      const code = clean($('#s-code').value);
      if (!/^\d{6}$/.test(code)) return say('Enter the 6-digit code from your email.');
      if (pass.length < 10) return say('Use at least 10 characters for your new password.');
      if (needsTerms && !terms) return say('Please accept the Terms and Conditions and the Privacy Policy to continue.');
      setBusy(true, 'Saving…'); const r = await api('/api/client/reset', { email, code, password: pass, acceptTerms: terms }); setBusy(false, 'Save new password');
      if (r.status === 409 && r.body.needsTerms) { needsTerms = true; render(); return say(r.body.error); }
      if (!r.ok) return say(r.body.error || 'That did not work.');
      $('#s-pass').value = ''; return finish({ email: r.body.email, name: r.body.name, csrf: r.body.csrf });
    }
    // login
    if (needsTerms && !terms) return say('Please accept the Terms and Conditions and the Privacy Policy to continue.');
    setBusy(true, 'Logging in…'); const r = await api('/api/client/login', { email, password: pass, acceptTerms: terms }); setBusy(false, 'Log in');
    if (r.status === 0) return say('Our server cannot be reached right now. Please try again in a moment.');
    if (r.status === 409 && r.body.needsTerms) { needsTerms = true; render(); return say(r.body.error); }
    if (!r.ok) return say(r.body.error || 'Could not log in.');
    $('#s-pass').value = ''; finish({ email: r.body.email, name: r.body.name, csrf: r.body.csrf });
  }

  async function openIntake(opts = {}) {
    if (!me) { const r = await api('/api/client/session'); if (r.ok && r.body.signedIn) { me = r.body; paintHeader(); } }
    after = opts.loginOnly ? { stay: true, chatAfter: opts.chatAfter } : { need: opts.need, idea: opts.idea };
    if (me) {
      if (opts.chatAfter) { location.href = 'account/#chat'; return; }
      if (opts.loginOnly) { location.href = 'account/'; return; }
      location.href = startUrl(after);
      return;
    }   // already logged in: straight to destination
    state.intake.open = true; state.intake.step = 0; if (onStateChange) onStateChange();
    lastFocus = document.activeElement; dialog.classList.add('open'); setInert(true);
    for (const id of ['#s-pass', '#s-code']) $(id).value = ''; $('#s-terms').checked = false; $('#s-show').checked = false; $('#s-pass').type = 'password';
    mode = opts.mode === 'register' ? 'register' : 'login'; needsTerms = false; say(''); hint(''); render();
    ($(mode === 'register' ? '#s-name' : '#s-email')).focus();
  }
  function closeIntake() {
    state.intake.open = false; if (onStateChange) onStateChange();
    dialog.classList.remove('open'); setInert(false);
    if (lastFocus && lastFocus.isConnected && lastFocus.offsetParent !== null) lastFocus.focus(); lastFocus = null;
  }

  $$('[data-open-intake]').forEach(btn => btn.addEventListener('click', () => {
    const menu = $('#menu'), burger = $('#burger');
    if (menu) menu.classList.remove('open');
    if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.textContent = 'Menu'; }
    const src = btn.hasAttribute('data-from-idea') ? $('#idea-in') : null;
    openIntake({ need: btn.dataset.need || btn.dataset.type, idea: src && src.value.trim() ? src.value.trim() : '' });
  }));
  $$('[data-login]').forEach(b => b.addEventListener('click', () => {
    const menu = $('#menu'), burger = $('#burger'); if (menu) menu.classList.remove('open');
    if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.textContent = 'Menu'; }
    openIntake({ loginOnly: true });
  }));
  $$('[data-chat-link]').forEach(btn => btn.addEventListener('click', e => {
    const menu = $('#menu'), burger = $('#burger'); if (menu) menu.classList.remove('open');
    if (burger) { burger.setAttribute('aria-expanded', 'false'); burger.textContent = 'Menu'; }
    if (!me) {
      e.preventDefault();
      openIntake({ loginOnly: true, chatAfter: true });
    }
  }));
  $('#mode-in').addEventListener('click', () => setMode('login')); $('#mode-up').addEventListener('click', () => setMode('register'));
  $('#s-forgot').addEventListener('click', () => { setMode('forgot'); $('#s-email').focus(); });
  backBtn.addEventListener('click', () => setMode('login'));
  $('#s-show').addEventListener('change', e => { $('#s-pass').type = e.target.checked ? 'text' : 'password'; });
  $('#iclose').addEventListener('click', closeIntake);
  addEventListener('keydown', e => { if (e.key === 'Escape' && state.intake.open) closeIntake(); });
  $('#iform').addEventListener('submit', e => { e.preventDefault(); submit(); });
  nextBtn.addEventListener('click', submit);
  api('/api/client/session').then(r => { if (r.ok && r.body.signedIn) { me = r.body; paintHeader(); } });   // remembered login: header shows Profile
  if (new URLSearchParams(location.search).get('signin') === '1') {   // sent back here because they were not logged in
    const auto = () => openIntake({ loginOnly: true, chatAfter: location.hash === '#chat' });
    document.readyState === 'complete' ? setTimeout(auto, 0) : addEventListener('load', () => setTimeout(auto, 0));
  }
  return { open: openIntake, close: closeIntake };
}
