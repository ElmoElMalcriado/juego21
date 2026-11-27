/* Eclise 21 · modo en línea
   © 2026 Elmo El Malcriado · Todos los derechos reservados
   El anfitrión (quien crea la mesa) reparte y lleva el juego; los demás envían sus jugadas por Supabase Realtime. */
let CH=null,IS_HOST=false,G=null,ST=null,HB=false,RD=-1,seen={},lastPaid=null,shoeH=[],hostSeen=false;
const _ui=ui;ui=function(){_ui();obal()};
const oPub=(event,payload)=>CH&&CH.send({type:'broadcast',event,payload});
const oAct=(t,x={})=>oPub('act',{t,u:UID,...x});
const rcode=()=>Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
function obal(){const e=$('obal');if(!e)return;const p=ST&&ST.P[UID];const c=p&&ST.phase!=='over'?p.bet:0;e.textContent=Math.max(0,S.chips-c).toLocaleString('es')}

/* ---------- lobby ---------- */
$('onl').onclick=()=>{$('on').classList.remove('hide');$('olobby').classList.remove('hide');$('otable').classList.add('hide');$('oerr').textContent='';obal()};
$('oexit').onclick=()=>oLeave(false);
$('ocreate').onclick=()=>oJoin(rcode(),true);
$('ojoinb').onclick=()=>{const c=$('ojoin').value.trim().toUpperCase();if(c.length<4){$('oerr').textContent='Escribe el código de la mesa';return}oJoin(c,false)};
async function oJoin(code,host){
  if(!sb||!UID){$('oerr').textContent='Inicia sesión con Google primero';return}
  if(CH)await oLeave(true);
  IS_HOST=host;hostSeen=false;ST=null;seen={};RD=-1;lastPaid=null;HB=false;
  if(host){G={id:0,rd:0,phase:'bet',hide:false,dealer:[],P:{},order:[],turn:null,msg:'Hagan sus apuestas'};newShoeH()}
  $('ocode').textContent='Mesa '+code;$('oerr').textContent='Conectando…';
  CH=sb.channel('mesa-'+code,{config:{broadcast:{self:true},presence:{key:UID}}});
  CH.on('broadcast',{event:'state'},m=>{ST=m.payload;onState()})
    .on('broadcast',{event:'act'},m=>{if(IS_HOST)hostAct(m.payload)})
    .on('presence',{event:'sync'},onPresence)
    .subscribe(async s=>{if(s==='SUBSCRIBED'){await CH.track({name:uname,host});
      if(!host)setTimeout(()=>{if(CH&&!hostSeen)oLeave(false,'No se encontró esa mesa. Revisa el código.')},3500)}});
}
async function oLeave(keep,msg){
  const c=CH;CH=null;ST=null;G=null;IS_HOST=false;
  if(c){try{await c.untrack();await sb.removeChannel(c)}catch(e){}}
  if(keep)return;
  $('olobby').classList.remove('hide');$('otable').classList.add('hide');$('oerr').textContent=msg||'';
  if(!msg)$('on').classList.add('hide');
}
function onPresence(){
  if(!CH)return;
  const has=Object.values(CH.presenceState()).some(a=>a.some(m=>m.host));
  if(has)hostSeen=true;else if(hostSeen&&!IS_HOST){oLeave(false,'El anfitrión cerró la mesa.');return}
  if(IS_HOST)hostPresence();
}

/* ---------- lógica del anfitrión ---------- */
function newShoeH(){shoeH=[];for(let d=0;d<6;d++)for(const s of '♠♥♦♣')for(const r of ['A','2','3','4','5','6','7','8','9','10','J','Q','K'])shoeH.push({r,s});
  for(let i=shoeH.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[shoeH[i],shoeH[j]]=[shoeH[j],shoeH[i]]}}
