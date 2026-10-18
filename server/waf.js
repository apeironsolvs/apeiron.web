// Apeiron Shield — Advanced Web Application Firewall (WAF) & Intrusion Prevention System
// Provides multi-layer defense against SQLi, XSS, RCE, exploit scanners, and bad actors.

const SCANNER_PROBES = [
  /(\/|^)(wp-admin|wp-login|wp-content|xmlrpc\.php|phpmyadmin|pma|adminer|actuator|telescope|debugbar)/i,
  /(\/|^)(cgi-bin|solr|autodiscover|owa|boaform|setup\.cgi|shell\.php|eval-stdin)/i,
  /(\/|^)(vendor\/phpunit|lib\/phpunit|tests\/phpunit)/i,
  /\.(php|asp|aspx|jsp|cgi|pl|bash)$/i
];

const SQLI_PATTERNS = [
  /(\b(union\s+all\s+select|union\s+select|select\s+.*\s+from\s+information_schema|insert\s+into\s+.*\s+values|drop\s+table|alter\s+table)\b)/i,
  /(;\s*(drop|alter|truncate|delete\s+from)\s+\w+)/i,
  /(\b(sleep|benchmark)\s*\(\s*\d+\s*\))/i,
  /('\s*or\s*['"]?1['"]?\s*=\s*['"]?1)/i,
  /(\bextractvalue\s*\(|\bupdatexml\s*\(|\bload_file\s*\()/i
];

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
  /javascript\s*:\s*[^\s]/i,
  /data\s*:\s*text\/html/i,
  /on(load|error|click|mouseover|mouseenter|focus|blur|change|submit)\s*=\s*['"][^'"]*['"]/i,
  /<(iframe|embed|object|base|svg\s+onload|body\s+onload)\b/i
];

const RCE_PATTERNS = [
  /\$\{\s*(jndi|env|lower|upper|main|sys):/i, // Log4Shell / OGNL
  /(;|\||`|\$\()\s*(curl|wget|bash|sh|nc|ncat|netcat|python|perl|ruby|powershell|cmd\.exe)\b/i
];

function isLocalhost(ip) {
  return !ip || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
}

export function createWAF(opts = {}) {
  const log = opts.log || console.log;
  const bannedIps = new Map(); // ip -> unbanTimestamp
  const banDurationMs = opts.banDurationMs || 900e3; // 15 minutes
  const violationThreshold = opts.violationThreshold || 5;
  const violations = new Map(); // ip -> { count, resetAt }

  // Prune expired bans & violations every 60s
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, unban] of bannedIps) {
      if (unban < now) bannedIps.delete(ip);
    }
    for (const [ip, v] of violations) {
      if (v.resetAt < now) violations.delete(ip);
    }
  }, 60e3);
  cleanupTimer.unref();

  function recordViolation(ip, reason) {
    if (isLocalhost(ip)) return; // Never jail localhost during dev or testing
    const now = Date.now();
    let v = violations.get(ip);
    if (!v || v.resetAt < now) {
      v = { count: 1, resetAt: now + 300e3 };
      violations.set(ip, v);
    } else {
      v.count++;
    }

    if (v.count >= violationThreshold) {
      bannedIps.set(ip, now + banDurationMs);
      log({ level: 'warn', msg: 'WAF: IP Jailed', ip, reason, banExpiresInMinutes: Math.round(banDurationMs / 60e3) });
    }
  }

  return {
    /**
     * Checks if an IP is currently banned by the firewall.
     */
    isBanned(ip) {
      if (isLocalhost(ip)) return false;
      const unban = bannedIps.get(ip);
      if (!unban) return false;
      if (unban < Date.now()) {
        bannedIps.delete(ip);
        return false;
      }
      return true;
    },

    /**
     * Inspects a request for malicious payloads.
     * @returns {null | { status: number, reason: string }} null if clean, or block descriptor
     */
    inspect(req, url, clientIp) {
      // 1. IP Jail check
      if (this.isBanned(clientIp)) {
        return { status: 403, reason: 'IP temporarily blocked by Apeiron Shield firewall due to repeated policy violations.' };
      }

      const pathname = url.pathname;
      const rawUrl = req.url || '';

      // 2. Known scanner exploit probes (e.g. /wp-admin, phpmyadmin, shell.php)
      for (const pattern of SCANNER_PROBES) {
        if (pattern.test(pathname) || pattern.test(rawUrl)) {
          recordViolation(clientIp, 'Scanner Probe: ' + pathname);
          return { status: 404, reason: 'Not found.' };
        }
      }

      // 3. Query string injection inspection
      let search = url.search || '';
      try { search = decodeURIComponent(search); } catch (_) {}
      if (search) {
        for (const pat of SQLI_PATTERNS) {
          if (pat.test(search)) {
            recordViolation(clientIp, 'SQL Injection query: ' + search);
            return { status: 403, reason: 'Access denied: Illegal SQL tokens in query.' };
          }
        }
        for (const pat of XSS_PATTERNS) {
          if (pat.test(search)) {
            recordViolation(clientIp, 'XSS query: ' + search);
            return { status: 403, reason: 'Access denied: Script tags in query.' };
          }
        }
        for (const pat of RCE_PATTERNS) {
          if (pat.test(search)) {
            recordViolation(clientIp, 'RCE query: ' + search);
            return { status: 403, reason: 'Access denied: Command injection payload detected.' };
          }
        }
      }

      // 4. Header injection check
      const host = req.headers.host || '';
      if (host && /[\r\n\0]/.test(host)) {
        return { status: 400, reason: 'Bad Request: Header injection detected.' };
      }

      return null;
    },

    /**
     * Inspects body payload (string or object) for deep attacks.
     */
    inspectBody(body, clientIp) {
      if (!body) return null;
      const str = typeof body === 'string' ? body : JSON.stringify(body);

      // Check for RCE / Log4j
      for (const pat of RCE_PATTERNS) {
        if (pat.test(str)) {
          recordViolation(clientIp, 'RCE in request body');
          return { status: 403, reason: 'Command execution payload detected.' };
        }
      }

      return null;
    },

    stop() {
      clearInterval(cleanupTimer);
    }
  };
}
