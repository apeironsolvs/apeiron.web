// ==============================================================================
// Apeiron Solutions — Intelligent Conversational AI Engine
// Supports:
// 1. External LLMs when configured: Google Gemini (API key), OpenAI (API key), or local Ollama.
// 2. High-performance semantic reasoning engine & deep technical knowledge base
//    with multi-turn context memory (zero external dependencies required).
// ==============================================================================

const SYSTEM_PROMPT = `You are Alex, Lead Solutions Architect and Technical Concierge at Apeiron Solutions (apeironsolvs.com).
Your role is to give clear, authoritative, technically precise, and friendly answers to clients inquiring about software engineering, web apps, mobile apps, custom AI pipelines, tech stacks, pricing, security, and timelines.

Apeiron Solutions Key Facts:
- Services: High-performance Websites & Web Apps (React, Next.js, Three.js WebGL), Full-Stack SaaS Platforms (Node.js, Python, PostgreSQL/Supabase), Native/Cross-platform Mobile Apps (Flutter, React Native, iOS, Android), Custom AI Solutions (RAG, autonomous agents, LLM pipelines, computer vision), Cloud Infrastructure & Automation.
- Starting Estimates: Websites from ₹40,000; Full-stack Platforms from ₹1,20,000; Mobile Apps from ₹1,50,000; Custom AI solutions quoted per scope.
- "Continue building with us" (Subscription Plan): Highly recommended! Gives 10% instant discount on build fee, hands-off 24/7 server monitoring, Apeiron Shield WAF protection, free bug fixes, and continuous post-launch feature releases.
- Intellectual Property: Clients own 100% of all code, assets, repositories, and IP. Fully guaranteed in writing.
- Security: Multi-layer Apeiron Shield WAF, scrypt cryptographic hashing, brute-force rate limiters, strict data isolation, zero tracking.
- Timelines: Idea Sprint (1–2 weeks), MVP Build (4–8 weeks), Enterprise/Custom (milestone-based).
- Contact: apeironsolvs@gmail.com, GitHub (github.com/apeironsolvs), LinkedIn (linkedin.com/in/apeiron-solvs-a54866441).

Formatting guidelines:
- Use concise, well-structured paragraphs with bolding (**key concepts**) and bullet points where helpful.
- Provide direct, actionable answers rather than vague deflections.
- If the user has a specific project idea, explain how Apeiron would architect it, recommend relevant tech stacks, and encourage them to click "Bring your idea" to get an instant tailored quote.`;

