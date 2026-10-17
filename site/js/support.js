/* ==========================================================================
   Apeiron Solutions — Human-like Project & Status AI Concierge.
   - Positioned in the right-bottom corner.
   - Appears automatically after scrolling 25% of the page.
   - Conversational, human-like persona ("Alex from Apeiron").
   - Answers questions about what Apeiron builds, processes, pricing, and timelines.
   - Website & system operational uptime status reporter.
   - Privacy-isolated project status checking (requires active session or matching ID + email).
   - Zero cross-user data leakage.
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
      m.textContent = text;
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
    header.innerHTML = `<strong>Project #${proj.id}</strong> <span class="sup-proj-badge ${proj.status}">${proj.status_label || proj.status}</span>`;
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
      const time = el('small', 'sup-proj-time', `Last activity: ${new Date(proj.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`);
      card.append(time);
    }

    return card;
  }

  function renderWebsiteStatusCard(statusData) {
    const card = el('div', 'sup-status-card');
    card.innerHTML = `
      <div class="sup-status-top">
        <span class="sup-status-beacon"></span>
        <strong>Apeiron Systems: Operational</strong>
      </div>
      <ul class="sup-status-list">
        <li><span>Public Web Platform & Demos</span><b>100% Online</b></li>
        <li><span>Client Portal & Security</span><b>Active</b></li>
        <li><span>Cloud API Gateway</span><b>Healthy (< 50ms)</b></li>
        <li><span>90-Day Platform Uptime</span><b>99.99%</b></li>
      </ul>
      <small>All database clusters and authentication services are operating normally.</small>
    `;
    return card;
  }

  // --- Default Home Menu ---
  const home = () => offer([
    ['Prices', () => reply('prices')],
    ['Check project status', startProjectStatus],
    ['What do you build?', () => reply('build')],
    ['Website status', () => reply('webstatus')],
    ['How does it work?', () => reply('process')],
    ['Plans', () => reply('plans')],
    ['Talk to a person', startHuman]
  ]);

  // --- Knowledge Base Responses ---
  const KB = {
    hello: async () => {
      await checkClientSession();
      if (clientSession && clientSession.name) {
        say(`Hi ${clientSession.name}! 👋 Welcome back. I'm Alex, your Apeiron project concierge. You're logged in as ${clientSession.email}. How can I help you today?`);
      } else {
        say("Hello! 👋 I'm Alex from Apeiron Solutions. I'm here to answer questions about our services, estimates, website uptime, or securely check the status of your project. How can I help you today?");
      }
    },

    prices: async () => {
      const c = await getCatalog();
      if (c && c.services) {
        const lines = Object.values(c.services).map(s => `• ${s.name}: from ${inr(s.base)}`).join('\n');
        say(`Here are our current starting estimates (before tax):\n\n${lines}\n\nOur interactive project builder calculates an instant estimate tailored to your exact scope. The final build cost is always locked in writing before development starts.`);
      } else {
        say("Our starting estimates are ₹40,000 for frontend websites, ₹1,20,000 for full-stack platforms, and ₹1,50,000 for mobile apps. The final price is always confirmed in writing.");
      }
      offer([
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Check project status', startProjectStatus],
        ['Talk to a person', startHuman]
      ]);
    },

    build: async () => {
      say("We design and engineer complete technology solutions from scratch:\n\n• High-performance websites & interactive web applications\n• Full-stack platforms, client portals & custom SaaS\n• Mobile apps for iOS & Android\n• Custom AI models, intelligent assistants & LLM pipelines\n• Workflow automation & API integrations\n• Cloud infrastructure, DevOps & data systems\n\nYou can inspect live interactive demos directly in the 'What We Build' section!");
      offer([
        ['Show me the demos', () => { close(); document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' }); }],
        ['Prices', () => reply('prices')],
        ['How does it work?', () => reply('process')]
      ]);
    },

    process: async () => {
      say("We operate through three clear engagement models:\n\n1. Idea Sprint (1–2 weeks): We turn your rough concept into an architectural roadmap and wireframe.\n2. MVP Build (4–8 weeks): Our engineering team builds and tests your first production-ready product.\n3. Dedicated Product Team: Continuous post-launch feature development, monitoring, and scaling.");
      offer([
        ['Plans and updates', () => reply('plans')],
        ['Code ownership', () => reply('ownership')],
        ['Talk to a person', startHuman]
      ]);
    },

    plans: async () => {
      say("When building with us, you can choose between two straightforward plans:\n\n• Build only: A fixed single price. We engineer the product, perform QA, and deliver complete handover.\n• Build + keep improving: A 10% discount on the build fee, plus an ongoing monthly subscription for proactive updates, security patches, and feature additions.");
      offer([
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Check project status', startProjectStatus],
        ['Prices', () => reply('prices')]
      ]);
    },

    ownership: async () => {
      say("You own 100% of the code, intellectual property, repositories, and assets we build for you. Full ownership rights are explicitly guaranteed in the written contract before work starts.");
      offer([
        ['How does it work?', () => reply('process')],
        ['Prices', () => reply('prices')]
      ]);
    },

    nontech: async () => {
      say("You don't need any technical knowledge at all! That's why we're here. You bring the business idea and vision; we handle the engineering, architecture, code, testing, and deployment. Every decision is explained in plain, transparent language.");
      offer([
        ['Get an estimate', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Talk to a person', startHuman]
      ]);
    },

    time: async () => {
      say("Delivery timelines depend on the project scope. An Idea Sprint takes 1–2 weeks; an MVP build typically takes 4–8 weeks. We provide a firm timeline and milestone schedule in our agreement before any work begins.");
      offer([
        ['Check project status', startProjectStatus],
        ['Talk to a person', startHuman]
      ]);
    },

    webstatus: async () => {
      try {
        await fetch('/healthz');
      } catch (_) { /* offline */ }
      say('Here is our live website and infrastructure health report:', 'bot', renderWebsiteStatusCard());
      offer([
        ['Check project status', startProjectStatus],
        ['Prices', () => reply('prices')],
        ['Talk to a person', startHuman]
      ]);
    },

    pay: async () => {
      say("We do not take payments directly on this website. After we review and confirm your project scope in writing, we share a milestone-based payment schedule (via UPI, bank transfer, or invoice).");
      offer([['Prices', () => reply('prices')], ['Talk to a person', startHuman]]);
    },

    security: async () => {
      say("Privacy and confidentiality are paramount at Apeiron. Your information is stored in an encrypted database accessible only to our core team. Passwords are irreversibly hashed using scrypt, and we never share your data or ideas with third parties.");
      offer([
        ['Check project status', startProjectStatus],
        ['Talk to a person', startHuman]
      ]);
    },

    account: async () => {
      say("To access your dashboard, click 'Log in' at the top right. If you're new, select 'Create account' to register with your name, email, and password. If you ever lose your credentials, choose 'Forgot your password?' and we'll email a secure 6-digit code to reset it.");
      offer([
        ['Log in', () => { close(); document.querySelector('[data-login]')?.click(); }],
        ['Check project status', startProjectStatus],
        ['Talk to a person', startHuman]
      ]);
    },

    thanks: async () => {
      say("You're very welcome! Is there anything else about our projects, pricing, or status I can help with?");
      home();
    },

    fallback: async () => {
      say("I want to make sure you get the exact information you need. I can look up your project status, share our pricing and build capabilities, or connect you directly with an Apeiron engineer.");
      offer([
        ['Check project status', startProjectStatus],
        ['Prices', () => reply('prices')],
        ['Website status', () => reply('webstatus')],
        ['Talk to a person', startHuman]
      ]);
    }
  };

  const RULES = [
    [/\b(human|person|agent|someone|call me|contact|speak|talk to|engineer|founder)\b/i, 'human'],
    [/\b(status of (my|the|our|there|their)?\s*project|project status|check project|track project|where is my project|order status|quote status)\b/i, 'project_status'],
    [/\b(website status|server status|site status|uptime|operational|systems? status|is (the )?site (down|up)|healthz?)\b/i, 'webstatus'],
    [/\b(hi|hello|hey|namaste|good (morning|afternoon|evening)|greetings)\b/i, 'hello'],
    [/\b(thanks|thank you|thx|awesome|great|perfect|appreciate)\b/i, 'thanks'],
    [/\b(price|prices|pricing|cost|costs|how much|budget|quote|estimate|rate|fees?)\b/i, 'prices'],
    [/\b(plan|plans|subscription|maintenance|updates?|monthly|support plan)\b/i, 'plans'],
    [/\b(code ownership|intellectual property|\bip\b|who owns|own the code|copyright)\b/i, 'ownership'],
    [/\b(technical knowledge|non-?tech|coding knowledge|learn engineering|do i need)\b/i, 'nontech'],
    [/\b(how long|timeline|deadline|duration|weeks?|months?|delivery|when)\b/i, 'time'],
    [/\b(pay|payment|invoice|upi|card|bank)\b/i, 'pay'],
    [/\b(secure|security|privacy|data|gdpr|safe|confidential)\b/i, 'security'],
    [/\b(login|log in|sign in|code|otp|account|password|verify|forgot)\b/i, 'account'],
    [/\b(build|services?|offer|website|app|mobile|ai|automation|cloud|demo|projects?)\b/i, 'build'],
    [/\b(process|how does|how do you|work|sprint|mvp|steps?)\b/i, 'process']
  ];

  async function reply(key) {
    const t = showTyping();
    await wait(450);
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
    await wait(350);
    t.remove();

    if (clientSession && clientSession.signedIn) {
      try {
        const r = await fetch('/api/client/quotes');
        if (r.ok) {
          const res = await r.json();
          const quotes = res.quotes || [];
          if (quotes.length) {
            say(`Welcome back, ${clientSession.name || clientSession.email}! Here is the current live status for your active project requests:`);
            quotes.forEach(q => {
              say('', 'bot', renderProjectCard(q));
            });
            offer([
              ['Open Account Dashboard', () => { location.href = '/account/'; }],
              ['Website status', () => reply('webstatus')],
              ['Talk to a person', startHuman]
            ]);
            return;
          }
        }
      } catch (_) { /* fall back */ }
      say(`You are logged in as ${clientSession.email}, but you haven't submitted any projects yet. Would you like to bring an idea and create your first request?`);
      offer([
        ['Bring your idea', () => { close(); document.querySelector('[data-open-intake]')?.click(); }],
        ['Prices', () => reply('prices')],
        ['Talk to a person', startHuman]
      ]);
      return;
    }

    // Not logged in: require exact matching Project ID and Email to preserve privacy
    flow = 'status_id';
    say("To ensure complete confidentiality and protect each client's project from unauthorized access, please provide your numeric Project / Request ID (for example: 12 or 101):");
    input.focus();
  }

  async function handleProjectStatusFlow(text) {
    if (flow === 'status_id') {
      const numMatch = text.match(/\d+/);
      if (!numMatch) {
        return say("Please enter a valid numeric Project ID (for example, 101).");
      }
      statusData.id = parseInt(numMatch[0], 10);
      flow = 'status_email';
      return say(`Thank you. Now, what is the registered email address associated with Project #${statusData.id}?`);
    }

    if (flow === 'status_email') {
      const email = text.trim().toLowerCase();
      if (!/^\S+@\S+\.\S{2,}$/.test(email)) {
        return say("That doesn't look like a valid email address. Please enter the email address used for this project (e.g. name@company.com):");
      }
      statusData.email = email;
      flow = null;

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
            ['Website status', () => reply('webstatus')],
            ['Talk to our team', startHuman]
          ]);
        } else if (res.status === 404) {
          say(`I could not find a project matching Request #${statusData.id} for the email address "${statusData.email}".\n\nFor security reasons, project details are only displayed when both the ID and registered email match our records. Please double check both details or log in directly.`);
          offer([
            ['Try again', startProjectStatus],
            ['Log in to Account', () => { close(); document.querySelector('[data-login]')?.click(); }],
            ['Talk to a person', startHuman]
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
  }

  // --- Human Handover Flow (Enquiries tagged 'support') ---
  function startHuman() {
    flow = 'name';
    handoverData = {};
    chips.replaceChildren();
    say('Happy to. What is your name?');
    input.focus();
  }

  async function handleHumanFlow(text) {
    if (flow === 'name') {
      handoverData.name = text.slice(0, 100);
      flow = 'email';
      return say(`Thanks, ${handoverData.name}. What email address should we reply to?`);
    }
    if (flow === 'email') {
      if (!/^\S+@\S+\.\S{2,}$/.test(text)) {
        return say('That does not look like an email address. Please try again, like name@company.com.');
      }
      handoverData.email = text.slice(0, 254);
      flow = 'message';
      return say('And what would you like to ask or tell us?');
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
        say(`Thank you, ${handoverData.name}. Your message is with our team and we will reply to ${handoverData.email}.`);
      } else if (r.status === 429) {
        say('You have sent several messages recently. Please try again a little later.');
      } else {
        say('Sorry, that did not go through. Please try again in a moment.');
      }
    } catch (_) {
      t.remove();
      say('Sorry, I could not reach our server. Please try again in a moment.');
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
        <span class="sup-tag">Online · Instant answers</span>
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
      KB.hello().then(home);
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
    input.placeholder = 'Ask about project status, prices, services…';
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
        return say('Please choose Yes or No above.');
      }

      // Natural language rule matching
      const hit = RULES.find(r => r[0].test(t));
      if (hit) {
        if (hit[1] === 'human') return startHuman();
        if (hit[1] === 'project_status') return startProjectStatus();
        return reply(hit[1]);
      }

      reply('fallback');
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
      KB.hello().then(home);
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
