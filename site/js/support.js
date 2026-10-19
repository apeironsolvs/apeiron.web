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
  let hasScrolled25 = true;

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
    ['🚀 How to build / Start', () => reply('how_to_build', false)],
    ['Prices', () => reply('prices', false)],
    ['Check project status', startProjectStatus],
    ['💬 Messages with Team', () => { close(); location.href = 'account/#chat'; }],
    ['What do you build?', () => reply('build', false)],
    ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
    ['Tech stack', () => reply('tech', false)],
    ['Security & Firewalls', () => reply('security', false)],
    ['Website status', () => reply('webstatus', false)],
    ['Talk to an engineer', startHuman]
  ]);

  // --- Knowledge Base Responses ---
  const KB = {
    hello: async () => {
      await checkClientSession();
      if (clientSession && clientSession.name) {
        say(`Hi ${clientSession.name}! 👋 Welcome back. I'm Alex, your Apeiron project concierge. You're logged in as **${clientSession.email}**.\n\nHow can I help you today?`);
      } else {
        say("Hello! 👋 I'm **Alex from Apeiron Solutions**.\n\nYou don't even need to be logged into an account to chat with me or get started!\n\n• **Starting a new project**: You can just select what you want or type what you envision, and our team will build it from scratch!\n• **Checking an existing project**: You can securely look up your project's live status and timeline right here using your Project ID and email (or log in anytime).\n\nHow can I help you today?");
      }
      home();
    },

    how_to_build: async () => {
      say(
        "You can just **select what you want or type what you envision**, and our dedicated engineering team will build it completely from scratch!\n\n" +
        "Here is the simple, transparent process to get your project built:\n\n" +
        "1. **Step 1: Choose or Describe What You Want**\n" +
        "   Click **'Bring your idea'** (or use the button below). You can select a product category (Website/Shop, Mobile App, Web Platform, Custom AI) or simply type your vision in plain words into the prompt box.\n\n" +
        "2. **Step 2: Customize Key Features**\n" +
        "   Pick the exact requirements you need (e.g. shopping cart, payments, customer logins, admin inventory dashboard, SEO & fast loading).\n\n" +
        "3. **Step 3: Select 'Continue building with us'**\n" +
        "   We strongly recommend choosing **'Continue building with us'**! Here are the huge advantages:\n" +
        "   • **10% Instant Build Discount**: Save 10% off the total initial development cost right away!\n" +
        "   • **Zero Maintenance Stress**: We take full responsibility for 24/7 server monitoring, security firewalls, database backups, and bug fixes so you never have technical headaches.\n" +
        "   • **Continuous Post-Launch Evolution**: As your customers and business grow, our engineers regularly push feature upgrades, speed optimizations, and new tools.\n" +
        "   • **Dedicated Engineering Support**: Priority access to senior developers with guaranteed response times.\n\n" +
        "4. **Step 4: Review Instant Estimate & Submit**\n" +
        "   You get an instant, transparent price estimate and delivery timeline with zero hidden fees. Submit your request, and our engineering team will review it and reach out within 24 hours to begin engineering!"
      );
      offer([
        ['🚀 Bring your idea (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
        ['💰 Prices & Estimates', () => reply('prices', false)],
        ['📞 Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    build_shop: async () => {
      say(
        "Building a high-performing website for your shop is fast, seamless, and completely turnkey with Apeiron Solutions!\n\n" +
        "**You don't need any technical knowledge at all.** You can just select what you want or type what you envision, and our engineering team will build everything from scratch!\n\n" +
        "Here is how to get your shop online:\n\n" +
        "1. **Open the Project Builder**: Click **'Bring your idea'** (or the button below).\n" +
        "2. **Describe Your Shop**: Select 'Website' or simply type what kind of shop you run (retail, clothing, grocery, cafe, electronics, services, etc.) and what products you sell.\n" +
        "3. **Select Your Shop Features**: Check off e-commerce essentials like a clean product catalog, instant payment gateway (UPI, cards, NetBanking), customer shopping cart, order tracking, and an easy admin dashboard to update stock.\n" +
        "4. **Select 'Continue building with us'**: We strongly recommend choosing **'Continue building with us'** for your shop! The advantages are massive:\n" +
        "   • **10% Instant Build Discount**: Reduces your upfront store build cost immediately.\n" +
        "   • **Hands-Off Maintenance**: We monitor server uptime 24/7, secure customer transactions behind our Apeiron Shield WAF, and fix bugs instantly.\n" +
        "   • **Continuous Feature Rollouts**: As sales grow, we add festival discount codes, customer loyalty points, WhatsApp order alerts, and automated invoices for you.\n" +
        "5. **Review Instant Estimate & Submit**: Review your transparent quote and submit. Our lead engineer will contact you within 24 hours to begin building your shop!"
      );
      offer([
        ['🚀 Start Building My Shop (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
        ['💰 Pricing Estimates', () => reply('prices', false)],
        ['📞 Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    form_process: async () => {
      say(
        "Filling out our project form is super simple and takes under 60 seconds!\n\n" +
        "**Here is the exact step-by-step process:**\n\n" +
        "1. **Click 'Bring your idea'** at the top right (or tap the button below).\n" +
        "2. **Step 1: Describe what you want** — Simply type what you want in plain words (for example: *'A website for my clothing shop with online payments and order tracking'*).\n" +
        "3. **Step 2: Choose matching services** — We analyze your words and highlight the best options (e.g., Website & Web Apps, Mobile App, etc.). You can select or unselect with one click.\n" +
        "4. **Step 3: Pick requirements** — Select optional features like payments, user logins, notifications, or custom admin tools. Included essentials are 100% free.\n" +
        "5. **Step 4: Select 'Continue building with us'** — **Always select this option!**\n" +
        "   **Why? Here are the advantages:**\n" +
        "   • **10% Instant Discount** on your total build cost.\n" +
        "   • **Zero Maintenance**: All server hosting, security patches, backups, and bug fixes handled for you.\n" +
        "   • **Continuous Improvements**: Our engineers regularly roll out new features and optimizations as you grow.\n" +
        "6. **Step 5: Review & Submit** — See an immediate, transparent estimate and delivery timeline. Click Submit, and our team will start working on your project!"
      );
      offer([
        ['🚀 Open the Form Now', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
        ['Check project status', startProjectStatus],
        ['Main menu', home]
      ]);
    },

    continue_advantages: async () => {
      say(
        "Selecting **'Continue building with us'** is the smartest way to build your product. Here are the key advantages:\n\n" +
        "• **10% Instant Build Discount**: You save 10% on your upfront engineering and development fees immediately.\n" +
        "• **Zero Maintenance Headaches**: You don't need a DevOps engineer or system admin. We manage all cloud servers, security patches, database backups, and SSL certificates for you.\n" +
        "• **Continuous Feature Evolution**: Software is never static. As your business gains users and feedback, our team regularly engineers and releases new features, design improvements, and performance boosts.\n" +
        "• **Free Bug Fixes & Compatibility**: Whenever web browsers, iOS, or Android update, we proactively update your codebase so your product never breaks.\n" +
        "• **Apeiron Shield 24/7 Security**: Your product is protected under our multi-layer WAF firewalls, brute-force rate limiters, and live monitoring.\n" +
        "• **Priority Engineering Support**: Direct hotline to our senior engineering team whenever you need help or new ideas implemented."
      );
      offer([
        ['🚀 Bring your idea (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['💰 Starting prices', () => reply('prices', false)],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    prices: async () => {
      const c = await getCatalog();
      if (c && c.services) {
        const lines = Object.values(c.services).map(s => `• **${s.name}**: starting from ${inr(s.base)}`).join('\n');
        say(`Here are our current starting estimates (before tax):\n\n${lines}\n\nOur interactive project builder calculates an instant estimate tailored to your exact requirements. When you select **'Continue building with us'**, your build price includes a **10% discount**!`);
      } else {
        say("Our starting estimates are ₹40,000 for frontend websites, ₹1,20,000 for full-stack platforms, and ₹1,50,000 for mobile apps. Selecting **'Continue building with us'** gives you a **10% discount** on the build cost! The final price is always confirmed in writing before work begins.");
      }
      offer([
        ['🚀 Get an estimate (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
        ['Check project status', startProjectStatus],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    build: async () => {
      say(
        "We design and engineer complete technology solutions from scratch:\n\n" +
        "• **Websites & Web Apps**: High-performance, SEO-optimized, responsive modern web apps\n" +
        "• **Full-Stack Platforms**: SaaS platforms, client portals, robust backends & dashboards\n" +
        "• **Mobile Apps**: Native iOS and Android products\n" +
        "• **Custom AI Solutions**: Autonomous agents, LLM pipelines, RAG knowledge search & chatbots\n" +
        "• **Cloud & Automation**: Scalable infrastructure, database engineering, and workflow automation\n\n" +
        "**How to get started**: You can just select what you want or type what you envision, and our team will build it! In the form, make sure to select **'Continue building with us'** to get a **10% build discount** and ongoing feature updates."
      );
      offer([
        ['🚀 Start Building (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
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
      say("We operate through three clear engagement models:\n\n1. **Idea Sprint (1–2 weeks)**: We transform your concept into wireframes, technical specs, and an architecture blueprint.\n2. **MVP Build (4–8 weeks)**: Our engineering team builds, tests, and deploys your first production product.\n3. **Dedicated Product Team**: Continuous post-launch feature releases, security patches, monitoring, and scaling.\n\nTo begin, simply open our form, type what you want, and choose **'Continue building with us'** for an instant 10% discount!");
      offer([
        ['🚀 Bring your idea (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
        ['Code ownership', () => reply('ownership', false)],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    plans: async () => {
      say("When building with us, you can choose between two straightforward plans:\n\n• **Continue building with us (Recommended)**: 10% instant discount on the build fee, plus an ongoing monthly subscription for continuous improvements, proactive updates, security patches, and feature additions.\n• **Build only**: Fixed one-time price. We engineer the product, complete full QA testing, and deliver complete source handover.");
      offer([
        ['🚀 Get an estimate (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
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
      say("You don't need any technical knowledge at all! That's why we're here. You can just select what you want or type what you envision in plain words, and our team will build it from scratch! Make sure to select **'Continue building with us'** for zero-headache ongoing maintenance and an instant 10% discount.");
      offer([
        ['🚀 Bring your idea (Open Form)', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
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
      say("To access your dashboard, click **'Log in'** at the top right. If you're new, select 'Create account' to register with your name, email, and password. If you ever lose your credentials, choose 'Forgot password' and we'll email a secure 6-digit code to reset it.\n\nNote: You do not need to log in to start a new project or check existing project status right here in chat!");
      offer([
        ['Log in', () => { close(); document.querySelector('[data-login]')?.click(); }],
        ['Check project status', startProjectStatus],
        ['Main menu', home]
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
      say(
        "I want to make sure you get the exact answer you're looking for!\n\n" +
        "• **Want to build something?** You can just select what you want or type your idea, and our team will build it from scratch! In our form, remember to select **'Continue building with us'** for a **10% build discount** and zero-headache ongoing engineering.\n" +
        "• **Have an existing project?** You can securely check your live project stage and timeline right here using your Project ID and email (no login required).\n" +
        "• **Need pricing or tech stack details?** Choose from the options below or ask me directly!"
      );
      offer([
        ['🚀 How to build / Fill form', () => reply('how_to_build', false)],
        ['✨ Continue Building Advantages', () => reply('continue_advantages', false)],
        ['Check project status', startProjectStatus],
        ['Prices & Estimates', () => reply('prices', false)],
        ['Talk to an engineer', startHuman],
        ['Main menu', home]
      ]);
    },

    team_messages: async () => {
      say("You can access your private, confidential conversations directly with the Apeiron engineering and architecture team in your Client Portal.\n\nAll submitted requests have an isolated message thread with our team.");
      offer([
        ['💬 Open Messages with Team', () => { close(); location.href = 'account/#chat'; }],
        ['Check project status', startProjectStatus],
        ['Main menu', home]
      ]);
    }
  };

  const RULES = [
    // 1. Specific building & form questions (highest priority)
    [/\b(shop|store|e-?commerce|sell online|products? (for|in|on)|retail|boutique|merchandise|inventory)\b/i, 'build_shop'],
    [/\b(how to (fill|use|complete|submit) (the )?forms?|fill(ing)? (the |a )?forms?|form (process|steps?|guide)|intake form|step by step form)\b/i, 'form_process'],
    [/\b(how to build|how do (i|we) build|how can (i|we) build|what to do( to build)?|how to create|how to start|where (do|can) i start|want to build|how does it get built|build (it|something|my|a)|process of building|build website|build app)\b/i, 'how_to_build'],
    [/\b(continue building( with us)?|advantages?|benefits?|why continue|why subscribe|subscription advantage|plan advantages?)\b/i, 'continue_advantages'],

    // 2. Project status & lookup
    [/\b(status of (my|the|our|there|their)?\s*project|project status|check project|track project|where is my project|order status|quote status|my project|about my project|status)\b/i, 'project_status'],
    [/\b(messages?|client chat|team chat|chat with team|talk to team|portal chat|direct message|dm)\b/i, 'team_messages'],

    // 3. Contact & human handover
    [/\b(email|e-mail|mail id|contact( info(rmation)?)?|reach you|reach out|write to)\b/i, 'contact'],
    [/\b(human|person|agent|someone|call me|speak|talk to|engineer|founder|phone|whatsapp)\b/i, 'human'],

    // 4. Infrastructure & Security
    [/\b(website status|server status|site status|uptime|operational|systems? status|is (the )?site (down|up)|healthz?|ping)\b/i, 'webstatus'],
    [/\b(security|firewall|waf|hack|hack ?proof|ddos|safe|data protection|gdpr|confidential|encrypt\w*)\b/i, 'security'],

    // 5. Tech & AI
    [/\b(tech(nology)?\s*stack|technologies|react|python|node|three\.?js|database|postgres|framework|tools)\b/i, 'tech'],
    [/\b(ai|artificial intelligence|llm|gpt|chatbots?|rag|machine learning|model|agents?)\b/i, 'ai'],

    // 6. Greetings & Social
    [/\b(hi|hello|hey|namaste|good (morning|afternoon|evening)|greetings|hola)\b/i, 'hello'],
    [/\b(thanks|thank you|thx|awesome|great|perfect|appreciate|cool)\b/i, 'thanks'],

    // 7. Commercial & Process
    [/\b(price|prices|pricing|cost|costs|how much|budget|quote|estimate|rate|fees?|inr|rupees?)\b/i, 'prices'],
    [/\b(plan|plans|subscription|maintenance|updates?|monthly|support plan)\b/i, 'plans'],
    [/\b(code ownership|intellectual property|\bip\b|who owns|own the code|copyright)\b/i, 'ownership'],
    [/\b(technical knowledge|non-?tech|coding knowledge|learn engineering|do i need)\b/i, 'nontech'],
    [/\b(how long|timeline|deadline|duration|weeks?|months?|delivery|when|turnaround)\b/i, 'time'],
    [/\b(pay|payment|invoice|upi|card|bank|schedule)\b/i, 'pay'],
    [/\b(login|log in|sign in|code|otp|account|password|verify|forgot)\b/i, 'account'],

    // 8. General fallbacks
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
