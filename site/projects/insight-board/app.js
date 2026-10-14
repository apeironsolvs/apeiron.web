(() => {
const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const D={north:[42,38,51,47,55,60,58,63,70,66,74,81],south:[35,33,40,44,42,49,52,50,57,61,63,69],west:[48,52,49,58,61,64,70,68,75,79,83,92]};
D.all=M.map((_,i)=>D.north[i]+D.south[i]+D.west[i]);
const P=[['Smart Meter X1',[320,210,190]],['Gateway Pro',[260,240,300]],['Sensor Pack',[180,160,170]],['Cloud Plan',[140,150,160]]];
const NS='http://www.w3.org/2000/svg',svg=document.getElementById('chart'),sel=document.getElementById('reg');
function render(){const d=D[sel.value],mx=Math.max(...d)*1.15,tot=d.reduce((a,b)=>a+b,0),best=d.indexOf(Math.max(...d));
svg.replaceChildren();d.forEach((v,i)=>{const h=v/mx*190,x=24+i*47,r=document.createElementNS(NS,'rect'),t=document.createElementNS(NS,'text'),tt=document.createElementNS(NS,'title');
r.setAttribute('class','bar');r.setAttribute('x',x);r.setAttribute('y',210-h);r.setAttribute('width',32);r.setAttribute('height',h);r.setAttribute('rx',5);tt.textContent=M[i]+': ₹'+v+' lakh';r.append(tt);
t.setAttribute('x',x+16);t.setAttribute('y',228);t.setAttribute('text-anchor','middle');t.textContent=M[i];svg.append(r,t)});
const orders=Math.round(tot*37);document.getElementById('k1').textContent='₹'+tot+' L';document.getElementById('k2').textContent=orders.toLocaleString();
document.getElementById('k3').textContent='₹'+Math.round(tot*1e5/orders).toLocaleString();document.getElementById('k4').textContent=M[best];
const idx={all:null,north:0,south:1,west:2}[sel.value],units=P.map(([n,u])=>[n,idx===null?u.reduce((a,b)=>a+b):u[idx]]),sum=units.reduce((a,u)=>a+u[1],0),tb=document.getElementById('tb');tb.replaceChildren();
units.forEach(([n,u])=>{const tr=document.createElement('tr'),a=document.createElement('td'),b=document.createElement('td'),c=document.createElement('td'),m=document.createElement('span');a.textContent=n;b.textContent=u;
m.className='meter';m.style.width=Math.round(u/sum*120)+'px';c.append(m,Math.round(u/sum*100)+'%');tr.append(a,b,c);tb.append(tr)})}
sel.addEventListener('change',render);render();
})();
