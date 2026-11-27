/* Eclise 21
   © 2026 Elmo El Malcriado · Todos los derechos reservados */
const $=id=>document.getElementById(id), sleep=ms=>new Promise(r=>setTimeout(r,ms));
const DEN=[[1000,'#b8903a'],[500,'#2f3170'],[100,'#222428'],[25,'#2b7d4f'],[5,'#b83530']];
const ses={m:0,w:0,l:0,e:0};
const col=v=>(DEN.find(d=>d[0]==v)||[0,'#c4262e'])[1];
const H=t=>{let a=0xdeadbeef,b=0x41c6ce57;for(let i=0;i<t.length;i++){const c=t.charCodeAt(i);a=Math.imul(a^c,2654435761);b=Math.imul(b^c,1597334677)}a=Math.imul(a^(a>>>16),2246822507)^Math.imul(b^(b>>>13),3266489909);b=Math.imul(b^(b>>>16),2246822507)^Math.imul(a^(a>>>13),3266489909);return(4294967296*(2097151&b)+(a>>>0)).toString(36)};
const code=id=>H(id).toUpperCase().slice(-6);let MYID='';
let S={chips:1000,games:0,wins:0,best:1000,claimed:0},ref=null,DB=null,USER=null,isAdmin=false,started=false,uname='Invitado',bet=0,last=0,phase='bet',busy=false,shoe=[],P=[],D=[],dbl=false,shown=1000;

/* ---------- Supabase: cuenta de Google y fichas ---------- */
const save=()=>{};
let sb=null,UID=null,lastCred=0,W=[],timer=null;
async function connect(){
  if(SB_URL.startsWith('PEGA')||!window.supabase){$('lt').textContent='Falta pegar los datos de Supabase en el archivo. Mientras tanto puedes jugar como invitado.';return}
  try{
    sb=supabase.createClient(SB_URL,SB_KEY);
    const {data:{session}}=await sb.auth.getSession();
    if(!session){$('lt').textContent='Entra con tu cuenta de Google para guardar tus fichas.';
      const e=$('enter');e.textContent='Entrar con Google';e.classList.remove('hide');
      e.onclick=()=>sb.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});return}
    await load(session.user);
  }catch(e){$('lt').textContent='No se pudo conectar. Puedes jugar como invitado.'}
}
async function load(user){
  let p=null;
  for(let i=0;i<4&&!p;i++){const r=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();p=r.data;if(!p)await sleep(700)}
  if(!p)throw 0;
  UID=user.id;ref=true;uname=p.name||user.email;MYID=p.code;lastCred=+p.credited;
  S={chips:+p.chips,games:p.games,wins:p.wins,best:+p.best};
  sb.channel('me-'+UID).on('postgres_changes',{event:'UPDATE',schema:'public',table:'profiles',filter:'id=eq.'+UID},pl=>{
    const c=+pl.new.credited,d=c-lastCred;if(!d)return;lastCred=c;
    S.chips=Math.max(0,S.chips+d);S.best=Math.max(S.best,S.chips);
    if(started){if(d>0)for(let i=0;i<8;i++)fly($('who'),$('bal'),500,i*90);ui()}}).subscribe();
  const a=await sb.rpc('is_admin');isAdmin=!!a.data;
  $('lt').textContent='Hola, '+uname+'. Tus fichas se guardan en tu cuenta.'+(isAdmin?' Eres administrador.':'');
  const e=$('enter');e.textContent='Entrar a la mesa';e.classList.remove('hide');
  e.onclick=()=>{$('login').classList.add('hide');start()};
  $('who').style.cursor='pointer';$('who').title='Cerrar sesión';
  $('who').onclick=async()=>{if(sb&&UID&&confirm('¿Cerrar sesión?')){await sb.auth.signOut();location.reload()}};
}
async function sync(d,g,w){if(!sb||!UID)return;try{const r=await sb.rpc('adjust_chips',{p_delta:Math.round(d),p_game:g,p_win:w});if(r.error)console.error(r.error)}catch(e){}}
function ui(){
  $('myid').textContent=MYID?'ID: '+MYID:'';$('who').textContent=ref?'👤 '+uname:'Invitado (sin guardar)';
  $('s1').textContent=ses.m;$('s2').textContent=ses.w;$('s3').textContent=ses.l;$('s4').textContent=ses.e;
  const a=shown,b=S.chips,t0=performance.now();
  (function st(t){const k=Math.min(1,(t-t0)/600);shown=Math.round(a+(b-a)*k);$('balv').textContent=shown.toLocaleString('es');if(k<1)requestAnimationFrame(st)})(t0);
  tray();
}
$('enter').onclick=()=>{$('login').classList.add('hide');start()};
$('guest').onclick=()=>{ref=null;uname='Invitado';$('login').classList.add('hide');start()};

