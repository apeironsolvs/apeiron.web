(() => {
const chips=[...document.querySelectorAll('.chip')];
chips.forEach(c=>c.addEventListener('click',()=>{chips.forEach(x=>x.classList.toggle('on',x===c));
document.querySelectorAll('.tile').forEach(t=>{t.hidden=c.dataset.f!=='all'&&t.dataset.c!==c.dataset.f})}));
document.getElementById('f').addEventListener('submit',e=>{e.preventDefault();document.getElementById('ok').textContent='Thanks! (Demo only: nothing was sent.)';e.target.reset()});
})();
