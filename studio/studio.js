import * as T from './vendor/three.js';
import {trees, backdrops, items} from '../scene.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#view');
const treeFiles = {pine:'Evergreen', fir:'TallFir', spruce:'SnowSpruce'};
const roomFiles = {room:'Cabin', market:'Market', bakery:'Bakery'};
const cabins = {}, crowns = {}, drafts = {}, histories = {};
let activeTree = 'pine';
const treeWidth = () => trees[activeTree].width / trees.pine.width;
const treeHeight = () => (728-trees[activeTree].top) / (728-trees.pine.top);
const lights = ['warm','colour','off'];
const store = 'snow-window-studio-3d-v1';
const scene = new T.Scene();
scene.background = new T.Color(0x35473f);
const tree = new T.Group();
const ornaments = new T.Group();
tree.add(ornaments);
const floorItems = new T.Group();
const lightString = new T.Group();
tree.add(lightString);
scene.add(tree,floorItems);
const camera = new T.PerspectiveCamera(37,1,.08,40);
const ray = new T.Raycaster();
const models = {};
const sites = [];
let renderer, draft, bulbs, spotMesh, selected, material, gesture;
let mode = 'turn', zoom = 1, azimuth = 0, elevation = .115, frame = 0;
let past = [], future = [];
const historyLimit = 60;
const say = text => { $('#hint').textContent = text; };
const type = key => items[key].category === 'topper' ? 'top' : items[key].category === 'floor' ? 'floor' : 'branch';
const objectAt = site => draft.items.find(item => item.site === site);
const clamp = T.MathUtils.clamp;

