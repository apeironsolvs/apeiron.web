// Vercel Serverless Function entry point
import { createApp } from '../server/index.js';

let appInstance = null;
let appInitPromise = null;

async function getApp() {
  if (appInstance) return appInstance;
  if (!appInitPromise) {
    appInitPromise = (async () => {
      const app = createApp({ ...process.env, SINGLE_PORT: '1' });
      await app.bootstrapAdmin();
      appInstance = app;
      return app;
    })();
  }
  return appInitPromise;
}

export default async function handler(req, res) {
  const app = await getApp();
  app.server.emit('request', req, res);
}
