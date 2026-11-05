/* ===== RIFTBINDER · ui.js — dialogs, menus, shops, reports, card reveals, title ===== */
(function(R){
'use strict';
const $=R.$,$$=R.$$;
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
R.spHtml=(id,s,cls)=>`<div class="sp ${cls||''}" style="--s:${s||.6};background-image:url(${R.spriteSrc(id)})"></div>`;
const starStr=n=>'★'.repeat(n)+'☆'.repeat(5-n);
R.uiOpen=0;

/* ---------- modal plumbing ---------- */
R.modal=function(html,cls){
  const root=$('#ui');const w=document.createElement('div');w.className='scrim '+(cls||'');w.innerHTML=`<div class="panel">${html}</div>`;
  root.appendChild(w);R.uiOpen++;
  w.close=()=>{if(w.isConnected){w.remove();R.uiOpen--;}};
  return w;
};
const closeAll=()=>{$$('#ui .scrim').forEach(s=>s.remove?.());R.uiOpen=0;};

/* ---------- dialog ---------- */
R.say=function(sp,text){
  if(typeof sp==='string'){sp={name:''};}
  if(text===undefined&&sp&&sp.text){text=sp.text;}
  const lines=Array.isArray(text)?text:[text];
  return new Promise(res=>{
    const root=$('#ui');const box=document.createElement('div');box.className='dialog';
    let portrait='';
    if(sp.spr){portrait=`<div class="portrait" style="background-image:url(npcs/${sp.spr}.png)"></div>`;}
    else if(sp.tile!==undefined&&R.img.city){portrait=`<div class="portrait tile" style="--tx:${(sp.tile%12)*-16}px;--ty:${((sp.tile/12)|0)*-16}px"></div>`;}
    box.innerHTML=`${portrait}<div class="dtext"><div class="dname">${esc(sp.name||'')}</div><div class="dline"></div><div class="dnext">▼</div></div>`;
    root.appendChild(box);R.uiOpen++;
    let i=0,typing=false,timer=null,full='';
    const line=box.querySelector('.dline'),nxt=box.querySelector('.dnext');
    const show=()=>{full=lines[i];line.innerHTML='';nxt.style.opacity=0;typing=true;let k=0;
      timer=setInterval(()=>{k+=2;line.textContent=full.slice(0,k);if(k>=full.length){clearInterval(timer);typing=false;line.innerHTML=esc(full);nxt.style.opacity=1;}},18);R.sfx('select');};
    const adv=()=>{if(typing){clearInterval(timer);typing=false;line.innerHTML=esc(full);nxt.style.opacity=1;return;}i++;if(i>=lines.length){done();}else show();};
    const key=e=>{if(['Enter',' ','z','Z'].includes(e.key)){e.preventDefault();e.stopPropagation();adv();}};
    const done=()=>{clearInterval(timer);removeEventListener('keydown',key,true);box.remove();R.uiOpen--;res();};
    box.addEventListener('pointerdown',e=>{e.preventDefault();adv();});
    addEventListener('keydown',key,true);
    show();
  });
};
R.pickList=function(title,sub,items,cancelable){
  return new Promise(res=>{
    const w=R.modal(`<h2>${title}</h2>${sub?`<p class="muted">${sub}</p>`:''}<div class="list">${items.map((it,i)=>`<button class="btn big" data-i="${i}">${it.t}</button>`).join('')}</div>${cancelable===false?'':'<div class="actions"><button class="btn secondary" data-x>Cancel</button></div>'}`,'small');
    w.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;R.sfx('select');w.close();if(b.dataset.x!==undefined)res(null);else res(items[+b.dataset.i].v);});
  });
};
R.confirm=function(title,yes,no){
  return new Promise(res=>{
    const w=R.modal(`<h2>${title}</h2><div class="actions"><button class="btn" data-y>${yes||'Yes'}</button><button class="btn secondary" data-n>${no||'No'}</button></div>`,'small');
    w.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;R.sfx('select');w.close();res(b.dataset.y!==undefined);});
  });
};

