/* ===== RIFTBINDER · core.js — state, assets, input, helpers, rules ===== */
window.G=window.G||{};
(function(R){
'use strict';
const $=(s,r)=> (r||document).querySelector(s);
R.$=$;R.$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
R.clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
R.rand=(a,b)=>a+Math.random()*(b-a);
R.ri=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
R.pick=a=>a[Math.floor(Math.random()*a.length)];
R.lerp=(a,b,t)=>a+(b-a)*t;
R.sleep=ms=>new Promise(r=>setTimeout(r,ms));
R.dist=(a,b,c,d)=>Math.hypot(c-a,d-b);
R.mode='boot';
R.DPR=1;

/* ---------- data helpers ---------- */
R.D=id=>window.DAEMONS[id-1];
R.CARD=id=>R.cardMap[id];
R.cardMap={};window.CARDS.forEach(c=>R.cardMap[c.id]=c);
R.spriteSrc=id=>'sprites/'+String(id).padStart(3,'0')+'.png';
R.cardSrc=id=>'cards/'+String(id).padStart(3,'0')+'.webp';
R.TYPE_COL={Fire:'#ef8152',Water:'#4aa8ff',Nature:'#7bd35a',Storm:'#ffd84a',Stone:'#b49a78',Shadow:'#a07bff',Frost:'#9fe6ff',Venom:'#a6e24a',Wild:'#f0a85a',Astral:'#ff9ae8',Machine:'#b2cfdf'};
R.TYPE_ICON={Fire:'🔥',Water:'💧',Nature:'🌿',Storm:'⚡',Stone:'🪨',Shadow:'🌑',Frost:'❄️',Venom:'☠️',Wild:'🐾',Astral:'✨',Machine:'⚙️'};
R.D2E={Fire:'fire',Water:'water',Frost:'water',Nature:'earth',Stone:'earth',Storm:'wind',Wild:'wind',Shadow:'dark',Venom:'dark',Astral:'light',Machine:'light'};
R.ELEM_ICON={fire:'🔥',water:'💧',earth:'🪨',wind:'🌪️',light:'✨',dark:'🌑'};
R.ELEM_COL={fire:'#ff6a3d',water:'#3da5ff',earth:'#a08658',wind:'#7fe0b0',light:'#ffe48a',dark:'#a06bff'};
R.ELEMS=['fire','water','earth','wind','light','dark'];
const STRONG_C={water:'fire',fire:'wind',wind:'earth',earth:'water',light:'dark',dark:'light'};
R.cardElemMult=(a,d)=>STRONG_C[a]===d?1.5:STRONG_C[d]===a?.7:1;
const STRONG_D={Fire:['Nature','Frost','Machine'],Water:['Fire','Stone'],Nature:['Water','Stone'],Storm:['Water','Machine'],Stone:['Storm','Fire'],Shadow:['Astral','Wild'],Frost:['Nature','Storm'],Venom:['Nature','Wild'],Wild:['Shadow'],Astral:['Venom','Shadow'],Machine:['Stone','Frost']};
R.typeMult=(a,b)=>STRONG_D[a]&&STRONG_D[a].includes(b)?1.28:(STRONG_D[b]&&STRONG_D[b].includes(a)?.82:1);
R.ARCH_INFO={striker:['⚔️','Spirit Strike','A big hit that staggers.'],mage:['🔮','Arcane Volley','Three homing bolts.'],tank:['🛡️','Spirit Guard','Shield for 2.6s + small heal.'],healer:['💚','Spirit Heal','Heal and cleanse.'],poisoner:['☠️','Venom Mark','Poison over time.'],stunner:['💫','Stun Gaze','Stuns the foe.'],drainer:['🩸','Soul Drain','Hit and steal HP.'],buffer:['🔺','War Cry','+65% damage and +energy.']};
R.STAR_COST=[0,22,32,42,56,72];
R.maxHp=(id,lvl)=>R.D(id).hp+lvl*8;
R.expNeed=l=>Math.round(25+l*l*.6+7*l);
R.newDaemon=(id,lvl)=>({id,lvl,exp:0,hp:R.maxHp(id,lvl),maxHp:R.maxHp(id,lvl)});
R.MOVES=[
 {lvl:7,name:'Razor Combo',desc:'A · Slash deals 25% more damage.'},
 {lvl:8,name:'Charged Shot',desc:'S · Projectiles gain power and speed.'},
 {lvl:11,name:'Elemental Surge',desc:'D · Elemental Power gains a 25% damage boost.'},
 {lvl:14,name:'Soul Conduit',desc:'F · Energy builds faster for your Ultimate.'},
 {lvl:18,name:'Twin Fang',desc:'A · Slash gains a powerful second hit.'},
 {lvl:24,name:'Starburst Bolt',desc:'S · Shot blasts deal additional damage.'},
 {lvl:32,name:'Overcharged Core',desc:'D · Elemental Power surges again.'}
];
R.POWERS={Fire:['Cinder Shot','Inferno Burst'],Water:['Aqua Bolt','Tidal Lance'],Nature:['Thorn Dart','Briar Bind'],Storm:['Volt Shot','Thunder Stun'],Stone:['Pebble Shot','Granite Ward'],Shadow:['Shade Bolt','Soul Siphon'],Frost:['Ice Spear','Frostbite'],Venom:['Toxin Dart','Acid Cloud'],Wild:['Spirit Arc','Feral Roar'],Astral:['Star Shard','Nova Pulse'],Machine:['Laser Bolt','Overclock']};
R.GIFTS=[
 {name:'Guardian Shield',desc:'A shimmering barrier blocks all damage for 2 seconds.',cool:22,icon:'🛡️'},
 {name:'Surge Step',desc:'Gain speed and an empowered strike for 5 seconds.',cool:22,icon:'💨'},
 {name:'Second Wind',desc:'Restore 28% of maximum health.',cool:28,icon:'🍃'},
 {name:'Double Strike',desc:'Your next damaging attack hits twice.',cool:22,icon:'⚡'},
 {name:'Phantom Dodge',desc:'Become untouchable and dash past your foe.',cool:18,icon:'👻'},
 {name:'Skybound',desc:'Launch skyward and slam down a shockwave.',cool:18,icon:'🪽'},
 {name:'Power Overdrive',desc:'Deal 65% extra damage for 7 seconds.',cool:28,icon:'🔥'},
 {name:'Rift Break',desc:'Call down devastating energy on the foe.',cool:42,icon:'💥'}
];

/* ---------- images ---------- */
R.img={};
R.loadImg=src=>new Promise(res=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>res(null);i.src=src;});
const sprCache={},sprLoading={};
R.sprite=id=>{if(sprCache[id])return sprCache[id];if(!sprLoading[id]){sprLoading[id]=1;R.loadImg(R.spriteSrc(id)).then(i=>{if(i)sprCache[id]=i;});}return null;};
R.spriteReady=id=>R.loadImg(R.spriteSrc(id)).then(i=>{if(i)sprCache[id]=i;return i;});
const npcCache={};
R.npcImg=n=>{if(npcCache[n])return npcCache[n];if(npcCache['_'+n])return null;npcCache['_'+n]=1;R.loadImg('npcs/'+n+'.png').then(i=>{if(i)npcCache[n]=i;});return null;};

/* ---------- state / save ---------- */
const SAVE_KEY='riftbinder_save_v1';
R.newState=function(name,starter){
  const s={v:1,name:name||'Binder',x:0,y:0,dir:0,party:[R.newDaemon(starter,6)],storage:[],active:0,
    owned:{[starter]:true},seen:{[starter]:true},cards:{},hand:[null,null,null],
    coins:250,orbs:8,tonics:3,cleared:[],beaten:{},chests:{},gift:0,visited:{0:true},flags:{},
    wins:0,losses:0,captures:0,steps:0,play:0,rivalStage:0,won:false,
    settings:{sound:true,music:true,shake:true,diff:'normal'}};
  return s;
};
R.hasSave=()=>{try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;}};
R.save=function(){if(!R.S)return;try{const s=R.S;if(R.world&&R.world.player){s.x=R.world.player.x;s.y=R.world.player.y;s.dir=R.world.player.dir;}localStorage.setItem(SAVE_KEY,JSON.stringify(s));}catch(e){}};
R.loadSave=function(){try{const s=JSON.parse(localStorage.getItem(SAVE_KEY));if(s&&s.party&&s.party.length){s.settings=Object.assign({sound:true,music:true,shake:true,diff:'normal'},s.settings||{});s.flags=s.flags||{};s.chests=s.chests||{};s.beaten=s.beaten||{};s.cards=s.cards||{};s.hand=s.hand||[null,null,null];s.visited=s.visited||{0:true};return s;}}catch(e){}return null;};
R.wipeSave=()=>{try{localStorage.removeItem(SAVE_KEY);}catch(e){}};
R.leadIdx=()=>{const S=R.S;if(S.party[S.active]&&S.party[S.active].hp>0)return S.active;const i=S.party.findIndex(p=>p.hp>0);return i<0?S.active:i;};
R.lead=()=>R.S.party[R.leadIdx()];
R.alive=()=>R.S.party.some(p=>p.hp>0);
R.healAll=()=>{R.S.party.forEach(p=>{p.hp=p.maxHp;});};
R.addCoins=n=>{R.S.coins=Math.max(0,R.S.coins+n);};

