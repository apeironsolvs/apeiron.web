// Consistent backup of the database while the site is running. Usage: npm run backup
// Writes data/backups/apeiron-YYYY-MM-DD-HHMMSS.db (owner-only permissions) and keeps the newest BACKUP_KEEP copies (default 14).
// Store these copies somewhere ENCRYPTED and off the server (encrypted disk/volume or your host's backup feature).
import { createSqliteDb } from '../server/db.js';
import { mkdirSync, chmodSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
const dataDir = resolve(process.env.DATA_DIR || 'data'), dir = join(dataDir, 'backups');
mkdirSync(dir, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19), file = join(dir, `apeiron-${stamp}.db`);

if (process.env.DATABASE_BACKEND === 'supabase' && !process.env.DATA_DIR) {
  console.log('Supabase Cloud database in use: automated cloud backups are managed directly in your Supabase project dashboard.');
  process.exit(0);
}

const db = createSqliteDb(dataDir);
db.raw.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);       // a safe, consistent snapshot (does not stop the site)
await db.close(); chmodSync(file, 0o600);
const keep = Math.max(1, parseInt(process.env.BACKUP_KEEP || '14', 10) || 14);
const all = readdirSync(dir).filter(f => /^apeiron-.*\.db$/.test(f)).sort();
for (const old of all.slice(0, Math.max(0, all.length - keep))) rmSync(join(dir, old));
console.log(`Backup written: ${file} (keeping the newest ${keep})`);