function draw() {
  if (!renderer || frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    renderer.render(scene,camera);
    $('#loading').hidden = true;
  });
}
function updateView() {
  const {width,height} = canvas.getBoundingClientRect();
  renderer.setSize(width,height,false);
  camera.aspect = width/height;
  // The closest furniture starts 4.65 units from the room centre.
  // Use the lens for the last part of a wide shot so the eye stays inside.
  const framingDistance = Math.max(7.12,5.0/camera.aspect)/zoom;
  const distance = Math.min(4.40,framingDistance);
  camera.fov = T.MathUtils.radToDeg(2*Math.atan(Math.tan(T.MathUtils.degToRad(37/2))*framingDistance/distance));
  const radius = distance*Math.cos(elevation);
  camera.position.set(radius*Math.sin(azimuth),1.83+distance*Math.sin(elevation),radius*Math.cos(azimuth));
  camera.lookAt(0,1.80,0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  $('#home').textContent=Math.round(zoom*100)+'%';
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
  return {items,light:'warm',backdrop:'room'};
}
function restoreTree(key,saved) {
  if (!Array.isArray(saved?.items) || !lights.includes(saved.light))
    return key==='pine' ? initialDraft() : {items:[],light:'off',backdrop:'room'};
  const used=new Set();
  return {light:saved.light,backdrop:Object.hasOwn(backdrops,saved.backdrop)?saved.backdrop:'room',
    items:saved.items.filter(i=>{
      if (!i || !Object.hasOwn(items,i.key) || !Number.isInteger(i.site) ||
        sites[i.site]?.kind!==type(i.key) || used.has(i.site)) return false;
      used.add(i.site);
      return true;
    })};
}
function loadDrafts() {
  let saved;
  try { saved=JSON.parse(localStorage.getItem(store)); } catch {}
  for (const key of Object.keys(trees)) {
    drafts[key]=restoreTree(key,saved?.drafts?.[key] ?? (key==='pine'?saved:null));
    histories[key]={past:[],future:[]};
  }
  switchTree(Object.hasOwn(trees,saved?.activeTree)?saved.activeTree:'pine');
}
function switchTree(key) {
  activeTree=key;
  draft=drafts[key];
  ({past,future}=histories[key]);
  material=null; selected=null; gesture=null; mode='turn';
  for (const [id,crown] of Object.entries(crowns)) crown.visible=id===key;
  lightString.scale.set(treeWidth(),treeHeight(),treeWidth());
  rebuild();
}
function persist() {
  drafts[activeTree]=draft;
  try {
    localStorage.setItem(store,JSON.stringify({activeTree,drafts}));
    $('#saved').textContent='Draft saved';
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
scene.add(selection);
selection.visible=false;

function localPoint(site) {
  const p=site.pos.clone();
  if (site.kind!=='floor') p.multiply(new T.Vector3(treeWidth(),treeHeight(),treeWidth()));
  return p;
}
function worldPoint(site) {
  const p=localPoint(site);
  return site.kind==='floor' ? p : tree.localToWorld(p);
}
function facesPlayer(site) {
  if (site.kind==='top') return true;
  const world=worldPoint(site);
  const towardsEye = world.x*Math.sin(azimuth)+world.z*Math.cos(azimuth);
  if (site.kind==='floor') return towardsEye>-.24;
  return towardsEye>Math.hypot(world.x,world.z)*.08;
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
    const p=worldPoint(sites[id]);
    spotMesh.setMatrixAt(i,new T.Matrix4().makeTranslation(p.x,p.y,p.z));
  });
  spotMesh.instanceMatrix.needsUpdate=true;
  spotMesh.visible=ids.length>0;
  selection.visible=mode==='edit' && selected!=null;
  if (selection.visible) {
    selection.position.copy(worldPoint(sites[selected]));
    selection.quaternion.copy(camera.quaternion);
    selection.position.y+=type(objectAt(selected).key)==='branch'?-.12:.13;

  }
}
function renderLights() {
  bulbs.visible=draft.light!=='off';
  const colour=[0xff7357,0x78ccbd,0xfad569,0x90acff];
  for (let i=0;i<bulbs.count;i++)
    bulbs.setColorAt(i,new T.Color(draft.light==='colour'?colour[i%4]:0xffdb90));
  bulbs.instanceColor.needsUpdate=true;
  lamp.intensity=bulbs.visible ? .14 : 0;
}
function rebuild() {
  ornaments.clear();
  floorItems.clear();
  for (const [key,cabin] of Object.entries(cabins)) cabin.visible=key===draft.backdrop;
  for (const {key,site} of draft.items) {
    const model=models[key].clone();
    model.userData.site=site;
    model.position.copy(localPoint(sites[site]));
    model.rotation.y=Math.atan2(model.position.x,model.position.z);
    (type(key)==='floor'?floorItems:ornaments).add(model);
  }
  renderLights();
  controls();
}
function controls() {
  for (const b of document.querySelectorAll('[data-tree]')) b.setAttribute('aria-pressed',b.dataset.tree===activeTree);
  for (const b of document.querySelectorAll('[data-setting]')) b.setAttribute('aria-pressed',b.dataset.setting===draft.backdrop);
  $('#turn').setAttribute('aria-pressed',mode==='turn');
  $('#edit').setAttribute('aria-pressed',mode==='edit');
  for (const b of document.querySelectorAll('[data-key]')) b.setAttribute('aria-pressed',b.dataset.key===material);
  for (const b of document.querySelectorAll('[data-light]')) b.setAttribute('aria-pressed',b.dataset.light===draft.light);
  $('#undo').disabled=!past.length;
  $('#redo').disabled=!future.length;
  $('#remove').disabled=selected==null;
  $('#remove').hidden=selected==null;
  refreshSpots();
  draw();
}
function screenPos(site) {
  const p=worldPoint(site).project(camera);
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
  for (const intersection of ray.intersectObjects([...ornaments.children,...floorItems.children],true)) {
    let obj=intersection.object;
    while (obj.parent!==ornaments && obj.parent!==floorItems) obj=obj.parent;
    if (facesPlayer(sites[obj.userData.site])) return obj.userData.site;
  }
  return null;
}
function place(site) {
  if (site==null) {say('Tap a glowing spot, or orbit to see the other side.');return;}
  if (material) {
    const key=material;
    commit({...draft,items:[...draft.items.filter(item=>item.site!==site),{key,site}]});
    say(items[key].name+' placed. Choose another spot or switch to Edit ornaments.');
  } else if (selected!=null && site!==selected) {
    const old=selected;
    selected=site;
    commit({...draft,items:draft.items.map(item=>item.site===old?{...item,site}:item)});
    say('Ornament moved.');
  }
}
function setMode(next) {
  mode=next; material=null; selected=null;
  say(mode==='turn'?'Drag to orbit the tree. Pinch or scroll to zoom.':'Tap an ornament to move or remove it.');
  controls();
}
const fingers=new Map();
const gap=()=>{const [a,b]=[...fingers.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
canvas.addEventListener('pointerdown',e=>{
  if (!draft || e.button!==0) return;
  canvas.setPointerCapture(e.pointerId);
  fingers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if (fingers.size>1) {gesture={pinch:true,gap:Math.max(1,gap()),zoom};return;}
  gesture={id:e.pointerId,x:e.clientX,y:e.clientY,yaw:azimuth,elevation,drag:false};
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
    azimuth=gesture.yaw-dx*.009;
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
  scene.add(new T.HemisphereLight(0xfff2dd,0xb0a18a,1.8));
  const key=new T.DirectionalLight(0xffeac7,1.5);
  key.position.set(-3,6,4);
  key.castShadow=true;
  Object.assign(key.shadow.camera,{left:-3,right:3,top:4,bottom:-3,near:.1,far:15});
  key.shadow.mapSize.set(1024,1024);
  key.shadow.normalBias=.019;
  scene.add(key);
  const rim=new T.DirectionalLight(0xc3dcff,.7);
  rim.position.set(2,3,-2);scene.add(rim);
  const points=[];
  for (let i=0;i<=300;i++) {
    const f=i/300, a=f*Math.PI*8.8;
    const r=1.12*(1-f)**.85+.052;
    points.push(new T.Vector3(r*Math.sin(a),.83+2.43*f+.035*Math.sin(a*2),r*Math.cos(a)));
  }
  lightString.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0x9d7948})));
  bulbs=new T.InstancedMesh(new T.SphereGeometry(.017,8,6),new T.MeshBasicMaterial(),60);
  for (let i=0;i<60;i++) {
    const p=points[i*5];
    bulbs.setMatrixAt(i,new T.Matrix4().makeTranslation(p.x,p.y,p.z));
  }
  lightString.add(bulbs);
}
function pictureButton(className,asset) {
  const button=document.createElement('button');
  button.type='button';
  button.className=className;
  const image=new Image();
  image.src='../assets/'+asset+'.webp';
  image.alt='';
  button.append(image);
  return button;
}

