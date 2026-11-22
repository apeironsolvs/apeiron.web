(() => {
const S=[['⚡','Trigger','New form submission'],['🔎','Filter','Budget above ₹5 lakh'],['👤','Action','Create contact in CRM'],['💬','Action','Notify #sales on Slack'],['✉️','Action','Send welcome email']];
const ol=document.getElementById('steps'),log=document.getElementById('log'),run=document.getElementById('run');let runs=128;
S.forEach(([i,k,t],n)=>{const li=document.createElement('li'),ic=document.createElement('span'),tx=document.createElement('span'),sm=document.createElement('small'),sw=document.createElement('button');
li.className='st';ic.className='ic';ic.textContent=i;tx.className='tx';sm.textContent=k;tx.append(sm,t);sw.className='sw';sw.type='button';sw.setAttribute('aria-pressed','true');sw.setAttribute('aria-label','Enable '+t);
if(n===0){sw.disabled=true;sw.style.opacity=.4}sw.addEventListener('click',()=>{const on=sw.getAttribute('aria-pressed')!=='true';sw.setAttribute('aria-pressed',on);li.classList.toggle('off',!on)});
li.append(ic,tx,sw);ol.append(li)});
const wait=ms=>new Promise(r=>setTimeout(r,ms)),say=t=>{const l=document.createElement('li');l.textContent=t;log.prepend(l)};
run.addEventListener('click',async()=>{run.disabled=true;log.replaceChildren();const items=[...ol.children];items.forEach(x=>x.classList.remove('done','run'));
for(const [n,li] of items.entries()){if(li.classList.contains('off')){say('Skipped: '+S[n][2]);continue}
li.classList.add('run');await wait(650);li.classList.remove('run');li.classList.add('done');say('✓ '+S[n][2]+' ('+(n?'320':'12')+' ms)')}
runs++;document.getElementById('runs').textContent=runs;say('Run finished.');run.disabled=false});
})();