/* ---------- clinic & market ---------- */
R.clinic=async function(){
  const S=R.S;
  const hurt=S.party.some(p=>p.hp<p.maxHp);
  await R.say({name:'Clinic Nurse',spr:'healer'},hurt?'Rough out there! Sit down — let me patch up your Daemons.':'Your party looks perfectly healthy. Take a few supplies for the road!');
  R.healAll();R.sfx('heal');
  if(S.orbs<5){S.orbs=5;}
  if(S.tonics<2){S.tonics=2;}
  R.toast('✦ Party fully healed · Orbs/Tonics topped up to a minimum',2200);R.save();R.updateHud();
};
R.market=async function(d,tab){
  const S=R.S;
  return new Promise(res=>{
    const tier=Math.min(d,7);
    const goods=[
      {id:'orb',t:'Binding Orb',d:'Bind a weakened wild Daemon (under 38% HP).',price:55+tier*8,ic:'◉',f:()=>S.orbs++},
      {id:'tonic',t:'Battle Tonic',d:'Heal 40% HP mid-duel.',price:70+tier*8,ic:'🧪',f:()=>S.tonics++}
    ];
    const packs=[
      {id:'pk1',t:'Spirit Pack',d:'2 cards of one element.',price:260+tier*30,n:2,bonus:0},
      {id:'pk2',t:'Gilded Pack',d:'3 cards of one element, higher stars.',price:720+tier*70,n:3,bonus:1.2}
    ];
    let cur=tab||'supplies',el=null,pend=null;
    const draw=()=>{
      if(el)el.close();
      let body='';
      if(cur==='supplies'){body=goods.map(g=>`<div class="shoprow"><div class="shi">${g.ic}</div><div class="shd"><b>${g.t}</b><small>${g.d}</small></div><button class="btn" data-g="${g.id}">🪙 ${g.price}</button></div>`).join('');}
      else{body=`<p class="muted">Pick an element, then a pack. Cards you already own level up!</p><div class="chips" id="elchips">${R.ELEMS.map(e=>`<button class="chip ${pend===e?'on':''}" data-e="${e}" style="--c:${R.ELEM_COL[e]}">${R.ELEM_ICON[e]} ${e}</button>`).join('')}</div>`+packs.map(g=>`<div class="shoprow"><div class="shi">🃏</div><div class="shd"><b>${g.t}</b><small>${g.d}</small></div><button class="btn ${pend?'':'dis'}" data-p="${g.id}">🪙 ${g.price}</button></div>`).join('');}
      el=R.modal(`<h2>${tab==='packs'||cur==='packs'?'Spirit Exchange':'Market'} · ${R.DISTRICTS[d].name}</h2><div class="tabs"><button class="${cur==='supplies'?'on':''}" data-t="supplies">Supplies</button><button class="${cur==='packs'?'on':''}" data-t="packs">Spirit Packs</button></div><div class="coinline">🪙 ${S.coins} · ◉ ${S.orbs} · 🧪 ${S.tonics}</div>${body}<div class="actions"><button class="btn secondary" data-x>Leave</button></div>`,'shop');
      el.addEventListener('click',async e=>{
        const b=e.target.closest('button');if(!b)return;
        if(b.dataset.x!==undefined){el.close();R.save();R.updateHud();res();return;}
        if(b.dataset.t){cur=b.dataset.t;R.sfx('select');draw();return;}
        if(b.dataset.e){pend=b.dataset.e;R.sfx('select');draw();return;}
        if(b.dataset.g){const g=goods.find(x=>x.id===b.dataset.g);if(S.coins<g.price){R.toast('Not enough coins!');R.sfx('fail');return;}R.addCoins(-g.price);g.f();R.sfx('ok');draw();return;}
        if(b.dataset.p){const g=packs.find(x=>x.id===b.dataset.p);if(!pend){R.toast('Pick an element first');return;}if(S.coins<g.price){R.toast('Not enough coins!');R.sfx('fail');return;}R.addCoins(-g.price);
          const out=[];for(let i=0;i<g.n;i++)out.push(R.giveCard(R.rollCard(pend,tier+1,{bonus:g.bonus})));
          const keep=pend;el.close();await R.revealCards(out);draw();return;}
      });
    };
    draw();
  });
};

/* ---------- card reveal ---------- */
R.revealCards=async function(list){
  for(const r of list){
    await new Promise(res=>{
      const c=R.CARD(r.id);
      const w=R.modal(`<div class="reveal" style="--ec:${R.ELEM_COL[c.element]}"><div class="flip"><div class="face back"><div class="sigil">✦</div></div><div class="face front"><img src="${R.cardSrc(c.id)}"></div></div><div class="rinfo"><div class="rn">${r.isNew?'<span class="newtag">NEW CARD</span>':'<span class="lvtag">LEVEL UP · Lv '+r.lvl+(r.maxed?' (MAX)':'')+'</span>'}</div><h3>${esc(c.name)}</h3><div class="stars">${starStr(c.stars)}</div><div class="muted">${R.ELEM_ICON[c.element]} ${c.element} · ${R.ARCH_INFO[c.arch][0]} ${c.arch}</div><div class="move"><b>${esc(c.move)}</b> — ${R.ARCH_INFO[c.arch][2]}</div><button class="btn" data-x>Continue</button></div></div>`,'revealwrap');
      R.sfx('summon');
      setTimeout(()=>{w.querySelector('.flip').classList.add('on');R.sfx(c.stars>=4?'crit':'capture');},450);
      w.addEventListener('click',e=>{if(e.target.closest('[data-x]')){w.close();res();}});
    });
  }
};

