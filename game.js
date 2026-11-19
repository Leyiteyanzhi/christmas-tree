import {
  WIDTH, HEIGHT, CENTER, FLOOR, trees, backdrops, items, isFloor, isTopper, source, loadArt,
  treeBox, anchorPoint, starter, matchesAt, renderScene,
} from './scene.js';

const $ = selector => document.querySelector(selector);
const canvas = $('#scene');
const context = canvas.getContext('2d');
const picture = $('.picture');
const photo = $('#photo');
const dialog = $('#photo-dialog');
const categories = { all: '全部', ball: '彩球', hanging: '挂件', topper: '树顶', floor: '树下' };
const storeKey = 'snow-window-v1';
const clamp = (number, low, high) => Math.max(low, Math.min(high, number));
const button = (label, data, image) => {
  const element = document.createElement('button');
  element.type = 'button';
  Object.assign(element.dataset, data);
  if (image) {
    const icon = document.createElement('img');
    icon.src = source(image);
    icon.alt = '';
    icon.draggable = false;
    element.append(icon);
  }
  if (label) element.append(document.createTextNode(label));
  return element;
};

let activeTree = 'pine';
let category = 'all';
let placing = null;
let selected = null;
let ready = false;
let queued = false;
let ghost = null;
let moving = null;
let marker = null;
let camera = { zoom: 1, dx: 0, dy: 0 };
let photoMode = 'full';
let width = 1;
let height = 1;
let dpr = 1;
const drafts = {};
const histories = {};
const current = () => drafts[activeTree];
const history = () => histories[activeTree];

const defaultHint = '选一件饰品，再点树枝挂上去。';
function say(message = defaultHint) {
  $('#scene-hint').textContent = message;
}

function save() {
  try {
    localStorage.setItem(storeKey, JSON.stringify({ activeTree, drafts }));
    $('#save-state').textContent = '草稿已保存';
  } catch {
    $('#save-state').textContent = '草稿暂存于此页';
  }
}

function loadDrafts() {
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(storeKey));
  } catch {
    stored = null;
  }
  if (Object.hasOwn(trees, stored?.activeTree)) activeTree = stored.activeTree;
  for (const key of Object.keys(trees)) {
    const saved = stored?.drafts?.[key];
    const valid = Array.isArray(saved?.items) && ['off', 'warm', 'color'].includes(saved.light);
    const draft = valid ? {
      light: saved.light,
      items: saved.items.filter(item => item && Object.hasOwn(items, item.key)
        && typeof item.id === 'string' && [item.x, item.y, item.angle].every(Number.isFinite)),
    } : key === 'pine' ? starter(key) : { light: 'off', items: [] };
    drafts[key] = { ...draft, backdrop: Object.hasOwn(backdrops, saved?.backdrop) ? saved.backdrop : 'room' };
    histories[key] = { undo: [], redo: [] };
  }
}

function viewFor(w = width, h = height, view = camera) {
  const scale = Math.min(h / HEIGHT, w / 580) * view.zoom;
  return { width: w, height: h, scale, x: w / 2 - CENTER * scale + view.dx, y: h / 2 - HEIGHT / 2 * scale + view.dy };
}

function draw() {
  if (!ready || queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    renderScene(context, activeTree, current(), viewFor(), {
      selected, moving, marker, ghost: ghost?.item, valid: ghost?.valid,
    });
  });
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  width = Math.max(1, bounds.width);
  height = Math.max(1, bounds.height);
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  limitCamera();
  draw();
}

function limitCamera() {
  const scale = Math.min(height / HEIGHT, width / 580);
  const extraX = Math.max(0, WIDTH * scale * camera.zoom - Math.max(width, WIDTH * scale)) / 2;
  const extraY = Math.max(0, HEIGHT * scale * camera.zoom - Math.max(height, HEIGHT * scale)) / 2;
  camera.dx = clamp(camera.dx, -extraX, extraX);
  camera.dy = clamp(camera.dy, -extraY, extraY);
}

