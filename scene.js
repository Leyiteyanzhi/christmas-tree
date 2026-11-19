export const WIDTH = 1200;
export const HEIGHT = 800;
export const CENTER = 616;
export const FLOOR = 728;
export const backdrops = {
  room: { name: 'Snowy Cabin', shadow: '#160d07' },
  market: { name: 'Village Market', shadow: '#20315e' },
  bakery: { name: 'Gingerbread Bakery', shadow: '#442013' },
};
export const trees = {
  pine: { name: 'Full pine', description: 'Broad crown', top: 92, width: 465 },
  fir: { name: 'Tall fir', description: 'Slender shape', top: 68, width: 284 },
  spruce: { name: 'Snowy spruce', description: 'Frosted tips', top: 83, width: 430 },
};

export const items = {
  red: { name: 'Clay red bauble', category: 'ball', size: 52, color: '#b84731' },
  gold: { name: 'Antique gold bauble', category: 'ball', size: 52, color: '#b99046' },
  blue: { name: 'Ice blue bauble', category: 'ball', size: 52, color: '#87a5af' },
  emerald: { name: 'Pine green bauble', category: 'ball', size: 52, color: '#266150' },
  silver: { name: 'Frost silver bauble', category: 'ball', size: 52, color: '#c9cbcf' },
  rose: { name: 'Rose bauble', category: 'ball', size: 52, color: '#c9888b' },
  bow: { name: 'Velvet bow', category: 'hanging', size: 90, anchor: .29 },
  cane: { name: 'Candy cane', category: 'hanging', size: 67, anchorX: .58 },
  star: { name: 'Gold tree star', category: 'topper', size: 74, anchor: .9 },
  angel: { name: 'Carved angel', category: 'topper', size: 85, anchor: .93 },
  'ice-star': { name: 'Crystal silver star', category: 'topper', size: 78, anchor: .93 },
  flake: { name: 'Paper snowflake', category: 'hanging', size: 63 },
  icicle: { name: 'Glass icicle', category: 'hanging', size: 71 },
  cookie: { name: 'Gingerbread figure', category: 'hanging', size: 61 },
  bell: { name: 'Wooden bell', category: 'hanging', size: 66 },
  'gift-red': { name: 'Red gift', category: 'floor', size: 80, anchor: 1 },
  'gift-green': { name: 'Green gift', category: 'floor', size: 72, anchor: 1 },
  orange: { name: 'Dried orange', category: 'hanging', size: 57 },
  horse: { name: 'Rocking horse', category: 'hanging', size: 84, anchor: .16, anchorX: .57 },
  heart: { name: 'Gingerbread heart', category: 'hanging', size: 63 },
  drum: { name: 'Toy drum', category: 'hanging', size: 58 },
  cardinal: { name: 'Cardinal', category: 'hanging', size: 73, anchor: .18, anchorX: .56 },
  wreath: { name: 'Holly wreath', category: 'hanging', size: 78, anchor: .13 },
  pinecone: { name: 'Gold pinecone', category: 'hanging', size: 69 },
  nutcracker: { name: 'Nutcracker', category: 'floor', size: 138, anchor: 1 },
  'gingerbread-house': { name: 'Gingerbread house', category: 'floor', size: 107, anchor: 1 },
  'gift-cream': { name: 'Cream gift', category: 'floor', size: 77, anchor: 1 },
  'gift-tartan': { name: 'Tartan gift', category: 'floor', size: 84, anchor: 1 },
};

export const isFloor = key => items[key]?.category === 'floor';
export const isTopper = key => items[key]?.category === 'topper';
export const source = key => './assets/' + key + '.webp';
const images = {};
const landings = {};
const strings = {};

export function treeBox(key) {
  const tree = trees[key];
  return { x: CENTER - tree.width / 2, y: tree.top, w: tree.width, h: FLOOR - tree.top };
}

async function loadImage(key, retry = false) {
  const image = new Image();
  image.src = source(key) + (retry ? '?retry=1' : '');
  try {
    await image.decode();
  } catch (error) {
    if (!retry) return loadImage(key, true);
    throw new Error('Unable to load ' + key, { cause: error });
  }
  images[key] = image;
}

export async function loadArt() {
  const keys = [...Object.keys(backdrops), ...Object.keys(trees), ...Object.keys(items)];
  for (let start = 0; start < keys.length; start += 4) {
    await Promise.all(keys.slice(start, start + 4).map(key => loadImage(key)));
  }
  for (const key of Object.keys(trees)) {
    const image = images[key];
    const mask = document.createElement('canvas');
    mask.width = image.width;
    mask.height = image.height;
    const context = mask.getContext('2d');
    context.drawImage(image, 0, 0);
    landings[key] = context.getImageData(0, 0, mask.width, mask.height);
    strings[key] = buildString(key);
  }
}

