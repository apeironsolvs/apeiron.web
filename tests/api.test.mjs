import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/index.js';

let app, base, abase, dir; const PW = 'correct-horse-battery';
let n = 0; // each request gets its own fake client IP (via trusted proxy header) so rate-limit tests stay isolated
const json = (body, extra = {}) => ({ method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.1.${++n >> 8}.${n & 255}`, ...extra }, body: JSON.stringify(body) });
const good = (o = {}) => ({ idea: 'An app for my shop', name: 'Asha', email: 'asha@example.com', consent: true, ...o });
const quiet = console.log; 

before(async () => {
  console.log = () => {};
  dir = mkdtempSync(join(tmpdir(), 'apeiron-'));
  app = createApp({ NODE_ENV: 'test', DATA_DIR: dir, TRUST_PROXY: '1' });
  await new Promise(r => app.server.listen(0, '127.0.0.1', r));
  await new Promise(r => app.adminServer.listen(0, '127.0.0.1', r));
  abase = `http://127.0.0.1:${app.adminServer.address().port}`;
  base = `http://127.0.0.1:${app.server.address().port}`;
  app.db.prepare('INSERT INTO users(email,pass_hash,created_at) VALUES(?,?,?)').run('boss@apeiron.test', await app.hashPassword(PW), Date.now());
});
after(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); console.log = quiet; });