const draw=()=>{if(shoeH.length<30)newShoeH();return shoeH.pop()};
function bcast(){const g=JSON.parse(JSON.stringify(G));if(G.hide&&g.dealer.length>1)g.dealer[1]=null;oPub('state',g)}
function hostPresence(){
  if(!G||!CH)return;const keys=Object.keys(CH.presenceState());
  keys.forEach(u=>{if(!G.P[u]&&Object.keys(G.P).length<4){const m=CH.presenceState()[u][0]||{};
    G.P[u]={name:m.name||'Jugador',bet:0,hand:[],st:G.phase==='bet'?'wait':'out',res:'',pay:0}}});
  Object.keys(G.P).forEach(u=>{if(keys.includes(u))return;
    if(G.phase==='play'){const p=G.P[u];if(p.st==='play')p.st='stand';if(G.turn===u&&!HB)nextTurn()}else delete G.P[u]});
  bcast();
}
function newRound(){
  const keys=Object.keys(CH.presenceState());Object.keys(G.P).forEach(u=>{if(!keys.includes(u))delete G.P[u]});
  Object.values(G.P).forEach(p=>{p.hand=[];p.bet=0;p.st='wait';p.res='';p.pay=0});
  G.phase='bet';G.hide=false;G.dealer=[];G.order=[];G.turn=null;G.msg='Hagan sus apuestas';bcast();
}
async function dealRound(){
  G.rd++;G.phase='play';G.hide=true;G.dealer=[];G.msg='Repartiendo…';
  G.order=Object.keys(G.P).filter(u=>G.P[u].bet>0);
  Object.entries(G.P).forEach(([u,p])=>{p.hand=[];p.res='';p.pay=0;p.st=p.bet>0?'play':'out'});
  for(let r=0;r<2;r++){for(const u of G.order){G.P[u].hand.push(draw());bcast();await sleep(380)}G.dealer.push(draw());bcast();await sleep(380)}
  G.order.forEach(u=>{if(val(G.P[u].hand)===21)G.P[u].st='bj'});
  await nextTurn();
}
async function nextTurn(){
  const u=G.order.find(x=>G.P[x]&&G.P[x].st==='play');
  if(u){G.turn=u;G.msg='Turno de '+G.P[u].name;bcast()}else await dealerPlay();
}
async function dealerPlay(){
  G.turn=null;G.hide=false;G.msg='Juega el crupier';bcast();await sleep(800);
  const live=G.order.some(u=>['stand','bj'].includes(G.P[u].st));
  while(live&&val(G.dealer)<17){G.dealer.push(draw());bcast();await sleep(650)}
  const d=val(G.dealer),dbj=G.dealer.length===2&&d===21;
  G.order.forEach(u=>{const p=G.P[u],v=val(p.hand);let r,pay;
    if(p.st==='bust'){r='lose';pay=0}
    else if(p.st==='bj'){if(dbj){r='push';pay=p.bet}else{r='bj';pay=Math.round(p.bet*2.5)}}
    else if(dbj){r='lose';pay=0}
    else if(d>21||v>d){r='win';pay=p.bet*2}
    else if(v===d){r='push';pay=p.bet}else{r='lose';pay=0}
    p.res=r;p.pay=pay});
  G.phase='over';G.msg='Fin de la ronda';G.id=Date.now();bcast();
}
async function hostAct(a){
  if(HB||!G)return;const p=G.P[a.u];if(!p)return;HB=true;
  try{
    if(G.phase==='bet'){
      if(a.t==='bet'&&DEN.some(d=>d[0]===a.v)&&p.bet+a.v<=1000000){p.bet+=a.v;bcast()}
      else if(a.t==='clear'){p.bet=0;bcast()}
      else if(a.t==='deal'&&a.u===UID&&Object.values(G.P).some(q=>q.bet>0))await dealRound();
    }else if(G.phase==='play'&&G.turn===a.u&&p.st==='play'){
      if(a.t==='hit'){p.hand.push(draw());const v=val(p.hand);if(v>21)p.st='bust';else if(v===21)p.st='stand';bcast();await sleep(550);if(p.st!=='play')await nextTurn()}
      else if(a.t==='stand'){p.st='stand';await nextTurn()}
      else if(a.t==='double'&&p.hand.length===2){p.bet*=2;p.hand.push(draw());p.st=val(p.hand)>21?'bust':'stand';bcast();await sleep(650);await nextTurn()}
    }else if(G.phase==='over'&&a.t==='next'&&a.u===UID)newRound();
  }finally{HB=false}
}