function solid(key, x, y) {
  const box = treeBox(key);
  const mask = landings[key];
  const u = Math.floor((x - box.x) / box.w * mask.width);
  const v = Math.floor((y - box.y) / box.h * mask.height);
  if (u < 0 || u >= mask.width || v < 0 || v >= mask.height || y > FLOOR - 55) return false;
  return mask.data[(u + v * mask.width) * 4 + 3] > 109;
}

export function anchorPoint(tree, key, point) {
  if (isTopper(key)) {
    if (Math.abs(point.x - CENTER) > 74 || Math.abs(point.y - trees[tree].top) > 88) return null;
    return { x: CENTER, y: trees[tree].top + 18 };
  }
  if (isFloor(key)) {
    if (point.y < FLOOR - 102 || point.y > FLOOR + 55 || Math.abs(point.x - CENTER) > 270) return null;
    return { x: point.x, y: FLOOR + 10 };
  }
  if (solid(tree, point.x, point.y)) return point;
  for (const distance of [6, 12, 19, 27]) {
    for (let step = 0; step < 12; step++) {
      const angle = step * Math.PI / 6;
      const x = point.x + Math.cos(angle) * distance;
      const y = point.y + Math.sin(angle) * distance;
      if (solid(tree, x, y)) return { x, y };
    }
  }
  return null;
}

export function starter(tree) {
  const box = treeBox(tree);
  const layout = [
    ['star', 0, .02], ['bow', 0, .27], ['gold', -.20, .47], ['red', .20, .43],
    ['red', -.34, .65], ['flake', .05, .63], ['gold', .33, .73],
    ['cookie', -.12, .8], ['red', .18, .83], ['bell', -.28, .82],
    ['gift-red', -.27, 1], ['gift-green', .25, 1],
  ];
  return {
    light: 'warm',
    items: layout.flatMap(([key, x, y], index) => {
      const point = anchorPoint(tree, key, { x: CENTER + box.w * x, y: box.y + box.h * y });
      return point ? [{ id: 'base-' + index, key, ...point, angle: 0 }] : [];
    }),
  };
}

function buildString(key) {
  const box = treeBox(key);
  const lights = [];
  const path = new Path2D();
  for (const [row, progress] of [.22, .38, .53, .68, .82].entries()) {
    const y = box.y + box.h * progress;
    let left = CENTER;
    let right = CENTER;
    for (let dx = 0; dx < box.w / 2; dx += 3) {
      if (solid(key, CENTER - dx, y)) left = CENTER - dx;
      if (solid(key, CENTER + dx, y - 12)) right = CENTER + dx;
    }
    const inset = Math.max(8, (right - left) * .19);
    left += inset;
    right -= inset;
    if (right <= left) continue;
    const sag = 19 + row * 2;
    path.moveTo(left, y);
    path.quadraticCurveTo((left + right) / 2, y + sag * 2, right, y - 12);
    const count = Math.max(3, Math.round((right - left) / 20));
    for (let i = 0; i < count; i++) {
      const t = (i + .35) / count;
      const px = left + (right - left) * t;
      const py = y + 4 * sag * t * (1 - t) - 12 * t * t;
      if (solid(key, px, py - 5)) lights.push({ x: px, y: py });
    }
  }
  return { lights, path };
}

