/* ==========================================================================
   Apeiron Solutions — Main Application Controller
   Coordinates layout, interactive sections, 3D WebGL scene, intake wizard,
   and visual effects.
   ========================================================================== */

import { CONFIG } from './config.js';
import { initCursor } from './cursor.js';
import { initIntake } from './intake.js';
import { initScene } from './scene.js';
import { PROJECTS, initProjectWindow } from './projects.js';
import { initSupport } from './support.js';

/* ---------- helpers ---------- */
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse=matchMedia('(pointer: coarse)').matches;
const isMobile=()=>innerWidth<820;
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
const wrapPI=a=>((a+Math.PI)%TAU+TAU)%TAU-Math.PI;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}

/* ---------- content data ---------- */
const CAPS={
  web:{label:'Web',text:'Sites and applications that run in a browser, from a single page to a full platform.',items:['Websites','Web applications','SaaS platforms','Dashboards','E-commerce'],shape:'web'},
  mobile:{label:'Mobile',text:'Phone-first products for Android and iOS, built for one platform or both.',items:['Android applications','iOS applications','Cross-platform applications','Mobile-first products'],shape:'mobile'},
  ai:{label:'AI',text:'Products where AI does real work: answering, generating, deciding, and automating.',items:['Generative AI','AI assistants','RAG systems','LLM integrations','AI automation'],shape:'ai'},
  stack:{label:'Full stack',text:'Every layer of a product, from the screen a person touches to the infrastructure underneath. Point at a layer to light it up.',items:['Frontend','API','Backend','Database','Infrastructure'],shape:'stack'},
  cloud:{label:'Cloud',text:'The environment your product runs in, set up so it can be released and grown.',items:['Cloud infrastructure','Deployment','DevOps'],shape:'cloud'},
  data:{label:'Data',text:'Where a product keeps what it knows, and how that information moves and gets reported.',items:['Databases','Data pipelines','Reporting and dashboards'],shape:'data'},
  automation:{label:'Automation',text:'Repetitive work and disconnected systems turned into workflows that run on their own.',items:['AI automation','Intelligent workflows','System integrations'],shape:'automation'},
  custom:{label:'Custom',text:"Ideas that don't fit a category. Bring the unusual ones too.",items:['Experimental products','New platforms','Complex systems','Unconventional technology'],shape:'custom'}
};
const STAGES=[
  ['Discover',"You tell us what you're imagining."],
  ['Define','We understand the problem, users, requirements, and goals.'],
  ['Architect','We determine the technologies, architecture, and development strategy.'],
  ['Design','We turn the concept into an intuitive product experience.'],
  ['Build','Our engineering team develops the product.'],
  ['Test','We validate performance, reliability, usability, and quality.'],
  ['Launch','We deploy the product into the real world.'],
  ['Scale','We continue improving and expanding it when required.']
];
const PS=['point','nebula','lattice','web','columns','knot','sphere','expand'];
const PSC=[1.1,1,1,.9,1,1,1,.85];
const ROLES=[[1,'UI/UX'],[2,'Frontend'],[3,'Backend'],[4,'AI'],[5,'Database'],[6,'Cloud'],[7,'QA']];
const PROJ=[
  {n:'Project 01',title:'AI-powered platform',tech:'AI / Python / React / APIs / Cloud',flow:['AI model','API','Backend','Database','Frontend','User'],shape:'chain6'},
  {n:'Project 02',title:'Full-stack SaaS',tech:'Next.js / Node.js / Database / Cloud',flow:['User','Frontend','API','Backend','Database','Cloud'],shape:'chain6'},
  {n:'Project 03',title:'Custom business platform',tech:'React / Backend / Automation / APIs',flow:['Trigger','Automation','APIs','Backend','Dashboard'],shape:'chain5'}
];
const IDEA_PARTS=['UI/UX','Frontend','Backend','Database','Authentication','AI engine','Cloud'];

/* ---------- state ---------- */
const st={cap:'web',capHover:-1,team:new Set(),teamHover:-1,proj:0,flowHover:-1,ideaSet:new Set(),ideaText:'',intake:{open:false,step:0}};