// ------------------------------------------------------------------------------
// Deep Semantic Knowledge Base (Fallback when no LLM API key is configured)
// ------------------------------------------------------------------------------
const TOPICS = [
  {
    id: 'ecommerce_shop',
    keywords: ['shop', 'store', 'ecommerce', 'e-commerce', 'sell online', 'products', 'inventory', 'cart', 'checkout', 'clothing', 'retail', 'boutique', 'grocery'],
    reply: `Building a high-converting **e-commerce store or retail platform** is one of Apeiron's core specialties.\n\n` +
      `Here is how we engineer your online shop:\n` +
      `• **Custom Storefront**: Ultra-fast, SEO-optimized product catalog with instant search, filtering, and high-res image caching.\n` +
      `• **Seamless Payments**: Full integration with Razorpay, Stripe, UPI QR, cards, and net banking with automated webhook receipt generation.\n` +
      `• **Inventory & Order Dashboard**: Real-time stock alerts, order status updates, discount coupon engine, and shipping partner integration.\n` +
      `• **Customer Accounts**: Secure OTP/password logins, wishlist, order tracking, and automated email/WhatsApp alerts.\n\n` +
      `**Recommended Plan**: When filling out the form, choose **'Continue building with us'** to get an **instant 10% build discount**, continuous security updates, and automated feature additions (e.g., festival flash sales, loyalty points) as your sales grow!`,
    suggestions: ['🚀 Start Building My Shop', '💰 Pricing Estimates', '🔒 Payment & Security', '📞 Talk to an Engineer'],
    action: { type: 'open_form', category: 'shop' }
  },
  {
    id: 'healthcare_clinic',
    keywords: ['doctor', 'clinic', 'hospital', 'patient', 'medical', 'healthcare', 'appointment', 'booking', 'prescription', 'telehealth'],
    reply: `Apeiron engineers secure, privacy-compliant **Healthcare & Clinic Management Platforms**:\n\n` +
      `• **Appointment Scheduling**: Smart calendar booking with doctor slot management, automated reminders, and calendar sync.\n` +
      `• **Patient Portals**: Private medical history, lab report uploads, and digital prescription access protected with cryptographic encryption.\n` +
      `• **Telemedicine & Video**: WebRTC-based high-definition video consultations with in-session messaging.\n` +
      `• **Compliance & Security**: Strict role-based access control (Doctor, Staff, Patient) under our Apeiron Shield firewall with zero cross-patient data visibility.\n\n` +
      `Tell us your clinic's workflow, and we can deliver an initial production system within 4 to 6 weeks!`,
    suggestions: ['🚀 Bring Healthcare Idea', '🔒 Data Privacy & HIPAA', '💰 Platform Pricing', '📞 Talk to an Engineer'],
    action: { type: 'open_form', category: 'platform' }
  },
  {
    id: 'fintech_payments',
    keywords: ['fintech', 'wallet', 'payment', 'gateway', 'razorpay', 'stripe', 'upi', 'transactions', 'banking', 'pci', 'invoice', 'ledger'],
    reply: `Apeiron has extensive experience building **Fintech, Billing & Payment Infrastructure**:\n\n` +
      `• **Gateway Integrations**: Turnkey payment pipelines with Razorpay, Stripe, Cashfree, PayPal, and instant UPI intent linking.\n` +
      `• **Idempotent Webhooks & Double-Entry Ledger**: Every transaction is mathematically balanced with zero risk of duplicate charging or balance discrepancy.\n` +
      `• **Security & Compliance**: End-to-end TLS encryption, tokenized card storage (PCI-DSS compliant), and automated fraud detection limiters.\n` +
      `• **Invoicing & Taxation**: Automated PDF invoice generation with GST/VAT compliance and real-time reconciliation dashboards.`,
    suggestions: ['🚀 Build Fintech System', '💰 Integration Pricing', '🔒 Apeiron Shield WAF', '📞 Talk to an Engineer'],
    action: { type: 'open_form', category: 'platform' }
  },
  {
    id: 'edtech_lms',
    keywords: ['lms', 'course', 'student', 'tutor', 'education', 'school', 'academy', 'edtech', 'learning', 'quiz', 'video course'],
    reply: `We build modern **Learning Management Systems (LMS) & EdTech Platforms**:\n\n` +
      `• **Course Streaming & Content**: DRM-protected video streaming, interactive quizzes, downloadable notes, and progress tracking.\n` +
      `• **Interactive Classrooms**: Live video lectures, whiteboards, student doubt-clearing chat, and attendance logging.\n` +
      `• **Monetization**: Subscription passes, one-time course sales, promo codes, and automated completion certificates.\n` +
      `• **Admin Insights**: Comprehensive student engagement metrics, quiz score analytics, and revenue dashboards.`,
    suggestions: ['🚀 Build LMS Platform', '💰 Project Cost', '✨ Advantages of Subscription', '📞 Talk to an Engineer'],
    action: { type: 'open_form', category: 'platform' }
  },
  {
    id: 'mobile_apps',
    keywords: ['mobile app', 'ios', 'android', 'flutter', 'react native', 'play store', 'app store', 'apk', 'cross platform'],
    reply: `We engineer production-grade **iOS & Android Mobile Applications**:\n\n` +
      `• **Frameworks**: We use **Flutter** or **React Native** for high-performance 60fps cross-platform mobile apps, or native Swift/Kotlin for specialized requirements.\n` +
      `• **Offline-First Synchronization**: Local SQLite/WatermelonDB storage so your users can navigate even with patchy network.\n` +
      `• **Push Notifications**: Firebase Cloud Messaging (FCM) & Apple APNs for transactional updates and user re-engagement.\n` +
      `• **App Store Launch Support**: We handle the entire submission, certificates, and review process for both the Apple App Store and Google Play Store.\n\n` +
      `Mobile builds start at ₹1,50,000 with milestone delivery and a 10% discount under 'Continue building with us'.`,
    suggestions: ['🚀 Build Mobile App', '💰 Mobile Estimates', '📱 Flutter vs React Native', '📞 Talk to an Engineer'],
    action: { type: 'open_form', category: 'mobile' }
  },
  {
    id: 'custom_ai',
    keywords: ['ai', 'artificial intelligence', 'llm', 'chatgpt', 'gpt', 'rag', 'vector', 'agent', 'machine learning', 'embeddings', 'ocr', 'document analysis'],
    reply: `Apeiron specializes in building **Enterprise AI Systems & Practical LLM Pipelines**:\n\n` +
      `• **RAG Knowledge Search**: Connect your company's private documents (PDFs, docs, databases) to an LLM via pgvector for accurate, hallucination-free search.\n` +
      `• **Autonomous Workflow Agents**: Multi-agent systems that extract data from incoming emails/invoices, validate against rules, and update your database.\n` +
      `• **Intelligent Customer Copilots**: Context-aware chatbots that understand product manuals, check order status, and escalate to humans seamlessly.\n` +
      `• **Private & Isolated**: All models run with strict tenant isolation, zero training on client data, and self-hosted model support (Ollama/Llama 3).`,
    suggestions: ['🚀 Build Custom AI', '💰 AI Solution Pricing', '🔒 Privacy & Security', '📞 Talk to an Engineer'],
    action: { type: 'open_form', category: 'ai' }
  },
  {
    id: 'tech_stack',
    keywords: ['tech stack', 'technologies', 'react', 'next.js', 'vue', 'python', 'fastapi', 'node', 'django', 'database', 'postgres', 'supabase', 'sqlite', 'three.js'],
    reply: `Our technology stack is selected strictly for high performance, reliability, and security:\n\n` +
      `• **Frontend & UI**: Vanilla Modern JS, React, Next.js, Three.js (WebGL graphics), Tailwind/CSS Architecture (0 runtime overhead).\n` +
      `• **Backend & APIs**: Node.js 22+, Python (FastAPI/Flask), REST APIs, WebSockets for live data.\n` +
      `• **Databases**: Supabase Cloud PostgreSQL, Redis for in-memory caching, local SQLite for embedded storage.\n` +
      `• **Infrastructure & DevOps**: Vercel Serverless Edge, Cloudflare WAF, Docker containers, automated CI/CD deployment pipelines.\n` +
      `• **Security**: Apeiron Shield multi-layer WAF, token-bucket sliding rate limiters, scrypt hashing, CSP level 3.`,
    suggestions: ['🔒 Apeiron Shield Details', '🚀 Build With This Stack', '💰 Pricing Overview', 'Main menu']
  },
  {
    id: 'pricing_plans',
    keywords: ['price', 'pricing', 'cost', 'how much', 'quote', 'estimate', 'rate', 'fees', 'budget', 'inr', 'discount'],
    reply: `Apeiron operates on transparent, upfront milestone pricing with zero hidden charges:\n\n` +
      `• **Websites & Web Apps**: Starting from **₹40,000**\n` +
      `• **Full-Stack SaaS Platforms**: Starting from **₹1,20,000**\n` +
      `• **Mobile Apps (iOS & Android)**: Starting from **₹1,50,000**\n` +
      `• **Custom AI & Automation**: Scoped and priced to exact project requirements.\n\n` +
      `💡 **Major Advantage**: If you select **'Continue building with us'** in our builder, you receive an **immediate 10% discount** on your build fee, plus dedicated ongoing maintenance and feature development!`,
    suggestions: ['🚀 Calculate Instant Estimate', '✨ Why Continue Building?', '📋 What is Included?', '📞 Talk to an Engineer'],
    action: { type: 'open_form' }
  },
  {
    id: 'continue_advantages',
    keywords: ['continue building', 'subscription', 'maintenance', 'monthly', 'why continue', 'advantages', 'benefits', 'ongoing'],
    reply: `Selecting **'Continue building with us'** is the highest-value option for growing businesses. Here is why:\n\n` +
      `1. **10% Instant Build Discount**: Reduces your initial development and engineering fees right away.\n` +
      `2. **Hands-Off Maintenance**: We handle 24/7 server monitoring, database backups, security patches, and SSL renewals so you never have DevOps headaches.\n` +
      `3. **Continuous Feature Evolution**: Software is never finished on launch day. As your users provide feedback, our engineering team rolls out new features and optimizations.\n` +
      `4. **Free Bug Fixes & Compatibility**: Whenever web browsers, iOS, or Android release updates, we ensure your code stays compatible with zero extra charges.\n` +
      `5. **Priority SLA**: Direct hotline to our senior engineering team with guaranteed response times.`,
    suggestions: ['🚀 Start With 10% Discount', '💰 Pricing Estimates', '📞 Talk to an Engineer', 'Main menu'],
    action: { type: 'open_form' }
  },
  {
    id: 'code_ownership_nda',
    keywords: ['ownership', 'own code', 'ip', 'intellectual property', 'copyright', 'nda', 'contract', 'source code', 'handover'],
    reply: `**You own 100% of the code, intellectual property, repositories, and digital assets** we build for you.\n\n` +
      `• **Full Ownership Guarantee**: All intellectual property rights are explicitly transferred to you in writing in the contract.\n` +
      `• **Complete Source Handover**: Clean GitHub repository access with setup documentation, environment templates, and architectural diagrams.\n` +
      `• **Mutual NDA**: We are happy to sign a Non-Disclosure Agreement (NDA) before detailed discovery conversations if required.\n` +
      `• **Zero Vendor Lock-in**: All code is engineered with clean standards so any qualified engineer can run or extend it.`,
    suggestions: ['🚀 Start Your Project', 'How we work', 'Talk to an engineer', 'Main menu']
  },
  {
    id: 'timelines_process',
    keywords: ['timeline', 'how long', 'duration', 'weeks', 'delivery', 'deadline', 'when', 'sprint', 'mvp', 'process'],
    reply: `Our engineering process is agile, milestone-driven, and transparent:\n\n` +
      `• **Phase 1: Idea Sprint (1–2 weeks)**: Wireframing, UX flows, database schema design, and technical specifications.\n` +
      `• **Phase 2: MVP Core Build (4–8 weeks)**: Active engineering of core features, database integration, and UI implementation.\n` +
      `• **Phase 3: QA & Security Review (1 week)**: Apeiron Shield security auditing, load testing, browser compatibility testing.\n` +
      `• **Phase 4: Production Deployment**: Domain linking, SSL setup, and live rollout.\n\n` +
      `Every project comes with milestone demos and a private status tracker you can check anytime!`,
    suggestions: ['🚀 Start My Project', 'Check Project Status', 'Prices', 'Talk to an engineer']
  },
  {
    id: 'security_waf',
    keywords: ['security', 'firewall', 'waf', 'hack', 'ddos', 'protection', 'safe', 'encrypt', 'leak', 'shield', 'rate limit'],
    reply: `Security is engineered into the foundation of Apeiron products through our **Apeiron Shield** architecture:\n\n` +
      `• **Apeiron Shield Multi-Layer WAF**: Inspects incoming HTTP payloads to block SQL injection, XSS, RCE, and malicious crawler probes.\n` +
      `• **Brute-Force & Rate Limiting**: Token-bucket sliding rate limiters with automatic IP throttling for login and sensitive API endpoints.\n` +
      `• **Cryptographic Storage**: Passwords hashed with scrypt + unique salts; secure, HttpOnly, SameSite cookies with strict session expiration.\n` +
      `• **Zero Tracking & Privacy**: We do not load external analytics, trackers, or foreign fonts. Client data is strictly isolated.`,
    suggestions: ['🌐 Check Website Live Status', 'Tech Stack Details', 'Talk to an engineer', 'Main menu']
  },
  {
    id: 'migration_redesign',
    keywords: ['migrate', 'migration', 'redesign', 'upgrade', 'wordpress', 'php', 'slow website', 'modernize', 'rewrite'],
    reply: `We regularly migrate slow, vulnerable legacy websites (WordPress, PHP, outdated frameworks) into **modern, blazingly fast web applications**:\n\n` +
      `• **Zero SEO Loss**: We map 301 redirects for every existing URL so your Google rankings and backlinks are preserved 100%.\n` +
      `• **10x Speed Boost**: Moving from bloated plugins to clean React / Next.js / Node gives you sub-second load times and 95+ Google Lighthouse scores.\n` +
      `• **Rock-Solid Security**: Eliminates WordPress vulnerability exploits (plugins/SQLi) through our hardened Apeiron Shield layer.\n` +
      `• **Smooth Data Migration**: We write automated migration scripts to safely transfer all users, posts, products, and order history.`,
    suggestions: ['🚀 Request Site Migration', '💰 Pricing Estimates', '📞 Talk to an Engineer', 'Main menu'],
    action: { type: 'open_form' }
  }
];

