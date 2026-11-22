(() => {
const SV=[['api-gateway','2.14.0'],['web-frontend','5.3.2'],['worker-queue','1.9.7'],['postgres-primary','15.4']];
const body=document.getElementById('svc'),log=document.getElementById('log');
const now=()=>new Date().toTimeString().slice(0,5);
SV.forEach(([n,v],i)=>{const tr=document.createElement('tr'),a=document.createElement('td'),b=document.createElement('td'),c=document.createElement('td'),d=document.createElement('td'),p=document.createElement('span'),btn=document.createElement('button');
a.textContent=n;b.textContent='v'+v;p.className='pill ok';p.textContent='healthy';btn.className='btn';btn.type='button';btn.textContent='Deploy';
btn.addEventListener('click',()=>{btn.disabled=true;p.className='pill warn';p.textContent='deploying…';
setTimeout(()=>{const m=v.split('.');m[2]=+m[2]+1;v=m.join('.');b.textContent='v'+v;p.className='pill ok';p.textContent='healthy';btn.disabled=false;
const li=document.createElement('li');li.textContent=now()+' · '+n+' v'+v+' deployed';log.prepend(li)},1400)});
c.append(p);d.append(btn);tr.append(a,b,c,d);body.append(tr)});
const pts=Array.from({length:40},(_,i)=>1100+Math.sin(i/4)*120+Math.random()*60);
function draw(){const mx=1500,mn=900;document.getElementById('line').setAttribute('points',pts.map((v,i)=>(i/(pts.length-1)*400).toFixed(1)+','+(105-(v-mn)/(mx-mn)*95).toFixed(1)).join(' '));
document.getElementById('rps').textContent=Math.round(pts[pts.length-1]).toLocaleString();document.getElementById('lat').textContent=Math.round(150+Math.random()*60)+' ms'}
draw();setInterval(()=>{pts.shift();pts.push(1100+Math.sin(Date.now()/4000)*120+Math.random()*80);draw()},1000);
})();
