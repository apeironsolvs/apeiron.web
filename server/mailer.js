// Sends plain-text email. Picks the first configured option: SMTP (e.g. Gmail), then a Resend-compatible HTTP API.
// Not configured? send() returns false and `configured` is false, so callers can explain instead of failing silently.
import { sendSmtp } from './smtp.js';
export function createMailer(env, log) {
  const prod = env.NODE_ENV === 'production';
  const one = s => String(s).replace(/[\r\n]+/g, ' ').slice(0, 200);
  const smtp = env.SMTP_HOST && env.SMTP_PASS ? { host: env.SMTP_HOST, port: +env.SMTP_PORT || 465, user: env.SMTP_USER || '', pass: env.SMTP_PASS, secure: prod ? true : env.SMTP_SECURE !== '0' } : null;
  const key = env.RESEND_API_KEY, url = env.MAIL_API_URL || 'https://api.resend.com/emails';
  const from = env.MAIL_FROM || (smtp && smtp.user ? `Apeiron <${smtp.user}>` : '');
  const mode = smtp && from ? 'smtp' : key && from ? 'resend' : 'none';
  return {
    mode, configured: mode !== 'none',
    async send({ to, subject, text }) {
      try {
        if (mode === 'smtp') return await sendSmtp({ ...smtp, from, to, subject, text });
        if (mode === 'resend') {
          const r = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to: [one(to)], subject: one(subject), text: String(text).slice(0, 8000) }), signal: AbortSignal.timeout(8000) });
          if (!r.ok) log({ level: 'warn', msg: 'email provider rejected message', status: r.status });
          return r.ok;
        }
        log({ level: 'warn', msg: 'email not configured, message not sent' }); return false;
      } catch (e) { log({ level: 'warn', msg: 'email send failed', mode, err: String(e.message).slice(0, 80) }); return false; }
    }
  };
}