/* ---------- UI: nav, menu, masks ---------- */
const nav=$('#nav');
const onScrollNav=()=>nav.classList.toggle('compact',scrollY>60);
addEventListener('scroll',onScrollNav,{passive:true});onScrollNav();
const burger=$('#burger'),menu=$('#menu');
burger.addEventListener('click',()=>{const o=menu.classList.toggle('open');burger.setAttribute('aria-expanded',o);burger.textContent=o?'Close':'Menu'});
$$('a',menu).forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');burger.setAttribute('aria-expanded','false');burger.textContent='Menu'}));
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.25});
$$('.mask').forEach(el=>io.observe(el));

/* ---------- UI: roving tabs helper ---------- */
function roving(list,sel){
  list.addEventListener('keydown',e=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
    const t=$$(sel,list);let i=t.indexOf(document.activeElement);if(i<0)return;
    if(e.key==='ArrowRight')i=(i+1)%t.length;else if(e.key==='ArrowLeft')i=(i-1+t.length)%t.length;else if(e.key==='Home')i=0;else i=t.length-1;
    t[i].focus();t[i].click();e.preventDefault();
  });
}

/* ---------- Skiper52 HoverExpand_001 Accordion Engine ---------- */
const capKeys=Object.keys(CAPS);
let heCards=[];