// Helper: Normalize query into tokens
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

// ------------------------------------------------------------------------------
// Multi-Provider LLM Caller (Gemini / OpenAI / Ollama)
// ------------------------------------------------------------------------------
async function callLLM(userMessage, conversationHistory = [], env = process.env) {
  // 1. Google Gemini API (Recommended & Free-tier enabled)
  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const contents = [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will act as Alex, Apeiron Solutions technical concierge, providing precise, authoritative, and helpful answers.' }] },
        ...conversationHistory.slice(-6).map(h => ({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
      ];

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature: 0.6, maxOutputTokens: 600 } }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return { reply: text.trim(), provider: 'gemini' };
      }
    } catch (_) { /* fallback to local engine */ }
  }

  // 2. OpenAI API
  const openAiKey = env.OPENAI_API_KEY;
  if (openAiKey) {
    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.slice(-6).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage }
      ];

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 500, temperature: 0.6 }),
        signal: AbortSignal.timeout(10000)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text) return { reply: text.trim(), provider: 'openai' };
      }
    } catch (_) { /* fallback to local engine */ }
  }

  // 3. Local Ollama Instance
  const ollamaUrl = env.OLLAMA_HOST || env.OLLAMA_URL;
  if (ollamaUrl) {
    try {
      const endpoint = ollamaUrl.replace(/\/+$/, '') + '/api/chat';
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory.slice(-6).map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: userMessage }
      ];

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: env.OLLAMA_MODEL || 'llama3.2', messages, stream: false }),
        signal: AbortSignal.timeout(12000)
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.message?.content;
        if (text) return { reply: text.trim(), provider: 'ollama' };
      }
    } catch (_) { /* fallback to local engine */ }
  }

  return null;
}

