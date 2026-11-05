/* ===== RIFTBINDER · city.js — Kenney Tiny City atlas, district themes, procedural city generator ===== */
(function(R){
'use strict';
const TS=16;
// block pitch / roads / margins  -> 6x6 blocks, 3x3 districts of 2x2 blocks
const PX=22, PY=18, M=2, NB=6;
const W=M*2+NB*PX+2, H=M*2+NB*PY+2;
// tile ids (Kenney Tiny City 12x11 sheet) + synthetic tiles appended below the sheet
const T={SW1:88,SW2:100,ASPH:136,G0:132,G1:133,G2:134,G3:135,GRAVEL:137,PLAZA:138,PLAZA2:139,SNOWG:147,
  E_UL:141,E_DR:142,E_DL:143,N_UL:144,N_DR:145,N_DL:146, ROOF_BR:0, ROOF_BL:6};
R.TS=TS; R.CITY={W,H,PX,PY,M,T};

/* ---------------- district themes ---------------- */
// index = tier (clockwise from NW), 8 = Rift Plaza
R.DISTRICTS=[
 {id:0,name:'Ember Row',elem:'Fire',types:['Fire','Wild','Machine'],keeperName:'Ash Keeper Sola',kn:'guardian_ember',boss:10,gift:0,lvl:6,
  grass:'#b3a35a',grass2:'#9d8d48',deco:['#ffb36b','#ff7a4a'],grade:{h:-8,s:1.12,v:1.0,tint:[255,140,60],ta:.10},sky:['#3a1d24','#e58a4c'],music:'town',field:'field1',weather:'ember',
  blurb:'Amber lamps and brick rooftops. The first Rift tremors started here.'},
 {id:1,name:'Stormspire',elem:'Storm',types:['Storm','Wild','Astral'],keeperName:'Storm Keeper Iris',kn:'guardian_storm',boss:40,gift:3,lvl:11,
  grass:'#93b45e',grass2:'#7fa04c',deco:['#fff3a0','#ffffff'],grade:{h:14,s:.95,v:1.04,tint:[255,235,120],ta:.07},sky:['#2c2f55','#8e9ad0'],music:'town2',field:'field6',weather:'storm',
  blurb:'Windmills and lightning rods. The air crackles with static.'},
 {id:2,name:'Frostline',elem:'Frost',types:['Frost','Water','Astral'],keeperName:'Frost Keeper Elva',kn:'guardian_frost',boss:70,gift:6,lvl:16,
  grass:'#dbeaf2',grass2:'#c5dbe8',deco:['#ffffff','#bfe9ff'],grade:{h:10,s:.85,v:1.08,tint:[170,220,255],ta:.18},sky:['#27406a','#cfe9ff'],music:'town4',field:'field4',weather:'snow',
  blurb:'Rooftops under snow, frozen fountains and breath like smoke.'},
 {id:3,name:'Ironstone',elem:'Stone',types:['Stone','Machine','Wild'],keeperName:'Stone Keeper Goran',kn:'guardian_stone',boss:50,gift:4,lvl:21,
  grass:'#a49d8a',grass2:'#8f8878',deco:['#d9d2c0','#7d786c'],grade:{h:0,s:.55,v:.98,tint:[160,160,150],ta:.14},sky:['#2b2d36','#9ea2ad'],music:'town5',field:'field5',weather:'dust',
  blurb:'A quarry town of gravel lots and iron fences.'},
 {id:4,name:'Venomroot',elem:'Venom',types:['Venom','Nature','Shadow'],keeperName:'Mire Keeper Voss',kn:'guardian_venom',boss:80,gift:7,lvl:26,
  grass:'#7f9a3f',grass2:'#6c8734',deco:['#d6ff7a','#9dea8d'],grade:{h:38,s:1.05,v:.94,tint:[150,255,90],ta:.11},sky:['#1d2f22','#a0c36a'],music:'town3',field:'field3',weather:'spore',
  blurb:'Roots crack the pavement. Something green hums under the streets.'},
 {id:5,name:'Umbra Alley',elem:'Shadow',types:['Shadow','Venom','Astral'],keeperName:'Shade Keeper Nyx',kn:'guardian_shadow',boss:60,gift:5,lvl:31,
  grass:'#51507a',grass2:'#434268',deco:['#c79cff','#8a7bd6'],grade:{h:6,s:.9,v:.66,tint:[120,70,200],ta:.24},sky:['#0c0a1e','#4a3a86'],music:'town7',field:'field7',weather:'mist',
  blurb:'Moonlit alleys. The lamps flicker whenever a Daemon passes.'},
 {id:6,name:'Tideside Quay',elem:'Water',types:['Water','Frost','Nature'],keeperName:'Tide Keeper Maren',kn:'guardian_tide',boss:20,gift:1,lvl:36,
  grass:'#7ec5ae',grass2:'#68b09a',deco:['#c9fff0','#ffffff'],grade:{h:24,s:1.0,v:1.02,tint:[80,200,255],ta:.11},sky:['#1a4a6a','#9fe4ee'],music:'town6',field:'field2',weather:'rain',
  blurb:'Harbor lights and rain on cobbles. Every puddle hides a Daemon.'},
 {id:7,name:'Verdant Hollow',elem:'Nature',types:['Nature','Wild','Venom'],keeperName:'Grove Keeper Oren',kn:'guardian_grove',boss:30,gift:2,lvl:41,
  grass:'#5eaf4e',grass2:'#4c9a40',deco:['#fff2a8','#ff9ecf'],grade:{h:20,s:1.08,v:1.0,tint:[100,255,120],ta:.08},sky:['#17402a','#a9e08a'],music:'town',field:'field1',weather:'leaf',
  blurb:'Overgrown balconies and ivy-choked lamp posts.'},
 {id:8,name:'The Rift Plaza',elem:'Astral',types:['Astral','Machine','Shadow'],keeperName:'The Rift Wielder',kn:'final_wielder',boss:110,gift:-1,lvl:49,
  grass:'#4a3d78',grass2:'#3b3063',deco:['#e3a5ff','#7df0ff'],grade:{h:10,s:1.0,v:.8,tint:[200,120,255],ta:.20},sky:['#10042a','#6a2aa0'],music:'altar',field:'field7',weather:'rift',
  blurb:'The sky is torn open above the old square.'}
];
// 3x3 district grid (row-major) -> district id
const DGRID=[[0,1,2],[7,8,3],[6,5,4]];
R.districtAt=(x,y)=>{const bx=Math.max(0,Math.min(NB-1,Math.floor((x-M)/PX))),by=Math.max(0,Math.min(NB-1,Math.floor((y-M)/PY)));return DGRID[by>>1][bx>>1];};

/* ---------------- tinted atlases ---------------- */
function rgb2hsv(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let h=0;if(d){if(mx===r)h=((g-b)/d)%6;else if(mx===g)h=(b-r)/d+2;else h=(r-g)/d+4;h*=60;if(h<0)h+=360;}return[h,mx?d/mx:0,mx];}
function hsv2rgb(h,s,v){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;let r=0,g=0,b=0;if(h<60){r=c;g=x;}else if(h<120){r=x;g=c;}else if(h<180){g=c;b=x;}else if(h<240){g=x;b=c;}else if(h<300){r=x;b=c;}else{r=c;b=x;}return[(r+m)*255,(g+m)*255,(b+m)*255];}
function hex2rgb(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
function hash2(x,y){let h=(x*374761393+y*668265263)^0x5bd1e995;h=(h^(h>>>13))*1274126177;return ((h^(h>>>16))>>>0)/4294967296;}
R.hash2=hash2;
R.rng=function(seed){let a=seed>>>0;const f=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};f.i=n=>Math.floor(f()*n);f.r=(a,b)=>a+f.i(b-a+1);f.pick=arr=>arr[f.i(arr.length)];return f;};

R.makeAtlas=function(src,th){
  const c=document.createElement('canvas');c.width=192;c.height=176+32;const x=c.getContext('2d',{willReadFrequently:true});x.imageSmoothingEnabled=false;
  x.drawImage(src,0,0);
  const id=x.getImageData(0,0,192,176),d=id.data,g=th.grade,tt=g.tint;
  for(let i=0;i<d.length;i+=4){if(!d[i+3])continue;let [h,s,v]=rgb2hsv(d[i],d[i+1],d[i+2]);
    h=(h+g.h+360)%360;s=Math.min(1,s*g.s);v=Math.min(1,v*g.v);
    let [r,gg,b]=hsv2rgb(h,s,v);r=r*(1-g.ta)+tt[0]*g.ta*(v+.25);gg=gg*(1-g.ta)+tt[1]*g.ta*(v+.25);b=b*(1-g.ta)+tt[2]*g.ta*(v+.25);
    d[i]=Math.max(0,Math.min(255,r));d[i+1]=Math.max(0,Math.min(255,gg));d[i+2]=Math.max(0,Math.min(255,b));}
  x.putImageData(id,0,0);
  const cell=(i)=>[(i%12)*16,((i/12)|0)*16];
  const put=(i,fn)=>{const[px,py]=cell(i);x.save();x.beginPath();x.rect(px,py,16,16);x.clip();x.translate(px,py);fn();x.restore();};
  const flip=(srcI,dstI,fx,fy)=>{const[sx,sy]=cell(srcI);put(dstI,()=>{x.save();x.translate(fx?16:0,fy?16:0);x.scale(fx?-1:1,fy?-1:1);x.drawImage(c,sx,sy,16,16,0,0,16,16);x.restore();});};
  // asphalt = centre pixel of the plain right-curb road tile (62)
  const [ax,ay]=cell(62);const ap=x.getImageData(ax+8,ay+8,1,1).data;const asph=`rgb(${ap[0]},${ap[1]},${ap[2]})`;
  put(T.ASPH,()=>{x.fillStyle=asph;x.fillRect(0,0,16,16);});
  flip(65,T.E_UL,1,0);flip(65,T.E_DR,0,1);flip(65,T.E_DL,1,1);
  flip(89,T.N_UL,1,0);flip(89,T.N_DR,0,1);flip(89,T.N_DL,1,1);
  // grass family
  const gb=th.grass,g2=th.grass2;
  const grass=(i,kind)=>put(i,()=>{x.fillStyle=gb;x.fillRect(0,0,16,16);x.fillStyle=g2;
    const r=R.rng(i*131+7);
    for(let k=0;k<(kind===3?7:3);k++){const px=r.i(14),py=r.i(14);x.fillRect(px,py,1,1);if(kind===3){x.fillRect(px+1,py+1,1,1);x.fillRect(px,py-1<0?0:py-1,1,1);}}
    if(kind===1||kind===2){const cols=th.deco;for(let k=0;k<2+(kind===2);k++){const px=2+r.i(11),py=2+r.i(11);x.fillStyle=cols[k%2];x.fillRect(px,py-1,1,3);x.fillRect(px-1,py,3,1);x.fillStyle='#fff7c2';x.fillRect(px,py,1,1);}}
  });
  grass(T.G0,0);grass(T.G1,1);grass(T.G2,2);grass(T.G3,3);
  put(T.GRAVEL,()=>{x.fillStyle=gb;x.fillRect(0,0,16,16);const r=R.rng(991);x.fillStyle=g2;for(let k=0;k<10;k++)x.fillRect(r.i(15),r.i(15),2,1);x.fillStyle=th.deco[0];x.globalAlpha=.4;for(let k=0;k<4;k++)x.fillRect(r.i(15),r.i(15),1,1);x.globalAlpha=1;});
  put(T.PLAZA,()=>{x.fillStyle=gb;x.fillRect(0,0,16,16);x.fillStyle=g2;x.fillRect(0,15,16,1);x.fillRect(15,0,1,16);x.fillStyle=th.deco[1];x.globalAlpha=.25;x.fillRect(3,3,2,1);x.fillRect(10,9,1,2);x.globalAlpha=1;});
  put(T.PLAZA2,()=>{x.fillStyle=g2;x.fillRect(0,0,16,16);x.fillStyle=gb;x.fillRect(0,15,16,1);x.fillRect(15,0,1,16);x.fillStyle=th.deco[0];x.globalAlpha=.55;x.fillRect(2,7,12,1);x.fillRect(7,2,1,12);x.globalAlpha=1;});
  put(T.SNOWG,()=>{x.fillStyle=gb;x.fillRect(0,0,16,16);});
  c._asph=asph;
  return c;
};

/* ---------------- procedural city ---------------- */
R.buildCity=function(seed){
  const N=W*H,g=new Int16Array(N),o=new Int16Array(N).fill(-1),tp=new Int16Array(N).fill(-1),sol=new Uint8Array(N),zn=new Uint8Array(N),dist=new Uint8Array(N),road=new Uint8Array(N);
  const city={W,H,g,o,tp,sol,zn,dist,doors:[],stops:[],chests:[],npcSpots:[],keepers:[],decor:[],barrier:[],wild:Array.from({length:9},()=>[]),safeByDist:Array.from({length:9},()=>[]),rift:null,start:{x:0,y:0},blocks:[],lamps:[]};
  const rnd=R.rng(seed||1337);
  const idx=(x,y)=>y*W+x,inb=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
  const grassT=(x,y)=>{const h=hash2(x,y);return h<.06?T.G1:h<.11?T.G2:h<.2?T.G3:T.G0;};
  const setG=(x,y,t)=>{if(inb(x,y))g[idx(x,y)]=t;};
  const setO=(x,y,t,s=true)=>{if(!inb(x,y))return;const i=idx(x,y);o[i]=t;if(s){sol[i]=1;zn[i]=0;}};
  const setT=(x,y,t)=>{if(inb(x,y))tp[idx(x,y)]=t;};
  const setZ=(x,y,z)=>{if(inb(x,y))zn[idx(x,y)]=z;};
  const clearAt=(x,y)=>{if(!inb(x,y))return;const i=idx(x,y);o[i]=-1;tp[i]=-1;sol[i]=0;};
  const free=(x,y)=>inb(x,y)&&!sol[idx(x,y)]&&o[idx(x,y)]<0&&tp[idx(x,y)]<0;
  const pave=(x,y)=>{if(!inb(x,y))return;const i=idx(x,y);g[i]=hash2(x*3,y*5)<.18?T.SW2:T.SW1;zn[i]=1;sol[i]=0;o[i]=-1;tp[i]=-1;};
  const lawn=(x,y,wild)=>{if(!inb(x,y))return;const i=idx(x,y);g[i]=grassT(x,y);zn[i]=wild?2:1;sol[i]=0;o[i]=-1;tp[i]=-1;};
  const ground=(x,y,t,z)=>{if(!inb(x,y))return;const i=idx(x,y);g[i]=t;zn[i]=z;sol[i]=0;o[i]=-1;tp[i]=-1;};
  // district per tile
  for(let y=0;y<H;y++)for(let x=0;x<W;x++)dist[idx(x,y)]=R.districtAt(x,y);
  // default ground = lawn (blocked until claimed)
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){g[idx(x,y)]=grassT(x,y);zn[idx(x,y)]=0;}

  /* ---- roads ---- */
  const px0=M+2*PX+2,px1=M+4*PX-1,py0=M+2*PY+2,py1=M+4*PY-1; // rift plaza rect
  const inPlaza=(x,y)=>x>=px0&&x<=px1&&y>=py0&&y<=py1;
  for(let k=0;k<=NB;k++){
    for(let t=0;t<2;t++){
      const vx=M+k*PX+t,hy=M+k*PY+t;
      for(let y=M;y<H-M;y++)road[idx(vx,y)]=1;
      for(let x=M;x<W-M;x++)road[idx(x,hy)]=1;
    }
  }
  for(let y=py0;y<=py1;y++)for(let x=px0;x<=px1;x++)road[idx(x,y)]=0;
  const isR=(x,y)=>inb(x,y)&&road[idx(x,y)];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    if(!isR(x,y))continue;const i=idx(x,y);zn[i]=1;
    const L=isR(x-1,y),Rr=isR(x+1,y),U=isR(x,y-1),D=isR(x,y+1);
    const miss=(L?0:1)+(Rr?0:1)+(U?0:1)+(D?0:1);let tile=T.ASPH;
    if(miss===0){
      if(!isR(x+1,y-1))tile=89;else if(!isR(x-1,y-1))tile=T.N_UL;else if(!isR(x+1,y+1))tile=T.N_DR;else if(!isR(x-1,y+1))tile=T.N_DL;
    }else if(miss===1){
      const lane=((x+y)>>1)&1; // dash lanes
      if(!L)tile=lane?73:61;else if(!Rr)tile=lane?74:62;else if(!U)tile=lane?64:63;else tile=lane?76:75;
      // keep dashes sparse
      if(((x*7+y*13)%5)>1){tile=!L?61:!Rr?62:!U?63:75;}
    }else if(miss===2){
      if(!U&&!Rr)tile=65;else if(!U&&!L)tile=T.E_UL;else if(!D&&!Rr)tile=T.E_DR;else if(!D&&!L)tile=T.E_DL;
    }
    g[i]=tile;
  }

  /* ---- edge forest wall ---- */
  const tree=(x,y,col)=>{ if(!inb(x,y)||!inb(x,y+1))return false; setO(x,y,col?68:67); setO(x,y+1,col?80:79); return true; };
  const canTree=(x,y)=>free(x,y)&&free(x,y+1)&&zn[idx(x,y)]!==1&&zn[idx(x,y+1)]!==1;
  for(let x=0;x<W;x++){tree(x,0,(x*3)%5<2?0:1);tree(x,H-2,(x*7)%5<2?0:1);}
  for(let y=2;y<H-2;y+=2){for(const x of [0,W-2]){tree(x,y,(y%6)?1:0);}for(const x of [1,W-1]){tree(x,y-1,(y%4)?1:0);}}
  for(let y=0;y<H;y++)for(const x of [0,1,W-2,W-1]){const i=idx(x,y);if(o[i]<0){o[i]=hash2(x,y)<.5?80:79;sol[i]=1;}}
  for(let x=0;x<W;x++)for(const y of [0,1,H-2,H-1]){const i=idx(x,y);if(o[i]<0){o[i]=hash2(x,y)<.5?80:79;sol[i]=1;}}

  /* ---- building helper ---- */
  const roofBase=(blue)=>blue?6:0;
  function roof(x,y,w,h,blue,r){
    const b=roofBase(blue);
    for(let j=0;j<h;j++)for(let i=0;i<w;i++){
      const top=j===0,bot=j===h-1,lf=i===0,rt=i===w-1;
      let row=top?0:bot?2:1,col=lf?0:rt?2:1,t=b+row*12+col;
      if(row===1&&col===1){const q=hash2(x+i,y+j);if(q<.08)t=b+28-0;else if(q<.25)t=b+29-0;else t=b+13;if(t===b+28)t=blue?34:28;if(t===b+29)t=blue?35:29;}
      setO(x+i,y+j,t);
    }
  }
  /* style: 0 red facade, 1 brown facade ; door kinds: 'single','double','shop' */
  function facade(x,y,w,style,door,doorCol,windowsLower){
    const up=[],lo=[];
    for(let i=0;i<w;i++){
      if(style===0){
        up.push(i===0?36:i===w-1?41:(i%2===1?40:[37,38,39][(x+i)%3]));
        lo.push(i===0?48:i===w-1?53:49);
      }else{
        up.push(i===0?42:i===w-1?47:(i%2===1?46:[43,44,45][(x+i)%3]));
        lo.push(i===0?54:i===w-1?59:55);
      }
    }
    if(door==='double'||door==='shop'){
      lo[doorCol]=style===0?50:56;lo[doorCol+1]=style===0?51:57;up[doorCol]=style===0?38:44;up[doorCol+1]=style===0?39:45;
    }else if(door==='single'){lo[doorCol]=style===0?52:58;up[doorCol]=style===0?38:44;}
    for(let i=0;i<w;i++){setO(x+i,y,up[i]);setO(x+i,y+1,lo[i]);}
    return {x:x+doorCol,y:y+1};
  }
  function building(x,y,w,rh,blue,style,door,doorCol,kind,extra){
    roof(x,y,w,rh,blue);
    const d=facade(x,y+rh,w,style,door,doorCol===undefined?((w/2)|0):doorCol);
    // door entry
    if(kind){const dw=(door==='double'||door==='shop')?2:1;city.doors.push(Object.assign({x:d.x,y:d.y,w:dw,kind,d:dist[idx(d.x,d.y)]},extra||{}));}
    // door front path
    const fx=d.x,fy=d.y+1;pave(fx,fy);if(door!=='single')pave(fx+1,fy);
    return d;
  }
  /* props */
  const lamp=(x,y,kind)=>{const top=kind===1?85:kind===2?87:86,pole=kind===1?97:kind===2?99:98;setT(x,y,top);setO(x,y+1,pole);city.lamps.push({x,y:y+1});};
  const bench=(x,y)=>{setO(x,y,93);setO(x+1,y,94);setO(x+2,y,95);};
  const planter=(x,y,n)=>{for(let i=0;i<n;i++)setO(x+i,y,n===1?71:(i===0||i===n-1)?(i===0?81:83):82);};
  const bin=(x,y)=>setO(x,y,hash2(x,y)<.5?102:109);
  const carA=(x,y)=>{setO(x,y,110);setO(x+1,y,111);setO(x,y+1,122);setO(x+1,y+1,123);};
  const carB=(x,y)=>{setO(x,y,112);setO(x+1,y,113);setO(x,y+1,124);setO(x+1,y+1,125);};
  const boulder=(x,y)=>setO(x,y,118);
  const sign=(x,y,blue)=>{setT(x,y,blue?96:84);setO(x,y+1,98);};
  const busStop=(x,y)=>{setO(x,y,91);setO(x+1,y,92);setO(x,y+1,103);setO(x+1,y+1,104);city.stops.push({x:x+1,y:y+2,sx:x,sy:y,d:dist[idx(x,y)]});sign(x+2,y,true);};
  const fenceH=(x,y,w)=>{for(let i=0;i<w;i++)setO(x+i,y,i===0?129:i===w-1?131:130);};
  const chainH=(x,y,w)=>{for(let i=0;i<w;i++)setO(x+i,y,i===0?126:i===w-1?128:127);};
  const chainV=(x,y,h,left)=>{for(let j=0;j<h;j++)setO(x,y+j,left?114:116);};
  const heightRoof=()=>rnd.r(3,4);
  const freeRect=(x,y,w,h)=>{for(let j=0;j<h;j++)for(let i=0;i<w;i++)if(!free(x+i,y+j))return false;return true;};
  // npc spot register
  const spot=(x,y,d)=>city.npcSpots.push({x,y,d});

  /* ---- block kinds ---- */
  function fillSidewalkRing(x0,y0,bw,bh){
    for(let x=x0;x<x0+bw;x++){pave(x,y0);pave(x,y0+bh-1);}
    for(let y=y0;y<y0+bh;y++){pave(x0,y);pave(x0+bw-1,y);}
  }
  function fillGround(x0,y0,bw,bh,wild){for(let y=y0+1;y<y0+bh-1;y++)for(let x=x0+1;x<x0+bw-1;x++)lawn(x,y,wild);}
  function parkBlock(x0,y0,bw,bh,th,woods){
    fillSidewalkRing(x0,y0,bw,bh);fillGround(x0,y0,bw,bh,true);
    const cx=x0+(bw>>1),cy=y0+(bh>>1);
    // path cross (leave wild quadrants)
    for(let x=x0;x<x0+bw;x++){pave(x,cy);}
    for(let y=y0;y<y0+bh;y++){pave(cx,y);pave(cx-1,y);}
    // central plaza + lamps
    for(let j=-1;j<=1;j++)for(let i=-2;i<=1;i++)pave(cx+i,cy+j);
    lamp(cx-3,cy-3,0);lamp(cx+2,cy-3,0);
    // benches along the horizontal path
    bench(cx-7,cy-1);bench(cx+4,cy+1);
    // trees
    const n=woods?58:30;let tries=0,made=0;
    while(made<n&&tries<600){tries++;const x=rnd.r(x0+1,x0+bw-2),y=rnd.r(y0+1,y0+bh-3);
      if(Math.abs(x-cx)<=2.5&&1)continue;if(Math.abs(y-cy)<=2.5)continue;
      if(!freeRect(x-(woods?0:1),y,woods?1:3,3))continue;
      tree(x,y,(th.id===0||th.id===3)?(rnd()<.55?0:1):rnd()<.18?0:1);made++;}
    // flower planters near gates + boulders
    planter(x0+2,y0+1,3);planter(x0+bw-5,y0+bh-2,3);
    for(let k=0;k<(woods?5:4);k++){const x=rnd.r(x0+2,x0+bw-3),y=rnd.r(y0+2,y0+bh-3);if(free(x,y)&&zn[idx(x,y)]===2&&Math.abs(x-cx)>2&&Math.abs(y-cy)>2)boulder(x,y);}
    // chests
    let c=0,tr=0;while(c<1&&tr<80){tr++;const x=rnd.r(x0+2,x0+bw-3),y=rnd.r(y0+2,y0+bh-3);if(free(x,y)&&zn[idx(x,y)]===2&&Math.abs(x-cx)>1&&Math.abs(y-cy)>1){city.chests.push({x,y,d:th.id,id:'c'+th.id+'_'+x+'_'+y});c++;}}
    for(let y=y0;y<y0+bh;y++)for(let x=x0;x<x0+bw;x++)if(zn[idx(x,y)]===1&&free(x,y)&&hash2(x,y)<.05)spot(x,y,th.id);
  }
  function lotBlock(x0,y0,bw,bh,th){
    fillSidewalkRing(x0,y0,bw,bh);
    for(let y=y0+1;y<y0+bh-1;y++)for(let x=x0+1;x<x0+bw-1;x++)ground(x,y,T.GRAVEL,2);
    // fence (gate gaps middle of north & south)
    const fx0=x0+1,fy0=y0+1,fw=bw-2,fh=bh-2,gate=x0+(bw>>1);
    for(let i=0;i<fw;i++){ if(Math.abs(fx0+i-gate)<=1)continue; setO(fx0+i,fy0,i===0?126:i===fw-1?128:127); setO(fx0+i,fy0+fh-1,i===0?126:i===fw-1?128:127); }
    for(let j=1;j<fh-1;j++){setO(fx0,fy0+j,114);setO(fx0+fw-1,fy0+j,116);}
    for(let j=0;j<fh;j++)for(let i=0;i<fw;i++)if(!sol[idx(fx0+i,fy0+j)])ground(fx0+i,fy0+j,T.GRAVEL,2);
    // path through gate
    for(let y=fy0;y<fy0+fh;y++){pave(gate,y);}
    // contents
    for(let k=0;k<9;k++){const x=rnd.r(fx0+2,fx0+fw-4),y=rnd.r(fy0+2,fy0+fh-4);if(Math.abs(x-gate)<2)continue;if(freeRect(x,y,2,2)){if(rnd()<.5)carA(x,y);else carB(x,y);}}
    for(let k=0;k<10;k++){const x=rnd.r(fx0+1,fx0+fw-2),y=rnd.r(fy0+1,fy0+fh-2);if(free(x,y)&&Math.abs(x-gate)>1)boulder(x,y);}
    for(let k=0;k<5;k++){const x=rnd.r(fx0+1,fx0+fw-3),y=rnd.r(fy0+1,fy0+fh-4);if(Math.abs(x-gate)>2&&canTree(x,y))tree(x,y,0);}
    let c=0,tr=0;while(c<1&&tr<80){tr++;const x=rnd.r(fx0+2,fx0+fw-3),y=rnd.r(fy0+2,fy0+fh-3);if(free(x,y)&&zn[idx(x,y)]===2&&Math.abs(x-gate)>1){city.chests.push({x,y,d:th.id,id:'c'+th.id+'_'+x+'_'+y});c++;}}
    lamp(x0+2,y0+bh-3,1);
  }
  function housesBlock(x0,y0,bw,bh,th){
    fillSidewalkRing(x0,y0,bw,bh);fillGround(x0,y0,bw,bh,false);
    const rows=[y0+1,y0+8];
    rows.forEach((ry,ri)=>{
      let x=x0+1;const end=x0+bw-1;
      while(end-x>=5){
        let w=Math.min(rnd.r(5,7),end-x);if(end-x-w<5&&end-x-w>0)w=end-x;
        const blue=rnd()<.45,style=rnd()<.55?0:1;
        const door=w>=6&&rnd()<.35?'double':'single';
        const dc=1+rnd.i(Math.max(1,w-(door==='double'?3:2)));
        building(x,ry,w,3,blue,style,door,dc,null);
        // yard decor in front row
        const fy=ry+5;
        for(let i=0;i<w;i++){if(!free(x+i,fy)||g[idx(x+i,fy)]===T.SW1||g[idx(x+i,fy)]===T.SW2)continue;ground(x+i,fy,grassT(x+i,fy),1);}
        if(w>=5&&rnd()<.6){const px=x+(dc>1?0:w-1)+(dc>1?0:-0);if(free(px,fy)&&px!==x+dc&&px!==x+dc+1)setO(px,fy,rnd()<.5?71:70);}
        if(rnd()<.5&&w>=6){const tx=x+(dc>w/2?1:w-2);if(canTree(tx,fy-0)&&false)tree(tx,fy,1);}
        x+=w+(rnd()<.55?1:0);
        if(end-x<5)break;
      }
      // walkway row below yard
      for(let xx=x0+1;xx<x0+bw-1;xx++){pave(xx,ry+6);}
    });
    // trees & lamps in the walkways
    lamp(x0+3,y0+1+5,2);lamp(x0+bw-4,y0+8+5,2);
    for(let k=0;k<4;k++){const x=rnd.r(x0+2,x0+bw-3);const y=y0+7;}
    // doors for npc spots
    for(let x=x0+1;x<x0+bw-1;x+=3)for(const y of [y0+7,y0+14])if(free(x,y)&&hash2(x,y)<.4)spot(x,y,th.id);
  }
  function shopsBlock(x0,y0,bw,bh,th,withMarket){
    fillSidewalkRing(x0,y0,bw,bh);fillGround(x0,y0,bw,bh,false);
    // north shop row (brown facades w/ awnings): market + clinic + exchange
    let x=x0+1;const ry=y0+1;const labels=['market','clinic','exchange','house'];let li=0;
    const widths=[5,5,5,3];
    for(let k=0;k<4;k++){
      const w=widths[k];const kind=labels[li++];
      let blue=k%2===0,style=1,door='shop',dc=((w-2)/2)|0;
      if(kind==='clinic'){style=0;door='double';dc=((w-2)/2)|0;blue=false;}
      if(kind==='house'){door='single';dc=1;}
      building(x,ry,w,2,blue,style,door,dc,kind==='house'?null:kind,kind==='house'?null:{label:kind});
      x+=w+(k<3?0:0);if(x>=x0+bw-1)break;
      // 1-tile gap between buildings handled by contiguous strip
    }
    // plaza front: paved
    for(let y=y0+5;y<y0+10;y++)for(let xx=x0+1;xx<x0+bw-1;xx++)pave(xx,y);
    busStop(x0+bw-6,y0+6);
    planter(x0+2,y0+8,3);planter(x0+bw-10,y0+8,3);bench(x0+7,y0+8);
    lamp(x0+4,y0+5,0);lamp(x0+bw-8,y0+5,0);
    // south houses row
    let sx=x0+1;const sy=y0+10;const send=x0+bw-1;
    while(send-sx>=5){let w=Math.min(rnd.r(5,7),send-sx);if(send-sx-w<5&&send-sx-w>0)w=send-sx;building(sx,sy,w,3,rnd()<.5,rnd()<.5?0:1,'single',1+rnd.i(Math.max(1,w-2)),null);sx+=w;if(send-sx<5)break;}
    for(let xx=x0+1;xx<x0+bw-1;xx++)pave(xx,y0+bh-2+0);
    for(let xx=x0+1;xx<x0+bw-1;xx++)pave(xx,y0+bh-3+0);
    for(let y=y0+5;y<y0+10;y++)for(let xx=x0+1;xx<x0+bw-1;xx+=4)if(free(xx,y)&&hash2(xx,y)<.5)spot(xx,y,th.id);
  }
  function plazaBlock(x0,y0,bw,bh,th){
    fillSidewalkRing(x0,y0,bw,bh);
    for(let y=y0+1;y<y0+bh-1;y++)for(let x=x0+1;x<x0+bw-1;x++)pave(x,y);
    const cx=x0+(bw>>1),cy=y0+(bh>>1);
    for(const [dx,dy] of [[-6,-4],[5,-4],[-6,4],[5,4]]){tree(cx+dx,cy+dy-1,rnd()<.5?0:1);tree(cx+dx+1,cy+dy-1,rnd()<.5?0:1);}
    planter(cx-2,cy-1,5);planter(cx-2,cy+1,5);
    bench(cx-8,cy);bench(cx+6,cy);
    lamp(cx-4,cy-3,1);lamp(cx+3,cy-3,1);lamp(cx-4,cy+3,1);lamp(cx+3,cy+3,1);
    if(rnd()<.6)carA(x0+2,y0+bh-4);else carB(x0+bw-4,y0+2);
    for(let y=y0+1;y<y0+bh-1;y++)for(let x=x0+1;x<x0+bw-1;x++)if(free(x,y)&&hash2(x,y)<.045)spot(x,y,th.id);
  }
  function hqBlock(x0,y0,bw,bh,th){
    fillSidewalkRing(x0,y0,bw,bh);
    for(let y=y0+1;y<y0+bh-1;y++)for(let x=x0+1;x<x0+bw-1;x++)pave(x,y);
    const w=12,x=x0+((bw-w)>>1),y=y0+1;
    roof(x,y,w,4,th.id%2===0);
    const door=facade(x,y+4,w,0,'double',(w>>1)-1);
    // extra windows in lower row for grandeur
    for(let i=1;i<w-1;i++){if(i===(w>>1)-1||i===(w>>1))continue;if(i%2===0)setO(x+i,y+5,40);}
    city.doors.push({x:door.x,y:door.y,w:2,kind:'hq',d:th.id,label:'hq'});
    // approach
    const fx=door.x;for(let j=0;j<6;j++){pave(fx,door.y+1+j);pave(fx+1,door.y+1+j);}
    // keeper stands in front
    const kx=fx+1,ky=door.y+4;
    city.keepers.push({x:kx,y:ky,d:th.id});
    // decoration
    planter(x+0,y+7,3);planter(x+w-3,y+7,3);
    lamp(x-1,y+6,1);lamp(x+w,y+6,1);
    tree(x0+2,y0+9,1);tree(x0+bw-3,y0+9,1);tree(x0+2,y0+12,0);tree(x0+bw-3,y0+12,0);
    bench(x0+4,y0+9);bench(x0+bw-7,y0+9);
    // fence line across
    for(let xx=x0+1;xx<x0+bw-1;xx++){ if(free(xx,y0+bh-2)&&(xx<fx-2||xx>fx+3))setO(xx,y0+bh-3,[129,130,131][xx%3]);}
    for(let xx=x0+1;xx<x0+bw-1;xx++){if(free(xx,y0+bh-3))spot(xx,y0+bh-4,th.id);}
  }

  /* ---- assign block kinds ---- */
  const extraKinds=['houses','woods','lot','plaza','houses','woods','lot','plaza'];
  for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++){
    const di=DGRID[dy][dx];
    if(di===8)continue;
    const th=R.DISTRICTS[di];
    const kinds=['hq','shops','park',extraKinds[di]];
    const r=R.rng(seed*31+di*977);
    for(let i=3;i>0;i--){const j=r.i(i+1);[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
    // first district: keep HQ away from spawn block (spawn block = top-left)
    if(di===0&&kinds[0]==='hq'){[kinds[0],kinds[3]]=[kinds[3],kinds[0]];}
    let bi=0;
    for(let by=0;by<2;by++)for(let bx=0;bx<2;bx++){
      const gbx=dx*2+bx,gby=dy*2+by,x0=M+gbx*PX+2,y0=M+gby*PY+2,bw=PX-2,bh=PY-2,kind=kinds[bi++];
      city.blocks.push({x:x0,y:y0,w:bw,h:bh,kind,d:di});
      if(kind==='park')parkBlock(x0,y0,bw,bh,th,false);
      else if(kind==='woods')parkBlock(x0,y0,bw,bh,th,true);
      else if(kind==='lot')lotBlock(x0,y0,bw,bh,th);
      else if(kind==='houses')housesBlock(x0,y0,bw,bh,th);
      else if(kind==='shops')shopsBlock(x0,y0,bw,bh,th);
      else if(kind==='plaza')plazaBlock(x0,y0,bw,bh,th);
      else if(kind==='hq')hqBlock(x0,y0,bw,bh,th);
    }
  }

  /* ---- start block: make sure there are sidewalks, add intro props ---- */
  /* ---- the Rift Plaza ---- */
  {
    const th=R.DISTRICTS[8];
    for(let y=py0;y<=py1;y++)for(let x=px0;x<=px1;x++){const ring=x===px0||x===px1||y===py0||y===py1;
      if(ring){pave(x,y);city.barrier.push({x,y});}
      else ground(x,y,hash2(x,y)<.3?T.PLAZA2:T.PLAZA,2);}
    const cx=(px0+px1)>>1,cy=(py0+py1)>>1;
    // safe inner ring (so the player can approach the Wielder)
    for(let y=cy-4;y<=cy+4;y++)for(let x=cx-6;x<=cx+6;x++){ground(x,y,hash2(x,y)<.3?T.PLAZA2:T.PLAZA,1);}
    city.rift={x:cx+.5,y:cy+.5,px0,px1,py0,py1};
    // ruins: boulders and broken lamps
    const rr=R.rng(seed+99);
    for(let k=0;k<70;k++){const x=rr.r(px0+2,px1-2),y=rr.r(py0+2,py1-2);if(Math.abs(x-cx)<8&&Math.abs(y-cy)<6)continue;if(free(x,y))boulder(x,y);}
    for(let k=0;k<16;k++){const x=rr.r(px0+3,px1-3),y=rr.r(py0+3,py1-5);if(Math.abs(x-cx)<9&&Math.abs(y-cy)<7)continue;if(canTree(x,y)&&k%2)tree(x,y,0);}
    for(const [dx,dy] of [[-9,-6],[9,-6],[-9,6],[9,6]])lamp(cx+dx,cy+dy,1);
    city.start={x:M+3.5,y:M+9.5};
  }
  // barrier ring blocks passage until opened
  city.barrierOpen=false;
  city.setBarrier=function(open){city.barrierOpen=open;for(const b of city.barrier){const i=idx(b.x,b.y);sol[i]=open?0:1;}};
  city.setBarrier(false);
  // classify tiles for minimap & spawn lists
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=idx(x,y);if(zn[i]===2&&!sol[i])city.wild[dist[i]].push(i);else if(zn[i]===1&&!sol[i])city.safeByDist[dist[i]].push(i);}
  // safe spawn for player
  city.idx=idx;city.inb=inb;
  // NPC spots dedupe & filter free
  city.npcSpots=city.npcSpots.filter(s=>zn[idx(s.x,s.y)]===1&&!sol[idx(s.x,s.y)]&&o[idx(s.x,s.y)]<0&&!inPlaza(s.x,s.y));
  // place player start on sidewalk of block (0,0)
  {let sx=M+3,sy=M+9;pave(sx,sy);city.start={x:sx+.5,y:sy+.5};}
  return city;
};

