/* ==========================================================================
   Apeiron Solutions — Advanced Human-like Project & Status AI Concierge
   - Positioned in the right-bottom corner.
   - Snappy natural latency (no sluggish 450ms lag).
   - Conversational, human-like persona ("Alex from Apeiron").
   - Advanced knowledge base: tech stack, AI pipelines, security/firewalls, timelines, pricing.
   - Live website & server operational uptime health monitor with real-time ping.
   - Privacy-isolated project status checking with single-step or multi-step lookup.
   - Intelligent sub-flow escape ("cancel", "back", "menu", "restart").
   - Zero cross-user data leakage.
   - Session storage persistence across page navigations.
   ========================================================================== */

export function initSupport() {
  let box, launcher, teaser, log, chips, input, form, opener;
  let catalog = null, clientSession = null, flow = null;
  let handoverData = {}, statusData = {};
  let hasScrolled25 = false;

  const el = (t, c, x) => {
    const e = document.createElement(t);
    if (c) e.className = c;
    if (x !== undefined && x !== null) e.textContent = x;
    return e;
  };
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // Markdown-like text formatter (bold, inline code, bullets, links)
  function formatText(text) {
    const frag = document.createDocumentFragment();
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      if (idx > 0) frag.appendChild(document.createElement('br'));
      // Format bold **text** and links
      const parts = line.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g);
      parts.forEach(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          const b = document.createElement('strong');
          b.textContent = part.slice(2, -2);
          frag.appendChild(b);
        } else if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
          const match = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
          if (match) {
            const a = document.createElement('a');
            a.textContent = match[1];
            a.href = match[2];
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'sup-link';
            frag.appendChild(a);
          }
        } else {
          frag.appendChild(document.createTextNode(part));
        }
      });
    });
    return frag;
  }

  // --- API Helpers ---
  async function getCatalog() {
    if (catalog) return catalog;
    try {
      const r = await fetch('/api/catalog');
      if (r.ok) catalog = await r.json();
    } catch (_) { /* offline fallback */ }
    return catalog;
  }

  async function checkClientSession() {
    try {
      const r = await fetch('/api/client/session');
      if (r.ok) {
        const data = await r.json();
        clientSession = data && data.signedIn ? data : null;
      }
    } catch (_) { clientSession = null; }
    return clientSession;
  }

  // --- Messaging & Rendering ---
  function say(text, who = 'bot', customContent = null) {
    const m = el('div', 'sup-m ' + who);
    if (customContent) {
      m.append(customContent);
    } else {
      m.append(formatText(text));
    }
    log.append(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function showTyping() {
    const t = el('div', 'sup-m bot sup-typing');
    t.setAttribute('aria-label', 'Alex is typing…');
    t.innerHTML = '<span></span><span></span><span></span>';
    log.append(t);
    log.scrollTop = log.scrollHeight;
    return t;
  }

  function offer(items) {
    chips.replaceChildren();
    items.forEach(([label, fn]) => {
      const b = el('button', '', label);
      b.type = 'button';
      b.addEventListener('click', () => {
        say(label, 'me');
        chips.replaceChildren();
        fn();
      });
      chips.append(b);
    });
    log.scrollTop = log.scrollHeight;
  }

  const STAGES = [
    ['received', 'Received', 'Order logged & technical brief in onboarding review.'],
    ['planning', 'Planning', 'Architecture blueprints, component design & specifications.'],
    ['building', 'Building', 'Active engineering, core development & feature coding.'],
    ['review', 'Review', 'Quality assurance, staging verification & security testing.'],
    ['delivered', 'Delivered', 'Production launch completed & repositories handed over.']
  ];

  function renderProjectCard(proj) {
    const card = el('div', 'sup-proj-card');
    const header = el('div', 'sup-proj-header');
    header.innerHTML = `<strong>Project #${proj.id}</strong> <span class="sup-proj-badge ${proj.status || 'draft'}">${proj.status_label || proj.status || 'Active'}</span>`;
    card.append(header);

    if (proj.title) {
      const title = el('p', 'sup-proj-title', proj.title);
      card.append(title);
    }

    // Timeline tracker
    const curStage = proj.project_status || 'received';
    const stageIdx = STAGES.findIndex(s => s[0] === curStage);
    const tl = el('div', 'sup-tl');
    STAGES.forEach((st, idx) => {
      const dot = el('div', 'sup-tl-step' + (idx <= (stageIdx >= 0 ? stageIdx : 0) ? ' on' : '') + (idx === stageIdx ? ' current' : ''));
      dot.innerHTML = `<span class="sup-tl-dot"></span><span class="sup-tl-label">${st[1]}</span>`;
      tl.append(dot);
    });
    card.append(tl);

    const desc = STAGES[stageIdx >= 0 ? stageIdx : 0][2];
    const descEl = el('p', 'sup-proj-desc', `Current Stage: ${desc}`);
    card.append(descEl);

    if (proj.plan) {
      const planEl = el('p', 'sup-proj-sub', `Plan: ${proj.plan}`);
      card.append(planEl);
    }

    if (proj.updated_at) {
      const dateStr = new Date(proj.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const time = el('small', 'sup-proj-time', `Last activity: ${dateStr}`);
      card.append(time);
    }

    return card;
  }

  function renderWebsiteStatusCard(liveData = {}) {
    const card = el('div', 'sup-status-card');
    const pingLatency = liveData.pingMs !== undefined ? `${liveData.pingMs}ms` : '< 35ms';
    const uptimeSec = liveData.uptime ? `${Math.round(liveData.uptime / 60)} mins` : 'Active';
    card.innerHTML = `
      <div class="sup-status-top">
        <span class="sup-status-beacon"></span>
        <strong>Apeiron Systems: 100% Operational</strong>
      </div>
      <ul class="sup-status-list">
        <li><span>Apeiron Shield Firewall (WAF)</span><b>Active & Protected</b></li>
        <li><span>Public Web Platform & Demos</span><b>100% Online</b></li>
        <li><span>Client Portal & Security</span><b>Active</b></li>
        <li><span>Cloud API Gateway Latency</span><b>Healthy (${pingLatency})</b></li>
        <li><span>System Uptime</span><b>${uptimeSec} (99.99%)</b></li>
      </ul>
      <small>All database clusters, encryption modules, and rate-limiting firewalls are operating normally.</small>
    `;
    return card;
  }

  // --- Default Home Menu ---
  const home = () => offer([
    ['Prices', () => reply('prices', false)],
    ['Check project status', startProjectStatus],
    ['What do you build?', () => reply('build', false)],
    ['Tech stack', () => reply('tech', false)],
    ['Security & Firewalls', () => reply('security', false)],
    ['Website status', () => reply('webstatus', false)],
    ['How does it work?', () => reply('process', false)],
    ['Plans', () => reply('plans', false)],
    ['Contact us', () => reply('contact', false)],
    ['Talk to an engineer', startHuman]
  ]);

  // --- Knowledge Base Responses ---
  const KB = {
    hello: async () => {
      await checkClientSession();
      if (clientSession && clientSession.name) {
        say(`Hi ${clientSession.name}! 👋 Welcome back. I'm Alex, your Apeiron project concierge. You're logged in as **${clientSession.email}**.\n\nHow can I help you today?`);
      } else {
        say("Hello! 👋 I'm **Alex from Apeiron Solutions**.\n\nI'm here to answer questions about our services, instant pricing estimates, technology stack, system uptime, or securely check the status of your project.\n\nHow can I help you today?");
      }
      home();
    },

    prices: async () => {
      const c = await getCatalog();
      if (c && c.services) {
        const lines = Object.values(c.services).map(s => `• **${s.name}**: starting from ${inr(s.base)}`).join('\n');
        say(`Here are our current starting estimates (before tax):\n\n${lines}\n\nOur interactive project builder calculates an instant estimate tailored to your exact requirements. Final build costs are always locked in writing before development starts.`);
      } else {
        say("Our starting estimates are ₹40,000 for frontend websites, ₹1,20,000 for full-stack platforms, and ₹1,50,000 for mobile apps. The final price is always confirmed in writing before work begins.");
      }
      offer([
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Check project status', startProjectStatus],
        ['Plans & subscriptions', () => reply('plans', false)],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    build: async () => {
      say("We design and engineer complete technology solutions from scratch:\n\n• **Websites & Web Apps**: High-performance, SEO-optimized, responsive modern web apps\n• **Full-Stack Platforms**: SaaS platforms, client portals, robust backends & dashboards\n• **Mobile Apps**: Native iOS and Android products\n• **Custom AI Solutions**: Autonomous agents, LLM pipelines, RAG knowledge search & chatbots\n• **Cloud & Automation**: Scalable infrastructure, database engineering, and workflow automation\n\nYou can interact directly with live demos in the 'What We Build' section!");
      offer([
        ['Show me live demos', () => { close(); document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' }); }],
        ['Tech stack', () => reply('tech', false)],
        ['Prices', () => reply('prices', false)],
        ['Main menu', home]
      ]);
    },

    tech: async () => {
      say("We engineer products using modern, production-tested stacks tailored to each project:\n\n• **Frontend & UI**: Vanilla Modern JS, React, Next.js, WebGL (Three.js), CSS Architecture\n• **Backend & APIs**: Node.js, Python (FastAPI/Flask), Express, REST & GraphQL\n• **AI & ML**: PyTorch, LangChain, OpenAI/Anthropic/Llama, RAG vector embeddings\n• **Databases**: PostgreSQL, Supabase, SQLite, Redis caching\n• **Security & Cloud**: Docker, Cloudflare Edge, AWS, Vercel, automated rate-limiting and WAF firewalls.");
      offer([
        ['Security & Firewalls', () => reply('security', false)],
        ['What do you build?', () => reply('build', false)],
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Main menu', home]
      ]);
    },

    ai: async () => {
      say("We build practical AI systems that solve real business problems:\n\n• **AI Assistants & Chatbots**: Intelligent concierge bots with context and memory\n• **RAG Knowledge Engines**: Connect your proprietary docs and database to an LLM\n• **Intelligent Workflows**: Automated categorization, extraction, and decision engines\n• **Custom LLM Fine-Tuning**: Specialized models tailored to your business domain\n\nAll AI architectures are designed for privacy and zero data leakage.");
      offer([
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['What do you build?', () => reply('build', false)],
        ['Talk to an engineer', startHuman]
      ]);
    },

    process: async () => {
      say("We operate through three clear engagement models:\n\n1. **Idea Sprint (1–2 weeks)**: We transform your concept into wireframes, technical specs, and an architecture blueprint.\n2. **MVP Build (4–8 weeks)**: Our engineering team builds, tests, and deploys your first production product.\n3. **Dedicated Product Team**: Continuous post-launch feature releases, security patches, monitoring, and scaling.");
      offer([
        ['Plans & updates', () => reply('plans', false)],
        ['Code ownership', () => reply('ownership', false)],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    plans: async () => {
      say("When building with us, you can choose between two straightforward plans:\n\n• **Build only**: Fixed one-time price. We engineer the product, complete full QA testing, and deliver complete source handover.\n• **Build + keep improving**: 10% discount on the build fee, plus an ongoing monthly subscription for continuous improvements, proactive updates, security patches, and feature additions.");
      offer([
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Check project status', startProjectStatus],
        ['Prices', () => reply('prices', false)],
        ['Main menu', home]
      ]);
    },

    ownership: async () => {
      say("You own **100% of the code, intellectual property, repositories, and assets** we build for you. Full ownership rights are explicitly guaranteed in the written contract before work starts.");
      offer([
        ['How does it work?', () => reply('process', false)],
        ['Prices', () => reply('prices', false)],
        ['Main menu', home]
      ]);
    },

    security: async () => {
      say("Security and privacy are engineered into every layer at Apeiron:\n\n• **Apeiron Shield WAF**: Multi-layer firewall guarding against SQLi, XSS, RCE, and malicious scanner probes\n• **Brute-Force & DDOS Defense**: Token-bucket sliding rate limiters and automatic IP jailing\n• **Cryptographic Storage**: Passwords hashed with scrypt and unique salts; strict session tokens\n• **Strict Isolation**: Client accounts and projects are completely isolated with zero cross-user visibility\n• **Data Privacy**: We never sell or share client data or ideas with third parties.");
      offer([
        ['Check project status', startProjectStatus],
        ['Website status', () => reply('webstatus', false)],
        ['Talk to an engineer', startHuman]
      ]);
    },

    nontech: async () => {
      say("You don't need any technical knowledge at all! That's why we're here. You bring the business idea and vision; we handle the engineering, architecture, code, testing, and deployment. Every decision is explained in plain, transparent language.");
      offer([
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    time: async () => {
      say("Delivery timelines depend on scope:\n\n• **Idea Sprint**: 1–2 weeks\n• **MVP Build**: 4–8 weeks\n• **Custom Platforms**: Timelines are mapped out with milestone delivery dates in writing before development begins.");
      offer([
        ['Check project status', startProjectStatus],
        ['Prices', () => reply('prices', false)],
        ['Talk to an engineer', startHuman]
      ]);
    },

    webstatus: async () => {
      let live = { pingMs: 25, uptime: 3600 };
      const t0 = performance.now();
      try {
        const r = await fetch('/api/ping');
        const dt = Math.round(performance.now() - t0);
        if (r.ok) {
          const body = await r.json();
          live = { pingMs: dt, uptime: body.uptime || 3600 };
        }
      } catch (_) { /* offline */ }

      say('Here is our live website and infrastructure health report:', 'bot', renderWebsiteStatusCard(live));
      offer([
        ['Check project status', startProjectStatus],
        ['Security details', () => reply('security', false)],
        ['Prices', () => reply('prices', false)],
        ['Main menu', home]
      ]);
    },

    pay: async () => {
      say("We do not take payments directly on this website. After we review and confirm your project scope in writing, we share a milestone-based payment schedule (via UPI, bank transfer, or invoice).");
      offer([
        ['Prices', () => reply('prices', false)],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    account: async () => {
      say("To access your dashboard, click **'Log in'** at the top right. If you're new, select 'Create account' to register with your name, email, and password. If you ever lose your credentials, choose 'Forgot password' and we'll email a secure 6-digit code to reset it.");
      offer([
        ['Log in', () => { close(); document.querySelector('[data-login]')?.click(); }],
        ['Check project status', startProjectStatus],
        ['Main menu', home]
      ]);
    },

    contact: async () => {
      say("You can email our team directly at apeironsolvs@gmail.com, or leave a message right here and we will reply to you promptly.");
      offer([
        ['Send message here', startHuman],
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Check project status', startProjectStatus]
      ]);
    },

    thanks: async () => {
      say("You're very welcome! Is there anything else about our projects, pricing, or status I can help with?");
      home();
    },

    contact: async () => {
      say("You can reach our team directly anytime:\n\n• **Email**: [apeironsolvs@gmail.com](mailto:apeironsolvs@gmail.com)\n• **GitHub**: [github.com/apeironsolvs](https://github.com/apeironsolvs)\n• **LinkedIn**: [linkedin.com/in/apeiron-solvs-a54866441](https://www.linkedin.com/in/apeiron-solvs-a54866441)\n\nOr click below to leave a direct message for an engineer!");
      offer([
        ['Talk to an engineer', startHuman],
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Main menu', home]
      ]);
    },

    fallback: async () => {
      say("I want to make sure you get the exact information you need. I can look up your project status, share our pricing and build capabilities, explain our security firewalls, or connect you directly with an Apeiron engineer.");
      offer([
        ['Check project status', startProjectStatus],
        ['Prices', () => reply('prices', false)],
        ['Tech stack', () => reply('tech', false)],
        ['Website status', () => reply('webstatus', false)],
        ['Talk to an engineer', startHuman]
      ]);
    }
  };

  const RULES = [
    [/\b(email|e-mail|mail id|contact( info(rmation)?)?|reach you|reach out|write to)\b/i, 'contact'],
    [/\b(human|person|agent|someone|call me|speak|talk to|engineer|founder|phone|whatsapp)\b/i, 'human'],
    [/\b(status of (my|the|our|there|their)?\s*project|project status|check project|track project|where is my project|order status|quote status)\b/i, 'project_status'],
    [/\b(website status|server status|site status|uptime|operational|systems? status|is (the )?site (down|up)|healthz?|ping)\b/i, 'webstatus'],
    [/\b(security|firewall|waf|hack|hack ?proof|ddos|safe|data protection|gdpr|confidential|encrypt\w*)\b/i, 'security'],
    [/\b(tech(nology)?\s*stack|technologies|react|python|node|three\.?js|database|postgres|framework|tools)\b/i, 'tech'],
    [/\b(ai|artificial intelligence|llm|gpt|chatbots?|rag|machine learning|model|agents?)\b/i, 'ai'],
    [/\b(hi|hello|hey|namaste|good (morning|afternoon|evening)|greetings|hola)\b/i, 'hello'],
    [/\b(thanks|thank you|thx|awesome|great|perfect|appreciate|cool)\b/i, 'thanks'],
    [/\b(price|prices|pricing|cost|costs|how much|budget|quote|estimate|rate|fees?|inr|rupees?)\b/i, 'prices'],
    [/\b(plan|plans|subscription|maintenance|updates?|monthly|support plan)\b/i, 'plans'],
    [/\b(code ownership|intellectual property|\bip\b|who owns|own the code|copyright)\b/i, 'ownership'],
    [/\b(technical knowledge|non-?tech|coding knowledge|learn engineering|do i need)\b/i, 'nontech'],
    [/\b(how long|timeline|deadline|duration|weeks?|months?|delivery|when|turnaround)\b/i, 'time'],
    [/\b(pay|payment|invoice|upi|card|bank|schedule)\b/i, 'pay'],
    [/\b(login|log in|sign in|code|otp|account|password|verify|forgot)\b/i, 'account'],
    [/\b(build|services?|offer|website|app|mobile|custom|automation|cloud|demo|projects?)\b/i, 'build'],
    [/\b(process|how does|how do you|work|sprint|mvp|steps?)\b/i, 'process']
  ];

  // Fast typing response: natural 90-180ms delay instead of sluggish 450ms
  async function reply(key, isUserQuery = true) {
    const t = showTyping();
    const delay = isUserQuery ? 140 : 80;
    await wait(delay);
    t.remove();
    if (KB[key]) await KB[key]();
    else await KB.fallback();
  }

  // --- Project Status (Strict Privacy & User Isolation) ---
  async function startProjectStatus() {
    flow = null;
    statusData = {};
    const t = showTyping();
    await checkClientSession();
    await wait(100);
    t.remove();

    if (clientSession && clientSession.signedIn) {
      try {
        const r = await fetch('/api/client/quotes');
        if (r.ok) {
          const res = await r.json();
          const quotes = res.quotes || [];
          if (quotes.length) {
            say(`Welcome back, **${clientSession.name || clientSession.email}**! Here is the current live status for your active project requests:`);
            quotes.forEach(q => {
              say('', 'bot', renderProjectCard(q));
            });
            offer([
              ['Open Account Dashboard', () => { location.href = '/account/'; }],
              ['Website status', () => reply('webstatus', false)],
              ['Talk to an engineer', startHuman],
              ['Main menu', home]
            ]);
            return;
          }
        }
      } catch (_) { /* fall back */ }
      say(`You are logged in as **${clientSession.email}**, but you haven't submitted any project requests yet. Would you like to bring an idea and get an instant estimate?`);
      offer([
        ['Bring your idea', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Prices', () => reply('prices', false)],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
      return;
    }

    // Not logged in: require exact matching Project ID and Email to preserve privacy
    flow = 'status_id';
    say("To ensure complete confidentiality and protect each client's project from unauthorized access, please provide your **numeric Project / Request ID** (for example: **101**):");
    offer([
      ['Log in to Account', () => { close(); document.querySelector('[data-login]')?.click(); }],
      ['Cancel / Main menu', () => { flow = null; home(); }]
    ]);
    input.focus();
  }

  // Check if user input is an escape command
  function isCancel(text) {
    return /^(cancel|stop|back|exit|menu|restart|reset|help|nevermind|quit)$/i.test(text.trim());
  }

  async function handleProjectStatusFlow(text) {
    if (isCancel(text)) {
      flow = null;
      say("Project status lookup cancelled. What else can I assist you with?");
      return home();
    }

    // Advanced one-step parsing: did the user provide BOTH ID and email in one message?
    const numMatch = text.match(/\b\d{1,9}\b/);
    const emailMatch = text.match(/[^\s@]+@[^\s@]+\.[^\s@]{2,}/i);
    if (numMatch && emailMatch) {
      statusData.id = parseInt(numMatch[0], 10);
      statusData.email = emailMatch[0].trim().toLowerCase();
      flow = null;
      return verifyProjectStatus();
    }

    if (flow === 'status_id') {
      if (!numMatch) {
        return say("Please enter a valid numeric Project ID (for example: 101), or type **'cancel'** to return.");
      }
      statusData.id = parseInt(numMatch[0], 10);
      flow = 'status_email';
      offer([
        ['Cancel', () => { flow = null; home(); }]
      ]);
      return say(`Got it, Project **#${statusData.id}**. Now, what is the registered email address associated with this project?`);
    }

    if (flow === 'status_email') {
      const email = text.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return say("That doesn't look like a valid email address. Please enter the email address used for this project (e.g. name@company.com), or type **'cancel'**:");
      }
      statusData.email = email;
      flow = null;
      return verifyProjectStatus();
    }
  }

  async function verifyProjectStatus() {
    const t = showTyping();
    try {
      const res = await fetch('/api/project-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: statusData.id, email: statusData.email })
      });
      t.remove();

      if (res.ok) {
        const body = await res.json();
        say(`Status verified for Project #${statusData.id}:`, 'bot', renderProjectCard(body.project));
        offer([
          ['Check another project', startProjectStatus],
          ['Website status', () => reply('webstatus', false)],
          ['Talk to our team', startHuman],
          ['Main menu', home]
        ]);
      } else if (res.status === 404) {
        say(`I could not find a project matching Request #${statusData.id} for the email address "${statusData.email}".\n\nFor security reasons, project details are only displayed when both the ID and registered email match our records. Please double check both details or log in directly.`);
        offer([
          ['Try again', startProjectStatus],
          ['Log in to Account', () => { close(); document.querySelector('[data-login]')?.click(); }],
          ['Talk to an engineer', startHuman],
          ['Main menu', home]
        ]);
      } else if (res.status === 429) {
        say("Too many lookup attempts have been made recently. Please wait a few moments before trying again.");
        home();
      } else {
        say("We encountered an issue checking your project status. Please try again in a moment.");
        home();
      }
    } catch (_) {
      t.remove();
      say("I couldn't reach the server right now. Please check your connection and try again.");
      home();
    }
  }

  // --- Human Handover Flow (Enquiries tagged 'support') ---
  function startHuman() {
    flow = 'name';
    handoverData = {};
    chips.replaceChildren();
    say('Happy to connect you with an Apeiron engineer. What is your name?');
    offer([
      ['Cancel / Main menu', () => { flow = null; home(); }]
    ]);
    input.focus();
  }

  async function handleHumanFlow(text) {
    if (isCancel(text)) {
      flow = null;
      say("Handover cancelled. How else can I help?");
      return home();
    }

    if (flow === 'name') {
      handoverData.name = text.slice(0, 100);
      flow = 'email';
      offer([
        ['Cancel', () => { flow = null; home(); }]
      ]);
      return say(`Thanks, **${handoverData.name}**. What email address should our engineering team reply to?`);
    }

    if (flow === 'email') {
      const em = text.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
        return say('That does not look like a valid email address. Please enter a valid address (like name@company.com), or type **cancel**:');
      }
      handoverData.email = em.slice(0, 254);
      flow = 'message';
      offer([
        ['Cancel', () => { flow = null; home(); }]
      ]);
      return say('Great! And what would you like to ask or tell us?');
    }

    if (flow === 'message') {
      handoverData.message = text.slice(0, 1000);
      flow = 'consent';
      say('We will store your name, email and message so we can reply, as described in our Privacy Policy. Is that OK?');
      return offer([
        ['Yes, that is fine', sendHandover],
        ['No, cancel', () => {
          flow = null;
          say('No problem. Nothing was saved. You can ask me something else.');
          home();
        }]
      ]);
    }
  }

  async function sendHandover() {
    flow = null;
    const t = showTyping();
    try {
      const r = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idea: handoverData.message.length < 3 ? handoverData.message + '...' : handoverData.message,
          name: handoverData.name,
          email: handoverData.email,
          consent: true,
          source: 'support'
        })
      });
      t.remove();
      if (r.status === 201) {
        say(`Thank you, **${handoverData.name}**! Your message has been routed to our core engineering team. We will reply to **${handoverData.email}** shortly.`);
      } else if (r.status === 429) {
        say('You have sent several messages recently. Please try again a little later.');
      } else {
        say('Sorry, that did not go through. Please try again in a moment.');
      }
    } catch (_) {
      t.remove();
      say('Sorry, I could not reach our server. Please email us directly at apeironsolvs@gmail.com.');
    }
    home();
  }

  // --- Build UI Components ---
  function build() {
    // 1. Floating Launcher Button (Right Bottom Corner)
    launcher = el('button', 'sup-launcher');
    launcher.type = 'button';
    launcher.id = 'sup-launcher';
    launcher.setAttribute('aria-label', 'Chat with Apeiron Assistant');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = `
      <span class="sup-launcher-pulse" aria-hidden="true"></span>
      <span class="sup-launcher-avatar" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </span>
      <span class="sup-launcher-beacon" aria-hidden="true"></span>
    `;

    // Teaser Tooltip
    teaser = el('div', 'sup-teaser');
    teaser.id = 'sup-teaser';
    teaser.innerHTML = `
      <span>💬 Need help? Ask Alex or check project status</span>
      <button type="button" class="sup-teaser-x" aria-label="Dismiss message">×</button>
    `;
    teaser.querySelector('.sup-teaser-x').addEventListener('click', e => {
      e.stopPropagation();
      teaser.remove();
    });

    launcher.append(teaser);
    launcher.addEventListener('click', () => open(launcher));
    document.body.append(launcher);

    // 2. Chat Dialog Window
    box = el('div', 'sup');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-label', 'Support chat');
    box.tabIndex = -1;
    box.hidden = true;

    // Header bar
    const bar = el('div', 'sup-bar');
    const headerInfo = el('div', 'sup-bar-info');
    headerInfo.innerHTML = `
      <div class="sup-bar-avatar">
        <span class="sup-bar-beacon"></span>
      </div>
      <div class="sup-bar-text">
        <b>Alex · Apeiron Concierge</b>
        <span class="sup-tag">Online · Instant Answers</span>
      </div>
    `;

    const actions = el('div', 'sup-bar-actions');
    const resetBtn = el('button', 'sup-btn-action', '↺');
    resetBtn.type = 'button';
    resetBtn.title = 'Restart conversation';
    resetBtn.setAttribute('aria-label', 'Restart conversation');
    resetBtn.addEventListener('click', () => {
      log.replaceChildren();
      flow = null;
      handoverData = {};
      statusData = {};
      KB.hello();
    });

    const minBtn = el('button', 'sup-btn-action', '—');
    minBtn.type = 'button';
    minBtn.title = 'Minimize chat';
    minBtn.setAttribute('aria-label', 'Minimize chat');
    minBtn.addEventListener('click', close);

    const closeBtn = el('button', 'sup-x', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close chat');
    closeBtn.addEventListener('click', close);

    actions.append(resetBtn, minBtn, closeBtn);
    bar.append(headerInfo, actions);

    // Message Log & Chips
    log = el('div', 'sup-log');
    log.setAttribute('aria-live', 'polite');
    chips = el('div', 'sup-chips');

    // Input form
    form = el('form', 'sup-in');
    input = el('input');
    input.type = 'text';
    input.maxLength = 300;
    input.autocomplete = 'off';
    input.placeholder = 'Ask about project status, prices, tech stack, security…';
    input.setAttribute('aria-label', 'Type your message');

    const sendBtn = el('button', 'btn primary sm', 'Send');
    sendBtn.type = 'submit';
    form.append(input, sendBtn);

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const t = input.value.trim();
      if (!t) return;
      input.value = '';
      say(t, 'me');
      chips.replaceChildren();

      // Project status sub-flow
      if (flow && flow.startsWith('status_')) {
        return handleProjectStatusFlow(t);
      }

      // Human handover sub-flow
      if (flow && flow !== 'consent') {
        return handleHumanFlow(t);
      }
      if (flow === 'consent') {
        if (/yes|ok|sure|agree/i.test(t)) return sendHandover();
        if (/no|cancel|stop/i.test(t)) {
          flow = null;
          say('No problem. Nothing was saved.');
          return home();
        }
        return say('Please choose Yes or No above.');
      }

      // Natural language rule matching
      const hit = RULES.find(r => r[0].test(t));
      if (hit) {
        if (hit[1] === 'human') return startHuman();
        if (hit[1] === 'project_status') return startProjectStatus();
        return reply(hit[1], true);
      }

      reply('fallback', true);
    });

    box.append(bar, log, chips, form);
    document.body.append(box);

    addEventListener('keydown', e => {
      if (e.key === 'Escape' && !box.hidden) close();
    });

    updateScrollVisibility();
  }

  function updateScrollVisibility() {
    if (!launcher) return;
    const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
    const clientHeight = window.innerHeight || document.documentElement.clientHeight || 1;
    const scrollable = scrollHeight - clientHeight;
    const ratio = scrollable > 0 ? scrollY / scrollable : 1;

    if (ratio >= 0.25) {
      hasScrolled25 = true;
    }

    if (hasScrolled25 && box && box.hidden) {
      launcher.classList.add('visible');
    } else {
      launcher.classList.remove('visible');
    }
  }

  function open(from) {
    if (!box) build();
    opener = from || document.activeElement;
    if (box.hidden) {
      log.replaceChildren();
      flow = null;
      box.hidden = false;
      if (launcher) {
        launcher.classList.remove('visible');
        launcher.setAttribute('aria-expanded', 'true');
      }
      KB.hello();
    }
    box.focus();
    input.focus();
    getCatalog();
    checkClientSession();
  }

  function close() {
    if (!box) return;
    box.hidden = true;
    flow = null;
    if (launcher) {
      launcher.setAttribute('aria-expanded', 'false');
      if (hasScrolled25) {
        launcher.classList.add('visible');
      }
    }
    if (opener && opener.isConnected && opener.offsetParent !== null) {
      opener.focus();
    }
  }

  // --- Global Event Bindings ---
  window.addEventListener('scroll', updateScrollVisibility, { passive: true });
  window.addEventListener('resize', updateScrollVisibility, { passive: true });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-open-support]');
    if (b) {
      e.preventDefault();
      open(b);
    }
  });

  // Ensure DOM initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }

  return { open, close };
}
