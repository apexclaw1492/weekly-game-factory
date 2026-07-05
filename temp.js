
(function(){
// ===== AUDIO =====
const Snd={ctx:null,muted:true,
  init(){if(this.ctx)return;this.ctx=new(window.AudioContext||window.webkitAudioContext)();this._wind();this._birds();},
  toggle(){this.muted=!this.muted;if(!this.ctx)this.init();this.muted?this.ctx.suspend():this.ctx.resume();return this.muted;},
  _t(f,d,tp,v){if(this.muted||!this.ctx)return;const n=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=tp;o.frequency.setValueAtTime(f,n);g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(this.ctx.destination);o.start(n);o.stop(n+d+.01);},
  click(){this._t(120,.06,'triangle',.08);},
  fold(){if(this.muted||!this.ctx)return;const n=this.ctx.currentTime,buf=this.ctx.createBuffer(1,this.ctx.sampleRate*.18,this.ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const s=this.ctx.createBufferSource();s.buffer=buf;const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.setValueAtTime(400,n);f.frequency.exponentialRampToValueAtTime(1400,n+.18);f.Q.value=1.2;const g=this.ctx.createGain();g.gain.setValueAtTime(.06,n);g.gain.exponentialRampToValueAtTime(.001,n+.18);s.connect(f);f.connect(g);g.connect(this.ctx.destination);s.start(n);s.stop(n+.19);},
  chime(){if(this.muted||!this.ctx)return;const n=this.ctx.currentTime;[523,659,784,1047,1319].forEach((fr,i)=>{const dl=i*.06,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(fr,n+dl);g.gain.setValueAtTime(0,n+dl);g.gain.linearRampToValueAtTime(.04,n+dl+.02);g.gain.exponentialRampToValueAtTime(.001,n+dl+.4);o.connect(g);g.connect(this.ctx.destination);o.start(n+dl);o.stop(n+dl+.45);});},
  questDone(){if(this.muted||!this.ctx)return;const n=this.ctx.currentTime;[392,523,659,784,1047].forEach((fr,i)=>{const dl=i*.09,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.setValueAtTime(fr,n+dl);g.gain.setValueAtTime(0,n+dl);g.gain.linearRampToValueAtTime(.07,n+dl+.03);g.gain.exponentialRampToValueAtTime(.001,n+dl+.7);o.connect(g);g.connect(this.ctx.destination);o.start(n+dl);o.stop(n+dl+.75);});},
  wipe(){this._t(600,.2,'sawtooth',.03);},
  _wind(){if(this.muted||!this.ctx)return;const n=this.ctx.currentTime,len=this.ctx.sampleRate*2,buf=this.ctx.createBuffer(1,len,this.ctx.sampleRate),d=buf.getChannelData(0);let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;b0=.99886*b0+w*.0555;b1=.99332*b1+w*.0751;b2=.969*b2+w*.1539;b3=.8665*b3+w*.3105;b4=.55*b4+w*.533;b5=-.7616*b5-w*.0169;d[i]=(b0+b1+b2+b3+b4+b5+b6+w*.536)*.07;b6=w*.116;}const s=this.ctx.createBufferSource();s.buffer=buf;s.loop=true;const f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=300;const g=this.ctx.createGain();g.gain.value=.03;s.connect(f);f.connect(g);g.connect(this.ctx.destination);s.start(0);},
  _birds(){const go=()=>{if(!this.muted&&this.ctx&&this.ctx.state==='running'){const n=this.ctx.currentTime;let dl=0;for(let i=0;i<2+Math.floor(Math.random()*3);i++){const o=this.ctx.createOscillator(),g=this.ctx.createGain(),bf=1200+Math.random()*700;o.type='sine';o.frequency.setValueAtTime(bf,n+dl);o.frequency.exponentialRampToValueAtTime(bf+400,n+dl+.04);g.gain.setValueAtTime(0,n+dl);g.gain.linearRampToValueAtTime(.015,n+dl+.01);g.gain.exponentialRampToValueAtTime(.001,n+dl+.07);o.connect(g);g.connect(this.ctx.destination);o.start(n+dl);o.stop(n+dl+.08);dl+=.07+Math.random()*.05;}}setTimeout(go,(12+Math.random()*25)*1e3);};go();}
};

// ===== QUESTS =====
const QUESTS=[
  {title:"The First Sketch",desc:"Place your first building.",check:s=>s.built>=1,goal:1,metric:'built',stars:1,xp:10},
  {title:"Tiny Village",desc:"Build 3 structures of any kind.",check:s=>s.built>=3,goal:3,metric:'built',stars:1,xp:15},
  {title:"Green Thumb",desc:"Plant 3 trees in your realm.",check:s=>s.trees>=3,goal:3,metric:'trees',stars:1,xp:15},
  {title:"Lookout Duty",desc:"Construct 2 watchtowers.",check:s=>s.towers>=2,goal:2,metric:'towers',stars:2,xp:20},
  {title:"Cozy Hamlet",desc:"Build 1 house, 1 cottage, 1 garden.",check:s=>s.houses>=1&&s.cottages>=1&&s.gardens>=1,goal:3,metric:'mixed',stars:2,xp:25},
  {title:"Garden Artist",desc:"Create 3 flower gardens.",check:s=>s.gardens>=3,goal:3,metric:'gardens',stars:2,xp:20},
  {title:"Village Paths",desc:"Lay 5 cobblestone paths.",check:s=>s.paths>=5,goal:5,metric:'paths',stars:1,xp:15},
  {title:"Master Builder",desc:"Build 10 structures total!",check:s=>s.built>=10,goal:10,metric:'built',stars:3,xp:30},
  {title:"Town Square",desc:"Place a well surrounded by buildings.",check:s=>s.wells>=1&&s.built>=6,goal:6,metric:'built',stars:3,xp:40},
  {title:"Elf-Ruler's Masterpiece",desc:"Build 20 structures!",check:s=>s.built>=20,goal:20,metric:'built',stars:5,xp:60},
  {title:"Living Forest",desc:"Plant 8 trees.",check:s=>s.trees>=8,goal:8,metric:'trees',stars:3,xp:35},
];
let qIdx=0,totStars=0,xp=0,lvl=1,qDone=0;const xpPer=40;
function qProg(st){const q=QUESTS[qIdx];if(!q)return{p:100,c:0,g:0};let c=0;if(q.metric==='built')c=st.built;else if(q.metric==='trees')c=st.trees;else if(q.metric==='towers')c=st.towers;else if(q.metric==='gardens')c=st.gardens;else if(q.metric==='paths')c=st.paths;else if(q.metric==='mixed')c=Math.min(st.houses,1)+Math.min(st.cottages,1)+Math.min(st.gardens,1);return{p:Math.min(100,c/q.goal*100),c:Math.min(c,q.goal),g:q.goal};}
function updateQuestUI(st){const q=QUESTS[qIdx];if(!q){document.getElementById('quest-title').textContent="All Quests Complete!";document.getElementById('quest-desc').textContent="You are the ultimate Elf-Ruler!";document.getElementById('quest-fill').style.width='100%';document.getElementById('quest-count').textContent='✦ Master ✦';return;}const p=qProg(st);document.getElementById('quest-title').textContent=q.title;document.getElementById('quest-desc').textContent=q.desc;document.getElementById('quest-fill').style.width=p.p+'%';document.getElementById('quest-count').textContent=p.c+' / '+p.g;}
function chkQuest(st){const q=QUESTS[qIdx];if(!q||!q.check(st))return;totStars+=q.stars;qDone++;xp+=q.xp;Snd.questDone();const bn=document.getElementById('quest-banner');bn.classList.add('quest-complete');setTimeout(()=>bn.classList.remove('quest-complete'),700);while(xp>=lvl*xpPer){xp-=lvl*xpPer;lvl++;showToast('Level Up!','Level '+lvl+' 🎨');}qIdx++;document.getElementById('s-quests').textContent=qDone;document.getElementById('s-stars').textContent=totStars;document.getElementById('xp-lvl').textContent=lvl;document.getElementById('xp-fill').style.width=(xp/(lvl*xpPer)*100)+'%';setTimeout(()=>updateQuestUI(st),800);}
function showToast(t,m){const e=document.getElementById('toast');document.getElementById('toast-title').textContent=t;document.getElementById('toast-msg').textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2500);}

// ===== THREE.JS SETUP =====
const container=document.getElementById('canvas-container');
let W=container.clientWidth,H=container.clientHeight;
const scene=new THREE.Scene();
const d=12,asp=W/H;
const camera=new THREE.OrthographicCamera(-d*asp,d*asp,d,-d,1,1000);
camera.position.set(22,22,22);camera.lookAt(0,0,0);
const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(W,H);renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);
const controls=new THREE.OrbitControls(camera,renderer.domElement);
controls.enableRotate=true;controls.maxPolarAngle=Math.PI/3.5;controls.minPolarAngle=Math.PI/5.5;
controls.enableZoom=true;controls.minZoom=.35;controls.maxZoom=2.8;
controls.enableDamping=true;controls.dampingFactor=.08;controls.target.set(0,0,0);

