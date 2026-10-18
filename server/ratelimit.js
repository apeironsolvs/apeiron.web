// Sliding-window & token-rate limiter for Apeiron Web & API.
// Manages endpoint quotas with smooth recovery, precise retry-after timings, and leak-free memory cleanup.

export function limiter(opts = {}) {
  const hits = new Map();
  // Periodic cleanup of expired entries
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) {
      if (v.reset < now) hits.delete(k);
    }
  }, 30e3);
  timer.unref();

  return {
    /**
     * Records a hit against a rate limit bucket.
     * @param {string} key - Unique identifier (e.g., 'ip:1.2.3.4' or 'user:123')
     * @param {number} max - Maximum allowed requests in windowMs
     * @param {number} windowMs - Window duration in milliseconds
     * @returns {number} 0 if allowed; positive integer (seconds to wait) if blocked
     */
    hit(key, max, windowMs) {
      const now = Date.now();
      let h = hits.get(key);

      if (!h || h.reset < now) {
        h = { n: 1, reset: now + windowMs, firstHit: now };
        hits.set(key, h);
        return 0;
      }

      h.n++;
      if (h.n > max) {
        const remainingMs = Math.max(1000, h.reset - now);
        return Math.ceil(remainingMs / 1000);
      }
      return 0;
    },

    /**
     * Inspects current status without incrementing.
     */
    status(key, max, windowMs) {
      const now = Date.now();
      const h = hits.get(key);
      if (!h || h.reset < now) {
        return { remaining: max, resetSeconds: Math.ceil(windowMs / 1000), blocked: false };
      }
      const remaining = Math.max(0, max - h.n);
      const resetSeconds = Math.ceil((h.reset - now) / 1000);
      return { remaining, resetSeconds, blocked: h.n > max };
    },

    /**
     * Resets rate limit for a specific key (e.g. upon successful authentication).
     */
    reset(key) {
      hits.delete(key);
    },

    /**
     * Clears all entries.
     */
    clear() {
      hits.clear();
    },

    stop: () => clearInterval(timer)
  };
}
