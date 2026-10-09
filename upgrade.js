/* Apeiron upgrade pack — standalone, does not touch the WebGL engine. Load with: <script src="upgrade.js" defer></script> */
(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* scroll progress + back-to-top */
const bar=document.createElement('div');bar.className='u-progress';bar.setAttribute('aria-hidden','true');
const top=document.createElement('button');top.className='u-top';top.type='button';top.setAttribute('aria-label','Back to top');top.textContent='↑';
document.body.append(bar,top);
let tick=false;
const onScroll=()=>{
  if(tick)return;tick=true;
  requestAnimationFrame(()=>{
    const max=document.documentElement.scrollHeight-innerHeight;
    bar.style.transform=`scaleX(${max>0?Math.min(1,scrollY/max):0})`;
    top.classList.toggle('show',scrollY>innerHeight*1.2);
    tick=false;
  });
};
addEventListener('scroll',onScroll,{passive:true});onScroll();
top.addEventListener('click',()=>scrollTo({top:0,behavior:reduce?'auto':'smooth'}));

/* reveal new blocks once */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
$$('.rv').forEach((el,i)=>{el.style.transitionDelay=(el.classList.contains('u-card')?i%3*80:0)+'ms';io.observe(el)});

/* marquee: duplicate the pills for a seamless loop */
const track=$('#u-track');
if(track&&!reduce){
  $$('.u-pill',track).forEach(p=>{const c=p.cloneNode(true);c.classList.add('dup');c.setAttribute('aria-hidden','true');track.append(c)});
}

/* FAQ: one open at a time */
const faq=$$('.u-faq details');
faq.forEach(d=>d.addEventListener('toggle',()=>{if(d.open)faq.forEach(o=>{if(o!==d)o.open=false})}));

/* footer year */
const copy=$('.copy');
if(copy&&!/\d{4}/.test(copy.textContent))copy.textContent=`© ${new Date().getFullYear()} Apeiron Solutions`;
})();