function bind() {
  for (const [key,{name,description}] of Object.entries(trees)) {
    const button=pictureButton('tree-option',key);
    button.dataset.tree=key;
    const label=document.createElement('span');
    const title=document.createElement('strong');
    const detail=document.createElement('small');
    title.textContent=name;
    detail.textContent=description;
    label.append(title,detail);
    button.append(label);
    button.onclick=()=>{
      if (key===activeTree) return;
      switchTree(key);persist();say('Choose an ornament or drag to look around.');
    };
    $('#tree-kind').append(button);
  }
  for (const [key,{name}] of Object.entries(backdrops)) {
    const button=pictureButton('backdrop-option',key+'-preview');
    button.dataset.setting=key;
    button.append(name);
    button.onclick=()=>{if (draft.backdrop!==key) commit({...draft,backdrop:key});};
    $('#setting').append(button);
  }
  $('#empty').onclick=()=>{setMode('turn');commit({...draft,items:[],light:'off'});};
  $('#starter').onclick=()=>{setMode('turn');commit({...initialDraft(),backdrop:draft.backdrop});};
  for (const [key,label] of Object.entries({all:'All',ball:'Baubles',hanging:'Hanging',topper:'Toppers',floor:'Floor'})) {
    const button=document.createElement('button');
    button.type='button';
    button.dataset.category=key;
    button.textContent=label;
    button.setAttribute('aria-pressed',key==='all');
    button.onclick=()=>{
      for (const tab of $('#category').children) tab.setAttribute('aria-pressed',tab===button);
      let count=0;
      for (const tile of $('#palette').children) {
        tile.hidden=key!=='all' && items[tile.dataset.key].category!==key;
        if (!tile.hidden) count++;
      }
      $('#palette').scrollTo(0,0);
      $('#material-count').textContent=count+' items';
    };
    $('#category').append(button);
  }
  $('#material-count').textContent=Object.keys(items).length+' items';
  for (const [key,{name}] of Object.entries(items)) {
    const b=pictureButton('item-option',key);
    b.append(name);b.dataset.key=key;
    b.onclick=()=>{
      mode='edit';material=key;selected=null;
      say(type(key)==='top'?'Tap the glowing spot at the treetop.':type(key)==='floor'?'Tap a glowing spot on the tree skirt.':'Tap a glowing branch tip to hang '+name.toLowerCase()+'.');
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
  $('#home').onclick=()=>{zoom=1;elevation=.115;azimuth=0;updateView();};
  $('#photo').onclick=()=>{
    spotMesh.visible=false;selection.visible=false;
    renderer.render(scene,camera);
    canvas.toBlob(blob=>{
      if (!blob) {say('Could not create the photo. Please try again.');return;}
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='christmas tree game - 3D.png';a.click();
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
  async function loadCollection(files, library, parent) {
    await Promise.all(Object.entries(files).map(async ([key,file])=>{
      const model=await load(file);
      library[key]=model;
      model.traverse(o=>{
        if (o.isMesh) {o.receiveShadow=library===cabins;o.castShadow=library!==cabins;}
      });
      if (parent) {model.visible=false;parent.add(model);}
      if (library===crowns) {
        const width=trees[key].width/trees.pine.width;
        model.scale.set(width,(728-trees[key].top)/(728-trees.pine.top),width);
      }
    }));
  }
  const [raw]=await Promise.all([
    fetch('./models/anchors.json').then(r=>{if(!r.ok)throw Error('Missing anchors');return r.json();}),
    loadCollection(treeFiles,crowns,tree),loadCollection(roomFiles,cabins,scene),
    loadCollection(Object.fromEntries(Object.keys(items).map(k=>[k,'Item_'+k])),models)
  ]);
  raw.forEach(p=>addSite(p,'branch'));
  addSite([0,3.41,0],'top');
  for (let i=0;i<18;i++) addSite([1.22*Math.sin(i*Math.PI/9),.218,1.22*Math.cos(i*Math.PI/9)],'floor');
  spotMesh=new T.InstancedMesh(spotGeometry,spotMaterial,sites.length);
  spotMesh.frustumCulled=false;
  scene.add(spotMesh);
  illuminate();
  bind();
  loadDrafts();
  document.querySelectorAll('button, select').forEach(b=>{b.disabled=false;});
  updateView();rebuild();setMode('turn');
  new ResizeObserver(updateView).observe(canvas);
}
$('#show-help').onclick=()=>$('#help-dialog').showModal();

start().catch(error=>{
  console.error(error);
  cancelAnimationFrame(frame);
  $('#loading-message').textContent = 'The 3D studio could not load.';
  $('.loading-spinner').hidden = true;
  $('#retry-loading').hidden = false;
});