// ===== SKY DOME (painterly gradient like her picture) =====
const skyGeo=new THREE.SphereGeometry(120,32,20);
const skyCanvas=document.createElement('canvas');skyCanvas.width=512;skyCanvas.height=512;
const skyCtx=skyCanvas.getContext('2d');
// Day sky — painterly blue gradient with warm horizon
function paintDaySky(){
  const g=skyCtx.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#1a3a6e');g.addColorStop(.15,'#2a5aa0');g.addColorStop(.35,'#4a8ad4');
  g.addColorStop(.55,'#7ab8e8');g.addColorStop(.72,'#b5daf0');g.addColorStop(.85,'#e8d8c0');
  g.addColorStop(.92,'#f0c8a0');g.addColorStop(1,'#d4a070');
  skyCtx.fillStyle=g;skyCtx.fillRect(0,0,512,512);
  // Soft clouds
  skyCtx.fillStyle='rgba(255,255,255,0.15)';
  for(let i=0;i<18;i++){const x=Math.random()*512,y=80+Math.random()*200,w=40+Math.random()*120,h=10+Math.random()*25;skyCtx.beginPath();skyCtx.ellipse(x,y,w,h,0,0,Math.PI*2);skyCtx.fill();}
}
function paintNightSky(){
  const g=skyCtx.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#050818');g.addColorStop(.3,'#0c1428');g.addColorStop(.6,'#141e38');
  g.addColorStop(.8,'#1a2848');g.addColorStop(1,'#202840');
  skyCtx.fillStyle=g;skyCtx.fillRect(0,0,512,512);
  // Stars
  skyCtx.fillStyle='rgba(255,255,255,0.8)';
  for(let i=0;i<120;i++){const x=Math.random()*512,y=Math.random()*350,r=.5+Math.random()*1.5;skyCtx.beginPath();skyCtx.arc(x,y,r,0,Math.PI*2);skyCtx.fill();}
  // Moon
  skyCtx.fillStyle='rgba(240,235,210,0.9)';skyCtx.beginPath();skyCtx.arc(380,60,22,0,Math.PI*2);skyCtx.fill();
  skyCtx.fillStyle='rgba(200,195,170,0.3)';skyCtx.beginPath();skyCtx.arc(375,55,5,0,Math.PI*2);skyCtx.fill();
  skyCtx.beginPath();skyCtx.arc(388,65,3,0,Math.PI*2);skyCtx.fill();
}
paintDaySky();
const skyTex=new THREE.CanvasTexture(skyCanvas);
const skyMat=new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide});
const sky=new THREE.Mesh(skyGeo,skyMat);scene.add(sky);
scene.fog=new THREE.FogExp2('#b5daf0',0.006);
scene.background=null; // sky dome handles it

