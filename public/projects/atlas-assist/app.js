(() => {
const KB=[
[/return|refund|exchange/i,'You can return any item within 30 days of delivery. Start a return from your Orders page and print the prepaid label. Refunds reach your card in 3 to 5 working days.','Returns policy'],
[/ship|deliver|arrive|track/i,'Standard shipping takes 3 to 5 working days; express takes 1 to 2. You get a tracking link by email as soon as your parcel leaves the warehouse.','Shipping guide'],
[/password|login|sign in|account/i,'Choose “Forgot password” on the sign-in page and we will email a reset link that works for 30 minutes. If it does not arrive, check spam or contact us.','Account help'],
[/open|hour|time|when/i,'Our support team is online Monday to Saturday, 9:00 to 18:00 IST. Outside those hours Atlas can still answer common questions.','Opening hours']];
const log=document.getElementById('log'),q=document.getElementById('q');
const add=(cls,text,src)=>{const d=document.createElement('div');d.className='msg '+cls;d.textContent=text;if(src){const s=document.createElement('span');s.className='src';s.textContent='Source: '+src;d.append(document.createElement('br'),s)}log.append(d);log.scrollTop=log.scrollHeight;return d};
function ask(t){t=t.trim();if(!t)return;add('me',t);const w=add('bot dots','Atlas is typing…');
setTimeout(()=>{w.remove();const k=KB.find(r=>r[0].test(t));k?add('bot',k[1],k[2]):add('bot','I am not sure about that one. I have passed it to a human teammate, who will reply by email within one working day.')},700)}
document.getElementById('f').addEventListener('submit',e=>{e.preventDefault();ask(q.value);q.value=''});
document.querySelectorAll('#sugg button').forEach(b=>b.addEventListener('click',()=>ask(b.textContent)));
})();