/* ---------- duel report ---------- */
R.report=function(res){
  return new Promise(async resolve=>{
    const S=R.S;
    if(res.outcome==='cancel'||res.outcome==='flee'){resolve();return;}
    const head=res.outcome==='lose'?'DEFEAT':res.outcome==='capture'?'✦ BOUND! ✦':res.kind==='keeper'?'✦ KEEPER DEFEATED ✦':res.kind==='final'?'✦ THE RIFT WIELDER FALLS ✦':'✦ VICTORY ✦';
    let rows='';
    if(res.outcome==='lose'){rows=`<p>Your Daemons collapsed. You wake up at the nearest Clinic…</p><p class="muted">Lost <b>${R.lastLoss||0}</b> coins. Your party was fully healed.</p>`;}
    else{
      rows+=res.xp.map(x=>`<div class="xprow">${R.spHtml(x.id,.45)}<div class="xpm"><div><b>${R.D(x.id).name}</b> <small>Lv ${x.from}${x.to>x.from?' → <span class="up">Lv '+x.to+'!</span>':''}</small></div><div class="xpbar"><i data-f0="${x.fill0}" data-f1="${x.fill1}" data-up="${x.ups}"></i></div></div><div class="xpg">+${x.gain} XP</div></div>`).join('');
      const learned=res.xp.flatMap(x=>x.learned.map(m=>`<div class="newSkill"><b>✦ ${R.D(x.id).name} learned ${m.name}</b><small>${m.desc}</small></div>`)).join('');
      rows+=learned;
      const bits=[];if(res.coins)bits.push('🪙 +'+res.coins);if(res.orbs)bits.push('◉ +'+res.orbs+' Orb');
      if(bits.length)rows+=`<div class="loot">${bits.join(' · ')}</div>`;
      if(res.newDaemon)rows+=`<div class="loot big">${R.spHtml(res.newDaemon.id,.7)}<div><b>${R.D(res.newDaemon.id).name}</b> joined ${res.newDaemon.toStorage?'your storage':'your party'}!${res.newDaemon.fresh?' <span class="newtag">NEW</span>':''}</div></div>`;
      if(res.gift!=null)rows+=`<div class="loot big"><div class="gic">${R.GIFTS[res.gift].icon}</div><div><b>Keeper Gift: ${R.GIFTS[res.gift].name}</b><small>${R.GIFTS[res.gift].desc} Press R in a duel.</small></div></div>`;
    }
    const w=R.modal(`<div class="eyebrow">${esc(res.label||'')} · ${res.time?res.time.toFixed(1)+'s':''}</div><h2>${head}</h2>${rows}<div class="actions"><button class="btn" data-x>Continue</button></div>`,'report');
    // animate xp bars
    setTimeout(()=>$$('.xpbar i',w).forEach(i=>{const f0=+i.dataset.f0,f1=+i.dataset.f1,up=+i.dataset.up;i.style.transition='none';i.style.width=(f0*100)+'%';void i.offsetWidth;
      if(up>0){i.style.transition='width .5s';i.style.width='100%';setTimeout(()=>{i.style.transition='none';i.style.width='0%';void i.offsetWidth;i.style.transition='width .6s';i.style.width=(f1*100)+'%';},560);}
      else{i.style.transition='width .8s';i.style.width=(f1*100)+'%';}}),80);
    if(res.xp&&res.xp.some(x=>x.ups>0))R.sfx('level');
    w.addEventListener('click',async e=>{if(!e.target.closest('[data-x]'))return;w.close();
      if(res.cards&&res.cards.length)await R.revealCards(res.cards);
      R.updateHud();resolve();});
  });
};

/* ---------- blackout ---------- */
R.blackout=function(){
  const S=R.S,w=R.world,p=w.player;
  R.lastLoss=Math.floor(S.coins*.1);R.addCoins(-R.lastLoss);R.healAll();
  let best=null,bd=1e9;for(const d of w.doors){if(d.kind!=='clinic')continue;const dd=Math.hypot(d.x-p.x,d.y-p.y);if(dd<bd){bd=dd;best=d;}}
  if(best){p.x=best.x+.5;p.y=best.y+1.5;p.trail=[];for(let i=0;i<30;i++)p.trail.push({x:p.x,y:p.y});}
  w.mobs=[];w.curDist=-1;
};

