// Vercel Serverless Function entry point
import { createApp } from '../server/index.js';

let appInstance = null;
let appInitPromise = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (!appInitPromise) {
    appInitPromise = (async () => {
      const dataDir = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/data' : undefined);
      const app = createApp({ ...process.env, SINGLE_PORT: '1', ...(dataDir ? { DATA_DIR: dataDir } : {}) });
      await app.bootstrapAdmin();
      appInstance = app;
      return app;
    })();
  }
  return appInitPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    // Vercel internal rewrites may set req.url to destination (/api/index.js).
    // Restore original request path from x-matched-path or x-forwarded-uri if present.
    const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'];
    if (matched && (req.url.startsWith('/api/index.js') || req.url === '/api' || !req.url.startsWith('/api/'))) {
      const qIdx = req.url.indexOf('?');
      const query = qIdx >= 0 ? req.url.slice(qIdx) : '';
      req.url = matched.includes('?') ? matched : (matched + query);
    }
    // Ensure socket object exists for environments where req.socket is undefined
    if (!req.socket) {
      req.socket = { remoteAddress: '127.0.0.1' };
    }
    // Await response completion before terminating the serverless function context
    await new Promise(resolve => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', resolve);
      app.server.emit('request', req, res);
    });
  } catch (err) {
    console.error('API Serverless Handler Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Server initialization error', details: err?.message || String(err) }));
    }
  }
}
