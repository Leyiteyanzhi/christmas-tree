import * as T from './vendor/three.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#view');
const names = {red:'Ruby ball',gold:'Gold ball',blue:'Ice ball',bell:'Brass bell',cane:'Candy cane',bow:'Velvet bow',star:'Tree star','gift-red':'Wrapped gift'};
const lights = ['warm','colour','off'];
const store = 'snow-window-studio-3d-v1';
const scene = new T.Scene();
scene.background = new T.Color(0x35473f);
const tree = new T.Group();
const ornaments = new T.Group();
tree.add(ornaments);
scene.add(tree);
const camera = new T.PerspectiveCamera(37,1,.08,40);
const ray = new T.Raycaster();
const models = {};
const sites = [];
let renderer, draft, bulbs, spotMesh, selected, material, gesture;
let mode = 'turn', zoom = 1, elevation = .115, frame = 0;
const past = [], future = [];
const historyLimit = 60;
const say = text => { $('#hint').textContent = text; };
const type = key => key === 'star' ? 'top' : key === 'gift-red' ? 'floor' : 'branch';
const objectAt = site => draft.items.find(item => item.site === site);
const clamp = T.MathUtils.clamp;

function draw() {
  if (!renderer || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderer.render(scene,camera);
  });
}
function updateView() {
  const {width,height} = canvas.getBoundingClientRect();
  renderer.setSize(width,height,false);
  camera.aspect = width/height;
  const distance = Math.max(7.12,5.0/camera.aspect)/zoom;
  camera.position.set(0,1.83+distance*Math.sin(elevation),distance*Math.cos(elevation));
  camera.lookAt(0,1.80,0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  refreshSpots();
  draw();
}
function addSite(pos, kind) { sites.push({pos:new T.Vector3(...pos),kind}); }

function initialDraft() {
  const items=[];
  let serial=0;
  for (let i=2;i<sites.length;i+=5) {
    if (sites[i].kind!=='branch') continue;
    const options=['red','gold','bow','blue','bell','cane'];
    items.push({key:options[serial++%options.length],site:i});
  }
  items.push({key:'star',site:sites.findIndex(s=>s.kind==='top')});
  items.push({key:'gift-red',site:sites.findIndex(s=>s.kind==='floor' && s.pos.z>1)});
  return {items,light:'warm'};
}
function readDraft() {
  try {
    const saved=JSON.parse(localStorage.getItem(store));
    if (saved && Array.isArray(saved.items) && lights.includes(saved.light)) {
      const used=new Set();
      return {light:saved.light,items:saved.items.filter(i=>{
        if (!i || !Object.hasOwn(names,i.key) || !Number.isInteger(i.site) ||
          sites[i.site]?.kind!==type(i.key) || used.has(i.site)) return false;
        used.add(i.site);
        return true;
      })};
    }
  } catch { /* Storage may be unavailable in private browsing. */ }
  return initialDraft();
}
function persist() {
  try {
    localStorage.setItem(store,JSON.stringify(draft));
    $('#saved').textContent='Draft saved on this device';
  } catch { $('#saved').textContent='Storage unavailable · save a photo to keep your tree'; }
}
function commit(next) {
  past.push(draft);
  if (past.length>historyLimit) past.shift();
  future.length=0;
  draft=next;
  rebuild();
  persist();
}
function history(from,to) {
  if (!from.length) return;
  to.push(draft);
  draft=from.pop();
  selected=null;
  rebuild();
  persist();
}

const spotGeometry=new T.SphereGeometry(.039,8,6);
const spotMaterial=new T.MeshBasicMaterial({color:0xffdb88});
const selection = new T.Mesh(new T.TorusGeometry(.145,.009,6,36),spotMaterial);
tree.add(selection);
selection.visible=false;

function facesPlayer(site) {
  if (site.kind==='top') return true;
  const world=tree.localToWorld(site.pos.clone());
  if (site.kind==='floor') return world.z>-.24;
  return world.z>Math.hypot(world.x,world.z)*.08;
}
function candidates() {
  const key=material || (selected!=null && objectAt(selected)?.key);
  if (mode!=='edit' || !key) return [];
  return sites.map((s,i)=>i).filter(i=>sites[i].kind===type(key) && facesPlayer(sites[i]) &&
    (!objectAt(i) || i===selected || type(key)==='top'));
}
function refreshSpots() {
  if (!spotMesh || !draft) return;
  const ids=candidates();
  spotMesh.count=ids.length;
  ids.forEach((id,i)=>{
    const p=sites[id].pos;
    spotMesh.setMatrixAt(i,new T.Matrix4().makeTranslation(p.x,p.y,p.z));
  });
  spotMesh.instanceMatrix.needsUpdate=true;
  spotMesh.visible=ids.length>0;
  selection.visible=mode==='edit' && selected!=null;
  if (selection.visible) {
    selection.position.copy(sites[selected].pos);
    selection.position.y+=type(objectAt(selected).key)==='branch'?-.12:.13;
    selection.rotation.y=-tree.rotation.y;
  }
}
function renderLights() {
  bulbs.visible=draft.light!=='off';
  const colour=[0xff7357,0x78ccbd,0xfad569,0x90acff];
  for (let i=0;i<bulbs.count;i++)
    bulbs.setColorAt(i,new T.Color(draft.light==='colour'?colour[i%4]:0xffdb90));
  bulbs.instanceColor.needsUpdate=true;
  lamp.intensity=bulbs.visible?1.5:0;
}
function rebuild() {
  ornaments.clear();
  for (const {key,site} of draft.items) {
    const model=models[key].clone();
    model.userData.site=site;
    model.position.copy(sites[site].pos);
    model.rotation.y=Math.atan2(model.position.x,model.position.z);
    ornaments.add(model);
  }
  renderLights();
  controls();
}
function controls() {
  $('#turn').setAttribute('aria-pressed',mode==='turn');
  $('#edit').setAttribute('aria-pressed',mode==='edit');
  for (const b of document.querySelectorAll('[data-key]')) b.setAttribute('aria-pressed',b.dataset.key===material);
  for (const b of document.querySelectorAll('[data-light]')) b.setAttribute('aria-pressed',b.dataset.light===draft.light);
  $('#undo').disabled=!past.length;
  $('#redo').disabled=!future.length;
  $('#remove').disabled=selected==null;
  refreshSpots();
  draw();
}
function screenPos(site) {
  const p=tree.localToWorld(site.pos.clone()).project(camera);
  const r=canvas.getBoundingClientRect();
  return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
}
function nearest(x,y) {
  let best=null,limit=clamp(canvas.clientHeight*.065,22,42);
  for (const i of candidates()) {
    const p=screenPos(sites[i]);
    const d=Math.hypot(p.x-x,p.y-y);
    if (d<limit) { best=i; limit=d; }
  }
  return best;
}
function hit(x,y) {
  const r=canvas.getBoundingClientRect();
  ray.setFromCamera(new T.Vector2(2*(x-r.left)/r.width-1,1-2*(y-r.top)/r.height),camera);
  for (const intersection of ray.intersectObjects(ornaments.children,true)) {
    let obj=intersection.object;
    while (obj.parent!==ornaments) obj=obj.parent;
    if (facesPlayer(sites[obj.userData.site])) return obj.userData.site;
  }
  return null;
}
function place(site) {
  if (site==null) {say('Tap a glowing spot, or turn the tree to see the other side.');return;}
  if (material) {
    const key=material;
    commit({...draft,items:[...draft.items.filter(item=>item.site!==site),{key,site}]});
    say(names[key]+' placed. Choose another spot or switch to Edit ornaments.');
  } else if (selected!=null && site!==selected) {
    const old=selected;
    selected=site;
    commit({...draft,items:draft.items.map(item=>item.site===old?{...item,site}:item)});
    say('Ornament moved.');
  }
}
function setMode(next) {
  mode=next; material=null; selected=null;
  say(mode==='turn'?'Drag to turn the tree. Pinch or scroll to zoom.':'Tap an ornament to move or remove it.');
  controls();
}
const fingers=new Map();
const gap=()=>{const [a,b]=[...fingers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
canvas.addEventListener('pointerdown',e=>{
  if (!draft || e.button!==0) return;
  canvas.setPointerCapture(e.pointerId);
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if (fingers.size>1) {gesture={pinch:true,gap:Math.max(1,gap()),zoom};return;}
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:tree.rotation.y,elevation,drag:false};
  if (mode==='edit' && !material) gesture.site=hit(e.clientX,e.clientY);
});
canvas.addEventListener('pointermove',e=>{
  if (!gesture || !fingers.has(e.pointerId)) return;
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if (gesture.pinch) {
    if (fingers.size>=2) {zoom=clamp(gesture.zoom*gap()/gesture.gap,.8,1.85);updateView();}
    return;
  }
  const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
  if (Math.hypot(dx,dy)<5 && !gesture.drag) return;
  gesture.drag=true;
  if (mode==='turn') {
    tree.rotation.y=gesture.yaw+dx*.009;
    elevation=clamp(gesture.elevation+dy*.003,-.035,.50);
    updateView();
  } else if (!material && gesture.site!=null) {
    selected=gesture.site;controls();
  }
});
function end(e,cancel) {
  if (!fingers.delete(e.pointerId) || !gesture) return;
  if (!cancel && !gesture.pinch && mode==='edit') {
    if (material || gesture.drag && gesture.site!=null) place(nearest(e.clientX,e.clientY));
    else if (!gesture.drag && gesture.site!=null) {
      selected=gesture.site;say('Drag this ornament or tap a glowing spot to move it.');controls();
    } else if (!gesture.drag && selected!=null) place(nearest(e.clientX,e.clientY));
  }
  if (!fingers.size) gesture=null;
}
canvas.onpointerup=e=>end(e,false);
canvas.onpointercancel=e=>end(e,true);
canvas.onlostpointercapture=e=>end(e,true);
canvas.addEventListener('wheel',e=>{
  if (!draft) return;
  e.preventDefault();
  zoom=clamp(zoom*Math.exp(-clamp(e.deltaY,-120,120)*.002),.8,1.85);updateView();
},{passive:false});

const lamp=new T.PointLight(0xffab50,1.5,4);
lamp.position.set(.4,1.7,.75);
tree.add(lamp);
function illuminate() {
  scene.add(new T.HemisphereLight(0xfff0d7,0x806151,1.50));
  const key=new T.DirectionalLight(0xffdfb2,2.45);
  key.position.set(-3,6,4);
  key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-3,right:3,top:4,bottom:-3,near:.1,far:15});
  key.shadow.mapSize.set(1024,1024);
  key.shadow.normalBias=.019;
  scene.add(key);
  const rim=new T.DirectionalLight(0xc3dcff,1.15);
  rim.position.set(2,3,-2);scene.add(rim);
  const points=[];
  for (let i=0;i<=300;i++) {
    const f=i/300, a=f*Math.PI*8.8;
    const r=1.12*(1-f)**.85+.052;
    points.push(new T.Vector3(r*Math.sin(a),.83+2.43*f+.035*Math.sin(a*2),r*Math.cos(a)));
  }
  tree.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x9d7948})));
  bulbs=new T.InstancedMesh(new T.SphereGeometry(.026,8,6),new T.MeshBasicMaterial(),60);
  for (let i=0;i<60;i++) {
    const p=points[i*5];
    bulbs.setMatrixAt(i,new T.Matrix4().makeTranslation(p.x,p.y,p.z));
  }
  tree.add(bulbs);
}
function bind() {
  for (const [key,name] of Object.entries(names)) {
    const b=document.createElement('button'),img=new Image();
    img.src='../assets/'+key+'.webp';img.alt='';
    b.append(img,name);b.dataset.key=key;
    b.onclick=()=>{
      mode='edit';material=key;selected=null;
      say(key==='star'?'Tap the glowing spot at the treetop.':key==='gift-red'?'Tap a glowing spot on the tree skirt.':'Tap a glowing branch tip to hang '+name.toLowerCase()+'.');
      controls();
    };
    $('#palette').append(b);
  }
  $('#turn').onclick=()=>setMode('turn');
  $('#edit').onclick=()=>setMode('edit');
  $('#undo').onclick=()=>history(past,future);
  $('#redo').onclick=()=>history(future,past);
  $('#remove').onclick=()=>{
    const old=selected;selected=null;
    commit({...draft,items:draft.items.filter(i=>i.site!==old)});say('Ornament removed.');
  };
  for (const b of document.querySelectorAll('[data-light]'))
    b.onclick=()=>{if(draft.light!==b.dataset.light) commit({...draft,light:b.dataset.light});};
  $('#more').onclick=()=>{zoom=clamp(zoom*1.18,.8,1.85);updateView();};
  $('#less').onclick=()=>{zoom=clamp(zoom/1.18,.8,1.85);updateView();};
  $('#home').onclick=()=>{zoom=1;elevation=.115;tree.rotation.y=0;updateView();};
  $('#photo').onclick=()=>{
    spotMesh.visible=false;selection.visible=false;
    renderer.render(scene,camera);
    canvas.toBlob(blob=>{
      if (!blob) {say('Could not create the photo. Please try again.');return;}
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='snow-window-3d.png';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),30000);
    },'image/png');
    refreshSpots();draw();
  };
}

