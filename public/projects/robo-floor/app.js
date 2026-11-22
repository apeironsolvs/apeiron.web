(() => {
const cv=document.getElementById('c'),x=cv.getContext('2d'),COLS=32,ROWS=18,S=cv.width/COLS,q=s=>document.getElementById(s);
const shelf=(c,r)=>c>=3&&c<=26&&r>=2&&r<=15&&(c%4===1||c%4===2)&&r%8!==0&&r!==9;
const free=(c,r)=>c>=0&&c<COLS&&r>=0&&r<ROWS&&!shelf(c,r);let bots=[],done=0,t0=Date.now(),log=[];
const pickCells=[],dock=[];for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){if(!free(c,r))continue;if(c===0)dock.push([c,r]);else if([[1,0],[-1,0]].some(([a,b])=>shelf(c+a,r+b)))pickCells.push([c,r])}
function bfs(a,b){const key=(c,r)=>r*COLS+c,prev=new Map([[key(...a),null]]),qu=[a];while(qu.length){const [c,r]=qu.shift();if(c===b[0]&&r===b[1])break;for(const[dc,dr]of[[1,0],[-1,0],[0,1],[0,-1]]){const nc=c+dc,nr=r+dr,k=key(nc,nr);if(free(nc,nr)&&!prev.has(k)){prev.set(k,[c,r]);qu.push([nc,nr])}}}
const out=[];let cur=b;while(cur&&prev.has(key(...cur))){out.push(cur);cur=prev.get(key(...cur))}return out.reverse().slice(1)}
const rnd=a=>a[Math.random()*a.length|0];
function bot(i){const p=rnd(dock);return{c:p[0],r:p[1],path:[],st:'pick',tgt:null,hue:260+i*7%80}}
function plan(b){b.tgt=b.st==='pick'?rnd(pickCells):rnd(dock);b.path=bfs([b.c,b.r],b.tgt)}
function setN(n){while(bots.length<n)bots.push(bot(bots.length));bots.length=n;q('nv').textContent=n}
function step(){for(const b of bots){if(!b.tgt)plan(b);const nx=b.path.shift();if(nx){b.c=nx[0];b.r=nx[1]}else{if(b.st==='pick'){b.st='drop'}else{b.st='pick';done++;log.push(Date.now())}b.tgt=null}}
log=log.filter(t=>Date.now()-t<60000);q('dl').textContent=done;q('tp').textContent=Math.round(log.length*60000/Math.min(60000,Math.max(5000,Date.now()-t0)))}
function draw(){x.fillStyle='#0d0a14';x.fillRect(0,0,cv.width,cv.height);
for(let c=0;c<COLS;c++)for(let r=0;r<ROWS;r++){if(shelf(c,r)){x.fillStyle='#2a2140';x.fillRect(c*S+2,r*S+2,S-4,S-4);x.fillStyle='#3b2f5c';x.fillRect(c*S+5,r*S+5,S-10,S-10)}else if(c===0){x.fillStyle='rgba(167,139,250,.14)';x.fillRect(c*S,r*S,S,S)}}
for(const b of bots){const px=b.c*S+S/2,py=b.r*S+S/2;if(b.tgt){x.strokeStyle='hsla('+b.hue+',80%,70%,.25)';x.lineWidth=1.5;x.beginPath();x.moveTo(px,py);b.path.forEach(p=>x.lineTo(p[0]*S+S/2,p[1]*S+S/2));x.stroke()}
x.fillStyle='hsl('+b.hue+',85%,65%)';x.beginPath();x.arc(px,py,S*.34,0,6.283);x.fill();if(b.st==='drop'){x.fillStyle='#fbbf24';x.fillRect(px-4,py-4,8,8)}}}
q('n').addEventListener('input',e=>setN(+e.target.value));q('rs').addEventListener('click',()=>{done=0;log=[];t0=Date.now();bots=[];setN(+q('n').value)});
setN(8);setInterval(step,130);(function f(){draw();requestAnimationFrame(f)})();
})();
