// PRICING CATALOG. Amounts are STARTING ESTIMATES in INR, excluding taxes. The owner must review and set real prices.
// Prices are decided here on the server: whatever the browser sends is ignored.
export const SERVICES = {
  frontend:   { name: 'Frontend website', blurb: 'Websites and landing pages people enjoy using', base: 40000,
    kw: /\b(website|landing|portfolio|pages?|ui|ux|design|front-?end|blog|brochure)\b/i,
    reqs: { pages: ['Up to 5 pages', 0], cms: ['Edit content yourself (CMS)', 15000, /edit|update (content|text)|cms|blog|news/i], anim: ['Animations and interactive sections', 12000, /animat|interactive|3d|motion/i], seo: ['SEO and analytics setup', 8000, /seo|google|rank|traffic|analytics/i], lang: ['Multiple languages', 10000, /language|multilingual|malayalam|hindi|translate/i] } },
  fullstack:  { name: 'Full stack product', blurb: 'Frontend, backend and database built together', base: 120000,
    kw: /\b(platform|portal|saas|marketplace|back-?end|database|admin|booking|e-?commerce|store|shop|accounts?|login|full[- ]?stack|orders?|ordering|online|checkout|payments?|users?)\b/i,
    reqs: { auth: ['User accounts and login', 20000, /login|sign ?up|account|users?|member|register/i], dash: ['Admin dashboard', 25000, /admin|dashboard|manage|panel/i], pay: ['Payment gateway integration', 20000, /pay|payment|checkout|subscription|billing|cart/i], api: ['Public API and integrations', 15000, /\bapi\b|integrat|connect|third.party/i], mail: ['Email notifications', 6000, /email|notification|alert|remind/i] } },
  mobile:     { name: 'Mobile app', blurb: 'Android or iOS apps built for phones first', base: 150000,
    kw: /\b(app|apps|android|ios|iphone|mobile|play store|app store)\b/i,
    reqs: { both: ['Both Android and iOS', 40000, /android.*ios|ios.*android|both platforms|cross.platform/i], push: ['Push notifications', 10000, /notification|push|alert|remind/i], offline: ['Offline mode', 15000, /offline|no internet/i], pay: ['In-app payments', 20000, /pay|payment|wallet|checkout/i], store: ['App store publishing help', 8000, /play store|app store|publish/i] } },
  ai:         { name: 'AI features', blurb: 'Assistants, recommendations and smart automation', base: 100000,
    kw: /\b(ai|a\.i\.|chatbot|gpt|llm|machine learning|recommend\w*|predict\w*|assistant|vision|nlp|smart)\b/i,
    reqs: { chat: ['Chat assistant', 0, /chat|assistant|bot|support/i], docs: ['Answers from your own documents', 25000, /document|pdf|faq|knowledge|policy/i], vision: ['Image or document recognition', 30000, /image|photo|scan|ocr|camera|vision/i], reco: ['Recommendations', 20000, /recommend|suggest|personali[sz]/i], voice: ['Voice input', 15000, /voice|speech|speak|audio/i] } },
  automation: { name: 'Automation', blurb: 'Connect tools and remove repetitive work', base: 60000,
    kw: /\b(automat\w*|workflow\w*|integrat\w*|zapier|crm|reminders?|bots?|schedul\w*|whatsapp)\b/i,
    reqs: { crm: ['CRM integration', 12000, /crm|lead|customer|sales/i], msg: ['Email or WhatsApp flows', 10000, /whatsapp|email|sms|message/i], rep: ['Automated reports', 8000, /report|summary|weekly|daily/i], sync: ['Sheet and database sync', 8000, /sheet|excel|spreadsheet|database|sync/i], appr: ['Approval workflows', 12000, /approv|workflow|review|sign.?off/i] } },
  cloud:      { name: 'Cloud and DevOps', blurb: 'Hosting, deployment and reliability', base: 50000,
    kw: /\b(cloud|aws|azure|gcp|deploy\w*|scal\w*|devops|servers?|hosting|uptime)\b/i,
    reqs: { setup: ['Cloud setup and deployment', 0], ci: ['CI/CD pipeline', 12000, /ci\/cd|pipeline|deploy|release/i], mon: ['Monitoring and alerts', 10000, /monitor|alert|uptime|logs/i], bak: ['Backups and recovery', 8000, /backup|recover|disaster/i], scale: ['Autoscaling', 15000, /scal|traffic|million|load/i] } },
  data:       { name: 'Data and analytics', blurb: 'Databases, pipelines and dashboards', base: 70000,
    kw: /\b(data|analytics?|reports?|insights?|pipelines?|bi|warehouse|dashboards?|metrics|statistics)\b/i,
    reqs: { db: ['Database design', 0], etl: ['Data pipelines', 20000, /pipeline|etl|import|ingest|integrat/i], dash: ['Dashboards and reports', 20000, /dashboard|report|chart|visuali[sz]/i], mig: ['Migration from an old system', 15000, /migrat|old system|legacy|excel/i], fc: ['Forecasting', 25000, /forecast|predict|trend/i] } },
  custom:     { name: 'Custom software', blurb: 'Tailor-made systems for how your business works', base: 180000,
    kw: /\b(erp|custom|inventory|logistics|hospital|clinic|school|legacy|tailor\w*|bespoke|management system)\b/i,
    reqs: { disc: ['Discovery workshop', 0], arch: ['Architecture and security review', 20000, /secur|audit|compliance|architecture/i], integ: ['Integrations with existing systems', 25000, /integrat|existing|connect|erp/i], train: ['Training and documentation', 10000, /train|document|handover/i], supp: ['Priority support during launch', 12000, /support|launch|urgent/i] } }
};
export const PLANS = {
  subscription: { name: 'Build + keep improving', buildDiscount: 0.10, monthlyRate: 0.08, monthlyMin: 5000 },
  build:        { name: 'Build only' }
};
export const PAYMENT_NOTE = 'We do not take payment on this website. After you approve the scope and price with us in writing, we share the payment methods (for example UPI or bank transfer) and a milestone plan.';
export const catalog = () => ({
  currency: 'INR', note: 'Starting estimates, excluding taxes. Final price is confirmed in writing.', paymentNote: PAYMENT_NOTE,
  services: Object.fromEntries(Object.entries(SERVICES).map(([k, s]) => [k, { name: s.name, blurb: s.blurb, base: s.base, reqs: Object.fromEntries(Object.entries(s.reqs).map(([rk, r]) => [rk, { label: r[0], price: r[1] }])) }])),
  plans: PLANS
});
// Rule-based analysis of the idea (keyword matching, NOT an AI model). Returns the best-fit options and why.
export function suggest(idea) {
  const t = String(idea || '');
  const hits = Object.entries(SERVICES).map(([k, s]) => { const m = t.match(new RegExp(s.kw.source, 'gi')) || []; return [k, m.length, [...new Set(m.map(x => x.toLowerCase()))].slice(0, 4)]; }).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (!hits.length) return { keys: ['fullstack'], reasons: { fullstack: [] } };
  return { keys: hits.map(h => h[0]), reasons: Object.fromEntries(hits.map(h => [h[0], h[2]])) };
}
// For each chosen option: the included items plus any extras the idea mentions.
export function suggestReqs(idea, services) {
  const t = String(idea || ''), out = {};
  for (const k of services) if (SERVICES[k]) out[k] = Object.entries(SERVICES[k].reqs).filter(([, r]) => r[1] === 0 || (r[2] && r[2].test(t))).map(([rk]) => rk);
  return out;
}
// Validates a selection against the catalog. Returns {ok,value} or {ok:false,error}.
export function cleanSelection(b) {
  if (!b || typeof b !== 'object' || !Array.isArray(b.services)) return { ok: false, error: 'Choose at least one option.' };
  const services = [...new Set(b.services)].filter(k => typeof k === 'string');
  if (!services.length || services.length > 8 || services.some(k => !SERVICES[k])) return { ok: false, error: 'Choose at least one valid option.' };
  const reqs = {}, notes = {};
  for (const k of services) {
    const given = b.reqs && Array.isArray(b.reqs[k]) ? b.reqs[k] : [];
    if (given.some(r => typeof r !== 'string' || !(r in SERVICES[k].reqs))) return { ok: false, error: 'Unknown requirement.' };
    reqs[k] = [...new Set(given)];
    const n = b.notes && typeof b.notes[k] === 'string' ? b.notes[k].replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, 500) : '';
    if (n) notes[k] = n;
  }
  return { ok: true, value: { services, reqs, notes } };
}
export function price(services, reqs) {
  const lines = services.map(k => { const s = SERVICES[k], add = (reqs[k] || []).map(r => ({ key: r, label: s.reqs[r][0], price: s.reqs[r][1] })); return { key: k, name: s.name, base: s.base, add, total: s.base + add.reduce((a, r) => a + r.price, 0) }; });
  const subtotal = lines.reduce((a, l) => a + l.total, 0), p = PLANS.subscription;
  return { lines, subtotal, plans: {
    build: { total: subtotal },
    subscription: { total: Math.round(subtotal * (1 - p.buildDiscount) / 100) * 100, monthly: Math.max(p.monthlyMin, Math.round(subtotal * p.monthlyRate / 500) * 500) } } };
}
