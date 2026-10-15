// Database layer: Supports Supabase Cloud Database (default when configured) and SQLite (local fallback).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createSupabaseClient, createSupabaseDb } from './supabase.js';

export function createSqliteDb(dataDir) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const raw = new DatabaseSync(`${dataDir}/apeiron.db`);
  raw.exec(`
    PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA secure_delete=ON;
    CREATE TABLE IF NOT EXISTS meta(k TEXT PRIMARY KEY, v TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, pass_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin')),
      failed INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(
      id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS enquiries(
      id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, idea TEXT NOT NULL, name TEXT NOT NULL,
      email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','qualified','closed','spam')),
      notes TEXT NOT NULL DEFAULT '', ip_hash TEXT NOT NULL DEFAULT '', consent INTEGER NOT NULL DEFAULT 0);
    CREATE INDEX IF NOT EXISTS enq_created ON enquiries(created_at);
    CREATE INDEX IF NOT EXISTS enq_email ON enquiries(email);
    CREATE TABLE IF NOT EXISTS clients(id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_codes(email TEXT PRIMARY KEY, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS csessions(
      id TEXT PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      csrf TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, last_seen INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS quotes(
      id INTEGER PRIMARY KEY, client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      idea TEXT NOT NULL, name TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
      services TEXT NOT NULL DEFAULT '[]', reqs TEXT NOT NULL DEFAULT '{}', notes TEXT NOT NULL DEFAULT '{}',
      plan TEXT NOT NULL DEFAULT '' CHECK(plan IN ('','subscription','build')),
      build_total INTEGER NOT NULL DEFAULT 0, monthly INTEGER NOT NULL DEFAULT 0, negotiation TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','negotiating','submitted','accepted','declined')),
      project_status TEXT NOT NULL DEFAULT 'received' CHECK(project_status IN ('received','planning','building','review','delivered')),
      consent INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS quotes_client ON quotes(client_id);
    CREATE TABLE IF NOT EXISTS quote_comments(
      id INTEGER PRIMARY KEY, quote_id INTEGER NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
      author TEXT NOT NULL CHECK(author IN ('client','admin')), message TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS qc_quote ON quote_comments(quote_id);
    CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY, ts INTEGER NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL DEFAULT '');
  `);

  const has = (t, c) => raw.prepare(`PRAGMA table_info(${t})`).all().some(r => r.name === c);
  for (const [t, c, ddl] of [
    ['clients', 'name', "TEXT NOT NULL DEFAULT ''"],
    ['clients', 'consent_at', 'INTEGER NOT NULL DEFAULT 0'],
    ['login_codes', 'name', "TEXT NOT NULL DEFAULT ''"],
    ['login_codes', 'consent', 'INTEGER NOT NULL DEFAULT 0'],
    ['enquiries', 'source', "TEXT NOT NULL DEFAULT 'form'"],
    ['clients', 'pass_hash', "TEXT NOT NULL DEFAULT ''"],
    ['clients', 'terms_version', "TEXT NOT NULL DEFAULT ''"],
    ['clients', 'terms_at', 'INTEGER NOT NULL DEFAULT 0'],
    ['clients', 'failed', 'INTEGER NOT NULL DEFAULT 0'],
    ['clients', 'locked_until', 'INTEGER NOT NULL DEFAULT 0'],
    ['clients', 'company', "TEXT NOT NULL DEFAULT ''"],
    ['clients', 'phone', "TEXT NOT NULL DEFAULT ''"],
  ]) {
    if (!has(t, c)) raw.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${ddl}`);
  }

  if (!raw.prepare("SELECT v FROM meta WHERE k='ip_salt'").get()) {
    raw.prepare("INSERT INTO meta(k,v) VALUES('ip_salt',?)").run(randomBytes(32).toString('hex'));
  }

  const db = {
    type: 'sqlite',
    raw,
    prepare: (...args) => raw.prepare(...args),
    exec: (...args) => raw.exec(...args),

    async getIpSalt() {
      return raw.prepare("SELECT v FROM meta WHERE k='ip_salt'").get().v;
    },

    async audit(actor, action, target = '') {
      raw.prepare('INSERT INTO audit_log(ts,actor,action,target) VALUES(?,?,?,?)').run(Date.now(), String(actor), String(action), String(target));
    },

    users: {
      async getByEmail(email) {
        return raw.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) || null;
      },
      async getById(id) {
        return raw.prepare('SELECT * FROM users WHERE id=?').get(id) || null;
      },
      async count() {
        return raw.prepare('SELECT COUNT(*) c FROM users').get().c;
      },
      async create({ email, pass_hash, role = 'admin', created_at = Date.now() }) {
        const r = raw.prepare('INSERT INTO users(email,pass_hash,role,created_at) VALUES(?,?,?,?)').run(email.toLowerCase(), pass_hash, role, created_at);
        return { id: Number(r.lastInsertRowid), email, role, created_at };
      },
      async updateLockout(id, failed, locked_until) {
        raw.prepare('UPDATE users SET failed=?, locked_until=? WHERE id=?').run(failed, locked_until, id);
      },
      async resetLockout(id) {
        raw.prepare('UPDATE users SET failed=0, locked_until=0 WHERE id=?').run(id);
      },
      async updatePassword(email, pass_hash) {
        raw.prepare('UPDATE users SET pass_hash=?, failed=0, locked_until=0 WHERE email=?').run(pass_hash, email.toLowerCase());
      },
    },

    sessions: {
      async create({ id, user_id, csrf, created_at, expires_at, last_seen }) {
        raw.prepare('DELETE FROM sessions WHERE user_id=?').run(user_id);
        raw.prepare('INSERT INTO sessions(id,user_id,csrf,created_at,expires_at,last_seen) VALUES(?,?,?,?,?,?)').run(id, user_id, csrf, created_at, expires_at, last_seen);
        return { id, user_id, csrf, created_at, expires_at, last_seen };
      },
      async get(id) {
        const s = raw.prepare('SELECT s.*, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?').get(id);
        return s || null;
      },
      async touch(id, last_seen = Date.now()) {
        raw.prepare('UPDATE sessions SET last_seen=? WHERE id=?').run(last_seen, id);
      },
      async delete(id) {
        raw.prepare('DELETE FROM sessions WHERE id=?').run(id);
      },
      async deleteByUserId(user_id) {
        raw.prepare('DELETE FROM sessions WHERE user_id=?').run(user_id);
      },
    },

    enquiries: {
      async create({ created_at = Date.now(), idea, name, email, company = '', phone = '', status = 'new', notes = '', ip_hash = '', consent = 1, source = 'form' }) {
        const r = raw.prepare('INSERT INTO enquiries(created_at,idea,name,email,company,phone,ip_hash,consent,source) VALUES(?,?,?,?,?,?,?,1,?)').run(created_at, idea, name, email, company, phone, ip_hash, source);
        return { id: Number(r.lastInsertRowid) };
      },
      async list({ status, search, limit = 50, offset = 0 } = {}) {
        let where = '1=1', args = [];
        if (status) { where += ' AND status=?'; args.push(status); }
        if (search) { where += " AND (name LIKE ? OR email LIKE ? OR company LIKE ? OR idea LIKE ?)"; const s = `%${search}%`; args.push(s, s, s, s); }
        const rows = raw.prepare(`SELECT id,created_at,idea,name,email,company,phone,status,notes,source FROM enquiries WHERE ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, limit, offset);
        const total = raw.prepare(`SELECT COUNT(*) c FROM enquiries WHERE ${where}`).get(...args).c;
        return { rows, total };
      },
      async listAllBrief() {
        return raw.prepare('SELECT id,created_at,name,email,company,phone,status,idea FROM enquiries ORDER BY id DESC').all();
      },
      async get(id) {
        return raw.prepare('SELECT status,notes FROM enquiries WHERE id=?').get(id) || null;
      },
      async update(id, { status, notes }) {
        raw.prepare('UPDATE enquiries SET status=?, notes=? WHERE id=?').run(status, notes, id);
      },
      async delete(id) {
        const r = raw.prepare('DELETE FROM enquiries WHERE id=?').run(id);
        return r.changes > 0;
      },
      async deleteByEmail(email) {
        const r = raw.prepare('DELETE FROM enquiries WHERE email=?').run(email.toLowerCase());
        return r.changes;
      },
    },

    clients: {
      async getByEmail(email) {
        return raw.prepare('SELECT * FROM clients WHERE email=?').get(email.toLowerCase()) || null;
      },
      async getById(id) {
        return raw.prepare('SELECT * FROM clients WHERE id=?').get(id) || null;
      },
      async create({ email, name, pass_hash = '', terms_version = '', terms_at = 0, consent_at = Date.now(), created_at = Date.now() }) {
        const r = raw.prepare('INSERT INTO clients(email,name,pass_hash,terms_version,terms_at,consent_at,created_at) VALUES(?,?,?,?,?,?,?)').run(email.toLowerCase(), name, pass_hash, terms_version, terms_at, consent_at, created_at);
        return { id: Number(r.lastInsertRowid), email, name };
      },
      async updateLockout(id, failed, locked_until) {
        raw.prepare('UPDATE clients SET failed=?, locked_until=? WHERE id=?').run(failed, locked_until, id);
      },
      async resetLockout(id) {
        raw.prepare('UPDATE clients SET failed=0, locked_until=0 WHERE id=?').run(id);
      },
      async updateTerms(id, terms_version, terms_at = Date.now()) {
        raw.prepare('UPDATE clients SET terms_version=?, terms_at=? WHERE id=?').run(terms_version, terms_at, id);
      },
      async updateProfile(id, { name, company = '', phone = '' }) {
        raw.prepare('UPDATE clients SET name=?, company=?, phone=? WHERE id=?').run(name, company, phone, id);
      },
      async updatePassword(email, pass_hash) {
        raw.prepare('UPDATE clients SET pass_hash=? WHERE email=?').run(pass_hash, email.toLowerCase());
      },
      async delete(id) {
        const r = raw.prepare('DELETE FROM clients WHERE id=?').run(id);
        return r.changes > 0;
      },
      async deleteByEmail(email) {
        const r = raw.prepare('DELETE FROM clients WHERE email=?').run(email.toLowerCase());
        return r.changes;
      },
    },

    loginCodes: {
      async get(email) {
        return raw.prepare('SELECT * FROM login_codes WHERE email=?').get(email.toLowerCase()) || null;
      },
      async upsert({ email, code_hash, expires_at, attempts = 0, name = '', consent = 0 }) {
        raw.prepare('INSERT INTO login_codes(email,code_hash,expires_at,attempts,name,consent) VALUES(?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET code_hash=excluded.code_hash, expires_at=excluded.expires_at, attempts=0, name=excluded.name, consent=excluded.consent')
          .run(email.toLowerCase(), code_hash, expires_at, attempts, name, consent);
      },
      async updateAttempts(email, attempts) {
        raw.prepare('UPDATE login_codes SET attempts=? WHERE email=?').run(attempts, email.toLowerCase());
      },
      async delete(email) {
        raw.prepare('DELETE FROM login_codes WHERE email=?').run(email.toLowerCase());
      },
    },

    csessions: {
      async create({ id, client_id, csrf, created_at, expires_at, last_seen }) {
        raw.prepare('DELETE FROM csessions WHERE client_id=? AND expires_at < ?').run(client_id, created_at);
        raw.prepare('INSERT INTO csessions(id,client_id,csrf,created_at,expires_at,last_seen) VALUES(?,?,?,?,?,?)').run(id, client_id, csrf, created_at, expires_at, last_seen);
        return { id, client_id, csrf, created_at, expires_at, last_seen };
      },
      async get(id) {
        return raw.prepare('SELECT s.*, c.email, c.name, c.company, c.phone FROM csessions s JOIN clients c ON c.id=s.client_id WHERE s.id=?').get(id) || null;
      },
      async touch(id, last_seen = Date.now()) {
        raw.prepare('UPDATE csessions SET last_seen=? WHERE id=?').run(last_seen, id);
      },
      async delete(id) {
        raw.prepare('DELETE FROM csessions WHERE id=?').run(id);
      },
      async deleteByClientId(client_id) {
        raw.prepare('DELETE FROM csessions WHERE client_id=?').run(client_id);
      },
    },

    quotes: {
      async create({ client_id, idea, name, company = '', phone = '', services = '[]', reqs = '{}', notes = '{}', plan = '', build_total = 0, monthly = 0, negotiation = '', status = 'draft', project_status = 'received', consent = 1, created_at = Date.now(), updated_at = Date.now() }) {
        const r = raw.prepare('INSERT INTO quotes(client_id,idea,name,company,phone,services,reqs,consent,created_at,updated_at) VALUES(?,?,?,?,?,?,?,1,?,?)')
          .run(client_id, idea, name, company, phone, services, reqs, created_at, updated_at);
        return { id: Number(r.lastInsertRowid) };
      },
      async listByClient(client_id, limit = 50) {
        return raw.prepare('SELECT * FROM quotes WHERE client_id=? ORDER BY id DESC LIMIT ?').all(client_id, limit);
      },
      async getByIdAndClient(id, client_id) {
        return raw.prepare('SELECT * FROM quotes WHERE id=? AND client_id=?').get(id, client_id) || null;
      },
      async getById(id) {
        return raw.prepare('SELECT q.*, c.email FROM quotes q JOIN clients c ON c.id=q.client_id WHERE q.id=?').get(id) || null;
      },
      async update(id, fields) {
        const keys = Object.keys(fields);
        if (!keys.length) return;
        const setSql = keys.map(k => `${k}=?`).join(',');
        const vals = keys.map(k => fields[k]);
        raw.prepare(`UPDATE quotes SET ${setSql} WHERE id=?`).run(...vals, id);
      },
      async listForAdmin(limit = 100) {
        return raw.prepare('SELECT q.*, c.email, c.name AS cname, c.company AS ccompany, c.phone AS cphone FROM quotes q JOIN clients c ON c.id=q.client_id ORDER BY q.id DESC LIMIT ?').all(limit);
      },
    },

    quoteComments: {
      async listByQuote(quote_id) {
        return raw.prepare('SELECT author,message,created_at FROM quote_comments WHERE quote_id=? ORDER BY id').all(quote_id);
      },
      async create({ quote_id, author, message, created_at = Date.now() }) {
        const r = raw.prepare('INSERT INTO quote_comments(quote_id,author,message,created_at) VALUES(?,?,?,?)').run(quote_id, author, message, created_at);
        return { id: Number(r.lastInsertRowid) };
      },
    },

    async purge(retentionDays = 365) {
      const now = Date.now();
      const cutoff = now - retentionDays * 86400e3;
      raw.prepare('DELETE FROM enquiries WHERE created_at < ?').run(cutoff);
      raw.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
      raw.prepare('DELETE FROM csessions WHERE expires_at < ?').run(now);
      raw.prepare('DELETE FROM login_codes WHERE expires_at < ?').run(now);
      raw.prepare('DELETE FROM quotes WHERE created_at < ?').run(cutoff);
      raw.prepare('DELETE FROM clients WHERE created_at < ? AND id NOT IN (SELECT client_id FROM quotes)').run(cutoff);
    },

    async close() {
      raw.close();
    },
  };

  return db;
}

export function openDb(dataDir, env = process.env) {
  const isSupabaseConfigured = Boolean(env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY));
  const forceSqlite = env.DATABASE_BACKEND === 'sqlite';

  if (isSupabaseConfigured && !forceSqlite) {
    const client = createSupabaseClient(env);
    if (client) {
      return createSupabaseDb(client);
    }
  }

  return createSqliteDb(dataDir);
}

export const audit = (db, actor, action, target = '') => db.audit(actor, action, String(target));