function setCamera(zoom, dx, dy) {
  camera = { zoom, dx, dy };
  limitCamera();
  $('#reset-view').textContent = Math.round(zoom * 100) + '%';
  $('#zoom-in').disabled = zoom >= 3;
  $('#zoom-out').disabled = zoom <= 1;
  closeOverlap();
  ghost = null;
  draw();
}

function zoomAround(zoom, point = { x: width / 2, y: height / 2 }) {
  const next = clamp(zoom, 1, 3);
  const ratio = next / camera.zoom;
  setCamera(next, (point.x - width / 2) * (1 - ratio) + camera.dx * ratio,
    (point.y - height / 2) * (1 - ratio) + camera.dy * ratio);
}

function updatePanels() {
  for (const opt of document.querySelectorAll('[data-tree]')) opt.setAttribute('aria-pressed', opt.dataset.tree === activeTree);
  for (const opt of document.querySelectorAll('[data-backdrop]')) opt.setAttribute('aria-pressed', opt.dataset.backdrop === current().backdrop);
  for (const opt of document.querySelectorAll('[data-item]')) opt.setAttribute('aria-pressed', opt.dataset.item === placing);
  for (const opt of document.querySelectorAll('[data-light]')) opt.setAttribute('aria-pressed', opt.dataset.light === current().light);
  $('#undo').disabled = !history().undo.length;
  $('#redo').disabled = !history().redo.length;
  $('#placement').hidden = !placing;
  canvas.classList.toggle('placing', Boolean(placing));
  if (placing) $('#placement-name').textContent = '摆放 ' + items[placing].name;
  const item = current().items.find(entry => entry.id === selected);
  $('#edit-item').hidden = !item || Boolean(placing);
  if (item) {
    $('#edit-name').textContent = items[item.key].name;
    $('#rotate').hidden = isTopper(item.key) || isFloor(item.key);
    const swatches = $('#swatches');
    swatches.hidden = !items[item.key].color;
    for (const opt of swatches.children) opt.setAttribute('aria-pressed', opt.dataset.color === item.key);
  }
  draw();
}

function commit(draft) {
  history().undo.push(current());
  if (history().undo.length > 60) history().undo.shift();
  history().redo.length = 0;
  drafts[activeTree] = draft;
  save();
  updatePanels();
}

function travel(direction) {
  const states = history()[direction];
  if (!states.length) return;
  history()[direction === 'undo' ? 'redo' : 'undo'].push(current());
  drafts[activeTree] = states.pop();
  resetSelection();
  say(direction === 'undo' ? '已撤销。' : '已重做。');
  save();
  updatePanels();
}

function resetSelection() {
  placing = null;
  selected = null;
  moving = null;
  ghost = null;
  closeOverlap();
}

function edit(next) {
  commit({ ...current(), items: current().items.map(item => item.id === next.id ? next : item) });
}

function removeSelected() {
  if (!selected) return;
  const id = selected;
  selected = null;
  commit({ ...current(), items: current().items.filter(item => item.id !== id) });
  say('已移除饰品，可以撤销。');
}

function chooseTree(key) {
  if (!ready || key === activeTree) return;
  activeTree = key;
  resetSelection();
  marker = null;
  setCamera(1, 0, 0);
  save();
  say();
  updatePanels();
}

function chooseItem(key) {
  if (!ready) return;
  resetSelection();
  placing = key;
  say(isTopper(key) ? '点树尖附近，饰品会吸附到树顶。' : isFloor(key)
    ? '点树脚附近，把装饰沿地面摆放。'
    : '点树枝摆放。可以连续挂同款。');
  updatePanels();
}

function paintInventory() {
  for (const opt of document.querySelectorAll('[data-category]')) opt.setAttribute('aria-pressed', opt.dataset.category === category);
  const catalog = Object.entries(items).filter(([, item]) => category === 'all' || item.category === category);
  $('#material-count').textContent = catalog.length + ' 件';
  $('#item-options').replaceChildren(...catalog.map(([key, item]) => {
    const opt = button(item.name, { item: key }, key);
    opt.className = 'item-option';
    opt.setAttribute('aria-pressed', key === placing);
    opt.onclick = () => chooseItem(key);
    return opt;
  }));
  $('#item-options').scrollLeft = 0;
}