export function dimensions(item) {
  const art = items[item.key];
  const image = images[item.key];
  const scale = art.size / Math.max(image.width, image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  return { x: -w * (art.anchorX ?? .5), y: -h * (art.anchor ?? .072), w, h };
}

export function matchesAt(list, point, padding) {
  return list.filter(item => {
    const { x, y, w, h } = dimensions(item);
    const dx = point.x - item.x;
    const dy = point.y - item.y;
    const c = Math.cos(item.angle);
    const s = Math.sin(item.angle);
    const u = dx * c + dy * s;
    const v = -dx * s + dy * c;
    return u >= x - padding && u <= x + w + padding && v >= y - padding && v <= y + h + padding;
  }).reverse();
}

const warm = ['#ffc779', '#ffe3a4', '#fff0c2'];
const colorful = ['#ffc174', '#fb7161', '#79b8ff', '#ffa3b9', '#97e4a9'];

function drawLights(context, key, light) {
  const { lights, path } = strings[key];
  const colors = light === 'color' ? colorful : warm;
  context.strokeStyle = '#263329b0';
  context.lineWidth = 1.35;
  context.stroke(path);
  if (light !== 'off') {
    context.save();
    context.globalCompositeOperation = 'screen';
    for (const [index, { x, y }] of lights.entries()) {
      const fill = colors[index % colors.length];
      const glow = context.createRadialGradient(x, y, 1, x, y, 21);
      glow.addColorStop(0, fill + 'd9');
      glow.addColorStop(.29, fill + '56');
      glow.addColorStop(1, fill + '00');
      context.fillStyle = glow;
      context.fillRect(x - 21, y - 21, 42, 42);
    }
    context.restore();
  }
  for (const [index, { x, y }] of lights.entries()) {
    context.fillStyle = light === 'off' ? '#6d6650' : colors[index % colors.length];
    context.beginPath();
    context.ellipse(x, y, 2.75, 3.7, .22, 0, Math.PI * 2);
    context.fill();
  }
}

function drawItem(context, item, box, tree, highlighted, ghost) {
  const { x, y, w, h } = dimensions(item);
  context.save();
  context.translate(item.x, item.y);
  context.rotate(item.angle);
  context.globalAlpha = ghost ? .76 : 1;
  context.shadowColor = '#0b100bc0';
  context.shadowBlur = 7;
  context.shadowOffsetY = 3;
  context.drawImage(images[item.key], x, y, w, h);
  context.shadowColor = 'transparent';
  context.restore();
  if (!isFloor(item.key) && !isTopper(item.key) && item.key !== 'bow' && solid(tree, item.x, item.y - 3)) {
    context.save();
    context.beginPath();
    context.ellipse(item.x, item.y - 2, 6, 4, 0, 0, Math.PI * 2);
    context.clip();
    context.globalAlpha = .91;
    context.drawImage(images[tree], box.x, box.y, box.w, box.h);
    context.restore();
  }
  if (highlighted) {
    context.save();
    context.translate(item.x, item.y);
    context.rotate(item.angle);
    context.strokeStyle = '#ffe9ac';
    context.lineWidth = 1.5;
    context.setLineDash([4, 4]);
    context.strokeRect(x - 4, y - 4, w + 8, h + 8);
    context.restore();
  }
}

export function renderScene(context, tree, draft, view, options = {}) {
  const { width, height, scale, x, y } = view;
  const { selected, ghost, valid = true, marker, moving } = options;
  const tilt = Math.max(-1, Math.min(1, options.tilt ?? 0));
  const depth = Boolean(options.depth) && Math.abs(tilt) > .002;
  const box = treeBox(tree);
  const backdrop = Object.hasOwn(backdrops, draft.backdrop) ? draft.backdrop : 'room';
  // Parallax only: backdrop drifts farther than the locked tree+ornament layer.
  // No skew or per-item offsets — those warped the room and made decorations float.
  const bgShift = depth ? tilt * 22 : 0;
  const stageShift = depth ? tilt * 7 : 0;
  context.fillStyle = '#1a3027';
  context.fillRect(0, 0, width, height);
  context.save();
  context.translate(x, y);
  context.scale(scale, scale);
  // Extend the scenery beyond the composition so camera panning has no exposed edges.
  const edgeX = Math.min(0, -x / scale) - Math.abs(bgShift) - 8;
  const edgeY = Math.min(0, -y / scale);
  const edgeR = Math.max(WIDTH, (width - x) / scale) + Math.abs(bgShift) + 8;
  const edgeB = Math.max(HEIGHT, (height - y) / scale);
  const room = images[backdrop];
  context.save();
  if (depth) context.translate(bgShift, 0);
  context.drawImage(room, 0, 0, WIDTH, HEIGHT);
  if (edgeX < 0) context.drawImage(room, 0, 0, 1, room.height, edgeX, 0, -edgeX, HEIGHT);
  if (edgeR > WIDTH) context.drawImage(room, room.width - 1, 0, 1, room.height, WIDTH, 0, edgeR - WIDTH, HEIGHT);
  if (edgeY < 0) context.drawImage(room, 0, 0, room.width, 1, 0, edgeY, WIDTH, -edgeY);
  if (edgeB > HEIGHT) context.drawImage(room, 0, room.height - 1, room.width, 1, 0, HEIGHT, WIDTH, edgeB - HEIGHT);
  context.restore();
  context.save();
  if (depth) context.translate(stageShift, 0);
  context.save();
  context.translate(0, FLOOR);
  context.scale(1, .27);
  const floorShadow = context.createRadialGradient(CENTER, 0, 1, CENTER, 0, 115);
  floorShadow.addColorStop(0, backdrops[backdrop].shadow + 'a0');
  floorShadow.addColorStop(1, backdrops[backdrop].shadow + '00');
  context.fillStyle = floorShadow;
  context.fillRect(CENTER - 115, -115, 230, 230);
  context.restore();
  if (draft.light !== 'off') {
    const aura = context.createRadialGradient(CENTER, 399, 20, CENTER, 399, 370);
    aura.addColorStop(0, '#d69a3d3f');
    aura.addColorStop(1, '#d69a3d00');
    context.fillStyle = aura;
    context.fillRect(CENTER - 370, 29, 740, 740);
  }
  context.drawImage(images[tree], box.x, box.y, box.w, box.h);
  drawLights(context, tree, draft.light);
  for (const item of draft.items) {
    const displayed = moving?.id === item.id ? moving : item;
    drawItem(context, displayed, box, tree, selected === item.id, false);
  }
  if (ghost) {
    drawItem(context, ghost, box, tree, valid, true);
    if (!valid) {
      context.fillStyle = '#cf604e';
      context.beginPath();
      context.arc(ghost.x, ghost.y, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
  if (marker) {
    context.strokeStyle = '#fff0c1';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(marker.x, marker.y, 9 / scale, 0, Math.PI * 2);
    context.stroke();
  }
  context.restore();
  context.restore();
}
