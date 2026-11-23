import * as T from './vendor/three.js';
import { trees, backdrops, items } from '../scene.js';
import {
  setupTray,
  setupWorks,
  setupFullscreen,
  workFile,
  isWorkFile,
  encodeShareHash,
  decodeShareHash,
} from '../workshop-tools.js';
import { createEnvironmentMap } from './textures.js';
import { createWorldManager } from './worlds.js';
import { buildVolumetricTree } from './trees.js';
import { hasProceduralOrnament, buildProceduralOrnament } from './ornaments.js';
import { createStudioAudio } from './audio.js';
import { createI18n } from './i18n.js';
import { composePhotoCard } from './postcard.js';
import {
  enhanceOrnament,
  createTreeCollar,
  createLightGarland,
  createInteractionGuides,
} from './decor.js';

const studioUrl = path => new URL(path, import.meta.url).href;
const $ = selector => document.querySelector(selector);
const canvas = $('#view');
const itemKeys = Object.keys(items);
const crowns = {}, drafts = {}, histories = {};
let activeTree = 'pine';
const treeWidth = () => trees[activeTree].width / trees.pine.width;
const treeHeight = () => (728 - trees[activeTree].top) / (728 - trees.pine.top);
const lights = ['warm', 'colour', 'off'];
const store = 'snow-window-studio-3d-v1';

const isMobileDevice = matchMedia('(max-width: 780px), (pointer: coarse)').matches;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const i18n = createI18n();
i18n.initDoc();
const audio = createStudioAudio();

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
let renderer, draft, garland, guides, selected, material, gesture, fullscreen;
let busy = false;
let autoOrbit = false;
let mode = 'turn';
let activeCategory = 'all';

// Smooth damped camera state
let targetZoom = 1, zoom = 1;
let targetAzimuth = 0, azimuth = 0;
let targetElevation = 0.115, elevation = 0.115;

// Shared cinematic lighting rig + smooth target interpolation for world/light transitions
let hemiLight, keyLight, rimLight, fillLight;
let lightingTarget = null;

// Placement spring pop-in & gentle pendulum sway animations (siteId -> { start, isFloor })
const ornamentAnims = new Map();
let lastPlacedSite = null;

let past = [], future = [];
const historyLimit = 60;
const t = () => i18n.t();
const itemName = key => t().items[key] || items[key].name;
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
  if (library === models && hasProceduralOrnament(key)) {
    library[key] = buildProceduralOrnament(key);
    return Promise.resolve();
  }
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
    say(t().hintLoadError);
  });
}

function applyWorldMood(backdropKey, immediate = false) {
  const world = worlds.activate(backdropKey);
  audio.setWorld(backdropKey);
  scene.background = world.background;
  scene.fog = world.fog;
  if (renderer) {
    scene.environment = createEnvironmentMap(renderer, backdropKey);
  }
  const L = world.lighting;
  lightingTarget = {
    hemiSky: new T.Color(L.hemiSky),
    hemiGround: new T.Color(L.hemiGround),
    hemiIntensity: L.hemiIntensity,
    keyColor: new T.Color(L.keyColor),
    keyIntensity: L.keyIntensity,
    keyPos: new T.Vector3(...L.keyPos),
    rimColor: new T.Color(L.rimColor),
    rimIntensity: L.rimIntensity,
    rimPos: new T.Vector3(...L.rimPos),
    fillColor: new T.Color(L.fillColor),
    fillIntensity: L.fillIntensity,
    fillPos: new T.Vector3(...L.fillPos),
    exposure: L.exposure,
  };
  if (immediate) {
    hemiLight.color.copy(lightingTarget.hemiSky);
    hemiLight.groundColor.copy(lightingTarget.hemiGround);
    hemiLight.intensity = lightingTarget.hemiIntensity;
    keyLight.color.copy(lightingTarget.keyColor);
    keyLight.intensity = lightingTarget.keyIntensity;
    keyLight.position.copy(lightingTarget.keyPos);
    rimLight.color.copy(lightingTarget.rimColor);
    rimLight.intensity = lightingTarget.rimIntensity;
    rimLight.position.copy(lightingTarget.rimPos);
    fillLight.color.copy(lightingTarget.fillColor);
    fillLight.intensity = lightingTarget.fillIntensity;
    fillLight.position.copy(lightingTarget.fillPos);
    if (renderer) renderer.toneMappingExposure = lightingTarget.exposure;
  }
}