// ===== TEXTURES =====
function mkTex(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'),w,h);return new THREE.CanvasTexture(c);}
const stoneTex=mkTex(256,256,(c,w,h)=>{
  // Warm sandstone blocks
  c.fillStyle='#d4b896';c.fillRect(0,0,w,h);
  c.strokeStyle='#a08060';c.lineWidth=1.5;
  for(let r=0;r<10;r++){const y=r*h/9;c.beginPath();c.moveTo(0,y);for(let x=0;x<=w;x+=10)c.lineTo(x,y+(Math.random()-.5)*1.2);c.stroke();
    const bw=w/4,off=(r%2)*bw/2;for(let j=0;j<=4;j++){const x=(j*bw+off)%w;c.beginPath();c.moveTo(x,y);c.lineTo(x,y+h/9);c.stroke();}}
  // Some darker stone variations
  for(let i=0;i<30;i++){c.fillStyle=`rgba(${140+Math.random()*30},${110+Math.random()*20},${70+Math.random()*20},0.15)`;c.fillRect(Math.random()*w,Math.random()*h,w/4,h/9);}
});
const woodTex=mkTex(128,128,(c,w,h)=>{
  c.fillStyle='#6a4525';c.fillRect(0,0,w,h);c.strokeStyle='#3a2010';c.lineWidth=1;
  for(let i=0;i<8;i++){const x=i*w/7;c.beginPath();c.moveTo(x,0);c.lineTo(x+(Math.random()-.5)*3,h);c.stroke();}
  // Knots
  for(let i=0;i<3;i++){c.fillStyle='rgba(40,20,5,0.3)';c.beginPath();c.ellipse(Math.random()*w,Math.random()*h,5,3,0,0,Math.PI*2);c.fill();}
});
const roofTex=mkTex(256,256,(c,w,h)=>{
  // Terracotta tile pattern
  c.fillStyle='#b84e31';c.fillRect(0,0,w,h);
  for(let r=0;r<16;r++){const y=r*h/14,tw=16,off=(r%2)*tw/2;
    c.strokeStyle='#8a2e18';c.lineWidth=1.5;c.beginPath();
    for(let x=-tw;x<=w+tw;x+=tw)c.arc(x+off+tw/2,y,tw/2,Math.PI,0,true);c.stroke();
    // Highlight
    c.strokeStyle='rgba(210,120,80,0.3)';c.lineWidth=.5;c.beginPath();
    for(let x=-tw;x<=w+tw;x+=tw)c.arc(x+off+tw/2,y-1,tw/2-1,Math.PI,0,true);c.stroke();}
});
const halfTimberTex=mkTex(256,256,(c,w,h)=>{
  // Cream plaster base with brown timber cross-beams
  c.fillStyle='#eae2d0';c.fillRect(0,0,w,h);
  c.fillStyle='#5c3a1e';c.lineWidth=8;
  // Horizontal beams
  c.fillRect(0,0,w,10);c.fillRect(0,h/2-5,w,10);c.fillRect(0,h-10,w,10);
  // Vertical beams
  c.fillRect(0,0,10,h);c.fillRect(w/2-5,0,10,h);c.fillRect(w-10,0,10,h);
  // Diagonals
  c.strokeStyle='#5c3a1e';c.lineWidth=6;
  c.beginPath();c.moveTo(10,10);c.lineTo(w/2-5,h/2-5);c.stroke();
  c.beginPath();c.moveTo(w-10,10);c.lineTo(w/2+5,h/2-5);c.stroke();
  c.beginPath();c.moveTo(10,h-10);c.lineTo(w/2-5,h/2+5);c.stroke();
  c.beginPath();c.moveTo(w-10,h-10);c.lineTo(w/2+5,h/2+5);c.stroke();
});
const leafTex=mkTex(128,128,(c,w,h)=>{
  c.fillStyle='#2a6118';c.fillRect(0,0,w,h);
  for(let i=0;i<15;i++){c.fillStyle=`rgba(${20+Math.random()*40},${70+Math.random()*50},${10+Math.random()*20},0.4)`;const x=Math.random()*w,y=Math.random()*h;c.beginPath();c.ellipse(x,y,8+Math.random()*12,5+Math.random()*8,Math.random()*Math.PI,0,Math.PI*2);c.fill();}
});

// Ground textures for terrain painting
const grassFullTex=mkTex(128,128,(c,w,h)=>{
  c.fillStyle='#4a8530';c.fillRect(0,0,w,h);
  for(let i=0;i<80;i++){c.strokeStyle=`rgba(${40+Math.random()*50},${100+Math.random()*60},${20+Math.random()*30},0.5)`;c.lineWidth=1;c.beginPath();const x=Math.random()*w,y=Math.random()*h;c.moveTo(x,y);c.lineTo(x+(Math.random()-.5)*4,y-4-Math.random()*6);c.stroke();}
  for(let i=0;i<25;i++){c.fillStyle=`rgba(${60+Math.random()*30},${120+Math.random()*40},${30+Math.random()*20},0.25)`;c.beginPath();c.ellipse(Math.random()*w,Math.random()*h,4+Math.random()*8,2+Math.random()*4,Math.random()*Math.PI,0,Math.PI*2);c.fill();}
});
const dirtTex=mkTex(128,128,(c,w,h)=>{
  c.fillStyle='#8a6b45';c.fillRect(0,0,w,h);
  for(let i=0;i<50;i++){c.fillStyle=`rgba(${100+Math.random()*50},${70+Math.random()*40},${30+Math.random()*30},0.2)`;c.beginPath();c.arc(Math.random()*w,Math.random()*h,2+Math.random()*5,0,Math.PI*2);c.fill();}
});
const sandTex=mkTex(128,128,(c,w,h)=>{
  c.fillStyle='#e0c890';c.fillRect(0,0,w,h);
  for(let i=0;i<60;i++){c.fillStyle=`rgba(${200+Math.random()*40},${180+Math.random()*30},${120+Math.random()*40},0.15)`;c.beginPath();c.arc(Math.random()*w,Math.random()*h,1+Math.random()*3,0,Math.PI*2);c.fill();}
});
const stoneFloorTex=mkTex(128,128,(c,w,h)=>{
  c.fillStyle='#a09585';c.fillRect(0,0,w,h);c.strokeStyle='#706050';c.lineWidth=1.5;
  for(let i=0;i<5;i++)for(let j=0;j<5;j++){c.strokeRect(i*w/5+2,j*h/5+2,w/5-4,h/5-4);}
});
const pathTex=mkTex(64,64,(c,w,h)=>{
  c.fillStyle='#a09080';c.fillRect(0,0,w,h);c.strokeStyle='#706050';c.lineWidth=1;
  for(let i=0;i<7;i++)for(let j=0;j<7;j++){c.strokeRect(i*9+1+Math.random()*2,j*9+1+Math.random()*2,8,8);}
});

// Base ground — parchment + faint grass
const groundBaseTex=mkTex(512,512,(c,w,h)=>{
  c.fillStyle='#c8bf9f';c.fillRect(0,0,w,h);
  for(let i=0;i<120;i++){c.fillStyle=`rgba(${70+Math.random()*40},${100+Math.random()*50},${40+Math.random()*20},${.04+Math.random()*.04})`;c.beginPath();c.ellipse(Math.random()*w,Math.random()*h,5+Math.random()*15,2+Math.random()*5,Math.random()*Math.PI,0,Math.PI*2);c.fill();}
});
groundBaseTex.wrapS=THREE.RepeatWrapping;groundBaseTex.wrapT=THREE.RepeatWrapping;groundBaseTex.repeat.set(6,6);

// ===== MATERIALS =====
const inkMat=new THREE.MeshBasicMaterial({color:0x1a1a15,side:THREE.BackSide});
const mStone=new THREE.MeshLambertMaterial({map:stoneTex});
const mWood=new THREE.MeshLambertMaterial({map:woodTex});
const mRoof=new THREE.MeshLambertMaterial({map:roofTex});
const mLeaf=new THREE.MeshLambertMaterial({map:leafTex});
const mHT=new THREE.MeshLambertMaterial({map:halfTimberTex});
const mPlaster=new THREE.MeshLambertMaterial({color:0xeae2d0});
const mWinGlow=new THREE.MeshBasicMaterial({color:0xffe875});
const mPath=new THREE.MeshLambertMaterial({map:pathTex});
const mFlower=[0xe84393,0xff6b6b,0xfeca57,0xff9ff3,0x48dbfb,0xffffff].map(c=>new THREE.MeshLambertMaterial({color:c}));
// Aubrey materials
const mSkin=new THREE.MeshLambertMaterial({color:0xffebd6});
const mHair=new THREE.MeshLambertMaterial({color:0x8a5a36});
const mCloak=new THREE.MeshLambertMaterial({color:0x1f4717});
const mFur=new THREE.MeshLambertMaterial({color:0xc8b89a});
const mBrown=new THREE.MeshLambertMaterial({color:0x6a4228});
const mCream=new THREE.MeshLambertMaterial({color:0xeee8d8});
const mBelt=new THREE.MeshLambertMaterial({color:0x3a2a18});
const mBoot=new THREE.MeshLambertMaterial({color:0x5a3a20});
const mBuckle=new THREE.MeshBasicMaterial({color:0xc0a040});

// ===== GROUND =====
const ground=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshLambertMaterial({map:groundBaseTex}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
// Extended ground for horizon
const gExt=new THREE.Mesh(new THREE.PlaneGeometry(300,300),new THREE.MeshLambertMaterial({color:0x5a8838}));
gExt.rotation.x=-Math.PI/2;gExt.position.y=-.05;gExt.receiveShadow=true;scene.add(gExt);

const grid=new THREE.GridHelper(32,16,0xb8ad96,0xcec4ae);grid.position.y=.02;scene.add(grid);

// ===== LIGHTS =====
const ambLight=new THREE.AmbientLight(0xfff8ee,.85);scene.add(ambLight);
const dirLight=new THREE.DirectionalLight(0xfff0d0,1.15);
dirLight.position.set(18,28,12);dirLight.castShadow=true;
dirLight.shadow.mapSize.width=1024;dirLight.shadow.mapSize.height=1024;
dirLight.shadow.camera.near=.5;dirLight.shadow.camera.far=80;
const sD=22;dirLight.shadow.camera.left=-sD;dirLight.shadow.camera.right=sD;dirLight.shadow.camera.top=sD;dirLight.shadow.camera.bottom=-sD;dirLight.shadow.bias=-.0005;
scene.add(dirLight);
// Fill light
const fillLight=new THREE.DirectionalLight(0xffd8a0,.3);fillLight.position.set(-10,15,-8);scene.add(fillLight);

// ===== PARTICLES =====
const moteGeo=new THREE.BufferGeometry();const MC=90;const motePos=new Float32Array(MC*3);const moteV=[];
for(let i=0;i<MC;i++){motePos[i*3]=(Math.random()-.5)*35;motePos[i*3+1]=Math.random()*10+.5;motePos[i*3+2]=(Math.random()-.5)*35;moteV.push({vx:(Math.random()-.5)*.25,vy:.08+Math.random()*.15,vz:(Math.random()-.5)*.25,ph:Math.random()*Math.PI*2});}
moteGeo.setAttribute('position',new THREE.BufferAttribute(motePos,3));
const moteMat=new THREE.PointsMaterial({color:0xffd700,size:.1,transparent:true,opacity:.55,sizeAttenuation:true});
const motes=new THREE.Points(moteGeo,moteMat);scene.add(motes);

// ===== SKETCH HELPER =====
function sk(meshes){
  const g=new THREE.Group();
  meshes.forEach(m=>{m.mesh.castShadow=true;m.mesh.receiveShadow=true;g.add(m.mesh);
    const o=m.mesh.clone();o.material=inkMat;let sf=1.06;if(m.t==='roof'||m.t==='leaf')sf=1.09;if(m.t==='trim')sf=1.12;
    o.scale.multiplyScalar(sf);o.castShadow=false;o.receiveShadow=false;g.add(o);});return g;}

// ===== ASSET BUILDERS =====
// 1. Watchtower — tall round stone tower, conical terracotta roof, arched door, small window
function buildWatchtower(){
  const p=[];
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.25,4.2,8),mStone);base.position.y=2.1;p.push({mesh:base,t:'base'});
  // Ledge ring
  const ledge=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.3,.25,8),mStone);ledge.position.y=4.3;p.push({mesh:ledge,t:'base'});
  // Upper section
  const upper=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,1.2,8),mStone);upper.position.y=5;p.push({mesh:upper,t:'base'});
  // Battlements (crenellations)
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const cr=new THREE.Mesh(new THREE.BoxGeometry(.25,.35,.15),mStone);cr.position.set(Math.cos(a)*1.05,5.75,Math.sin(a)*1.05);cr.rotation.y=-a;p.push({mesh:cr,t:'base'});}
  // Cone roof
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.4,2.2,8),mRoof);roof.position.y=6.8;p.push({mesh:roof,t:'roof'});
  // Door
  const door=new THREE.Mesh(new THREE.BoxGeometry(.55,.9,.12),mWood);door.position.set(0,.45,1.18);p.push({mesh:door,t:'trim'});
  // Arched door top
  const dArch=new THREE.Mesh(new THREE.CylinderGeometry(.28,.28,.12,8,1,false,0,Math.PI),mWood);dArch.position.set(0,.9,1.18);dArch.rotation.x=Math.PI/2;p.push({mesh:dArch,t:'trim'});
  // Window
  const win=new THREE.Mesh(new THREE.CircleGeometry(.18,6),mWinGlow);win.position.set(0,3.5,1.08);p.push({mesh:win,t:'win'});
  return sk(p);
}