/* ---------- card rules ---------- */
R.ownedCards=()=>Object.keys(R.S.cards).map(Number);
R.giveCard=function(id){
  const S=R.S,c=S.cards[id];
  if(c){const was=c.lvl;c.n=(c.n||1)+1;if(c.lvl<10)c.lvl++;return{id,isNew:false,lvl:c.lvl,maxed:was>=10};}
  S.cards[id]={lvl:1,n:1};
  const e=S.hand.indexOf(null);if(e>=0)S.hand[e]=id;
  return{id,isNew:true,lvl:1};
};
R.cardsOf=elem=>R.ownedCards().filter(i=>R.CARD(i).element===elem).length;
R.SET_TIERS=[[5,.03],[12,.06],[25,.10],[40,.15]];
R.SET_INFO={fire:['Attack','Fire cards: Daemon attacks hit harder'],water:['Vitality','Water cards: more max HP'],earth:['Guard','Earth cards: take less damage'],wind:['Swiftness','Wind cards: faster move and cooldowns'],light:['Focus','Light cards: card power and Focus regen'],dark:['Fortune','Dark cards: capture odds and coin drops']};
R.setBonus=el=>{const n=R.cardsOf(el);let tier=0,pct=0;R.SET_TIERS.forEach(([need,p],i)=>{if(n>=need){tier=i+1;pct=p;}});return{n,tier,pct,next:R.SET_TIERS[tier]?R.SET_TIERS[tier][0]:null};};
R.setPct=el=>R.setBonus(el).pct;
// random card of an element, star level biased to district tier
R.rollCard=function(elem,tier,opts){
  opts=opts||{};
  let pool=window.CARDS.filter(c=>c.role==='wild'&&(!elem||c.element===elem));
  if(opts.role)pool=window.CARDS.filter(c=>opts.role.includes(c.role)&&(!elem||c.element===elem));
  if(!pool.length)pool=window.CARDS.filter(c=>c.role==='wild');
  const target=1+tier*.5+(opts.bonus||0);
  const w=pool.map(c=>Math.exp(-Math.abs(c.stars-target)*.95)*(R.S.cards[c.id]?.7:1.2));
  let t=Math.random()*w.reduce((a,b)=>a+b,0);for(let i=0;i<pool.length;i++){t-=w[i];if(t<=0)return pool[i].id;}
  return pool[pool.length-1].id;
};
R.cardPower=(card,cardLv,daemonLv)=>9+card.stars*5+cardLv*1.6+daemonLv*1.1;