for (const [key, tree] of Object.entries(trees)) {
  const opt = button('', { tree: key }, key);
  opt.className = 'tree-option';
  const description = document.createElement('span');
  const title = document.createElement('strong');
  const detail = document.createElement('small');
  title.textContent = tree.name;
  detail.textContent = tree.description;
  description.append(title, detail);
  opt.append(description);
  opt.onclick = () => chooseTree(key);
  $('#tree-options').append(opt);
}

for (const [key, backdrop] of Object.entries(backdrops)) {
  const opt = button(backdrop.name, { backdrop: key }, key + '-preview');
  opt.className = 'backdrop-option';
  opt.onclick = () => {
    if (!ready || current().backdrop === key) return;
    commit({ ...current(), backdrop: key });
    say('已切换到' + backdrop.name + '。');
  };
  $('#backdrop-options').append(opt);
}

for (const [key, name] of Object.entries(categories)) {
  const opt = button(name, { category: key });
  opt.onclick = () => {
    if (!ready) return;
    category = key;
    paintInventory();
  };
  $('#categories').append(opt);
}

for (const [key, item] of Object.entries(items)) {
  if (!item.color) continue;
  const opt = button('', { color: key });
  opt.title = '换成' + item.name;
  opt.setAttribute('aria-label', opt.title);
  opt.style.setProperty('--swatch', item.color);
  opt.onclick = () => {
    const old = current().items.find(entry => entry.id === selected);
    if (old && old.key !== key) edit({ ...old, key });
  };
  $('#swatches').append(opt);
}

function pointAt(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function worldAt(point) {
  const view = viewFor();
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}

function place(point) {
  const location = anchorPoint(activeTree, placing, point);
  if (!location) {
    say(isTopper(placing) ? '树顶饰品需要靠近树尖。' : isFloor(placing) ? '树下装饰需要靠近树脚。' : '这里挂不上，试试靠近枝叶。');
    return;
  }
  const previous = isTopper(placing) ? current().items.filter(item => !isTopper(item.key)) : current().items;
  const id = globalThis.crypto?.randomUUID?.() ?? String(Date.now()) + '-' + Math.random();
  commit({ ...current(), items: [...previous, { id, key: placing, ...location, angle: 0 }] });
  say('已摆放' + items[placing].name + '。');
}

function choosePlaced(item) {
  selected = item?.id ?? null;
  say(item ? '拖动微调，长按可选重叠饰品。' : defaultHint);
  updatePanels();
}

function closeOverlap() {
  $('#overlap').hidden = true;
}

function showOverlap(list, pos) {
  const menu = $('#overlap');
  menu.replaceChildren(...list.map(item => {
    const opt = button('', { placed: item.id }, item.key);
    opt.title = '选择' + items[item.key].name;
    opt.setAttribute('aria-label', opt.title);
    opt.onclick = () => {
      closeOverlap();
      choosePlaced(item);
      canvas.focus({ preventScroll: true });
    };
    return opt;
  }));
  menu.hidden = false;
  const wantedWidth = Math.min(menu.scrollWidth, width - 18);
  menu.style.left = clamp(pos.x - wantedWidth / 2, 9, Math.max(9, width - wantedWidth - 9)) + 'px';
  menu.style.top = (pos.y < 115 ? pos.y + 16 : Math.max(55, pos.y - 57)) + 'px';
  say('选择想要移动的饰品。');
}

const pointers = new Map();
let gesture = null;
let pinch = null;
let longPress = null;
let suppressClick = false;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function pair() {
  const [a, b] = pointers.values();
  return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, gap: Math.max(1, distance(a, b)) };
}

function cancelLongPress() {
  clearTimeout(longPress);
  longPress = null;
}

function candidates(point) {
  return matchesAt(current().items, worldAt(point), 7 / viewFor().scale);
}