// 2. Townhouse — rectangular sandstone, steep terracotta roof, chimney, round window
function buildTownhouse(){
  const p=[];
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.2,2.8,2.2),mStone);base.position.y=1.4;p.push({mesh:base,t:'base'});
  // Roof — tall pyramid
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.85,2.6,4),mRoof);roof.position.y=3.6;roof.rotation.y=Math.PI/4;roof.scale.set(1.15,1,1.15);p.push({mesh:roof,t:'roof'});
  // Chimney
  const ch=new THREE.Mesh(new THREE.BoxGeometry(.3,.9,.3),mStone);ch.position.set(.7,4.1,-.5);p.push({mesh:ch,t:'base'});
  const chTop=new THREE.Mesh(new THREE.BoxGeometry(.4,.12,.4),mStone);chTop.position.set(.7,4.6,-.5);p.push({mesh:chTop,t:'base'});
  // Door — arched wood
  const door=new THREE.Mesh(new THREE.BoxGeometry(.6,1.1,.12),mWood);door.position.set(0,.55,1.12);p.push({mesh:door,t:'trim'});
  const dTop=new THREE.Mesh(new THREE.CylinderGeometry(.3,.3,.12,8,1,false,0,Math.PI),mWood);dTop.position.set(0,1.1,1.12);dTop.rotation.x=Math.PI/2;p.push({mesh:dTop,t:'trim'});
  // Round window
  const rWin=new THREE.Mesh(new THREE.CircleGeometry(.22,8),mWinGlow);rWin.position.set(0,2.1,1.12);p.push({mesh:rWin,t:'win'});
  // Side windows
  const sWin=new THREE.Mesh(new THREE.BoxGeometry(.12,.3,.22),mWinGlow);sWin.position.set(1.12,1.6,0);p.push({mesh:sWin,t:'win'});
  return sk(p);
}

// 3. Half-Timber House — cream plaster with dark wood framing, steep roof
function buildHalfTimber(){
  const p=[];
  // Stone foundation
  const found=new THREE.Mesh(new THREE.BoxGeometry(2.4,.6,2.4),mStone);found.position.y=.3;p.push({mesh:found,t:'base'});
  // Upper — half-timbered (slightly wider = jutting upper story)
  const upper=new THREE.Mesh(new THREE.BoxGeometry(2.6,2,2.6),mHT);upper.position.y=1.6;p.push({mesh:upper,t:'base'});
  // Timber framing lines
  const tb1=new THREE.Mesh(new THREE.BoxGeometry(.1,2,.08),mWood);tb1.position.set(-1.15,1.6,1.32);p.push({mesh:tb1,t:'trim'});
  const tb2=tb1.clone();tb2.position.x=1.15;p.push({mesh:tb2,t:'trim'});
  const tb3=new THREE.Mesh(new THREE.BoxGeometry(2.6,.1,.08),mWood);tb3.position.set(0,1.6,1.32);p.push({mesh:tb3,t:'trim'});
  // X-brace
  const xb1=new THREE.Mesh(new THREE.BoxGeometry(.08,1.5,.06),mWood);xb1.position.set(-.5,1.6,1.32);xb1.rotation.z=.5;p.push({mesh:xb1,t:'trim'});
  const xb2=new THREE.Mesh(new THREE.BoxGeometry(.08,1.5,.06),mWood);xb2.position.set(.5,1.6,1.32);xb2.rotation.z=-.5;p.push({mesh:xb2,t:'trim'});
  // Steep roof
  const roof=new THREE.Mesh(new THREE.ConeGeometry(2.1,2.4,4),mRoof);roof.position.y=3.8;roof.rotation.y=Math.PI/4;roof.scale.set(1.1,1,1.1);p.push({mesh:roof,t:'roof'});
  // Door
  const door=new THREE.Mesh(new THREE.BoxGeometry(.55,1,.12),mWood);door.position.set(0,.5,1.32);p.push({mesh:door,t:'trim'});
  // Windows
  const w1=new THREE.Mesh(new THREE.BoxGeometry(.3,.4,.08),mWinGlow);w1.position.set(.7,1.8,1.32);p.push({mesh:w1,t:'win'});
  const w2=w1.clone();w2.position.x=-.7;p.push({mesh:w2,t:'win'});
  // Chimney
  const ch=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,1,6),mStone);ch.position.set(-.8,4,-.6);p.push({mesh:ch,t:'base'});
  return sk(p);
}

// 4. Cottage — small round stone base, conical roof, cozy
function buildCottage(){
  const p=[];
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1,.95,1.5,6),mStone);base.position.y=.75;p.push({mesh:base,t:'base'});
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.4,1.8,6),mRoof);roof.position.y=2.3;p.push({mesh:roof,t:'roof'});
  const door=new THREE.Mesh(new THREE.BoxGeometry(.45,.75,.15),mWood);door.position.set(0,.38,.92);p.push({mesh:door,t:'trim'});
  const win=new THREE.Mesh(new THREE.CircleGeometry(.14,6),mWinGlow);win.position.set(.6,.9,.82);p.push({mesh:win,t:'win'});
  // Little bushes at base
  const bush=new THREE.Mesh(new THREE.SphereGeometry(.2,5,5),mLeaf);bush.position.set(-.7,.15,.6);bush.scale.y=.6;p.push({mesh:bush,t:'leaf'});
  return sk(p);
}

// 5. Turret Cottage — round with a small turret
function buildTurret(){
  const p=[];
  const base=new THREE.Mesh(new THREE.CylinderGeometry(1.1,1.15,2,8),mStone);base.position.y=1;p.push({mesh:base,t:'base'});
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.5,1.6,8),mRoof);roof.position.y=2.8;p.push({mesh:roof,t:'roof'});
  // Turret extension
  const turret=new THREE.Mesh(new THREE.CylinderGeometry(.4,.45,2.8,6),mStone);turret.position.set(.8,1.4,.5);p.push({mesh:turret,t:'base'});
  const tRoof=new THREE.Mesh(new THREE.ConeGeometry(.6,1,6),mRoof);tRoof.position.set(.8,3.2,.5);p.push({mesh:tRoof,t:'roof'});
  // Door
  const door=new THREE.Mesh(new THREE.BoxGeometry(.45,.8,.12),mWood);door.position.set(0,.4,1.08);p.push({mesh:door,t:'trim'});
  // Window on turret
  const win=new THREE.Mesh(new THREE.CircleGeometry(.12,6),mWinGlow);win.position.set(1.2,1.8,.7);win.rotation.y=Math.PI/4;p.push({mesh:win,t:'win'});
  return sk(p);
}

// 6. Shed/Annex — small, wooden, simple
function buildShed(){
  const p=[];
  const base=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.2,1.4),mWood);base.position.y=.6;p.push({mesh:base,t:'base'});
  // Simple sloped roof
  const roof=new THREE.Mesh(new THREE.ConeGeometry(1.2,1,4),mRoof);roof.position.y=1.5;roof.rotation.y=Math.PI/4;p.push({mesh:roof,t:'roof'});
  const door=new THREE.Mesh(new THREE.BoxGeometry(.4,.7,.08),mWood);door.position.set(0,.35,.72);p.push({mesh:door,t:'trim'});
  return sk(p);
}

// 7. Pine Tree — layered cones like the reference
function buildTree(){
  const p=[];
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.15,.28,1.2,5),mWood);trunk.position.y=.6;p.push({mesh:trunk,t:'trim'});
  for(let i=0;i<3;i++){const r=1.3-i*.3,h=1.2-i*.12;const lf=new THREE.Mesh(new THREE.ConeGeometry(r,h,6),mLeaf);lf.position.y=1.5+i*.8;p.push({mesh:lf,t:'leaf'});}
  return sk(p);
}

