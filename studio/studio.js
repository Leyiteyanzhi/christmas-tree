import * as T from './vendor/three.js';
import { trees, backdrops, items } from '../scene.js';
import { setupTray, setupWorks, setupFullscreen, workFile, isWorkFile } from '../workshop-tools.js';
import { createEnvironmentMap } from './textures.js';
import { createWorldManager } from './worlds.js';
import { buildVolumetricTree } from './trees.js';
import {
  enhanceOrnament,
  createTreeCollar,
  createLightGarland,
  createInteractionGuides,
} from './decor.js';

const studioUrl = path => new URL(path, import.meta.url).href;
const $ = selector => document.querySelector(selector);
const canvas = $('#view');
const crowns = {}, drafts = {}, histories = {};
let activeTree = 'pine';
const treeWidth = () => trees[activeTree].width / trees.pine.width;
const treeHeight = () => (728 - trees[activeTree].top) / (728 - trees.pine.top);
const lights = ['warm', 'colour', 'off'];
const store = 'snow-window-studio-3d-v1';

const scene = new T.Scene();
scene.background = new T.Color(0x131d1b);

const worldsRoot = new T.Group();
const tree = new T.Group();
const ornaments = new T.Group();
tree.add(ornaments);
const floorItems = new T.Group();
scene.add(worldsRoot, tree, floorItems);

const camera = new T.PerspectiveCamera(37, 1, 0.08, 60);
const ray = new T.Raycaster();
const models = {};
const sites = [];
const loader = new T.GLTFLoader().setMeshoptDecoder(T.MeshoptDecoder);
const pending = new Map();
const tray = setupTray(
  $('.materials'),
  $('#palette'),
  tile => tile.dataset.key,
  () => $('#category [data-category=all]')?.click()
);

const worlds = createWorldManager(worldsRoot);
let renderer, draft, garland, guides, selected, material, gesture;
let busy = false;
let autoOrbit = false;
let mode = 'turn';

// Smooth damped camera state (targets vs current rendered values)
let targetZoom = 1, zoom = 1;
let targetAzimuth = 0, azimuth = 0;
let targetElevation = 0.115, elevation = 0.115;

// Shared cinematic lighting rig (adapted dynamically per world!)
let hemiLight, keyLight, rimLight, fillLight;

let past = [], future = [];
const historyLimit = 60;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const say = text => { $('#hint').textContent = text; };
const type = key => items[key].category === 'topper' ? 'top' : items[key].category === 'floor' ? 'floor' : 'branch';
const objectAt = site => draft.items.find(item => item.site === site);
const clamp = T.MathUtils.clamp;

function ensureTree(key) {
  if (crowns[key]) return;
  const branchSites = sites.filter(s => s.kind === 'branch');
  const model = buildVolumetricTree(key, branchSites);
  model.visible = false;
  tree.add(model);
  crowns[key] = model;
}

function loadModel(key, file, library, parent) {
  if (library[key]) return Promise.resolve();
  if (pending.has(file)) return pending.get(file);
  const request = loader.loadAsync(studioUrl('./models/' + file + '.glb')).then(gltf => {
    const model = gltf.scene;
    if (library === models) {
      enhanceOrnament(model, key, items[key].category);
    }
    if (parent) {
      model.visible = false;
      parent.add(model);
    }
    library[key] = model;
  }).finally(() => pending.delete(file));
  pending.set(file, request);
  return request;
}

const loadItem = key => loadModel(key, 'Item_' + key, models);

function ensureDraft(key, layout) {
  ensureTree(key);
  return Promise.all(
    [...new Set(layout.items.map(item => item.key))].map(loadItem)
  );
}

async function withAssets(load, apply) {
  if (busy) return;
  busy = true;
  stopOrbit();
  const workshop = $('.workshop');
  workshop.inert = true;
  try {
    await load();
    workshop.inert = false;
    apply();
  } finally {
    workshop.inert = false;
    busy = false;
  }
}

function change(load, apply) {
  return withAssets(load, apply).catch(error => {
    console.error(error);
    say('Could not load this item or scene. Try again.');
  });
}

