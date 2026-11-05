/* ===== RIFTBINDER · main.js — boot ===== */
(function(R){
'use strict';
const $=R.$;
window.addEventListener('load',async()=>{
  R.initCanvas();R.setupInput();
  R.mode='title';
  R.startLoop();
  const ld=document.createElement('div');ld.id='loading';ld.innerHTML='<div class="spin"></div><div>Building Tiny City…</div>';document.body.appendChild(ld);
  try{
    await R.initWorld();
    ['hero','archivist','healer','rival','final_wielder','guardian_ember','guardian_tide','guardian_grove','guardian_storm','guardian_stone','guardian_shadow','guardian_frost','guardian_venom'].forEach(n=>R.npcImg(n));
    [1,11,21,31,41,51,61,71,81,91].forEach(i=>R.sprite(i));
  }catch(e){console.error(e);ld.innerHTML='Failed to load: '+e.message;return;}
  ld.remove();
  $('#mini').addEventListener('pointerdown',e=>{if(R.mode==='world'&&!R.world.paused){R.openMenu('map');}});
  R.titleScreen();
  if('serviceWorker' in navigator){navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(r=>{setTimeout(()=>r.active&&r.active.postMessage('precache'),9000);}).catch(()=>{});}
  window.__R=R; // debug hook
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&R.S)R.save();});
window.addEventListener('pagehide',()=>{if(R.S)R.save();});
})(window.R);