async function login(pw = PW, ip) {
  const r = await fetch(abase + '/api/admin/login', json({ email: 'boss@apeiron.test', password: pw }));
  const body = await r.json(); return { r, body, cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
}

test('health and static security headers', async () => {
  assert.equal((await fetch(base + '/healthz')).status, 200);
  const ping = await fetch(base + '/api/ping');
  assert.equal(ping.status, 200);
  const pingBody = await ping.json();
  assert.equal(pingBody.shield, 'active');
  const r = await fetch(base + '/index.html');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(r.headers.get('x-xss-protection'), '1; mode=block');
});
test('path traversal, dotfiles and config files are not served', async () => {
  for (const p of ['/..%2f..%2fpackage.json', '/%2e%2e/package.json', '/_headers', '/.env', '/.git/config', '/server/index.js', '/data/apeiron.db'])
    assert.equal((await fetch(base + p)).status, 404, p);
  assert.equal((await fetch(base + '/.well-known/security.txt')).status, 200);
});
test('enquiry: valid is stored; invalid, bot and oversized are handled', async () => {
  assert.equal((await fetch(base + '/api/enquiries', json(good()))).status, 201);
  assert.equal((await fetch(base + '/api/enquiries', json(good({ email: 'nope' })))).status, 400);
  assert.equal((await fetch(base + '/api/enquiries', json(good({ consent: false })))).status, 400);
  const before = app.db.prepare('SELECT COUNT(*) c FROM enquiries').get().c;
  assert.equal((await fetch(base + '/api/enquiries', json(good({ website: 'http://spam' })))).status, 201);
  assert.equal(app.db.prepare('SELECT COUNT(*) c FROM enquiries').get().c, before, 'honeypot must not store');
  assert.equal((await fetch(base + '/api/enquiries', json(good({ idea: 'x'.repeat(9000) })))).status, 413);
  assert.equal((await fetch(base + '/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'hi' })).status, 415);
});
test('enquiry: cross-origin POST is blocked', async () => {
  const r = await fetch(base + '/api/enquiries', json(good(), { Origin: 'https://evil.example' }));
  assert.equal(r.status, 403);
});
test('SQL injection and header injection are stored inertly', async () => {
  const evil = "x'); DROP TABLE enquiries;--";
  assert.equal((await fetch(base + '/api/enquiries', json(good({ name: evil + '\r\nBcc: a@b.c', company: '=HYPERLINK("http://x")' })))).status, 201);
  const row = app.db.prepare('SELECT name FROM enquiries ORDER BY id DESC LIMIT 1').get();
  assert.ok(row.name.startsWith("x'); DROP TABLE") && !/[\r\n]/.test(row.name));
});
test('enquiry: rate limit returns 429', async () => {
  let last; for (let i = 0; i < 6; i++) last = await fetch(base + '/api/enquiries', json(good(), { 'X-Forwarded-For': '203.0.113.9' }));
  assert.equal(last.status, 429); assert.ok(last.headers.get('retry-after'));
});
test('admin routes deny by default', async () => {
  for (const [m, p] of [['GET', '/api/admin/me'], ['GET', '/api/admin/enquiries'], ['GET', '/api/admin/export.csv'], ['DELETE', '/api/admin/enquiries/1'], ['PATCH', '/api/admin/enquiries/1']])
    assert.equal((await fetch(abase + p, { method: m })).status, 401, p);
});
test('login: wrong password is generic; success sets a hardened cookie', async () => {
  const bad = await login('wrong-password-123'); assert.equal(bad.r.status, 401); assert.equal(bad.body.error, 'Invalid email or password.');
  const unknown = await fetch(abase + '/api/admin/login', json({ email: 'nobody@x.com', password: PW }));
  assert.equal((await unknown.json()).error, 'Invalid email or password.');
  const ok = await login(); assert.equal(ok.r.status, 200);
  const sc = ok.r.headers.get('set-cookie'); assert.match(sc, /HttpOnly/); assert.match(sc, /SameSite=Strict/);
  assert.equal(JSON.stringify(ok.body).includes(PW), false);
  assert.equal(app.db.prepare('SELECT pass_hash FROM users').get().pass_hash.startsWith('scrypt$'), true);
});
test('admin: list, CSRF required for changes, CSV injection guarded, logout kills session', async () => {
  const { cookie, body } = await login();
  const list = await (await fetch(abase + '/api/admin/enquiries?limit=5', { headers: { cookie } })).json();
  assert.ok(list.total >= 1); const id = list.rows[0].id;
  const noCsrf = await fetch(abase + `/api/admin/enquiries/${id}`, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json' }, body: '{"status":"contacted"}' });
  assert.equal(noCsrf.status, 403);
  const withCsrf = await fetch(abase + `/api/admin/enquiries/${id}`, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': body.csrf }, body: '{"status":"contacted"}' });
  assert.equal(withCsrf.status, 200);
  const badStatus = await fetch(abase + `/api/admin/enquiries/${id}`, { method: 'PATCH', headers: { cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': body.csrf }, body: '{"status":"hacked"}' });
  assert.equal(badStatus.status, 400);
  const csv = await (await fetch(abase + '/api/admin/export.csv', { headers: { cookie } })).text();
  assert.ok(csv.includes(`"'=HYPERLINK`), 'formula cells must be neutralised');
  const out = await fetch(abase + '/api/admin/logout', { method: 'POST', headers: { cookie, 'X-CSRF-Token': body.csrf } });
  assert.equal(out.status, 200);
  assert.equal((await fetch(abase + '/api/admin/me', { headers: { cookie } })).status, 401);
});
test('account locks after 5 wrong passwords, even with the right one', async () => {
  for (let i = 0; i < 5; i++) await login('wrong-password-' + i);
  assert.equal((await login()).r.status, 401);
});
test('login endpoint is rate limited per IP', async () => {
  let last; for (let i = 0; i < 11; i++) last = await fetch(abase + '/api/admin/login', json({ email: 'x@y.zz', password: 'whatever-whatever' }, { 'X-Forwarded-For': '198.51.100.7' }));
  assert.equal(last.status, 429);
});

// ---------- hardening: exposed files, safe configuration, staff-area allow-list ----------
import { mkdirSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
async function spin2(env) {
  const d = mkdtempSync(join(tmpdir(), 'apeiron-h-')), a = createApp({ DATA_DIR: join(d, 'data'), ...env });
  await new Promise(r => a.server.listen(0, '127.0.0.1', r)); await new Promise(r => a.adminServer.listen(0, '127.0.0.1', r));
  return { a, d, url: `http://127.0.0.1:${a.server.address().port}`, aurl: `http://127.0.0.1:${a.adminServer.address().port}`, done: async () => { await a.close(); rmSync(d, { recursive: true, force: true }); } };
}
test('database and secret file types are never served, even if they land in the site folder', async () => {
  const site = mkdtempSync(join(tmpdir(), 'apeiron-site-')); writeFileSync(join(site, 'ok.txt'), 'fine'); writeFileSync(join(site, '_headers'), '/*\n  X-Test: 1\n');
  for (const f of ['leak.db', 'leak.db-wal', 'notes.sql', 'server.log', 'priv.pem', 'copy.bak', 'x.env']) writeFileSync(join(site, f), 'secret');
  const t = await spin2({ NODE_ENV: 'test', SITE_DIR: site });
  try {
    assert.equal((await fetch(t.url + '/ok.txt')).status, 200);
    for (const f of ['leak.db', 'leak.db-wal', 'notes.sql', 'server.log', 'priv.pem', 'copy.bak', 'x.env']) assert.equal((await fetch(t.url + '/' + f)).status, 404, f);
  } finally { await t.done(); rmSync(site, { recursive: true, force: true }); }
});
test('refuses to start when the data folder is inside the published folder', () => {
  const site = mkdtempSync(join(tmpdir(), 'apeiron-site-'));
  try { assert.throws(() => createApp({ NODE_ENV: 'test', SITE_DIR: site, DATA_DIR: join(site, 'data') }), /DATA_DIR must NOT be inside/); }
  finally { rmSync(site, { recursive: true, force: true }); }
});
test('staff website allow-list: other addresses see 404, the allowed address gets the normal login flow', async () => {
  const t = await spin2({ NODE_ENV: 'test', TRUST_PROXY: '1', ADMIN_ALLOWED_IPS: '203.0.113.5' });
  try {
    const as = ip => ({ headers: { 'X-Forwarded-For': ip } });
    assert.equal((await fetch(t.aurl + '/api/admin/me', as('198.51.100.9'))).status, 404);
    assert.equal((await fetch(t.aurl + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.9' }, body: '{"email":"a@b.co","password":"x"}' })).status, 404);
    assert.equal((await fetch(t.aurl + '/index.html', as('198.51.100.9'))).status, 404);
    assert.equal((await fetch(t.aurl + '/api/admin/me', as('203.0.113.5'))).status, 401);
    assert.equal((await fetch(t.aurl + '/index.html', as('203.0.113.5'))).status, 200);
    assert.equal((await fetch(t.url + '/index.html', as('198.51.100.9'))).status, 200, 'the public site is unaffected');
  } finally { await t.done(); }
});
test('the admin website is separate: the public site cannot reach it and it cannot reach the public API', async () => {
  const t = await spin2({ NODE_ENV: 'test' });
  try {
    for (const p of ['/admin', '/admin/', '/admin/index.html', '/api/admin/me', '/api/admin/quotes']) assert.equal((await fetch(t.url + p)).status, 404, 'public site must not serve ' + p);
    assert.equal((await fetch(t.aurl + '/')).status, 200); assert.match(await (await fetch(t.aurl + '/')).text(), /Admin sign in/);
    for (const [m, p] of [['POST', '/api/enquiries'], ['POST', '/api/client/login'], ['GET', '/api/catalog'], ['GET', '/api/client/session']]) assert.equal((await fetch(t.aurl + p, { method: m })).status, 404, 'admin site must not serve ' + p);
    const h = (await fetch(t.aurl + '/')).headers;
    assert.match(h.get('content-security-policy'), /frame-ancestors 'none'/); assert.equal(h.get('cache-control'), 'no-store');
    for (const f of ['/server/index.js', '/.env', '/data/apeiron.db', '/_headers']) assert.equal((await fetch(t.aurl + f)).status, 404, f);
  } finally { await t.done(); }
});
test('first admin is created from .env settings (stored only as a hash) and can log in', async () => {
  const t = await spin2({ NODE_ENV: 'test', ADMIN_EMAIL: 'Owner@Example.com', ADMIN_PASSWORD: 'a-long-test-password-1' });
  try {
    await t.a.bootstrapAdmin();
    const row = t.a.db.prepare('SELECT email, pass_hash FROM users').get(); assert.equal(row.email, 'owner@example.com'); assert.ok(row.pass_hash.startsWith('scrypt$') && !row.pass_hash.includes('a-long-test-password-1'));
    const ok = await fetch(t.aurl + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.com', password: 'a-long-test-password-1' }) }); assert.equal(ok.status, 200);
    await t.a.bootstrapAdmin(); assert.equal(t.a.db.prepare('SELECT COUNT(*) c FROM users').get().c, 1, 'running again must not create or change anything');
  } finally { await t.done(); }
});
test('a weak ADMIN_PASSWORD is refused', async () => {
  const t = await spin2({ NODE_ENV: 'test', ADMIN_EMAIL: 'o@example.com', ADMIN_PASSWORD: 'short' });
  try { await t.a.bootstrapAdmin(); assert.equal(t.a.db.prepare('SELECT COUNT(*) c FROM users').get().c, 0); } finally { await t.done(); }
});
test('backup script writes a private, readable snapshot and prunes old ones', async () => {
  const d = mkdtempSync(join(tmpdir(), 'apeiron-b-')), env = { ...process.env, DATA_DIR: d, BACKUP_KEEP: '2' };
  try {
    const run = () => execFileSync(process.execPath, ['--no-warnings=ExperimentalWarning', 'scripts/backup.js'], { env, cwd: join(import.meta.dirname, '..') }).toString();
    run(); await new Promise(r => setTimeout(r, 1100)); run(); await new Promise(r => setTimeout(r, 1100)); const out = run();
    const files = readdirSync(join(d, 'backups')); assert.equal(files.length, 2, 'keeps only the newest 2');
    if (process.platform !== 'win32') assert.equal((statSync(join(d, 'backups', files[0])).mode & 0o077), 0, 'owner-only permissions');
    assert.match(out, /Backup written/);
    const { DatabaseSync } = await import('node:sqlite'); const b = new DatabaseSync(join(d, 'backups', files[1]));
    assert.ok(b.prepare("SELECT name FROM sqlite_master WHERE name='quotes'").get(), 'snapshot contains the tables'); b.close();
  } finally { rmSync(d, { recursive: true, force: true }); }
});

test('Apeiron Shield WAF blocks exploit scanner probes and injection queries', async () => {
  const probe = await fetch(base + '/wp-login.php');
  assert.equal(probe.status, 404);
  const sqli = await fetch(base + '/api/catalog?q=1%20UNION%20SELECT%201,2,3');
  assert.equal(sqli.status, 403);
});