// 8. Oak tree — round canopy
function buildOak(){
  const p=[];
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.22,1.5,5),mWood);trunk.position.y=.75;p.push({mesh:trunk,t:'trim'});
  const canopy=new THREE.Mesh(new THREE.SphereGeometry(1.2,6,6),new THREE.MeshLambertMaterial({color:0x3a7a22}));canopy.position.y=2.2;canopy.scale.y=.8;p.push({mesh:canopy,t:'leaf'});
  const c2=new THREE.Mesh(new THREE.SphereGeometry(.7,5,5),new THREE.MeshLambertMaterial({color:0x2a6a18}));c2.position.set(.5,2.5,.3);p.push({mesh:c2,t:'leaf'});
  return sk(p);
}

// Garden
function buildGarden(){
  const p=[];
  const soil=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,.12,8),new THREE.MeshLambertMaterial({color:0x5c4a32}));soil.position.y=.06;p.push({mesh:soil,t:'base'});
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2,r=.45+Math.random()*.2;
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.35+Math.random()*.25,4),new THREE.MeshLambertMaterial({color:0x3a7a1a}));stem.position.set(Math.cos(a)*r,.25,Math.sin(a)*r);p.push({mesh:stem,t:'trim'});
    const bloom=new THREE.Mesh(new THREE.SphereGeometry(.1+Math.random()*.05,5,5),mFlower[Math.floor(Math.random()*mFlower.length)]);bloom.position.set(Math.cos(a)*r,.45+Math.random()*.1,Math.sin(a)*r);p.push({mesh:bloom,t:'leaf'});}
  const big=new THREE.Mesh(new THREE.SphereGeometry(.15,6,6),mFlower[3]);big.position.set(0,.5,0);p.push({mesh:big,t:'leaf'});
  return sk(p);
}

// Well
function buildWell(){
  const p=[];
  const base=new THREE.Mesh(new THREE.CylinderGeometry(.65,.75,.7,8),mStone);base.position.y=.35;p.push({mesh:base,t:'base'});
  [-.45,.45].forEach(x=>{const post=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1,4),mWood);post.position.set(x,.85,0);p.push({mesh:post,t:'trim'});});
  const beam=new THREE.Mesh(new THREE.BoxGeometry(1.1,.07,.07),mWood);beam.position.set(0,1.35,0);p.push({mesh:beam,t:'trim'});
  const roof=new THREE.Mesh(new THREE.ConeGeometry(.6,.45,4),mRoof);roof.position.y=1.7;roof.rotation.y=Math.PI/4;p.push({mesh:roof,t:'roof'});
  const water=new THREE.Mesh(new THREE.CylinderGeometry(.45,.45,.04,8),new THREE.MeshBasicMaterial({color:0x4fc3f7,transparent:true,opacity:.65}));water.position.y=.3;p.push({mesh:water,t:'base'});
  return sk(p);
}

// Bush
function buildBush(){
  const p=[];
  const b1=new THREE.Mesh(new THREE.SphereGeometry(.45,5,5),mLeaf);b1.position.y=.3;b1.scale.y=.7;p.push({mesh:b1,t:'leaf'});
  const b2=new THREE.Mesh(new THREE.SphereGeometry(.3,5,5),new THREE.MeshLambertMaterial({color:0x2a7020}));b2.position.set(.25,.35,.15);b2.scale.y=.65;p.push({mesh:b2,t:'leaf'});
  return sk(p);
}

// Mushroom
function buildMushroom(){
  const p=[];
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,.4,5),new THREE.MeshLambertMaterial({color:0xeee8d0}));stem.position.y=.2;p.push({mesh:stem,t:'base'});
  const cap=new THREE.Mesh(new THREE.SphereGeometry(.25,6,6),new THREE.MeshLambertMaterial({color:0xcc3322}));cap.position.y=.45;cap.scale.y=.5;p.push({mesh:cap,t:'leaf'});
  // Spots
  for(let i=0;i<4;i++){const a=i/4*Math.PI*2;const spot=new THREE.Mesh(new THREE.CircleGeometry(.04,4),new THREE.MeshLambertMaterial({color:0xffffff}));spot.position.set(Math.cos(a)*.15,.48,Math.sin(a)*.15);spot.lookAt(new THREE.Vector3(Math.cos(a)*2,.48,Math.sin(a)*2));p.push({mesh:spot,t:'base'});}
  // Smaller buddy
  const s2=new THREE.Mesh(new THREE.CylinderGeometry(.05,.08,.25,5),new THREE.MeshLambertMaterial({color:0xeee8d0}));s2.position.set(.2,.12,.15);p.push({mesh:s2,t:'base'});
  const c2=new THREE.Mesh(new THREE.SphereGeometry(.15,5,5),new THREE.MeshLambertMaterial({color:0xcc5530}));c2.position.set(.2,.28,.15);c2.scale.y=.5;p.push({mesh:c2,t:'leaf'});
  return sk(p);
}

// Rock / Boulder
function buildRock(){
  const p=[];
  const r1=new THREE.Mesh(new THREE.DodecahedronGeometry(.5,0),new THREE.MeshLambertMaterial({color:0x888078}));r1.position.y=.25;r1.scale.set(1,.6,1);r1.rotation.y=Math.random()*Math.PI;p.push({mesh:r1,t:'base'});
  const r2=new THREE.Mesh(new THREE.DodecahedronGeometry(.25,0),new THREE.MeshLambertMaterial({color:0x7a756a}));r2.position.set(.35,.12,.2);r2.scale.y=.55;r2.rotation.set(Math.random(),Math.random(),0);p.push({mesh:r2,t:'base'});
  return sk(p);
}

// Path
function buildPath(){
  const g=new THREE.Group();
  const slab=new THREE.Mesh(new THREE.BoxGeometry(1.8,.06,1.8),mPath);slab.position.y=.03;slab.receiveShadow=true;g.add(slab);
  for(let i=0;i<4;i++){const peb=new THREE.Mesh(new THREE.SphereGeometry(.05+Math.random()*.03,4,4),new THREE.MeshLambertMaterial({color:0x908070}));peb.position.set((Math.random()-.5)*.7,.06,(Math.random()-.5)*.7);peb.scale.y=.5;g.add(peb);}
  return g;
}

// Fence
function buildFence(){
  const g=new THREE.Group();
  const p1=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.65,4),mWood);p1.position.set(-.65,.33,0);g.add(p1);
  const p2=p1.clone();p2.position.x=.65;g.add(p2);
  const r1=new THREE.Mesh(new THREE.BoxGeometry(1.3,.05,.05),mWood);r1.position.set(0,.5,0);g.add(r1);
  const r2=r1.clone();r2.position.y=.28;g.add(r2);
  g.children.forEach(c=>{c.castShadow=true;const o=c.clone();o.material=inkMat;o.scale.multiplyScalar(1.14);o.castShadow=false;g.add(o);});
  return g;
}

