const VER='riftbinder-v7';
const CORE=['./','index.html','style.css','manifest.json','icon-192.png','icon-512.png','js/audio.js','js/data-cards.js','js/data-daemons.js','js/core.js','js/city.js','js/world.js','js/duel.js','js/ui.js','js/main.js','tiles/city.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VER).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{
    if(res&&res.ok&&new URL(r.url).origin===location.origin){const cp=res.clone();caches.open(VER).then(c=>c.put(r,cp));}
    return res;}).catch(()=>hit)));
});
self.addEventListener('message',e=>{
  if(e.data!=='precache')return;
  const pad=(n,l)=>String(n).padStart(l,'0');
  const R_S=i=>'sprites/'+pad(i,3)+'.png',R_C=i=>'cards/'+pad(i,3)+'.webp';
  const urls=[];
  for(let i=1;i<=110;i++)urls.push(R_S(i));
  for(let i=1;i<=201;i++)urls.push(R_C(i));
  ['hero','archivist','healer','rival','final_wielder','guardian_ember','guardian_tide','guardian_grove','guardian_storm','guardian_stone','guardian_shadow','guardian_frost','guardian_venom'].forEach(n=>urls.push('npcs/'+n+'.png'));
  e.waitUntil(caches.open(VER).then(async c=>{for(const u of urls){try{if(!(await c.match(u)))await c.add(u);}catch(_){}}}));
});