/* ---------- menu ---------- */
let menuEl=null,menuTab='party';
R.openMenu=function(tab){
  if(menuEl&&menuEl.isConnected)return;
  const world=R.world;world.paused=true;R.sfx('open');
  menuTab=tab||menuTab;drawMenu();
};
function closeMenu(){if(menuEl){menuEl.close();menuEl=null;}R.world.paused=false;R.save();R.updateHud();}
function drawMenu(){
  if(menuEl)menuEl.close();
  const tabs=[['party','🐾 Party'],['binder','🃏 Binder'],['dex','📖 Dex'],['items','🎒 Items'],['map','🗺️ Map'],['options','⚙️ Options']];
  menuEl=R.modal(`<div class="mhead"><div class="tabs menu">${tabs.map(([k,l])=>`<button class="${menuTab===k?'on':''}" data-t="${k}">${l}</button>`).join('')}</div><button class="btn secondary xbtn" data-close>✕</button></div><div class="mbody" id="mbody"></div>`,'menu');
  menuEl.addEventListener('click',e=>{const b=e.target.closest('[data-t]');if(b){menuTab=b.dataset.t;R.sfx('select');drawMenu();}if(e.target.closest('[data-close]')){R.sfx('back');closeMenu();}});
  const body=$('#mbody',menuEl);
  ({party:tabParty,binder:tabBinder,dex:tabDex,items:tabItems,map:tabMap,options:tabOptions})[menuTab](body);
}
const hpPct=p=>Math.round(100*p.hp/p.maxHp);
function tabParty(body){
  const S=R.S;
  const row=(p,i,store)=>{const d=R.D(p.id);return `<div class="prow ${i===R.leadIdx()&&!store?'lead':''}" data-${store?'s':'p'}="${i}">${R.spHtml(p.id,.55)}<div class="pm"><div><b>${d.name}</b> <span class="tchip" style="--c:${R.TYPE_COL[d.type]}">${R.TYPE_ICON[d.type]} ${d.type}</span> <small>Lv ${p.lvl}</small>${i===R.leadIdx()&&!store?' <span class="leadtag">LEAD</span>':''}</div><div class="mbar hp"><i style="width:${hpPct(p)}%"></i></div><div class="mbar xp"><i style="width:${Math.round(100*(p.exp||0)/R.expNeed(p.lvl))}%"></i></div></div><div class="php">${p.hp}/${p.maxHp}</div></div>`;};
  body.innerHTML=`<div class="two"><div><h3>Party <small>${S.party.length}/6</small></h3>${S.party.map((p,i)=>row(p,i,false)).join('')}${S.storage.length?`<h3>Storage <small>${S.storage.length}</small></h3>${S.storage.map((p,i)=>row(p,i,true)).join('')}`:''}</div><div id="pdetail" class="pdetail"><p class="muted">Tap a Daemon to see powers and options.</p><p class="muted">Matchups: Fire › Nature, Frost, Machine · Water › Fire, Stone · Nature › Water, Stone · Storm › Water, Machine · Stone › Storm, Fire · Shadow › Astral, Wild · Frost › Nature, Storm · Venom › Nature, Wild · Wild › Shadow · Astral › Venom, Shadow · Machine › Stone, Frost</p></div></div>`;
  body.addEventListener('click',e=>{
    const r=e.target.closest('.prow');if(!r)return;
    const store=r.dataset.s!==undefined,i=+(store?r.dataset.s:r.dataset.p),p=(store?S.storage:S.party)[i],d=R.D(p.id),pw=R.POWERS[d.type];
    $$('.prow',body).forEach(x=>x.classList.remove('sel'));r.classList.add('sel');
    $('#pdetail',body).innerHTML=`<div class="dhead">${R.spHtml(p.id,1.1)}<div><h3>${d.name}</h3><div class="tchip" style="--c:${R.TYPE_COL[d.type]}">${R.TYPE_ICON[d.type]} ${d.type}</div><div class="muted">${d.rar} · Lv ${p.lvl}</div></div></div>
    <div class="stats"><span>❤ ${p.maxHp}</span><span>⚔ ${d.atk}</span><span>🛡 ${d.def}</span><span>💨 ${d.spd}</span></div>
    <div class="muted"><b>S</b> ${pw[0]} · <b>D</b> ${pw[1]}</div>
    <div class="mv">${R.MOVES.map(m=>`<div class="${p.lvl>=m.lvl?'got':'lock'}">${p.lvl>=m.lvl?'✓':'🔒'} Lv ${m.lvl} · <b>${m.name}</b><small>${m.desc}</small></div>`).join('')}</div>
    <div class="actions">${store?`<button class="btn" data-a="in" ${S.party.length>=6?'disabled':''}>Move to party</button>`:`<button class="btn" data-a="lead">Make lead</button><button class="btn secondary" data-a="tonic">Use Tonic (${S.tonics})</button>${S.party.length>1?'<button class="btn secondary" data-a="out">Send to storage</button>':''}`}</div>`;
    $('#pdetail',body).onclick=ev=>{const b=ev.target.closest('[data-a]');if(!b)return;const a=b.dataset.a;R.sfx('select');
      if(a==='lead'){if(p.hp<=0){R.toast('That Daemon has fainted.');return;}S.active=i;}
      else if(a==='tonic'){if(S.tonics<=0||p.hp>=p.maxHp){R.toast(S.tonics<=0?'No Tonics left.':'Already full HP');return;}S.tonics--;p.hp=Math.min(p.maxHp,p.hp+Math.round(p.maxHp*.4));}
      else if(a==='out'){S.party.splice(i,1);S.storage.push(p);if(S.active>=S.party.length)S.active=0;}
      else if(a==='in'){S.storage.splice(i,1);S.party.push(p);}
      drawMenu();};
  });
}
function tabBinder(body){
  const S=R.S;let filter='all',only=false;
  const render=()=>{
    const owned=R.ownedCards().length;
    const sets=R.ELEMS.map(e=>{const b=R.setBonus(e);const tot=window.CARDS.filter(c=>c.element===e).length;return `<div class="setrow" style="--c:${R.ELEM_COL[e]}"><span>${R.ELEM_ICON[e]} <b>${R.SET_INFO[e][0]}</b></span><span>${b.n}/${tot}</span><span class="tier">${'◆'.repeat(b.tier)}${'◇'.repeat(4-b.tier)}</span><small>${b.pct?'+'+Math.round(b.pct*100)+'%':''}${b.next?` · next at ${b.next}`:' · MAX'}</small></div>`;}).join('');
    let list=window.CARDS.slice();if(filter!=='all')list=list.filter(c=>c.element===filter);if(only)list=list.filter(c=>S.cards[c.id]);
    body.innerHTML=`<div class="binderTop"><div class="handbox"><h3>Hand <small>(played in duels)</small></h3><div class="hand3">${[0,1,2].map(i=>{const id=S.hand[i];return id?`<div class="hslot" data-slot="${i}" style="--ec:${R.ELEM_COL[R.CARD(id).element]}"><img src="${R.cardSrc(id)}"><b>${i+1}</b></div>`:`<div class="hslot empty" data-slot="${i}"><span>+</span><b>${i+1}</b></div>`;}).join('')}</div></div><div class="setbox"><h3>Set bonuses <small>${owned}/201 cards</small></h3>${sets}</div></div>
    <div class="chips"><button class="chip ${filter==='all'?'on':''}" data-f="all">All</button>${R.ELEMS.map(e=>`<button class="chip ${filter===e?'on':''}" data-f="${e}" style="--c:${R.ELEM_COL[e]}">${R.ELEM_ICON[e]}</button>`).join('')}<button class="chip ${only?'on':''}" data-o>Owned only</button></div>
    <div class="cgrid">${list.map(c=>{const o=S.cards[c.id];return `<div class="cc ${o?'own':'lock'}" data-c="${c.id}" style="--ec:${R.ELEM_COL[c.element]}">${o?`<img loading="lazy" src="${R.cardSrc(c.id)}"><span class="lv">Lv${o.lvl}</span>`:`<div class="q">?</div>`}<small>${o?c.name:'#'+String(c.id).padStart(3,'0')}</small></div>`;}).join('')}</div>`;
  };
  render();
  let slotSel=null;
  body.addEventListener('click',e=>{
    const f=e.target.closest('[data-f]');if(f){filter=f.dataset.f;render();return;}
    if(e.target.closest('[data-o]')){only=!only;render();return;}
    const hs=e.target.closest('[data-slot]');if(hs){slotSel=+hs.dataset.slot;R.toast('Tap a card to put it in slot '+(slotSel+1));$$('.hslot',body).forEach(x=>x.classList.remove('pick'));hs.classList.add('pick');return;}
    const cc=e.target.closest('[data-c]');if(!cc)return;
    const id=+cc.dataset.c,o=S.cards[id];if(!o){R.toast('Not collected yet — win duels or open Spirit Packs!');return;}
    if(slotSel!==null){const prev=S.hand.indexOf(id);if(prev>=0)S.hand[prev]=S.hand[slotSel];S.hand[slotSel]=id;slotSel=null;R.sfx('ok');render();return;}
    cardDetail(id,render);
  });
}
function cardDetail(id,after){
  const S=R.S,c=R.CARD(id),o=S.cards[id];
  const w=R.modal(`<div class="cdetail" style="--ec:${R.ELEM_COL[c.element]}"><img src="${R.cardSrc(id)}"><div class="cdi"><h3>${esc(c.name)}</h3><div class="stars">${starStr(c.stars)}</div><div class="muted">${R.ELEM_ICON[c.element]} ${c.element} · ${R.ARCH_INFO[c.arch][0]} ${c.arch}</div><p><b>${esc(c.move)}</b><br>${R.ARCH_INFO[c.arch][1]}: ${R.ARCH_INFO[c.arch][2]}</p><p class="muted">Card Lv ${o.lvl}/10 · copies ${o.n} · cost ${R.STAR_COST[c.stars]} Focus · recharge ${(5+c.stars*1.5).toFixed(1)}s</p><div class="actions">${[0,1,2].map(i=>`<button class="btn ${S.hand[i]===id?'on':''}" data-s="${i}">Slot ${i+1}</button>`).join('')}<button class="btn secondary" data-x>Close</button></div></div></div>`,'small cdwrap');
  w.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.s!==undefined){const i=+b.dataset.s;const prev=S.hand.indexOf(id);if(prev>=0)S.hand[prev]=S.hand[i];S.hand[i]=id;R.sfx('ok');}w.close();after&&after();});
}
function tabDex(body){
  const S=R.S;const seen=Object.keys(S.seen).length,own=Object.keys(S.owned).length;
  body.innerHTML=`<h3>Daemon Dex <small>${seen}/110 seen · ${own}/110 bound</small></h3><div class="dgrid">${window.DAEMONS.map(d=>{const o=S.owned[d.id],s=S.seen[d.id];return `<div class="dc ${o?'own':s?'seen':'unk'}" style="--c:${R.TYPE_COL[d.type]}">${s||o?R.spHtml(d.id,.5):'<div class="q">?</div>'}<small>${s||o?d.name:'#'+String(d.id).padStart(3,'0')}</small><i>${o?'●':s?'○':''}</i></div>`;}).join('')}</div>`;
}
function tabItems(body){
  const S=R.S;const gifts=S.cleared.map(d=>R.DISTRICTS[d].gift).filter(g=>g>=0);
  body.innerHTML=`<div class="inv"><div class="invi">🪙<b>${S.coins}</b><small>Coins</small></div><div class="invi">◉<b>${S.orbs}</b><small>Binding Orbs</small></div><div class="invi">🧪<b>${S.tonics}</b><small>Tonics</small></div><div class="invi">⚔️<b>${S.wins}</b><small>Wins</small></div><div class="invi">🐾<b>${S.captures}</b><small>Bound</small></div><div class="invi">⏱<b>${R.fmtTime(S.play)}</b><small>Playtime</small></div></div>
  <h3>Keeper Gifts <small>(equip one · press R in a duel)</small></h3>${gifts.length?`<div class="gifts">${gifts.map(g=>`<div class="gift ${S.gift===g?'on':''}" data-g="${g}"><div class="gic">${R.GIFTS[g].icon}</div><div><b>${R.GIFTS[g].name}</b><small>${R.GIFTS[g].desc} · ${R.GIFTS[g].cool}s</small></div></div>`).join('')}</div>`:'<p class="muted">Defeat a District Keeper to earn your first Gift.</p>'}`;
  body.addEventListener('click',e=>{const g=e.target.closest('[data-g]');if(!g)return;S.gift=+g.dataset.g;R.sfx('ok');tabItems(body);});
}
function tabMap(body){
  const S=R.S,w=R.world;
  body.innerHTML=`<div class="mapwrap"><canvas id="bigmap" width="552" height="456"></canvas><div class="maplist">${R.DISTRICTS.map(d=>{const vis=S.visited[d.id];const cl=d.id<8?S.cleared.includes(d.id):S.won;return `<div class="mrow ${vis?'':'dim'}"><b>${vis?d.name:'???'}</b><small>${d.id===8?'Lv 45+ · Final':'Lv '+d.lvl+'+ · '+d.elem}</small><i>${cl?'✓':''}</i></div>`;}).join('')}<p class="muted">🟡 Keeper · 🔴 Challenger · 🟢 Market · ❤ Clinic · 🔵 Bus Stop</p></div></div>`;
  const c=$('#bigmap',body),x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(w.mini,0,0,552,456);
  const k=552/138;
  // district grid labels
  x.font='bold 13px system-ui';x.textAlign='center';
  const C=R.CITY;
  for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){const id=[[0,1,2],[7,8,3],[6,5,4]][dy][dx];const cx=(C.M+(dx*2+1)*C.PX)*k,cy=(C.M+(dy*2+1)*C.PY)*k;const vis=S.visited[id];x.fillStyle='rgba(8,6,25,.65)';x.fillRect(cx-58,cy-12,116,22);x.fillStyle=vis?'#ffe28a':'#8a85b0';x.fillText(vis?R.DISTRICTS[id].name:'???',cx,cy+4);}
  const m=(wx,wy,col,r)=>{x.fillStyle=col;x.beginPath();x.arc(wx*k,wy*k,r,0,6.283);x.fill();x.strokeStyle='#000';x.lineWidth=1;x.stroke();};
  for(const n of w.npcs){if(n.kind==='keeper'&&!S.cleared.includes(n.d)&&S.visited[n.d])m(n.x,n.y,'#ffd24a',5);if(n.kind==='chal'&&!S.beaten[n.key]&&S.visited[n.d])m(n.x,n.y,'#ff6a6a',2.5);}
  for(const d of w.doors){if(!S.visited[d.d])continue;if(d.kind==='clinic')m(d.x+1,d.y,'#ff5a8e',3.5);if(d.kind==='market')m(d.x+1,d.y,'#7be08a',3.5);}
  for(const s of w.stops)if(S.visited[s.d])m(s.x,s.y,'#7df0ff',3.5);
  m(w.player.x,w.player.y,'#fff',5);
}
function tabOptions(body){
  const S=R.S,st=S.settings;
  body.innerHTML=`<div class="opts"><div class="orow"><span>Sound effects</span><button class="btn ${st.sound?'':'secondary'}" data-o="sound">${st.sound?'On':'Off'}</button></div><div class="orow"><span>Music</span><button class="btn ${st.music?'':'secondary'}" data-o="music">${st.music?'On':'Off'}</button></div><div class="orow"><span>Screen shake</span><button class="btn ${st.shake?'':'secondary'}" data-o="shake">${st.shake?'On':'Off'}</button></div>
  <div class="orow"><span>Difficulty</span><div class="seg">${['easy','normal','hard'].map(d=>`<button class="${st.diff===d?'on':''}" data-d="${d}">${d}</button>`).join('')}</div></div>
  <div class="orow"><span>Guide arrow</span><button class="btn ${R.world.guide?'':'secondary'}" data-o="guide">${R.world.guide?'On':'Off'}</button></div>
  <div class="actions"><button class="btn" data-a="save">💾 Save now</button><button class="btn secondary" data-a="title">Main menu</button><button class="btn danger" data-a="wipe">Delete save</button></div>
  <p class="muted credits">Riftbinder is a mashup of <b>Daemons: Riftbound</b> and <b>Cardbinder Legends</b>. City tiles: <b>Tiny City by Kenney</b> (CC0, kenney.nl).</p></div>`;
  body.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;R.sfx('select');
    if(b.dataset.o){const k=b.dataset.o;if(k==='guide')R.world.guide=!R.world.guide;else{st[k]=!st[k];if(k==='music'){if(st.music)R.music(R.world.musicNow||'town');else G.audio.stop();}}tabOptions(body);return;}
    if(b.dataset.d){st.diff=b.dataset.d;tabOptions(body);return;}
    const a=b.dataset.a;
    if(a==='save'){R.save();R.toast('Game saved.');}
    if(a==='title'){R.save();closeMenu();R.world.paused=true;R.titleScreen();}
    if(a==='wipe'){if(await R.confirm('Delete your save and start over?','Delete','Cancel')){R.wipeSave();closeMenu();R.world.paused=true;R.S=null;R.titleScreen();}}
  });
}

