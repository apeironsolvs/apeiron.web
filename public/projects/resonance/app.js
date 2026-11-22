(() => {
const ROWS=[['Kick'],['Bass'],['Lead'],['Hat']],PAT=[[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,1],[1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0],[0,0,1,0,0,1,0,1,0,0,1,0,1,0,0,0],[0,0,1,0,0,0,1,0,0,0,1,0,0,0,1,1]];
const $=s=>document.getElementById(s),cells=[];let ac,an,master,playing=false,step=0,nextT=0,timer=null,pat=PAT.map(r=>r.slice());
ROWS.forEach((r,ri)=>{const l=document.createElement('div');l.className='lbl';l.textContent=r[0];$('grid').append(l);cells[ri]=[];for(let i=0;i<16;i++){const b=document.createElement('button');b.type='button';b.className='st';b.setAttribute('aria-label',r[0]+' step '+(i+1));
b.setAttribute('aria-pressed',!!pat[ri][i]);b.addEventListener('click',()=>{pat[ri][i]^=1;b.setAttribute('aria-pressed',!!pat[ri][i])});$('grid').append(b);cells[ri][i]=b}});
function sync(){pat.forEach((r,ri)=>r.forEach((v,i)=>cells[ri][i].setAttribute('aria-pressed',!!v)))}
function env(g,t,a,d){g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(a,t+.005);g.gain.exponentialRampToValueAtTime(.0001,t+d)}
function voice(row,t){const o=ac.createOscillator(),g=ac.createGain();o.connect(g);g.connect(master);
if(row===0){o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(40,t+.18);env(g,t,.9,.3)}
else if(row===1){o.type='sawtooth';o.frequency.value=[55,55,65.4,49][step>>2&3];const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=380;o.disconnect();o.connect(f);f.connect(g);env(g,t,.5,.22)}
else if(row===2){o.type='triangle';o.frequency.value=[523.25,587.33,659.25,783.99,880][(step*3)%5];env(g,t,.22,.28)}
else{const n=ac.createBufferSource(),b=ac.createBuffer(1,ac.sampleRate*.05,ac.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;n.buffer=b;const f=ac.createBiquadFilter();f.type='highpass';f.frequency.value=7000;n.connect(f);f.connect(g);env(g,t,.25,.05);n.start(t);return}
o.start(t);o.stop(t+.4)}
function sched(){while(nextT<ac.currentTime+.12){const s=step;pat.forEach((r,ri)=>{if(r[s])voice(ri,nextT)});const t=nextT;setTimeout(()=>{cells.forEach(r=>r.forEach(c=>c.classList.remove('now')));cells.forEach(r=>r[s].classList.add('now'))},Math.max(0,(t-ac.currentTime)*1000));
nextT+=60/ +$('bpm').value/4;step=(step+1)%16}}
$('play').addEventListener('click',()=>{if(!ac){ac=new (window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.35;an=ac.createAnalyser();an.fftSize=1024;master.connect(an);an.connect(ac.destination)}
if(!playing){ac.resume();playing=true;step=0;nextT=ac.currentTime+.05;timer=setInterval(sched,25);$('play').textContent='■ Stop'}
else{playing=false;clearInterval(timer);$('play').textContent='▶ Play';cells.forEach(r=>r.forEach(c=>c.classList.remove('now')))}});
$('bpm').addEventListener('input',e=>{$('bv').textContent=e.target.value});$('clr').addEventListener('click',()=>{pat=pat.map(r=>r.map(()=>0));sync()});
$('rand').addEventListener('click',()=>{pat=pat.map((r,ri)=>r.map((_,i)=>Math.random()<[.28,.3,.3,.4][ri]?1:0));pat[0][0]=1;sync()});
const sc=$('scope'),g=sc.getContext('2d'),buf=new Uint8Array(1024);
(function f(){g.fillStyle='#0b0b13';g.fillRect(0,0,sc.width,sc.height);g.strokeStyle='rgba(244,114,182,.9)';g.lineWidth=2;g.beginPath();
if(an){an.getByteTimeDomainData(buf);for(let i=0;i<buf.length;i++){const X=i/buf.length*sc.width,Y=buf[i]/255*sc.height;i?g.lineTo(X,Y):g.moveTo(X,Y)}}else{g.moveTo(0,sc.height/2);g.lineTo(sc.width,sc.height/2)}
g.stroke();requestAnimationFrame(f)})();
})();
