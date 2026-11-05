/* ===== RIFTBINDER · world.js — overworld: movement, camera, NPCs, roaming Daemons, interactions ===== */
(function(R){
'use strict';
const $=R.$,TS=16;
let cv,ctx,VW=0,VH=0,SC=4,DPR=1;
const world=R.world={city:null,atlas:[],mini:null,player:{x:0,y:0,dir:0,walk:0,moving:false,trail:[]},npcs:[],mobs:[],cam:{x:0,y:0},paused:true,t:0,dist:0,weather:[],prompt:null,spawnT:0,guide:true,bannerT:0};
R.worldScale=()=>SC;

/* ---------- canvas ---------- */
R.resize=function(){
  DPR=Math.min(window.devicePixelRatio||1,2);R.DPR=DPR;
  VW=Math.round(innerWidth*DPR);VH=Math.round(innerHeight*DPR);
  cv.width=VW;cv.height=VH;cv.style.width=innerWidth+'px';cv.style.height=innerHeight+'px';
  SC=R.clamp(Math.round(VH/(TS*10.5)),3,8);
  R.vw=VW;R.vh=VH;R.sc=SC;
  const portrait=innerHeight>innerWidth*1.05&&('ontouchstart' in window||navigator.maxTouchPoints>0);
  document.body.classList.toggle('portrait',portrait);
};
R.initCanvas=function(){cv=$('#cv');ctx=cv.getContext('2d',{alpha:false});R.ctx=ctx;R.cv=cv;R.resize();addEventListener('resize',R.resize);};

/* ---------- world setup ---------- */
R.initWorld=async function(){
  const img=await R.loadImg('tiles/city.png');R.img.city=img;
  world.city=R.buildCity(1337);
  world.atlas=R.DISTRICTS.map(t=>R.makeAtlas(img,t));
  world.mini=R.buildMinimap(world.city);
  R.city=world.city;
  // plain people from the Kenney sheet (girl 108, boy 120, police 121)
  world.civTiles=[108,120,121];
};

const NAMES=['Mika','Taro','Juno','Bram','Sable','Pip','Ozzy','Nori','Tess','Hugo','Lena','Dax','Cleo','Finn','Rue','Kenji','Ivy','Moss','Zara','Bo','Wren','Gus','Ami','Rex','Faye','Odin','Lux','Sora','Nell','Vik','Yuki','Cass','Leo','Mara','Jett','Pearl','Ravi','Tilly','Cobb','Hana','Ned','Opal','Kit','Dov','Isla','Ren','Pia','Quinn','Sol','Tobi','Una','Vance','Wynn','Xia','Yara','Zed','Arlo'];
const CHAL_PRE=[
 'Hey! That\'s a Binder deck! Spar with me — winner takes a card.',
 'The Rift made my Daemon restless. Care to burn off some energy?',
 'Streets are safe, but real Binders learn in the ring. Ready?',
 'I\'ve been saving this Daemon for a worthy rival. Is it you?',
 'Cards chose me, not the other way around. Prove they chose you too!',
 'No wild grass needed — just you, me, and our Daemons.',
 'Let\'s see how you play your hand under pressure!'];
const CHAL_WIN=['Ha! Great fight. Take this card — it wants to go with you.','You win! Here, the card is yours.','Unreal reflexes. This card is yours now.'];
const CHAL_DONE=['Good luck out there! Try the Bus Stops to hop between districts.','Remember: Daemons only chase you on grass and gravel. Streets are safe!','Beat Keepers to unlock Gifts. Press R in a duel to use yours!','Cards cost Focus. Hit things to fill it faster!','Bind a weakened Daemon (under 38% HP) with an Orb — you get its Card too!'];
const TIPS=[
 'Daemons only chase you on grass, gravel and plaza stones. Sidewalks and roads are always safe.',
 'Weaken a wild Daemon below 38% HP, then press Bind. You keep the Daemon AND earn a card of its element.',
 'Set your 3-card Hand in the Binder tab. In a duel, tap a card to play it — each costs Focus.',
 'Type matchups matter: Fire beats Nature, Water beats Fire, Nature beats Water… check the Party tab!',
 'Collect many cards of one element for permanent Set Bonuses. Look at the Binder tab.',
 'Every district has a Clinic (heals your party) and a Market (Orbs, Tonics, Spirit Packs).',
 'Bus Stops let you ride between districts you have already visited — for free.',
 'Keepers give you a Gift. Equip it in the Items tab and press R in a duel.',
 'Stuck? Your yellow arrow always points toward the next Keeper.',
 'Chests hide in parks and lots. Some hold whole Spirit Packs!'];

function makeNpc(o){return Object.assign({x:0,y:0,dir:0,kind:'civ',name:'',hit:.38,t:Math.random()*9},o);}
function dtype(el){const m={fire:['Fire'],water:['Water','Frost'],earth:['Nature','Stone'],wind:['Storm','Wild'],light:['Astral','Machine'],dark:['Shadow','Venom']};return R.pick(m[el]);}
function pickSpecies(types,tier,opt){
  opt=opt||{};
  const ws=window.DAEMONS.map(d=>{
    let w=0.3;
    if(types.includes(d.type))w=types[0]===d.type?2.4:1.4;else if(opt.strict)return 0;
    const r=d.rar;const rw=r==='common'?Math.max(.12,1.0-tier*.12):r==='uncommon'?.8:r==='rare'?Math.min(.9,tier*.13):(tier>=5?.06:0);
    return w*rw;
  });
  let t=Math.random()*ws.reduce((a,b)=>a+b,0);for(let i=0;i<ws.length;i++){t-=ws[i];if(t<=0)return window.DAEMONS[i];}
  return window.DAEMONS[0];
}
R.pickSpecies=pickSpecies;

function placeNpcs(){
  const city=world.city;world.npcs=[];
  const rnd=R.rng(4242);
  // cards for challengers: split 'npc' cards by stars into 8 districts
  const npcCards=window.CARDS.filter(c=>c.role==='npc').sort((a,b)=>a.stars-b.stars||a.id-b.id);
  const per=Math.ceil(npcCards.length/8);
  for(let d=0;d<8;d++){
    const th=R.DISTRICTS[d];
    const mine=npcCards.slice(d*per,(d+1)*per);
    // candidate spots in the district, spaced out
    const spots=city.npcSpots.filter(s=>s.d===d);
    for(let i=spots.length-1;i>0;i--){const j=rnd.i(i+1);[spots[i],spots[j]]=[spots[j],spots[i]];}
    const used=[];
    const take=(n,minD)=>{const out=[];for(const s of spots){if(out.length>=n)break;if(used.some(u=>Math.hypot(u.x-s.x,u.y-s.y)<minD))continue;used.push(s);out.push(s);}return out;};
    // keeper
    const k=city.keepers.find(k=>k.d===d);
    if(k){world.npcs.push(makeNpc({kind:'keeper',d,x:k.x+.5,y:k.y+.5,dir:0,name:th.keeperName,spr:th.kn,hit:.42}));used.push({x:k.x,y:k.y});}
    // challengers
    const cs=take(mine.length,6.5);
    cs.forEach((s,i)=>{
      const card=mine[i];
      world.npcs.push(makeNpc({kind:'chal',d,x:s.x+.5,y:s.y+.5,dir:rnd.i(4),name:NAMES[(d*7+i)%NAMES.length],tile:world.civTiles[(d+i)%3],card:card.id,key:'n'+d+'_'+i,
        elem:card.element,pre:CHAL_PRE[(d+i)%CHAL_PRE.length]}));
    });
    // leftover cards (if fewer spots): drop in as chest-like pickups later via packs
    // civilians
    take(2,5).forEach((s,i)=>world.npcs.push(makeNpc({kind:'civ',d,x:s.x+.5,y:s.y+.5,dir:rnd.i(4),name:['Resident','Shopkeeper','Courier','Commuter'][(i+d)%4],tile:world.civTiles[(d*2+i+1)%3],tip:TIPS[(d*2+i)%TIPS.length]})));
  }
  // Archivist near start
  const st=city.start;
  world.npcs.push(makeNpc({kind:'archivist',x:st.x+2,y:st.y-1,dir:1,name:'The Archivist',spr:'archivist'}));
  // rival spots
  [[1,0],[4,1],[7,2]].forEach(([d,stage])=>{const spots=city.npcSpots.filter(s=>s.d===d);if(spots.length){const s=spots[(spots.length*.7)|0];world.npcs.push(makeNpc({kind:'rival',d,stage,x:s.x+.5,y:s.y+.5,dir:0,name:'Kade',spr:'rival',key:'rival'+stage}));}});
  // Wielder in the rift
  const r=city.rift;world.npcs.push(makeNpc({kind:'wielder',d:8,x:r.x,y:r.y+2.6,dir:3,name:'The Rift Wielder',spr:'final_wielder',hit:.5}));
  // chests
  world.chests=city.chests.map(c=>({x:c.x+.5,y:c.y+.5,d:c.d,id:c.id,open:!!R.S.chests[c.id]}));
  // flatten door metadata
  world.doors=city.doors;world.stops=city.stops;
}

R.startWorld=function(){
  const S=R.S,city=world.city;
  placeNpcs();
  const p=world.player;
  if(S.x||S.y){p.x=S.x;p.y=S.y;p.dir=S.dir||0;}else{p.x=city.start.x;p.y=city.start.y;p.dir=0;}
  p.trail=[];for(let i=0;i<30;i++)p.trail.push({x:p.x,y:p.y});
  world.mobs=[];world.paused=false;world.curDist=-1;
  world.cam.x=p.x-VW/(TS*SC)/2;world.cam.y=p.y-VH/(TS*SC)/2;
  city.setBarrier(S.cleared.length>=8);
  R.mode='world';R.onAct=worldAct;
  document.body.classList.remove('inDuel','onTitle');document.body.classList.add('inWorld');
  R.updateHud();
  R.save();
};

/* ---------- collision ---------- */
function solidAt(x,y){const c=world.city;const tx=Math.floor(x),ty=Math.floor(y);if(tx<0||ty<0||tx>=c.W||ty>=c.H)return true;return c.sol[ty*c.W+tx]===1;}
function npcAt(x,y,r){for(const n of world.npcs){if(Math.hypot(n.x-x,n.y-y)<r+.28)return n;}for(const c of world.chests){if(Math.hypot(c.x-x,c.y-y)<.55)return c;}return null;}
function blockedBox(x,y){const h=.26;return solidAt(x-h,y-.05)||solidAt(x+h,y-.05)||solidAt(x-h,y+.16)||solidAt(x+h,y+.16);}
world.zoneAt=function(x,y){const c=world.city;const tx=Math.floor(x),ty=Math.floor(y);if(tx<0||ty<0||tx>=c.W||ty>=c.H)return 0;return c.zn[ty*c.W+tx];};
world.distAt=function(x,y){const c=world.city;const tx=R.clamp(Math.floor(x),0,c.W-1),ty=R.clamp(Math.floor(y),0,c.H-1);return c.dist[ty*c.W+tx];};

/* ---------- interaction ---------- */
function findInteract(){
  const p=world.player,out=[];
  const fx=p.dir===1?-1:p.dir===2?1:0,fy=p.dir===0?1:p.dir===3?-1:0;
  for(const n of world.npcs){const d=Math.hypot(n.x-p.x,n.y-p.y);if(d<1.45)out.push({kind:'npc',n,d:d-(((n.x-p.x)*fx+(n.y-p.y)*fy)>0?.25:0)});}
  for(const c of world.chests){if(c.open)continue;const d=Math.hypot(c.x-p.x,c.y-p.y);if(d<1.4)out.push({kind:'chest',c,d});}
  for(const dr of world.doors){const cx=dr.x+dr.w/2,cy=dr.y+1.4;const d=Math.hypot(cx-p.x,cy-p.y);if(d<1.5&&p.y>dr.y+.9)out.push({kind:'door',dr,d});}
  for(const s of world.stops){const d=Math.hypot(s.x-p.x+0.4,s.y-p.y);if(d<1.7)out.push({kind:'stop',s,d});}
  for(const m of world.mobs){const d=Math.hypot(m.x-p.x,m.y-p.y);if(d<1.3&&m.state!=='gone')out.push({kind:'mob',m,d:d+.2});}
  out.sort((a,b)=>a.d-b.d);return out[0]||null;
}
function promptText(it){
  if(!it)return null;
  if(it.kind==='npc'){const n=it.n;const lab=n.kind==='keeper'?(R.S.cleared.includes(n.d)?'Talk':'Challenge Keeper'):n.kind==='chal'?(R.S.beaten[n.key]?'Talk':'Challenge'):n.kind==='wielder'?'Face the Wielder':n.kind==='rival'?(R.S.beaten[n.key]?'Talk':'Challenge'):'Talk';return lab+' · '+n.name;}
  if(it.kind==='chest')return 'Open chest';
  if(it.kind==='door'){const k=it.dr.kind;return k==='clinic'?'Enter Clinic':k==='market'?'Enter Market':k==='exchange'?'Enter Spirit Exchange':'Enter Keeper HQ';}
  if(it.kind==='stop')return 'Bus Stop · travel';
  if(it.kind==='mob')return 'Challenge '+R.D(it.m.id).name;
  return null;
}
async function worldAct(a){
  if(world.paused||R.mode!=='world')return;
  if(a==='menu'){R.openMenu();return;}
  if(a!=='interact')return;
  const it=findInteract();if(!it)return;
  world.paused=true;R.joy.x=R.joy.y=0;
  try{await handle(it);}catch(e){console.error(e);}
  if(R.mode==='world')world.paused=false;
  R.updateHud();
}
async function handle(it){
  const S=R.S;
  if(it.kind==='npc'){await npcTalk(it.n);return;}
  if(it.kind==='chest'){await openChest(it.c);return;}
  if(it.kind==='door'){
    R.sfx('open');
    if(it.dr.kind==='clinic')await R.clinic();
    else if(it.dr.kind==='market')await R.market(it.dr.d,'supplies');
    else if(it.dr.kind==='exchange')await R.market(it.dr.d,'packs');
    else if(it.dr.kind==='hq'){const k=world.npcs.find(n=>n.kind==='keeper'&&n.d===it.dr.d);if(k)await npcTalk(k);}
    return;
  }
  if(it.kind==='stop'){await R.busStop(it.s);return;}
  if(it.kind==='mob'){await engage(it.m);return;}
}
async function openChest(c){
  const S=R.S,th=R.DISTRICTS[c.d];c.open=true;S.chests[c.id]=1;R.sfx('chest');setTimeout(()=>R.tipSoft('chest'),2600);
  const tier=c.d,r=Math.random();let msg='';
  if(r<.34){const n=R.ri(60,120)+tier*45;R.addCoins(n);msg=`<b>${n} coins</b>`;}
  else if(r<.52){const n=R.ri(2,3);S.orbs+=n;msg=`<b>${n} Binding Orbs</b>`;}
  else if(r<.66){S.tonics+=2;msg='<b>2 Battle Tonics</b>';}
  else{const el=R.pick(R.ELEMS);const id=R.rollCard(el,tier,{bonus:.3});const res=R.giveCard(id);await R.say({name:'Spirit Cache',text:'The chest hums… a card slides out!'});await R.revealCards([res]);R.save();return;}
  await R.say({name:'Chest',text:'You found '+msg+'!'});R.save();
}
async function npcTalk(n){
  const S=R.S;const p=world.player;
  const dx=p.x-n.x,dy=p.y-n.y;if(n.kind!=='wielder')n.dir=Math.abs(dx)>Math.abs(dy)?(dx>0?2:1):(dy>0?0:3);
  const sp={name:n.name,spr:n.spr,tile:n.tile};
  if(n.kind==='civ'){await R.say(sp,n.tip);return;}
  if(n.kind==='archivist'){await archivistTalk(sp);return;}
  if(n.kind==='chal'){
    if(S.beaten[n.key]){await R.say(sp,R.pick(CHAL_DONE));return;}
    const th=R.DISTRICTS[n.d];
    await R.tip('chal');
    await R.say(sp,n.pre);
    if(!R.alive()){await R.say(sp,'Your Daemons look worn out. Visit a Clinic first!');return;}
    const sp0=pickSpecies([dtype(n.elem)].concat(th.types),n.d,{});
    const lvl=th.lvl+R.ri(-1,1)+(n.d===0?-1:0);
    const res=await R.duel.start({kind:'trainer',label:n.name,foes:[{id:sp0.id,lvl}],district:n.d,reward:{coins:40+lvl*6,card:n.card}});
    if(res.outcome==='win'){S.beaten[n.key]=1;await R.say(sp,R.pick(CHAL_WIN));R.save();}
    return;
  }
  if(n.kind==='rival'){await rivalTalk(n,sp);return;}
  if(n.kind==='keeper'){await keeperTalk(n,sp);return;}
  if(n.kind==='wielder'){await wielderTalk(n,sp);return;}
}
async function archivistTalk(sp){
  const S=R.S;
  if(!S.flags.intro){
    S.flags.intro=1;
    await R.say(sp,`${S.name}! Good, a Binder. The Astral Rift tore open over the old square, and Daemons are pouring into Tiny City.`);
    await R.say(sp,'Our oldest craft is Cardbinding: spirits sleep inside cards. Your Daemon fights beside you — and the cards in your hand answer when you call them.');
    await R.say(sp,'Daemons only chase you across grass, gravel and plaza stone. Sidewalks and roads are safe. Seek the eight Keepers — each guards a district and a Gift.');
    await R.say(sp,'When all eight stand with you, the barrier around the Rift Plaza will fall. Follow the gold arrow to the first Keeper. Good luck!');
    S.orbs+=4;S.tonics+=2;R.toast('The Archivist gave you <b>4 Orbs</b> and <b>2 Tonics</b>.',2600);R.save();return;
  }
  await R.say(sp,R.pick(TIPS));
}
async function rivalTalk(n,sp){
  const S=R.S;
  if(S.beaten[n.key]){await R.say(sp,'…Fine. You\'re better than me. For now.');return;}
  const stage=n.stage,th=R.DISTRICTS[n.d];
  const lines=['So you\'re the new Binder everyone\'s whispering about. I\'m Kade. Let\'s see if the rumors are true.','You again! I\'ve trained since last time. Don\'t expect mercy.','This is it. I\'ve got one Daemon left that I\'ve never shown anyone. Give me everything you\'ve got!'];
  await R.say(sp,lines[stage]);
  if(!R.alive()){await R.say(sp,'Come back when your Daemons can stand.');return;}
  const lvl=th.lvl+2+stage;
  const foes=[{id:pickSpecies([th.types[0]],stage*2,{strict:1}).id,lvl:lvl},{id:pickSpecies(['Astral','Machine'],stage*2+2,{strict:1}).id,lvl:lvl+2}];
  const res=await R.duel.start({kind:'rival',label:'Kade',foes,district:n.d,reward:{coins:150+stage*120,card:R.rollCard(null,th.id,{role:['rival','legend'],bonus:1})}});
  if(res.outcome==='win'){S.beaten[n.key]=1;S.rivalStage=Math.max(S.rivalStage,stage+1);await R.say(sp,['Hmph. Okay, you win this one.','Impossible… alright. You earned it.','Heh. Maybe the Rift needed someone like you.'][stage]);R.save();}
}
async function keeperTalk(n,sp){
  const S=R.S,th=R.DISTRICTS[n.d];
  if(S.cleared.includes(n.d)){await R.say(sp,`You carry my Gift, ${S.name}. Wield ${R.GIFTS[th.gift].name} wisely.`);return;}
  await R.tip('keeper');
  await R.say(sp,`${th.blurb}`);
  await R.say(sp,`I am ${th.keeperName}. The Rift shard in this district answers only to a Binder who can defeat me. Recommended level: ${th.lvl}+.`);
  const ok=await R.confirm('Challenge '+th.keeperName+'?','Fight now','Not yet');
  if(!ok)return;
  if(!R.alive()){await R.say(sp,'Heal your Daemons first.');return;}
  const t1=pickSpecies(th.types,th.id,{strict:1});
  const foes=[{id:t1.id,lvl:th.lvl+2},{id:th.boss,lvl:th.lvl+4,boss:true}];
  const res=await R.duel.start({kind:'keeper',label:th.keeperName,foes,district:n.d,reward:{coins:260+th.id*90,card:R.rollCard(R.D2E[th.types[0]],th.id,{role:['boss','guardian'],bonus:1.5}),gift:th.gift,keeper:n.d}});
  if(res.outcome==='win'){
    if(!S.cleared.includes(n.d))S.cleared.push(n.d);
    await R.say(sp,`Well fought. ${R.GIFTS[th.gift].name} is yours — equip it in the Items menu and press R in a duel.`);
    if(S.cleared.length>=8&&!world.city.barrierOpen){world.city.setBarrier(true);R.sfx('level');await R.say({name:'The Rift'},'A low roar shakes the streets… the barrier around the Rift Plaza has shattered! The Wielder awaits at the centre of the city.');}
    R.save();
  }
}
async function wielderTalk(n,sp){
  const S=R.S;
  if(S.won){await R.say(sp,'The Rift sleeps. The city is yours, Binder.');return;}
  await R.say(sp,'So the eight Keepers sent you. The Rift is not a wound — it is a door. And I am the one who holds it open.');
  await R.say(sp,'Show me what a Cardbinder can do.');
  if(!R.alive()){await R.say(sp,'Heal your Daemons first. I can wait.');return;}
  const foes=[{id:R.pick([91,92,93,94,95]),lvl:47},{id:100,lvl:49,boss:true},{id:110,lvl:52,boss:true}];
  const res=await R.duel.start({kind:'final',label:'The Rift Wielder',foes,district:8,reward:{coins:2000,card:window.CARDS.find(c=>c.role==='final').id}});
  if(res.outcome==='win'){S.won=true;R.save();await R.ending();}
}

/* ---------- roaming Daemons ---------- */
function spawnMob(){
  const c=world.city,p=world.player;
  for(let tries=0;tries<40;tries++){
    const d=world.distAt(p.x,p.y);
    const list=Math.random()<.75?c.wild[d]:c.wild[R.pick([0,1,2,3,4,5,6,7,8])];
    if(!list||!list.length)continue;
    const i=list[(Math.random()*list.length)|0];const x=(i%c.W)+.5,y=((i/c.W)|0)+.5;
    const dd=Math.hypot(x-p.x,y-p.y);if(dd<9||dd>20)continue;
    if(world.mobs.some(m=>Math.hypot(m.x-x,m.y-y)<2.5))continue;
    const di=c.dist[i],th=R.DISTRICTS[di];
    const sp=pickSpecies(th.types,di);
    const lvl=di===8?R.ri(45,50):Math.max(2,th.lvl+R.ri(-2,2));
    world.mobs.push({id:sp.id,lvl,x,y,vx:0,vy:0,state:'idle',t:Math.random()*5,face:1,home:{x,y},d:di,flash:0,alert:0,anim:Math.random()*9,wait:0});
    return;
  }
}
function mobStep(m,dx,dy){
  const c=world.city;
  const nx=m.x+dx,ny=m.y+dy;
  const ok=(x,y)=>{const tx=Math.floor(x),ty=Math.floor(y);if(tx<0||ty<0||tx>=c.W||ty>=c.H)return false;const i=ty*c.W+tx;return c.zn[i]===2&&!c.sol[i];};
  if(ok(nx-.3,ny)&&ok(nx+.3,ny)&&ok(nx,ny-.2)&&ok(nx,ny+.3))m.x=nx;else dx=0;
  if(ok(m.x-.3,ny)&&ok(m.x+.3,ny)&&ok(m.x,ny-.2)&&ok(m.x,ny+.3))m.y=ny;else dy=0;
  return dx||dy;
}
function updateMobs(dt){
  const p=world.player,c=world.city;
  world.spawnT-=dt;
  if(world.spawnT<=0&&world.mobs.length<10){spawnMob();world.spawnT=.6;}
  const pz=world.zoneAt(p.x,p.y);
  for(let i=world.mobs.length-1;i>=0;i--){
    const m=world.mobs[i];m.anim+=dt;m.t-=dt;m.flash=Math.max(0,m.flash-dt);m.wait=Math.max(0,m.wait-dt);
    const dd=Math.hypot(p.x-m.x,p.y-m.y);
    if(dd>34){world.mobs.splice(i,1);continue;}
    const spd=R.D(m.id).spd;const base=1.5+spd/110;
    const aggro=4.6+(R.D(m.id).rar==='legendary'?1.5:0);
    if(m.state!=='gone'&&pz===2&&dd<aggro&&m.wait<=0){if(m.state!=='chase'){m.alert=.7;R.sfx('select');R.tipSoft('chase');}m.state='chase';}
    else if(m.state==='chase'&&(pz!==2||dd>aggro*1.6)){m.state='idle';m.t=1;}
    if(m.state==='chase'){
      const ux=(p.x-m.x)/(dd||1),uy=(p.y-m.y)/(dd||1);const v=(base+1.0)*dt;
      mobStep(m,ux*v,uy*v);m.face=ux>=0?1:-1;
      if(dd<.8&&pz===2&&!world.paused&&R.mode==='world'){engage(m);return;}
    }else{
      if(m.t<=0){const a=Math.random()*6.283;m.vx=Math.cos(a)*(Math.random()<.35?0:1);m.vy=Math.sin(a)*(m.vx?1:0);m.t=R.rand(.8,2.4);}
      const v=.9*dt;if(m.vx||m.vy){mobStep(m,m.vx*v,m.vy*v);if(m.vx)m.face=m.vx>0?1:-1;}
    }
    m.alert=Math.max(0,m.alert-dt);
  }
}
async function engage(m){
  if(world.paused&&R.mode!=='world')return;
  world.paused=true;R.joy.x=R.joy.y=0;m.state='gone';
  R.sfx('encounter');
  const d=world.distAt(m.x,m.y);
  const res=await R.duel.start({kind:'wild',label:R.D(m.id).name,foes:[{id:m.id,lvl:m.lvl}],district:d,reward:{}});
  if(res.outcome==='win'||res.outcome==='capture'){const i=world.mobs.indexOf(m);if(i>=0)world.mobs.splice(i,1);}
  else{m.state='idle';m.wait=6;}
  if(R.mode==='world')world.paused=false;
  R.updateHud();
}

/* ---------- bus stop ---------- */
R.busStop=async function(stop){
  await R.tip('bus');const S=R.S,city=world.city;
  const opts=[];
  for(let d=0;d<9;d++){if(!S.visited[d])continue;if(d===world.distAt(world.player.x,world.player.y)&&false)continue;opts.push(d);}
  const choice=await R.pickList('Bus Stop','Where to? (free)',opts.map(d=>({v:d,t:`<b>${R.DISTRICTS[d].name}</b> <small>· ${d===8?'Lv 45+':'Lv '+R.DISTRICTS[d].lvl+'+'}</small>`})));
  if(choice==null)return;
  const tgt=city.stops.filter(s=>s.d===choice);
  const p=world.player;
  if(tgt.length){const s=tgt[0];p.x=s.x+.4;p.y=s.y+.6;}
  else if(choice===8){p.x=city.rift.x;p.y=city.rift.py1+1.5;}
  R.sfx('open');p.trail=[];for(let i=0;i<30;i++)p.trail.push({x:p.x,y:p.y});
  world.mobs=[];world.curDist=-1;
  R.save();
};

/* ---------- objective & guide ---------- */
R.objective=function(){
  const S=R.S;
  if(S.won)return {text:'The Rift is sealed. Collect every Daemon and card!',target:null};
  if(S.cleared.length>=8){const r=world.city.rift;return {text:'The barrier is down — reach the Rift Plaza and face the Wielder!',target:{x:r.x,y:r.y}};}
  if(!S.flags.intro){const a=world.npcs.find(n=>n.kind==='archivist');return {text:'Talk to the Archivist.',target:a?{x:a.x,y:a.y}:null};}
  // next keeper by tier order
  let t=0;while(S.cleared.includes(t)&&t<8)t++;
  const k=world.npcs.find(n=>n.kind==='keeper'&&n.d===t);
  const th=R.DISTRICTS[t];
  return {text:`Defeat ${th.keeperName} in ${th.name} (Lv ${th.lvl}+)`,target:k?{x:k.x,y:k.y}:null,tier:t};
};

/* ---------- update ---------- */
function update(dt){
  world.t+=dt;
  const p=world.player,S=R.S;
  if(!world.paused&&R.mode==='world'){
    S.play+=dt;
    const a=R.axis();let sp=4.9;
    if(R.keys.Shift)sp=6.8;
    const mag=Math.hypot(a.x,a.y);
    p.moving=mag>.05;
    if(p.moving){
      const mx=a.x*sp*dt,my=a.y*sp*dt;
      if(!blockedBox(p.x+mx,p.y)&&!npcAt(p.x+mx,p.y,.2))p.x+=mx;
      if(!blockedBox(p.x,p.y+my)&&!npcAt(p.x,p.y+my,.2))p.y+=my;
      p.dir=Math.abs(a.x)>Math.abs(a.y)?(a.x>0?2:1):(a.y>0?0:3);
      p.walk+=dt*9;
      const last=p.trail[0];if(!last||Math.hypot(last.x-p.x,last.y-p.y)>.18){p.trail.unshift({x:p.x,y:p.y});if(p.trail.length>40)p.trail.pop();}
      S.steps=(S.steps||0)+dt*5;
    }
    updateMobs(dt);
    // district change
    let d=world.distAt(p.x,p.y);if(!(d>=0))d=world.curDist>=0?world.curDist:0;
    if(d!==world.curDist){world.curDist=d;onDistrict(d);}
    // zone music
    const z=world.zoneAt(p.x,p.y),th=R.DISTRICTS[d];
    const want=th.music;if(want!==world.musicNow){world.musicNow=want;R.music(want);}
    world.prompt=promptText(findInteract());
    world.guideT=(world.guideT||0)+dt;
    if(!S.flags.intro&&!world.introAuto){world.introAuto=true;}
  }
  // camera
  const vwT=VW/(TS*SC),vhT=VH/(TS*SC),c=world.city;
  let tx=p.x-vwT/2,ty=p.y-vhT/2;tx=R.clamp(tx,-1,c.W-vwT+1);ty=R.clamp(ty,-1,c.H-vhT+1);
  world.cam.x+=(tx-world.cam.x)*Math.min(1,dt*9);world.cam.y+=(ty-world.cam.y)*Math.min(1,dt*9);
  // weather particles
  updateWeather(dt);
}
function onDistrict(d){
  const S=R.S,th=R.DISTRICTS[d];
  const first=!S.visited[d];S.visited[d]=true;
  R.banner(th.name,first?th.blurb:('Wild Lv '+(d===8?'45-50':(th.lvl-2)+'-'+(th.lvl+2))));
  R.save();R.updateHud();
}

/* ---------- weather ---------- */
function updateWeather(dt){
  const d=world.curDist<0?0:world.curDist,th=R.DISTRICTS[d],w=world.weather;
  const kind=th.weather;
  if(w.length<46&&Math.random()<dt*40){w.push({x:Math.random(),y:-.05,vx:(Math.random()-.5)*.05,vy:.05+Math.random()*.12,s:1+Math.random()*2,l:Math.random()});}
  for(let i=w.length-1;i>=0;i--){const q=w[i];
    if(kind==='ember'){q.y-=dt*.06;q.x+=Math.sin(world.t*2+q.l*9)*dt*.02;}
    else if(kind==='rain'){q.y+=dt*.9;q.x-=dt*.12;}
    else if(kind==='snow'){q.y+=dt*.1;q.x+=Math.sin(world.t+q.l*9)*dt*.03;}
    else if(kind==='storm'){q.y+=dt*.8;q.x-=dt*.2;}
    else if(kind==='leaf'){q.y+=dt*.08;q.x+=Math.sin(world.t*1.5+q.l*9)*dt*.05;}
    else if(kind==='spore'){q.y-=dt*.04;q.x+=Math.sin(world.t+q.l*7)*dt*.02;}
    else if(kind==='mist'){q.x+=dt*.03;}
    else if(kind==='rift'){q.y-=dt*.1;q.x+=Math.sin(world.t*2+q.l*9)*dt*.03;}
    else{q.y+=dt*.05;q.x+=dt*.03;}
    if(q.y>1.05||q.y<-.1&&kind==='ember'||q.x<-.05||q.x>1.05){w.splice(i,1);}
  }
  if(kind==='ember'||kind==='spore'||kind==='rift'){for(const q of w)if(q.y<-.05)q.y=1.02;}
}
function drawWeather(){
  const d=world.curDist<0?0:world.curDist,th=R.DISTRICTS[d],kind=th.weather,w=world.weather;
  ctx.save();
  for(const q of w){const x=q.x*VW,y=q.y*VH,s=q.s*DPR;
    if(kind==='rain'||kind==='storm'){ctx.strokeStyle=kind==='rain'?'rgba(190,230,255,.45)':'rgba(255,240,170,.35)';ctx.lineWidth=DPR;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4*s,y+14*s);ctx.stroke();}
    else if(kind==='snow'){ctx.fillStyle='rgba(255,255,255,.85)';ctx.fillRect(x,y,s*1.6,s*1.6);}
    else if(kind==='ember'){ctx.fillStyle=q.l<.5?'rgba(255,170,70,.8)':'rgba(255,90,40,.7)';ctx.fillRect(x,y,s*1.5,s*1.5);}
    else if(kind==='leaf'){ctx.fillStyle='rgba(190,240,120,.8)';ctx.fillRect(x,y,s*2,s*1.2);}
    else if(kind==='spore'){ctx.fillStyle='rgba(200,255,110,.55)';ctx.fillRect(x,y,s*1.6,s*1.6);}
    else if(kind==='mist'){ctx.fillStyle='rgba(170,150,255,.08)';ctx.fillRect(x-30*s,y,90*s,6*s);}
    else if(kind==='rift'){ctx.fillStyle=q.l<.5?'rgba(226,150,255,.8)':'rgba(125,240,255,.8)';ctx.fillRect(x,y,s*1.8,s*1.8);}
    else{ctx.fillStyle='rgba(230,220,190,.35)';ctx.fillRect(x,y,s*1.4,s*1.4);}
  }
  if(kind==='storm'&&Math.sin(world.t*.9)>.985){ctx.fillStyle='rgba(255,255,230,.18)';ctx.fillRect(0,0,VW,VH);}
  ctx.restore();
}

/* ---------- drawing ---------- */
function drawTileLayer(arr,x0,y0,x1,y1,ox,oy){
  const c=world.city,sz=TS*SC;
  for(let y=y0;y<=y1;y++){if(y<0||y>=c.H)continue;for(let x=x0;x<=x1;x++){if(x<0||x>=c.W)continue;const i=y*c.W+x,t=arr[i];if(t<0)continue;
    ctx.drawImage(world.atlas[c.dist[i]],(t%12)*16,((t/12)|0)*16,16,16,x*sz-ox,y*sz-oy,sz,sz);}}
}
function drawShadow(px,py,w){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(px,py,w*SC*.5,w*SC*.2,0,0,6.283);ctx.fill();}
function drawNpcSprite(n,px,py,walk){
  const sz=TS*SC;
  if(n.tile!==undefined&&!n.spr){
    const a=world.atlas[n.d===undefined?0:n.d];
    drawShadow(px,py-1*SC,12);
    ctx.drawImage(a,(n.tile%12)*16,((n.tile/12)|0)*16,16,16,px-sz/2,py-sz+2*SC,sz,sz);
    return;
  }
  const im=R.npcImg(n.spr);if(!im)return;
  const k=SC*.62;
  drawShadow(px,py-1*SC,12);
  ctx.drawImage(im,(walk%3)*24,n.dir*32,24,32,px-12*k,py-30*k,24*k,32*k);
}
function drawDaemonWorld(id,px,py,face,anim,mv,size){
  const im=R.sprite(id);if(!im)return;
  const k=size*TS*SC/80;
  const fr=mv?3+(Math.floor(anim*9)%4):Math.floor(anim*2.6)%3;
  ctx.save();ctx.translate(px,py);ctx.scale(face,1);
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(im,fr*80,0,80,80,-40*k,-72*k,80*k,80*k);
  ctx.restore();ctx.imageSmoothingEnabled=false;
}
function chestDraw(px,py,open,t){
  const u=SC;ctx.save();ctx.translate(px,py);drawShadow(0,-1*u,11);
  ctx.fillStyle='#3d2417';ctx.fillRect(-7*u,-9*u,14*u,9*u);
  ctx.fillStyle='#a8622d';ctx.fillRect(-6*u,-8*u,12*u,7*u);
  ctx.fillStyle='#c77d3a';ctx.fillRect(-6*u,-8*u,12*u,2*u);
  ctx.fillStyle='#7a4420';ctx.fillRect(-6*u,-3*u,12*u,1*u);
  if(!open){ctx.fillStyle='#3d2417';ctx.fillRect(-7*u,-12*u,14*u,4*u);ctx.fillStyle='#8d4f25';ctx.fillRect(-6*u,-11*u,12*u,2*u);ctx.fillStyle='#ffd24a';ctx.fillRect(-1.5*u,-8*u,3*u,3*u);
    ctx.fillStyle='rgba(255,240,150,'+(.4+.4*Math.sin(t*4))+')';ctx.fillRect(-9*u+((t*6)%18)*u,-13*u,1.5*u,1.5*u);}
  else{ctx.fillStyle='#3d2417';ctx.fillRect(-7*u,-16*u,14*u,2*u);ctx.fillStyle='#2a1a10';ctx.fillRect(-6*u,-8*u,12*u,2*u);}
  ctx.restore();
}
function drawBadge(px,py,txt,col){
  const u=SC;ctx.save();ctx.font=`bold ${Math.round(9*u)}px system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const w=ctx.measureText(txt).width+5*u;
  ctx.fillStyle='rgba(15,12,30,.85)';ctx.strokeStyle=col||'#ffd24a';ctx.lineWidth=Math.max(1,u*.5);
  const h=11*u;ctx.beginPath();ctx.roundRect(px-w/2,py-h/2,w,h,3*u);ctx.fill();ctx.stroke();
  ctx.fillStyle=col||'#ffd24a';ctx.fillText(txt,px,py+.5*u);ctx.restore();
}
function drawIcon(kind,px,py){ // procedural door markers
  const u=SC;ctx.save();ctx.translate(px,py);
  ctx.fillStyle='#161230';ctx.strokeStyle='#ffe28a';ctx.lineWidth=Math.max(1,u*.6);ctx.beginPath();ctx.arc(0,0,6.5*u,0,6.283);ctx.fill();ctx.stroke();
  if(kind==='clinic'){ctx.fillStyle='#ff5a6e';ctx.fillRect(-1.6*u,-4.5*u,3.2*u,9*u);ctx.fillRect(-4.5*u,-1.6*u,9*u,3.2*u);}
  else if(kind==='market'){ctx.fillStyle='#7be08a';ctx.fillRect(-4*u,-1*u,8*u,4.6*u);ctx.strokeStyle='#7be08a';ctx.lineWidth=u*.9;ctx.beginPath();ctx.arc(0,-1*u,2.8*u,Math.PI,0);ctx.stroke();ctx.fillStyle='#161230';ctx.fillRect(-1*u,.4*u,2*u,1.4*u);}
  else if(kind==='exchange'){ctx.fillStyle='#b98bff';ctx.fillRect(-3*u,-4.5*u,6*u,9*u);ctx.fillStyle='#fff';ctx.fillRect(-2*u,-3.4*u,4*u,6.8*u);ctx.fillStyle='#b98bff';ctx.fillRect(-.6*u,-1.2*u,1.2*u,2.4*u);}
  else{ctx.fillStyle='#ffd24a';ctx.beginPath();for(let i=0;i<10;i++){const a=-1.5708+i*.6283,r=i%2?2.2*u:5*u;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.fill();}
  ctx.restore();
}
function drawRiftBarrier(ox,oy,x0,y0,x1,y1){
  const c=world.city;if(c.barrierOpen)return;const sz=TS*SC,t=world.t;
  for(const b of c.barrier){if(b.x<x0||b.x>x1||b.y<y0||b.y>y1)continue;
    const px=b.x*sz-ox,py=b.y*sz-oy,a=.5+.25*Math.sin(t*3+b.x*.7+b.y*.5);
    ctx.fillStyle=`rgba(150,60,255,${a*.55})`;ctx.fillRect(px,py,sz,sz);
    ctx.fillStyle=`rgba(210,160,255,${a})`;ctx.fillRect(px+sz*.35,py,sz*.3,sz);
    ctx.fillStyle=`rgba(255,255,255,${a*.7})`;const yy=((t*.9+b.x*.37+b.y*.21)%1)*sz;ctx.fillRect(px+sz*.3,py+yy,sz*.4,SC*1.2);}
}
function drawPortal(ox,oy){
  const c=world.city,r=c.rift,sz=TS*SC,t=world.t;
  const px=r.x*sz-ox,py=r.y*sz-oy-2.5*sz;
  if(px<-8*sz||px>VW+8*sz||py<-8*sz||py>VH+8*sz)return;
  const R0=3.4*sz;
  const g=ctx.createRadialGradient(px,py,sz*.2,px,py,R0);g.addColorStop(0,'rgba(255,255,255,.95)');g.addColorStop(.25,'rgba(190,120,255,.85)');g.addColorStop(.7,'rgba(90,30,170,.55)');g.addColorStop(1,'rgba(40,0,90,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,R0,0,6.283);ctx.fill();
  ctx.lineWidth=SC*1.4;for(let i=0;i<5;i++){ctx.strokeStyle=`rgba(${i%2?125:230},${i%2?240:150},255,${.5-i*.07})`;ctx.beginPath();for(let a=0;a<=6.4;a+=.2){const rr=(.4+a*.18+i*.35)*sz*(1+.08*Math.sin(t*2+i));const aa=a+t*(.8-i*.12)+i;const x=px+Math.cos(aa)*rr,y=py+Math.sin(aa)*rr*.9;a?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
}
function drawWorld(){
  const c=world.city,sz=TS*SC,p=world.player;
  ctx.imageSmoothingEnabled=false;
  const ox=Math.round(world.cam.x*sz),oy=Math.round(world.cam.y*sz);
  const x0=Math.floor(ox/sz),y0=Math.floor(oy/sz),x1=Math.ceil((ox+VW)/sz),y1=Math.ceil((oy+VH)/sz);
  ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,VW,VH);
  drawTileLayer(c.g,x0,y0,x1,y1,ox,oy);
  drawTileLayer(c.o,x0,y0,x1,y1,ox,oy);
  drawRiftBarrier(ox,oy,x0,y0,x1,y1);
  // door markers
  for(const d of world.doors){if(d.x<x0-2||d.x>x1+2||d.y<y0-2||d.y>y1+2)continue;
    const px=(d.x+d.w/2)*sz-ox,py=(d.y)*sz-oy-sz*.62+Math.sin(world.t*3+d.x)*SC*1.2;drawIcon(d.kind==='hq'?'hq':d.kind,px,py);}
  // portal behind entities
  drawPortal(ox,oy);
  // entities (y sorted)
  const ents=[];
  for(const n of world.npcs){if(n.x<x0-2||n.x>x1+2||n.y<y0-3||n.y>y1+2)continue;ents.push({y:n.y,f:()=>{const px=n.x*sz-ox,py=n.y*sz-oy+sz*.35;
      if(n.kind==='keeper'||n.kind==='wielder'){const col=R.DISTRICTS[n.d].deco[0];const gr=ctx.createRadialGradient(px,py-sz*.4,0,px,py-sz*.4,sz*.95);gr.addColorStop(0,col+'88');gr.addColorStop(1,col+'00');ctx.fillStyle=gr;ctx.fillRect(px-sz,py-sz*1.5,sz*2,sz*2);}
      drawNpcSprite(n,px,py,1+Math.floor(Math.sin(world.t*2+n.t)*.5+.5)*0);
      const S=R.S;let mark=null;
      if(n.kind==='chal'&&!S.beaten[n.key])mark=['!','#ff6a6a'];
      else if(n.kind==='rival'&&!S.beaten[n.key])mark=['!','#ff9a3a'];
      else if(n.kind==='keeper'&&!S.cleared.includes(n.d))mark=['★','#ffd24a'];
      else if(n.kind==='wielder'&&!S.won&&S.cleared.length>=8)mark=['★','#e3a5ff'];
      else if(n.kind==='archivist'&&!S.flags.intro)mark=['!','#7df0ff'];
      else if(n.kind==='civ')mark=['…','#cfd6ff'];
      if(mark)drawBadge(px,py-sz*1.5+Math.sin(world.t*4+n.t)*SC,mark[0],mark[1]);
    }});}
  for(const ch of world.chests){if(ch.x<x0-2||ch.x>x1+2||ch.y<y0-2||ch.y>y1+2)continue;ents.push({y:ch.y,f:()=>chestDraw(ch.x*sz-ox,ch.y*sz-oy+sz*.45,ch.open,world.t)});}
  for(const m of world.mobs){if(m.x<x0-3||m.x>x1+3||m.y<y0-3||m.y>y1+3)continue;
    ents.push({y:m.y,f:()=>{const px=m.x*sz-ox,py=m.y*sz-oy+sz*.45;const d=R.D(m.id);
      const chase=m.state==='chase';
      ctx.save();ctx.globalAlpha=.7;const gr=ctx.createRadialGradient(px,py-sz*.3,0,px,py-sz*.3,sz*.95);gr.addColorStop(0,(chase?'#ff3a3a':R.TYPE_COL[d.type])+'66');gr.addColorStop(1,'#00000000');ctx.fillStyle=gr;ctx.fillRect(px-sz,py-sz*1.4,sz*2,sz*2);ctx.restore();
      drawShadow(px,py-1*SC,14);
      drawDaemonWorld(m.id,px,py,m.face,m.anim,chase||(m.vx||m.vy),1.8);
      if(m.alert>0)drawBadge(px,py-sz*1.7,'!','#ff5a5a');
      else if(chase||world.t%2<9){ctx.save();ctx.font=`bold ${Math.round(7*SC)}px system-ui`;ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.85)';ctx.strokeStyle='rgba(0,0,0,.8)';ctx.lineWidth=SC;ctx.strokeText('Lv'+m.lvl,px,py-sz*1.45);ctx.fillText('Lv'+m.lvl,px,py-sz*1.45);ctx.restore();}
    }});}
  // follower daemon
  {const lead=R.lead();const tr=p.trail,tgt=tr[Math.min(tr.length-1,6)]||p;
    ents.push({y:tgt.y+.01,f:()=>{const px=tgt.x*sz-ox-(p.dir===2?-.0:0)+SC*0,py=tgt.y*sz-oy+sz*.4;drawShadow(px,py-1*SC,13);drawDaemonWorld(lead.id,px,py,(p.x>=tgt.x?1:-1)*1,world.t,p.moving,1.35);}});}
  ents.push({y:p.y,f:()=>{const px=p.x*sz-ox,py=p.y*sz-oy+sz*.35;drawShadow(px,py-1*SC,12);const im=R.npcImg('hero_'+((R.S&&R.S.hero)|0));if(im){const k=SC*.62,fr=p.moving?[0,1,2,1][Math.floor(p.walk)%4]:1;ctx.drawImage(im,fr*24,p.dir*32,24,32,px-12*k,py-30*k,24*k,32*k);}}});
  ents.sort((a,b)=>a.y-b.y);for(const e of ents)e.f();
  drawTileLayer(c.tp,x0,y0,x1,y1,ox,oy);
  drawWeather();
  // district tint / vignette
  const th=R.DISTRICTS[world.curDist<0?0:world.curDist];
  const vg=ctx.createRadialGradient(VW/2,VH/2,Math.min(VW,VH)*.35,VW/2,VH/2,Math.max(VW,VH)*.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,th.id===5?'rgba(5,0,25,.55)':'rgba(0,0,10,.32)');ctx.fillStyle=vg;ctx.fillRect(0,0,VW,VH);
  // guide arrow
  if(world.guide&&!world.paused){const ob=R.objective();if(ob.target){const dx=ob.target.x-p.x,dy=ob.target.y-p.y,d=Math.hypot(dx,dy);if(d>5){const a=Math.atan2(dy,dx);const cx=VW/2,cy=VH/2;const rr=Math.min(VW,VH)*.30;
    ctx.save();ctx.translate(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);ctx.rotate(a);ctx.globalAlpha=.9;ctx.fillStyle='#ffd24a';ctx.strokeStyle='#3b2a00';ctx.lineWidth=SC*.8;ctx.beginPath();ctx.moveTo(7*SC,0);ctx.lineTo(-4*SC,-6*SC);ctx.lineTo(-1*SC,0);ctx.lineTo(-4*SC,6*SC);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}}}
}

/* ---------- minimap ---------- */
const mini=()=>$('#mini');
function drawMini(){
  const mc=mini();if(!mc||R.mode!=='world')return;const x=mc.getContext('2d');
  const w=mc.width,h=mc.height,k=3,p=world.player;x.imageSmoothingEnabled=false;
  x.fillStyle='#0a0a14';x.fillRect(0,0,w,h);
  const sw=w/k,sh=h/k;
  x.drawImage(world.mini,p.x-sw/2,p.y-sh/2,sw,sh,0,0,w,h);
  // markers
  const m2=(wx,wy,col,r)=>{const sx=(wx-(p.x-sw/2))*k,sy=(wy-(p.y-sh/2))*k;if(sx<0||sy<0||sx>w||sy>h)return;x.fillStyle=col;x.beginPath();x.arc(sx,sy,r,0,6.283);x.fill();};
  for(const n of world.npcs){if(n.kind==='keeper'&&!R.S.cleared.includes(n.d))m2(n.x,n.y,'#ffd24a',3);if(n.kind==='chal'&&!R.S.beaten[n.key])m2(n.x,n.y,'#ff6a6a',1.6);}
  for(const d of world.doors){if(d.kind==='clinic')m2(d.x+1,d.y,'#ff5a6e',2);if(d.kind==='market')m2(d.x+1,d.y,'#7be08a',2);}
  for(const s of world.stops)m2(s.x,s.y,'#7df0ff',2);
  for(const m of world.mobs)m2(m.x,m.y,'rgba(255,90,90,.9)',1.4);
  const ob=R.objective();if(ob.target)m2(ob.target.x,ob.target.y,'#fff',2);
  x.fillStyle='#fff';x.beginPath();x.arc(w/2,h/2,3,0,6.283);x.fill();x.strokeStyle='#000';x.lineWidth=1;x.stroke();
}

/* ---------- HUD ---------- */
R.banner=function(title,sub){const b=$('#banner');if(!b)return;b.innerHTML=`<div class="bt">${title}</div><div class="bs">${sub||''}</div>`;b.classList.remove('on');void b.offsetWidth;b.classList.add('on');};
R.updateHud=function(){
  const S=R.S;if(!S||!R.lead)return;
  const l=R.lead(),d=R.D(l.id),th=R.DISTRICTS[world.curDist<0?0:world.curDist];
  $('#hud-loc').innerHTML=`<b>${th.name}</b><small>${world.curDist===8?'Lv 45+':'Lv '+th.lvl+'+'}</small>`;
  $('#hud-d').innerHTML=`${R.spHtml(l.id,.55)}<div><b>${d.name}</b> <small>Lv ${l.lvl}</small><div class="mbar"><i style="width:${Math.round(100*l.hp/l.maxHp)}%"></i></div></div>`;
  $('#hud-coin').innerHTML=`🪙 ${S.coins} <span>◉ ${S.orbs}</span> <span>🧪 ${S.tonics}</span>`;
  const ob=R.objective();$('#hud-obj').textContent=ob.text;
};

/* ---------- loop ---------- */
let last=0,hudT=0,mmT=0;
function loop(now){
  const dt=Math.min(.05,(now-last)/1000||0);last=now;
  if(R.mode==='world'||R.mode==='title'||R.mode==='ending'){if(R.mode==='world'&&R.S){update(dt);hudT+=dt;mmT+=dt;if(mmT>.15){mmT=0;drawMini();}if(hudT>1){hudT=0;R.updateHud();}const pr=$('#prompt');if(pr){if(world.prompt&&!world.paused){pr.textContent=world.prompt;pr.classList.add('on');}else pr.classList.remove('on');}}
    if(R.mode==='world')drawWorld();else if(R.mode==='title'||R.mode==='ending')R.drawTitleBg&&R.drawTitleBg(dt);}
  else if(R.mode==='duel'){R.duel.frame(dt);}
  requestAnimationFrame(loop);
}
R.startLoop=function(){requestAnimationFrame(t=>{last=t;loop(t);});};
R.worldRefresh=()=>{world.curDist=-1;world.musicNow=null;};
R.worldDrawFrame=drawWorld;
R.worldRect=()=>({VW,VH,SC,DPR});
})(window.R=window.R||{});