/* ---------- panel de administrador ---------- */
function openAdm(){if(!isAdmin)return;$('am').classList.remove('hide');loadAdm();clearInterval(timer);timer=setInterval(loadAdm,4000)}
$('adm2').onclick=openAdm;
$('ac').onclick=()=>{$('am').classList.add('hide');clearInterval(timer)};
$('aq').oninput=drawAdm;
async function loadAdm(){const r=await sb.from('profiles').select('id,name,email,code,chips').order('created_at',{ascending:false});W=r.data||[];drawAdm()}
async function adminGive(id,n){if(!n||isNaN(n))return;const r=await sb.rpc('admin_add_chips',{p_id:id,p_amount:n});if(r.error)alert(r.error.message);loadAdm()}
function drawAdm(){
  const a=document.activeElement;if(a&&a.tagName==='INPUT'&&a.closest('#al'))return;
  const L=$('al'),q=$('aq').value.trim().toLowerCase();L.innerHTML='';
  const F=W.filter(w=>!q||(w.code||'').toLowerCase().includes(q)||(w.name||'').toLowerCase().includes(q)||(w.email||'').toLowerCase().includes(q));
  if(!F.length){L.textContent='No hay jugadores.';return}
  F.forEach(w=>{
    const r=document.createElement('div');r.className='row';
    const n=document.createElement('span');n.className='n';n.textContent=(w.name||'Jugador')+' · ID '+w.code+' · '+(w.email||'');
    const c=document.createElement('span');c.className='c';c.textContent=(+w.chips).toLocaleString('es');r.append(n,c);
    [[1000,'+1K'],[10000,'+10K'],[-1000,'−1K']].forEach(([v,t])=>{const b=document.createElement('button');b.className='btn sm'+(v<0?' red':'');b.textContent=t;b.onclick=()=>adminGive(w.id,v);r.appendChild(b)});
    const i=document.createElement('input');i.type='number';i.placeholder='otra cantidad';
    const g=document.createElement('button');g.className='btn sm go';g.textContent='Dar';g.onclick=()=>{adminGive(w.id,parseInt(i.value));i.value=''};
    r.append(i,g);L.appendChild(r)});
}