function syncCamera(resize = false) {
  const { width, height } = canvas.getBoundingClientRect();
  if (width < 2 || height < 2) return;
  if (resize) renderer.setSize(width, height, false);
  camera.aspect = width / height;
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

function syncOrbitButtons() {
  const txt = autoOrbit ? t().pauseOrbit : t().autoOrbit;
  $('#auto-orbit').textContent = txt;
  $('#auto-orbit').setAttribute('aria-pressed', String(autoOrbit));
  const fsOrbit = $('#fs-orbit');
  if (fsOrbit) {
    fsOrbit.setAttribute('aria-pressed', String(autoOrbit));
    fsOrbit.title = txt;
    fsOrbit.setAttribute('aria-label', txt);
  }
}

function stopOrbit() {
  if (!autoOrbit) return;
  autoOrbit = false;
  syncOrbitButtons();
}

function startOrbit() {
  setMode('turn');
  autoOrbit = true;
  syncOrbitButtons();
  say(t().hintOrbiting);
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
    $('#saved').textContent = t().draftSaved;
  } catch {
    $('#saved').textContent = t().storageUnavailable;
  }
}

function commit(next, animatedSite = null) {
  past.push(draft);
  if (past.length > historyLimit) past.shift();
  future.length = 0;
  lastPlacedSite = animatedSite;
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
    lastPlacedSite = null;
    audio.playSoftClick();
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
  const crown = crowns[activeTree];
  if (crown?.userData?.needleMats) {
    const emissiveStrength = draft.light === 'off' ? 0.08 : 0.19;
    const emissiveHex = draft.light === 'off' ? 0x122217 : 0x262917;
    for (const mat of crown.userData.needleMats) {
      mat.emissive.setHex(emissiveHex);
      mat.emissiveIntensity = emissiveStrength;
    }
  }
  const fsLight = $('#fs-light');
  if (fsLight) {
    fsLight.dataset.lightState = draft.light;
    const labelMap = { off: t().lightOff, warm: t().lightWarm, colour: t().lightColour };
    fsLight.title = `${t().lightsLabel}: ${labelMap[draft.light]}`;
    fsLight.setAttribute('aria-label', fsLight.title);
  }
}

function rebuild(immediateMood = false) {
  ornaments.clear();
  floorItems.clear();
  ornamentAnims.clear();
  applyWorldMood(draft.backdrop, immediateMood);
  const nowSec = performance.now() / 1000;
  for (const { key, site } of draft.items) {
    const model = models[key].clone();
    model.userData.site = site;
    model.position.copy(localPoint(sites[site]));
    const baseYaw = Math.atan2(model.position.x, model.position.z);
    model.rotation.y = baseYaw;
    model.userData.baseYaw = baseYaw;
    (type(key) === 'floor' ? floorItems : ornaments).add(model);
    if (site === lastPlacedSite && !reducedMotion.matches) {
      ornamentAnims.set(model, { start: nowSec, kind: type(key) });
      model.scale.setScalar(0.08);
    }
  }
  lastPlacedSite = null;
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
  if (site == null) { say(t().hintNoSpot); return; }
  if (material) {
    const key = material;
    audio.playPlace(items[key].category);
    commit({ ...draft, items: [...draft.items.filter(item => item.site !== site), { key, site }] }, site);
    say(t().hintPlaced(itemName(key)));
  } else if (selected != null && site !== selected) {
    const old = selected;
    const movingKey = objectAt(old)?.key;
    selected = site;
    if (movingKey) audio.playPlace(items[movingKey].category);
    commit({ ...draft, items: draft.items.map(item => item.site === old ? { ...item, site } : item) }, site);
    say(t().hintMoved);
  }
}

