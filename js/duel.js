/* ===== RIFTBINDER · duel.js — Riftbound-style real-time duel + Cardbinder card hand, Kenney-tile arenas ===== */
(function(R){
'use strict';
const $=R.$;
let B=null,resolveFn=null,backdrop=null,lastHudT=0;
const D=R.duel={};D.dbg=()=>B;
D.active=()=>B;

/* ---------- fighters ---------- */
function fighter(o){return Object.assign({x:0,y:0,vx:0,vy:0,hp:1,maxHp:1,energy:0,level:1,face:1,grounded:true,invul:0,shield:0,dash:0,speedBoost:0,double:false,overdrive:0,dot:0,dotPower:0,dotTick:1,root:0,slow:0,stun:0,
  cool:{light:0,ranged:0,special:0,ultimate:0,dash:0,gift:0,swap:0,tonic:0},hurt:0,attack:0,pose:0,jumps:0},o);}
const U=()=>R.vw/960, Vf=()=>R.vh/540;
const floorY=()=>R.vh*.70;

function setAlly(idx){
  const S=R.S,p=S.party[idx];B.allyIdx=idx;B.allyId=p.id;
  const keep=B.a;
  const f=fighter({x:keep?keep.x:R.vw*.25,hp:p.hp,maxHp:p.maxHp,level:p.lvl,energy:keep?keep.energy:0});
  f.y=floorY();B.a=f;
  if(!B.e)return;
}
function loadFoe(i){
  const foe=B.foes[i];B.foeIdx=i;B.foe=foe;const d=R.D(foe.id);
  const th=R.DISTRICTS[B.district];
  const hpMul=foe.boss?1.08:1;
  const hp=Math.round((d.hp+foe.lvl*7)*hpMul*(B.kind==='rival'?1.1:1));
  B.e=fighter({x:R.vw*.74,hp,maxHp:hp,level:foe.lvl,face:-1,isEnemy:true});B.e.y=floorY();
  B.windup=0;B.attackKind='';B.ai=1.4;B.enraged=false;
  R.spriteReady(foe.id);
  B.seen[foe.id]=true;
}

/* ---------- start ---------- */
D.start=function(opts){
  return new Promise(async res=>{
    const S=R.S;resolveFn=res;
    const th=R.DISTRICTS[opts.district!=null?opts.district:0];
    B={kind:opts.kind,label:opts.label,foes:opts.foes,district:th.id,reward:opts.reward||{},t:0,intro:1.5,over:false,paused:false,shots:[],fx:[],numbers:[],delayed:[],seen:{},
      focus:35,cardCd:[0,0,0],combo:0,comboTime:0,flash:0,jolt:0,dmgDealt:0,hitTaken:0,time:0,xpPool:0,coinPool:0,kills:[],cardsUsed:0,callT:0,enemyCall:0,bound:null,mark:0,
      hand:S.hand.slice(),sp:0,perkStart:3};
    B.a=null;B.e=null;
    // ally
    let idx=R.leadIdx();if(!S.party[idx]||S.party[idx].hp<=0){R.toast('All Daemons have fainted! Visit a Clinic.');resolveFn=null;res({outcome:'cancel'});B=null;return;}
    setAlly(idx);
    await Promise.all([R.spriteReady(B.allyId),R.spriteReady(B.foes[0].id)]);
    loadFoe(0);
    S.seen[B.foes[0].id]=true;
    makeBackdrop();
    R.mode='duel';R.onAct=onAct;R.joy.x=R.joy.y=0;R.hold={};
    document.body.classList.remove('inWorld');document.body.classList.add('inDuel');
    buildHandUi();updateHud(true);
    R.music(B.kind==='final'?'final':B.kind==='keeper'||B.kind==='rival'?(B.kind==='rival'?'rival':'boss'):G.audio.battleTrack?G.audio.battleTrack():'battle');
    R.sfx('encounter');{const bn=$('#banner');if(bn)bn.classList.remove('on');}
    $('#d-label').textContent=B.kind==='wild'?'✦ A WILD '+R.D(B.foe.id).name.toUpperCase()+' APPEARED ✦':B.kind==='keeper'?'✦ KEEPER DUEL · '+B.label.toUpperCase()+' ✦':B.kind==='final'?'✦ THE RIFT WIELDER ✦':B.kind==='rival'?'✦ RIVAL DUEL · KADE ✦':'✦ SPAR · '+B.label.toUpperCase()+' ✦';
    R.dtip('duel1');if(B.hand.some(Boolean))R.dtip('cards_d');
  });
};
function onAct(a){
  if(!B||B.over||B.intro>0||B.paused)return;
  const f=B.a;if(f.stun>0&&a!=='pause')return;
  const S=R.S,U1=U(),H=R.vh;
  switch(a){
    case 'jump':{const allowed=f.grounded||f.jumps<(S.cleared.includes(5)?2:1);if(allowed){f.vy=-H*.95*1.0;f.grounded=false;f.jumps++;R.sfx('select');}return;}
    case 'dash':if(f.cool.dash<=0){f.dash=.24;f.invul=.28;f.vx=f.face*R.vw*.78;f.cool.dash=.95;callout('DODGE DASH','good');sparks(f.x,f.y-30*Vf(),'#9df7ed',10);}return;
    case 'slash':if(f.cool.light<=0){slash(f,false);f.cool.light=.28*(1-windBonus()*.5);
      B.combo=(B.comboTime>0?B.combo:0)+1;B.comboTime=1.6;if(B.combo>=3){B.combo=0;B.e.stun=Math.max(B.e.stun,.22);f.energy=Math.min(100,f.energy+9);callout('✦ 3-HIT COMBO · +ENERGY','good');sparks(B.e.x,B.e.y-55*Vf(),'#fff0a3',15);}}return;
    case 'shot':if(f.cool.ranged<=0){emit(f,false,9+f.level*1.32,'shot');f.cool.ranged=1.05*(1-windBonus()*.5);}return;
    case 'special':if(f.cool.special<=0){emit(f,false,23+f.level*2.0,'special');f.cool.special=2.5*(1-windBonus()*.5);f.energy=Math.min(100,f.energy+4);}return;
    case 'ultimate':if(f.energy>=100&&f.cool.ultimate<=0){f.energy=0;f.cool.ultimate=2;f.attack=.75;f.pose=2;B.flash=.22;let dmg=(49+f.level*4.3);if(f.double){dmg*=2;f.double=false;}
        hurt(B.e,dmg*(f.overdrive>0?1.65:1),f,'ULT');sparks(B.e.x,B.e.y-90*Vf(),'#ffe59f',47);R.sfx('crit');R.spell(R.D2E[R.D(B.allyId).type]);callout(R.D(B.allyId).name+' · ULTIMATE!','good');}
      else callout('BUILD ENERGY FOR ULTIMATE','warn');return;
    case 'card0':case 'card1':case 'card2':playCard(+a.slice(4));return;
    case 'gift':useGift();return;
    case 'bind':bind();return;
    case 'swap':swap();return;
    case 'tonic':tonic();return;
    case 'pause':openPause();return;
  }
}
const windBonus=()=>R.setPct('wind')*2;

/* ---------- combat core ---------- */
function sparks(x,y,color,n){for(let i=0;i<n;i++){const a=6.283*i/n+Math.random()*.9,s=(60+Math.random()*170)*U();B.fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40*Vf(),t:.55+Math.random()*.45,color,size:(2+Math.random()*4)*R.DPR});}}
function number(x,y,text,color){B.numbers.push({x,y,t:0,text,color});}
function callout(text,variant){const el=$('#d-call');el.textContent=text;el.dataset.v=variant||'good';el.classList.remove('on');void el.offsetWidth;el.classList.add('on');}
function elemType(f){return f===B.a?R.D(B.allyId).type:R.D(B.foe.id).type;}
function hurt(target,damage,source,tag,opts){
  opts=opts||{};
  if(target.invul>0||target.shield>0)return false;
  const S=R.S,toAlly=target===B.a;
  const def=R.D(toAlly?B.allyId:B.foe.id).def;
  let amt=damage*(1-def*.012);
  if(!opts.noType)amt*=R.typeMult(elemType(source),elemType(target));
  if(source===B.a){amt*=1+R.setPct('fire');const at=R.D(B.allyId).atk;amt*=.9+at/100;}
  else{amt*=({easy:.78,normal:1,hard:1.25}[S.settings.diff]||1)*(1-R.setPct('earth')*1.2);}
  amt=Math.max(1,Math.round(amt));
  target.hp=Math.max(0,target.hp-amt);target.hurt=.28;target.invul=.23;target.vx+=(source===B.a?220:-220)*U();
  const col=source===B.a?'#ffbb83':'#a4fff2';
  number(target.x,target.y-90*Vf(),'-'+amt,opts.color||col);
  B.jolt=Math.min(1,(B.jolt||0)+.5);
  if(toAlly)B.hitTaken+=amt;else B.dmgDealt+=amt;
  sparks(target.x,target.y-62*Vf(),opts.color||col,13);
  R.sfx(tag==='ULT'||amt>60?'crit':toAlly?'hurt':'hit');
  if(source===B.a){const lv=source.level;source.energy=Math.min(100,source.energy+(lv>=14?9:6)+amt*(lv>=14?.48:.32));B.focus=Math.min(100,B.focus+1.4);if(Math.random()<.14&&target===B.e)callout('CLEAN HIT · '+amt,'good');}
  else source.energy=Math.min(100,source.energy+4);
  return true;
}
function elementalEffect(src,tgt,kind){
  if(kind!=='special')return;const type=elemType(src);
  switch(type){
    case 'Fire':tgt.dot=4;tgt.dotPower=4+src.level*.24;break;
    case 'Water':tgt.slow=2;tgt.vx+=src.face*180*U();break;
    case 'Nature':tgt.root=1.4;break;
    case 'Storm':tgt.stun=.65;break;
    case 'Stone':src.shield=Math.max(src.shield,1.2);break;
    case 'Shadow':src.hp=Math.min(src.maxHp,src.hp+12+src.level*.55);break;
    case 'Frost':tgt.slow=3;break;
    case 'Venom':tgt.dot=6;tgt.dotPower=3+src.level*.30;break;
    case 'Wild':src.overdrive=Math.max(src.overdrive,3);break;
    case 'Astral':tgt.hp=Math.max(0,tgt.hp-(9+src.level));break;
    case 'Machine':src.energy=Math.min(100,src.energy+20);break;}
}
function slash(f,isEnemy,multi){
  multi=multi||1;const other=isEnemy?B.a:B.e;let power=8+f.level*1.75;
  if(!isEnemy&&f.level>=7)power*=1.25;
  f.attack=.22;f.pose=2;R.swing(isEnemy?'wood':'iron');
  const range=Math.max(110*R.DPR,R.vw*.15);
  if(Math.abs(other.x-f.x)<range&&Math.abs(other.y-f.y)<118*Vf()&&Math.sign(other.x-f.x)===f.face){
    let d=power*(f.overdrive>0?1.65:1)*multi;if(f.double){d*=2;f.double=false;}
    const landed=hurt(other,d,f);
    if(landed&&!isEnemy&&f.level>=18){const duel=B;setTimeout(()=>{if(B!==duel||B.over||other.hp<=0)return;if(Math.abs(other.x-f.x)<range*1.25&&other.invul<=0){hurt(other,power*.55,f,'TWIN');sparks(other.x,other.y-56*Vf(),'#ffeb98',11);}},270);}
  }
  B.fx.push({arc:1,x:f.x+f.face*70*U(),y:f.y-62*Vf(),face:f.face,t:.18,max:.18,enemy:isEnemy});
  sparks(f.x+f.face*68*U(),f.y-62*Vf(),isEnemy?'#ff7b91':'#e8e2ae',7);
}
function emit(f,isEnemy,power,kind){
  const lv=B.a.level;let pw=power;
  if(!isEnemy){pw*=kind==='shot'?(lv>=24?1.58:lv>=8?1.22:1):(lv>=32?1.60:lv>=11?1.25:1);}
  const type=elemType(f);
  B.shots.push({x:f.x+f.face*52*U(),y:f.y-70*Vf(),vx:f.face*(kind==='special'?480:390)*U()*(!isEnemy&&lv>=8?1.14:1),size:(kind==='special'?18:12)*R.DPR,life:2.3,power:pw,byEnemy:isEnemy,color:R.TYPE_COL[type],kind});
  f.attack=.24;f.pose=3;
  R.spell(R.D2E[type]);
}

