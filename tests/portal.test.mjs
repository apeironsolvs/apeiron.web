import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.js';
import { sendSmtp } from '../server/smtp.js';
import { TERMS_VERSION } from '../server/legal.js';

let app, base, abase, dir, mailSrv, mails = [], n = 0; const quiet = console.log;
const PW = 'long-enough-pw-1', ADMIN_PW = 'admin-test-password-9';
const ip = () => `10.2.${++n >> 8}.${n & 255}`;
const J = (body, extra = {}, method = 'POST') => ({ method, headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip(), ...extra }, body: JSON.stringify(body) });
const get = u => ({ headers: { cookie: u.cookie } });
const authed = (u, body, method = 'POST') => J(body, { cookie: u.cookie, 'X-CSRF-Token': u.csrf }, method);
const ck = r => (r.headers.get('set-cookie') || '').split(';')[0];

async function spin(env) {
  const d = mkdtempSync(join(tmpdir(), 'apeiron-x-')), a = createApp({ DATA_DIR: d, TRUST_PROXY: '1', ...env });
  await new Promise(r => a.server.listen(0, '127.0.0.1', r)); await new Promise(r => a.adminServer.listen(0, '127.0.0.1', r));
  return { a, url: `http://127.0.0.1:${a.server.address().port}`, aurl: `http://127.0.0.1:${a.adminServer.address().port}`, done: async () => { await a.close(); rmSync(d, { recursive: true, force: true }); } };
}
before(async () => {
  console.log = () => {};
  mailSrv = http.createServer((q, r) => { let b = ''; q.on('data', c => b += c); q.on('end', () => { mails.push({ auth: q.headers.authorization, ...JSON.parse(b) }); r.end('{}'); }); });
  await new Promise(r => mailSrv.listen(0, '127.0.0.1', r));
  dir = mkdtempSync(join(tmpdir(), 'apeiron-p-'));
  app = createApp({ NODE_ENV: 'test', DATA_DIR: dir, TRUST_PROXY: '1', RESEND_API_KEY: 'test-key', MAIL_FROM: 'Apeiron <hello@apeiron.test>', MAIL_API_URL: `http://127.0.0.1:${mailSrv.address().port}/`, ADMIN_NOTIFY_EMAIL: 'boss@apeiron.test' });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r)); await new Promise(r => app.adminServer.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${app.server.address().port}`; abase = `http://127.0.0.1:${app.adminServer.address().port}`;
  app.db.prepare('INSERT INTO users(email,pass_hash,created_at) VALUES(?,?,?)').run('boss@apeiron.test', await app.hashPassword(ADMIN_PW), Date.now());
});
after(async () => { await app.close(); mailSrv.close(); rmSync(dir, { recursive: true, force: true }); console.log = quiet; });

