(() => {
const cv=document.getElementById('c'),x=cv.getContext('2d'),S=cv.width,R=S*.4,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const CITY=[['Mumbai',19.1,72.9],['Singapore',1.35,103.8],['Frankfurt',50.1,8.7],['Virginia',38.9,-77.4],['São Paulo',-23.5,-46.6],['Tokyo',35.7,139.7],['Sydney',-33.9,151.2],['London',51.5,-.1]];
const vec=(la,lo)=>{la*=Math.PI/180;lo*=Math.PI/180;return[Math.cos(la)*Math.sin(lo),Math.sin(la),Math.cos(la)*Math.cos(lo)]};
const DOTS=Array.from({length:2600},(_,i)=>{const y=1-2*(i+.5)/2600,r=Math.sqrt(1-y*y),a=i*2.399963;return[Math.cos(a)*r,y,Math.sin(a)*r]});
const NODE=CITY.map(c=>vec(c[1],c[2]));let rot=0,tilt=.4,drag=null,arcs=[],count=0,shown=0;
const rotate=v=>{const c=Math.cos(rot),s=Math.sin(rot),x1=v[0]*c+v[2]*s,z1=-v[0]*s+v[2]*c,ct=Math.cos(tilt),st=Math.sin(tilt);return[x1,v[1]*ct-z1*st,v[1]*st+z1*ct]};
const proj=v=>{const r=rotate(v);return[S/2+r[0]*R,S/2-r[1]*R,r[2]]};
cv.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId)});cv.addEventListener('pointerup',()=>{drag=null});
cv.addEventListener('pointermove',e=>{if(!drag)return;rot+=(e.clientX-drag[0])*.008;tilt=Math.max(-1,Math.min(1,tilt+(e.clientY-drag[1])*.006));drag=[e.clientX,e.clientY]});
const reg=document.getElementById('reg');const rows=CITY.map(c=>{const li=document.createElement('li'),b=document.createElement('b');li.append(c[0],b);reg.append(li);return b});
function lat(){rows.forEach((b,i)=>{b.textContent=Math.round(18+i*9+Math.random()*14)+' ms'})}lat();setInterval(lat,1000);
function spawn(){const a=Math.random()*8|0;let b=Math.random()*8|0;if(a===b)b=(b+3)%8;arcs.push({a:NODE[a],b:NODE[b],s:0,v:.012+Math.random()*.012});count++}
setInterval(()=>{shown=count;count=0;document.getElementById('rps').textContent=(shown*3200+Math.round(Math.random()*400)).toLocaleString()},1000);setInterval(spawn,reduce?900:200);
const slerp=(a,b,s)=>{const d=Math.max(-1,Math.min(1,a[0]*b[0]+a[1]*b[1]+a[2]*b[2])),O=Math.acos(d),k=Math.sin(O)||1,A=Math.sin((1-s)*O)/k,B=Math.sin(s*O)/k,l=1+.28*Math.sin(Math.PI*s);return[(A*a[0]+B*b[0])*l,(A*a[1]+B*b[1])*l,(A*a[2]+B*b[2])*l]};
function frame(){if(!drag&&!reduce)rot+=.003;x.clearRect(0,0,S,S);const gr=x.createRadialGradient(S/2,S/2,R*.2,S/2,S/2,R*1.15);gr.addColorStop(0,'#0b2238');gr.addColorStop(1,'rgba(4,7,13,0)');x.fillStyle=gr;x.beginPath();x.arc(S/2,S/2,R*1.15,0,6.283);x.fill();
{const c=Math.cos(rot),s=Math.sin(rot),ct=Math.cos(tilt),st=Math.sin(tilt);x.fillStyle='rgb(130,200,250)';for(let b=0;b<5;b++){x.globalAlpha=.2+b*.16;x.beginPath();for(const d of DOTS){const x1=d[0]*c+d[2]*s,z1=-d[0]*s+d[2]*c,z=d[1]*st+z1*ct;if(z<=0||Math.min(4,z*5|0)!==b)continue;x.rect(S/2+x1*R,S/2-(d[1]*ct-z1*st)*R,2,2)}x.fill()}x.globalAlpha=1}
for(const n of NODE){const p=proj(n);if(p[2]>0){x.fillStyle='#38bdf8';x.beginPath();x.arc(p[0],p[1],4,0,6.283);x.fill();x.strokeStyle='rgba(56,189,248,.35)';x.beginPath();x.arc(p[0],p[1],8+Math.sin(Date.now()/300)*2,0,6.283);x.stroke()}}
arcs=arcs.filter(a=>(a.s+=a.v)<1.15);for(const a of arcs){x.lineWidth=1.6;for(let k=0;k<22;k++){const s0=Math.max(0,a.s-.35+k*.016),s1=Math.min(1,s0+.016);if(s1<=s0||s0>=1)continue;const p=proj(slerp(a.a,a.b,s0)),q=proj(slerp(a.a,a.b,s1));if(p[2]>0&&q[2]>0){x.strokeStyle='rgba(125,225,255,'+(k/22*.9)+')';x.beginPath();x.moveTo(p[0],p[1]);x.lineTo(q[0],q[1]);x.stroke()}}}
requestAnimationFrame(frame)}frame();
})();