/* ---------- cards ---------- */
function playCard(i){
  const S=R.S,cid=B.hand[i];if(!cid)return;
  const c=R.CARD(cid),lv=S.cards[cid]?S.cards[cid].lvl:1;
  const cost=R.STAR_COST[c.stars];
  if(B.cardCd[i]>0){callout('CARD RECHARGING','warn');return;}
  if(B.focus<cost){callout('NEED '+cost+' FOCUS','warn');return;}
  B.focus-=cost;B.cardCd[i]=5+c.stars*1.5;B.cardsUsed++;
  const f=B.a,e=B.e;
  const em=R.cardElemMult(c.element,R.D2E[R.D(B.foe.id).type]);
  let cp=R.cardPower(c,lv,f.level)*(1+R.setPct('light')*2);
  cp*=(f.overdrive>0?1.0:1);
  showSummon(c,lv,em);
  R.sfx('summon');R.spell(c.element);
  const isBoss=B.foe.boss;
  const act=()=>{
    if(B.over||!B.e||B.e.hp<=0)return;
    const opt={noType:true,color:R.ELEM_COL[c.element]};
    switch(c.arch){
      case 'striker':hurt(e,cp*2.4*em,f,'CARD',opt);e.stun=Math.max(e.stun,.3);e.vx+=f.face*420*U();sparks(e.x,e.y-60*Vf(),R.ELEM_COL[c.element],30);B.flash=.16;break;
      case 'mage':for(let k=0;k<3;k++)B.delayed.push({t:k*.2,f:()=>{if(B.over||e.hp<=0)return;hurt(e,cp*1.05*em,f,'CARD',opt);sparks(e.x+(k-1)*40*U(),e.y-70*Vf(),R.ELEM_COL[c.element],14);R.spell(c.element);}});break;
      case 'tank':f.shield=Math.max(f.shield,2.6);f.hp=Math.min(f.maxHp,f.hp+f.maxHp*.08);number(f.x,f.y-100*Vf(),'SHIELD','#9fe6ff');sparks(f.x,f.y-60*Vf(),'#9fe6ff',24);R.sfx('guard');break;
      case 'healer':{const h=Math.round(f.maxHp*.14+cp*1.4);f.hp=Math.min(f.maxHp,f.hp+h);f.dot=0;f.slow=0;f.stun=0;f.root=0;number(f.x,f.y-100*Vf(),'+'+h,'#8bffb0');sparks(f.x,f.y-60*Vf(),'#8bffb0',26);R.sfx('heal');break;}
      case 'poisoner':hurt(e,cp*.7*em,f,'CARD',opt);e.dot=5;e.dotPower=Math.max(2,cp*.38*em);number(e.x,e.y-110*Vf(),'POISON','#aaef9c');break;
      case 'stunner':hurt(e,cp*.8*em,f,'CARD',opt);e.stun=Math.max(e.stun,isBoss?.7:1.5);number(e.x,e.y-110*Vf(),'STUNNED','#ffe46a');break;
      case 'drainer':{const before=e.hp;hurt(e,cp*1.8*em,f,'CARD',opt);const dealt=before-e.hp;const h=Math.round(dealt*.6);f.hp=Math.min(f.maxHp,f.hp+h);number(f.x,f.y-100*Vf(),'+'+h,'#ff9ab0');break;}
      case 'buffer':f.overdrive=Math.max(f.overdrive,7);f.energy=Math.min(100,f.energy+30);number(f.x,f.y-100*Vf(),'POWER UP','#ffd24a');hurt(e,cp*.5*em,f,'CARD',opt);break;
    }
    if(em>1)callout('SUPER EFFECTIVE · '+c.element.toUpperCase(),'good');else if(em<1)callout('RESISTED','warn');
  };
  B.delayed.push({t:.38,f:act});
  updateHandUi();
}
function showSummon(c,lv,em){
  const ov=$('#d-summon');
  ov.innerHTML=`<div class="sm-card" style="--ec:${R.ELEM_COL[c.element]}"><img src="${R.cardSrc(c.id)}"><div class="sm-t"><b>${c.name}</b><small>${R.ELEM_ICON[c.element]} ${c.move} · ${R.ARCH_INFO[c.arch][1]}</small></div></div>`;
  ov.classList.remove('on');void ov.offsetWidth;ov.classList.add('on');
}