/* ---------- pantalla de todos los jugadores ---------- */
function onState(){
  if(!CH||!ST)return;
  if(ST.rd!==RD){RD=ST.rd;seen={}}
  $('olobby').classList.add('hide');$('otable').classList.remove('hide');$('oerr').textContent='';
  orender();
  if(ST.phase==='over'&&ST.id!==lastPaid){lastPaid=ST.id;oPayout()}
}
function oPayout(){
  const p=ST.P[UID];if(!p||!(p.bet>0))return;
  const net=p.pay-p.bet,win=p.pay>p.bet;
  S.chips=Math.max(0,S.chips+net);S.games++;if(win)S.wins++;S.best=Math.max(S.best,S.chips);
  ses.m++;if(p.res==='lose')ses.l++;else if(p.res==='push')ses.e++;else ses.w++;
  sync(net,1,win?1:0);
  const sp=$('obet'),dl=$('odh');
  if(sp&&dl&&p.pay!==p.bet){const n=Math.min(6,Math.max(2,Math.round(p.bet/100)+1));for(let i=0;i<n;i++)win?fly(dl,sp,100,i*80):fly(sp,dl,25,i*80)}
  ui();
}
function drawHand(box,cards,pref){
  box.innerHTML='';
  cards.forEach((c,i)=>{const k=pref+i+(c?c.r+c.s:'x');const e=c?el(c,false):el({r:'',s:''},true);if(seen[k])e.classList.add('still');seen[k]=1;box.appendChild(e)});
}
function ostack(b,bet){let r=bet,i=0;DEN.forEach(([v])=>{let n=Math.floor(r/v);r-=n*v;while(n--&&i<14){const c=mk(v,'sk');c.style.bottom=(i*4)+'px';b.appendChild(c);i++}})}
function oStatus(g,p){
  if(g.phase==='bet')return p.bet>0?'Listo':'Esperando apuesta';
  if(g.phase==='over'&&p.bet>0)return({win:'¡Gana! +'+(p.pay-p.bet),bj:'¡Blackjack! +'+(p.pay-p.bet),push:'Empate',lose:'Pierde −'+p.bet}[p.res])||'';
  return({play:'Jugando',stand:'Plantado',bust:'Se pasó',bj:'¡Blackjack!',out:'Mira la ronda',wait:''}[p.st])||'';
}
function orender(){
  const g=ST;if(!g||!CH)return;
  $('omsg').textContent=g.msg;
  drawHand($('odh'),g.dealer,'d');
  $('odv').textContent=g.dealer.length&&!g.dealer.includes(null)?'· '+val(g.dealer):'';
  const box=$('oseats');box.innerHTML='';
  Object.entries(g.P).forEach(([u,p])=>{
    const d=document.createElement('div');d.className='seat'+(u===UID?' me':'')+(g.turn===u?' turn':'');
    const n=document.createElement('div');n.className='sn';n.textContent=p.name+(u===UID?' (tú)':'');
    const h=document.createElement('div');h.className='hand';drawHand(h,p.hand,u);
    const v=document.createElement('div');v.className='sv';v.textContent=p.hand.length?'· '+val(p.hand):'';
    const b=document.createElement('div');b.className='bets';if(u===UID)b.id='obet';ostack(b,p.bet);
    const t=document.createElement('div');t.className='sb';t.textContent='Apuesta: '+p.bet.toLocaleString('es');
    const s=document.createElement('div');s.className='ss';s.textContent=oStatus(g,p);
    d.append(n,h,v,b,t,s);box.appendChild(d)});
  otray();octl();obal();
}
function otray(){
  const t=$('otray');t.innerHTML='';const g=ST,p=g&&g.P[UID];
  DEN.slice().reverse().forEach(([v])=>{const c=mk(v,'');const ok=!!(g&&p&&g.phase==='bet'&&S.chips-p.bet>=v);if(!ok)c.classList.add('off');
    c.onclick=()=>{if(!ok)return;oAct('bet',{v});fly(c,$('obet')||$('oseats'),v)};t.appendChild(c)});
}
function octl(){
  const c=$('octl');c.innerHTML='';const g=ST,p=g&&g.P[UID];if(!g)return;
  const B=(t,f,cls='',dis=false)=>{const b=document.createElement('button');b.className='btn '+cls;b.textContent=t;b.disabled=dis;b.onclick=f;c.appendChild(b)};
  const H=t=>{const s=document.createElement('span');s.className='pill';s.textContent=t;c.appendChild(s)};
  if(g.phase==='bet'){
    if(p)B('Borrar apuesta',()=>oAct('clear'),'alt',!p.bet);
    if(IS_HOST)B('Repartir',()=>oAct('deal'),'go',!Object.values(g.P).some(q=>q.bet>0));else H('El anfitrión reparte cuando todos apuesten');
  }else if(g.phase==='play'&&g.turn===UID&&p){
    B('Pedir',()=>oAct('hit'));B('Plantarse',()=>oAct('stand'),'red');B('Doblar',()=>oAct('double'),'alt',!(p.hand.length===2&&S.chips-p.bet>=p.bet));
  }else if(g.phase==='over'){
    if(IS_HOST)B('Nueva ronda',()=>oAct('next'),'go');else H('Esperando al anfitrión…');
  }
}