// ------------------------------------------------------------------------------
// Core Engine: Answer Generation with Semantic Matching & Context
// ------------------------------------------------------------------------------
export async function generateChatResponse(userMessage, conversationHistory = [], env = process.env) {
  const raw = String(userMessage || '').trim();
  if (!raw) return { ok: false, error: 'Empty message' };

  // Attempt external LLM if credentials are provided
  const llmResult = await callLLM(raw, conversationHistory, env);
  if (llmResult && llmResult.reply) {
    return {
      ok: true,
      reply: llmResult.reply,
      provider: llmResult.provider,
      suggestions: ['🚀 Bring your idea', '💰 Pricing Estimates', '📞 Talk to an engineer', 'Main menu']
    };
  }

  // Intelligent Semantic Matching over Apeiron Knowledge Matrix
  const queryTokens = tokenize(raw);
  const contextTokens = conversationHistory.slice(-2).flatMap(h => tokenize(h.content));
  const combinedTokens = [...queryTokens, ...contextTokens.slice(-6)];

  let bestMatch = null;
  let maxScore = 0;

  for (const topic of TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      const kwTokens = tokenize(kw);
      const isMulti = kwTokens.length > 1;

      if (isMulti) {
        if (raw.toLowerCase().includes(kw)) score += 5;
      } else {
        const single = kwTokens[0];
        if (queryTokens.includes(single)) score += 3;
        else if (combinedTokens.includes(single)) score += 1;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestMatch = topic;
    }
  }

  if (bestMatch && maxScore >= 2) {
    return {
      ok: true,
      reply: bestMatch.reply,
      suggestions: bestMatch.suggestions || ['🚀 Bring your idea', 'Prices', 'Talk to an engineer', 'Main menu'],
      action: bestMatch.action || null,
      provider: 'knowledge-engine'
    };
  }

  // General Dynamic Reasoning for unclassified queries
  const isQuestion = /\?|what|how|why|when|where|who|can you|could you|do you|is it/i.test(raw);
  const mentionsAppOrSite = /app|web|site|portal|platform|software|system|tool/i.test(raw);

  let fallbackAnswer = `At **Apeiron Solutions**, we design and engineer tailored software solutions for businesses and founders.\n\n`;

  if (mentionsAppOrSite) {
    fallbackAnswer += `Regarding your question about **"${raw.slice(0, 80)}"**:\n\n` +
      `Yes, our engineering team can build and launch this from scratch! We architect custom applications with clean code, dedicated databases, automated backups, and multi-layer Apeiron Shield WAF firewalls.\n\n` +
      `Here is the best way to get this engineered:\n` +
      `1. Click **'Bring your idea'** below.\n` +
      `2. Type your idea into our builder to see an instant price estimate and delivery timeline.\n` +
      `3. Choose **'Continue building with us'** for an **instant 10% build discount** and zero-headache ongoing engineering maintenance.`;
  } else if (isQuestion) {
    fallbackAnswer += `Regarding **"${raw.slice(0, 80)}"**:\n\n` +
      `Our engineering team handles full-lifecycle development—from wireframes and architecture specs to production deployment and long-term scaling.\n\n` +
      `• **Web & Platforms**: Modern React/Next.js and Node.js architectures.\n` +
      `• **Mobile**: Native & cross-platform Flutter/React Native for iOS and Android.\n` +
      `• **Custom AI**: LLM agents, vector embeddings, and automated workflows.\n` +
      `• **Ownership**: You receive 100% full source code ownership and repository rights.\n\n` +
      `Would you like to calculate an instant estimate, or speak directly with one of our lead engineers?`;
  } else {
    fallbackAnswer += `We can build and scale that for you!\n\n` +
      `You don't need any technical knowledge—you can simply type what you envision, and our engineers will build it from scratch.\n\n` +
      `Select an option below to explore pricing, check an existing project's status, or start a new project!`;
  }

  return {
    ok: true,
    reply: fallbackAnswer,
    suggestions: [
      '🚀 Bring your idea (Get Estimate)',
      '✨ Continue Building Advantages',
      '💰 Starting Prices',
      '📞 Talk to an Engineer'
    ],
    provider: 'reasoning-engine'
  };
}