function applyWorldMood(backdropKey) {
  const world = worlds.activate(backdropKey);
  scene.background = world.background;
  scene.fog = world.fog;
  if (renderer) {
    scene.environment = createEnvironmentMap(renderer, backdropKey);
    renderer.toneMappingExposure = world.lighting.exposure;
  }
  const L = world.lighting;
  hemiLight.color.setHex(L.hemiSky);
  hemiLight.groundColor.setHex(L.hemiGround);
  hemiLight.intensity = L.hemiIntensity;

  keyLight.color.setHex(L.keyColor);
  keyLight.intensity = L.keyIntensity;
  keyLight.position.set(...L.keyPos);

  rimLight.color.setHex(L.rimColor);
  rimLight.intensity = L.rimIntensity;
  rimLight.position.set(...L.rimPos);

  fillLight.color.setHex(L.fillColor);
  fillLight.intensity = L.fillIntensity;
  fillLight.position.set(...L.fillPos);
}

function syncCamera(resize = false) {
  const { width, height } = canvas.getBoundingClientRect();
  if (width < 2 || height < 2) return;
  if (resize) renderer.setSize(width, height, false);
  camera.aspect = width / height;
  // Architectural walls & stalls sit at r >= 4.95; keeping distance <= 4.40 ensures
  // the camera always glides cleanly inside the diorama at every angle and zoom.
  const framingDistance = Math.max(7.12, 5.0 / camera.aspect) / zoom;
  const distance = Math.min(4.40, framingDistance);
  camera.fov = T.MathUtils.radToDeg(
    2 * Math.atan(Math.tan(T.MathUtils.degToRad(37 / 2)) * framingDistance / distance)
  );
  const radius = distance * Math.cos(elevation);
  camera.position.set(
    radius * Math.sin(azimuth),
    1.83 + distance * Math.sin(elevation),
    radius * Math.cos(azimuth)
  );
  camera.lookAt(0, 1.80, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  $('#home').textContent = Math.round(targetZoom * 100) + '%';
  refreshSpots();
}

function stopOrbit() {
  if (!autoOrbit) return;
  autoOrbit = false;
  $('#auto-orbit').textContent = 'Auto orbit';
  $('#auto-orbit').setAttribute('aria-pressed', 'false');
}

function startOrbit() {
  setMode('turn');
  autoOrbit = true;
  $('#auto-orbit').textContent = 'Pause orbit';
  $('#auto-orbit').setAttribute('aria-pressed', 'true');
  say('Tap the scene or Pause orbit to stop.');
}

function addSite(pos, kind) {
  sites.push({ pos: new T.Vector3(...pos), kind });
}

function initialDraft() {
  const layoutItems = [];
  let serial = 0;
  for (let i = 2; i < sites.length; i += 5) {
    if (sites[i].kind !== 'branch') continue;
    const options = ['red', 'gold', 'bow', 'blue', 'bell', 'cane'];
    layoutItems.push({ key: options[serial++ % options.length], site: i });
  }
  layoutItems.push({ key: 'star', site: sites.findIndex(s => s.kind === 'top') });
  layoutItems.push({ key: 'gift-red', site: sites.findIndex(s => s.kind === 'floor' && s.pos.z > 1) });
  return { items: layoutItems, light: 'warm', backdrop: 'room' };
}

function restoreTree(key, saved) {
  if (!Array.isArray(saved?.items) || !lights.includes(saved.light))
    return key === 'pine' ? initialDraft() : { items: [], light: 'off', backdrop: 'room' };
  const used = new Set();
  return {
    light: saved.light,
    backdrop: Object.hasOwn(backdrops, saved.backdrop) ? saved.backdrop : 'room',
    items: saved.items.filter(i => {
      if (!i || !Object.hasOwn(items, i.key) || !Number.isInteger(i.site) ||
        sites[i.site]?.kind !== type(i.key) || used.has(i.site)) return false;
      used.add(i.site);
      return true;
    }),
  };
}

function loadDrafts() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(store)); } catch {}
  for (const key of Object.keys(trees)) {
    drafts[key] = restoreTree(key, saved?.drafts?.[key] ?? (key === 'pine' ? saved : null));
    histories[key] = { past: [], future: [] };
  }
  return Object.hasOwn(trees, saved?.activeTree) ? saved.activeTree : 'pine';
}

function switchTree(key, render = true) {
  activeTree = key;
  draft = drafts[key];
  ({ past, future } = histories[key]);
  material = null; selected = null; gesture = null; mode = 'turn';
  for (const [id, crown] of Object.entries(crowns)) crown.visible = id === key;
  garland.setScale(treeWidth(), treeHeight());
  if (render) rebuild();
}

function persist() {
  drafts[activeTree] = draft;
  try {
    localStorage.setItem(store, JSON.stringify({ activeTree, drafts }));
    $('#saved').textContent = 'Draft saved';
  } catch {
    $('#saved').textContent = 'Storage unavailable · save a photo to keep your tree';
  }
}