async function start() {
  renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(1.65,window.devicePixelRatio||1));
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  const loader=new T.GLTFLoader().setMeshoptDecoder(T.MeshoptDecoder);
  const load=async name=>(await loader.loadAsync('./models/'+name+'.glb')).scene;
  const [cabin,evergreen,raw]=await Promise.all([load('Cabin'),load('Evergreen'),
    fetch('./models/anchors.json').then(r=>{if(!r.ok)throw Error('Missing anchors');return r.json();}),
    Promise.all(Object.keys(names).map(async key=>{models[key]=await load('Item_'+key);}))]);
  scene.add(cabin);tree.add(evergreen);
  for (const root of [cabin,evergreen,...Object.values(models)]) {
    root.traverse(o=>{
      if (o.isMesh) {o.receiveShadow=true;o.castShadow=root!==cabin;}
    });
  }
  raw.forEach(p=>addSite(p,'branch'));
  addSite([0,3.41,0],'top');
  for (let i=0;i<18;i++) addSite([1.22*Math.sin(i*Math.PI/9),.218,1.22*Math.cos(i*Math.PI/9)],'floor');
  spotMesh=new T.InstancedMesh(spotGeometry,spotMaterial,sites.length);
  spotMesh.frustumCulled=false;
  tree.add(spotMesh);
  illuminate();
  draft=readDraft();
  bind();
  document.querySelectorAll('button').forEach(b=>{b.disabled=false;});
  updateView();rebuild();setMode('turn');
  new ResizeObserver(updateView).observe(canvas);
}
start().catch(error=>{
  console.error(error);
  say('The 3D cabin could not open. Reload to try again, or return to the 2D studio above.');
});
