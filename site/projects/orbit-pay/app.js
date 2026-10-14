(() => {
const CARDS=[['Everyday','•••• 4821','linear-gradient(135deg,#3b82f6,#6d28d9)',48210],['Savings','•••• 1190','linear-gradient(135deg,#10b981,#0f766e)',182500],['Travel','•••• 7764','linear-gradient(135deg,#f59e0b,#be123c)',23440]];
const $=s=>document.querySelector(s),stack=$('#stack'),fmt=n=>'₹'+Math.round(n).toLocaleString('en-IN');let cur=0,shown=0;
const els=CARDS.map(c=>{const d=document.createElement('div');d.className='cc';d.style.background=c[2];const a=document.createElement('b'),b=document.createElement('small'),e=document.createElement('span');a.textContent=c[0];b.textContent=c[1];e.textContent='ORBIT PAY';d.append(a,e,b);stack.append(d);return d});
function layout(){els.forEach((e,i)=>{const o=(i-cur+3)%3;e.style.transform='translateY('+o*14+'px) scale('+(1-o*.05)+')';e.style.opacity=o>1?0:1-o*.35;e.style.zIndex=3-o})}
function tick(){shown+=(CARDS[cur][3]-shown)*.12;$('#bal').textContent=fmt(shown)}setInterval(tick,40);
let sx=null;stack.addEventListener('pointerdown',e=>{sx=e.clientX});addEventListener('pointerup',e=>{if(sx===null)return;const d=e.clientX-sx;sx=null;if(Math.abs(d)>40){cur=(cur+(d<0?1:2))%3;layout()}});layout();
const PEOPLE=['Maya','Dev','Kiran','Lena','Omar','Zoya'],WHAT=['Coffee','Rent share','Salary','Refund','Groceries','Cab ride','Invoice #'+(100+Math.floor(Math.random()*800))];
function pay(){const n=PEOPLE[Math.random()*6|0],w=WHAT[Math.random()*WHAT.length|0],inc=Math.random()<.45,amt=Math.round((inc?200+Math.random()*4800:40+Math.random()*900)/10)*10;
CARDS[cur][3]+=inc?amt:-amt;const li=document.createElement('li'),a=document.createElement('span'),b=document.createElement('b');a.textContent=(inc?'From ':'To ')+n+' · '+w;b.className=inc?'pos':'neg';b.textContent=(inc?'+':'−')+fmt(amt);li.append(a,b);const u=$('#tx');u.prepend(li);while(u.children.length>5)u.lastChild.remove()}
for(let i=0;i<4;i++)pay();setInterval(pay,2400);$('#send').addEventListener('click',pay);$('#req').addEventListener('click',pay);
})();
