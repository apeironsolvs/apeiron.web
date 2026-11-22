(() => {
let n=0;const cols=[...document.querySelectorAll('.col')];
function card(text,c){const el=document.createElement('div');el.className='t';const p=document.createElement('p');p.textContent=text;const bar=document.createElement('div');
const mk=(l,a,d)=>{const b=document.createElement('button');b.type='button';b.textContent=l;b.setAttribute('aria-label',a);b.addEventListener('click',()=>{const i=cols.findIndex(x=>x.contains(el));if(d===0)el.remove();else cols[Math.max(0,Math.min(2,i+d))].querySelector('.cards').append(el);stat()});return b};
bar.append(mk('←','Move left',-1),mk('→','Move right',1),mk('✕','Delete task',0));el.append(p,bar);cols[c].querySelector('.cards').append(el)}
function stat(){let t=0;cols.forEach(c=>{const k=c.querySelectorAll('.t').length;c.querySelector('h2 b').textContent=k;t+=k});
const d=cols[2].querySelectorAll('.t').length,p=t?Math.round(d/t*100):0;document.getElementById('pct').textContent=p+'%';document.getElementById('fill').style.width=p+'%'}
[['Design onboarding flow',0],['Write API tests',0],['Set up CI pipeline',1],['Review pricing page',1],['Ship login screen',2],['Fix signup bug',2]].forEach(([t,c])=>card(t,c));stat();
cols[0].querySelector('form').addEventListener('submit',e=>{e.preventDefault();const i=e.target.querySelector('input'),v=i.value.trim();if(v){card(v,0);i.value='';stat()}});
})();
