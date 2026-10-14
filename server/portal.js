// Client portal API: password accounts, persistent login, quotes, comments, approvals (staff side included).
// Authorization rule: a client can only ever read or change rows whose client_id is their own.
import { randomBytes, randomInt, createHash, timingSafeEqual } from 'node:crypto';
import { hashPassword, verifyPassword, DUMMY_HASH, clientPasswordError } from './auth.js';
import { catalog, suggest, suggestReqs, cleanSelection, price, PLANS, PAYMENT_NOTE } from './pricing.js';
import { TERMS_VERSION } from './legal.js';

const sha = s => createHash('sha256').update(s).digest('hex');
const EMAIL = /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]{2,}$/;
const ctrl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;
const one = (v, max) => typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').replace(ctrl, '').trim().slice(0, max) : '';
const multi = (v, max) => typeof v === 'string' ? v.replace(/\r\n?/g, '\n').replace(ctrl, '').trim().slice(0, max) : '';
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
const REMEMBER = 30 * 86400e3;                       // "remember me": stay signed in for 30 days
const PROJECT = ['received', 'planning', 'building', 'review', 'delivered'];
const LABEL = { draft: 'Draft', submitted: 'Pending', negotiating: 'Pending', accepted: 'Accepted', declined: 'Rejected' };