function setMode(next) {
  stopOrbit();
  mode = next; material = null; selected = null;
  say(mode === 'turn' ? t().hintOrbit : t().hintEdit);
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
      if (!gesture.drag) place(nearest(e.clientX, e.clientY));
    } else if (gesture.drag && !gesture.orbiting && gesture.site != null) {
      place(nearest(e.clientX, e.clientY));
    } else if (!gesture.drag && gesture.site != null) {
      selected = gesture.site;
      say(t().hintSelected);
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

  const shadowSize = isMobileDevice ? 1024 : 2048;
  keyLight = new T.DirectionalLight(0xffe3bd, 1.75);
  keyLight.position.set(-2.6, 5.2, 3.8);
  keyLight.castShadow = true;
  Object.assign(keyLight.shadow.camera, { left: -3.2, right: 3.2, top: 4.2, bottom: -3.2, near: 0.2, far: 16 });
  keyLight.shadow.mapSize.set(shadowSize, shadowSize);
  keyLight.shadow.bias = -0.0004;
  keyLight.shadow.normalBias = 0.022;
  keyLight.shadow.radius = isMobileDevice ? 2.4 : 3.2;
  scene.add(keyLight);

  rimLight = new T.DirectionalLight(0x89bfff, 1.05);
  rimLight.position.set(-3.2, 3.1, -3.8);
  scene.add(rimLight);

  fillLight = new T.DirectionalLight(0xffa65c, 0.55);
  fillLight.position.set(3.2, 2.4, -2.5);
  scene.add(fillLight);

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

function syncAudioButtons() {
  const on = audio.isEnabled();
  const label = on ? t().soundOn : t().soundOff;
  for (const sel of ['#toggle-audio', '#fs-audio']) {
    const el = $(sel);
    if (!el) continue;
    el.setAttribute('aria-pressed', String(on));
    el.title = label;
    el.setAttribute('aria-label', label);
  }
}

/**
 * Apply active Chinese / English localization across every UI element in the 3D studio.
 */
function applyLanguage() {
  const tr = t();
  $('.brand-copy h1').textContent = tr.brandTitle;
  $('.brand-copy p').textContent = tr.brandSub;
  $('.studio-link').textContent = tr.link2d;
  $('#show-help').textContent = tr.help;
  $('#show-works').textContent = tr.works;
  if ($('#share-tree')) $('#share-tree').textContent = tr.share;
  if ($('#toggle-lang')) $('#toggle-lang').textContent = i18n.lang === 'zh' ? 'EN' : '中文';
  const photoLabel = $('#photo .btn-label');
  if (photoLabel) photoLabel.textContent = tr.photo;
  $('#tree-title').textContent = tr.chooseTree;
  $('.starts legend').textContent = tr.startLayout;
  $('#empty').textContent = tr.emptyTree;
  $('#starter').textContent = tr.starter;
  $('#backdrop-title').textContent = tr.changeScene;
  $('.inspiration summary').innerHTML = `<span aria-hidden="true">✦</span> ${tr.tipSummary}`;
  $('.inspiration p').textContent = tr.tipBody;
  $('#turn').textContent = tr.orbitView;
  $('#edit').textContent = tr.editOrnaments;
  $('#remove').textContent = tr.removeOrnament;
  $('.lights-label').textContent = tr.lightsLabel;
  $('[data-light=off]').textContent = tr.lightOff;
  $('[data-light=warm]').textContent = tr.lightWarm;
  $('[data-light=colour]').textContent = tr.lightColour;
  $('#materials-title').textContent = tr.ornamentsTitle;
  $('#undo').title = tr.undo; $('#undo').setAttribute('aria-label', tr.undo);
  $('#redo').title = tr.redo; $('#redo').setAttribute('aria-label', tr.redo);
  $('#more').title = tr.zoomIn; $('#more').setAttribute('aria-label', tr.zoomIn);
  $('#less').title = tr.zoomOut; $('#less').setAttribute('aria-label', tr.zoomOut);
  $('#home').title = tr.resetView; $('#home').setAttribute('aria-label', tr.resetView);
  const trayToggle = $('.tray-toggle');
  if (trayToggle) {
    const expanded = $('.materials').classList.contains('tray-expanded');
    trayToggle.textContent = expanded ? tr.showLess : tr.browseAll;
  }

  // Trees
  for (const btn of document.querySelectorAll('[data-tree]')) {
    const info = tr.trees[btn.dataset.tree];
    if (!info) continue;
    btn.querySelector('strong').textContent = info.name;
    btn.querySelector('small').textContent = info.description;
  }
  // Scenes
  for (const btn of document.querySelectorAll('[data-setting]')) {
    const label = btn.querySelector('.setting-label');
    if (label && tr.backdrops[btn.dataset.setting]) label.textContent = tr.backdrops[btn.dataset.setting];
  }
  // Categories
  for (const btn of document.querySelectorAll('#category [data-category]')) {
    btn.textContent = tr.categories[btn.dataset.category] || btn.textContent;
  }
  // Ornaments
  let visibleCount = 0;
  for (const tile of document.querySelectorAll('#palette [data-key]')) {
    const label = tile.querySelector('.item-label');
    if (label) label.textContent = itemName(tile.dataset.key);
    if (!tile.hidden) visibleCount++;
  }
  $('#material-count').textContent = tr.itemsCount(visibleCount);

  // Help dialog
  $('#help-title').textContent = tr.helpTitle;
  const helpList = $('.help-steps');
  if (helpList) {
    helpList.replaceChildren(...tr.helpSteps.map(([h, p]) => {
      const li = document.createElement('li');
      const h3 = document.createElement('h3'); h3.textContent = h;
      const para = document.createElement('p'); para.textContent = p;
      li.append(h3, para);
      return li;
    }));
  }
  $('#help-dialog .help-actions .primary').textContent = tr.backToStudio;

  // Works dialog
  $('#works-title').textContent = tr.worksTitle;
  const worksLabels = document.querySelectorAll('#works-dialog .works-row label');
  if (worksLabels[0]) worksLabels[0].firstChild.textContent = tr.copyName + ' ';
  const copyInput = $('#works-dialog input[type=text]');
  if (copyInput) copyInput.placeholder = tr.copyPlaceholder;
  if ($('[data-work=copy]')) $('[data-work=copy]').textContent = tr.saveCopy;
  if (worksLabels[1]) worksLabels[1].firstChild.textContent = tr.savedCopies + ' ';
  if ($('[data-work=open]')) $('[data-work=open]').textContent = tr.open;
  if ($('[data-work=delete]')) $('[data-work=delete]').textContent = tr.delete;
  if ($('[data-work=export]')) $('[data-work=export]').textContent = tr.downloadProject;
  if (worksLabels[2]) worksLabels[2].firstChild.textContent = tr.openProjectFile + ' ';

  // Photo & Card dialog
  if ($('#photo-title')) $('#photo-title').textContent = tr.photoTitle;
  if ($('[data-photo-style=clean]')) $('[data-photo-style=clean]').textContent = tr.photoStyleClean;
  if ($('[data-photo-style=card]')) $('[data-photo-style=card]').textContent = tr.photoStyleCard;
  if ($('[data-photo-ratio=wide]')) $('[data-photo-ratio=wide]').textContent = tr.photoRatioWide;
  if ($('[data-photo-ratio=portrait]')) $('[data-photo-ratio=portrait]').textContent = tr.photoRatioPortrait;
  if ($('#card-greeting-label')) $('#card-greeting-label').textContent = tr.photoGreetingLabel;
  const greetInput = $('#card-greeting');
  if (greetInput && (!greetInput.value || greetInput.dataset.auto === 'true')) {
    greetInput.value = tr.photoGreetingDefault;
    greetInput.dataset.auto = 'true';
  }
  if ($('#download-photo')) $('#download-photo').textContent = tr.savePng;

  syncOrbitButtons();
  syncAudioButtons();
  if ($('#saved').textContent) $('#saved').textContent = tr.draftSaved;
  if (draft) renderLights();
  if (mode === 'turn' && !autoOrbit) say(tr.hintOrbit);
}

/**
 * Photo & Holiday Greeting Card Dialog controller.
 */
function setupPhotoCardDialog() {
  const dialog = $('#photo-dialog');
  const previewCanvas = $('#photo-preview');
  const greetingInput = $('#card-greeting');
  const cardOptions = $('#card-options');
  const statusEl = $('#photo-status');
  let capturedCanvas = null;
  let photoStyle = 'card';
  let photoRatio = 'portrait';

  function renderPreview() {
    if (!capturedCanvas) return;
    const now = new Date();
    const dateText = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    composePhotoCard(previewCanvas, capturedCanvas, {
      style: photoStyle,
      ratio: photoRatio,
      greeting: greetingInput?.value || t().photoGreetingDefault,
      title: t().brandTitle,
      dateText,
    });
    for (const b of document.querySelectorAll('[data-photo-style]')) {
      b.setAttribute('aria-pressed', String(b.dataset.photoStyle === photoStyle));
    }
    for (const b of document.querySelectorAll('[data-photo-ratio]')) {
      b.setAttribute('aria-pressed', String(b.dataset.photoRatio === photoRatio));
    }
    if (cardOptions) cardOptions.hidden = photoStyle !== 'card';
    if (statusEl) statusEl.hidden = true;
  }

  function openPhotoDialog() {
    stopOrbit();
    guides.setVisible(false);
    renderer.render(scene, camera);
    // Snapshot current crisp WebGL frame onto an offscreen canvas immediately
    capturedCanvas = document.createElement('canvas');
    capturedCanvas.width = canvas.width;
    capturedCanvas.height = canvas.height;
    capturedCanvas.getContext('2d').drawImage(canvas, 0, 0);
    refreshSpots();

    if (dialog) {
      renderPreview();
      dialog.showModal();
    } else {
      downloadCanvas(capturedCanvas);
    }
  }

  function downloadCanvas(c) {
    c.toBlob(blob => {
      if (!blob) {
        if (statusEl) { statusEl.textContent = t().photoError; statusEl.hidden = false; }
        else say(t().photoError);
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photoStyle === 'card' ? 'christmas-tree-card-3d.png' : 'christmas-tree-3d.png';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }, 'image/png');
  }

  for (const b of document.querySelectorAll('[data-photo-style]')) {
    b.onclick = () => { photoStyle = b.dataset.photoStyle; renderPreview(); };
  }
  for (const b of document.querySelectorAll('[data-photo-ratio]')) {
    b.onclick = () => { photoRatio = b.dataset.photoRatio; renderPreview(); };
  }
  greetingInput?.addEventListener('input', () => {
    greetingInput.dataset.auto = 'false';
    renderPreview();
  });
  if ($('#download-photo')) $('#download-photo').onclick = () => downloadCanvas(previewCanvas);

  return { open: openPhotoDialog };
}

async function copyShareLink() {
  const hash = encodeShareHash(activeTree, draft, itemKeys);
  const url = `${location.origin}${location.pathname}${hash}`;
  try { window.history.replaceState(null, '', hash); } catch {}
  try {
    await navigator.clipboard.writeText(url);
    say(t().hintShareCopied);
  } catch {
    say(t().hintShareReady);
  }
  audio.playSoftClick();
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
        audio.playSoftClick();
        switchTree(key);
        persist();
        say(t().hintSwitchTree);
      });
    };
    $('#tree-kind').append(button);
  }
  for (const [key, { name }] of Object.entries(backdrops)) {
    const button = pictureButton('backdrop-option', key + '-preview');
    button.dataset.setting = key;
    const span = document.createElement('span');
    span.className = 'setting-label';
    span.textContent = name;
    button.append(span);
    button.onclick = () => {
      if (draft.backdrop !== key) {
        const next = { ...draft, backdrop: key };
        change(() => ensureDraft(activeTree, next), () => {
          audio.playSoftClick();
          commit(next);
        });
      }
    };
    $('#setting').append(button);
  }
  $('#empty').onclick = () => { setMode('turn'); audio.playSoftClick(); commit({ ...draft, items: [], light: 'off' }); };
  $('#starter').onclick = () => {
    const next = { ...initialDraft(), backdrop: draft.backdrop };
    change(() => ensureDraft(activeTree, next), () => { setMode('turn'); audio.playLights(); commit(next); });
  };
  for (const [key, label] of Object.entries({ all: 'All', ball: 'Baubles', hanging: 'Hanging', topper: 'Toppers', floor: 'Floor' })) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.category = key;
    button.textContent = label;
    button.setAttribute('aria-pressed', key === 'all');
    button.onclick = () => {
      activeCategory = key;
      for (const tab of $('#category').children) tab.setAttribute('aria-pressed', tab === button);
      let count = 0;
      for (const tile of $('#palette').children) {
        tile.hidden = key !== 'all' && items[tile.dataset.key].category !== key;
        if (!tile.hidden) count++;
      }
      $('#palette').scrollTo(0, 0);
      $('#material-count').textContent = t().itemsCount(count);
    };
    $('#category').append(button);
  }
  for (const [key, { name }] of Object.entries(items)) {
    const b = pictureButton('item-option', key);
    const span = document.createElement('span');
    span.className = 'item-label';
    span.textContent = name;
    b.append(span);
    b.dataset.key = key;
    b.onclick = () => {
      if (!models[key]) say(t().hintLoadingItem(itemName(key)));
      change(() => loadItem(key), () => {
        mode = 'edit'; material = key; selected = null;
        tray.picked(key);
        const displayName = itemName(key);
        say(type(key) === 'top'
          ? t().hintPlaceTop
          : type(key) === 'floor'
            ? t().hintPlaceFloor
            : t().hintPlaceBranch(displayName));
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
    audio.playSoftClick();
    commit({ ...draft, items: draft.items.filter(i => i.site !== old) });
    say(t().hintRemoved);
  };
  for (const b of document.querySelectorAll('[data-light]'))
    b.onclick = () => {
      if (draft.light !== b.dataset.light) {
        if (b.dataset.light !== 'off') audio.playLights();
        else audio.playSoftClick();
        commit({ ...draft, light: b.dataset.light });
      }
    };
  $('#more').onclick = () => { targetZoom = clamp(targetZoom * 1.18, 0.8, 1.85); };
  $('#less').onclick = () => { targetZoom = clamp(targetZoom / 1.18, 0.8, 1.85); };
  $('#home').onclick = () => {
    stopOrbit();
    targetZoom = 1;
    targetElevation = 0.115;
    targetAzimuth = 0;
  };
  const toggleOrbit = () => (autoOrbit ? stopOrbit() : startOrbit());
  $('#auto-orbit').onclick = toggleOrbit;
  if ($('#fs-orbit')) $('#fs-orbit').onclick = toggleOrbit;

  if ($('#fs-light')) {
    $('#fs-light').onclick = () => {
      const nextLight = lights[(lights.indexOf(draft.light) + 1) % lights.length];
      if (nextLight !== 'off') audio.playLights();
      else audio.playSoftClick();
      commit({ ...draft, light: nextLight });
    };
  }

  const toggleSound = async () => {
    await audio.toggle();
    syncAudioButtons();
  };
  if ($('#toggle-audio')) $('#toggle-audio').onclick = toggleSound;
  if ($('#fs-audio')) $('#fs-audio').onclick = toggleSound;
  if ($('#share-tree')) $('#share-tree').onclick = copyShareLink;
  if ($('#toggle-lang')) $('#toggle-lang').onclick = () => { i18n.toggle(); applyLanguage(); };

  $('#show-help').addEventListener('click', stopOrbit);
  $('#show-works').addEventListener('click', stopOrbit);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopOrbit(); });

  const photoCard = setupPhotoCardDialog();
  $('#photo').onclick = photoCard.open;
  if ($('#fs-photo')) $('#fs-photo').onclick = photoCard.open;
}

