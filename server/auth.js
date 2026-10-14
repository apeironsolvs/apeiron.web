// Password hashing uses Node's built-in scrypt (OWASP-listed parameters). Sessions are random tokens; only their SHA-256 is stored.
import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scryptAsync = promisify(scrypt);
const N = 2 ** 16, R = 8, P = 2, KEYLEN = 64, MAXMEM = 192 * 1024 * 1024;
const sha256 = s => createHash('sha256').update(s).digest('hex');

export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}
export async function verifyPassword(pw, stored) {
  const [alg, n, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scryptAsync(pw, Buffer.from(salt, 'base64'), expected.length, { N: +n, r: +r, p: +p, maxmem: MAXMEM });
  return timingSafeEqual(key, expected);
}
// Burned when the email is unknown, so response time does not reveal which accounts exist.
export const DUMMY_HASH = await hashPassword(randomBytes(12).toString('hex'));
// Client password rules: 10 to 200 characters, not the email, not a very common password.
const COMMON = new Set(['password', 'password1', 'password123', '1234567890', '12345678910', 'qwertyuiop', 'iloveyou12', 'letmein1234', 'welcome123', 'admin12345', 'apeiron123', 'apeironsolutions']);
export function clientPasswordError(pw, email = '') {
  if (typeof pw !== 'string') return 'Please enter a password.';
  if (pw.length < 10) return 'Use at least 10 characters for your password.';
  if (pw.length > 200) return 'That password is too long.';
  const low = pw.toLowerCase();
  if (COMMON.has(low) || (email && low === String(email).toLowerCase()) || /^(.)\1+$/.test(pw)) return 'That password is too easy to guess. Please choose another.';
  return '';
}
export const passwordOk = pw => typeof pw === 'string' && pw.length >= 12 && pw.length <= 200;

const IDLE_MS = 2 * 3600e3, ABSOLUTE_MS = 8 * 3600e3;
export function createSession(db, userId) {
  const token = randomBytes(32).toString('hex'), csrf = randomBytes(24).toString('hex'), now = Date.now();
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); // rotation: one live session per user
  db.prepare('INSERT INTO sessions(id,user_id,csrf,created_at,expires_at,last_seen) VALUES(?,?,?,?,?,?)').run(sha256(token), userId, csrf, now, now + ABSOLUTE_MS, now);
  return { token, csrf, maxAge: ABSOLUTE_MS / 1000 };
}
export function getSession(db, token) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const id = sha256(token), now = Date.now();
  const s = db.prepare('SELECT s.*, u.email, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=?').get(id);
  if (!s || s.expires_at < now || now - s.last_seen > IDLE_MS) { if (s) db.prepare('DELETE FROM sessions WHERE id=?').run(id); return null; }
  db.prepare('UPDATE sessions SET last_seen=? WHERE id=?').run(now, id);
  return s;
}
export const destroySession = (db, token) => db.prepare('DELETE FROM sessions WHERE id=?').run(sha256(token || ''));
export const csrfOk = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