function commit(next) {
  past.push(draft);
  if (past.length > historyLimit) past.shift();
  future.length = 0;
  draft = next;
  rebuild();
  persist();
}

function history(from, to) {
  if (!from.length) return;
  const next = from.at(-1);
  change(() => ensureDraft(activeTree, next), () => {
    to.push(draft);
    draft = from.pop();
    selected = null;
    rebuild();
    persist();
  });
}

function localPoint(site) {
  const p = site.pos.clone();
  if (site.kind !== 'floor') p.multiply(new T.Vector3(treeWidth(), treeHeight(), treeWidth()));
  return p;
}

function worldPoint(site) {
  const p = localPoint(site);
  return site.kind === 'floor' ? p : tree.localToWorld(p);
}

function facesPlayer(site) {
  if (site.kind === 'top') return true;
  const world = worldPoint(site);
  const towardsEye = world.x * Math.sin(azimuth) + world.z * Math.cos(azimuth);
  if (site.kind === 'floor') return towardsEye > -0.24;
  return towardsEye > Math.hypot(world.x, world.z) * 0.08;
}

function candidates() {
  const key = material || (selected != null && objectAt(selected)?.key);
  if (mode !== 'edit' || !key) return [];
  return sites.map((s, i) => i).filter(i => sites[i].kind === type(key) && facesPlayer(sites[i]) &&
    (!objectAt(i) || i === selected || type(key) === 'top'));
}

function refreshSpots() {
  if (!guides || !draft) return;
  const ids = candidates();
  guides.setSpots(ids.map(id => worldPoint(sites[id])));
  guides.selection.visible = mode === 'edit' && selected != null;
  if (guides.selection.visible) {
    guides.selection.position.copy(worldPoint(sites[selected]));
    guides.selection.quaternion.copy(camera.quaternion);
    guides.selection.position.y += type(objectAt(selected).key) === 'branch' ? -0.12 : 0.13;
  }
}

function renderLights() {
  garland.applyMode(draft.light);
  // Subtle warm inner foliage glow when lights are on
  const crown = crowns[activeTree];
  if (crown?.userData?.needleMats) {
    const emissiveStrength = draft.light === 'off' ? 0.09 : 0.19;
    for (const mat of crown.userData.needleMats) {
      mat.emissiveIntensity = emissiveStrength;
    }
  }
}

function rebuild() {
  ornaments.clear();
  floorItems.clear();
  applyWorldMood(draft.backdrop);
  for (const { key, site } of draft.items) {
    const model = models[key].clone();
    model.userData.site = site;
    model.position.copy(localPoint(sites[site]));
    model.rotation.y = Math.atan2(model.position.x, model.position.z);
    (type(key) === 'floor' ? floorItems : ornaments).add(model);
  }
  renderLights();
  controls();
}

function controls() {
  for (const b of document.querySelectorAll('[data-tree]')) b.setAttribute('aria-pressed', b.dataset.tree === activeTree);
  for (const b of document.querySelectorAll('[data-setting]')) b.setAttribute('aria-pressed', b.dataset.setting === draft.backdrop);
  $('#turn').setAttribute('aria-pressed', mode === 'turn');
  $('#edit').setAttribute('aria-pressed', mode === 'edit');
  for (const b of document.querySelectorAll('[data-key]')) b.setAttribute('aria-pressed', b.dataset.key === material);
  for (const b of document.querySelectorAll('[data-light]')) b.setAttribute('aria-pressed', b.dataset.light === draft.light);
  $('#undo').disabled = !past.length;
  $('#redo').disabled = !future.length;
  $('#remove').disabled = selected == null;
  $('#remove').hidden = selected == null;
  refreshSpots();
}

function screenPos(site) {
  const p = worldPoint(site).project(camera);
  const r = canvas.getBoundingClientRect();
  return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 };
}

function nearest(x, y) {
  let best = null, limit = clamp(canvas.clientHeight * 0.065, 22, 42);
  for (const i of candidates()) {
    const p = screenPos(sites[i]);
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < limit) { best = i; limit = d; }
  }
  return best;
}

function hit(x, y) {
  const r = canvas.getBoundingClientRect();
  ray.setFromCamera(new T.Vector2(2 * (x - r.left) / r.width - 1, 1 - 2 * (y - r.top) / r.height), camera);
  for (const intersection of ray.intersectObjects([...ornaments.children, ...floorItems.children], true)) {
    let obj = intersection.object;
    while (obj.parent !== ornaments && obj.parent !== floorItems) obj = obj.parent;
    if (facesPlayer(sites[obj.userData.site])) return obj.userData.site;
  }
  return null;
}