/* ---------- title / new game ---------- */
let titleT=0,titleCam=0;
R.drawTitleBg=function(dt){
  const w=R.world,c=w.city,ctx=R.ctx,VW=R.vw,VH=R.vh,SC=R.sc;if(!c||!w.atlas.length){ctx.fillStyle='#0b0820';ctx.fillRect(0,0,VW,VH);return;}
  titleT+=dt;titleCam+=dt*1.2;
  const sz=16*SC;ctx.imageSmoothingEnabled=false;
  const ox=Math.round(((R.CITY.M+3)+(titleCam%38))*sz),oy=Math.round((R.CITY.M+3)*sz);
  const x0=Math.floor(ox/sz),y0=Math.floor(oy/sz),x1=Math.ceil((ox+VW)/sz),y1=Math.ceil((oy+VH)/sz);
  ctx.fillStyle='#0a0a14';ctx.fillRect(0,0,VW,VH);
  for(const arr of [c.g,c.o]){for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(x<0||y<0||x>=c.W||y>=c.H)continue;const i=y*c.W+x,t=arr[i];if(t<0)continue;ctx.drawImage(w.atlas[c.dist[i]],(t%12)*16,((t/12)|0)*16,16,16,x*sz-ox,y*sz-oy,sz,sz);}}
  const g=ctx.createLinearGradient(0,0,0,VH);g.addColorStop(0,'rgba(8,4,30,.72)');g.addColorStop(.5,'rgba(8,4,30,.35)');g.addColorStop(1,'rgba(8,4,30,.8)');ctx.fillStyle=g;ctx.fillRect(0,0,VW,VH);
  // portal glow + parading daemons
  const rg=ctx.createRadialGradient(VW*.5,VH*.3,10,VW*.5,VH*.3,VH*.7);rg.addColorStop(0,'rgba(190,120,255,.35)');rg.addColorStop(1,'rgba(60,0,120,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,VW,VH);
  const ids=[1,11,21,31,41,51,61,71,81,91];
  ids.forEach((id,i)=>{const im=R.sprite(id);if(!im)return;const k=SC*.55;const x=((titleT*40*SC*.35+i*VW/ids.length*1.2)%(VW+300))-150;const y=VH*.86+Math.sin(titleT*3+i)*3;
    ctx.save();ctx.translate(x,y);ctx.imageSmoothingEnabled=true;ctx.drawImage(im,(3+Math.floor(titleT*9+i)%4)*80,0,80,80,-40*k,-72*k,80*k,80*k);ctx.restore();});
};
R.isInstalled=()=>window._installed||(window.matchMedia&&(matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches))||navigator.standalone;
R.doInstall=async function(){
  if(window._dip){window._dip.prompt();try{await window._dip.userChoice;}catch(e){}window._dip=null;return;}
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const w=R.modal(`<h2>Install Riftbinder</h2><p>${ios?'Tap the <b>Share</b> button, then <b>Add to Home Screen</b>.':'Open the browser menu (⋮) and choose <b>Install app</b> / <b>Add to Home screen</b>.'}</p><p class="muted">After the first load everything works offline.</p><div class="actions"><button class="btn" data-x>Got it</button></div>`,'small');
  w.addEventListener('click',e=>{if(e.target.closest('[data-x]'))w.close();});
};
R.titleScreen=function(){
  closeAll();R.mode='title';R.onAct=null;
  document.body.classList.remove('inWorld','inDuel');document.body.classList.add('onTitle');
  R.music('title');R.world.paused=true;
  const has=R.hasSave();
  const w=R.modal(`<div class="logo"><div class="l1">RIFT</div><div class="l2">BINDER</div><div class="l3">Daemons × Cards · a Tiny City adventure</div></div><div class="tbtns">${has?'<button class="btn big" data-a="cont">▶ Continue</button>':''}<button class="btn ${has?'secondary':'big'}" data-a="new">✦ New Game</button><button class="btn secondary" data-a="how">How to play</button><button class="btn secondary ${R.isInstalled()||window.NOINSTALL?'hidden':''}" data-a="install" id="btnInstall">⬇ Install app</button></div><div class="foot">Tiny City tiles by Kenney (CC0) · Mashup build</div>`,'title');
  w.addEventListener('click',async e=>{const b=e.target.closest('[data-a]');if(!b)return;R.audioInit();R.sfx('select');
    const a=b.dataset.a;
    if(a==='cont'){const s=R.loadSave();if(s){w.close();R.S=s;await R.enterWorld();}}
    else if(a==='new'){if(has&&!(await R.confirm('Start a new game? Your current save will be replaced.','Start new','Cancel')))return;w.close();newGame();}
    else if(a==='how')howTo();
    else if(a==='install')R.doInstall();
  });
  window.G.refreshInstall=()=>{const b=$('#btnInstall');if(b)b.classList.toggle('hidden',!!(R.isInstalled()));};
};
function howTo(){
  const w=R.modal(`<h2>How to play</h2><div class="how"><p><b>The idea:</b> the Astral Rift split open over Tiny City. <b>Daemons</b> pour out — and you fight beside one while playing <b>Spirit Cards</b> from your Binder hand.</p>
  <p>🚶 <b>Explore</b> with the stick (or arrows/WASD). Daemons only chase you on <b>grass, gravel and plaza stone</b> — sidewalks and roads are safe.</p>
  <p>⚔️ <b>Duels are real-time:</b> ▲ jump, <b>Slash</b> (A), <b>Shot</b> (S), <b>Special</b> (D). Land hits to fill <b>Energy</b> for your <b>Ultimate</b> (F). Dodge the red <b>!</b> wind-ups.</p>
  <p>🃏 <b>Cards:</b> tap a card in your hand (keys 1–3). Each costs <b>Focus</b> (blue bar) and has an archetype: strike, volley, guard, heal, poison, stun, drain or buff. Matching element beats the foe's element ×1.5!</p>
  <p>◉ <b>Binding:</b> weaken a wild Daemon under 38% HP and press <b>Bind</b>. You keep the Daemon <i>and</i> earn a Spirit Card of its element.</p>
  <p>🏙️ Eight districts, eight <b>Keepers</b> (★). Each gives a <b>Gift</b> (press R in a duel). Beat them all and the Rift Plaza opens.</p>
  <p>Visit <b>Clinics</b> to heal, <b>Markets</b> for Orbs/Tonics/Packs and <b>Bus Stops</b> to travel. Challengers (!) pay out cards when you win.</p></div><div class="actions"><button class="btn" data-x>Got it</button></div>`,'how');
  w.addEventListener('click',e=>{if(e.target.closest('[data-x]'))w.close();});
}
async function newGame(){
  const w=R.modal(`<h2>New Binder</h2><p class="muted">What's your name?</p><input id="nameIn" maxlength="12" value="Binder" autocomplete="off"><div class="actions"><button class="btn" data-n>Next ▶</button><button class="btn secondary" data-b>Back</button></div>`,'small');
  w.addEventListener('click',e=>{
    if(e.target.closest('[data-b]')){w.close();R.titleScreen();return;}
    if(e.target.closest('[data-n]')){const name=($('#nameIn',w).value||'Binder').trim().slice(0,12)||'Binder';w.close();starterPick(name);}
  });
  setTimeout(()=>{const i=$('#nameIn');if(i){i.focus();i.select();}},50);
}
function starterPick(name){
  const ids=[1,11,21];
  const w=R.modal(`<div class="eyebrow">A new bond</div><h2>Choose your first Daemon</h2><p class="muted">Different elements, different Specials. You can bind the whole roster later.</p><div class="starters">${ids.map(id=>{const d=R.D(id),p=R.POWERS[d.type];return `<button class="creatureCard" data-id="${id}" style="--c:${R.TYPE_COL[d.type]}">${R.spHtml(id,1.0)}<b>${d.name}</b><span>${R.TYPE_ICON[d.type]} ${d.type}</span><small>S ${p[0]} · D ${p[1]}</small></button>`;}).join('')}</div><p class="muted">Fire › Nature · Water › Fire · Nature › Water. Your first choice isn't permanent.</p>`,'starter');
  w.addEventListener('click',async e=>{const b=e.target.closest('[data-id]');if(!b)return;const id=+b.dataset.id;R.sfx('capture');w.close();
    R.S=R.newState(name,id);
    const el=R.D2E[R.D(id).type];const cid=R.rollCard(el,0,{bonus:-.4});const res=R.giveCard(cid);
    R.S.seen[id]=true;
    await R.enterWorld();
    await R.revealCards([res]);
  });
}
R.enterWorld=async function(){
  const S=R.S;
  R.sfx('open');
  R.startWorld();
  R.world.musicNow=null;
  // greet
  if(!S.flags.intro){R.world.paused=true;await R.say({name:'Narrator'},[`The Astral Rift split the sky over Tiny City three days ago.`,`You wake in Ember Row with a Binder's deck and a Daemon at your side. Find the Archivist — the gold arrow shows the way.`]);R.world.paused=false;}
};

