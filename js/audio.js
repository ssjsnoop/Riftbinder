/* ===== procedural chiptune audio (v6: drums, pads, arps, per-weapon / per-element sfx) ===== */
(function(G){
const A = G.audio = {ctx:null,vol:0.6,muted:false,cur:null,timer:null,master:null,step:0};
const SC = {maj:[0,2,4,5,7,9,11],min:[0,2,3,5,7,8,10],dor:[0,2,3,5,7,9,10],phr:[0,1,3,5,7,8,10],lyd:[0,2,4,6,7,9,11]};
/* dr: 0 none, 1 soft, 2 march, 3 drive.  pad: sustained chords.  arp: quiet arpeggio layer. */
const TRACKS = {
 title:  {root:57,sc:'min',bpm:84, w:'triangle',seed:3, den:.7, dr:1,pad:1,arp:1},
 town:   {root:60,sc:'maj',bpm:104,w:'triangle',seed:5, den:.75,dr:1,pad:1,arp:0},
 town2:  {root:57,sc:'dor',bpm:98, w:'square',  seed:61,den:.7, dr:1,pad:1,arp:1},
 town3:  {root:55,sc:'lyd',bpm:92, w:'triangle',seed:62,den:.7, dr:1,pad:1,arp:1},
 town4:  {root:64,sc:'maj',bpm:88, w:'triangle',seed:63,den:.65,dr:0,pad:1,arp:1},
 town5:  {root:52,sc:'dor',bpm:112,w:'square',  seed:64,den:.7, dr:2,pad:1,arp:0},
 town6:  {root:67,sc:'lyd',bpm:100,w:'triangle',seed:65,den:.7, dr:1,pad:1,arp:1},
 town7:  {root:50,sc:'min',bpm:78, w:'triangle',seed:66,den:.6, dr:0,pad:1,arp:1},
 altar:  {root:46,sc:'lyd',bpm:72, w:'triangle',seed:95,den:.55,dr:0,pad:1,arp:1},
 field1: {root:62,sc:'maj',bpm:112,w:'square',  seed:8, den:.6, dr:1,pad:1,arp:0},
 field2: {root:59,sc:'phr',bpm:100,w:'square',  seed:9, den:.6, dr:1,pad:1,arp:1},
 field3: {root:55,sc:'dor',bpm:88, w:'triangle',seed:12,den:.55,dr:0,pad:1,arp:1},
 field4: {root:64,sc:'lyd',bpm:92, w:'triangle',seed:14,den:.6, dr:0,pad:1,arp:1},
 field5: {root:52,sc:'phr',bpm:116,w:'square',  seed:17,den:.7, dr:2,pad:1,arp:0},
 field6: {root:67,sc:'maj',bpm:108,w:'triangle',seed:19,den:.7, dr:1,pad:1,arp:1},
 field7: {root:50,sc:'min',bpm:80, w:'sawtooth',seed:23,den:.5, dr:0,pad:1,arp:1},
 dungeon:{root:48,sc:'min',bpm:90, w:'triangle',seed:31,den:.5, dr:0,pad:1,arp:1},
 dungeon1:{root:48,sc:'min',bpm:84,w:'triangle',seed:71,den:.45,dr:0,pad:1,arp:1},
 dungeon2:{root:47,sc:'phr',bpm:90,w:'triangle',seed:72,den:.5, dr:1,pad:1,arp:0},
 dungeon3:{root:50,sc:'dor',bpm:80,w:'triangle',seed:73,den:.45,dr:0,pad:1,arp:1},
 dungeon4:{root:53,sc:'min',bpm:76,w:'triangle',seed:74,den:.45,dr:0,pad:1,arp:1},
 dungeon5:{root:45,sc:'phr',bpm:104,w:'sawtooth',seed:75,den:.55,dr:2,pad:1,arp:0},
 dungeon6:{root:60,sc:'lyd',bpm:96,w:'triangle',seed:76,den:.55,dr:1,pad:1,arp:1},
 dungeon7:{root:42,sc:'min',bpm:88,w:'sawtooth',seed:77,den:.5, dr:2,pad:1,arp:1},
 battle: {root:57,sc:'min',bpm:150,w:'square',  seed:41,den:.9, dr:3,pad:0,arp:1},
 battleB:{root:55,sc:'phr',bpm:158,w:'square',  seed:81,den:.9, dr:3,pad:0,arp:1},
 battleC:{root:60,sc:'dor',bpm:146,w:'square',  seed:82,den:.85,dr:3,pad:1,arp:1},
 boss:   {root:53,sc:'phr',bpm:164,w:'sawtooth',seed:43,den:.95,dr:3,pad:1,arp:1},
 rival:  {root:50,sc:'min',bpm:168,w:'square',  seed:91,den:.95,dr:3,pad:1,arp:1},
 final:  {root:50,sc:'min',bpm:172,w:'sawtooth',seed:47,den:1,  dr:3,pad:1,arp:1},
 ending: {root:60,sc:'maj',bpm:76, w:'triangle',seed:53,den:.6, dr:0,pad:1,arp:1}
};
const PROGS=[[0,5,3,4,0,5,4,0],[0,3,4,3,0,3,4,4],[0,2,5,4,0,2,3,4],[5,3,0,4,5,3,4,4],[0,4,5,3,0,4,3,4]];
function rnd(seed){let s=seed>>>0;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
const mtof=m=>440*Math.pow(2,(m-69)/12);
function build(t){
  const r=rnd(t.seed*77+1),sc=SC[t.sc],bars=8,len=bars*8;
  const prog=PROGS[t.seed%PROGS.length];
  const d2m=d=>{const o=Math.floor(d/7),i=((d%7)+7)%7;return t.root+12+sc[i]+12*o;};
  const lead=new Array(len).fill(null),bass=new Array(len).fill(null),chords=[];
  // motif: 8 steps, chord tones on strong steps, stepwise motion elsewhere
  const motif=(rd)=>{const m=[];let prev=rd+4;for(let i=0;i<8;i++){
      const strong=(i%4===0);
      if(strong||r()<t.den){let d;
        if(strong)d=rd+[0,2,4,7][(r()*4)|0];
        else d=prev+[-2,-1,1,2][(r()*4)|0];
        d=Math.max(rd-2,Math.min(rd+9,d));prev=d;m.push(d-rd);
      }else m.push(null);}
    return m;};
  const mA=motif(0),mB=motif(0);
  for(let b=0;b<bars;b++){
    const rd=prog[b],base=(b%4<2)?mA:(b<4?mB:(b%4<2?mA:mB));
    const pat=(b===3||b===7)?base.map((x,i)=>i>=5?(i===7?0:null):x):base.slice();   // phrase ends settle on the chord root
    for(let i=0;i<8;i++){if(pat[i]!==null&&pat[i]!==undefined){
      let m=d2m(rd+pat[i]);if(b===7&&i===7)m=d2m(0);
      lead[b*8+i]={m:m,d:(i===7||(i<7&&pat.slice(i+1).every(x=>x===null||x===undefined)))?4:1.6};}}
    chords.push([d2m(rd)-12,d2m(rd+2)-12,d2m(rd+4)-12]);
    const bm=t.root-12+sc[rd%7];
    if(t.dr>=2){for(let i=0;i<8;i++)bass[b*8+i]=bm+((i%2)?12:0)+((i===6&&r()<.5)?7:0);}
    else{bass[b*8]=bm;bass[b*8+4]=bm+(r()<.5?7:0);bass[b*8+6]=t.root-12+sc[(rd+2)%7];}
  }
  return {len,lead,bass,chords};
}
A.init=function(){
  if(A.ctx)return;
  try{const C=window.AudioContext||window.webkitAudioContext;A.ctx=new C();A.master=A.ctx.createGain();
    let out=A.master;try{const comp=A.ctx.createDynamicsCompressor();comp.threshold.value=-14;comp.ratio.value=5;A.master.connect(comp);out=comp;}catch(e){}
    out.connect(A.ctx.destination);A.apply();}catch(e){}
};
A.apply=function(){if(A.master)A.master.gain.value=A.muted?0:A.vol*0.35;};
A.has=n=>!!TRACKS[n];
/* ---------- synth primitives ---------- */
let OUT=null;const dst=()=>OUT||A.master;
function sfxBus(){const c=A.ctx;if(!A.sbus||A.sbus.context!==c){A.sbus=c.createGain();A.sbus.gain.value=2.3;A.sbus.connect(A.master);}return A.sbus;}
function onBus(fn){OUT=sfxBus();try{fn();}finally{OUT=null;}}
function tone(f,t0,dur,type,vol,dest){
  const c=A.ctx,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(vol,t0+0.01);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(dest||dst());o.start(t0);o.stop(t0+dur+0.02);
}
function sw(f0,f1,t0,dur,type,vol){ // pitch sweep
  const c=A.ctx,o=c.createOscillator(),g=c.createGain();o.type=type||'sine';
  o.frequency.setValueAtTime(f0,t0);o.frequency.exponentialRampToValueAtTime(Math.max(20,f1),t0+dur);
  g.gain.setValueAtTime(0.0001,t0);g.gain.linearRampToValueAtTime(vol,t0+0.008);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  o.connect(g);g.connect(dst());o.start(t0);o.stop(t0+dur+0.02);
}
let NBUF=null;
function nbuf(){const c=A.ctx;if(NBUF&&NBUF.sampleRate===c.sampleRate)return NBUF;
  const b=c.createBuffer(1,c.sampleRate,c.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;NBUF=b;return b;}
function nz(t0,dur,vol,ft,f0,f1,q){ // filtered noise, optional filter sweep f0->f1
  const c=A.ctx,s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=nbuf();f.type=ft||'lowpass';f.Q.value=q||1;f.frequency.setValueAtTime(f0||1000,t0);
  if(f1)f.frequency.exponentialRampToValueAtTime(f1,t0+dur);
  g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
  s.connect(f);f.connect(g);g.connect(dst());s.start(t0,Math.random()*.5);s.stop(t0+dur+0.02);
}
function noise(t0,dur,vol){nz(t0,dur,vol,'lowpass',8000);}
function kick(t,v){sw(160,42,t,.14,'sine',(v||.5));}
function snare(t,v){nz(t,.11,(v||.3),'bandpass',1900,1200,.8);tone(190,t,.06,'triangle',(v||.3)*.5);}
function hat(t,v){nz(t,.03,(v||.08),'highpass',7500,7500,1);}
/* ---------- music ---------- */
function schedStep(t,tr,tk,s,at,sd,mute){
  const p=s%8,bar=(s/8)|0,L=tr.lead[s],B=tr.bass[s],lv=tk.pad?.19:.22;
  if(L)tone(mtof(L.m),at,sd*L.d,tk.w,lv);
  if(B)tone(mtof(B),at,sd*(tk.dr>=2?1.1:2.2),'triangle',.4);
  if(tk.pad&&p===0){tr.chords[bar].forEach(m=>tone(mtof(m+12),at,sd*7.5,'triangle',.07));}
  if(tk.arp){const ch=tr.chords[bar];if(tk.dr>=2||p%2===0)tone(mtof(ch[(p>>(tk.dr>=2?0:1))%3]+24),at,sd*.9,'square',.045);}
  const fill=(tk.dr===3&&bar%8===7);
  if(tk.dr===1){if(p===0||p===4)kick(at,.32);if(p===2||p===6)hat(at,.05);}
  else if(tk.dr===2){if(p===0||p===4)kick(at,.4);if(p===2||p===6)snare(at,.22);if(p%2===1)hat(at,.05);}
  else if(tk.dr===3){
    if(p===0||p===3||p===4)kick(at,.45);
    if(p===2||p===6)snare(at,.28);
    if(fill&&p>=4)snare(at,.18+p*.02);
    hat(at,p%2?.07:.045);
  }
}
A.play=function(name){
  if(A.cur===name)return;A.cur=name;
  if(A.timer){clearInterval(A.timer);A.timer=null;}
  const nm=TRACKS[name]?name:name.replace(/\d+$/,'');
  if(!A.ctx||!TRACKS[nm])return;
  const tk=TRACKS[nm],tr=build(tk),sd=60/tk.bpm/2;
  let step=0,next=A.ctx.currentTime+0.05;
  A.timer=setInterval(()=>{
    if(!A.ctx)return;
    while(next<A.ctx.currentTime+0.3){schedStep(0,tr,tk,step%tr.len,next,sd);next+=sd;step++;}
  },100);
};
A.stop=function(){A.cur=null;if(A.timer){clearInterval(A.timer);A.timer=null;}};
A.battleTrack=function(){return ['battle','battleB','battleC'][Math.floor(Math.random()*3)];};
/* test hook: schedule n steps of a track into whatever context A.ctx currently is */
A._renderTrack=function(name,steps){const tk=TRACKS[name],tr=build(tk),sd=60/tk.bpm/2;for(let i=0;i<steps;i++)schedStep(0,tr,tk,i%tr.len,i*sd,sd);};
/* ---------- weapon swings (per look) ---------- */
const SWING={
 wood:t=>{nz(t,.14,.45,'bandpass',900,300,.8);nz(t+.07,.1,.45,'lowpass',500,150);sw(170,80,t+.07,.12,'triangle',.4);},
 iron:t=>{nz(t,.12,.5,'bandpass',3400,900,1.3);nz(t+.08,.06,.4,'highpass',3000,3000);sw(1500,1350,t+.08,.2,'square',.1);sw(2250,2200,t+.08,.18,'triangle',.08);sw(150,70,t+.08,.1,'sine',.35);},
 sun:t=>{nz(t,.13,.45,'bandpass',3000,1000,1.2);[1319,1568,2093].forEach((f,i)=>tone(f,t+.07+i*.05,.25,'triangle',.18));sw(150,70,t+.08,.1,'sine',.3);},
 tide:t=>{nz(t,.2,.45,'bandpass',1200,500,1);for(let i=0;i<3;i++)sw(500+i*150,1000+i*200,t+.06+i*.05,.1,'sine',.18);nz(t+.1,.18,.3,'bandpass',2600,900,.7);sw(150,70,t+.08,.1,'sine',.3);},
 frost:t=>{nz(t,.11,.45,'bandpass',4200,1500,1.5);[3136,2637,3520,2093].forEach((f,i)=>tone(f,t+.07+i*.035,.14,'triangle',.12));sw(160,75,t+.08,.1,'sine',.3);},
 magma:t=>{nz(t,.2,.5,'bandpass',600,2200,.8);for(let i=0;i<4;i++)nz(t+.08+i*.04,.03,.4,'highpass',3000,3000);sw(110,40,t+.1,.25,'sine',.5);},
 sky:t=>{nz(t,.22,1,'bandpass',500,3500,2.5);nz(t+.12,.2,.7,'bandpass',3200,900,2);sw(500,1400,t+.08,.12,'triangle',.12);},
 dawn:t=>{nz(t,.13,.45,'bandpass',3000,900,1.2);[1047,1319,1568,2093,2637].forEach((f,i)=>tone(f,t+.06+i*.04,.22,'triangle',.15));sw(150,70,t+.08,.1,'sine',.3);},
 binder:t=>{nz(t,.15,.4,'highpass',2500,6000,1);[880,1175,1480].forEach((f,i)=>tone(f,t+.06+i*.05,.25,'triangle',.17));nz(t+.09,.12,.35,'bandpass',1800,900,1);},
 omega:t=>{sw(90,30,t,.35,'sine',.55);nz(t,.22,.45,'bandpass',500,2800,1.5);[392,587,784,1175].forEach((f,i)=>tone(f,t+.08+i*.04,.4,'sawtooth',.1));sw(130,60,t+.1,.15,'sine',.4);},
 spear:t=>{nz(t,.08,.45,'bandpass',4800,2600,2);sw(1800,2600,t,.07,'triangle',.1);nz(t+.06,.05,.4,'highpass',3500,3500);sw(200,90,t+.06,.09,'sine',.35);},
 axe:t=>{nz(t,.22,.5,'bandpass',700,250,.9);nz(t+.14,.15,.55,'lowpass',700,120);sw(120,40,t+.14,.22,'sine',.6);},
 staff:t=>{sw(400,1600,t,.12,'sawtooth',.14);sw(1800,500,t+.1,.1,'square',.1);nz(t+.06,.1,.35,'bandpass',2500,800,1);sw(170,80,t+.1,.1,'sine',.3);},
 scythe:t=>{nz(t,.32,.45,'bandpass',300,2200,2);nz(t+.2,.25,.35,'bandpass',2400,500,2);sw(260,90,t+.04,.4,'sawtooth',.08);sw(140,55,t+.22,.15,'sine',.4);}
};
A.swing=function(look){if(!A.ctx||A.muted)return;onBus(()=>(SWING[look]||SWING.iron)(A.ctx.currentTime));};
/* ---------- element spells ---------- */
const SPELL={
 fire:t=>{nz(t,.5,.5,'bandpass',500,2600,.7);for(let i=0;i<7;i++)nz(t+.06+i*.045+Math.random()*.02,.035,.4,'highpass',3000,3000);sw(130,40,t+.28,.35,'sine',.55);},
 water:t=>{for(let i=0;i<5;i++){const f=380+Math.random()*350;sw(f,f*2.1,t+i*.06,.11,'sine',.22);}nz(t+.24,.32,.4,'bandpass',2600,800,.7);sw(180,90,t+.26,.2,'sine',.35);},
 wind:t=>{nz(t,.3,1.1,'bandpass',450,2600,3);nz(t+.18,.38,.95,'bandpass',2800,550,3);},
 earth:t=>{sw(120,42,t,.38,'sine',.6);nz(t,.45,.5,'lowpass',450,100,1);for(let i=0;i<4;i++)nz(t+.14+i*.07,.06,.4,'lowpass',950,300);},
 light:t=>{[1047,1319,1568,2093,2637].forEach((f,i)=>tone(f,t+i*.06,.3,'triangle',.2));sw(2000,4500,t,.35,'sine',.07);},
 dark:t=>{sw(320,60,t,.65,'sawtooth',.26);sw(330,64,t,.65,'sawtooth',.18);nz(t,.55,.28,'lowpass',500,140,1);sw(70,45,t+.2,.4,'sine',.4);},
 none:t=>{sw(900,200,t,.2,'square',.2);sw(200,1300,t+.12,.16,'sawtooth',.14);nz(t+.1,.12,.25,'bandpass',2200,900,1);}
};
A.spell=function(el){if(!A.ctx||A.muted)return;onBus(()=>(SPELL[el]||SPELL.none)(A.ctx.currentTime));};
/* ---------- sound effects ---------- */
A.sfx=function(n){
  if(!A.ctx||A.muted)return;if(n==='select'||n==='ok'||n==='back'||n==='step')sfxSwitch(n,A.ctx.currentTime);else onBus(()=>sfxSwitch(n,A.ctx.currentTime));
};
function sfxSwitch(n,t){
  {
  switch(n){
   case 'select':tone(660,t,.07,'square',.25);break;
   case 'ok':tone(520,t,.07,'square',.25);tone(780,t+.07,.1,'square',.25);break;
   case 'back':tone(400,t,.08,'square',.2);break;
   case 'hit':nz(t,.12,.4,'lowpass',1800,250);sw(170,55,t,.13,'sine',.45);break;
   case 'crit':nz(t,.18,.5,'lowpass',2600,300);sw(200,50,t,.16,'sine',.55);tone(1760,t+.02,.18,'triangle',.22);tone(2349,t+.06,.2,'triangle',.18);break;
   case 'hurt':nz(t,.18,.4,'lowpass',1400,200);sw(130,45,t,.2,'sawtooth',.28);sw(90,40,t+.05,.15,'sine',.4);break;
   case 'swipe':nz(t,.14,.9,'bandpass',2800,800,1.5);nz(t+.05,.11,.7,'bandpass',3200,1000,1.5);break;
   case 'guard':nz(t,.06,.4,'highpass',3000,3000);tone(880,t,.16,'square',.2);tone(1320,t+.03,.22,'triangle',.18);sw(200,110,t,.1,'sine',.4);break;
   case 'charge':sw(80,720,t,.9,'sawtooth',.22);nz(t,.9,.22,'bandpass',200,2600,2);break;
   case 'heal':[523,659,784,1047].forEach((f,i)=>tone(f,t+i*.07,.2,'triangle',.3));break;
   case 'magic':for(let i=0;i<6;i++)tone(300+i*120,t+i*.04,.15,'sine',.25);break;
   case 'summon':[262,330,392,523,659,784].forEach((f,i)=>tone(f,t+i*.06,.25,'square',.22));sw(100,400,t,.4,'sawtooth',.1);break;
   case 'capture':[392,523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.09,.3,'triangle',.35));break;
   case 'fail':tone(300,t,.15,'square',.3);tone(200,t+.15,.3,'square',.3);break;
   case 'level':[523,659,784,1047,1319,1568].forEach((f,i)=>tone(f,t+i*.1,.3,'square',.28));break;
   case 'win':[523,523,523,659,784,659,784,1047].forEach((f,i)=>tone(f,t+i*.12,.2,'square',.28));break;
   case 'lose':[392,370,349,330,262].forEach((f,i)=>tone(f,t+i*.25,.4,'triangle',.35));break;
   case 'step':tone(90,t,.04,'triangle',.08);break;
   case 'chest':[523,659,784,1047].forEach((f,i)=>tone(f,t+i*.08,.2,'square',.25));break;
   case 'encounter':for(let i=0;i<8;i++)tone(200+(i%2)*200+i*30,t+i*.05,.08,'square',.28);break;
   case 'open':for(let i=0;i<8;i++)tone(200+i*90,t+i*.05,.2,'sawtooth',.2);break;
  }
  }
}
})(window.G);