async function reg(email, name = 'Test Client') {
  const r = await fetch(base + '/api/client/register', J({ name, email, password: PW, acceptTerms: true })), b = await r.json();
  return { r, cookie: ck(r), csrf: b.csrf, body: b };
}
async function adminLogin() {
  const r = await fetch(abase + '/api/admin/login', J({ email: 'boss@apeiron.test', password: ADMIN_PW })), b = await r.json(); return { cookie: ck(r), csrf: b.csrf };
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const sel = { services: ['mobile', 'ai'], reqs: { mobile: ['push'], ai: ['docs', 'chat'] }, notes: { ai: 'Use our FAQ PDFs' } };

test('catalog is public and has prices and a payment note', async () => {
  const c = await (await fetch(base + '/api/catalog')).json();
  assert.equal(c.services.mobile.base, 150000); assert.ok(c.services.ai.reqs.docs.price > 0); assert.match(c.paymentNote, /do not take payment/i);
});

// ---------- create account ----------
test('create account: Terms must be accepted, passwords must be decent, duplicates refused', async () => {
  const post = body => fetch(base + '/api/client/register', J(body));
  assert.equal((await post({ name: 'A', email: 'terms@example.com', password: PW })).status, 400, 'no acceptTerms');
  assert.equal((await post({ name: 'A', email: 'terms@example.com', password: PW, acceptTerms: false })).status, 400, 'acceptTerms false');
  assert.equal((await post({ name: 'A', email: 'terms@example.com', password: PW, acceptTerms: 'true' })).status, 400, 'must be literally true');
  assert.equal(app.db.prepare("SELECT COUNT(*) c FROM clients WHERE email='terms@example.com'").get().c, 0, 'nothing is created without acceptance');
  assert.equal((await post({ name: 'A', email: 'weak@example.com', password: 'short', acceptTerms: true })).status, 400);
  assert.equal((await post({ name: 'A', email: 'weak@example.com', password: 'password123', acceptTerms: true })).status, 400, 'common password');
  assert.equal((await post({ name: 'A', email: 'weak@example.com', password: 'weak@example.com', acceptTerms: true })).status, 400, 'password equal to email');
  assert.equal((await post({ name: '', email: 'weak@example.com', password: PW, acceptTerms: true })).status, 400, 'name required');
  assert.equal((await post({ name: 'A', email: 'not-an-email', password: PW, acceptTerms: true })).status, 400);
  const ok = await reg('first@example.com'); assert.equal(ok.r.status, 201);
  const dup = await post({ name: 'B', email: 'FIRST@example.com', password: PW, acceptTerms: true }); assert.equal(dup.status, 409);
});
test('create account: password is stored hashed, terms version is recorded, login is remembered for 30 days', async () => {
  const u = await reg('hash@example.com', 'Hash Tester');
  const sc = u.r.headers.get('set-cookie'); assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/); assert.match(sc, /Max-Age=2592000/);
  const row = app.db.prepare("SELECT * FROM clients WHERE email='hash@example.com'").get();
  assert.ok(row.pass_hash.startsWith('scrypt$')); assert.ok(!row.pass_hash.includes(PW), 'plain password must never be stored');
  assert.equal(row.terms_version, TERMS_VERSION); assert.ok(row.terms_at > 0 && row.consent_at > 0);
  assert.ok(!JSON.stringify(u.body).includes(PW) && !JSON.stringify(u.body).includes(row.pass_hash.slice(10, 30)), 'responses never contain the password or hash');
  const s = await (await fetch(base + '/api/client/session', get(u))).json(); assert.equal(s.signedIn, true); assert.equal(s.name, 'Hash Tester');
  await wait(50); assert.equal((await (await fetch(base + '/api/client/session', get(u))).json()).signedIn, true, 'stays logged in on later visits');
});
test('register is rate limited per address', async () => {
  let last; for (let i = 0; i < 6; i++) last = await fetch(base + '/api/client/register', J({ name: 'R', email: `rl${i}@example.com`, password: PW, acceptTerms: true }, { 'X-Forwarded-For': '203.0.113.77' }));
  assert.equal(last.status, 429);
});

// ---------- login ----------
test('login: generic errors, remembered cookie, lockout after 5 wrong passwords, logout ends the session', async () => {
  await reg('login@example.com');
  const post = (email, password, extra = {}) => fetch(base + '/api/client/login', J({ email, password, ...extra }));
  const bad = await post('login@example.com', 'wrong-password-123'), unknown = await post('nobody@example.com', PW);
  assert.equal(bad.status, 401); assert.equal(unknown.status, 401); assert.equal((await bad.json()).error, (await unknown.json()).error, 'same message whether or not the account exists');
  const ok = await post('LOGIN@example.com', PW); assert.equal(ok.status, 200); assert.match(ok.headers.get('set-cookie'), /Max-Age=2592000/);
  const u = { cookie: ck(ok), csrf: (await ok.json()).csrf };
  assert.equal((await fetch(base + '/api/client/logout', authed(u, {}))).status, 200); assert.equal((await fetch(base + '/api/client/me', get(u))).status, 401);
  for (let i = 0; i < 5; i++) await post('login@example.com', 'wrong-password-' + i);
  assert.equal((await post('login@example.com', PW)).status, 401, 'the right password is refused while the account is locked');
});
test('login endpoint is rate limited per address', async () => {
  let last; for (let i = 0; i < 11; i++) last = await fetch(base + '/api/client/login', J({ email: 'x@y.zz', password: 'whatever-whatever' }, { 'X-Forwarded-For': '198.51.100.7' }));
  assert.equal(last.status, 429);
});
test('if the Terms change, login is blocked until the new Terms are accepted', async () => {
  await reg('terms2@example.com'); app.db.prepare("UPDATE clients SET terms_version='2020-01-01' WHERE email='terms2@example.com'").run();
  const post = extra => fetch(base + '/api/client/login', J({ email: 'terms2@example.com', password: PW, ...extra }));
  const blocked = await post({}); assert.equal(blocked.status, 409); assert.equal((await blocked.json()).needsTerms, true); assert.equal(blocked.headers.get('set-cookie'), null, 'no session without acceptance');
  assert.equal((await post({ acceptTerms: false })).status, 409);
  const ok = await post({ acceptTerms: true }); assert.equal(ok.status, 200);
  assert.equal(app.db.prepare("SELECT terms_version FROM clients WHERE email='terms2@example.com'").get().terms_version, TERMS_VERSION);
  assert.equal((await post({})).status, 200, 'accepted once, not asked again');
});