/* ---------- gifts / bind / swap / tonic ---------- */
function ownedGifts(){const S=R.S;return S.cleared.map(d=>R.DISTRICTS[d].gift).filter(g=>g>=0);}
function useGift(){
  const S=R.S,f=B.a;const gi=S.gift;
  if(!ownedGifts().includes(gi)){callout('BEAT A KEEPER TO UNLOCK GIFTS','warn');return;}
  if(f.cool.gift>0){callout('GIFT RECHARGING · '+Math.ceil(f.cool.gift)+'s','warn');return;}
  f.cool.gift=R.GIFTS[gi].cool;f.attack=.35;B.flash=.18;sparks(f.x,f.y-60*Vf(),'#f2d593',32);
  switch(gi){
    case 0:f.shield=2.0;f.invul=2.0;break;
    case 1:f.speedBoost=5;f.overdrive=Math.max(f.overdrive,2);break;
    case 2:f.hp=Math.min(f.maxHp,f.hp+f.maxHp*.28);break;
    case 3:f.double=true;break;
    case 4:f.dash=.35;f.invul=1.5;f.vx=f.face*R.vw*.65;break;
    case 5:f.jumps=0;f.vy=-R.vh*1.1;f.grounded=false;hurt(B.e,20+f.level*1.2,f);break;
    case 6:f.overdrive=7;break;
    case 7:hurt(B.e,80+f.level*3.5,f);sparks(B.e.x,B.e.y-70*Vf(),'#a897ff',45);break;
  }
  callout('GIFT · '+R.GIFTS[gi].name.toUpperCase(),'good');R.sfx('level');
}
function tonic(){
  const S=R.S,f=B.a;
  if(f.cool.tonic>0)return;
  if(S.tonics<=0){callout('NO TONICS · BUY MORE AT A MARKET','warn');return;}
  if(f.hp>=f.maxHp){callout('FULL HP','warn');return;}
  S.tonics--;f.cool.tonic=1.2;const h=Math.round(f.maxHp*.4);f.hp=Math.min(f.maxHp,f.hp+h);number(f.x,f.y-100*Vf(),'+'+h,'#8bffb0');sparks(f.x,f.y-60*Vf(),'#8bffb0',18);R.sfx('heal');updateHud(true);
}
function swap(){
  const S=R.S,f=B.a;if(f.cool.swap>0)return;
  syncAlly();
  let next=S.party.findIndex((p,i)=>i>B.allyIdx&&p.hp>0);if(next<0)next=S.party.findIndex((p,i)=>i!==B.allyIdx&&p.hp>0);
  if(next<0){callout('NO OTHER DAEMON IS READY','warn');return;}
  S.active=next;const keep=B.a;setAlly(next);B.a.cool.swap=1.5;B.a.energy=keep.energy;B.a.x=keep.x;B.a.face=keep.face;B.a.invul=.6;
  R.spriteReady(B.allyId);sparks(B.a.x,B.a.y-60*Vf(),'#c9b6ff',30);R.sfx('summon');callout(R.D(B.allyId).name.toUpperCase()+' STEPS IN','good');updateHud(true);
}
function syncAlly(){const p=R.S.party[B.allyIdx];if(p&&B.a)p.hp=Math.max(0,Math.min(p.maxHp,Math.round(B.a.hp)));}
function bind(){
  const S=R.S,e=B.e;
  if(B.kind!=='wild'){callout('CANNOT BIND IN THIS DUEL','warn');return;}
  if(S.orbs<=0){callout('NO BINDING ORBS · BUY AT A MARKET','warn');return;}
  const ratio=e.hp/e.maxHp;if(ratio>.38){callout('WEAKEN BELOW 38% HP FIRST','warn');return;}
  S.orbs--;
  const chance=Math.min(.97,.42+(1-ratio)*.55+R.setPct('dark')*1.5-(B.foe.lvl>B.a.level?.06:0));
  B.flash=.2;R.sfx('capture');updateHud(true);
  if(Math.random()<chance){
    B.bound=true;endDuel('capture');
  }else{callout('THE BINDING BROKE! '+S.orbs+' ORBS LEFT','warn');e.invul=.5;R.sfx('fail');}
}