function initHoverExpand(){
  const container=$('#cap-panel');
  if(!container)return;

  const cardsHtml=capKeys.map((k,i)=>{
    const c=CAPS[k];
    const isFirst=i===0;
    return `
      <div class="he-card ${isFirst?'active':''}" data-k="${k}" data-i="${i}">
        <div class="he-collapsed">
          <span class="he-num">0${i+1}</span>
          <span class="he-vert-title">${c.label}</span>
          <span style="width:6px;height:6px;border-radius:50%;background:var(--cyan)"></span>
        </div>
        <div class="he-expanded">
          <div>
            <div class="he-head">
              <span class="mono" style="color:var(--cyan)">0${i+1} / 0${capKeys.length}</span>
              <span class="tag">${c.label}</span>
            </div>
            <h3>${c.label}</h3>
            <p>${c.text}</p>
          </div>
          <ul class="he-tags">
            ${c.items.map(t=>`<li class="he-tag">${t}</li>`).join('')}
          </ul>
          <div class="he-proj">${(PROJECTS[k]||[]).map(p=>`<button type="button" class="he-open he-thumb" data-proj="${p.slug}" aria-label="${p.name}, ${p.kind}. Open live demo"><img src="assets/previews/${p.slug}.webp" alt="" width="480" height="300" loading="lazy" decoding="async"><span class="he-cap"><b>${p.name}</b><small>${p.kind}</small></span></button>`).join('')}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML=`
    <div class="hover-expand-wrap" id="hover-expand-wrap">
      ${cardsHtml}
    </div>
  `;

  heCards=$$('.he-card',container);
  heCards.forEach(card=>{
    const k=card.dataset.k;
    const setActive=()=>{
      st.cap=k;
      st.capHover=-1;
      syncHoverExpandTabs(k);
    };
    card.addEventListener('mouseenter',setActive);
    card.addEventListener('click',setActive);
  });
}

function syncHoverExpandTabs(key){
  $$('.tab',$('#tabs')).forEach(b=>{
    const on=b.dataset.k===key;
    b.setAttribute('aria-selected',on);
    b.tabIndex=on?0:-1;
  });
  heCards.forEach(c=>c.classList.toggle('active',c.dataset.k===key));
}

const tabsEl=$('#tabs');
Object.entries(CAPS).forEach(([k,c])=>{
  const b=document.createElement('button');b.type='button';b.className='tab';b.setAttribute('role','tab');b.id='tab-'+k;b.textContent=c.label;b.dataset.k=k;
  b.addEventListener('click',()=>{st.cap=k;st.capHover=-1;syncHoverExpandTabs(k)});tabsEl.append(b);
});
roving(tabsEl,'.tab');
initHoverExpand();
syncHoverExpandTabs('web');

/* ---------- UI: process rail & StickyCard002 engine ---------- */
const rail=$('#rail');
STAGES.forEach((s,i)=>{
  const li=document.createElement('li'),b=document.createElement('button');
  b.type='button';b.innerHTML=`${String(i+1).padStart(2,'0')}<span class="nm">${s[0]}</span>`;
  b.setAttribute('aria-label',`Go to stage ${i+1}: ${s[0]}`);
  b.addEventListener('click',()=>{
    const S=secs.find(x=>x.id==='how');
    if(!S)return;
    const targetY=S.top+(i/7)*(S.h-innerHeight);
    scrollTo({top:targetY,behavior:reduce?'auto':'smooth'});
  });
  li.append(b);rail.append(li);
});

const stickyCards=$$('.sticky-card',$('#sticky-cards-stage'));
const totalCards=stickyCards.length;

function updateStickyCards(p){
  if(!stickyCards.length)return;
  const numTransitions=totalCards-1; // 7
  const v=clamp(p)*numTransitions;   // 0.0 -> 7.0
  const activeIdx=Math.min(numTransitions-1,Math.floor(v)); // 0..6
  const t=v-activeIdx;               // 0.0 -> 1.0

  for(let i=0;i<totalCards;i++){
    const card=stickyCards[i];
    if(reduce){
      const isCur=i===Math.min(totalCards-1,Math.round(v));
      card.style.transform='none';
      card.style.opacity=isCur?'1':'0';
      card.style.pointerEvents=isCur?'auto':'none';
      card.style.zIndex=isCur?'10':'1';
      continue;
    }

    if(i<activeIdx){
      const depth=activeIdx-i;
      card.style.transform='translate3d(0, 0%, 0) scale(0.7) rotate(5deg)';
      card.style.opacity=depth>3?'0':String(Math.max(0,1-depth*0.22));
      card.style.zIndex=String(i+1);
    } else if(i===activeIdx){
      const sc=1.0-0.3*t;
      const rot=5*t;
      card.style.transform=`translate3d(0, 0%, 0) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(3)}deg)`;
      card.style.opacity=String(1.0-0.15*t);
      card.style.zIndex=String(i+1);
    } else if(i===activeIdx+1){
      const y=(1.0-t)*100;
      card.style.transform=`translate3d(0, ${y.toFixed(3)}%, 0) scale(1) rotate(0deg)`;
      card.style.opacity='1';
      card.style.zIndex=String(i+1);
    } else {
      card.style.transform='translate3d(0, 100%, 0) scale(1) rotate(0deg)';
      card.style.opacity='0';
      card.style.zIndex=String(i+1);
    }
  }

  const pi=Math.min(totalCards-1,Math.round(v));
  if(pi!==L.stage){
    const countEl=$('#proc-count');
    if(countEl)countEl.textContent=`${String(pi+1).padStart(2,'0')} / 08`;
    if(typeof railBtns!=='undefined'&&railBtns.length){
      railBtns.forEach((b,i)=>{
        b.classList.toggle('on',i===pi);
        b.classList.toggle('done',i<pi);
      });
    }
    L.stage=pi;
  }
}

const procStage=p=>{
  const v=clamp(p)*7;
  const i=Math.min(6,Math.floor(v));
  return{i,f:v-i,act:Math.min(7,Math.round(v))};
};

/* ---------- UI: idea demo ---------- */
const ideaIn=$('#idea-in'),chipsEl=$('#chips'),becomeEl=$('#become');
IDEA_PARTS.forEach(p=>{const c=document.createElement('span');c.className='chip';c.textContent=p;chipsEl.append(c)});
function analyze(txt){
  const t=txt.trim();if(t.length<3)return null;
  const has=re=>re.test(t);
  const ai=has(/\b(ai|ml|llm|gpt|chatbots?|assistants?|generative|rag|machine learning|automat\w*|predict\w*|recommend\w*|nlp|intelligen\w*|agents?)\b/i);
  const mobile=has(/\b(mobile|android|ios|iphone|ipad|app store|play store)\b/i);
  const web=has(/\b(web|websites?|site|platform|saas|dashboards?|portal|marketplace|stores?|shop|e-?commerce|browser|admin)\b/i);
  const auth=has(/\b(users?|log ?in|accounts?|customers?|members?|sign ?(in|up)|profiles?|roles?|subscri\w*|patients?|students?|clients?|teams?|employees?)\b/i);
  const data=auth||ai||t.length>45||has(/\b(data|database|records?|inventory|orders?|history|catalog|analytics|reports?|reporting|track\w*|booking\w*|content)\b/i);
  const set=new Set([0,1,2,6]);if(data)set.add(3);if(auth)set.add(4);if(ai)set.add(5);
  const parts=[];if(ai)parts.push('AI platform');if(mobile)parts.push('Mobile application');if(web||!mobile)parts.push('Web application');
  parts.push('Backend system');if(ai)parts.push('AI engine');parts.push('Cloud infrastructure');
  return{set,parts};
}
let ideaTimer;
function renderIdea(){
  const r=analyze(ideaIn.value);st.ideaText=ideaIn.value;
  st.ideaSet=r?r.set:new Set();
  $$('.chip',chipsEl).forEach((c,i)=>c.classList.toggle('on',st.ideaSet.has(i)));
  becomeEl.innerHTML='';
  $('#become-h').hidden=!r;$('#idea-cta').hidden=!r;
  if(r)r.parts.forEach(p=>{const li=document.createElement('li');li.textContent=p;becomeEl.append(li)});
}
ideaIn.addEventListener('input',()=>{clearTimeout(ideaTimer);ideaTimer=setTimeout(renderIdea,160)});
$('#idea-ex').addEventListener('click',()=>{ideaIn.value=ideaIn.placeholder;renderIdea();ideaIn.focus()});

/* ---------- UI: team ---------- */
const rolesEl=$('#roles');
ROLES.forEach(([g,n])=>{
  const b=document.createElement('button');b.type='button';b.className='role';b.textContent=n;b.setAttribute('aria-pressed','false');b.dataset.g=g;
  b.addEventListener('click',()=>{if(st.team.has(g))st.team.delete(g);else st.team.add(g);syncTeam()});
  b.addEventListener('mouseenter',()=>st.teamHover=g);b.addEventListener('focus',()=>st.teamHover=g);
  b.addEventListener('mouseleave',()=>st.teamHover=-1);b.addEventListener('blur',()=>st.teamHover=-1);
  rolesEl.append(b);
});
function syncTeam(){
  $$('.role',rolesEl).forEach(b=>b.setAttribute('aria-pressed',st.team.has(+b.dataset.g)));
  $('#team-all').textContent=st.team.size===ROLES.length?'Clear the team':'Assemble the full team';
}
$('#team-all').addEventListener('click',()=>{if(st.team.size===ROLES.length)st.team.clear();else ROLES.forEach(([g])=>st.team.add(g));syncTeam()});

/* ---------- UI: projects ---------- */
const ptabs=$('#ptabs');
PROJ.forEach((p,i)=>{
  const b=document.createElement('button');b.type='button';b.className='ptab';b.setAttribute('role','tab');b.id='ptab-'+i;b.innerHTML=`<small>${p.n}</small>${p.title}`;
  b.addEventListener('click',()=>{st.proj=i;st.flowHover=-1;renderProj()});ptabs.append(b);
});
roving(ptabs,'.ptab');
function renderProj(){
  const p=PROJ[st.proj];
  $$('.ptab',ptabs).forEach((b,i)=>{b.setAttribute('aria-selected',i===st.proj);b.tabIndex=i===st.proj?0:-1});
  const box=$('#pcase');box.setAttribute('aria-labelledby','ptab-'+st.proj);
  box.innerHTML=`<h3 style="font-size:26px;letter-spacing:-.02em">${p.title}<span class="tag">Placeholder</span></h3>
  <dl class="case">
    <div><dt>The idea</dt><dd>[Describe the idea in one or two sentences.]</dd></div>
    <div><dt>The challenge</dt><dd>[What made it hard to build?]</dd></div>
    <div><dt>The approach</dt><dd>[How the team planned and built it.]</dd></div>
    <div><dt>The technology</dt><dd>${p.tech}</dd></div>
    <div><dt>The result</dt><dd>[Add the real outcome once the project can be shared.]</dd></div>
  </dl>
  <ol class="flow" aria-label="Architecture"></ol>`;
  const fl=$('.flow',box);
  p.flow.forEach((n,i)=>{
    const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=n;
    const on=()=>st.flowHover=i,off=()=>st.flowHover=-1;
    b.addEventListener('mouseenter',on);b.addEventListener('focus',on);b.addEventListener('mouseleave',off);b.addEventListener('blur',off);
    li.append(b);fl.append(li);
  });
}
renderProj();



const INT_SH = ['point', 'sphere', 'sphere'];


// Initialize Intake Wizard
const intake = initIntake({
  config: CONFIG,
  state: st,
  onStateChange: () => {
    measure();
  }
});

/* ---------- scene sections ---------- */
const HERO_STOPS=['point','nebula','lattice','stack','knot'];
let intro=reduce?.12:0;
const S={};
const defs={
  hero:{ox:0,spec:p=>{const h=Math.max(p,intro),f=clamp(h)*4,i=Math.min(3,Math.floor(f));return{a:HERO_STOPS[i],b:HERO_STOPS[i+1],u:smooth(f-i),link:smooth(h*5),scale:1}},hot:()=>.12},
  problem:{ox:.22,spec:()=>({a:'fragments',scale:.8,link:.9}),hot:(g,t)=>.1+.6*Math.max(0,Math.sin(t*1.3+g*2.1))},
  solution:{ox:.22,spec:p=>({a:'lattice',b:'stack',u:smooth((p-.1)/.55),link:1,scale:.95}),hot:g=>.12+.85*clamp((S.solution.lp*1.3-.05-g*.16)*6)},
  build:{ox:.24,spec:()=>({a:CAPS[st.cap].shape,link:1,scale:.95}),hot:g=>st.capHover>=0?(g===st.capHover?1:.1):.4},
  how:{ox:.25,spec:p=>{const{i,f}=procStage(p),u=i===6?smooth(f):smooth(f);return{a:PS[i],b:PS[Math.min(7,i+1)],u,link:i===0?u:1,scale:PSC[i]}},
       hot:(g,t)=>{const i=procStage(S.how.lp).act;return i===5?.15+.85*Math.max(0,Math.sin(t*2.6-g*1.2)):i===6?.95:i===7?.6:.3}},
  idea:{ox:.24,spec:()=>({a:'blueprint',link:1,scale:.95}),hot:g=>st.ideaSet.has(g)?1:(g===7?.5:.08),alive:g=>st.ideaSet.has(g)||g===7?1:.4},
  people:{ox:-.24,spec:()=>({a:'team',link:.9,scale:.95}),hot:g=>st.teamHover===g?1:(st.team.has(g)?.6:g===0?.7:0),alive:g=>g===0||st.team.has(g)?1:(st.teamHover===g?.5:.1)},
  custom:{ox:.22,spec:()=>({a:'custom',link:1,scale:1}),hot:(g,t)=>.15+.6*Math.max(0,Math.sin(t*.9+g*1.6))},
  projects:{ox:.22,spec:()=>({a:PROJ[st.proj].shape,link:1,scale:.85}),hot:(g,t)=>st.flowHover>=0?(g===st.flowHover?1:.12):(g===Math.floor(t*1.2)%PROJ[st.proj].flow.length?1:.25)},
  why:{ox:.24,spec:()=>({a:'knot',link:1,scale:1}),hot:(g,t)=>.2+.4*Math.max(0,Math.sin(t*.7+g))},
  trust:{ox:-.22,spec:()=>({a:'lattice',link:1,scale:.9}),hot:()=>.3},
  about:{ox:0,spec:p=>({a:'point',b:'nebula',u:smooth(p*1.6),link:smooth(p*1.6),scale:.9}),hot:()=>.25},
  cta:{ox:0,spec:()=>({a:'sphere',link:1,scale:1.3}),hot:()=>.7}
};
const secs=Object.keys(defs).map(id=>Object.assign({id,el:document.getElementById(id),top:0,h:1,lp:0},defs[id],{sticky:id==='hero'||id==='how'}));
secs.forEach(s=>S[s.id]=s);
const intakeSec={ox:.26,spec:()=>({a:INT_SH[st.intake.step],link:1,scale:1}),hot:()=>.5};
let measurePending = false;
function measure(){
  if(measurePending)return;
  measurePending=true;
  requestAnimationFrame(()=>{
    measurePending=false;
    secs.forEach(s=>{const r=s.el.getBoundingClientRect();s.top=r.top+scrollY;s.h=s.el.offsetHeight});
  });
}
measure();addEventListener('load',measure);addEventListener('resize',measure);
setTimeout(measure,600);setTimeout(measure,1800);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
if('ResizeObserver' in window){
  let roTimer;
  new ResizeObserver(()=>{clearTimeout(roTimer);roTimer=setTimeout(measure,150)}).observe(document.body);
}

function sceneTarget(){
  const vh=innerHeight,y=scrollY,probe=y+vh*.55;
  let idx=0;
  secs.forEach((s,k)=>{
    s.lp=s.sticky?clamp((y-s.top)/Math.max(1,s.h-vh)):clamp((probe-s.top)/s.h);
    if(s.top<=probe)idx=k;
  });
  const s=secs[idx],prev=secs[idx-1];
  if(st.intake.open){const sp=intakeSec.spec();return{s:intakeSec,spec:sp,pspec:sp,enter:1,act:intakeSec,aspec:sp}}
  const spec=s.spec(s.lp),pspec=prev?prev.spec(1):spec;
  const enter=prev?smooth((probe-s.top)/(vh*.6)):1;
  const act=enter>.5?s:prev,aspec=enter>.5?spec:pspec;
  return{s,spec,pspec,enter,act,aspec};
}

/* ---------- UI tick (DOM updates from scroll state) ---------- */
const ticker=$$('#ticker li'),syncLis=$$('#sync li'),railBtns=$$('button',rail),heroEl=$('#hero');
const L={alt:null,hs:-1,sync:-1,stage:-1};
function uiTick(){
  const hh=Math.max(S.hero.lp,intro);
  const alt=hh>.52;if(alt!==L.alt){heroEl.classList.toggle('alt',alt);L.alt=alt}
  const hs=Math.min(4,Math.floor(hh*5));
  if(hs!==L.hs){ticker.forEach((li,i)=>{li.classList.toggle('done',i<hs);li.classList.toggle('on',i===hs)});L.hs=hs}
  const sy=Math.floor(clamp(S.solution.lp*1.3-.05)*5.0001);
  if(sy!==L.sync){syncLis.forEach((li,i)=>li.classList.toggle('on',i<sy));L.sync=sy}
  updateStickyCards(S.how.lp);
  updateScrollReveal();
}

/* ---------- GSAP-style ScrollReveal Engine (Vanilla JS) ---------- */
const revealContainers=[];

function prepareScrollReveal(){
  if(typeof reduce!=='undefined'&&reduce)return;

  const targets=$$('h2, .lede, .quote, .ul li, .defs div, .sign, .about p, .panel p');
  targets.forEach(el=>{
    if(el.dataset.revealDone)return;
    el.dataset.revealDone='1';
    el.classList.add('scroll-reveal');

    const walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
    const textNodes=[];
    let node;
    while((node=walk.nextNode())){
      if(node.nodeValue.trim().length>0)textNodes.push(node);
    }

    const wordsInEl=[];
    textNodes.forEach(tNode=>{
      const text=tNode.nodeValue;
      const frag=document.createDocumentFragment();
      const tokens=text.split(/(\s+)/);

      tokens.forEach(tok=>{
        if(/^\s+$/.test(tok)){
          frag.appendChild(document.createTextNode(tok));
        }else{
          const wSpan=document.createElement('span');
          wSpan.className='word';
          wSpan.textContent=tok;
          frag.appendChild(wSpan);
          wordsInEl.push(wSpan);
        }
      });
      tNode.parentNode.replaceChild(frag,tNode);
    });

    if(wordsInEl.length>0){
      revealContainers.push({container:el,words:wordsInEl});
    }
  });
}

let lastRevealScrollY = -1;
function updateScrollReveal(force = false){
  if(typeof reduce!=='undefined'&&reduce)return;
  const curY = window.scrollY || window.pageYOffset || 0;
  if(!force && curY === lastRevealScrollY && revealContainers.length > 0)return;
  lastRevealScrollY = curY;
  const vh = innerHeight;

  for(let idx = revealContainers.length - 1; idx >= 0; idx--){
    const item = revealContainers[idx];
    const {container, words} = item;
    const rect = container.getBoundingClientRect();
    if(rect.top > vh * 1.25 || rect.bottom < -100) continue;

    const rawProgress = clamp((vh * 0.95 - rect.top) / (vh * 0.55), 0, 1);
    if(rawProgress >= 0.99){
      container.style.transform = 'none';
      words.forEach(w => {
        w.style.opacity = '1';
        w.style.filter = 'none';
      });
      revealContainers.splice(idx, 1);
      continue;
    }

    const baseRotation = 3.0;
    const rot = (1 - rawProgress) * baseRotation;
    container.style.transform = `rotate(${rot.toFixed(2)}deg)`;

    const numWords = words.length;
    words.forEach((w, i) => {
      const staggerOffset = (i / Math.max(1, numWords)) * 0.35;
      const pWord = clamp((rawProgress - staggerOffset) / 0.65, 0, 1);
      const opacity = 0.10 + 0.90 * pWord;
      const blur = (1 - pWord) * 4.0;

      w.style.opacity = opacity.toFixed(2);
      if(blur > 0.2){
        w.style.filter = `blur(${blur.toFixed(1)}px)`;
      }else{
        w.style.filter = 'none';
      }
    });
  }
}

addEventListener('DOMContentLoaded',prepareScrollReveal);
if(document.readyState!=='loading')prepareScrollReveal();



// Initialize 3D Scene
let GL = initScene({ state: st, secs, intakeSec });

/* ---------- footer mini core (2D) ---------- */
(function(){
  const c=$('#mini');if(!c)return;const x=c.getContext('2d');if(!x)return;
  const n=24,pts=Array.from({length:n},(_,i)=>({a:i/n*TAU,r:.35+.55*((i*37)%10)/10,s:.2+((i*13)%7)/20}));
  let vis=true,t0=0;
  new IntersectionObserver(e=>{vis=e[0].isIntersecting}).observe(c);
  function draw(t){
    x.clearRect(0,0,220,220);
    const grow=(Math.sin(t*.0005)+1)/2;
    const P=pts.map(p=>{const a=p.a+t*.0002*p.s*4,r=p.r*(.4+.6*grow)*92;return[110+r*Math.cos(a),110+r*Math.sin(a)*.9]});
    x.lineWidth=1;
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const d=Math.hypot(P[i][0]-P[j][0],P[i][1]-P[j][1]);if(d<48){x.strokeStyle=`rgba(56,213,255,${(1-d/48)*.45})`;x.beginPath();x.moveTo(P[i][0],P[i][1]);x.lineTo(P[j][0],P[j][1]);x.stroke()}}
    P.forEach((p,i)=>{x.fillStyle=i%5===0?'#38d5ff':'rgba(103,232,249,.85)';x.beginPath();x.arc(p[0],p[1],i%5===0?3.8:2.2,0,TAU);x.fill()});
  }
  if(reduce){draw(2500);return}
  (function loop(t){requestAnimationFrame(loop);if(vis&&!document.hidden)draw(t)})(0);
})();

/* ---------- main loop ---------- */
let last=performance.now(),time=0;
function loop(now){
  requestAnimationFrame(loop);
  if(document.hidden){last=now;return}
  const dt=Math.min(.05,(now-last)/1000);last=now;time+=dt;
  if(!reduce)intro=Math.max(intro,clamp((time-.6)/5)*.12);
  const sc=sceneTarget();
  uiTick();
  if(GL&&!document.body.classList.contains('pw-open'))GL.render(sc,dt,time);   // pause the 3D scene while a demo window is open
}
requestAnimationFrame(loop);


initProjectWindow();
initSupport();

// Initialize Fluid Trail Cursor
initCursor();
