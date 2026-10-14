(() => {
const cv=document.getElementById('c'),x=cv.getContext('2d'),W=cv.width,H=cv.height,N=240;
let d=[],vol=1,run=true,mx=null,v=1000;const q=s=>document.getElementById(s);
for(let i=0;i<N;i++){v+=(Math.random()-.5)*3;d.push({p:v,v:20+Math.random()*60})}
function tick(){if(!run)return;v+=(Math.random()-.5)*4*vol+Math.sin(Date.now()/9000)*.15;d.push({p:v,v:20+Math.random()*80*vol});if(d.length>N)d.shift()}
const sma=(i,n)=>{let s=0,c=0;for(let k=Math.max(0,i-n+1);k<=i;k++){s+=d[k].p;c++}return s/c};
function draw(){x.clearRect(0,0,W,H);const ps=d.map(o=>o.p),hi=Math.max(...ps),lo=Math.min(...ps),pad=(hi-lo)*.12||1,top=hi+pad,bot=lo-pad,cH=H-70,X=i=>i/(N-1)*W,Y=p=>(top-p)/(top-bot)*cH;
x.strokeStyle='#1a232d';x.lineWidth=1;x.fillStyle='#6b7a8c';x.font='11px system-ui';for(let k=0;k<5;k++){const y=k/4*cH;x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke();x.fillText((top-(top-bot)*k/4).toFixed(1),6,y-4)}
const up=d[d.length-1].p>=d[0].p,col=up?'34,197,94':'239,68,68',g=x.createLinearGradient(0,0,0,cH);g.addColorStop(0,'rgba('+col+',.30)');g.addColorStop(1,'rgba('+col+',0)');
x.beginPath();d.forEach((o,i)=>i?x.lineTo(X(i),Y(o.p)):x.moveTo(X(i),Y(o.p)));x.strokeStyle='rgb('+col+')';x.lineWidth=2;x.stroke();x.lineTo(W,cH);x.lineTo(0,cH);x.fillStyle=g;x.fill();
x.beginPath();d.forEach((o,i)=>{const y=Y(sma(i,20));i?x.lineTo(X(i),y):x.moveTo(X(i),y)});x.strokeStyle='#f59e0b';x.lineWidth=1.4;x.stroke();
const mv=Math.max(...d.map(o=>o.v));d.forEach((o,i)=>{x.fillStyle='rgba('+col+',.4)';const h=o.v/mv*48;x.fillRect(X(i)-1,H-h,2.4,h)});
if(mx!==null){const i=Math.max(0,Math.min(N-1,Math.round(mx/W*(N-1))));x.strokeStyle='#8592a3';x.setLineDash([4,4]);x.beginPath();x.moveTo(X(i),0);x.lineTo(X(i),H);x.stroke();x.setLineDash([]);x.fillStyle='#e8edf3';x.fillText(d[i].p.toFixed(2),Math.min(W-50,X(i)+8),Y(d[i].p)-8)}
const last=d[d.length-1].p,ch=(last/d[0].p-1)*100;q('px').textContent=last.toFixed(2);q('chg').textContent=(ch>=0?'+':'')+ch.toFixed(2)+'%';q('chg').className=ch>=0?'up':'dn';q('hl').textContent='High '+hi.toFixed(1)+' · Low '+lo.toFixed(1)}
cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=(e.clientX-r.left)/r.width*W});cv.addEventListener('pointerleave',()=>{mx=null});
q('pp').addEventListener('click',e=>{run=!run;e.target.textContent=run?'Pause':'Resume'});q('vol').addEventListener('change',e=>{vol=+e.target.value});
setInterval(tick,100);(function f(){draw();requestAnimationFrame(f)})();
})();
