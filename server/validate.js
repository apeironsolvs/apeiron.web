// Server-side validation. Never trust the browser. Returns {ok,value} or {ok:false,error}.
const ctrl = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u2028\u2029]/g;
const line = (v, max) => typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').replace(ctrl, '').trim().slice(0, max) : '';
const EMAIL = /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]{2,}$/;

export function validateEnquiry(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, error: 'Invalid request.' };
  if (typeof b.website === 'string' && b.website !== '') return { ok: true, bot: true }; // honeypot
  const idea = typeof b.idea === 'string' ? b.idea.replace(/\r\n?/g, '\n').replace(ctrl, '').trim() : '';
  const name = line(b.name, 100), email = line(b.email, 254).toLowerCase();
  if (idea.length < 3 || idea.length > 1000) return { ok: false, error: 'Please describe your idea in 3 to 1000 characters.' };
  if (!name) return { ok: false, error: 'Please add your name.' };
  if (!EMAIL.test(email)) return { ok: false, error: 'Please enter a valid email address.' };
  if (b.consent !== true) return { ok: false, error: 'Please accept the privacy notice.' };
  return { ok: true, value: { idea, name, email, company: line(b.company, 100), phone: line(b.phone, 50) } };
}
export const STATUSES = ['new', 'contacted', 'qualified', 'closed', 'spam'];
export function validatePatch(b) {
  if (!b || typeof b !== 'object') return { ok: false, error: 'Invalid request.' };
  const out = {};
  if (b.status !== undefined) { if (!STATUSES.includes(b.status)) return { ok: false, error: 'Invalid status.' }; out.status = b.status; }
  if (b.notes !== undefined) { if (typeof b.notes !== 'string' || b.notes.length > 2000) return { ok: false, error: 'Notes too long.' }; out.notes = b.notes.replace(ctrl, ''); }
  return Object.keys(out).length ? { ok: true, value: out } : { ok: false, error: 'Nothing to update.' };
}
// Spreadsheet formula injection guard for CSV export.
export const csvCell = v => { let s = String(v ?? '').replace(/\r?\n/g, ' '); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