let lastNow = 0;
let lastRenderTime = 0;
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

  const damp = 1 - Math.exp(-dt * 11.5);
  const prevAz = azimuth, prevEl = elevation, prevZ = zoom;
  azimuth += (targetAzimuth - azimuth) * damp;
  elevation += (targetElevation - elevation) * damp;
  zoom += (targetZoom - zoom) * damp;

  const cameraMoving =
    Math.abs(azimuth - prevAz) > 1e-5 ||
    Math.abs(elevation - prevEl) > 1e-5 ||
    Math.abs(zoom - prevZ) > 1e-5;

  // Mobile power-saving throttle (~30fps when idle, instant 60fps when interacting/orbiting/animating!)
  if (
    isMobileDevice &&
    firstRendered &&
    !cameraMoving &&
    !autoOrbit &&
    !gesture &&
    ornamentAnims.size === 0 &&
    now - lastRenderTime < 32
  ) {
    return;
  }
  lastRenderTime = now;

  if (cameraMoving || !firstRendered) {
    syncCamera(false);
  }

  // Smooth lighting crossfade between scenes
  if (lightingTarget) {
    const ld = 1 - Math.exp(-dt * 7.5);
    hemiLight.color.lerp(lightingTarget.hemiSky, ld);
    hemiLight.groundColor.lerp(lightingTarget.hemiGround, ld);
    hemiLight.intensity += (lightingTarget.hemiIntensity - hemiLight.intensity) * ld;
    keyLight.color.lerp(lightingTarget.keyColor, ld);
    keyLight.intensity += (lightingTarget.keyIntensity - keyLight.intensity) * ld;
    keyLight.position.lerp(lightingTarget.keyPos, ld);
    rimLight.color.lerp(lightingTarget.rimColor, ld);
    rimLight.intensity += (lightingTarget.rimIntensity - rimLight.intensity) * ld;
    rimLight.position.lerp(lightingTarget.rimPos, ld);
    fillLight.color.lerp(lightingTarget.fillColor, ld);
    fillLight.intensity += (lightingTarget.fillIntensity - fillLight.intensity) * ld;
    fillLight.position.lerp(lightingTarget.fillPos, ld);
    renderer.toneMappingExposure += (lightingTarget.exposure - renderer.toneMappingExposure) * ld;
  }

  // Tactile placement spring pop-in & damped pendulum sway
  if (ornamentAnims.size > 0) {
    const nowSec = now / 1000;
    for (const [model, anim] of ornamentAnims.entries()) {
      const elapsed = nowSec - anim.start;
      const p = Math.min(1, elapsed / 0.65);
      // Elastic ease-out scale
      const overshoot = 1 - Math.exp(-elapsed * 8.5) * Math.cos(elapsed * 16.0);
      model.scale.setScalar(clamp(overshoot, 0.05, 1.12));
      // Gentle damped pendulum sway for hanging ornaments
      if (anim.kind === 'branch') {
        const sway = Math.exp(-elapsed * 5.2) * Math.sin(elapsed * 15.0) * 0.22;
        model.rotation.z = sway;
      }
      if (p >= 1) {
        model.scale.setScalar(1);
        model.rotation.z = 0;
        ornamentAnims.delete(model);
      }
    }
  }

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
  const maxDpr = isMobileDevice ? 1.35 : 1.85;
  renderer.setPixelRatio(Math.min(maxDpr, window.devicePixelRatio || 1));
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

  let key = loadDrafts();
  let loadedFromShare = false;
  const shared = decodeShareHash(location.hash, itemKeys);
  if (shared && Object.hasOwn(trees, shared.tree)) {
    const validated = restoreTree(shared.tree, shared.draft);
    drafts[shared.tree] = validated;
    key = shared.tree;
    loadedFromShare = true;
  }

  await ensureDraft(key, drafts[key]);
  bind();
  switchTree(key, false);
  rebuild(true);
  applyLanguage();

  setupWorks({
    mode: '3d',
    snapshot: () => workFile('3d', activeTree, draft),
    validate: work => isWorkFile(work, '3d', trees, backdrops, lights)
      && restoreTree(work.tree, work.draft).items.length === work.draft.items.length,
    open: work => withAssets(() => ensureDraft(work.tree, work.draft), () => {
      if (activeTree !== work.tree) switchTree(work.tree, false);
      mode = 'turn'; material = null; selected = null;
      commit(work.draft);
      say(t().hintWorkOpened);
    }),
  });

  for (const selector of ['#turn', '#edit', '#photo', '#show-works', '#auto-orbit', '#fullscreen', '#share-tree', '#toggle-audio']) {
    const el = $(selector);
    if (el) el.disabled = false;
  }

  fullscreen = setupFullscreen($('#fullscreen'), () => syncCamera(true));
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && mode === 'edit' && !fullscreen.isActive() && !document.querySelector('dialog[open]')) {
      setMode('turn');
    }
  });

  syncCamera(true);
  setMode('turn');
  if (loadedFromShare) say(t().hintSharedLoaded);
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
  $('#loading-message').textContent = t().loadingFailed;
  $('.loading-spinner').hidden = true;
  $('#retry-loading').hidden = false;
});
