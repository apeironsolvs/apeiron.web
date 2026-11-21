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
  const app = await getApp();
  // Vercel internal rewrites may set req.url to destination (/api/index.js).
  // Restore original request path from x-matched-path or x-forwarded-uri if present.
  const matched = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'];
  if (matched && (req.url === '/api/index.js' || req.url === '/api' || !req.url.startsWith('/api/'))) {
    req.url = matched;
  }
  app.server.emit('request', req, res);
}