// ---------- forgot / reset ----------
const codeFrom = email => { const m = [...mails].reverse().find(x => x.to[0] === email && /reset code is (\d{6})/.test(x.text)); return m && /reset code is (\d{6})/.exec(m.text)[1]; };
test('password reset: emailed code, one use, 5 tries, strong password, signs out other devices; same reply for unknown emails', async () => {
  const old = await reg('reset@example.com');
  const a = await fetch(base + '/api/client/forgot', J({ email: 'reset@example.com' })), b = await fetch(base + '/api/client/forgot', J({ email: 'ghost@example.com' }));
  assert.equal(a.status, 200); assert.equal(b.status, 200); assert.equal(JSON.stringify(await a.json()), JSON.stringify(await b.json()), 'no account enumeration');
  const code = codeFrom('reset@example.com'); assert.match(code, /^\d{6}$/); assert.equal(codeFrom('ghost@example.com'), undefined, 'no email for unknown accounts');
  const reset = body => fetch(base + '/api/client/reset', J({ email: 'reset@example.com', ...body }));
  assert.equal((await reset({ code: '000000', password: 'brand-new-pass-1' })).status, 400);
  assert.equal((await reset({ code, password: 'short' })).status, 400, 'weak password refused, code still valid');
  const ok = await reset({ code, password: 'brand-new-pass-1' }); assert.equal(ok.status, 200);
  assert.equal((await reset({ code, password: 'another-new-pass-2' })).status, 400, 'a code works once');
  assert.equal((await fetch(base + '/api/client/me', get(old))).status, 401, 'old sessions are signed out');
  assert.equal((await fetch(base + '/api/client/login', J({ email: 'reset@example.com', password: 'brand-new-pass-1' }))).status, 200);
  assert.equal((await fetch(base + '/api/client/login', J({ email: 'reset@example.com', password: PW }))).status, 401, 'old password no longer works');
});
test('password reset: 5 wrong codes lock the code; expired codes refused', async () => {
  await reg('lock@example.com'); await fetch(base + '/api/client/forgot', J({ email: 'lock@example.com' })); const code = codeFrom('lock@example.com');
  for (let i = 0; i < 5; i++) assert.equal((await fetch(base + '/api/client/reset', J({ email: 'lock@example.com', code: '111111', password: 'brand-new-pass-1' }))).status, 400);
  assert.equal((await fetch(base + '/api/client/reset', J({ email: 'lock@example.com', code, password: 'brand-new-pass-1' }))).status, 400, 'right code fails after lockout');
  await reg('exp@example.com'); await fetch(base + '/api/client/forgot', J({ email: 'exp@example.com' })); const c2 = codeFrom('exp@example.com');
  app.db.prepare('UPDATE login_codes SET expires_at=? WHERE email=?').run(Date.now() - 1, 'exp@example.com');
  assert.equal((await fetch(base + '/api/client/reset', J({ email: 'exp@example.com', code: c2, password: 'brand-new-pass-1' }))).status, 400);
});
test('an old account without a password cannot log in, but can set one by emailed code', async () => {
  app.db.prepare("INSERT INTO clients(email,name,created_at) VALUES('legacy@example.com','Legacy',1)").run();
  assert.equal((await fetch(base + '/api/client/login', J({ email: 'legacy@example.com', password: PW }))).status, 401);
  assert.equal((await fetch(base + '/api/client/register', J({ name: 'Attacker', email: 'legacy@example.com', password: PW, acceptTerms: true }))).status, 409, 'cannot take over an existing account by registering');
  await fetch(base + '/api/client/forgot', J({ email: 'legacy@example.com' })); const code = codeFrom('legacy@example.com');
  const r = await fetch(base + '/api/client/reset', J({ email: 'legacy@example.com', code, password: 'legacy-new-pass-1', acceptTerms: true })); assert.equal(r.status, 200);
  assert.equal((await fetch(base + '/api/client/login', J({ email: 'legacy@example.com', password: 'legacy-new-pass-1' }))).status, 200);
});
test('everything under /api/client needs a login', async () => {
  for (const [m, p] of [['GET', '/api/client/me'], ['GET', '/api/client/quotes'], ['GET', '/api/client/quotes/1'], ['POST', '/api/client/quotes'], ['PUT', '/api/client/quotes/1'], ['POST', '/api/client/quotes/1/submit'], ['POST', '/api/client/quotes/1/comments'], ['PATCH', '/api/client/profile'], ['POST', '/api/client/account/delete']])
    assert.equal((await fetch(base + p, { method: m })).status, 401, p);
});
test('session check is quiet: 200 for visitors, no secrets leaked', async () => {
  const r = await fetch(base + '/api/client/session'); assert.equal(r.status, 200); assert.deepEqual(await r.json(), { signedIn: false });
});

