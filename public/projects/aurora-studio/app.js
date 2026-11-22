(() => {
const cv=document.getElementById('c'),x=cv.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let W,H,P=[],mx=-1e3,my=-1e3,t=0,rep=false;
function size(){const d=Math.min(devicePixelRatio||1,2);W=cv.clientWidth;H=cv.clientHeight;cv.width=W*d;cv.height=H*d;x.setTransform(d,0,0,d,0,0);x.fillStyle='#05060f';x.fillRect(0,0,W,H);
P=Array.from({length:Math.min(2200,Math.round(W*H/800))},()=>({x:Math.random()*W,y:Math.random()*H}))}
addEventListener('resize',size);size();
cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top});
cv.addEventListener('pointerleave',()=>{mx=my=-1e3});cv.addEventListener('pointerdown',()=>{rep=!rep});
function draw(){t+=.004;x.fillStyle='rgba(5,6,15,.07)';x.fillRect(0,0,W,H);
for(const p of P){const a=Math.sin(p.x*.004+t)*2+Math.cos(p.y*.005-t*1.3)*2;let vx=Math.cos(a),vy=Math.sin(a);
const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy);if(d<150&&d>0){const f=(1-d/150)*(rep?3.2:-3.2);vx+=dx/d*f;vy+=dy/d*f}
const nx=p.x+vx*1.7,ny=p.y+vy*1.7;x.strokeStyle='hsla('+(170+a*28)+',90%,65%,.55)';x.beginPath();x.moveTo(p.x,p.y);x.lineTo(nx,ny);x.stroke();
p.x=nx;p.y=ny;if(nx<0||nx>W||ny<0||ny>H){p.x=Math.random()*W;p.y=Math.random()*H}}}
function frame(){draw();requestAnimationFrame(frame)}
if(reduce){for(let i=0;i<160;i++)draw()}else frame();
})();
