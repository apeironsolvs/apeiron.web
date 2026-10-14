// Privacy request: delete everything we hold for one email. Usage: npm run erase -- person@example.com
import { openDb, audit } from '../server/db.js';
import { resolve } from 'node:path';
const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Usage: npm run erase -- person@example.com'); process.exit(1); }
const db = openDb(resolve(process.env.DATA_DIR || 'data'));
const r = db.prepare('DELETE FROM enquiries WHERE email=?').run(email);
const c = db.prepare('DELETE FROM clients WHERE email=?').run(email);   // cascades to quotes and sessions
db.prepare('DELETE FROM login_codes WHERE email=?').run(email);
audit(db, 'cli', 'erase', `${r.changes} enquiries, ${c.changes} account(s) with their quotes`); console.log(`Deleted ${r.changes} enquiry record(s) and ${c.changes} account(s) (with their quotes) for ${email}.`);