// ===== AUBREY (matching character sheet: green hooded cloak, fur trim, brown vest, brown boots, basket) =====
function buildAubrey(){
  const p=[];
  // Brown leather boots with fur cuffs
  [-.13,.13].forEach(x=>{
    const boot=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.35,6),mBoot);boot.position.set(x,.18,0);p.push({mesh:boot,t:'base'});
    const furCuff=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,.06,6),mFur);furCuff.position.set(x,.32,0);p.push({mesh:furCuff,t:'trim'});
    const buckle=new THREE.Mesh(new THREE.BoxGeometry(.05,.04,.12),mBuckle);buckle.position.set(x,.15,.06);p.push({mesh:buckle,t:'trim'});
  });
  // Legs — dark tights
  [-.1,.1].forEach(x=>{const leg=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,.2,5),new THREE.MeshLambertMaterial({color:0x4a3828}));leg.position.set(x,.45,0);p.push({mesh:leg,t:'base'});});
  // Dark green skirt with fur hem
  const skirt=new THREE.Mesh(new THREE.CylinderGeometry(.2,.35,.4,8),mCloak);skirt.position.y=.6;p.push({mesh:skirt,t:'base'});
  const skirtFur=new THREE.Mesh(new THREE.TorusGeometry(.33,.04,4,8),mFur);skirtFur.position.y=.42;skirtFur.rotation.x=Math.PI/2;p.push({mesh:skirtFur,t:'trim'});
  // Gold trim on skirt
  const skirtTrim=new THREE.Mesh(new THREE.TorusGeometry(.34,.02,4,8),mBuckle);skirtTrim.position.y=.44;skirtTrim.rotation.x=Math.PI/2;p.push({mesh:skirtTrim,t:'trim'});
  // Brown leather corset/vest
  const vest=new THREE.Mesh(new THREE.CylinderGeometry(.2,.22,.3,8),mBrown);vest.position.y=.85;p.push({mesh:vest,t:'base'});
  // Belt with buckle
  const belt=new THREE.Mesh(new THREE.TorusGeometry(.22,.03,4,8),mBelt);belt.position.y=.72;belt.rotation.x=Math.PI/2;p.push({mesh:belt,t:'trim'});
  const beltBuckle=new THREE.Mesh(new THREE.BoxGeometry(.08,.06,.06),mBuckle);beltBuckle.position.set(0,.72,.2);p.push({mesh:beltBuckle,t:'trim'});
  // Cream undershirt peeking
  const shirt=new THREE.Mesh(new THREE.CylinderGeometry(.18,.19,.08,8),mCream);shirt.position.y=.95;p.push({mesh:shirt,t:'base'});
  // Green hooded cloak/capelet
  const cape=new THREE.Mesh(new THREE.CylinderGeometry(.28,.32,.25,8),mCloak);cape.position.y=1;p.push({mesh:cape,t:'base'});
  // Fur collar
  const furCollar=new THREE.Mesh(new THREE.TorusGeometry(.27,.04,4,8),mFur);furCollar.position.y=1.08;furCollar.rotation.x=Math.PI/2;p.push({mesh:furCollar,t:'trim'});
  // Head
  const head=new THREE.Mesh(new THREE.SphereGeometry(.25,8,8),mSkin);head.position.y=1.28;p.push({mesh:head,t:'base'});
  // Hair — brown, flowing
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.27,8,8),mHair);hair.position.set(0,1.27,-.03);hair.scale.set(1,1.1,1);p.push({mesh:hair,t:'trim'});
  // Hair flow down back
  const hairBack=new THREE.Mesh(new THREE.CylinderGeometry(.12,.08,.5,5),mHair);hairBack.position.set(0,1.05,-.12);p.push({mesh:hairBack,t:'trim'});
  // Hood (pointed, dark green)
  const hood=new THREE.Mesh(new THREE.ConeGeometry(.32,.5,8),mCloak);hood.position.set(0,1.38,-.06);hood.rotation.x=-.12;p.push({mesh:hood,t:'base'});
  const hoodFur=new THREE.Mesh(new THREE.TorusGeometry(.28,.035,4,8,Math.PI*1.3),mFur);hoodFur.position.set(0,1.32,.08);hoodFur.rotation.x=.3;p.push({mesh:hoodFur,t:'trim'});
  // Dark leather gauntlets
  [-.22,.22].forEach(x=>{const g=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.12,4),mBelt);g.position.set(x,.85,0);p.push({mesh:g,t:'trim'});});
  // Blue gem necklace
  const gem=new THREE.Mesh(new THREE.OctahedronGeometry(.03,0),new THREE.MeshBasicMaterial({color:0x4488cc}));gem.position.set(0,1.1,.18);p.push({mesh:gem,t:'trim'});
  // Wooden bucket (in right hand)
  const bucket=new THREE.Mesh(new THREE.CylinderGeometry(.14,.1,.2,6),new THREE.MeshLambertMaterial({color:0x8a6838}));bucket.position.set(.35,.55,.06);p.push({mesh:bucket,t:'trim'});
  const handle=new THREE.Mesh(new THREE.TorusGeometry(.12,.02,4,8,Math.PI),new THREE.MeshLambertMaterial({color:0x8a6838}));handle.position.set(.35,.65,.06);handle.rotation.z=Math.PI;p.push({mesh:handle,t:'trim'});
  return sk(p);
}

// ===== GAME STATE =====
const GS=16,CS=2;const gOrig=-(GS*CS)/2+CS/2;
const gMatrix=Array.from({length:GS},()=>Array(GS).fill(null));
const terrainMatrix=Array.from({length:GS},()=>Array(GS).fill(null)); // terrain tiles
const buildings=[],blueprints=[],sparkles=[],smoke=[];
let sel='watchtower',mode='build',gridVisible=true;
const stats={built:0,towers:0,houses:0,halftimbers:0,cottages:0,turrets:0,sheds:0,trees:0,oaks:0,gardens:0,wells:0,paths:0,fences:0,bushes:0,mushrooms:0,rocks:0};

const aubrey=buildAubrey();aubrey.position.set(0,.02,0);aubrey.userData.bob=0;scene.add(aubrey);
const nav={target:new THREE.Vector3(),walking:false,speed:5.5,casting:false,castT:0,spellTarget:null};

// Border forest
function addBorderTrees(){
  const pos=[];
  for(let i=-16;i<=16;i+=2.5){pos.push([i+Math.random()-.5,0,-17+Math.random()],[i+Math.random()-.5,0,17-Math.random()]);pos.push([-17+Math.random(),0,i+Math.random()-.5],[17-Math.random(),0,i+Math.random()-.5]);}
  pos.forEach(([x,,z])=>{const t=Math.random()>.3?buildTree():buildOak();t.position.set(x,.01,z);const s=.5+Math.random()*.6;t.scale.set(s,s,s);scene.add(t);});
}
addBorderTrees();

// Terrain painting
const terrainMeshes=[];
function paintTerrain(gx,gz,type){
  // Remove existing terrain tile
  clearTerrain(gx,gz);
  if(type==='clear_terrain'){terrainMatrix[gx][gz]=null;return;}
  const px=gOrig+gx*CS,pz=gOrig+gz*CS;
  let mat;
  if(type==='grass')mat=new THREE.MeshLambertMaterial({map:grassFullTex.clone()});
  else if(type==='dirt')mat=new THREE.MeshLambertMaterial({map:dirtTex.clone()});
  else if(type==='sand')mat=new THREE.MeshLambertMaterial({map:sandTex.clone()});
  else if(type==='stone_floor')mat=new THREE.MeshLambertMaterial({map:stoneFloorTex.clone()});
  else if(type==='water')mat=new THREE.MeshBasicMaterial({color:0x3a8ab8,transparent:true,opacity:.7});
  if(!mat)return;
  let mesh;
  if(type==='water'){
    mesh=new THREE.Mesh(new THREE.CylinderGeometry(.85,.85,.06,8),mat);
    mesh.position.set(px,.02,pz);
  } else {
    mesh=new THREE.Mesh(new THREE.BoxGeometry(1.95,.04,1.95),mat);
    mesh.position.set(px,.03,pz);
  }
  mesh.receiveShadow=true;scene.add(mesh);
  terrainMatrix[gx][gz]={type,mesh};terrainMeshes.push({gx,gz,mesh});
  Snd.click();
}
function clearTerrain(gx,gz){
  const t=terrainMatrix[gx][gz];if(!t)return;scene.remove(t.mesh);terrainMatrix[gx][gz]=null;
  const i=terrainMeshes.findIndex(m=>m.gx===gx&&m.gz===gz);if(i!==-1)terrainMeshes.splice(i,1);
}

// ===== UI STATS =====
function updateUI(){
  const pop=2+stats.houses*5+stats.towers*2+stats.cottages*3+stats.halftimbers*4+stats.turrets*2+stats.sheds;
  document.getElementById('s-pop').textContent=pop;document.getElementById('s-built').textContent=stats.built;
  document.getElementById('xp-fill').style.width=(xp/(lvl*xpPer)*100)+'%';
  updateQuestUI(stats);chkQuest(stats);
}

