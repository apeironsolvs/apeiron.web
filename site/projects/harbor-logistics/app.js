(() => {
const SH=[['HB-1042','Kochi → Dubai','t',3],['HB-1043','Chennai → Singapore','d',4],['HB-1044','Mumbai → Rotterdam','t',2],['HB-1045','Kochi → Colombo','h',1],['HB-1046','Delhi → Hamburg','p',0],['HB-1047','Bengaluru → Sydney','t',3],['HB-1048','Kochi → Doha','d',4]];
const LBL={t:'In transit',d:'Delivered',h:'On hold',p:'Pending pickup'},STEPS=['Pickup scheduled','Collected from sender','Departed origin hub','Arrived at destination hub','Delivered'];
const tb=document.getElementById('tb'),q=document.getElementById('q');
function pick(s,tr){document.querySelectorAll('#tb tr').forEach(r=>r.classList.toggle('on',r===tr));document.getElementById('dt').textContent=s[0];document.getElementById('ds').textContent=s[1]+' · '+LBL[s[2]];
const pc=Math.round(s[3]/4*100);document.getElementById('eta').hidden=false;document.getElementById('bar').style.width=pc+'%';document.getElementById('pc').textContent=s[2]==='d'?'Delivered':s[2]==='h'?'On hold':pc+'%';
const tl=document.getElementById('tl');tl.replaceChildren();STEPS.forEach((t,i)=>{const li=document.createElement('li'),sm=document.createElement('small');li.textContent=t;if(i<=s[3])li.className='on';sm.textContent=i<=s[3]?'Day '+(i+1)+' · completed':'Expected';li.append(sm);tl.append(li)})}
function list(){const v=q.value.trim().toLowerCase();tb.replaceChildren();SH.filter(s=>(s[0]+s[1]).toLowerCase().includes(v)).forEach(s=>{const tr=document.createElement('tr'),a=document.createElement('td'),b=document.createElement('td'),c=document.createElement('td'),p=document.createElement('span');
a.textContent=s[0];b.textContent=s[1];p.className='b '+s[2];p.textContent=LBL[s[2]];c.append(p);tr.tabIndex=0;tr.append(a,b,c);tr.addEventListener('click',()=>pick(s,tr));tr.addEventListener('keydown',e=>{if(e.key==='Enter')pick(s,tr)});tb.append(tr)})}
q.addEventListener('input',list);list();
})();