export function createPortal(c) {
  const { db, rl, send, fail, readJson, originOk, cookies, clientIp, prod, mailer, notify, env, audit, requireAdmin, adminMail } = c;
  const CK = prod ? '__Host-apeiron_c' : 'apeiron_c';
  const ck = (v, age) => `${CK}=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${prod ? '; Secure' : ''}`;
  const pepper = db.prepare("SELECT v FROM meta WHERE k='ip_salt'").get().v;
  const codeHash = (email, code) => sha(`${pepper}:${email}:${code}`);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const info = r => ({ email: r.email, name: r.name || '', company: r.company || '', phone: r.phone || '' });

  function lookup(req) {          // returns the live session or null, never writes a response
    const t = cookies(req)[CK];
    if (!/^[a-f0-9]{64}$/.test(t || '')) return null;
    const id = sha(t), now = Date.now(), s = db.prepare('SELECT s.*, c.email, c.name, c.company, c.phone FROM csessions s JOIN clients c ON c.id=s.client_id WHERE s.id=?').get(id);
    if (!s || s.expires_at < now || now - s.last_seen > REMEMBER) { if (s) db.prepare('DELETE FROM csessions WHERE id=?').run(id); return null; }
    return s;
  }
  function session(req, mutating, res) {
    const s = lookup(req);
    if (!s) { fail(res, 401, 'Please log in.'); return null; }
    if (mutating) {
      const h = req.headers['x-csrf-token'];
      if (!originOk(req) || typeof h !== 'string' || h.length !== s.csrf.length || !timingSafeEqual(Buffer.from(h), Buffer.from(s.csrf))) { fail(res, 403, 'Request blocked.'); return null; }
    }
    db.prepare('UPDATE csessions SET last_seen=? WHERE id=?').run(Date.now(), s.id);
    return s;
  }
  function startSession(clientId) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(24).toString('hex'), now = Date.now();
    db.prepare('DELETE FROM csessions WHERE client_id=? AND expires_at < ?').run(clientId, now);
    db.prepare('INSERT INTO csessions(id,client_id,csrf,created_at,expires_at,last_seen) VALUES(?,?,?,?,?,?)').run(sha(token), clientId, csrf, now, now + REMEMBER, now);
    return { csrf, cookie: ck(token, REMEMBER / 1000) };
  }
  const view = q => {
    const services = JSON.parse(q.services), reqs = JSON.parse(q.reqs), notes = JSON.parse(q.notes);
    return { id: q.id, idea: q.idea, name: q.name, company: q.company, phone: q.phone, services, reqs, notes, plan: q.plan, status: q.status, status_label: LABEL[q.status] || q.status, project_status: q.project_status,
      created_at: q.created_at, updated_at: q.updated_at, locked: q.status !== 'draft', pricing: services.length ? price(services, reqs) : null,
      comments: db.prepare('SELECT author,message,created_at FROM quote_comments WHERE quote_id=? ORDER BY id').all(q.id) };
  };
  const own = (s, id) => db.prepare('SELECT * FROM quotes WHERE id=? AND client_id=?').get(id, s.client_id);
  const needTerms = u => u.terms_version !== TERMS_VERSION;
  const termsMsg = 'Please accept the Terms and Conditions and the Privacy Policy to continue.';

  return async function handle(req, res, url) {
    const p = url.pathname, m = req.method, ip = clientIp(req);
    if (p === '/api/catalog' && m === 'GET') return send(res, 200, catalog()), true;

    // ---------------- accounts ----------------
    if (p === '/api/client/register' && m === 'POST') {
      const b = await readJson(req, 2048), name = one(b.name, 100), email = one(b.email, 254).toLowerCase(), pw = typeof b.password === 'string' ? b.password : '';
      if (!name) return fail(res, 400, 'Please add your name.'), true;
      if (!EMAIL.test(email)) return fail(res, 400, 'Please enter a valid email address.'), true;
      if (b.acceptTerms !== true) return fail(res, 400, 'You must accept the Terms and Conditions and the Privacy Policy to create an account.'), true;
      const pe = clientPasswordError(pw, email); if (pe) return fail(res, 400, pe), true;
      const w = rl.hit('reg-ip:' + ip, 5, 3600e3); if (w) return fail(res, 429, 'Too many sign-ups from this address. Please try again later.', { 'Retry-After': w }), true;
      if (db.prepare('SELECT 1 FROM clients WHERE email=?').get(email)) return fail(res, 409, 'An account with this email already exists. Log in, or choose "Forgot password".'), true;
      const hash = await hashPassword(pw), now = Date.now();
      try { db.prepare('INSERT INTO clients(email,name,pass_hash,terms_version,terms_at,consent_at,created_at) VALUES(?,?,?,?,?,?,?)').run(email, name, hash, TERMS_VERSION, now, now, now); }
      catch (_) { return fail(res, 409, 'An account with this email already exists. Log in, or choose "Forgot password".'), true; }
      const cl = db.prepare('SELECT id FROM clients WHERE email=?').get(email), ss = startSession(cl.id); audit(db, 'client:' + cl.id, 'register', '');
      return send(res, 201, { ok: true, email, name, csrf: ss.csrf }, { 'Set-Cookie': ss.cookie }), true;
    }
    if (p === '/api/client/login' && m === 'POST') {
      const w = rl.hit('login-ip:' + ip, 10, 900e3); if (w) return fail(res, 429, 'Too many attempts. Please try again later.', { 'Retry-After': w }), true;
      const b = await readJson(req, 2048), email = one(b.email, 254).toLowerCase(), pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
      const u = db.prepare('SELECT * FROM clients WHERE email=?').get(email), now = Date.now(), locked = !!u && u.locked_until > now;
      const good = await verifyPassword(pw, u && u.pass_hash ? u.pass_hash : DUMMY_HASH);   // always hash: same timing for every case
      if (!u || !u.pass_hash || locked || !good) {
        if (u && u.pass_hash && !locked) { const f = u.failed + 1; db.prepare('UPDATE clients SET failed=?, locked_until=? WHERE id=?').run(f >= 5 ? 0 : f, f >= 5 ? now + 900e3 : 0, u.id); if (f >= 5) audit(db, 'client:' + u.id, 'lockout', ''); }
        return fail(res, 401, 'Invalid email or password.'), true;     // same message for every kind of failure
      }
      if (needTerms(u)) {
        if (b.acceptTerms !== true) return send(res, 409, { error: termsMsg, needsTerms: true }), true;
        db.prepare('UPDATE clients SET terms_version=?, terms_at=? WHERE id=?').run(TERMS_VERSION, now, u.id);
      }
      db.prepare('UPDATE clients SET failed=0, locked_until=0 WHERE id=?').run(u.id);
      const ss = startSession(u.id); return send(res, 200, { ok: true, email, name: u.name, csrf: ss.csrf }, { 'Set-Cookie': ss.cookie }), true;
    }
    if (p === '/api/client/forgot' && m === 'POST') {
      const email = one((await readJson(req, 1024)).email, 254).toLowerCase();
      if (!EMAIL.test(email)) return fail(res, 400, 'Please enter a valid email address.'), true;
      const w = rl.hit('code-ip:' + ip, 10, 3600e3) || rl.hit('code-em:' + email, 3, 600e3);
      if (w) return fail(res, 429, 'Too many requests. Please wait a few minutes.', { 'Retry-After': w }), true;
      if (!mailer.configured && prod) return fail(res, 503, 'Password reset by email is not available right now. Please email us instead.'), true;
      const out = { ok: true, delivery: 'email' };
      if (db.prepare('SELECT 1 FROM clients WHERE email=?').get(email)) {
        const code = String(randomInt(100000, 1000000));
        db.prepare('INSERT INTO login_codes(email,code_hash,expires_at,attempts) VALUES(?,?,?,0) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0').run(email, codeHash(email, code), Date.now() + 600e3);
        if (mailer.configured) {
          const sent = await mailer.send({ to: email, subject: 'Your Apeiron password reset code', text: `Your password reset code is ${code}.\nIt expires in 10 minutes. If you did not ask for it, ignore this email: your password has not changed.` });
          if (!sent) return fail(res, 503, 'We could not send the email right now. Please try again in a minute.'), true;
        } else { console.log(`\n[LOCAL MODE] Password reset code for ${email}: ${code}\n`); out.delivery = 'terminal'; if (!prod && env.DEV_SHOW_CODE === '1') out.devCode = code; }
      } else { await wait(700 + randomInt(0, 500)); if (!mailer.configured) out.delivery = 'terminal'; }   // unknown email: same reply, similar delay
      return send(res, 200, out), true;
    }
    if (p === '/api/client/reset' && m === 'POST') {
      const w = rl.hit('reset-ip:' + ip, 20, 900e3); if (w) return fail(res, 429, 'Too many attempts. Please try again later.', { 'Retry-After': w }), true;
      const b = await readJson(req, 2048), email = one(b.email, 254).toLowerCase(), code = one(b.code, 6), pw = typeof b.password === 'string' ? b.password : '';
      const row = db.prepare('SELECT * FROM login_codes WHERE email=?').get(email), u = db.prepare('SELECT * FROM clients WHERE email=?').get(email), bad = () => fail(res, 400, 'That code is wrong or has expired.');
      if (!row || !u || row.expires_at < Date.now() || row.attempts >= 5 || !/^\d{6}$/.test(code)) return bad(), true;
      const a = Buffer.from(codeHash(email, code)), z = Buffer.from(row.code_hash);
      if (a.length !== z.length || !timingSafeEqual(a, z)) { db.prepare('UPDATE login_codes SET attempts=attempts+1 WHERE email=?').run(email); return bad(), true; }
      const pe = clientPasswordError(pw, email); if (pe) return fail(res, 400, pe), true;      // code stays valid so they can retry
      if (needTerms(u) && b.acceptTerms !== true) return send(res, 409, { error: termsMsg, needsTerms: true }), true;
      db.prepare('DELETE FROM login_codes WHERE email=?').run(email);                             // a code works once
      const now = Date.now();
      db.prepare('UPDATE clients SET pass_hash=?, failed=0, locked_until=0, terms_version=?, terms_at=CASE WHEN terms_version=? THEN terms_at ELSE ? END WHERE id=?').run(await hashPassword(pw), TERMS_VERSION, TERMS_VERSION, now, u.id);
      db.prepare('DELETE FROM csessions WHERE client_id=?').run(u.id);                            // a reset signs out every other device
      audit(db, 'client:' + u.id, 'password-reset', ''); const ss = startSession(u.id);
      return send(res, 200, { ok: true, email, name: u.name, csrf: ss.csrf }, { 'Set-Cookie': ss.cookie }), true;
    }
    if (p === '/api/client/session' && m === 'GET') {      // used by the page header; answers 200 either way so the console stays quiet
      const s = lookup(req); return send(res, 200, s ? { signedIn: true, ...info(s), csrf: s.csrf } : { signedIn: false }), true;
    }
    if (p === '/api/client/me' && m === 'GET') { const s = session(req, false, res); if (s) send(res, 200, { ...info(s), csrf: s.csrf }); return true; }
    if (p === '/api/client/logout' && m === 'POST') { const s = session(req, true, res); if (!s) return true; db.prepare('DELETE FROM csessions WHERE id=?').run(s.id); return send(res, 200, { ok: true }, { 'Set-Cookie': ck('', 0) }), true; }
    if (p === '/api/client/profile' && m === 'PATCH') {
      const s = session(req, true, res); if (!s) return true;
      const b = await readJson(req, 1024), name = one(b.name, 100); if (!name) return fail(res, 400, 'Please enter your name.'), true;
      db.prepare('UPDATE clients SET name=?, company=?, phone=? WHERE id=?').run(name, one(b.company, 100), one(b.phone, 50), s.client_id); return send(res, 200, { ok: true, name }), true;
    }
    if (p === '/api/client/account/delete' && m === 'POST') {
      const s = session(req, true, res); if (!s) return true;
      const w = rl.hit('del:' + s.client_id, 5, 900e3); if (w) return fail(res, 429, 'Too many attempts. Please try again later.'), true;
      const b = await readJson(req, 1024), u = db.prepare('SELECT pass_hash FROM clients WHERE id=?').get(s.client_id);
      if (!(await verifyPassword(typeof b.password === 'string' ? b.password.slice(0, 200) : '', u.pass_hash || DUMMY_HASH)) || !u.pass_hash) return fail(res, 401, 'That password is not correct.'), true;
      db.prepare('DELETE FROM clients WHERE id=?').run(s.client_id); audit(db, 'client:' + s.client_id, 'account-deleted', '');   // quotes, comments and sessions cascade
      return send(res, 200, { ok: true }, { 'Set-Cookie': ck('', 0) }), true;
    }

    // ---------------- quotes ----------------
    if (p === '/api/client/quotes' && m === 'GET') {
      const s = session(req, false, res); if (!s) return true;
      return send(res, 200, { quotes: db.prepare('SELECT * FROM quotes WHERE client_id=? ORDER BY id DESC LIMIT 50').all(s.client_id).map(view) }), true;
    }
    if (p === '/api/client/quotes' && m === 'POST') {
      const s = session(req, true, res); if (!s) return true;
      if (rl.hit('quote:' + s.client_id, 10, 3600e3)) return fail(res, 429, 'Too many requests. Please try again later.'), true;
      const idea = multi((await readJson(req, 4096)).idea, 1200);
      if (idea.length < 3 || idea.length > 1000) return fail(res, 400, 'Please describe what you want to build in 3 to 1000 characters.'), true;
      const sg = suggest(idea), now = Date.now();
      const r = db.prepare('INSERT INTO quotes(client_id,idea,name,company,phone,services,reqs,consent,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)').run(s.client_id, idea, s.name || 'Client', s.company || '', s.phone || '', JSON.stringify(sg.keys), JSON.stringify(suggestReqs(idea, sg.keys)), now, now);
      return send(res, 201, { id: Number(r.lastInsertRowid) }), true;
    }
    const q1 = /^\/api\/client\/quotes\/(\d{1,9})(?:\/(comments|submit))?$/.exec(p);
    if (q1) {
      const id = +q1[1], act = q1[2], s = session(req, m !== 'GET', res); if (!s) return true;
      const q = own(s, id); if (!q) return fail(res, 404, 'Not found.'), true;
      if (!act && m === 'GET') { const sg = suggest(q.idea); return send(res, 200, { quote: view(q), analysis: { keys: sg.keys, reasons: sg.reasons, reqs: suggestReqs(q.idea, Object.keys(catalog().services)) }, paymentNote: PAYMENT_NOTE, termsVersion: TERMS_VERSION }), true; }
      if (!act && m === 'PUT') {
        if (q.status !== 'draft') return fail(res, 409, 'This request has already been sent.'), true;
        const v = cleanSelection(await readJson(req, 8192)); if (!v.ok) return fail(res, 400, v.error), true;
        db.prepare('UPDATE quotes SET services=?, reqs=?, notes=?, updated_at=? WHERE id=?').run(JSON.stringify(v.value.services), JSON.stringify(v.value.reqs), JSON.stringify(v.value.notes), Date.now(), id);
        return send(res, 200, { quote: view(own(s, id)) }), true;
      }
      if (act === 'comments' && m === 'POST') {
        if (q.status === 'declined') return fail(res, 409, 'This request was closed. Please start a new one.'), true;
        if (rl.hit('cmt:' + s.client_id, 20, 3600e3)) return fail(res, 429, 'Too many messages. Please try again later.'), true;
        const msg = multi((await readJson(req, 4096)).message, 1000); if (msg.length < 2) return fail(res, 400, 'Please write your message.'), true;
        db.prepare('INSERT INTO quote_comments(quote_id,author,message,created_at) VALUES(?,?,?,?)').run(id, 'client', msg, Date.now()); db.prepare('UPDATE quotes SET updated_at=? WHERE id=?').run(Date.now(), id);
        if (q.status !== 'draft') { notify(`Request #${id}: new comment from ${s.email}`); adminMail(`New comment on request #${id}`, `${s.name || s.email} wrote on request #${id}:\n\n${msg}\n\nOpen the admin website to reply.`); }
        return send(res, 200, { ok: true, quote: view(own(s, id)) }), true;
      }
      if (act === 'submit' && m === 'POST') {
        if (q.status !== 'draft') return fail(res, 409, 'This request has already been sent.'), true;
        const b = await readJson(req, 4096), plan = b.plan; if (!['subscription', 'build'].includes(plan)) return fail(res, 400, 'Choose a plan first.'), true;
        const services = JSON.parse(q.services); if (!services.length) return fail(res, 400, 'Choose at least one option first.'), true;
        const pr = price(services, JSON.parse(q.reqs)), total = pr.plans[plan].total, monthly = plan === 'subscription' ? pr.plans.subscription.monthly : 0, now = Date.now(), msg = multi(b.comment, 1000);
        db.prepare("UPDATE quotes SET plan=?, build_total=?, monthly=?, status='submitted', updated_at=? WHERE id=?").run(plan, total, monthly, now, id);
        if (msg) db.prepare('INSERT INTO quote_comments(quote_id,author,message,created_at) VALUES(?,?,?,?)').run(id, 'client', msg, now);
        audit(db, 'client:' + s.client_id, 'quote-submit', id); notify(`Request #${id} sent by ${s.email} (${plan}, ${inr(total)})`);
        const list = pr.lines.map(l => `- ${l.name}: ${inr(l.total)}`).join('\n');
        adminMail(`New project request #${id} from ${s.name || s.email}`, `New request #${id}\nClient: ${s.name} <${s.email}>${s.company ? '\nCompany: ' + s.company : ''}${s.phone ? '\nPhone: ' + s.phone : ''}\n\nIdea:\n${q.idea}\n\nSelected:\n${list}\n\nPlan: ${PLANS[plan].name}\nBuild: ${inr(total)}${monthly ? `\nSubscription fee: ${inr(monthly)} per month` : ''}${msg ? `\n\nClient comment:\n${msg}` : ''}\n\nOpen the admin website to approve or reject.`);
        mailer.send({ to: s.email, subject: `We received your request #${id}`, text: `Thank you for choosing Apeiron.\n\nYour selection:\n${list}\n\nPlan: ${PLANS[plan].name}\nBuild price: ${inr(total)}${monthly ? `\nThen ${inr(monthly)} per month for updates and fixes` : ''}\n\nStatus: Pending. We will email you when it is approved. These are estimates excluding taxes; the final price is confirmed in writing before work starts.` });
        return send(res, 200, { ok: true, total, monthly, status: 'submitted', emailed: mailer.configured }), true;
      }
      return fail(res, 405, 'Method not allowed.'), true;
    }

    // ---------------- staff side (served only on the admin website) ----------------
    if (p === '/api/admin/quotes' && m === 'GET') {
      if (!requireAdmin(req, res, false)) return true;
      const rows = db.prepare('SELECT q.*, c.email, c.name AS cname, c.company AS ccompany, c.phone AS cphone FROM quotes q JOIN clients c ON c.id=q.client_id ORDER BY q.id DESC LIMIT 100').all();
      return send(res, 200, { rows: rows.map(r => ({ ...view(r), email: r.email, build_total: r.build_total, monthly: r.monthly })) }), true;
    }
    const a1 = /^\/api\/admin\/quotes\/(\d{1,9})(?:\/(decision|comments))?$/.exec(p);
    if (a1) {
      const id = +a1[1], act = a1[2], s = requireAdmin(req, res, m !== 'GET'); if (!s) return true;
      const q = db.prepare('SELECT q.*, c.email FROM quotes q JOIN clients c ON c.id=q.client_id WHERE q.id=?').get(id); if (!q) return fail(res, 404, 'Not found.'), true;
      if (!act && m === 'PATCH') {
        const b = await readJson(req, 1024), set = [], args = [];
        if (b.status !== undefined) { if (!['draft', 'submitted', 'accepted', 'declined'].includes(b.status)) return fail(res, 400, 'Invalid status.'), true; set.push('status=?'); args.push(b.status); }
        if (b.project_status !== undefined) { if (!PROJECT.includes(b.project_status)) return fail(res, 400, 'Invalid project status.'), true; set.push('project_status=?'); args.push(b.project_status); }
        if (!set.length) return fail(res, 400, 'Nothing to update.'), true;
        db.prepare(`UPDATE quotes SET ${set.join(',')}, updated_at=? WHERE id=?`).run(...args, Date.now(), id); audit(db, s.email, 'quote-update', id); return send(res, 200, { ok: true }), true;
      }
      if (act === 'decision' && m === 'POST') {
        const b = await readJson(req, 4096), d = b.decision, msg = multi(b.message, 1000);
        if (!['accept', 'reject'].includes(d)) return fail(res, 400, 'Choose accept or reject.'), true;
        if (q.status === 'draft') return fail(res, 409, 'The client has not sent this request yet.'), true;
        const status = d === 'accept' ? 'accepted' : 'declined', now = Date.now();
        db.prepare('UPDATE quotes SET status=?, updated_at=? WHERE id=?').run(status, now, id);
        if (msg) db.prepare('INSERT INTO quote_comments(quote_id,author,message,created_at) VALUES(?,?,?,?)').run(id, 'admin', msg, now);
        audit(db, s.email, 'quote-' + d, id);
        mailer.send({ to: q.email, subject: d === 'accept' ? `Your request #${id} was approved` : `Update on your request #${id}`, text: d === 'accept' ? `Good news: Apeiron approved your request #${id}.${msg ? `\n\nMessage from Apeiron:\n${msg}` : ''}\n\nWe will contact you about the next steps. You can follow progress after logging in.` : `Apeiron could not approve your request #${id} as sent.${msg ? `\n\nMessage from Apeiron:\n${msg}` : ''}\n\nYou are welcome to reply or start a new request after logging in.` });
        return send(res, 200, { ok: true, status }), true;
      }
      if (act === 'comments' && m === 'POST') {
        const msg = multi((await readJson(req, 4096)).message, 1000); if (msg.length < 2) return fail(res, 400, 'Please write your reply.'), true;
        db.prepare('INSERT INTO quote_comments(quote_id,author,message,created_at) VALUES(?,?,?,?)').run(id, 'admin', msg, Date.now()); db.prepare('UPDATE quotes SET updated_at=? WHERE id=?').run(Date.now(), id);
        mailer.send({ to: q.email, subject: `Apeiron replied to your request #${id}`, text: `Apeiron wrote:\n\n${msg}\n\nLog in to reply.` });
        return send(res, 200, { ok: true }), true;
      }
      return fail(res, 405, 'Method not allowed.'), true;
    }
    return false;
  };
}
