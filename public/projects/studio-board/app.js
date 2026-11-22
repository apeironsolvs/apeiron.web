(() => {
const c=document.getElementById('c'),x=c.getContext('2d'),bd=document.getElementById('bd');let W,H,strokes=[];
const USERS=[{n:'You',c:'#34d399'},{n:'Maya',c:'#60a5fa',a:[.9,1.3,.42,.31],p:0},{n:'Dev',c:'#f472b6',a:[1.2,.8,.36,.4],p:2},{n:'Kiran',c:'#fbbf24',a:[.7,1.1,.3,.45],p:4}];
function size(){const d=Math.min(devicePixelRatio||1,2);W=bd.clientWidth;H=bd.clientHeight;c.width=W*d;c.height=H*d;x.setTransform(d,0,0,d,0,0);redraw()}
function seg(s,i){x.strokeStyle=s.c;x.lineWidth=3;x.lineCap='round';x.beginPath();x.moveTo(s.p[i-1][0],s.p[i-1][1]);x.lineTo(s.p[i][0],s.p[i][1]);x.stroke()}
function redraw(){x.clearRect(0,0,W,H);strokes.forEach(s=>{for(let i=1;i<s.p.length;i++)seg(s,i)});document.getElementById('cnt').textContent=strokes.length+' strokes'}
const pres=document.getElementById('pres');USERS.forEach(u=>{const s=document.createElement('span'),i=document.createElement('i');i.style.background=u.c;s.append(i,u.n);pres.append(s);
if(u.a){const e=document.createElement('div');e.className='cur';e.style.background=u.c;e.textContent=u.n;bd.append(e);u.el=e;u.cur=null}});
let mine=null;c.addEventListener('pointerdown',e=>{c.setPointerCapture(e.pointerId);const r=c.getBoundingClientRect();mine={c:USERS[0].c,o:'me',p:[[e.clientX-r.left,e.clientY-r.top]]};strokes.push(mine)});
c.addEventListener('pointermove',e=>{if(!mine)return;const r=c.getBoundingClientRect();mine.p.push([e.clientX-r.left,e.clientY-r.top]);seg(mine,mine.p.length-1)});
const up=()=>{mine=null;redraw()};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
document.getElementById('undo').addEventListener('click',()=>{for(let i=strokes.length-1;i>=0;i--)if(strokes[i].o==='me'){strokes.splice(i,1);break}redraw()});
document.getElementById('clear').addEventListener('click',()=>{strokes=[];USERS.forEach(u=>u.cur=null);redraw()});
let t=0;function bots(){t+=.016;USERS.slice(1).forEach(u=>{const px=W/2+Math.sin(t*u.a[0]+u.p)*W*.38,py=H/2+Math.cos(t*u.a[1]+u.p*1.7)*H*.36;u.el.style.transform='translate('+px+'px,'+py+'px)';
const down=Math.sin(t*u.a[2]*3+u.p)>-.2;if(down){if(!u.cur){u.cur={c:u.c,o:u.n,p:[[px,py]]};strokes.push(u.cur)}else{u.cur.p.push([px,py]);seg(u.cur,u.cur.p.length-1)}}else if(u.cur){u.cur=null;redraw()}});
if(strokes.length>120){strokes.splice(0,20);redraw()}requestAnimationFrame(bots)}
addEventListener('resize',size);size();bots();
})();