function place(site) {
  if (site == null) { say('Tap a glowing spot, or orbit to see the other side.'); return; }
  if (material) {
    const key = material;
    commit({ ...draft, items: [...draft.items.filter(item => item.site !== site), { key, site }] });
    say(items[key].name + ' placed. Choose another spot or switch to Edit ornaments.');
  } else if (selected != null && site !== selected) {
    const old = selected;
    selected = site;
    commit({ ...draft, items: draft.items.map(item => item.site === old ? { ...item, site } : item) });
    say('Ornament moved.');
  }
}

function setMode(next) {
  stopOrbit();
  mode = next; material = null; selected = null;
  say(mode === 'turn'
    ? 'Drag to orbit the tree. Pinch or scroll to zoom.'
    : 'Tap an ornament to move or remove it. Drag empty space to orbit.');
  controls();
}

const fingers = new Map();
const gap = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

canvas.addEventListener('pointerdown', e => {
  if (!draft || e.button !== 0) return;
  stopOrbit();
  canvas.setPointerCapture(e.pointerId);
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (fingers.size > 1) { gesture = { pinch: true, gap: Math.max(1, gap()), zoom: targetZoom }; return; }
  const hitSite = (mode === 'edit' && !material) ? hit(e.clientX, e.clientY) : null;
  gesture = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    yaw: targetAzimuth,
    elevation: targetElevation,
    drag: false,
    site: hitSite,
    // Allow orbiting whenever dragging in turn mode, while placing a chosen ornament,
    // or when dragging empty space (not directly on an ornament) in edit mode.
    orbiting: mode === 'turn' || material != null || hitSite == null,
  };
});

canvas.addEventListener('pointermove', e => {
  if (!gesture || !fingers.has(e.pointerId)) return;
  fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (gesture.pinch) {
    if (fingers.size >= 2) {
      targetZoom = clamp(gesture.zoom * gap() / gesture.gap, 0.8, 1.85);
    }
    return;
  }
  const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
  if (Math.hypot(dx, dy) < 6 && !gesture.drag) return;
  gesture.drag = true;
  if (gesture.orbiting) {
    targetAzimuth = gesture.yaw - dx * 0.0085;
    targetElevation = clamp(gesture.elevation + dy * 0.003, -0.035, 0.48);
  } else if (!material && gesture.site != null) {
    selected = gesture.site;
    controls();
  }
});

function end(e, cancel) {
  if (!fingers.delete(e.pointerId) || !gesture) return;
  if (!cancel && !gesture.pinch && mode === 'edit') {
    if (material) {
      // Tap places the chosen ornament; drag orbits the scene without accidental placement.
      if (!gesture.drag) place(nearest(e.clientX, e.clientY));
    } else if (gesture.drag && !gesture.orbiting && gesture.site != null) {
      place(nearest(e.clientX, e.clientY));
    } else if (!gesture.drag && gesture.site != null) {
      selected = gesture.site;
      say('Drag this ornament or tap a glowing spot to move it. Drag empty space to orbit.');
      controls();
    } else if (!gesture.drag && selected != null) {
      const spot = nearest(e.clientX, e.clientY);
      if (spot != null) place(spot);
      else { selected = null; controls(); }
    }
  }
  if (!fingers.size) gesture = null;
}

canvas.onpointerup = e => end(e, false);
canvas.onpointercancel = e => end(e, true);
canvas.onlostpointercapture = e => end(e, true);
canvas.addEventListener('wheel', e => {
  if (!draft) return;
  e.preventDefault();
  stopOrbit();
  targetZoom = clamp(targetZoom * Math.exp(-clamp(e.deltaY, -120, 120) * 0.002), 0.8, 1.85);
}, { passive: false });