canvas.addEventListener('pointerdown', event => {
  if (!ready || (event.pointerType === 'mouse' && event.button !== 0)) return;
  const point = pointAt(event);
  closeOverlap();
  marker = null;
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, point);
  if (pointers.size === 2) {
    pinch = { ...pair(), camera: { ...camera } };
    suppressClick = true;
    gesture = null;
    moving = null;
    ghost = null;
    cancelLongPress();
    return;
  }
  if (pointers.size > 2 || suppressClick) return;
  const list = placing ? [] : candidates(point);
  const item = list.find(entry => entry.id === selected) ?? list[0];
  gesture = { start: point, world: worldAt(point), camera: { ...camera }, item, dragged: false, held: false };
  if (list.length > 1) {
    longPress = setTimeout(() => {
      if (!gesture) return;
      gesture.held = true;
      showOverlap(list, point);
    }, 480);
  }
});

canvas.addEventListener('pointermove', event => {
  if (!ready) return;
  const point = pointAt(event);
  if (pointers.has(event.pointerId)) pointers.set(event.pointerId, point);
  if (pinch && pointers.size >= 2) {
    const next = pair();
    const zoom = clamp(pinch.camera.zoom * next.gap / pinch.gap, 1, 3);
    const ratio = zoom / pinch.camera.zoom;
    setCamera(zoom, next.center.x - width / 2 - (pinch.center.x - width / 2 - pinch.camera.dx) * ratio,
      next.center.y - height / 2 - (pinch.center.y - height / 2 - pinch.camera.dy) * ratio);
    return;
  }
  if (suppressClick) return;
  if (gesture && (gesture.dragged || distance(point, gesture.start) > 6)) {
    if (gesture.held) {
      gesture.held = false;
      closeOverlap();
    }
    gesture.dragged = true;
    cancelLongPress();
    if (gesture.item) {
      const world = worldAt(point);
      const item = gesture.item;
      const location = anchorPoint(activeTree, item.key, {
        x: item.x + world.x - gesture.world.x,
        y: item.y + world.y - gesture.world.y,
      });
      gesture.valid = Boolean(location);
      if (location) moving = { ...item, ...location };
      if (selected !== item.id) choosePlaced(item);
      draw();
    } else if (!placing || event.pointerType === 'mouse') {
      setCamera(camera.zoom, gesture.camera.dx + point.x - gesture.start.x, gesture.camera.dy + point.y - gesture.start.y);
    }
    return;
  }
  if (placing && !gesture && event.pointerType === 'mouse') {
    const world = worldAt(point);
    const location = anchorPoint(activeTree, placing, world);
    ghost = { item: { key: placing, ...(location ?? world), angle: 0 }, valid: Boolean(location) };
    draw();
  }
});

function endPointer(event, canceled) {
  if (!pointers.delete(event.pointerId)) return;
  cancelLongPress();
  if (pointers.size < 2) pinch = null;
  if (suppressClick) {
    if (!pointers.size) suppressClick = false;
    return;
  }
  if (gesture && !gesture.held && !canceled) {
    if (gesture.dragged) {
      if (moving && gesture.valid) edit(moving);
      if (moving && !gesture.valid) say('请把饰品放回适合的位置。');
    } else if (placing) place(worldAt(pointAt(event)));
    else choosePlaced(gesture.item);
  }
  moving = null;
  ghost = null;
  gesture = null;
  draw();
}

canvas.addEventListener('pointerup', event => endPointer(event, false));
canvas.addEventListener('pointercancel', event => endPointer(event, true));
canvas.addEventListener('lostpointercapture', event => endPointer(event, true));
canvas.addEventListener('pointerleave', () => {
  ghost = null;
  draw();
});
canvas.addEventListener('contextmenu', event => {
  event.preventDefault();
  if (!placing && ready) {
    const point = pointAt(event);
    const list = candidates(point);
    if (list.length > 1) showOverlap(list, point);
  }
});
canvas.addEventListener('wheel', event => {
  if (!ready) return;
  event.preventDefault();
  zoomAround(camera.zoom * Math.exp(-clamp(event.deltaY, -100, 100) * .0025), pointAt(event));
}, { passive: false });