/* ---------- loop ---------- */
function timerDec(f,dt){for(const k in f.cool)f.cool[k]=Math.max(0,f.cool[k]-dt);for(const k of ['invul','shield','dash','speedBoost','overdrive','hurt','attack','root','slow','stun','dot'])f[k]=Math.max(0,f[k]-dt);}
D.frame=function(dt){
  if(!B){return;}
  if(!B.paused)update(dt);
  draw(dt);
  lastHudT+=dt;if(lastHudT>.06){lastHudT=0;updateHud(false);}
};
function update(dt){
  const b=B,S=R.S;if(b.over)return;
  b.clock=(b.clock||0)+dt;
  const a=b.a,e=b.e,U1=U(),V=Vf(),H=R.vh,ground=floorY();
  // delayed effects always tick
  for(let i=b.delayed.length-1;i>=0;i--){const d=b.delayed[i];d.t-=dt;if(d.t<=0){b.delayed.splice(i,1);d.f();}}
  for(let j=b.fx.length-1;j>=0;j--){const p=b.fx[j];p.t-=dt;if(p.arc){if(p.t<=0)b.fx.splice(j,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*V*dt;if(p.t<=0)b.fx.splice(j,1);}
  for(let j=b.numbers.length-1;j>=0;j--){const n=b.numbers[j];n.t+=dt;n.y-=dt*37*V;if(n.t>.85)b.numbers.splice(j,1);}
  b.flash=Math.max(0,b.flash-dt);b.jolt=Math.max(0,(b.jolt||0)-dt*4);
  for(let i=0;i<3;i++)b.cardCd[i]=Math.max(0,b.cardCd[i]-dt);
  if(b.intro>0){b.intro=Math.max(0,b.intro-dt);for(const o of [a,e]){o.y=ground;}return;}
  if(b.foeSwitch>0){b.foeSwitch-=dt;if(b.foeSwitch<=0)loadFoe(b.foeIdx);}
  b.time+=dt;
  b.comboTime=Math.max(0,b.comboTime-dt);if(!b.comboTime)b.combo=0;
  // focus regen
  b.focus=Math.min(100,b.focus+dt*(4.5+R.setPct('light')*3*4.5));
  // water set: regen
  if(R.setPct('water')>0&&a.hp>0)a.hp=Math.min(a.maxHp,a.hp+a.maxHp*R.setPct('water')*.1*dt);
  // gift startup lock
  for(const o of [a,e]){
    if(o.dot>0){o.dotTick-=dt;if(o.dotTick<=0){o.dotTick=.95;o.hp=Math.max(0,o.hp-o.dotPower);number(o.x,o.y-90*V,'-'+Math.ceil(o.dotPower),'#aaef9c');}}
    timerDec(o,dt);o.vy+=H*3.0*dt;o.y+=o.vy*dt;if(o.y>=ground){o.y=ground;o.vy=0;o.grounded=true;o.jumps=0;}else o.grounded=false;
    o.x=R.clamp(o.x,58*U1,R.vw-58*U1);
    o.vx*=1;
  }
  a.face=e.x>a.x?1:-1;e.face=a.x>e.x?1:-1;
  // player movement
  const ax=R.axis().x;let dir=ax;if(a.root>0||a.stun>0)dir=0;
  if(a.dash>0)a.x+=a.vx*dt;else{a.vx=dir*Math.max(180*R.DPR,R.vw*.27)*(1+R.setPct('wind')*2)*(a.speedBoost>0?1.7:1)*(a.slow>0?.6:1)*(.9+R.D(b.allyId).spd/700);a.x+=a.vx*dt;}
  // knockback decay for foe
  // enemy AI
  b.ai-=dt;const dd=Math.abs(a.x-e.x);const boss=b.foe.boss;
  if(!b.enraged&&e.hp<e.maxHp*.5&&boss){b.enraged=true;callout('✦ '+R.D(b.foe.id).name.toUpperCase()+' IS ENRAGED ✦','warn');R.sfx('charge');}
  if(e.hurt<=0&&e.root<=0&&e.stun<=0){
    const spd=(105+Math.min(130,b.foe.lvl*5))*(e.slow>0?.5:1)*(.8+R.D(b.foe.id).spd/300)*(b.enraged?1.18:1)*U1;
    const target=dd>150*U1?Math.sign(a.x-e.x)*spd:dd<90*U1?-Math.sign(a.x-e.x)*spd*.6:0;e.x+=target*dt;e.vx=target;}
  else e.vx=0;
  if(b.windup>0){
    b.windup-=dt;
    if(b.windup<=0){const atk=b.attackKind;b.windup=0;b.attackKind='';
      if(e.hp>0&&e.stun<=0){if(atk==='claw')slash(e,true);else emit(e,true,(boss?9:7)+b.foe.lvl*.75,atk==='burst'?'special':'shot');}
      b.ai=(boss?1.05:1.30)*(b.enraged?.78:1);}
  }else if(b.ai<=0&&e.stun<=0){
    const roll=Math.random();b.attackKind=dd<145*U1&&roll<.60?'claw':roll>(b.enraged?.5:.65)?'burst':'shot';
    b.windup=boss?.52:.67;b.ai=99;b.enemyCall=1;
    if(Math.random()<.18&&e.grounded){e.vy=-H*.68;e.grounded=false;}
  }
  b.enemyCall=Math.max(0,b.enemyCall-dt);
  // projectiles
  for(let j=b.shots.length-1;j>=0;j--){
    const s=b.shots[j];s.x+=s.vx*dt;s.life-=dt;const target=s.byEnemy?a:e;
    if(Math.abs(s.x-target.x)<s.size+35*U1&&Math.abs(s.y-(target.y-67*V))<55*V*1.2){
      const src=s.byEnemy?e:a;let dmg=s.power;
      if(!s.byEnemy){if(a.overdrive>0)dmg*=1.65;if(a.double){dmg*=2;a.double=false;}}
      if(hurt(target,dmg,src,'SHOT'))elementalEffect(src,target,s.kind);
      b.shots.splice(j,1);
    }else if(s.life<=0||s.x<0||s.x>R.vw)b.shots.splice(j,1);
  }
  // end conditions
  if(a.hp<=0){
    syncAlly();R.S.party[b.allyIdx].hp=0;
    const nextOk=R.S.party.some((p,i)=>i!==b.allyIdx&&p.hp>0);
    if(nextOk){b.paused=false;swap();R.toast('Your Daemon fell! Another joins the fight.',1800);}
    else endDuel('lose');
  }else if(e.hp<=0&&!b.over){
    b.kills.push(b.foe);
    if(b.foeIdx<b.foes.length-1){
      b.foeSwitch=1.1;b.foeIdx++;e.vx=0;sparks(e.x,e.y-60*V,'#fff',40);R.sfx('win');callout('✦ '+R.D(b.foe.id).name.toUpperCase()+' DOWN · NEXT FOE ✦','good');b.hp0=true;
      // keep a corpse visual by freezing; loadFoe handles on timer
      a.hp=Math.min(a.maxHp,a.hp+a.maxHp*.12);
      b.e.hp=1;b.e.invul=99;b.e.hurt=99;
    }else endDuel('win');
  }
}

/* ---------- finish & rewards ---------- */
function rar(r){return r==='common'?1:r==='uncommon'?1.15:r==='rare'?1.35:1.8;}
function giveExp(p,amt){const before=p.lvl;p.exp=(p.exp||0)+amt;let ups=0,learned=[];while(p.exp>=R.expNeed(p.lvl)&&p.lvl<99){p.exp-=R.expNeed(p.lvl);p.lvl++;ups++;p.maxHp=R.maxHp(p.id,p.lvl);p.hp=Math.min(p.maxHp,p.hp+16);R.MOVES.forEach(m=>{if(m.lvl===p.lvl)learned.push(m);});}
  return{ups,learned};}
async function endDuel(outcome){
  const b=B,S=R.S;if(b.over)return;b.over=true;
  syncAlly();
  const th=R.DISTRICTS[b.district];
  const res={outcome,kind:b.kind,label:b.label,time:b.time,dmg:b.dmgDealt,taken:b.hitTaken,foes:b.kills.map(f=>f.id),cardsUsed:b.cardsUsed,xp:[],coins:0,cards:[],orbs:0,newDaemon:null,gift:null,levelUps:[],learned:[]};
  if(outcome==='lose'){
    S.losses++;R.sfx('lose');callout('✦ YOUR DAEMONS ARE DOWN ✦','warn');
    await R.sleep(1300);
  }else{
    S.wins++;R.sfx('win');
    if(outcome==='capture'){
      const f=b.foe,np=R.newDaemon(f.id,f.lvl);np.hp=Math.max(1,Math.round(np.maxHp*.5));
      if(S.party.length<6)S.party.push(np);else S.storage.push(np);
      const fresh=!S.owned[f.id];S.owned[f.id]=true;S.captures++;res.newDaemon={id:f.id,lvl:f.lvl,fresh,toStorage:S.party.length>=6&&!S.party.includes(np)};
      b.kills.push(f);res.foes=[f.id];
      // soul imprint: guaranteed card of that element
      const cid=R.rollCard(R.D2E[R.D(f.id).type],th.id,{bonus:.2});res.cards.push(R.giveCard(cid));
    }
    // xp / coins
    let xp=0,coins=0;
    for(const f of b.kills){const d=R.D(f.id);const lead=S.party[b.allyIdx]||S.party[0];
      let x=(14+f.lvl*6)*rar(d.rar)*(f.boss?2:1)*R.clamp(1+(f.lvl-lead.lvl)*.05,.4,1.8);
      xp+=x;coins+=Math.round(f.lvl*3.2*rar(d.rar)*(1+R.setPct('dark')*2));}
    xp=Math.round(xp*({easy:.9,normal:1,hard:1.25}[S.settings.diff]||1));
    coins+=b.reward.coins||0;res.xpTotal=xp;res.coins=coins;R.addCoins(coins);
    S.party.forEach((p,i)=>{if(p.hp<=0&&i!==b.allyIdx)return;const share=i===b.allyIdx?1:.4;const got=Math.round(xp*share);if(got<=0)return;
      const before=p.lvl,bexp=p.exp||0;const r=giveExp(p,got);res.xp.push({idx:i,id:p.id,gain:got,from:before,to:p.lvl,ups:r.ups,learned:r.learned,fill0:bexp/R.expNeed(before),fill1:(p.exp||0)/R.expNeed(p.lvl)});});
    // drops
    if(b.kind==='wild'&&outcome==='win'){
      const f=b.kills[0];
      if(Math.random()<.24+R.setPct('dark')){const cid=R.rollCard(R.D2E[R.D(f.id).type],th.id);res.cards.push(R.giveCard(cid));}
      if(Math.random()<.14){S.orbs++;res.orbs=1;}
    }
    if(b.reward.card){res.cards.push(R.giveCard(b.reward.card));}
    if(b.reward.gift!=null){res.gift=b.reward.gift;const gi=b.reward.gift;if(!ownedGifts().includes(S.gift)||S.gift===0&&!S.cleared.includes(0))S.gift=gi;if(!S.cleared.includes(b.reward.keeper))S.cleared.push(b.reward.keeper);}
    if(b.reward.keeper!=null)S.flags['k'+b.reward.keeper]=1;
    for(const id of Object.keys(b.seen))S.seen[id]=true;
    await R.sleep(outcome==='capture'?600:900);
  }
  // restore
  S.settings.sound!==undefined;
  cleanupUi();
  document.body.classList.remove('inDuel');document.body.classList.add('inWorld');
  R.mode='world';R.onAct=null;R.worldRefresh();
  R.joy.x=R.joy.y=0;R.hold={};
  if(outcome==='lose')R.blackout();
  const w=R.world;w.paused=true;
  R.save();
  B=null;
  // show report first, then resolve
  try{if(outcome!=='lose'||true)await R.report(res);}catch(e){console.error(e);}
  const r=resolveFn;resolveFn=null;if(r)r(res);
}
R.DTIPS={duel1:'⚔ Slash · ✦ Shot · ✹ Special · ▲ jump. Dodge the red <b>!</b> wind-ups. Land hits to fill your Energy.',cards_d:'Tap a <b>card</b> to cast it. Cards cost Focus (blue bar), then recharge.',bind:'It is weak! Tap <b>◉ Bind</b> to try to capture it (uses an Orb).',ult:'Energy is full! Tap <b>★</b> for your Ultimate.',lowhp:'Low HP! Use a 🧪 Tonic, or ⇄ swap to another Daemon.'};
const dq=[];let dBusy=false;
function dpump(){if(dBusy||!dq.length)return;dBusy=true;const h=$('#d-hint');h.innerHTML=dq.shift();h.classList.add('on');setTimeout(()=>{h.classList.remove('on');setTimeout(()=>{dBusy=false;dpump();},350);},6500);}
R.dtip=function(key){const S=R.S;if(!S||S.flags['t_'+key])return;S.flags['t_'+key]=1;dq.push(R.DTIPS[key]);dpump();};
function cleanupUi(){dq.length=0;$('#d-summon').classList.remove('on');$('#d-call').classList.remove('on');$('#d-hint').classList.remove('on');}

/* ---------- pause ---------- */
async function openPause(){
  if(!B||B.over)return;B.paused=true;
  const opts=[{v:'resume',t:'▶ Resume'}];
  if(B.kind==='wild')opts.push({v:'flee',t:'🏃 Flee the duel'});
  const c=await R.pickList('Paused','',opts,true);
  if(c==='flee'){B.over=true;syncAlly();cleanupUi();document.body.classList.remove('inDuel');document.body.classList.add('inWorld');R.mode='world';R.onAct=null;R.worldRefresh();R.world.paused=true;R.save();B=null;const r=resolveFn;resolveFn=null;if(r)r({outcome:'flee'});return;}
  if(B)B.paused=false;
}

/* ---------- UI: hand, HUD ---------- */
function buildHandUi(){
  const S=R.S,hand=$('#d-hand');hand.innerHTML='';
  for(let i=0;i<3;i++){
    const cid=B.hand[i];const btn=document.createElement('button');btn.className='cardbtn';btn.dataset.act='card'+i;
    if(cid){const c=R.CARD(cid);btn.style.setProperty('--ec',R.ELEM_COL[c.element]);btn.innerHTML=`<img src="${R.cardSrc(cid)}" draggable="false"><span class="cost">${R.STAR_COST[c.stars]}</span><span class="ic">${R.ARCH_INFO[c.arch][0]}</span><i class="cd"></i><b>${i+1}</b>`;}
    else{btn.classList.add('empty');btn.innerHTML='<span class="plus">+</span>';}
    hand.appendChild(btn);
  }
}
function updateHandUi(){
  const btns=R.$$('#d-hand .cardbtn');
  btns.forEach((btn,i)=>{const cid=B.hand[i];if(!cid)return;const c=R.CARD(cid),cost=R.STAR_COST[c.stars];
    const cd=B.cardCd[i],tot=5+c.stars*1.5;btn.classList.toggle('cant',B.focus<cost||cd>0);btn.classList.toggle('ready',B.focus>=cost&&cd<=0);
    const el=btn.querySelector('.cd');if(el)el.style.height=Math.round(100*Math.min(1,cd/tot))+'%';});
}
function updateHud(force){
  if(!B)return;const a=B.a,e=B.e,S=R.S;if(!a||!e)return;
  const ad=R.D(B.allyId),ed=R.D(B.foe.id);
  $('#d-aimg').style.backgroundImage='url('+R.spriteSrc(B.allyId)+')';$('#d-eimg').style.backgroundImage='url('+R.spriteSrc(B.foe.id)+')';
  $('#d-aname').textContent=ad.name;$('#d-alv').textContent='Lv '+a.level;
  $('#d-ename').textContent=ed.name;$('#d-elv').textContent='Lv '+B.foe.lvl+(B.foes.length>1?` · ${Math.min(B.foeIdx+1,B.foes.length)}/${B.foes.length}`:'');
  $('#d-atype').textContent=R.TYPE_ICON[ad.type]+' '+ad.type;$('#d-etype').textContent=R.TYPE_ICON[ed.type]+' '+ed.type;
  $('#d-ahp').style.width=(100*a.hp/a.maxHp)+'%';$('#d-ehp').style.width=(100*e.hp/e.maxHp)+'%';
  $('#d-aen').style.width=a.energy+'%';$('#d-afo').style.width=B.focus+'%';
  $('#d-ahpt').textContent=Math.ceil(a.hp)+'/'+a.maxHp;$('#d-ehpt').textContent=Math.ceil(e.hp)+'/'+e.maxHp;
  $('#d-aen').parentElement.classList.toggle('full',a.energy>=100);
  const gi=S.gift,gOk=ownedGifts().includes(gi);
  const gb=$('#d-gift');gb.innerHTML=gOk?R.GIFTS[gi].icon:'🎁';gb.classList.toggle('cant',!gOk||a.cool.gift>0);gb.dataset.cd=gOk&&a.cool.gift>0?Math.ceil(a.cool.gift):'';
  const bb=$('#d-bind');bb.dataset.n=S.orbs;bb.classList.toggle('ready',B.kind==='wild'&&e.hp/e.maxHp<=.38&&S.orbs>0);bb.classList.toggle('cant',B.kind!=='wild');const weak=B.kind==='wild'&&e.hp/e.maxHp<=.38;bb.style.display=weak?'':'none';bb.classList.toggle('cant',weak&&S.orbs<=0);
  $('#d-tonic').dataset.n=S.tonics;
  if(B.kind==='wild'&&e.hp/e.maxHp<=.38&&S.orbs>0)R.dtip('bind');
  if(a.energy>=100)R.dtip('ult');
  if(a.hp/a.maxHp<.3)R.dtip('lowhp');
  const sw=R.$$('#d-swap');
  const ult=$('#d-ult');ult.classList.toggle('ready',a.energy>=100);
  R.$$('[data-act="slash"],[data-act="shot"],[data-act="special"]').forEach(b=>{const k=b.dataset.act==='slash'?'light':b.dataset.act==='shot'?'ranged':'special';b.classList.toggle('cant',a.cool[k]>0);});
  updateHandUi();
}

/* ---------- arena backdrop (Kenney tiles) ---------- */
function makeBackdrop(){
  const VW=R.vw,VH=R.vh,th=R.DISTRICTS[B.district],atl=R.world.atlas[B.district];
  const c=document.createElement('canvas');c.width=VW;c.height=VH;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
  const bs=Math.max(3,Math.round(VH/(16*8.6))),T=16*bs;
  const F=floorY();
  // sky
  const g=x.createLinearGradient(0,0,0,VH);g.addColorStop(0,th.sky[0]);g.addColorStop(.6,th.sky[1]);g.addColorStop(1,th.sky[0]);x.fillStyle=g;x.fillRect(0,0,VW,VH);
  const rnd=R.rng(B.district*977+B.foeIdx*13+(B.foe?B.foe.id:1));
  // distant skyline
  x.fillStyle='rgba(10,10,30,.28)';for(let px=-20;px<VW;px+=T*.9){const h=T*(1.2+rnd()*2.2);x.fillRect(px,F-3.2*T-h*.3,T*.8,h+T*4);}
  const yS=Math.round(F-1.55*T);                          // facade base line
  const t=(i,dx,dy,w)=>x.drawImage(atl,(i%12)*16,((i/12)|0)*16,16,16,Math.round(dx),Math.round(dy),Math.ceil(w||T),Math.ceil(w||T));
  // buildings
  let bx=-T*rnd();let rows=Math.ceil((yS-2*T)/T)+1;
  while(bx<VW){
    const w=rnd.r(4,7),blue=rnd()<.45,style=rnd()<.55?0:1;
    const door=rnd()<.5?rnd.i(w-2)+1:-1;
    // roof rows
    for(let r=0;r<rows;r++){const dy=yS-2*T-(rows-r)*T;for(let i=0;i<w;i++){
      const last=r===rows-1;let id=(blue?6:0)+(last?24:12)+(i===0?0:i===w-1?2:1);if(!last&&i>0&&i<w-1){id=(blue?6:0)+13;const q=rnd();if(q<.07)id=blue?34:28;else if(q<.2)id=blue?35:29;}
      if(!last&&i>0&&i<w-1){}else if(!last)id=(blue?6:0)+12+(i===0?0:2);
      t(id,bx+i*T,dy);}}
    // facade
    for(let i=0;i<w;i++){
      let up,lo;
      if(style===0){up=i===0?36:i===w-1?41:(i%2?40:37+(i%3));lo=i===0?48:i===w-1?53:49;if(door>=0&&i===door){lo=52;up=38;}}
      else{up=i===0?42:i===w-1?47:(i%2?46:43+(i%3));lo=i===0?54:i===w-1?59:(i%3===1?56:55);if(door>=0&&i===door){lo=58;up=44;}
        if(lo===56){ if(i+1<w-1){} else lo=55; }}
      t(up,bx+i*T,yS-2*T);t(lo,bx+i*T,yS-T);
    }
    bx+=w*T+(rnd()<.4?T:0);
    if(bx<VW&&rnd()<.4){const gx=bx-T*.5;t(80,gx,yS-T);t(68,gx,yS-2*T);}
  }
  // sidewalk (2 rows) then curb + road
  const sy=yS;
  for(let r=0;r<2;r++)for(let px=0;px<VW;px+=T)t(((px/T|0)+r)%7===0?100:88,px,sy+r*T);
  const ry=sy+2*T;
  for(let px=0;px<VW;px+=T)t(63,px,ry);
  for(let r=1;r<6;r++)for(let px=0;px<VW;px+=T)t(r===1?(((px/T)|0)%3===0?76:136):136,px,ry+r*T);
  // lamp posts
  for(let k=0;k<3;k++){const lx=Math.round((rnd()*.8+.1+k)/3*VW/T)*T;t(86,lx,sy-T*.2);t(98,lx,sy+T*.8);}
  // parked car in the road
  if(rnd()<.8){const cx=Math.round(rnd()*(VW/T-3))*T;const car=rnd()<.5;const base=car?[110,111,122,123]:[112,113,124,125];t(base[0],cx,ry+T*1.1);t(base[1],cx+T,ry+T*1.1);t(base[2],cx,ry+T*2.1);t(base[3],cx+T,ry+T*2.1);}
  // special arenas
  if(th.id===8){x.fillStyle='rgba(120,40,200,.25)';x.fillRect(0,0,VW,VH);const rg=x.createRadialGradient(VW/2,F-T*2.6,10,VW/2,F-T*2.6,T*6);rg.addColorStop(0,'rgba(255,255,255,.8)');rg.addColorStop(.3,'rgba(200,120,255,.55)');rg.addColorStop(1,'rgba(60,0,120,0)');x.fillStyle=rg;x.fillRect(0,0,VW,VH);}
  // soft vignette on top & bottom so UI reads
  const vg=x.createLinearGradient(0,0,0,VH);vg.addColorStop(0,'rgba(0,0,10,.35)');vg.addColorStop(.25,'rgba(0,0,10,0)');vg.addColorStop(.72,'rgba(0,0,10,0)');vg.addColorStop(1,'rgba(0,0,10,.55)');x.fillStyle=vg;x.fillRect(0,0,VW,VH);
  backdrop=c;
}

/* ---------- draw ---------- */
const FR={idle:0,run:3,jump:7,fall:8,slash:9,cast:10,hurt:11,faint:13};
function frameOf(f,t,dead){if(dead)return 13;if(f.hurt>.02)return 11;if(f.attack>0)return f.pose===3?10:9;if(!f.grounded)return f.vy<0?7:8;if(f.dash>0||Math.abs(f.vx)>42*U())return 3+(Math.floor(t*11)%4);return Math.floor(t*2.8)%3;}
function drawDaemon(ctx,id,frame,x,y,face,ks,flash,alpha){
  const im=R.sprite(id);if(!im){return;}
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.scale(face,1);if(flash>0)ctx.globalAlpha*=.55+Math.sin(B.t*54)*.33;
  ctx.drawImage(im,frame*80,0,80,80,-40*ks,-72*ks,80*ks,80*ks);ctx.restore();
}
function draw(dt){
  const ctx=R.ctx,VW=R.vw,VH=R.vh,b=B;if(!b)return;
  b.t+=dt;
  ctx.imageSmoothingEnabled=false;
  const jx=R.S.settings.shake&&b.jolt>0?(Math.random()-.5)*b.jolt*8*R.DPR:0,jy=R.S.settings.shake&&b.jolt>0?(Math.random()-.5)*b.jolt*6*R.DPR:0;
  ctx.save();ctx.translate(jx,jy);
  if(backdrop)ctx.drawImage(backdrop,0,0);else{ctx.fillStyle='#111';ctx.fillRect(0,0,VW,VH);}
  drawArenaWeather(ctx);
  const a=b.a,e=b.e,ks=Math.max(2,Math.floor(VH*.30/80)),ke=ks+(b.foe&&b.foe.boss?1:0);
  const V=Vf();
  // shadows
  ctx.fillStyle='rgba(0,0,0,.3)';for(const [f,k] of [[a,ks],[e,ke]]){ctx.beginPath();ctx.ellipse(f.x,floorY()+4*R.DPR,32*k*.8,7*k*.8,0,0,6.283);ctx.fill();}
  const ay=a.y+8*ks*0+6*ks*.4,ey=e.y+6*ke*.4;
  // enemy telegraph glow
  if(b.windup>0){ctx.fillStyle='rgba(255,60,60,'+(.15+.12*Math.sin(b.t*30))+')';ctx.beginPath();ctx.ellipse(e.x,e.y-34*ke,36*ke,44*ke,0,0,6.283);ctx.fill();}
  const dead=b.hp0&&b.e.hurt>5;
  drawDaemon(ctx,b.foe.id,frameOf(e,b.t,dead),e.x,ey,e.face,ke,e.invul>0&&e.hurt<5?1:0,dead?Math.max(0,1-(b.foeSwitch>0?0:0)):1);
  drawDaemon(ctx,b.allyId,frameOf(a,b.t,false),a.x,ay,a.face,ks,a.invul>0&&a.shield<=0&&a.dash<=0?1:0,a.dash>0?.55:1);
  // shields
  for(const f of [a,e]){if(f.shield>0){const k=f===a?ks:ke;ctx.strokeStyle='rgba(160,230,255,'+(.5+.3*Math.sin(b.t*20))+')';ctx.lineWidth=3*R.DPR;ctx.beginPath();ctx.ellipse(f.x,f.y-34*k,40*k,48*k,0,0,6.283);ctx.stroke();ctx.fillStyle='rgba(160,230,255,.12)';ctx.fill();}
    if(f.overdrive>0){ctx.strokeStyle='rgba(255,170,60,.7)';ctx.lineWidth=2*R.DPR;ctx.beginPath();ctx.ellipse(f.x,f.y-34*(f===a?ks:ke),30*(f===a?ks:ke),38*(f===a?ks:ke),0,0,6.283);ctx.stroke();}
    if(f.stun>0){ctx.fillStyle='#ffe46a';ctx.font=`bold ${16*R.DPR}px system-ui`;ctx.textAlign='center';ctx.fillText('★ ★ ★',f.x,f.y-80*(f===a?ks:ke)*.9);}
    if(f.dot>0){ctx.fillStyle='rgba(150,255,130,.6)';ctx.fillRect(f.x-6*R.DPR,f.y-70*(f===a?ks:ke)*.9+Math.sin(b.t*9)*4*R.DPR,4*R.DPR,4*R.DPR);}
  }
  // attack arcs
  for(const p of b.fx){if(!p.arc)continue;const k=p.t/p.max;ctx.save();ctx.translate(p.x,p.y);ctx.scale(p.face,1);ctx.strokeStyle=p.enemy?`rgba(255,110,140,${k})`:`rgba(255,250,210,${k})`;ctx.lineWidth=7*R.DPR*k;ctx.beginPath();ctx.arc(-18*U(),0,46*U()*(1.2-k*.3),-1.1,1.1);ctx.stroke();ctx.restore();}
  // projectiles
  for(const s of b.shots){const gr=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.size*2.2);gr.addColorStop(0,'#fff');gr.addColorStop(.35,s.color);gr.addColorStop(1,s.color+'00');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(s.x,s.y,s.size*2.2,0,6.283);ctx.fill();
    ctx.fillStyle=s.color;for(let i=1;i<4;i++){ctx.globalAlpha=.4-i*.1;ctx.beginPath();ctx.arc(s.x-Math.sign(s.vx)*i*s.size*.9,s.y,s.size*(1-i*.2),0,6.283);ctx.fill();}ctx.globalAlpha=1;}
  // particles
  for(const p of b.fx){if(p.arc)continue;ctx.globalAlpha=Math.max(0,p.t);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size);}ctx.globalAlpha=1;
  // damage numbers
  ctx.textAlign='center';ctx.font=`900 ${18*R.DPR}px system-ui`;for(const n of b.numbers){ctx.globalAlpha=Math.max(0,1-n.t/.85);ctx.lineWidth=3*R.DPR;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.strokeText(n.text,n.x,n.y);ctx.fillStyle=n.color;ctx.fillText(n.text,n.x,n.y);}ctx.globalAlpha=1;
  // enemy "!" telegraph
  if(b.windup>0){ctx.font=`900 ${26*R.DPR}px system-ui`;ctx.fillStyle='#ff5a5a';ctx.strokeStyle='#000';ctx.lineWidth=4*R.DPR;ctx.strokeText('!',e.x,e.y-82*ke);ctx.fillText('!',e.x,e.y-82*ke);}
  ctx.restore();
  // flash overlay
  if(b.flash>0){ctx.fillStyle=`rgba(255,255,255,${Math.min(.5,b.flash*2.5)})`;ctx.fillRect(0,0,VW,VH);}
  // intro text
  if(b.intro>0){const k=Math.min(1,b.intro/1.5);ctx.fillStyle=`rgba(0,0,0,${k*.55})`;ctx.fillRect(0,0,VW,VH);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font=`900 ${44*R.DPR}px system-ui`;ctx.globalAlpha=Math.min(1,k*1.6);ctx.fillText(Math.ceil(b.intro*2)>2?'READY':'FIGHT!',VW/2,VH*.4);ctx.globalAlpha=1;}
}
let wx=[];
function drawArenaWeather(ctx){
  const th=R.DISTRICTS[B.district],kind=th.weather;if(wx.length<34&&Math.random()<.5)wx.push({x:Math.random(),y:-.05,l:Math.random(),s:1+Math.random()*2});
  const VW=R.vw,VH=R.vh,dt=.016;
  for(let i=wx.length-1;i>=0;i--){const q=wx[i];
    if(kind==='rain'||kind==='storm'){q.y+=.02;q.x-=.003;}else if(kind==='ember'||kind==='rift'||kind==='spore'){q.y-=.004;q.x+=Math.sin(B.t*2+q.l*9)*.0012;}else if(kind==='snow'||kind==='leaf'){q.y+=.003;q.x+=Math.sin(B.t+q.l*9)*.0016;}else{q.x+=.001;}
    if(q.y>1.05||q.y<-.1||q.x<-.05||q.x>1.05){wx.splice(i,1);continue;}
    const x=q.x*VW,y=q.y*VH,s=q.s*R.DPR;
    if(kind==='rain'||kind==='storm'){ctx.strokeStyle='rgba(200,235,255,.4)';ctx.lineWidth=R.DPR;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-4*s,y+14*s);ctx.stroke();}
    else{ctx.fillStyle=kind==='ember'?'rgba(255,150,60,.75)':kind==='rift'?'rgba(226,150,255,.8)':kind==='spore'?'rgba(200,255,110,.55)':kind==='leaf'?'rgba(190,240,120,.8)':'rgba(255,255,255,.8)';ctx.fillRect(x,y,s*1.6,s*1.6);}
  }
}
})(window.R=window.R||{});