function setupLighting() {
  hemiLight = new T.HemisphereLight(0xffeed6, 0x3b261b, 0.72);
  scene.add(hemiLight);

  keyLight = new T.DirectionalLight(0xffe3bd, 1.75);
  keyLight.position.set(-2.6, 5.2, 3.8);
  keyLight.castShadow = true;
  Object.assign(keyLight.shadow.camera, { left: -3.2, right: 3.2, top: 4.2, bottom: -3.2, near: 0.2, far: 16 });
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.022;
  keyLight.shadow.radius = 3.2;
  scene.add(keyLight);

  rimLight = new T.DirectionalLight(0x89bfff, 1.05);
  rimLight.position.set(-3.2, 3.1, -3.8);
  scene.add(rimLight);

  fillLight = new T.DirectionalLight(0xffa65c, 0.55);
  fillLight.position.set(3.2, 2.4, -2.5);
  scene.add(fillLight);

  // Add bespoke tree base collar & redesigned fairy lights
  tree.add(createTreeCollar());
  garland = createLightGarland(tree);
}

function pictureButton(className, asset) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  const image = new Image();
  image.src = studioUrl('../assets/' + asset + '.webp');
  image.alt = '';
  button.append(image);
  return button;
}

function bind() {
  for (const [key, { name, description }] of Object.entries(trees)) {
    const button = pictureButton('tree-option', key);
    button.dataset.tree = key;
    const label = document.createElement('span');
    const title = document.createElement('strong');
    const detail = document.createElement('small');
    title.textContent = name;
    detail.textContent = description;
    label.append(title, detail);
    button.append(label);
    button.onclick = () => {
      if (key === activeTree) return;
      change(() => ensureDraft(key, drafts[key]), () => {
        switchTree(key);
        persist();
        say('Choose an ornament or drag to look around.');
      });
    };
    $('#tree-kind').append(button);
  }
  for (const [key, { name }] of Object.entries(backdrops)) {
    const button = pictureButton('backdrop-option', key + '-preview');
    button.dataset.setting = key;
    button.append(name);
    button.onclick = () => {
      if (draft.backdrop !== key) {
        const next = { ...draft, backdrop: key };
        change(() => ensureDraft(activeTree, next), () => commit(next));
      }
    };
    $('#setting').append(button);
  }
  $('#empty').onclick = () => { setMode('turn'); commit({ ...draft, items: [], light: 'off' }); };
  $('#starter').onclick = () => {
    const next = { ...initialDraft(), backdrop: draft.backdrop };
    change(() => ensureDraft(activeTree, next), () => { setMode('turn'); commit(next); });
  };
  for (const [key, label] of Object.entries({ all: 'All', ball: 'Baubles', hanging: 'Hanging', topper: 'Toppers', floor: 'Floor' })) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.category = key;
    button.textContent = label;
    button.setAttribute('aria-pressed', key === 'all');
    button.onclick = () => {
      for (const tab of $('#category').children) tab.setAttribute('aria-pressed', tab === button);
      let count = 0;
      for (const tile of $('#palette').children) {
        tile.hidden = key !== 'all' && items[tile.dataset.key].category !== key;
        if (!tile.hidden) count++;
      }
      $('#palette').scrollTo(0, 0);
      $('#material-count').textContent = count + ' items';
    };
    $('#category').append(button);
  }
  $('#material-count').textContent = Object.keys(items).length + ' items';
  for (const [key, { name }] of Object.entries(items)) {
    const b = pictureButton('item-option', key);
    b.append(name); b.dataset.key = key;
    b.onclick = () => {
      if (!models[key]) say('Loading ' + name.toLowerCase() + '…');
      change(() => loadItem(key), () => {
        mode = 'edit'; material = key; selected = null;
        tray.picked(key);
        say(type(key) === 'top'
          ? 'Tap the glowing spot at the treetop, or drag to orbit.'
          : type(key) === 'floor'
            ? 'Tap a glowing spot on the tree skirt, or drag to orbit.'
            : 'Tap a glowing spot to hang ' + name.toLowerCase() + ', or drag to orbit.');
        controls();
      });
    };
    $('#palette').append(b);
  }
  $('#turn').onclick = () => setMode('turn');
  $('#edit').onclick = () => setMode('edit');
  $('#undo').onclick = () => history(past, future);
  $('#redo').onclick = () => history(future, past);
  $('#remove').onclick = () => {
    const old = selected; selected = null;
    commit({ ...draft, items: draft.items.filter(i => i.site !== old) });
    say('Ornament removed.');
  };
  for (const b of document.querySelectorAll('[data-light]'))
    b.onclick = () => { if (draft.light !== b.dataset.light) commit({ ...draft, light: b.dataset.light }); };
  $('#more').onclick = () => { targetZoom = clamp(targetZoom * 1.18, 0.8, 1.85); };
  $('#less').onclick = () => { targetZoom = clamp(targetZoom / 1.18, 0.8, 1.85); };
  $('#home').onclick = () => {
    stopOrbit();
    targetZoom = 1;
    targetElevation = 0.115;
    targetAzimuth = 0;
  };
  $('#auto-orbit').onclick = () => autoOrbit ? stopOrbit() : startOrbit();
  $('#show-help').addEventListener('click', stopOrbit);
  $('#show-works').addEventListener('click', stopOrbit);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopOrbit(); });
  $('#photo').onclick = () => {
    stopOrbit();
    guides.setVisible(false);
    renderer.render(scene, camera);
    canvas.toBlob(blob => {
      if (!blob) { say('Could not create the photo. Please try again.'); return; }
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = 'christmas tree game - 3D.png'; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, 'image/png');
    refreshSpots();
  };
}

