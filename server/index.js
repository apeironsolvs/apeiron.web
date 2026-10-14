// Apeiron web server: static site + JSON API. No npm dependencies.
import http from 'node:http';
import { readFileSync, statSync, createReadStream } from 'node:fs';
import { join, normalize, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { openDb, audit } from './db.js';
import { hashPassword, verifyPassword, DUMMY_HASH, createSession, getSession, destroySession, csrfOk, passwordOk } from './auth.js';
import { validateEnquiry, validatePatch, csvCell } from './validate.js';
import { limiter } from './ratelimit.js';
import { createMailer } from './mailer.js';
import { createPortal } from './portal.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
const DENY = new Set(['_headers', '_redirects']);
const BLOCKED_EXT = new Set(['.db', '.db-wal', '.db-shm', '.sqlite', '.sqlite3', '.env', '.log', '.pem', '.key', '.bak', '.sql', '.map']);

export function createApp(env = process.env) {
  const prod = env.NODE_ENV === 'production';
  const siteDir = resolve(env.SITE_DIR || join(ROOT, 'site'));
  const adminDir = resolve(env.ADMIN_DIR || join(ROOT, 'admin-site'));
  const dataDir = resolve(env.DATA_DIR || join(ROOT, 'data'));
  if ([siteDir, adminDir].some(d => dataDir === d || dataDir.startsWith(d + sep))) throw new Error('DATA_DIR must NOT be inside the public site folder or the admin site folder: the database would be downloadable.');
  const db = openDb(dataDir);
  const rl = limiter();
  const trustProxy = env.TRUST_PROXY === '1';
  const retentionDays = Math.max(1, parseInt(env.RETENTION_DAYS || '365', 10) || 365);
  const allowedOrigin = env.ALLOWED_ORIGIN || '';
  const webhook = /^https:\/\//.test(env.WEBHOOK_URL || '') ? env.WEBHOOK_URL : '';
  const ipSalt = db.prepare("SELECT v FROM meta WHERE k='ip_salt'").get().v;
  const adminIps = String(env.ADMIN_ALLOWED_IPS || '').split(',').map(x => x.trim()).filter(Boolean);   // optional: restrict staff area to these IPs
  const adminIpOk = ip => !adminIps.length || adminIps.includes(ip);
  const COOKIE = prod ? '__Host-apeiron_sid' : 'apeiron_sid';

  // Same security headers as site/_headers, so dev and prod behave alike.
  const baseHeaders = {};
  try {
    for (const l of readFileSync(join(siteDir, '_headers'), 'utf8').split('\n')) {
      const m = /^\s+([A-Za-z-]+):\s*(.+)$/.exec(l); if (m) baseHeaders[m[1]] = m[2].trim();
    }
  } catch { /* no _headers file: fall through with API defaults below */ }
  if (!prod) delete baseHeaders['Strict-Transport-Security'];
  baseHeaders['X-Content-Type-Options'] = 'nosniff';
  // The admin website is never framed by anything, and loads nothing from other sites.
  const adminHeaders = { ...baseHeaders };
  if (adminHeaders['Content-Security-Policy']) adminHeaders['Content-Security-Policy'] = adminHeaders['Content-Security-Policy'].replace("frame-src 'self'", "frame-src 'none'").replace("frame-ancestors 'self'", "frame-ancestors 'none'");
  adminHeaders['Cache-Control'] = 'no-store';

  const warn = msg => console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'warn', msg }));
  if (env.WEBHOOK_URL && !webhook) warn('WEBHOOK_URL ignored: it must start with https://');
  if (prod && allowedOrigin && !/^https:\/\//.test(allowedOrigin)) warn('ALLOWED_ORIGIN should be an https:// address in production');
  const log = o => console.log(JSON.stringify({ ts: new Date().toISOString(), ...o }));
  const clientIp = req => {
    if (trustProxy) { const x = String(req.headers['x-forwarded-for'] || '').split(',').map(s => s.trim()).filter(Boolean); if (x.length) return x[x.length - 1]; }
    return req.socket.remoteAddress || 'unknown';
  };
  const ipHash = ip => createHash('sha256').update(ipSalt + ip).digest('hex').slice(0, 16);

  function send(res, status, body, extra = {}) {
    const isObj = typeof body === 'object' && !Buffer.isBuffer(body);
    const headers = { ...(res._hdr || baseHeaders), ...(isObj ? { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } : {}), ...extra };
    res.writeHead(status, headers); res.end(isObj ? JSON.stringify(body) : body);
  }
  const fail = (res, status, error, extra) => send(res, status, { error }, extra);

  function readJson(req, max = 8192) {
    return new Promise((ok, no) => {
      if (!/^application\/json(;|$)/i.test(req.headers['content-type'] || '')) return no({ status: 415, error: 'Send JSON.' });
      let size = 0; const parts = [];
      req.on('data', c => { size += c.length; if (size > max) { if (size - c.length <= max) no({ status: 413, error: 'Request too large.' }); } else parts.push(c); });
      req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8'))); } catch { no({ status: 400, error: 'Invalid JSON.' }); } });
      req.on('error', () => no({ status: 400, error: 'Bad request.' }));
    });
  }
  const originOk = req => { const o = req.headers.origin; if (!o) return true; try { return new URL(o).host === req.headers.host || o === allowedOrigin; } catch { return false; } };
  const cookies = req => Object.fromEntries(String(req.headers.cookie || '').split(';').map(c => c.trim().split('=')).filter(p => p.length === 2));
  const cookieHeader = (v, maxAge) => `${COOKIE}=${v}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${prod ? '; Secure' : ''}`;

  function requireAdmin(req, res, mutating) {
    const s = getSession(db, cookies(req)[COOKIE]);
    if (!s || s.role !== 'admin') { fail(res, 401, 'Sign in required.'); return null; }          // deny by default
    if (mutating && (!originOk(req) || !csrfOk(req.headers['x-csrf-token'], s.csrf))) { fail(res, 403, 'Request blocked.'); return null; }
    return s;
  }

  const notify = text => { if (webhook) fetch(webhook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(3000) }).catch(e => log({ level: 'warn', msg: 'webhook failed', err: e.name })); };
  const mailer = createMailer(env, log);
  const adminTo = env.ADMIN_NOTIFY_EMAIL || env.ADMIN_EMAIL || '';
  const adminMail = (subject, text) => {            // e-mail to the staff mailbox whenever something needs their attention
    if (adminTo && mailer.configured) return mailer.send({ to: adminTo, subject, text });
    if (!prod) console.log(`\n[LOCAL MODE] Email to admin (not sent, email is not configured): ${subject}\n`);
    return false;
  };
  let portal;
  async function api(req, res, url, kind) {
    const { pathname } = url, m = req.method;
    if (pathname.startsWith('/api/admin/') !== (kind === 'admin')) return fail(res, 404, 'Not found.');   // staff API only on the admin website, public API only on the public site
    if (m !== 'GET' && !originOk(req)) return fail(res, 403, 'Request blocked.');
    const ip = clientIp(req);

    if (pathname === '/api/enquiries' && m === 'POST') {
      let wait = rl.hit('enq:' + ip, 5, 3600e3) || rl.hit('enq:all', 200, 3600e3);
      if (wait) return fail(res, 429, 'Too many requests. Please try again later.', { 'Retry-After': wait });
      const body = await readJson(req), v = validateEnquiry(body);
      if (!v.ok) return fail(res, 400, v.error);
      if (v.bot) return send(res, 201, { ok: true });                    // pretend success, store nothing
      const d = v.value;
      const r = db.prepare('INSERT INTO enquiries(created_at,idea,name,email,company,phone,ip_hash,consent,source) VALUES(?,?,?,?,?,?,?,1,?)').run(Date.now(), d.idea, d.name, d.email, d.company, d.phone, ipHash(ip), body && body.source === 'support' ? 'support' : 'form');
      notify(`New enquiry #${r.lastInsertRowid} from ${d.name}`);
      return send(res, 201, { ok: true });
    }

    if (pathname === '/api/admin/login' && m === 'POST') {
      let wait = rl.hit('login:' + ip, 10, 900e3);
      if (wait) return fail(res, 429, 'Too many attempts. Try again later.', { 'Retry-After': wait });
      const b = await readJson(req, 2048);
      const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 254) : '', pw = typeof b.password === 'string' ? b.password.slice(0, 200) : '';
      const u = db.prepare('SELECT * FROM users WHERE email=?').get(email);
      const locked = u && u.locked_until > Date.now();
      const good = await verifyPassword(pw, u ? u.pass_hash : DUMMY_HASH);   // always run a hash: constant-ish timing
      if (!u || locked || !good) {
        if (u && !locked) { const f = u.failed + 1; db.prepare('UPDATE users SET failed=?, locked_until=? WHERE id=?').run(f >= 5 ? 0 : f, f >= 5 ? Date.now() + 900e3 : 0, u.id); if (f >= 5) audit(db, email, 'lockout'); }
        return fail(res, 401, 'Invalid email or password.');               // same message for every failure
      }
      db.prepare('UPDATE users SET failed=0, locked_until=0 WHERE id=?').run(u.id);
      const s = createSession(db, u.id); audit(db, email, 'login');
      return send(res, 200, { ok: true, email: u.email, csrf: s.csrf }, { 'Set-Cookie': cookieHeader(s.token, s.maxAge) });
    }
    if (pathname === '/api/admin/logout' && m === 'POST') {
      if (!requireAdmin(req, res, true)) return;
      destroySession(db, cookies(req)[COOKIE]);
      return send(res, 200, { ok: true }, { 'Set-Cookie': cookieHeader('', 0) });
    }
    if (pathname === '/api/admin/me' && m === 'GET') {
      const s = requireAdmin(req, res, false); if (!s) return;
      return send(res, 200, { email: s.email, csrf: s.csrf });
    }
    if (pathname === '/api/admin/enquiries' && m === 'GET') {
      if (!requireAdmin(req, res, false)) return;
      const q = url.searchParams, status = q.get('status') || '', term = (q.get('q') || '').slice(0, 100);
      const limit = Math.min(100, Math.max(1, parseInt(q.get('limit') || '50', 10) || 50)), offset = Math.max(0, parseInt(q.get('offset') || '0', 10) || 0);
      const like = `%${term.replace(/[\\%_]/g, '\\$&')}%`;
      const where = `(?='' OR status=?) AND (?='' OR name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\' OR idea LIKE ? ESCAPE '\\')`;
      const args = [status, status, term, like, like, like, like];
      const rows = db.prepare(`SELECT id,created_at,idea,name,email,company,phone,status,notes,source FROM enquiries WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
      const total = db.prepare(`SELECT COUNT(*) c FROM enquiries WHERE ${where}`).get(...args).c;
      return send(res, 200, { rows, total });
    }
    if (pathname === '/api/admin/export.csv' && m === 'GET') {
      const s = requireAdmin(req, res, false); if (!s) return;
      const rows = db.prepare('SELECT id,created_at,name,email,company,phone,status,idea FROM enquiries ORDER BY id DESC').all();
      audit(db, s.email, 'export', rows.length);
      const csv = ['id,received,name,email,company,phone,status,idea', ...rows.map(r => [r.id, new Date(r.created_at).toISOString(), r.name, r.email, r.company, r.phone, r.status, r.idea].map(csvCell).join(','))].join('\r\n');
      return send(res, 200, csv, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="enquiries.csv"', 'Cache-Control': 'no-store' });
    }
    const one = /^\/api\/admin\/enquiries\/(\d{1,9})$/.exec(pathname);
    if (one && (m === 'PATCH' || m === 'DELETE')) {
      const s = requireAdmin(req, res, true); if (!s) return;
      const id = +one[1];
      if (m === 'DELETE') { const r = db.prepare('DELETE FROM enquiries WHERE id=?').run(id); audit(db, s.email, 'delete', id); return r.changes ? send(res, 200, { ok: true }) : fail(res, 404, 'Not found.'); }
      const v = validatePatch(await readJson(req, 4096)); if (!v.ok) return fail(res, 400, v.error);
      const cur = db.prepare('SELECT status,notes FROM enquiries WHERE id=?').get(id); if (!cur) return fail(res, 404, 'Not found.');
      const n = { ...cur, ...v.value };
      db.prepare('UPDATE enquiries SET status=?, notes=? WHERE id=?').run(n.status, n.notes, id); audit(db, s.email, 'update', id);
      return send(res, 200, { ok: true });
    }
    if (await portal(req, res, url)) return;
    return fail(res, 404, 'Not found.');
  }

  function serveStatic(req, res, url, root) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Method not allowed.', { Allow: 'GET, HEAD' });
    let p; try { p = decodeURIComponent(url.pathname); } catch { return fail(res, 400, 'Bad request.'); }
    if (p.includes('\0')) return fail(res, 400, 'Bad request.');
    const segs = p.split('/').filter(Boolean);
    if (segs.some(s => (s.startsWith('.') && s !== '.well-known') || DENY.has(s) || s === '..' || BLOCKED_EXT.has(extname(s).toLowerCase()))) return notFound(req, res, root);
    let file = resolve(root, '.' + sep + normalize(p));
    if (file !== root && !file.startsWith(root + sep)) return notFound(req, res, root);
    try { if (statSync(file).isDirectory()) file = join(file, 'index.html'); } catch { /* handled below */ }
    let st; try { st = statSync(file); if (!st.isFile()) throw 0; } catch { return notFound(req, res, root); }
    const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
    const cache = (res._hdr && res._hdr['Cache-Control']) || (type.startsWith('text/html') ? 'no-cache' : 'public, max-age=3600');   // the admin website forces no-store
    res.writeHead(200, { ...(res._hdr || baseHeaders), 'Content-Type': type, 'Content-Length': st.size, 'Cache-Control': cache });
    if (req.method === 'HEAD') return res.end();
    createReadStream(file).on('error', () => res.destroy()).pipe(res);
  }
  function notFound(req, res, root = siteDir) {
    try { const b = readFileSync(join(root, '404.html')); return send(res, 404, b, { 'Content-Type': 'text/html; charset=utf-8' }); }
    catch { return send(res, 404, 'Not found'); }
  }

  portal = createPortal({ db, rl, send, fail, readJson, originOk, cookies, clientIp, prod, mailer, notify, env, audit, requireAdmin, adminMail });

  const makeServer = kind => http.createServer(async (req, res) => {
    const t0 = Date.now(); res._hdr = kind === 'admin' ? adminHeaders : baseHeaders;
    res.on('finish', () => log({ site: kind, method: req.method, path: (req.url || '').split('?')[0].slice(0, 120), status: res.statusCode, ms: Date.now() - t0, ip: ipHash(clientIp(req)) }));
    try {
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/healthz') return send(res, 200, { ok: true });
      if (kind === 'admin' && !adminIpOk(clientIp(req))) return notFound(req, res, adminDir);     // other addresses see nothing
      if (url.pathname.startsWith('/api/')) return await api(req, res, url, kind);
      if (kind === 'public' && (url.pathname === '/admin' || url.pathname.startsWith('/admin/'))) return notFound(req, res);
      return serveStatic(req, res, url, kind === 'admin' ? adminDir : siteDir);
    } catch (e) {
      if (e && e.status) return fail(res, e.status, e.error, e.status === 413 ? { Connection: 'close' } : undefined);
      log({ level: 'error', msg: 'unhandled', err: String(e && e.message) });   // detail stays in the private log
      if (!res.headersSent) fail(res, 500, 'Something went wrong. Please try again.');
    }
  });
  const server = makeServer('public'), adminServer = makeServer('admin');
  for (const sv of [server, adminServer]) { sv.headersTimeout = 15e3; sv.requestTimeout = 20e3; sv.keepAliveTimeout = 5e3; }

  const purge = () => {
    db.prepare('DELETE FROM enquiries WHERE created_at < ?').run(Date.now() - retentionDays * 86400e3);
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now());
    db.prepare('DELETE FROM csessions WHERE expires_at < ?').run(Date.now());
    db.prepare('DELETE FROM login_codes WHERE expires_at < ?').run(Date.now());
    db.prepare('DELETE FROM quotes WHERE created_at < ?').run(Date.now() - retentionDays * 86400e3);
    db.prepare('DELETE FROM clients WHERE created_at < ? AND id NOT IN (SELECT client_id FROM quotes)').run(Date.now() - retentionDays * 86400e3);
  };
  if (!mailer.configured) log({ level: 'warn', msg: prod ? 'EMAIL IS NOT CONFIGURED: password-reset codes and notification emails cannot be sent. Set SMTP_* or RESEND_API_KEY.' : 'Email is not configured. Codes and admin alerts are printed in this terminal instead (set SMTP_* to send real email).' });
  if (!adminTo) log({ level: 'warn', msg: 'ADMIN_EMAIL / ADMIN_NOTIFY_EMAIL is not set: you will not be emailed when a client sends a request.' });
  purge(); const purgeTimer = setInterval(purge, 86400e3); purgeTimer.unref();
  async function bootstrapAdmin() {      // creates the first staff login from .env (only if it does not exist yet)
    const email = String(env.ADMIN_EMAIL || '').trim().toLowerCase(), pw = env.ADMIN_PASSWORD || '';
    if (!email || !pw) return;
    if (db.prepare('SELECT 1 FROM users WHERE email=?').get(email)) { warn('ADMIN_PASSWORD is still set in .env but the admin account already exists: delete that line from .env now. To change the password run: npm run create-admin -- ' + email); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !passwordOk(pw)) { warn('ADMIN_EMAIL / ADMIN_PASSWORD ignored: use a valid email and a password of 12 to 200 characters.'); return; }
    db.prepare('INSERT INTO users(email,pass_hash,created_at) VALUES(?,?,?)').run(email, await hashPassword(pw), Date.now()); audit(db, 'startup', 'admin-created', email);
    warn('Admin account created from .env. Delete the ADMIN_PASSWORD line from .env now (the password is stored only as a hash in the database).');
  }
  const close = () => new Promise(r => { rl.stop(); clearInterval(purgeTimer); let n = 2; const done = () => { if (--n === 0) { db.close(); r(); } }; server.close(done); adminServer.close(done); server.closeAllConnections?.(); adminServer.closeAllConnections?.(); });
  return { server, adminServer, db, close, hashPassword, bootstrapAdmin };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.loadEnvFile(join(ROOT, '.env')); } catch (_) { /* no .env file: use real environment variables */ }
  const app = createApp(), port = +process.env.PORT || 8080, aport = +process.env.ADMIN_PORT || 8081, ahost = process.env.ADMIN_HOST || '127.0.0.1';
  await app.bootstrapAdmin();
  app.server.listen(port, () => console.log(JSON.stringify({ msg: `public website on port ${port}`, env: process.env.NODE_ENV || 'development' })));
  app.adminServer.listen(aport, ahost, () => console.log(JSON.stringify({ msg: `ADMIN website on ${ahost}:${aport}` })));
  if (process.env.NODE_ENV === 'production' && ahost !== '127.0.0.1' && !process.env.ADMIN_ALLOWED_IPS) console.log(JSON.stringify({ level: 'warn', msg: 'The admin website is reachable from the network and ADMIN_ALLOWED_IPS is not set. Protect it with a firewall, VPN or IP list.' }));
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => app.close().then(() => process.exit(0)));
}