/* ---------- fichas animadas ---------- */
function mk(v,cls){const c=document.createElement('div');c.className='chip '+cls;c.style.setProperty('--c',col(v));c.textContent=v>=1000?'1K':v;return c}
function tray(){
  const t=$('tray');t.innerHTML='';
  DEN.slice().reverse().forEach(([v])=>{const c=mk(v,'');if(phase!=='bet'||busy||v>S.chips-bet)c.classList.add('off');c.onclick=()=>addBet(v,c);t.appendChild(c)});
}
function fly(from,to,v,delay=0){
  const a=from.getBoundingClientRect(),b=to.getBoundingClientRect(),c=mk(v,'fly');document.body.appendChild(c);
  const ax=a.left+a.width/2-22,ay=a.top+a.height/2-22,bx=b.left+b.width/2-22,by=b.top+b.height/2-22;
  const an=c.animate([{transform:`translate(${ax}px,${ay}px) scale(1.3) rotate(0)`,opacity:0},{opacity:1,offset:.15},
    {transform:`translate(${(ax+bx)/2}px,${Math.min(ay,by)-60}px) scale(1.5) rotate(180deg)`,offset:.5},
    {transform:`translate(${bx}px,${by}px) scale(1) rotate(360deg)`,opacity:1}],{duration:650,delay,easing:'ease-in-out',fill:'both'});
  an.addEventListener('finish',()=>c.remove());return an;
}
function renderBet(){
  const s=$('stack');s.innerHTML='';let r=bet,i=0;
  DEN.forEach(([v])=>{let n=Math.floor(r/v);r-=n*v;n=Math.min(n,8);while(n--){const c=mk(v,'stk');c.style.bottom=(i*5)+'px';c.style.left=((i%2)*3)+'px';s.appendChild(c);i++}});
  $('betn').textContent='Apuesta: '+bet.toLocaleString('es');
  ctl();
}
function addBet(v,el){
  if(busy||phase!=='bet'||bet+v>S.chips)return;
  bet+=v;const a=fly(el,$('stack'),v);busy=true;
  a.onfinish=()=>{busy=false;renderBet();tray()};
}

/* ---------- baraja ---------- */
function newShoe(){shoe=[];for(let d=0;d<6;d++)for(const s of '♠♥♦♣')for(const r of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])shoe.push({r,s});
  for(let i=shoe.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shoe[i],shoe[j]]=[shoe[j],shoe[i]]}}
const val=h=>{let t=0,a=0;h.forEach(c=>{if(c.r==='A'){t+=11;a++}else t+=('JQK'.includes(c.r)||c.r==='10')?10:+c.r});while(t>21&&a--)t-=10;return t};
function el(c,down){const d=document.createElement('div');d.className='card'+(down?' down':'');
  d.innerHTML=`<div class="in"><div class="face ${'♥♦'.includes(c.s)?'r':''}"><span>${c.r}${c.s}</span><b>${c.s}</b></div><div class="back"></div></div>`;return d}
async function give(h,list,box,down){if(shoe.length<52)newShoe();const c=shoe.pop();list.push(c);const e=el(c,down);box.appendChild(e);sc();await sleep(420);return e}
function sc(hideD){$('pv').textContent=P.length?'· '+val(P):'';$('dv').textContent=D.length?(phase==='play'?'':'· '+val(D)):''}

/* ---------- juego ---------- */
function ctl(){
  const c=$('ctl');c.innerHTML='';
  const B=(t,f,cls='',dis=false)=>{const b=document.createElement('button');b.className='btn '+cls;b.textContent=t;b.disabled=dis||busy;b.onclick=f;if(t==='Repartir'||t==='Nueva mano'){const k=document.createElement('kbd');k.textContent='Enter';b.append(' ',k)}c.appendChild(b)};
  if(phase==='bet'){B('Repartir',deal,'go',!bet);B('Borrar',()=>{bet=0;renderBet();tray()},'alt',!bet);B('Repetir '+(last||''),()=>{if(last&&last<=S.chips){bet=last;renderBet();tray()}},'alt',!last||last>S.chips)}
  else if(phase==='play'){B('Pedir',hit);B('Plantarse',stand,'red');B('Doblar',double,'alt',!(P.length===2&&S.chips>=bet))}
  else if(phase==='over'){B('Nueva mano',reset,'go')}
}
function reset(){document.querySelectorAll('.fly').forEach(e=>e.remove());phase='bet';bet=0;P=[];D=[];$('ph').innerHTML='';$('dh').innerHTML='';$('msg').textContent='Haz tu apuesta';$('msg').className='';$('sub').textContent='Toca las fichas para apostar';sc();renderBet();tray();
  if(S.chips<5){$('msg').textContent='Sin fichas: pide una recarga al administrador'}}
