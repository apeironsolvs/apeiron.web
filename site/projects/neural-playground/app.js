(() => {
const $=s=>document.querySelector(s),cv=$('#c'),g=cv.getContext('2d'),G=44,C=cv.width/G;
let H=12,lr=.1,W1,b1,W2,b2,pts=[],run=true,steps=0,kind='spiral';
const feat=(x,y)=>[x,y,Math.sin(5*x),Math.sin(5*y)],R=()=>(Math.random()-.5)*1.4;
function data(k){pts=[];const n=90;for(let i=0;i<n;i++){const r=i/n,j=Math.random()*.05;
if(k==='spiral'){const t=r*3.6*Math.PI;for(const c of[0,1]){const a=t+c*Math.PI;pts.push({x:r*Math.cos(a)+j,y:r*Math.sin(a)+j,l:c})}}
else if(k==='circles'){const a=Math.random()*6.283;pts.push({x:.35*Math.cos(a)+j,y:.35*Math.sin(a)+j,l:0},{x:.85*Math.cos(a)+j,y:.85*Math.sin(a)+j,l:1})}
else{const x=Math.random()*1.8-.9,y=Math.random()*1.8-.9;pts.push({x,y,l:x*y>0?1:0})}}}
function init(){W1=Array.from({length:H},()=>[R(),R(),R(),R()]);b1=Array(H).fill(0);W2=Array.from({length:H},R);b2=0;steps=0}
function fwd(x,y){const f=feat(x,y),h=W1.map((w,i)=>Math.tanh(w[0]*f[0]+w[1]*f[1]+w[2]*f[2]+w[3]*f[3]+b1[i]));let z=b2;for(let i=0;i<H;i++)z+=h[i]*W2[i];return{f,h,p:1/(1+Math.exp(-z))}}
function train(n){for(let s=0;s<n;s++){const q=pts[Math.random()*pts.length|0],o=fwd(q.x,q.y),e=o.p-q.l;
for(let i=0;i<H;i++){const gh=e*W2[i]*(1-o.h[i]*o.h[i]);W2[i]-=lr*e*o.h[i];for(let k=0;k<4;k++)W1[i][k]-=lr*gh*o.f[k];b1[i]-=lr*gh}b2-=lr*e;steps++}}
function render(){for(let i=0;i<G;i++)for(let j=0;j<G;j++){const p=fwd((i+.5)/G*2-1,1-(j+.5)/G*2).p;g.fillStyle='rgb('+Math.round(30+p*215)+','+Math.round(90+p*20-p*p*10)+','+Math.round(235-p*190)+')';g.globalAlpha=.78;g.fillRect(i*C,j*C,C+1,C+1)}
g.globalAlpha=1;let L=0,ok=0;for(const q of pts){const p=fwd(q.x,q.y).p;L+=-Math.log(Math.max(1e-6,q.l?p:1-p));ok+=(p>.5)===!!q.l;g.beginPath();g.arc((q.x+1)/2*cv.width,(1-q.y)/2*cv.height,4,0,6.283);g.fillStyle=q.l?'#fb923c':'#60a5fa';g.fill();g.strokeStyle='#0a0d14';g.lineWidth=1.5;g.stroke()}
$('#loss').textContent=(L/pts.length).toFixed(3);$('#acc').textContent=Math.round(ok/pts.length*100)+'%';$('#ep').textContent=steps.toLocaleString()}
function loop(){if(run)train(250);render();requestAnimationFrame(loop)}
$('#h').addEventListener('input',e=>{H=+e.target.value;$('#hv').textContent=H;init()});$('#lr').addEventListener('input',e=>{lr=+e.target.value;$('#lv').textContent=lr});
$('#pp').addEventListener('click',e=>{run=!run;e.target.textContent=run?'Pause':'Resume'});$('#rs').addEventListener('click',init);
document.querySelectorAll('#ds button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#ds button').forEach(x=>x.classList.toggle('on',x===b));kind=b.dataset.d;data(kind);init()}));
data(kind);init();loop();
})();