let lastNow = 0;
let animClock = 0;
let firstRendered = false;

function animate(now) {
  requestAnimationFrame(animate);
  if (!renderer || !draft || document.hidden) {
    lastNow = now;
    return;
  }
  const dt = lastNow ? Math.min(0.05, (now - lastNow) / 1000) : 0.016;
  lastNow = now;

  if (autoOrbit) {
    targetAzimuth += dt * 0.28;
  }

  // Silky exponential camera damping
  const damp = 1 - Math.exp(-dt * 11.5);
  const prevAz = azimuth, prevEl = elevation, prevZ = zoom;
  azimuth += (targetAzimuth - azimuth) * damp;
  elevation += (targetElevation - elevation) * damp;
  zoom += (targetZoom - zoom) * damp;

  if (
    Math.abs(azimuth - prevAz) > 1e-5 ||
    Math.abs(elevation - prevEl) > 1e-5 ||
    Math.abs(zoom - prevZ) > 1e-5 ||
    !firstRendered
  ) {
    syncCamera(false);
  }

  // Advance living atmosphere (paused/slowed smoothly if user prefers reduced motion)
  if (!reducedMotion.matches) {
    animClock += dt;
    worlds.update(animClock);
    garland.update(animClock);
    guides.update(animClock);
  }

  renderer.render(scene, camera);
  if (!firstRendered) {
    firstRendered = true;
    $('#loading').hidden = true;
  }
}

async function start() {
  renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.85, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.AgXToneMapping ?? T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const response = await fetch(studioUrl('./models/anchors.json'));
  if (!response.ok) throw new Error('Missing anchors');
  const raw = await response.json();
  raw.forEach(p => addSite(p, 'branch'));
  addSite([0, 3.41, 0], 'top');
  for (let i = 0; i < 18; i++) {
    addSite([1.22 * Math.sin(i * Math.PI / 9), 0.218, 1.22 * Math.cos(i * Math.PI / 9)], 'floor');
  }

  guides = createInteractionGuides(scene, sites.length);
  setupLighting();

  const key = loadDrafts();
  await ensureDraft(key, drafts[key]);
  bind();
  switchTree(key);

  setupWorks({
    mode: '3d',
    snapshot: () => workFile('3d', activeTree, draft),
    validate: work => isWorkFile(work, '3d', trees, backdrops, lights)
      && restoreTree(work.tree, work.draft).items.length === work.draft.items.length,
    open: work => withAssets(() => ensureDraft(work.tree, work.draft), () => {
      if (activeTree !== work.tree) switchTree(work.tree, false);
      mode = 'turn'; material = null; selected = null;
      commit(work.draft);
      say('Work opened. Pick an ornament to keep decorating.');
    }),
  });

  for (const selector of ['#turn', '#edit', '#photo', '#show-works', '#auto-orbit', '#fullscreen']) {
    const el = $(selector);
    if (el) el.disabled = false;
  }
  const fullscreen = setupFullscreen($('#fullscreen'), () => syncCamera(true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mode === 'edit' && !fullscreen.isActive() && !document.querySelector('dialog[open]')) {
      setMode('turn');
    }
  });
  syncCamera(true);
  setMode('turn');
  new ResizeObserver(() => syncCamera(true)).observe(canvas);
  requestAnimationFrame(animate);

  const prewarm = () => {
    if (!busy && !document.hidden) loadItem('red').catch(() => {});
  };
  if ('requestIdleCallback' in window) requestIdleCallback(prewarm);
}

$('#show-help').onclick = () => $('#help-dialog').showModal();

start().catch(error => {
  console.error(error);
  $('#loading-message').textContent = 'The 3D studio could not load.';
  $('.loading-spinner').hidden = true;
  $('#retry-loading').hidden = false;
});
