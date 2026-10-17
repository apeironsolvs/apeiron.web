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
  let cachedPepper = null;
  const getPepper = async () => cachedPepper || (cachedPepper = await db.getIpSalt());
  const codeHash = async (email, code) => sha(`${await getPepper()}:${email}:${code}`);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const info = r => ({ email: r.email, name: r.name || '', company: r.company || '', phone: r.phone || '' });

  async function lookup(req) {          // returns the live session or null, never writes a response
    const c = cookies(req);
    const t = c[CK] || c['apeiron_c'] || c['__Host-apeiron_c'];
    if (!/^[a-f0-9]{64}$/.test(t || '')) return null;
    const id = sha(t), now = Date.now(), s = await db.csessions.get(id);
    if (!s || s.expires_at < now || now - s.last_seen > REMEMBER) { if (s) await db.csessions.delete(id); return null; }
    return s;
  }
  async function session(req, mutating, res) {
    const s = await lookup(req);
    if (!s) { fail(res, 401, 'Please log in.'); return null; }
    if (mutating) {
      const h = req.headers['x-csrf-token'];
      if (!originOk(req) || typeof h !== 'string' || h.length !== s.csrf.length || !timingSafeEqual(Buffer.from(h), Buffer.from(s.csrf))) { fail(res, 403, 'Request blocked.'); return null; }
    }
    await db.csessions.touch(s.id, Date.now());
    return s;
  }
  async function startSession(clientId) {
    const token = randomBytes(32).toString('hex'), csrf = randomBytes(24).toString('hex'), now = Date.now();
    await db.csessions.deleteByClientId(clientId);
    await db.csessions.create({ id: sha(token), client_id: clientId, csrf, created_at: now, expires_at: now + REMEMBER, last_seen: now });
    return { csrf, cookie: ck(token, REMEMBER / 1000) };
  }
  const view = async q => {
    const services = typeof q.services === 'string' ? JSON.parse(q.services) : (q.services || []);
    const reqs = typeof q.reqs === 'string' ? JSON.parse(q.reqs) : (q.reqs || {});
    const notes = typeof q.notes === 'string' ? JSON.parse(q.notes) : (q.notes || {});
    const comments = await db.quoteComments.listByQuote(q.id);
    return { id: q.id, idea: q.idea, name: q.name, company: q.company, phone: q.phone, services, reqs, notes, plan: q.plan, status: q.status, status_label: LABEL[q.status] || q.status, project_status: q.project_status,
      created_at: q.created_at, updated_at: q.updated_at, locked: q.status !== 'draft', pricing: services.length ? price(services, reqs) : null,
      comments };
  };
  const own = async (s, id) => await db.quotes.getByIdAndClient(id, s.client_id);
  const needTerms = u => u.terms_version !== TERMS_VERSION;
  const termsMsg = 'Please accept the Terms and Conditions and the Privacy Policy to continue.';

  return async function handle(req, res, url) {
    const p = url.pathname, m = req.method, ip = clientIp(req);
    if (p === '/api/catalog' && m === 'GET') return send(res, 200, catalog()), true;

    // ---------------- project status (privacy-isolated, requires exact ID + email match) ----------------
    if (p === '/api/project-status' && m === 'POST') {
      const w = rl.hit('pstatus-ip:' + ip, 25, 600e3);
      if (w) return fail(res, 429, 'Too many status inquiries. Please try again later.', { 'Retry-After': w }), true;
      const b = await readJson(req, 2048);
      const rawId = String(b.id || '').replace(/[^0-9]/g, '');
      const id = parseInt(rawId, 10);
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 254) : '';

      if (!id || id <= 0) return fail(res, 400, 'Please provide a valid project ID number.'), true;
      if (!EMAIL.test(email)) return fail(res, 400, 'Please provide a valid registered email address.'), true;

      const q = await db.quotes.getById(id);
      // Privacy & isolation check: the registered email must match the quote's client email exactly.
      // If no match or not found, return generic 404 to prevent enumeration/interception of other users' projects.
      if (!q || !q.email || q.email.toLowerCase().trim() !== email) {
        return fail(res, 404, 'No project found matching that Request ID and email address.'), true;
      }

      const services = typeof q.services === 'string' ? JSON.parse(q.services) : (q.services || []);
      const reqs = typeof q.reqs === 'string' ? JSON.parse(q.reqs) : (q.reqs || {});
      const pr = services.length ? price(services, reqs) : null;
      const planName = q.plan && pr && pr.plans[q.plan] ? PLANS[q.plan].name : (q.plan || 'Draft');

      return send(res, 200, {
        ok: true,
        project: {
          id: q.id,
          title: q.idea ? (q.idea.length > 70 ? q.idea.slice(0, 70) + '…' : q.idea) : `Project #${q.id}`,
          status: q.status,
          status_label: LABEL[q.status] || q.status,
          project_status: q.project_status,
          plan: planName,
          services_count: services.length,
          created_at: q.created_at,
          updated_at: q.updated_at
        }
      }), true;
    }

    // ---------------- accounts ----------------
    if (p === '/api/client/register' && m === 'POST') {
      const b = await readJson(req, 2048), name = one(b.name, 100), email = one(b.email, 254).toLowerCase(), pw = typeof b.password === 'string' ? b.password : '';
      if (!name) return fail(res, 400, 'Please add your name.'), true;
      if (!EMAIL.test(email)) return fail(res, 400, 'Please enter a valid email address.'), true;
      if (b.acceptTerms !== true) return fail(res, 400, 'You must accept the Terms and Conditions and the Privacy Policy to create an account.'), true;
      const pe = clientPasswordError(pw, email); if (pe) return fail(res, 400, pe), true;
      const w = rl.hit('reg-ip:' + ip, 5, 3600e3); if (w) return fail(res, 429, 'Too many sign-ups from this address. Please try again later.', { 'Retry-After': w }), true;
      if (await db.clients.getByEmail(email)) return fail(res, 409, 'An account with this email already exists. Log in, or choose "Forgot password".'), true;
      const hash = await hashPassword(pw), now = Date.now();
      try { await db.clients.create({ email, name, pass_hash: hash, terms_version: TERMS_VERSION, terms_at: now, consent_at: now, created_at: now }); }
      catch (_) { return fail(res, 409, 'An account with this email already exists. Log in, or choose "Forgot password".'), true; }
      const cl = await db.clients.getByEmail(email), ss = await startSession(cl.id); await audit(db, 'client:' + cl.id, 'register', '');
      return send(res, 201, { ok: true, email, name, csrf: ss.csrf }, { 'Set-Cookie': ss.cookie }), true;
    }
    if (p === '/api/client/login' && m === 'POST') {
      const w = rl.hit('login-ip:' + ip, 10, 900e3); if (w) return fail(res, 429, 'Too many attempts. Please try again later.', { 'Retry-After': w }), true;
      const b = await readJson(req, 2048), email = one(b.email, 254).toLowerCase(), pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
      const u = await db.clients.getByEmail(email), now = Date.now(), locked = !!u && u.locked_until > now;
      const good = await verifyPassword(pw, u && u.pass_hash ? u.pass_hash : DUMMY_HASH);   // always hash: same timing for every case
      if (!u || !u.pass_hash || locked || !good) {
        if (u && u.pass_hash && !locked) { const f = u.failed + 1; await db.clients.updateLockout(u.id, f >= 5 ? 0 : f, f >= 5 ? now + 900e3 : 0); if (f >= 5) await audit(db, 'client:' + u.id, 'lockout', ''); }
        return fail(res, 401, 'Invalid email or password.'), true;     // same message for every kind of failure
      }
      if (needTerms(u)) {
        if (b.acceptTerms !== true) return send(res, 409, { error: termsMsg, needsTerms: true }), true;
        await db.clients.updateTerms(u.id, TERMS_VERSION, now);
      }
      await db.clients.resetLockout(u.id);
      const ss = await startSession(u.id); return send(res, 200, { ok: true, email, name: u.name, csrf: ss.csrf }, { 'Set-Cookie': ss.cookie }), true;
    }
    if (p === '/api/client/forgot' && m === 'POST') {
      const email = one((await readJson(req, 1024)).email, 254).toLowerCase();
      if (!EMAIL.test(email)) return fail(res, 400, 'Please enter a valid email address.'), true;
      const w = rl.hit('code-ip:' + ip, 10, 3600e3) || rl.hit('code-em:' + email, 3, 600e3);
      if (w) return fail(res, 429, 'Too many requests. Please wait a few minutes.', { 'Retry-After': w }), true;
      if (!mailer.configured && prod) return fail(res, 503, 'Password reset by email is not available right now. Please email us instead.'), true;
      const out = { ok: true, delivery: 'email' };
      if (await db.clients.getByEmail(email)) {
        const code = String(randomInt(100000, 1000000));
        await db.loginCodes.upsert({ email, code_hash: await codeHash(email, code), expires_at: Date.now() + 600e3, attempts: 0 });
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
      const row = await db.loginCodes.get(email), u = await db.clients.getByEmail(email), bad = () => fail(res, 400, 'That code is wrong or has expired.');
      if (!row || !u || row.expires_at < Date.now() || row.attempts >= 5 || !/^\d{6}$/.test(code)) return bad(), true;
      const a = Buffer.from(await codeHash(email, code)), z = Buffer.from(row.code_hash);
      if (a.length !== z.length || !timingSafeEqual(a, z)) { await db.loginCodes.updateAttempts(email, (row.attempts || 0) + 1); return bad(), true; }
      const pe = clientPasswordError(pw, email); if (pe) return fail(res, 400, pe), true;      // code stays valid so they can retry
      if (needTerms(u) && b.acceptTerms !== true) return send(res, 409, { error: termsMsg, needsTerms: true }), true;
      await db.loginCodes.delete(email);                             // a code works once
      const now = Date.now();
      await db.clients.updatePassword(email, await hashPassword(pw));
      await db.clients.resetLockout(u.id);
      if (needTerms(u)) { await db.clients.updateTerms(u.id, TERMS_VERSION, now); }
      await db.csessions.deleteByClientId(u.id);                            // a reset signs out every other device
      await audit(db, 'client:' + u.id, 'password-reset', ''); const ss = await startSession(u.id);
      return send(res, 200, { ok: true, email, name: u.name, csrf: ss.csrf }, { 'Set-Cookie': ss.cookie }), true;
    }
    if (p === '/api/client/session' && m === 'GET') {      // used by the page header; answers 200 either way so the console stays quiet
      const s = await lookup(req); return send(res, 200, s ? { signedIn: true, ...info(s), csrf: s.csrf } : { signedIn: false }), true;
    }
    if (p === '/api/client/me' && m === 'GET') { const s = await session(req, false, res); if (s) send(res, 200, { ...info(s), csrf: s.csrf }); return true; }
    if (p === '/api/client/logout' && m === 'POST') { const s = await session(req, true, res); if (!s) return true; await db.csessions.delete(s.id); return send(res, 200, { ok: true }, { 'Set-Cookie': ck('', 0) }), true; }
    if (p === '/api/client/profile' && m === 'PATCH') {
      const s = await session(req, true, res); if (!s) return true;
      const b = await readJson(req, 1024), name = one(b.name, 100); if (!name) return fail(res, 400, 'Please enter your name.'), true;
      await db.clients.updateProfile(s.client_id, { name, company: one(b.company, 100), phone: one(b.phone, 50) }); return send(res, 200, { ok: true, name }), true;
    }
    if (p === '/api/client/account/delete' && m === 'POST') {
      const s = await session(req, true, res); if (!s) return true;
      const w = rl.hit('del:' + s.client_id, 5, 900e3); if (w) return fail(res, 429, 'Too many attempts. Please try again later.'), true;
      const b = await readJson(req, 1024), u = await db.clients.getById(s.client_id);
      if (!(await verifyPassword(typeof b.password === 'string' ? b.password.slice(0, 200) : '', u.pass_hash || DUMMY_HASH)) || !u.pass_hash) return fail(res, 401, 'That password is not correct.'), true;
      await db.clients.delete(s.client_id); await audit(db, 'client:' + s.client_id, 'account-deleted', '');   // quotes, comments and sessions cascade
      return send(res, 200, { ok: true }, { 'Set-Cookie': ck('', 0) }), true;
    }

    // ---------------- quotes ----------------
    if (p === '/api/client/quotes' && m === 'GET') {
      const s = await session(req, false, res); if (!s) return true;
      const rawRows = await db.quotes.listByClient(s.client_id);
      const quotes = await Promise.all(rawRows.map(view));
      return send(res, 200, { quotes }), true;
    }
    if (p === '/api/client/quotes' && m === 'POST') {
      const s = await session(req, true, res); if (!s) return true;
      if (rl.hit('quote:' + s.client_id, 10, 3600e3)) return fail(res, 429, 'Too many requests. Please try again later.'), true;
      const idea = multi((await readJson(req, 4096)).idea, 1200);
      if (idea.length < 3 || idea.length > 1000) return fail(res, 400, 'Please describe what you want to build in 3 to 1000 characters.'), true;
      const sg = suggest(idea), now = Date.now();
      const r = await db.quotes.create({ client_id: s.client_id, idea, name: s.name || 'Client', company: s.company || '', phone: s.phone || '', services: JSON.stringify(sg.keys), reqs: JSON.stringify(suggestReqs(idea, sg.keys)), consent: 1, created_at: now, updated_at: now });
      return send(res, 201, { id: Number(r.id) }), true;
    }
    const q1 = /^\/api\/client\/quotes\/(\d{1,9})(?:\/(comments|submit))?$/.exec(p);
    if (q1) {
      const id = +q1[1], act = q1[2], s = await session(req, m !== 'GET', res); if (!s) return true;
      const q = await own(s, id); if (!q) return fail(res, 404, 'Not found.'), true;
      if (!act && m === 'GET') { const sg = suggest(q.idea); return send(res, 200, { quote: await view(q), analysis: { keys: sg.keys, reasons: sg.reasons, reqs: suggestReqs(q.idea, Object.keys(catalog().services)) }, paymentNote: PAYMENT_NOTE, termsVersion: TERMS_VERSION }), true; }
      if (!act && m === 'PUT') {
        if (q.status !== 'draft') return fail(res, 409, 'This request has already been sent.'), true;
        const v = cleanSelection(await readJson(req, 8192)); if (!v.ok) return fail(res, 400, v.error), true;
        await db.quotes.update(id, { services: JSON.stringify(v.value.services), reqs: JSON.stringify(v.value.reqs), notes: JSON.stringify(v.value.notes), updated_at: Date.now() });
        return send(res, 200, { quote: await view(await own(s, id)) }), true;
      }
      if (act === 'comments' && m === 'POST') {
        if (q.status === 'declined') return fail(res, 409, 'This request was closed. Please start a new one.'), true;
        if (rl.hit('cmt:' + s.client_id, 20, 3600e3)) return fail(res, 429, 'Too many messages. Please try again later.'), true;
        const msg = multi((await readJson(req, 4096)).message, 1000); if (msg.length < 2) return fail(res, 400, 'Please write your message.'), true;
        await db.quoteComments.create({ quote_id: id, author: 'client', message: msg, created_at: Date.now() });
        await db.quotes.update(id, { updated_at: Date.now() });
        if (q.status !== 'draft') { notify(`Request #${id}: new comment from ${s.email}`); adminMail(`New comment on request #${id}`, `${s.name || s.email} wrote on request #${id}:\n\n${msg}\n\nOpen the admin website to reply.`); }
        return send(res, 200, { ok: true, quote: await view(await own(s, id)) }), true;
      }
      if (act === 'submit' && m === 'POST') {
        if (q.status !== 'draft') return fail(res, 409, 'This request has already been sent.'), true;
        const b = await readJson(req, 4096), plan = b.plan; if (!['subscription', 'build'].includes(plan)) return fail(res, 400, 'Choose a plan first.'), true;
        const services = typeof q.services === 'string' ? JSON.parse(q.services) : (q.services || []);
        if (!services.length) return fail(res, 400, 'Choose at least one option first.'), true;
        const reqs = typeof q.reqs === 'string' ? JSON.parse(q.reqs) : (q.reqs || {});
        const pr = price(services, reqs), total = pr.plans[plan].total, monthly = plan === 'subscription' ? pr.plans.subscription.monthly : 0, now = Date.now(), msg = multi(b.comment, 1000);
        await db.quotes.update(id, { plan, build_total: total, monthly, status: 'submitted', updated_at: now });
        if (msg) await db.quoteComments.create({ quote_id: id, author: 'client', message: msg, created_at: now });
        await audit(db, 'client:' + s.client_id, 'quote-submit', id); notify(`Request #${id} sent by ${s.email} (${plan}, ${inr(total)})`);
        const list = pr.lines.map(l => `- ${l.name}: ${inr(l.total)}`).join('\n');
        adminMail(`New project request #${id} from ${s.name || s.email}`, `New request #${id}\nClient: ${s.name} <${s.email}>${s.company ? '\nCompany: ' + s.company : ''}${s.phone ? '\nPhone: ' + s.phone : ''}\n\nIdea:\n${q.idea}\n\nSelected:\n${list}\n\nPlan: ${PLANS[plan].name}\nBuild: ${inr(total)}${monthly ? `\nSubscription fee: ${inr(monthly)} per month` : ''}${msg ? `\n\nClient comment:\n${msg}` : ''}\n\nOpen the admin website to approve or reject.`);
        mailer.send({ to: s.email, subject: `We received your request #${id}`, text: `Thank you for choosing Apeiron.\n\nYour selection:\n${list}\n\nPlan: ${PLANS[plan].name}\nBuild price: ${inr(total)}${monthly ? `\nThen ${inr(monthly)} per month for updates and fixes` : ''}\n\nStatus: Pending. We will email you when it is approved. These are estimates excluding taxes; the final price is confirmed in writing before work starts.` });
        return send(res, 200, { ok: true, total, monthly, status: 'submitted', emailed: mailer.configured }), true;
      }
      return fail(res, 405, 'Method not allowed.'), true;
    }

    // ---------------- staff side (served only on the admin website) ----------------
    if (p === '/api/admin/quotes' && m === 'GET') {
      if (!await requireAdmin(req, res, false)) return true;
      const rows = await db.quotes.listForAdmin(100);
      const fullRows = await Promise.all(rows.map(async r => ({ ...(await view(r)), email: r.email, build_total: r.build_total, monthly: r.monthly })));
      return send(res, 200, { rows: fullRows }), true;
    }
    const a1 = /^\/api\/admin\/quotes\/(\d{1,9})(?:\/(decision|comments))?$/.exec(p);
    if (a1) {
      const id = +a1[1], act = a1[2], s = await requireAdmin(req, res, m !== 'GET'); if (!s) return true;
      const q = await db.quotes.getById(id); if (!q) return fail(res, 404, 'Not found.'), true;
      if (!act && m === 'PATCH') {
        const b = await readJson(req, 1024), updates = {};
        if (b.status !== undefined) { if (!['draft', 'submitted', 'accepted', 'declined'].includes(b.status)) return fail(res, 400, 'Invalid status.'), true; updates.status = b.status; }
        if (b.project_status !== undefined) { if (!PROJECT.includes(b.project_status)) return fail(res, 400, 'Invalid project status.'), true; updates.project_status = b.project_status; }
        if (!Object.keys(updates).length) return fail(res, 400, 'Nothing to update.'), true;
        updates.updated_at = Date.now();
        await db.quotes.update(id, updates); await audit(db, s.email, 'quote-update', id); return send(res, 200, { ok: true }), true;
      }
      if (act === 'decision' && m === 'POST') {
        const b = await readJson(req, 4096), d = b.decision, msg = multi(b.message, 1000);
        if (!['accept', 'reject'].includes(d)) return fail(res, 400, 'Choose accept or reject.'), true;
        if (q.status === 'draft') return fail(res, 409, 'The client has not sent this request yet.'), true;
        const status = d === 'accept' ? 'accepted' : 'declined', now = Date.now();
        await db.quotes.update(id, { status, updated_at: now });
        if (msg) await db.quoteComments.create({ quote_id: id, author: 'admin', message: msg, created_at: now });
        await audit(db, s.email, 'quote-' + d, id);
        mailer.send({ to: q.email, subject: d === 'accept' ? `Your request #${id} was approved` : `Update on your request #${id}`, text: d === 'accept' ? `Good news: Apeiron approved your request #${id}.${msg ? `\n\nMessage from Apeiron:\n${msg}` : ''}\n\nWe will contact you about the next steps. You can follow progress after logging in.` : `Apeiron could not approve your request #${id} as sent.${msg ? `\n\nMessage from Apeiron:\n${msg}` : ''}\n\nYou are welcome to reply or start a new request after logging in.` });
        return send(res, 200, { ok: true, status }), true;
      }
      if (act === 'comments' && m === 'POST') {
        const msg = multi((await readJson(req, 4096)).message, 1000); if (msg.length < 2) return fail(res, 400, 'Please write your reply.'), true;
        await db.quoteComments.create({ quote_id: id, author: 'admin', message: msg, created_at: Date.now() });
        await db.quotes.update(id, { updated_at: Date.now() });
        mailer.send({ to: q.email, subject: `Apeiron replied to your request #${id}`, text: `Apeiron wrote:\n\n${msg}\n\nLog in to reply.` });
        return send(res, 200, { ok: true }), true;
      }
      return fail(res, 405, 'Method not allowed.'), true;
    }
    return false;
  };
}