/* minimap raster (1 px / tile) */
R.buildMinimap=function(city){
  const c=document.createElement('canvas');c.width=city.W;c.height=city.H;const x=c.getContext('2d');const id=x.createImageData(city.W,city.H),d=id.data;
  for(let y=0;y<city.H;y++)for(let xx=0;xx<city.W;xx++){const i=y*city.W+xx;let r=30,g=40,b=30;
    const th=R.DISTRICTS[city.dist[i]],gc=hex2rgb(th.grass);
    const t=city.g[i],ob=city.o[i];
    if(ob>=0&&city.sol[i]){ if(ob===79||ob===80||ob===67||ob===68){r=34;g=90;b=48;} else if(ob<=35){r=ob<6||(ob>=12&&ob<18)||(ob>=24&&ob<30)?150:90;g=r*.62;b=r*.5;if(ob>=6&&ob<=11||ob>=18&&ob<=23||ob>=30&&ob<=35){r=84;g=102;b=140;}} else if(ob>=36&&ob<=59){r=170;g=96;b=70;} else {r=110;g=110;b=130;} }
    else if(t===T.ASPH||(t>=61&&t<=65)||t===73||t===74||t===75||t===76||t===77||t===89||(t>=141&&t<=146)){r=56;g=66;b=92;}
    else if(t===T.SW1||t===T.SW2){r=168;g=180;b=205;}
    else if(t===T.PLAZA||t===T.PLAZA2){r=96;g=70;b=150;}
    else if(t===T.GRAVEL){r=gc[0]*.9;g=gc[1]*.9;b=gc[2]*.9;}
    else {r=gc[0]*.85;g=gc[1]*.85;b=gc[2]*.85;}
    d[i*4]=r;d[i*4+1]=g;d[i*4+2]=b;d[i*4+3]=255;}
  x.putImageData(id,0,0);return c;
};
})(window.R=window.R||{});