function start(){started=true;if(UID)$('onl').classList.remove('hide');if(isAdmin)$('adm2').classList.remove('hide');S.code=MYID;save();S.chips=Math.max(0,S.chips);shown=S.chips;newShoe();ui();reset()}
async function deal(){
  if(!bet||busy)return;busy=true;last=bet;S.chips-=bet;S.games++;ses.m++;sync(-bet,1,0);ui();phase='play';dbl=false;
  P=[];D=[];$('ph').innerHTML='';$('dh').innerHTML='';$('msg').textContent='';$('sub').textContent='';ctl();
  await give(P,P,$('ph'));await give(D,D,$('dh'));await give(P,P,$('ph'));const hole=await give(D,D,$('dh'),true);
  busy=false;
  const pb=val(P)===21,db=val(D)===21;
  if(pb||db){await reveal(hole);return finish(pb&&db?'push':pb?'bj':'lose')}
  ctl();
}
async function reveal(h){h.classList.remove('down');phase='dealer';sc();await sleep(600)}
async function hit(){if(busy)return;busy=true;ctl();await give(P,P,$('ph'));busy=false;const v=val(P);
  if(v>21){await reveal($('dh').children[1]);return finish('lose',true)}if(v===21)return stand();ctl()}
async function double(){if(busy||S.chips<bet)return;busy=true;const b0=bet;S.chips-=bet;sync(-bet,0,0);bet*=2;dbl=true;ui();
  fly($('bal'),$('stack'),100).onfinish=renderBet;ctl();await sleep(600);await give(P,P,$('ph'));busy=false;
  if(val(P)>21){await reveal($('dh').children[1]);return finish('lose',true)}stand()}
async function stand(){if(busy)return;busy=true;ctl();await reveal($('dh').children[1]);
  while(val(D)<17)await give(D,D,$('dh'));busy=false;
  const p=val(P),d=val(D);finish(d>21||p>d?'win':p===d?'push':'lose')}
async function finish(res,bust){
  phase='over';busy=true;sc();
  const m=$('msg'),b=bet,spot=$('stack');
  const T={bj:['¡BLACKJACK! Pagas 3 a 2','win'],win:['¡Ganaste!','win'],push:['Empate: recuperas tu apuesta',''],lose:[bust?'Te pasaste de 21':'Gana el crupier','lose']}[res];
  m.textContent=T[0];m.className=T[1];if(res==='lose')ses.l++;else if(res==='push')ses.e++;else ses.w++;
  const n=Math.min(6,Math.max(2,Math.round(b/100)+1));
  if(res==='lose'){for(let i=0;i<n;i++)fly(spot,$('dealer'),25,i*80)}
  else{const back=res==='push'?b:res==='bj'?b*2.5:b*2;
    if(res!=='push')for(let i=0;i<n;i++)fly($('dealer'),spot,100,i*80);
    await sleep(res==='push'?0:n*80+500);
    for(let i=0;i<n;i++)fly(spot,$('bal'),100,i*80);
    S.chips+=Math.round(back);sync(back,0,res!=='push'?1:0);if(res!=='push')S.wins++;S.best=Math.max(S.best,S.chips)}
  await sleep(700);document.querySelectorAll('.fly').forEach(e=>e.remove());bet=0;$('stack').innerHTML='';$('betn').textContent='Apuesta: 0';busy=false;ui();ctl();save();
}
$('rst').onclick=()=>{if(!confirm('¿Reiniciar las estadísticas'+(ref?'':' y tus fichas')+'?'))return;ses.m=ses.w=ses.l=ses.e=0;if(!ref)S.chips=1000;if(!busy&&phase!=='play')reset();ui()};
document.addEventListener('keydown',e=>{if(e.key!=='Enter'||['INPUT','BUTTON'].includes(e.target.tagName)||document.querySelector('.modal:not(.hide)'))return;
  if(phase==='bet'&&bet&&!busy)deal();else if(phase==='over'&&!busy)reset()});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('am').classList.contains('hide'))$('ac').click();
  if(e.key.toLowerCase()==='a'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!['INPUT','TEXTAREA'].includes(e.target.tagName)&&!document.querySelector('.modal:not(.hide)'))openAdm()});
connect();