// ===== SPAWNING =====
const BUILDING_TYPES=['watchtower','townhouse','halftimber','cottage','turret','shed','well','tree','oak','garden','bush','mushroom','rock'];
function buildByType(t){
  if(t==='watchtower')return buildWatchtower();if(t==='townhouse')return buildTownhouse();if(t==='halftimber')return buildHalfTimber();
  if(t==='cottage')return buildCottage();if(t==='turret')return buildTurret();if(t==='shed')return buildShed();
  if(t==='well')return buildWell();if(t==='tree')return buildTree();if(t==='oak')return buildOak();
  if(t==='garden')return buildGarden();if(t==='bush')return buildBush();if(t==='mushroom')return buildMushroom();
  if(t==='rock')return buildRock();return null;
}
function statKey(t){
  const map={watchtower:'towers',townhouse:'houses',halftimber:'halftimbers',cottage:'cottages',turret:'turrets',shed:'sheds',well:'wells',tree:'trees',oak:'oaks',garden:'gardens',bush:'bushes',mushroom:'mushrooms',rock:'rocks',path:'paths',fence:'fences'};
  return map[t]||null;
}

function spawnBlueprint(gx,gz,type){
  clearBP(gx,gz);
  const g=buildByType(type);if(!g)return null;
  g.traverse(c=>{if(c.isMesh){if(c.material===inkMat)c.material=new THREE.MeshBasicMaterial({color:0x5e5e54,transparent:true,opacity:.1,side:THREE.BackSide});else c.material=new THREE.MeshBasicMaterial({color:0x9fb5a2,transparent:true,opacity:.3});}});
  const px=gOrig+gx*CS,pz=gOrig+gz*CS;g.position.set(px,0,pz);g.scale.set(1,.001,1);scene.add(g);
  const bp={gx,gz,type,group:g,ys:.001,yv:0,tgt:.12};blueprints.push(bp);return bp;
}
function clearBP(gx,gz){const i=blueprints.findIndex(b=>b.gx===gx&&b.gz===gz);if(i!==-1){scene.remove(blueprints[i].group);blueprints.splice(i,1);}}

function spawnInstant(gx,gz,type){
  let g;if(type==='path')g=buildPath();else if(type==='fence')g=buildFence();if(!g)return;
  const px=gOrig+gx*CS,pz=gOrig+gz*CS;g.position.set(px,.01,pz);g.scale.set(1,.001,1);scene.add(g);
  const b={gx,gz,type,group:g,ys:.001,yv:0,tgt:1,spawning:true};gMatrix[gx][gz]=b;buildings.push(b);
  const k=statKey(type);if(k)stats[k]++;stats.built++;Snd.fold();puffSmoke(px,pz);updateUI();
}

function spawnFinal(gx,gz,type){
  Snd.chime();const g=buildByType(type);if(!g)return;
  const px=gOrig+gx*CS,pz=gOrig+gz*CS;g.position.set(px,.01,pz);g.scale.set(1,.001,1);scene.add(g);
  const b={gx,gz,type,group:g,ys:.001,yv:0,tgt:1,spawning:true,windows:[]};
  g.traverse(c=>{if(c.isMesh&&c.material===mWinGlow)b.windows.push(c);});
  gMatrix[gx][gz]=b;buildings.push(b);
  const k=statKey(type);if(k)stats[k]++;stats.built++;puffSmoke(px,pz);updateUI();
}

function demolish(gx,gz){
  const b=gMatrix[gx][gz];if(!b)return;Snd.wipe();puffSmoke(b.group.position.x,b.group.position.z);scene.remove(b.group);gMatrix[gx][gz]=null;
  const i=buildings.indexOf(b);if(i!==-1)buildings.splice(i,1);
  const k=statKey(b.type);if(k)stats[k]--;stats.built--;updateUI();
}

// ===== PARTICLES =====
function spellSparkles(x,z){
  const cols=[0xffd700,0xffeb60,0xffffff,0xc39b34];
  for(let i=0;i<18;i++){const g=new THREE.Mesh(new THREE.BoxGeometry(.07,.07,.07),new THREE.MeshBasicMaterial({color:cols[i%4],transparent:true,opacity:.9}));const a=Math.random()*Math.PI*2,r=.15+Math.random()*.6;g.position.set(x+Math.cos(a)*r,.1+Math.random()*1.5,z+Math.sin(a)*r);scene.add(g);sparkles.push({m:g,vy:1.5+Math.random()*2,vx:(Math.random()-.5)*.7,vz:(Math.random()-.5)*.7,life:1});}
}
function puffSmoke(x,z){
  for(let i=0;i<8;i++){const g=new THREE.Mesh(new THREE.SphereGeometry(.18+Math.random()*.12,4,4),new THREE.MeshBasicMaterial({color:0xd5d0c0,transparent:true,opacity:.4}));g.position.set(x+(Math.random()-.5),.2,z+(Math.random()-.5));scene.add(g);smoke.push({m:g,vy:.7+Math.random()*1,ss:1.5+Math.random(),life:.7});}
}

// ===== RAYCASTING =====
const ray=new THREE.Raycaster(),ptr=new THREE.Vector2();
window.addEventListener('pointerdown',e=>{
  const p=e.composedPath();for(let i=0;i<p.length;i++)if(p[i].classList&&p[i].classList.contains('ptr'))return;
  ptr.x=(e.clientX/window.innerWidth)*2-1;ptr.y=-(e.clientY/window.innerHeight)*2+1;
  ray.setFromCamera(ptr,camera);const hits=ray.intersectObject(ground);
  if(hits.length>0){
    const pt=hits[0].point,gx=Math.round((pt.x-gOrig)/CS),gz=Math.round((pt.z-gOrig)/CS);
    if(gx<0||gx>=GS||gz<0||gz>=GS)return;

    if(mode==='terrain'){paintTerrain(gx,gz,sel);return;}

    if(sel==='clear'){demolish(gx,gz);return;}
    if(gMatrix[gx][gz])return;
    if(blueprints.some(b=>b.gx===gx&&b.gz===gz))return;
    if(sel==='path'||sel==='fence'){spawnInstant(gx,gz,sel);return;}
    Snd.fold();const bp=spawnBlueprint(gx,gz,sel);if(!bp)return;
    const px=gOrig+gx*CS,pz=gOrig+gz*CS;
    nav.target.set(px,.02,pz);nav.walking=true;nav.casting=false;nav.spellTarget=bp;
  }
});

// ===== THEME =====
const theme={
  cur:'light',lf:.04,
  bgT:new THREE.Color('#b5daf0'),ambCT:new THREE.Color('#fff8ee'),ambIT:.85,
  dirCT:new THREE.Color('#fff0d0'),dirIT:1.15,dirPT:new THREE.Vector3(18,28,12),
  fogCT:new THREE.Color('#b5daf0'),gridCT:new THREE.Color('#b8ad96'),
  light:{bg:'#b5daf0',amb:'#fff8ee',ambI:.85,dir:'#fff0d0',dirI:1.15,dirP:[18,28,12],fog:'#b5daf0',grid:'#b8ad96'},
  dark:{bg:'#0c0e18',amb:'#1a2038',ambI:.45,dir:'#4060aa',dirI:.7,dirP:[-15,20,-10],fog:'#0c0e18',grid:'#2a2820'}
};
function toggleTheme(){
  Snd.click();const t=theme.cur==='light'?'dark':'light';theme.cur=t;
  document.body.classList.toggle('dark',t==='dark');document.getElementById('btn-theme').textContent=t==='dark'?'🌙':'☀️';
  const v=theme[t];theme.bgT.set(v.bg);theme.ambCT.set(v.amb);theme.ambIT=v.ambI;theme.dirCT.set(v.dir);theme.dirIT=v.dirI;theme.dirPT.set(...v.dirP);theme.fogCT.set(v.fog);theme.gridCT.set(v.grid);
  // Repaint sky
  if(t==='dark')paintNightSky();else paintDaySky();
  skyTex.needsUpdate=true;
  // Extended ground color
  gExt.material.color.set(t==='dark'?0x141820:0x5a8838);
}

// ===== UI EVENTS =====
document.getElementById('go-btn').addEventListener('click',()=>{
  Snd.init();Snd.toggle();document.getElementById('btn-audio').textContent='🔊';
  document.getElementById('modal').classList.remove('active');updateQuestUI(stats);
});
document.getElementById('btn-help').addEventListener('click',()=>{Snd.click();document.getElementById('modal').classList.add('active');});
document.getElementById('btn-theme').addEventListener('click',toggleTheme);
document.getElementById('btn-audio').addEventListener('click',()=>{const m=Snd.toggle();document.getElementById('btn-audio').textContent=m?'🔇':'🔊';});
document.getElementById('btn-grid').addEventListener('click',()=>{Snd.click();gridVisible=!gridVisible;grid.visible=gridVisible;});