canvas.addEventListener('keydown', event => {
  if (!ready) return;
  const offsets = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  if (Object.hasOwn(offsets, event.key)) {
    event.preventDefault();
    const box = treeBox(activeTree);
    const item = current().items.find(entry => entry.id === selected);
    const base = marker ?? item ?? { x: CENTER, y: isTopper(placing) ? box.y : isFloor(placing) ? FLOOR : 400 };
    const [dx, dy] = offsets[event.key];
    const step = (event.shiftKey ? 28 : 10) / camera.zoom;
    const next = { x: clamp(base.x + dx * step, 0, WIDTH), y: clamp(base.y + dy * step, 0, HEIGHT) };
    if (event.altKey && item) {
      const location = anchorPoint(activeTree, item.key, next);
      if (location) edit({ ...item, ...location });
    } else {
      marker = next;
      draw();
    }
  }
  if (event.key === 'Enter' && marker) {
    event.preventDefault();
    if (placing) place(marker);
    else choosePlaced(matchesAt(current().items, marker, 7 / viewFor().scale)[0]);
  }
});

document.addEventListener('keydown', event => {
  if (!ready || dialog.open) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    travel(event.shiftKey ? 'redo' : 'undo');
  }
  if (event.key === 'Escape') {
    resetSelection();
    marker = null;
    say();
    updatePanels();
  }
  if (event.key === 'Delete') removeSelected();
});

$('#done-placing').onclick = () => {
  resetSelection();
  say();
  updatePanels();
};
$('#undo').onclick = () => travel('undo');
$('#redo').onclick = () => travel('redo');
$('#zoom-in').onclick = () => zoomAround(camera.zoom * 1.25);
$('#zoom-out').onclick = () => zoomAround(camera.zoom / 1.25);
$('#reset-view').onclick = () => setCamera(1, 0, 0);
$('#remove').onclick = removeSelected;
$('#rotate').onclick = () => {
  const item = current().items.find(entry => entry.id === selected);
  if (item) edit({ ...item, angle: (item.angle + Math.PI / 12) % (2 * Math.PI) });
};

function replaceWith(next, message) {
  if (!ready) return;
  const nextDraft = { ...next, backdrop: current().backdrop };
  if (JSON.stringify(nextDraft) === JSON.stringify(current())) return;
  resetSelection();
  commit(nextDraft);
  say(message);
}

$('#empty-tree').onclick = () => replaceWith({ light: 'off', items: [] }, '已清空这棵树，可以撤销。');
$('#starter-tree').onclick = () => {
  if (ready) replaceWith(starter(activeTree), '已换成半成品，可以撤销。');
};
for (const opt of document.querySelectorAll('[data-light]')) {
  opt.onclick = () => {
    if (ready && opt.dataset.light !== current().light) commit({ ...current(), light: opt.dataset.light });
  };
}

function renderPhoto(mode) {
  photoMode = mode;
  const full = mode === 'full';
  const pixelScale = full ? 1.5 : 1800 / Math.max(width, height);
  const view = full ? { width: WIDTH, height: HEIGHT, x: 0, y: 0, scale: 1 } : viewFor();
  photo.width = Math.round(view.width * pixelScale);
  photo.height = Math.round(view.height * pixelScale);
  const ctx = photo.getContext('2d');
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  renderScene(ctx, activeTree, current(), view);
  for (const opt of document.querySelectorAll('[data-photo]')) opt.setAttribute('aria-pressed', opt.dataset.photo === photoMode);
  $('#photo-status').hidden = true;
}

$('#take-photo').onclick = () => {
  renderPhoto('full');
  dialog.showModal();
};
for (const opt of document.querySelectorAll('[data-photo]')) opt.onclick = () => renderPhoto(opt.dataset.photo);
$('#download').onclick = () => {
  photo.toBlob(blob => {
    if (!blob) {
      $('#photo-status').textContent = '生成照片失败，请再试一次。';
      $('#photo-status').hidden = false;
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = backdrops[current().backdrop].name + '-' + trees[activeTree].name + '.png';
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }, 'image/png');
};

try {
  await loadArt();
  loadDrafts();
  ready = true;
  paintInventory();
  $('#loading').hidden = true;
  $('#take-photo').disabled = false;
  resize();
  setCamera(1, 0, 0);
  updatePanels();
  save();
  new ResizeObserver(resize).observe(picture);
} catch (error) {
  $('#loading').textContent = '素材加载失败，请刷新后重试。';
  console.error(error);
}
