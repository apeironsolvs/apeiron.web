// Fixed-window in-memory limiter. Fine for one instance; use a shared store (Redis) if you scale to several.
export function limiter() {
  const hits = new Map();
  const timer = setInterval(() => { const n = Date.now(); for (const [k, v] of hits) if (v.reset < n) hits.delete(k); }, 60e3);
  timer.unref();
  return {
    // returns seconds to wait when blocked, or 0 when allowed
    hit(key, max, windowMs) {
      const now = Date.now(); let h = hits.get(key);
      if (!h || h.reset < now) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
      if (++h.n > max) return Math.ceil((h.reset - now) / 1000);
      return 0;
    },
    reset(key) {
      hits.delete(key);
    },
    stop: () => clearInterval(timer)
  };
}