// ---------- the build journey ----------
test('journey: analysis, server-side prices, plans, send, comments, admin approve (green), reject, emails', async () => {
  const u = await reg('journey@example.com', 'Journey Client');
  assert.equal((await fetch(base + '/api/client/quotes', J({ idea: 'x' }, { cookie: u.cookie }))).status, 403, 'CSRF required');
  assert.equal((await fetch(base + '/api/client/quotes', authed(u, { idea: 'hi' }))).status, 400, 'idea too short');
  const created = await fetch(base + '/api/client/quotes', authed(u, { idea: 'I want a mobile app with an AI chatbot that automates customer support and a dashboard for reports' }));
  assert.equal(created.status, 201); const { id } = await created.json();
  const got = await (await fetch(base + `/api/client/quotes/${id}`, get(u))).json();
  assert.ok(['mobile', 'ai', 'automation', 'data'].every(k => got.analysis.keys.includes(k)), 'analysis picks the right options'); assert.ok(got.analysis.reasons.mobile.includes('mobile'), 'and says why');
  assert.deepEqual(got.quote.services.sort(), [...got.analysis.keys].sort(), 'draft starts with the suggested options'); assert.equal(got.quote.status_label, 'Draft');
  const put = await (await fetch(base + `/api/client/quotes/${id}`, authed(u, { ...sel, price: 1, total: 1 }, 'PUT'))).json();
  assert.equal(put.quote.pricing.subtotal, 150000 + 10000 + 100000 + 25000, 'prices come from the server, not the browser');
  assert.equal((await fetch(base + `/api/client/quotes/${id}`, authed(u, { services: ['hacking'] }, 'PUT'))).status, 400);
  assert.equal((await fetch(base + `/api/client/quotes/${id}`, authed(u, { services: ['ai'], reqs: { ai: ['nope'] } }, 'PUT'))).status, 400);
  assert.equal((await fetch(base + `/api/client/quotes/${id}/submit`, authed(u, { plan: 'gold' }))).status, 400);
  mails.length = 0;
  const sub = await (await fetch(base + `/api/client/quotes/${id}/submit`, authed(u, { plan: 'subscription', comment: 'Can we do this for a lower budget?' }))).json();
  assert.equal(sub.total, 256500, '285,000 less the 10% subscription discount'); assert.ok(sub.monthly >= 5000);
  await wait(250);
  assert.ok(mails.some(m => m.to[0] === 'boss@apeiron.test' && /New project request #/.test(m.subject) && /lower budget/.test(m.text)), 'admin is emailed with the details and the comment');
  assert.ok(mails.some(m => m.to[0] === 'journey@example.com' && /Status: Pending/.test(m.text)), 'client gets a confirmation');
  const sent = (await (await fetch(base + `/api/client/quotes/${id}`, get(u))).json()).quote;
  assert.equal(sent.status_label, 'Pending'); assert.equal(sent.comments[0].message, 'Can we do this for a lower budget?');
  assert.equal((await fetch(base + `/api/client/quotes/${id}`, authed(u, { services: ['cloud'] }, 'PUT'))).status, 409, 'locked once sent');
  assert.equal((await fetch(base + `/api/client/quotes/${id}/submit`, authed(u, { plan: 'build' }))).status, 409, 'cannot send twice');
  assert.equal((await fetch(base + `/api/client/quotes/${id}/comments`, authed(u, { message: 'One more thing: iOS first.' }))).status, 200);
  // staff side (separate website)
  const ad = await adminLogin(), adh = { cookie: ad.cookie };
  const list = await (await fetch(abase + '/api/admin/quotes', { headers: adh })).json(); const row = list.rows.find(r => r.id === id);
  assert.equal(row.status, 'submitted'); assert.equal(row.comments.length, 2); assert.equal(row.plan, 'subscription');
  assert.equal((await fetch(abase + `/api/admin/quotes/${id}/decision`, J({ decision: 'accept' }, adh))).status, 403, 'CSRF required for staff too');
  const aj = (path, body) => fetch(abase + path, J(body, { ...adh, 'X-CSRF-Token': ad.csrf }));
  assert.equal((await aj(`/api/admin/quotes/${id}/decision`, { decision: 'maybe' })).status, 400);
  assert.equal((await aj(`/api/admin/quotes/${id}/comments`, { message: 'Happy to discuss: how about phase one first?' })).status, 200);
  mails.length = 0;
  assert.equal((await aj(`/api/admin/quotes/${id}/decision`, { decision: 'accept', message: 'Approved, welcome aboard.' })).status, 200); await wait(250);
  assert.ok(mails.some(m => m.to[0] === 'journey@example.com' && /approved/i.test(m.subject)), 'client is emailed when approved');
  const done = (await (await fetch(base + `/api/client/quotes/${id}`, get(u))).json()).quote;
  assert.equal(done.status, 'accepted'); assert.equal(done.status_label, 'Accepted');
  assert.ok(done.comments.some(c => c.author === 'admin' && /phase one/.test(c.message)) && done.comments.some(c => /welcome aboard/.test(c.message)), 'client sees the replies');
  assert.equal((await fetch(abase + `/api/admin/quotes/${id}`, J({ project_status: 'building' }, { ...adh, 'X-CSRF-Token': ad.csrf }, 'PATCH'))).status, 200);
  assert.equal((await (await fetch(base + `/api/client/quotes/${id}`, get(u))).json()).quote.project_status, 'building');
  assert.equal((await aj(`/api/admin/quotes/${id}/decision`, { decision: 'reject', message: 'Sorry, changed our mind.' })).status, 200);
  const rej = (await (await fetch(base + `/api/client/quotes/${id}`, get(u))).json()).quote; assert.equal(rej.status_label, 'Rejected');
  assert.equal((await fetch(base + `/api/client/quotes/${id}/comments`, authed(u, { message: 'hello?' }))).status, 409, 'no comments on a closed request');
});
test('build only: price has no subscription; draft cannot be decided by staff', async () => {
  const u = await reg('buildonly@example.com'); const { id } = await (await fetch(base + '/api/client/quotes', authed(u, { idea: 'A website for my shop with a login' }))).json();
  await fetch(base + `/api/client/quotes/${id}`, authed(u, { services: ['frontend'], reqs: { frontend: ['pages', 'cms'] } }, 'PUT'));
  const ad = await adminLogin();
  assert.equal((await fetch(abase + `/api/admin/quotes/${id}/decision`, J({ decision: 'accept' }, { cookie: ad.cookie, 'X-CSRF-Token': ad.csrf }))).status, 409, 'not sent yet');
  const s = await (await fetch(base + `/api/client/quotes/${id}/submit`, authed(u, { plan: 'build' }))).json();
  assert.equal(s.total, 40000 + 15000); assert.equal(s.monthly, 0);
});
test('clients cannot see or change each other\'s requests', async () => {
  const a = await reg('alice@example.com'), b = await reg('bob@example.com');
  const { id } = await (await fetch(base + '/api/client/quotes', authed(a, { idea: 'Alice private idea about a shop' }))).json();
  for (const [m, p, body] of [['GET', ''], ['PUT', '', sel], ['POST', '/submit', { plan: 'build' }], ['POST', '/comments', { message: 'hi there' }]])
    assert.equal((await fetch(base + `/api/client/quotes/${id}${p}`, m === 'GET' ? get(b) : authed(b, body, m))).status, 404, m + p);
  assert.ok(!JSON.stringify(await (await fetch(base + '/api/client/quotes', get(b))).json()).includes('Alice private idea'));
});
test('client and staff logins are separate worlds', async () => {
  const u = await reg('sep@example.com'), ad = await adminLogin();
  assert.equal((await fetch(abase + '/api/admin/quotes', get(u))).status, 401, 'client cookie does not open staff API');
  assert.equal((await fetch(base + '/api/client/me', { headers: { cookie: ad.cookie } })).status, 401, 'staff cookie is not a client login');
  assert.equal((await fetch(base + '/api/admin/quotes', { headers: { cookie: ad.cookie } })).status, 404, 'public site has no staff API');
});
test('profile: update details; delete account needs the password and removes everything', async () => {
  const u = await reg('profile@example.com', 'Old Name');
  assert.equal((await fetch(base + '/api/client/profile', J({ name: 'X' }, { cookie: u.cookie }, 'PATCH'))).status, 403, 'CSRF required');
  assert.equal((await fetch(base + '/api/client/profile', authed(u, { name: 'New Name', company: 'Acme', phone: '12345' }, 'PATCH'))).status, 200);
  const me = await (await fetch(base + '/api/client/me', get(u))).json(); assert.equal(me.name, 'New Name'); assert.equal(me.company, 'Acme');
  const { id } = await (await fetch(base + '/api/client/quotes', authed(u, { idea: 'Something to be deleted soon' }))).json();
  assert.equal((await fetch(base + '/api/client/account/delete', authed(u, { password: 'not-my-password-1' }))).status, 401);
  assert.equal((await fetch(base + '/api/client/account/delete', authed(u, { password: PW }))).status, 200);
  assert.equal((await fetch(base + '/api/client/me', get(u))).status, 401);
  assert.equal(app.db.prepare("SELECT COUNT(*) c FROM clients WHERE email='profile@example.com'").get().c, 0);
  assert.equal(app.db.prepare('SELECT COUNT(*) c FROM quotes WHERE id=?').get(id).c, 0, 'their requests are erased too');
});

// ---------- email delivery ----------
function smtpMock({ failAuth = false } = {}) {
  const got = { cmds: [], data: '' };
  const srv = net.createServer(s => {
    let buf = '', inData = false; s.write('220 mock ESMTP\r\n');
    s.on('data', d => { buf += d.toString(); let i;
      while ((i = buf.indexOf('\r\n')) !== -1) { const line = buf.slice(0, i); buf = buf.slice(i + 2);
        if (inData) { if (line === '.') { inData = false; s.write('250 queued\r\n'); } else got.data += line + '\n'; continue; }
        got.cmds.push(line); const c = line.split(' ')[0].toUpperCase();
        if (c === 'EHLO') s.write('250-mock\r\n250 AUTH PLAIN\r\n'); else if (c === 'AUTH') s.write(failAuth ? '535 bad credentials\r\n' : '235 ok\r\n');
        else if (c === 'MAIL' || c === 'RCPT') s.write('250 ok\r\n'); else if (c === 'DATA') { inData = true; s.write('354 go\r\n'); } else if (c === 'QUIT') { s.write('221 bye\r\n'); s.end(); } }
    });
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r({ srv, got, port: srv.address().port })));
}
test('SMTP: reset email goes out through the mail server with correct login, address and body', async () => {
  const m = await smtpMock(), t = await spin({ NODE_ENV: 'test', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(m.port), SMTP_SECURE: '0', SMTP_USER: 'sender@gmail.test', SMTP_PASS: 'app-pass-1234' });
  try {
    await fetch(t.url + '/api/client/register', J({ name: 'S', email: 'person@example.com', password: PW, acceptTerms: true }));
    const r = await fetch(t.url + '/api/client/forgot', J({ email: 'person@example.com' })); assert.equal(r.status, 200); assert.equal((await r.json()).delivery, 'email');
    const auth = m.got.cmds.find(c => c.startsWith('AUTH PLAIN')); assert.equal(Buffer.from(auth.split(' ')[2], 'base64').toString(), '\0sender@gmail.test\0app-pass-1234');
    assert.ok(m.got.cmds.includes('RCPT TO:<person@example.com>') && m.got.cmds.includes('MAIL FROM:<sender@gmail.test>'));
    const b64 = m.got.data.slice(m.got.data.indexOf('base64') + 6); assert.match(Buffer.from(b64.replace(/\s/g, ''), 'base64').toString(), /reset code is \d{6}/);
  } finally { await t.done(); m.srv.close(); }
});
test('SMTP: wrong mail login gives a clear 503, never a silent success', async () => {
  const m = await smtpMock({ failAuth: true }), t = await spin({ NODE_ENV: 'test', SMTP_HOST: '127.0.0.1', SMTP_PORT: String(m.port), SMTP_SECURE: '0', SMTP_USER: 's@gmail.test', SMTP_PASS: 'bad' });
  try { await fetch(t.url + '/api/client/register', J({ name: 'S', email: 'person@example.com', password: PW, acceptTerms: true })); const r = await fetch(t.url + '/api/client/forgot', J({ email: 'person@example.com' })); assert.equal(r.status, 503); assert.match((await r.json()).error, /could not send/i); }
  finally { await t.done(); m.srv.close(); }
});
test('SMTP: address injection is refused', async () => {
  await assert.rejects(sendSmtp({ host: '127.0.0.1', port: 1, secure: false, from: 'a@b.co', to: 'x@y.zz\r\nRCPT TO:<evil@e.zz>', subject: 's', text: 't' }), /invalid address/);
});
test('no email configured: local mode prints the code in the terminal; production refuses with 503', async () => {
  const dev = await spin({ NODE_ENV: 'test' }), prodApp = await spin({ NODE_ENV: 'production' });
  try {
    await fetch(dev.url + '/api/client/register', J({ name: 'P', email: 'p@example.com', password: PW, acceptTerms: true }));
    const lines = []; const orig = console.log; console.log = (...a) => lines.push(a.join(' '));
    const r = await fetch(dev.url + '/api/client/forgot', J({ email: 'p@example.com' })); console.log = orig;
    assert.equal((await r.json()).delivery, 'terminal'); assert.ok(lines.some(l => /LOCAL MODE.*p@example.com: \d{6}/.test(l)));
    const p = await fetch(prodApp.url + '/api/client/forgot', J({ email: 'p@example.com' })); assert.equal(p.status, 503); assert.ok(!JSON.stringify(await p.json()).match(/\d{6}/));
  } finally { await dev.done(); await prodApp.done(); }
});
test('production cookies are __Host- prefixed and Secure', async () => {
  const t = await spin({ NODE_ENV: 'production' });
  try { const r = await fetch(t.url + '/api/client/register', J({ name: 'S', email: 'sec@example.com', password: PW, acceptTerms: true })); const sc = r.headers.get('set-cookie'); assert.match(sc, /^__Host-apeiron_c=/); assert.match(sc, /Secure/); assert.match(sc, /HttpOnly/); }
  finally { await t.done(); }
});
test('support chat messages are stored as enquiries tagged "support" and shown to staff', async () => {
  const r = await fetch(base + '/api/enquiries', J({ idea: 'How long does an MVP take?', name: 'Chat User', email: 'chat@example.com', consent: true, source: 'support' })); assert.equal(r.status, 201);
  const ad = await adminLogin(); const list = await (await fetch(abase + '/api/admin/enquiries?limit=20', { headers: { cookie: ad.cookie } })).json();
  assert.ok(list.rows.some(e => e.email === 'chat@example.com' && e.source === 'support'));
});
test('project status check: matching ID and email succeeds, mismatched email or other user returns 404', async () => {
  const u1 = await reg('client1@example.com', 'Client One');
  const u2 = await reg('client2@example.com', 'Client Two');
  const cr = await fetch(base + '/api/client/quotes', authed(u1, { idea: 'Building an AI logistics mobile platform' }));
  const qid = (await cr.json()).id;

  // 1. Correct quote ID + owner email -> 200 with status info
  const s1 = await fetch(base + '/api/project-status', J({ id: qid, email: 'client1@example.com' }));
  assert.equal(s1.status, 200);
  const j1 = await s1.json();
  assert.equal(j1.ok, true);
  assert.equal(j1.project.id, qid);
  assert.equal(j1.project.status, 'draft');

  // 2. Mismatched email (User 2 attempting to view User 1's project) -> 404 refused
  const s2 = await fetch(base + '/api/project-status', J({ id: qid, email: 'client2@example.com' }));
  assert.equal(s2.status, 404);

  // 3. Non-existent ID -> 404
  const s3 = await fetch(base + '/api/project-status', J({ id: 999999, email: 'client1@example.com' }));
  assert.equal(s3.status, 404);

  // 4. Invalid input -> 400
  const s4 = await fetch(base + '/api/project-status', J({ id: 'bad', email: 'notanemail' }));
  assert.equal(s4.status, 400);
});

test('client portal messaging: chat eligibility, submitted request lifecycle, message persistence, team replies, and multiple distinct conversations', async () => {
  const c1 = await reg('chatclient@example.com', 'Chat User');
  const other = await reg('otherclient@example.com', 'Other User');
  const ad = await adminLogin();

  // 1. Initial state: No quotes -> 0 submitted quotes (chat icon hidden)
  const initial = await (await fetch(base + '/api/client/quotes', get(c1))).json();
  assert.equal(initial.quotes.length, 0);
  const eligible0 = initial.quotes.filter(q => q.status !== 'draft');
  assert.equal(eligible0.length, 0, 'No chat eligibility with 0 quotes');

  // 2. Create draft quote -> status is draft -> still 0 submitted quotes (chat icon hidden)
  const cr1 = await fetch(base + '/api/client/quotes', authed(c1, { idea: 'Real-time logistics platform for fleet tracking' }));
  const q1 = (await cr1.json()).id;
  const draftList = await (await fetch(base + '/api/client/quotes', get(c1))).json();
  const draftQuote = draftList.quotes.find(q => q.id === q1);
  assert.equal(draftQuote.status, 'draft');
  const eligibleDraft = draftList.quotes.filter(q => q.status !== 'draft');
  assert.equal(eligibleDraft.length, 0, 'Draft does not qualify for chat icon');

  // 3. Submit quote 1 with a comment -> status becomes submitted
  const sub1 = await fetch(base + `/api/client/quotes/${q1}/submit`, authed(c1, { plan: 'build', comment: 'Initial scope question on delivery time' }));
  assert.equal(sub1.status, 200);

  // 4. Verify authoritative submission state: now 1 submitted quote exists (chat icon visible!)
  const subList1 = await (await fetch(base + '/api/client/quotes', get(c1))).json();
  const eligibleSub1 = subList1.quotes.filter(q => q.status !== 'draft');
  assert.equal(eligibleSub1.length, 1, 'Submitted quote qualifies for chat icon');
  assert.equal(eligibleSub1[0].id, q1);
  assert.equal(eligibleSub1[0].comments.length, 1);
  assert.equal(eligibleSub1[0].comments[0].author, 'client');
  assert.equal(eligibleSub1[0].comments[0].message, 'Initial scope question on delivery time');

  // 5. Client posts a new message to quote 1
  const postMsg = await fetch(base + `/api/client/quotes/${q1}/comments`, authed(c1, { message: 'Can we also support iOS and Android tablets?' }));
  assert.equal(postMsg.status, 200);
  const postRes = await postMsg.json();
  assert.equal(postRes.quote.comments.length, 2);

  // 6. Admin portal checks quotes and replies to quote 1
  const adQuotes = await (await fetch(abase + '/api/admin/quotes', { headers: { cookie: ad.cookie } })).json();
  const adQ1 = adQuotes.rows.find(r => r.id === q1);
  assert.ok(adQ1, 'Admin can see client request');
  assert.equal(adQ1.comments.length, 2);

  const adReply = await fetch(abase + `/api/admin/quotes/${q1}/comments`, J({ message: 'Yes, tablet optimization is included in our design.' }, { cookie: ad.cookie, 'X-CSRF-Token': ad.csrf }));
  assert.equal(adReply.status, 200);

  // 7. Client fetches quote 1: all 3 messages present, correctly ordered, with proper authors
  const q1Updated = (await (await fetch(base + `/api/client/quotes/${q1}`, get(c1))).json()).quote;
  assert.equal(q1Updated.comments.length, 3);
  assert.equal(q1Updated.comments[0].author, 'client');
  assert.equal(q1Updated.comments[1].author, 'client');
  assert.equal(q1Updated.comments[2].author, 'admin');
  assert.equal(q1Updated.comments[2].message, 'Yes, tablet optimization is included in our design.');

  // 8. Client creates a second quote and submits it -> now 2 submitted quotes exist (conversation selector shown)
  const cr2 = await fetch(base + '/api/client/quotes', authed(c1, { idea: 'Secondary internal analytics dashboard' }));
  const q2 = (await cr2.json()).id;
  await fetch(base + `/api/client/quotes/${q2}/submit`, authed(c1, { plan: 'subscription' }));

  const subList2 = await (await fetch(base + '/api/client/quotes', get(c1))).json();
  const eligibleSub2 = subList2.quotes.filter(q => q.status !== 'draft');
  assert.equal(eligibleSub2.length, 2, 'Two submitted quotes qualify for conversation selector');

  // 9. Client posts to quote 2 -> message is isolated to quote 2, does not leak into quote 1
  await fetch(base + `/api/client/quotes/${q2}/comments`, authed(c1, { message: 'Regarding quote 2: what database is used?' }));
  const checkQ1 = (await (await fetch(base + `/api/client/quotes/${q1}`, get(c1))).json()).quote;
  const checkQ2 = (await (await fetch(base + `/api/client/quotes/${q2}`, get(c1))).json()).quote;
  assert.equal(checkQ1.comments.length, 3, 'Quote 1 comments undisturbed');
  assert.equal(checkQ2.comments.length, 1, 'Quote 2 has its own isolated message');
  assert.equal(checkQ2.comments[0].message, 'Regarding quote 2: what database is used?');

  // 10. Privacy isolation: Another client cannot view or comment on quote 1 or quote 2
  assert.equal((await fetch(base + `/api/client/quotes/${q1}`, get(other))).status, 404);
  assert.equal((await fetch(base + `/api/client/quotes/${q1}/comments`, authed(other, { message: 'Intrusion test' }))).status, 404);
});



