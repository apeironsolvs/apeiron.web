(() => {
const $=s=>document.querySelector(s),tabs=[...document.querySelectorAll('.tabs button')];
tabs.forEach(b=>b.addEventListener('click',()=>{tabs.forEach(x=>x.setAttribute('aria-selected',x===b));
document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id==='s-'+b.dataset.s))}));
const days=[30,45,0,50,35,60,25];$('#bars').replaceChildren(...days.map(m=>{const i=document.createElement('i');i.style.height=Math.max(6,m*2.6)+'px';i.title=m+' min';return i}));
$('#tot').textContent=days.reduce((a,b)=>a+b,0);
let sec=0,tm=null;const arc=$('#arc'),go=$('#go');
const draw=()=>{$('#t').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');arc.style.strokeDashoffset=327-327*Math.min(1,sec/(45*60/30))};
go.addEventListener('click',()=>{if(tm){clearInterval(tm);tm=null;go.textContent='Resume workout';$('#msg').textContent='Paused';}
else{tm=setInterval(()=>{sec++;draw()},1000/ (1));go.textContent='Pause';$('#msg').textContent='Keep going. You are doing great.'}});
draw();
})();
