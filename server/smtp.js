// Minimal SMTP client (implicit TLS, e.g. Gmail smtp.gmail.com:465). Built only on node:tls, no dependencies.
// Safe by construction: addresses and headers are validated, the body is base64, credentials are never logged.
import tls from 'node:tls';
import net from 'node:net';
import { randomBytes } from 'node:crypto';

const ADDR = /^[^\s@<>"',;:\\]+@[^\s@<>"',;:\\]+\.[^\s@<>"',;:\\]{2,}$/;
const bare = s => { const m = /<([^<>\s]+)>/.exec(String(s)); return (m ? m[1] : String(s)).trim(); };
const oneLine = s => String(s).replace(/[\r\n\0]+/g, ' ').slice(0, 200);
const encHeader = s => /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';

export function sendSmtp({ host, port = 465, secure = true, user, pass, from, to, subject, text, timeoutMs = 15000 }) {
  if (/[\r\n\0]/.test(String(from) + String(to))) return Promise.reject(new Error('invalid address'));   // never try to "clean" injected input
  const fromAddr = bare(from), toAddr = bare(to);
  if (!ADDR.test(fromAddr) || !ADDR.test(toAddr)) return Promise.reject(new Error('invalid address'));
  if (user && !secure && process.env.NODE_ENV === 'production') return Promise.reject(new Error('refusing to send credentials without TLS'));
  return new Promise((resolve, reject) => {
    const sock = secure ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    let buf = '', waiting = null, done = false;
    const finish = (err) => { if (done) return; done = true; sock.destroy(); err ? reject(err) : resolve(true); };
    sock.setTimeout(timeoutMs, () => finish(new Error('timeout')));
    sock.on('error', finish);
    sock.on('data', d => { buf += d.toString('utf8'); pump(); });
    function pump() {
      if (!waiting) return;
      const lines = buf.split('\r\n'); lines.pop();                       // drop the incomplete tail
      const end = lines.findIndex(l => /^\d{3}( |$)/.test(l));            // last line of a (possibly multi-line) reply
      if (end === -1) return;
      buf = buf.split('\r\n').slice(end + 1).join('\r\n');
      const w = waiting; waiting = null; w({ code: +lines[end].slice(0, 3), text: lines.slice(0, end + 1).join(' ') });
    }
    const read = () => new Promise(r => { waiting = r; pump(); });
    const step = async (cmd, ok) => { if (cmd !== null) sock.write(cmd + '\r\n'); const r = await read(); if (!ok.includes(r.code)) throw new Error('SMTP ' + r.code); return r; };
    (async () => {
      await step(null, [220]);
      await step('EHLO apeiron.local', [250]);
      if (user) await step('AUTH PLAIN ' + Buffer.from(`\0${user}\0${pass}`, 'utf8').toString('base64'), [235]);
      await step(`MAIL FROM:<${fromAddr}>`, [250]);
      await step(`RCPT TO:<${toAddr}>`, [250, 251]);
      await step('DATA', [354]);
      const body = Buffer.from(String(text).slice(0, 8000), 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');
      const msg = [`From: ${encHeader(oneLine(from))}`, `To: ${toAddr}`, `Subject: ${encHeader(oneLine(subject))}`, `Date: ${new Date().toUTCString()}`,
        `Message-ID: <${randomBytes(12).toString('hex')}@apeiron.local>`, 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', body].join('\r\n');
      sock.write(msg + '\r\n.\r\n'); await step(null, [250]);
      try { await step('QUIT', [221]); } catch (_) { /* server may just close */ }
      finish();
    })().catch(finish);
  });
}
