// SQLite via Node's built-in node:sqlite. Every query is parameterised (no string-built SQL).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

export function openDb(dataDir) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(`${dataDir}/apeiron.db`);
  db.exec(`
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
  const has = (t, c) => db.prepare(`PRAGMA table_info(${t})`).all().some(r => r.name === c);
  for (const [t, c, ddl] of [['clients', 'name', "TEXT NOT NULL DEFAULT ''"], ['clients', 'consent_at', 'INTEGER NOT NULL DEFAULT 0'],
    ['login_codes', 'name', "TEXT NOT NULL DEFAULT ''"], ['login_codes', 'consent', 'INTEGER NOT NULL DEFAULT 0'], ['enquiries', 'source', "TEXT NOT NULL DEFAULT 'form'"],
    ['clients', 'pass_hash', "TEXT NOT NULL DEFAULT ''"], ['clients', 'terms_version', "TEXT NOT NULL DEFAULT ''"], ['clients', 'terms_at', 'INTEGER NOT NULL DEFAULT 0'],
    ['clients', 'failed', 'INTEGER NOT NULL DEFAULT 0'], ['clients', 'locked_until', 'INTEGER NOT NULL DEFAULT 0'],
    ['clients', 'company', "TEXT NOT NULL DEFAULT ''"], ['clients', 'phone', "TEXT NOT NULL DEFAULT ''"]])
    if (!has(t, c)) db.exec(`ALTER TABLE ${t} ADD COLUMN ${c} ${ddl}`);   // upgrades older databases in place
  // Per-install random salt so stored IP hashes cannot be reversed with a rainbow table.
  if (!db.prepare("SELECT v FROM meta WHERE k='ip_salt'").get())
    db.prepare("INSERT INTO meta(k,v) VALUES('ip_salt',?)").run(randomBytes(32).toString('hex'));
  return db;
}
export const audit = (db, actor, action, target = '') =>
  db.prepare('INSERT INTO audit_log(ts,actor,action,target) VALUES(?,?,?,?)').run(Date.now(), actor, action, String(target));