/* ---------- toast ---------- */
let toastT=0;
R.toast=function(msg,ms){const el=$('#toast');if(!el)return;el.innerHTML=msg;el.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('on'),ms||1700);};

/* ---------- audio facade ---------- */
R.sfx=n=>{try{if(R.S&&!R.S.settings.sound)return;G.audio.sfx(n);}catch(e){}};
R.spell=el=>{try{if(R.S&&!R.S.settings.sound)return;G.audio.spell(el);}catch(e){}};
R.swing=l=>{try{if(R.S&&!R.S.settings.sound)return;G.audio.swing(l);}catch(e){}};
R.curMusic=null;
R.music=n=>{R.curMusic=n;try{if(!G.audio.ctx)return;if(R.S&&!R.S.settings.music){G.audio.stop();return;}G.audio.play(n);}catch(e){}};
R.audioInit=()=>{try{if(!G.audio.ctx){G.audio.init();if(R.curMusic){const m=R.curMusic;G.audio.cur=null;R.music(m);}}if(G.audio.ctx&&G.audio.ctx.state==='suspended')G.audio.ctx.resume();}catch(e){}};

/* ---------- input ---------- */
R.keys={};R.joy={x:0,y:0};R.hold={};R.actQueue=[];
const KEYMAP_WORLD={Enter:'interact',' ':'interact',z:'interact',Z:'interact',Escape:'menu',m:'menu',M:'menu',x:'menu',X:'menu',Tab:'menu'};
const KEYMAP_DUEL={ArrowUp:'jump',' ':'jump',Shift:'dash',a:'slash',A:'slash',s:'shot',S:'shot',d:'special',D:'special',f:'ultimate',F:'ultimate',1:'card0',2:'card1',3:'card2',r:'gift',R:'gift',c:'bind',C:'bind',q:'swap',Q:'swap',t:'tonic',T:'tonic'};
R.onAct=null; // set by active mode
R.axis=function(){
  const k=R.keys;let x=(k.ArrowRight||k.d||k.D?1:0)-(k.ArrowLeft||k.a||k.A?1:0),y=(k.ArrowDown||k.s||k.S?1:0)-(k.ArrowUp||k.w||k.W?1:0);
  if(R.mode==='duel'){x=(k.ArrowRight?1:0)-(k.ArrowLeft?1:0)+(R.hold.right?1:0)-(R.hold.left?1:0);y=0;}
  else{x+=R.joy.x;y+=R.joy.y;}
  const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}
  return{x,y};
};
R.setupInput=function(){
  addEventListener('keydown',e=>{
    if(e.target&&['INPUT','TEXTAREA'].includes(e.target.tagName))return;
    R.audioInit();
    R.keys[e.key]=true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Tab'].includes(e.key))e.preventDefault();
    if(e.repeat)return;
    const map=R.mode==='duel'?KEYMAP_DUEL:KEYMAP_WORLD;const a=map[e.key];
    if(a&&R.onAct)R.onAct(a);
  });
  addEventListener('keyup',e=>{R.keys[e.key]=false;});
  addEventListener('blur',()=>{R.keys={};R.hold={};R.joy.x=R.joy.y=0;});
  document.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('gesturestart',e=>e.preventDefault());
  // virtual joystick
  const base=$('#joy'),knob=$('#knob');let jid=null;
  const jm=ev=>{const r=base.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=(ev.clientX-cx)/(r.width/2),dy=(ev.clientY-cy)/(r.height/2);const d=Math.hypot(dx,dy);if(d>1){dx/=d;dy/=d;}
    R.joy.x=Math.abs(dx)<.18?0:dx;R.joy.y=Math.abs(dy)<.18?0:dy;knob.style.transform=`translate(${dx*r.width*.32}px,${dy*r.height*.32}px)`;};
  base.addEventListener('pointerdown',e=>{jid=e.pointerId;base.setPointerCapture(jid);R.audioInit();jm(e);e.preventDefault();});
  base.addEventListener('pointermove',e=>{if(e.pointerId===jid)jm(e);});
  const jend=e=>{if(e.pointerId===jid){jid=null;R.joy.x=R.joy.y=0;knob.style.transform='';}};
  base.addEventListener('pointerup',jend);base.addEventListener('pointercancel',jend);
  // buttons: data-act (tap) / data-hold (held)
  document.addEventListener('pointerdown',e=>{
    const b=e.target.closest&&e.target.closest('[data-act],[data-hold]');if(!b||!b.closest('.touchlayer'))return;
    R.audioInit();e.preventDefault();
    if(b.dataset.hold){R.hold[b.dataset.hold]=true;b.classList.add('down');}
    if(b.dataset.act&&R.onAct){b.classList.add('down');R.onAct(b.dataset.act);}
  },{passive:false});
  const up=e=>{R.$$('.touchlayer .down').forEach(b=>b.classList.remove('down'));R.hold={};};
  document.addEventListener('pointerup',up);document.addEventListener('pointercancel',up);
};
R.fmtTime=s=>{s|=0;const h=(s/3600)|0,m=((s%3600)/60)|0;return h?h+'h '+m+'m':m+'m';};
})(window.R=window.R||{});
