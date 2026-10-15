// Privacy request: delete everything we hold for one email. Usage: npm run erase -- person@example.com
import { openDb, audit } from '../server/db.js';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
try { process.loadEnvFile(join(ROOT, '.env')); } catch (_) {}

const email = (process.argv[2] || '').trim().toLowerCase();
if (!email) { console.error('Usage: npm run erase -- person@example.com'); process.exit(1); }
const db = openDb(resolve(process.env.DATA_DIR || 'data'), process.env);
const enqChanges = await db.enquiries.deleteByEmail(email);
const clientChanges = await db.clients.deleteByEmail(email);
await db.loginCodes.delete(email);
await audit(db, 'cli', 'erase', `${enqChanges} enquiries, ${clientChanges} account(s) with their quotes`);
console.log(`Deleted ${enqChanges} enquiry record(s) and ${clientChanges} account(s) (with their quotes) for ${email} on ${db.type}.`);
await db.close();