// Mode switching (Build / Terrain / Decor)
document.querySelectorAll('.ctrl-btn[data-ctrl]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    Snd.click();
    document.querySelectorAll('.ctrl-btn[data-ctrl]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
    mode=btn.dataset.ctrl;
    document.getElementById('bar-build').style.display=mode==='build'?'flex':'none';
    document.getElementById('bar-terrain').style.display=mode==='terrain'?'flex':'none';
    document.getElementById('bar-decor').style.display=mode==='decor'?'flex':'none';
    // Set default selection for mode
    const bar=document.getElementById('bar-'+mode);
    if(bar){const first=bar.querySelector('.tb-item');if(first){bar.querySelectorAll('.tb-item').forEach(b=>b.classList.remove('active'));first.classList.add('active');sel=first.dataset.t;}}
  });
});

// Tool selection
document.querySelectorAll('.tb-item').forEach(btn=>{
  btn.addEventListener('click',()=>{
    Snd.click();
    const bar=btn.closest('.toolbar');bar.querySelectorAll('.tb-item').forEach(b=>b.classList.remove('active'));btn.classList.add('active');sel=btn.dataset.t;
  });
});

// Zoom slider
document.getElementById('zoom-slider').addEventListener('input',e=>{
  const v=parseInt(e.target.value);camera.zoom=v/100;camera.updateProjectionMatrix();
});
// Rotate slider
document.getElementById('rotate-slider').addEventListener('input',e=>{
  const a=parseInt(e.target.value)*Math.PI/180;const r=31;
  camera.position.set(Math.cos(a)*r,22,Math.sin(a)*r);camera.lookAt(0,0,0);
  controls.target.set(0,0,0);controls.update();
});

window.addEventListener('resize',()=>{
  W=container.clientWidth;H=container.clientHeight;renderer.setSize(W,H);
  const a=W/H;camera.left=-d*a;camera.right=d*a;camera.top=d;camera.bottom=-d;camera.updateProjectionMatrix();
});

// ===== MAIN LOOP =====
const clock=new THREE.Clock();let elapsed=0;
function tick(){
  requestAnimationFrame(tick);const dt=clock.getDelta();elapsed+=dt;const lf=theme.lf;

  // Theme transitions
  scene.fog.color.lerp(theme.fogCT,lf);
  ambLight.color.lerp(theme.ambCT,lf);ambLight.intensity=THREE.MathUtils.lerp(ambLight.intensity,theme.ambIT,lf);
  dirLight.color.lerp(theme.dirCT,lf);dirLight.intensity=THREE.MathUtils.lerp(dirLight.intensity,theme.dirIT,lf);
  dirLight.position.lerp(theme.dirPT,lf);grid.material.color.lerp(theme.gridCT,lf);

  // Window glow
  const wCol=new THREE.Color(theme.cur==='dark'?0xffea52:0xffe875);
  buildings.forEach(b=>{if(b.windows)b.windows.forEach(w=>{w.material.color.lerp(wCol,lf);});});

  // Motes
  const mp=moteGeo.attributes.position.array;
  for(let i=0;i<MC;i++){const v=moteV[i];mp[i*3]+=Math.sin(elapsed*.3+v.ph)*v.vx*dt;mp[i*3+1]+=v.vy*dt*.3;mp[i*3+2]+=Math.cos(elapsed*.4+v.ph)*v.vz*dt;if(mp[i*3+1]>12){mp[i*3+1]=.3;mp[i*3]=(Math.random()-.5)*32;mp[i*3+2]=(Math.random()-.5)*32;}}
  moteGeo.attributes.position.needsUpdate=true;
  moteMat.opacity=theme.cur==='dark'?.35:.5;moteMat.color.set(theme.cur==='dark'?0x88ccff:0xffd700);moteMat.size=theme.cur==='dark'?.13:.1;

  // Water shimmer
  terrainMeshes.forEach(tm=>{const t=terrainMatrix[tm.gx]?.[tm.gz];if(t&&t.type==='water')t.mesh.position.y=.02+Math.sin(elapsed*2+tm.gx+tm.gz)*.01;});

  // Spring physics
  const K=160,D=12;
  blueprints.forEach(bp=>{const dx=bp.ys-bp.tgt;bp.yv+=(-K*dx-D*bp.yv)*dt;bp.ys+=bp.yv*dt;bp.group.scale.y=bp.ys;bp.group.scale.x=1+(bp.tgt-bp.ys)*.3;bp.group.scale.z=bp.group.scale.x;});
  buildings.forEach(b=>{if(!b.spawning)return;const dx=b.ys-b.tgt;b.yv+=(-K*dx-D*b.yv)*dt;b.ys+=b.yv*dt;b.group.scale.y=b.ys;b.group.scale.x=1+(1-b.ys)*.3-b.yv*.03;b.group.scale.z=b.group.scale.x;if(Math.abs(dx)<.005&&Math.abs(b.yv)<.02){b.ys=1;b.group.scale.set(1,1,1);b.spawning=false;}});

  // Aubrey navigation
  if(nav.walking){
    const dir=new THREE.Vector3().subVectors(nav.target,aubrey.position);dir.y=0;const dist=dir.length();
    if(dist>.15){dir.normalize();aubrey.position.addScaledVector(dir,nav.speed*dt);
      const ta=Math.atan2(dir.x,dir.z);let da=ta-aubrey.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));aubrey.rotation.y+=da*.25;
      aubrey.userData.bob+=dt*16;aubrey.rotation.z=Math.sin(aubrey.userData.bob)*.06;aubrey.position.y=.02+Math.abs(Math.sin(aubrey.userData.bob))*.1;
    }else{aubrey.position.copy(nav.target);aubrey.position.y=.02;aubrey.rotation.z=0;nav.walking=false;if(nav.spellTarget){nav.casting=true;nav.castT=.7;}}
  }
  if(nav.casting){
    nav.castT-=dt;aubrey.userData.bob+=dt*22;aubrey.scale.y=1+Math.sin(aubrey.userData.bob)*.1;aubrey.scale.x=1-Math.sin(aubrey.userData.bob)*.06;aubrey.scale.z=aubrey.scale.x;
    if(nav.spellTarget){const bp=nav.spellTarget,px=gOrig+bp.gx*CS,pz=gOrig+bp.gz*CS;const dd=new THREE.Vector3(px,.02,pz).sub(aubrey.position);aubrey.rotation.y=Math.atan2(dd.x,dd.z);if(Math.random()>.4)spellSparkles(px,pz);}
    if(nav.castT<=0){nav.casting=false;aubrey.scale.set(1,1,1);if(nav.spellTarget){const bp=nav.spellTarget;clearBP(bp.gx,bp.gz);spawnFinal(bp.gx,bp.gz,bp.type);nav.spellTarget=null;}}
  }else if(!nav.walking){
    aubrey.userData.bob+=dt*3;aubrey.scale.y=1+Math.sin(aubrey.userData.bob)*.015;
    if(Math.random()<.001&&buildings.length>0){const b=buildings[Math.floor(Math.random()*buildings.length)];nav.target.set(b.group.position.x+CS*.5,.02,b.group.position.z+CS*.5);nav.walking=true;}
  }

  // Particles
  for(let i=sparkles.length-1;i>=0;i--){const s=sparkles[i];s.life-=dt;s.m.position.y+=s.vy*dt;s.m.position.x+=s.vx*dt;s.m.position.z+=s.vz*dt;s.m.rotation.x+=dt*5;s.m.rotation.y+=dt*5;s.m.material.opacity=Math.max(0,s.life);if(s.life<=0){scene.remove(s.m);sparkles.splice(i,1);}}
  for(let i=smoke.length-1;i>=0;i--){const s=smoke[i];s.life-=dt;s.m.position.y+=s.vy*dt;s.m.scale.addScalar(s.ss*dt);s.m.material.opacity=Math.max(0,s.life*.5);if(s.life<=0){scene.remove(s.m);smoke.splice(i,1);}}

  controls.update();renderer.render(scene,camera);
}
tick();
})();
  