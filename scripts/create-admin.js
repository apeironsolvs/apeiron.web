// Usage: npm run create-admin -- you@company.com   (prompts for the password; min 12 chars)
import { createInterface } from 'node:readline';
import { openDb, audit } from '../server/db.js';
import { hashPassword, passwordOk } from '../server/auth.js';
import { resolve } from 'node:path';
const email = (process.argv[2] || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { console.error('Usage: npm run create-admin -- you@company.com'); process.exit(1); }
async function ask() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;   // CI only: env vars can leak into shell history/process lists
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  rl._writeToOutput = s => { if (s.includes('Password')) rl.output.write(s); };  // hide typing
  return new Promise(r => rl.question('Password (min 12 chars): ', a => { rl.close(); console.log(); r(a); }));
}
const pw = await ask();
if (!passwordOk(pw)) { console.error('Password must be 12 to 200 characters.'); process.exit(1); }
const db = openDb(resolve(process.env.DATA_DIR || 'data'));
db.prepare('INSERT INTO users(email,pass_hash,created_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET pass_hash=excluded.pass_hash, failed=0, locked_until=0')
  .run(email, await hashPassword(pw), Date.now());
audit(db, 'cli', 'create-or-reset-admin', email); console.log('Admin saved:', email);
