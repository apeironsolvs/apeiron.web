#!/usr/bin/env node
// Keep-Alive Worker for Apeiron Solutions
// Pings the web service periodically to prevent Render.com / free-tier host spin-down delays.

const target = process.argv[2] || process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;

if (!target) {
  console.log('Usage: node scripts/keepalive.js <URL>');
  console.log('Example: node scripts/keepalive.js https://apeiron-web.onrender.com');
  process.exit(0);
}

const endpoint = target.replace(/\/+$/, '') + '/healthz';

async function ping() {
  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      headers: { 'User-Agent': 'ApeironKeepAlive/1.0' },
      signal: AbortSignal.timeout(15000)
    });
    const duration = Date.now() - start;
    if (res.ok) {
      console.log(`[${new Date().toISOString()}] Ping OK -> ${endpoint} (${duration}ms) [Status ${res.status}]`);
    } else {
      console.warn(`[${new Date().toISOString()}] Ping Warning -> ${endpoint} (${duration}ms) [Status ${res.status}]`);
    }
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Ping Failed -> ${endpoint}: ${err.message}`);
  }
}

// Single-run if executed once, or loop if run with --loop
if (process.argv.includes('--loop')) {
  console.log(`Starting continuous keep-alive loop for ${endpoint} (every 9 minutes)...`);
  ping();
  setInterval(ping, 540e3);
} else {
  await ping();
}