/* ---------- ending ---------- */
R.ending=async function(){
  const S=R.S;R.world.paused=true;R.music('ending');
  await R.say({name:'The Rift Wielder',spr:'final_wielder'},['…The door closes. I was never the enemy — only the lock that wouldn\'t break.','Take care of them, Binder. Daemons and spirits alike. The city is yours.']);
  await new Promise(res=>{
    const w=R.modal(`<div class="eyebrow">The Rift is sealed</div><h2>✦ RIFTBINDER · COMPLETE ✦</h2><p>${S.name}, you closed the Rift and saved Tiny City.</p><div class="inv"><div class="invi">⚔️<b>${S.wins}</b><small>Wins</small></div><div class="invi">🐾<b>${Object.keys(S.owned).length}/110</b><small>Daemons</small></div><div class="invi">🃏<b>${R.ownedCards().length}/201</b><small>Cards</small></div><div class="invi">⏱<b>${R.fmtTime(S.play)}</b><small>Time</small></div></div><p class="muted">Keep exploring — complete the Dex and the full Binder, and meet every challenger!</p><div class="actions"><button class="btn" data-x>Keep playing</button></div>`,'report');
    w.addEventListener('click',e=>{if(e.target.closest('[data-x]')){w.close();res();}});
  });
  R.music(R.DISTRICTS[8].music);R.world.musicNow=null;R.save();
};
})(window.R=window.R||{});
