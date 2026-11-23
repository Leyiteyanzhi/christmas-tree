import * as T from './vendor/three.js';

/**
 * Procedural tartan & striped gift-wrap textures (cached).
 */
const texCache = new Map();
function memoTex(key, fn) {
  if (!texCache.has(key)) texCache.set(key, fn());
  return texCache.get(key);
}

function tartanTexture() {
  return memoTex('tartan', () => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#8b1f28';
    ctx.fillRect(0, 0, 256, 256);
    // Deep forest tartan bands
    ctx.fillStyle = 'rgba(22, 68, 49, 0.72)';
    for (const p of [24, 152]) {
      ctx.fillRect(p, 0, 44, 256);
      ctx.fillRect(0, p, 256, 44);
    }
    // Navy cross stripes
    ctx.fillStyle = 'rgba(18, 30, 52, 0.45)';
    for (const p of [96, 224]) {
      ctx.fillRect(p, 0, 18, 256);
      ctx.fillRect(0, p, 256, 18);
    }
    // Antique gold thin overchecks
    ctx.fillStyle = 'rgba(232, 191, 108, 0.85)';
    for (const p of [44, 172]) {
      ctx.fillRect(p, 0, 4, 256);
      ctx.fillRect(0, p, 256, 4);
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  });
}

function peppermintTexture() {
  return memoTex('peppermint', () => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#faf5eb';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#c4242b';
    ctx.lineWidth = 26;
    for (let i = -256; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 256, 256);
      ctx.stroke();
    }
    // Thin subtle candy highlight stripe
    ctx.strokeStyle = '#e06c6c';
    ctx.lineWidth = 4;
    for (let i = -256; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i + 18, 0);
      ctx.lineTo(i + 274, 256);
      ctx.stroke();
    }
    const tex = new T.CanvasTexture(c);
    tex.wrapS = T.RepeatWrapping;
    tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(3, 1);
    tex.colorSpace = T.SRGBColorSpace;
    return tex;
  });
}

function goldMat(color = 0xd9ab58, roughness = 0.24, metalness = 0.78) {
  return new T.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    clearcoat: 0.45,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.6,
  });
}

function velvetMat(color = 0x8f1d27) {
  return new T.MeshPhysicalMaterial({
    color,
    roughness: 0.80,
    metalness: 0.02,
    sheen: 0.75,
    sheenColor: new T.Color(0xe05864),
    sheenRoughness: 0.55,
    envMapIntensity: 0.85,
  });
}

function crystalMat(color = 0xdff0ff) {
  return new T.MeshPhysicalMaterial({
    color,
    metalness: 0.20,
    roughness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.9,
    emissive: new T.Color(0x8ec2f0),
    emissiveIntensity: 0.18,
  });
}

function mesh(geo, mat, { pos, rot, scale, cast = true, receive = true } = {}) {
  const m = new T.Mesh(geo, mat);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  if (scale) {
    if (typeof scale === 'number') m.scale.setScalar(scale);
    else m.scale.set(scale[0], scale[1], scale[2]);
  }
  m.castShadow = cast;
  m.receiveShadow = receive;
  return m;
}

function addHangingLoop(g, brass, y = -0.015) {
  g.add(mesh(new T.TorusGeometry(0.016, 0.0038, 8, 16), brass, { pos: [0, y, 0] }));
}

/**
 * 1. Sculpted 3D Faceted Gold Tree Star (true 3D pyramidal facets on front & back!)
 */
function buildStarTopper() {
  const g = new T.Group();
  const brass = goldMat(0xe2b65b, 0.22, 0.80);
  brass.emissive = new T.Color(0xffc966);
  brass.emissiveIntensity = 0.22;

  // Coiled brass tree-top mount
  const springPts = [];
  for (let i = 0; i <= 36; i++) {
    const f = i / 36;
    const a = f * Math.PI * 6;
    const r = 0.048 * (1 - f * 0.55);
    springPts.push(new T.Vector3(Math.cos(a) * r, f * 0.12, Math.sin(a) * r));
  }
  g.add(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(springPts), 36, 0.0065, 6, false), brass));

  // Build genuine 3D 5-point faceted diamond star
  const outerR = 0.21;
  const innerR = 0.088;
  const depth = 0.072;
  const cy = 0.27;
  const verts = [];
  const frontApex = [0, cy, depth];
  const backApex = [0, cy, -depth];
  const ring = [];
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? outerR : innerR;
    ring.push([Math.cos(a) * r, cy + Math.sin(a) * r, 0]);
  }
  for (let i = 0; i < 10; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % 10];
    verts.push(...frontApex, ...a, ...b);
    verts.push(...backApex, ...b, ...a);
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  g.add(mesh(geo, brass));
  return g;
}

/**
 * 2. Sculpted 3D Crystal Silver Starburst Topper
 */
function buildIceStarTopper() {
  const g = new T.Group();
  const crystal = crystalMat(0xeef6ff);
  const silver = goldMat(0xd5dde8, 0.18, 0.85);
  const cy = 0.26;

  g.add(mesh(new T.CylinderGeometry(0.015, 0.042, 0.12, 10), silver, { pos: [0, 0.06, 0] }));
  // 8 primary 3D faceted crystal rays + 6 diagonal secondary rays (full 3D Moravian star!)
  const rayGeo = new T.ConeGeometry(0.036, 0.21, 4);
  rayGeo.translate(0, 0.105, 0);
  const axes = [
    [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0],
    [0, 0, 1], [0, 0, -1],
    [0.7, 0.7, 0], [-0.7, 0.7, 0], [0.7, -0.7, 0], [-0.7, -0.7, 0],
    [0, 0.7, 0.7], [0, 0.7, -0.7], [0.7, 0, 0.7], [-0.7, 0, 0.7],
    [0.7, 0, -0.7], [-0.7, 0, -0.7],
  ];
  const up = new T.Vector3(0, 1, 0);
  const q = new T.Quaternion();
  for (let i = 0; i < axes.length; i++) {
    const dir = new T.Vector3(...axes[i]).normalize();
    q.setFromUnitVectors(up, dir);
    const m = mesh(rayGeo, i < 6 ? crystal : silver, { pos: [0, cy, 0], scale: i < 6 ? 1.0 : 0.72 });
    m.quaternion.copy(q);
    g.add(m);
  }
  g.add(mesh(new T.OctahedronGeometry(0.055, 1), crystal, { pos: [0, cy, 0] }));
  return g;
}

/**
 * 3. Sculpted 3D Carved Angel Topper
 */
function buildAngelTopper() {
  const g = new T.Group();
  const ivory = new T.MeshPhysicalMaterial({ color: 0xf6ebd6, roughness: 0.48, clearcoat: 0.25 });
  const gold = goldMat(0xdcb05c, 0.25, 0.78);
  const hair = new T.MeshStandardMaterial({ color: 0x9b6b38, roughness: 0.65 });

  // Flowing pleated gown
  g.add(mesh(new T.ConeGeometry(0.135, 0.30, 18), ivory, { pos: [0, 0.15, 0] }));
  g.add(mesh(new T.TorusGeometry(0.132, 0.012, 8, 24), gold, { pos: [0, 0.012, 0], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new T.TorusGeometry(0.058, 0.012, 8, 18), gold, { pos: [0, 0.21, 0], rot: [Math.PI / 2, 0, 0] }));
  // Torso, arms & head
  g.add(mesh(new T.CylinderGeometry(0.036, 0.052, 0.10, 14), ivory, { pos: [0, 0.28, 0] }));
  g.add(mesh(new T.SphereGeometry(0.048, 16, 12), ivory, { pos: [0, 0.37, 0] }));
  g.add(mesh(new T.SphereGeometry(0.050, 14, 10), hair, { pos: [0, 0.382, -0.014], scale: [1.02, 0.96, 0.92] }));
  // Glowing golden halo
  g.add(mesh(new T.TorusGeometry(0.052, 0.008, 8, 24), gold, { pos: [0, 0.435, -0.01], rot: [Math.PI / 2 - 0.18, 0, 0] }));
  // Sculpted 3D arched wings
  const wingShape = new T.Shape();
  wingShape.moveTo(0, 0);
  wingShape.bezierCurveTo(0.08, 0.14, 0.18, 0.10, 0.15, -0.06);
  wingShape.bezierCurveTo(0.11, -0.14, 0.03, -0.12, 0, -0.04);
  const wingGeo = new T.ExtrudeGeometry(wingShape, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 2 });
  const wR = mesh(wingGeo, gold, { pos: [0.02, 0.29, -0.035], rot: [0.05, -0.42, 0.05] });
  const wL = mesh(wingGeo, gold, { pos: [-0.02, 0.29, -0.035], rot: [0.05, Math.PI + 0.42, -0.05] });
  g.add(wR, wL);
  return g;
}

/**
 * 4. Sculpted 3D Wrapped Gift Box (used for red, green, cream, tartan floor gifts!)
 */
function buildGiftBox({ boxColor, ribbonColor, width = 0.34, height = 0.29, depth = 0.34, tartan = false }) {
  const g = new T.Group();
  const paperMat = new T.MeshPhysicalMaterial({
    color: tartan ? 0xffffff : boxColor,
    map: tartan ? tartanTexture() : null,
    roughness: 0.54,
    metalness: 0.04,
    clearcoat: 0.18,
    envMapIntensity: 0.95,
  });
  const ribMat = new T.MeshPhysicalMaterial({
    color: ribbonColor,
    roughness: 0.32,
    metalness: 0.38,
    clearcoat: 0.55,
    envMapIntensity: 1.35,
  });

  // Main box + overhanging lid
  g.add(mesh(new T.BoxGeometry(width, height * 0.82, depth), paperMat, { pos: [0, height * 0.41, 0] }));
  g.add(mesh(new T.BoxGeometry(width + 0.022, height * 0.22, depth + 0.022), paperMat, { pos: [0, height * 0.89, 0] }));

  // Wrapping satin ribbons around all 4 vertical sides & top
  const rw = Math.min(width, depth) * 0.17;
  g.add(mesh(new T.BoxGeometry(rw, height + 0.012, depth + 0.030), ribMat, { pos: [0, height * 0.505, 0] }));
  g.add(mesh(new T.BoxGeometry(width + 0.030, height + 0.012, rw), ribMat, { pos: [0, height * 0.505, 0] }));

  // Sculpted 3D 4-loop satin ribbon bow on top!
  const bowY = height + 0.032;
  const loopGeo = new T.TorusGeometry(width * 0.16, width * 0.045, 10, 20);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const loop = mesh(loopGeo, ribMat, {
      pos: [Math.cos(a) * width * 0.15, bowY + 0.012, Math.sin(a) * width * 0.15],
      rot: [Math.sin(a) * 0.55, -a, Math.cos(a) * 0.55],
      scale: [1.18, 0.72, 0.82],
    });
    g.add(loop);
  }
  g.add(mesh(new T.SphereGeometry(width * 0.085, 12, 10), ribMat, { pos: [0, bowY, 0] }));
  return g;
}

/**
 * 5. Sculpted 3D Gingerbread House (floor item)
 */
function buildGingerbreadHouse() {
  const g = new T.Group();
  const cookie = new T.MeshStandardMaterial({ color: 0x9b5a2c, roughness: 0.84 });
  const icing = new T.MeshPhysicalMaterial({ color: 0xf8f3ea, roughness: 0.42, clearcoat: 0.35 });
  const glow = new T.MeshStandardMaterial({ color: 0xffe4a0, emissive: 0xffa73c, emissiveIntensity: 1.5, roughness: 0.2 });
  const candyRed = new T.MeshPhysicalMaterial({ color: 0xc2272d, roughness: 0.22, clearcoat: 0.9 });
  const candyGreen = new T.MeshPhysicalMaterial({ color: 0x26704b, roughness: 0.22, clearcoat: 0.9 });

  // Snow icing base plate
  g.add(mesh(new T.CylinderGeometry(0.28, 0.30, 0.028, 24), icing, { pos: [0, 0.014, 0] }));
  // Cottage walls
  g.add(mesh(new T.BoxGeometry(0.36, 0.25, 0.32), cookie, { pos: [0, 0.15, 0] }));
  // Gable pitched roof + snowy icing crust
  const roofL = mesh(new T.BoxGeometry(0.27, 0.032, 0.38), cookie, { pos: [-0.105, 0.34, 0], rot: [0, 0, 0.68] });
  const roofR = mesh(new T.BoxGeometry(0.27, 0.032, 0.38), cookie, { pos: [0.105, 0.34, 0], rot: [0, 0, -0.68] });
  const snowL = mesh(new T.BoxGeometry(0.28, 0.022, 0.39), icing, { pos: [-0.105, 0.358, 0], rot: [0, 0, 0.68] });
  const snowR = mesh(new T.BoxGeometry(0.28, 0.022, 0.39), icing, { pos: [0.105, 0.358, 0], rot: [0, 0, -0.68] });
  g.add(roofL, roofR, snowL, snowR);
  // Front & back triangular gables
  const gableGeo = new T.ConeGeometry(0.18, 0.16, 4);
  gableGeo.rotateY(Math.PI / 4);
  g.add(mesh(gableGeo, cookie, { pos: [0, 0.34, 0], scale: [1.38, 1.0, 1.24] }));
  // Chimney
  g.add(mesh(new T.BoxGeometry(0.065, 0.14, 0.065), cookie, { pos: [0.10, 0.42, -0.06] }));
  g.add(mesh(new T.BoxGeometry(0.078, 0.025, 0.078), icing, { pos: [0.10, 0.495, -0.06] }));
  // Glowing door & windows on front & sides
  g.add(mesh(new T.BoxGeometry(0.085, 0.135, 0.02), glow, { pos: [0, 0.095, 0.158] }));
  for (const sx of [-0.105, 0.105]) {
    g.add(mesh(new T.BoxGeometry(0.06, 0.06, 0.02), glow, { pos: [sx, 0.18, 0.158] }));
  }
  for (const sx of [-0.182, 0.182]) {
    g.add(mesh(new T.BoxGeometry(0.02, 0.07, 0.07), glow, { pos: [sx, 0.17, 0] }));
  }
  // Gumdrop candies along roof ridge
  for (let i = -2; i <= 2; i++) {
    g.add(mesh(new T.SphereGeometry(0.022, 10, 8), i % 2 === 0 ? candyRed : candyGreen, { pos: [0, 0.435, i * 0.075] }));
  }
  return g;
}

/**
 * 6. Sculpted 3D Nutcracker Soldier (floor item)
 */
function buildNutcracker() {
  const g = new T.Group();
  const red = new T.MeshPhysicalMaterial({ color: 0xa22129, roughness: 0.42, clearcoat: 0.4 });
  const navy = new T.MeshPhysicalMaterial({ color: 0x1c2b45, roughness: 0.46, clearcoat: 0.35 });
  const black = new T.MeshPhysicalMaterial({ color: 0x19181a, roughness: 0.34, clearcoat: 0.5 });
  const skin = new T.MeshStandardMaterial({ color: 0xf1d0b4, roughness: 0.62 });
  const white = new T.MeshStandardMaterial({ color: 0xf6f2eb, roughness: 0.72 });
  const gold = goldMat(0xdca952, 0.24, 0.78);

  // Pedestal
  g.add(mesh(new T.CylinderGeometry(0.11, 0.125, 0.04, 20), gold, { pos: [0, 0.02, 0] }));
  // Boots & legs
  for (const lx of [-0.042, 0.042]) {
    g.add(mesh(new T.CylinderGeometry(0.028, 0.032, 0.12, 12), black, { pos: [lx, 0.10, 0] }));
    g.add(mesh(new T.CylinderGeometry(0.026, 0.026, 0.09, 12), navy, { pos: [lx, 0.20, 0] }));
  }
  // Jacket torso + gold belt + epaulets + brass frog buttons
  g.add(mesh(new T.CylinderGeometry(0.076, 0.082, 0.18, 16), red, { pos: [0, 0.32, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.084, 0.084, 0.025, 16), black, { pos: [0, 0.26, 0] }));
  g.add(mesh(new T.BoxGeometry(0.038, 0.032, 0.022), gold, { pos: [0, 0.26, 0.078] }));
  for (let i = 0; i < 3; i++) {
    g.add(mesh(new T.BoxGeometry(0.075, 0.012, 0.016), gold, { pos: [0, 0.305 + i * 0.035, 0.074] }));
  }
  // Arms & gold shoulder epaulets
  for (const sx of [-1, 1]) {
    g.add(mesh(new T.CylinderGeometry(0.024, 0.022, 0.15, 10), red, { pos: [sx * 0.095, 0.32, 0], rot: [0, 0, sx * 0.12] }));
    g.add(mesh(new T.SphereGeometry(0.022, 10, 8), skin, { pos: [sx * 0.105, 0.24, 0] }));
    g.add(mesh(new T.SphereGeometry(0.032, 10, 8), gold, { pos: [sx * 0.085, 0.395, 0], scale: [1.1, 0.65, 1] }));
  }
  // Head + white beard + mustache + tall shako hat
  g.add(mesh(new T.CylinderGeometry(0.062, 0.062, 0.11, 16), skin, { pos: [0, 0.465, 0] }));
  g.add(mesh(new T.ConeGeometry(0.056, 0.095, 10), white, { pos: [0, 0.415, 0.042], rot: [Math.PI, 0, 0] }));
  g.add(mesh(new T.BoxGeometry(0.078, 0.018, 0.02), white, { pos: [0, 0.445, 0.062] }));
  // Tall black shako hat with gold crest
  g.add(mesh(new T.CylinderGeometry(0.074, 0.064, 0.13, 16), black, { pos: [0, 0.575, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.078, 0.078, 0.02, 16), gold, { pos: [0, 0.52, 0] }));
  g.add(mesh(new T.SphereGeometry(0.022, 10, 8), gold, { pos: [0, 0.648, 0.02] }));
  return g;
}

/**
 * 7. Sculpted 3D Velvet Bow (hanging ornament, hangs down from y=0)
 */
function buildVelvetBow() {
  const g = new T.Group();
  const vel = velvetMat(0x961b26);
  const brass = goldMat();
  addHangingLoop(g, brass, -0.01);

  const cy = -0.09;
  const loopGeo = new T.TorusGeometry(0.064, 0.024, 12, 24);
  g.add(mesh(loopGeo, vel, { pos: [-0.066, cy, 0.01], rot: [0.16, 0.38, 0.28], scale: [1.28, 0.82, 0.72] }));
  g.add(mesh(loopGeo, vel, { pos: [0.066, cy, 0.01], rot: [0.16, -0.38, -0.28], scale: [1.28, 0.82, 0.72] }));
  g.add(mesh(new T.SphereGeometry(0.032, 12, 10), vel, { pos: [0, cy, 0.022], scale: [1.1, 0.95, 0.9] }));

  // Flowing curved ribbon tails
  const tailGeo = new T.BoxGeometry(0.042, 0.155, 0.014);
  g.add(mesh(tailGeo, vel, { pos: [-0.044, cy - 0.095, 0.005], rot: [0.08, 0.15, -0.24] }));
  g.add(mesh(tailGeo, vel, { pos: [0.044, cy - 0.095, 0.005], rot: [0.08, -0.15, 0.24] }));
  return g;
}

/**
 * 8. Sculpted 3D Candy Cane (hanging ornament)
 */
function buildCandyCane() {
  const g = new T.Group();
  const mat = new T.MeshPhysicalMaterial({
    map: peppermintTexture(),
    roughness: 0.18,
    clearcoat: 0.92,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.35,
  });
  const pts = [
    new T.Vector3(-0.02, -0.28, 0),
    new T.Vector3(-0.02, -0.11, 0),
    new T.Vector3(-0.018, -0.045, 0),
    new T.Vector3(0.012, -0.015, 0),
    new T.Vector3(0.052, -0.022, 0),
    new T.Vector3(0.068, -0.065, 0),
  ];
  const curve = new T.CatmullRomCurve3(pts);
  g.add(mesh(new T.TubeGeometry(curve, 36, 0.020, 12, false), mat));
  return g;
}

/**
 * 9. Sculpted 3D Brass Holiday Bell (hanging ornament)
 */
function buildBell() {
  const g = new T.Group();
  const brass = goldMat(0xdba852, 0.24, 0.80);
  const vel = velvetMat(0x8e1c26);
  addHangingLoop(g, brass, -0.012);

  // Lathed bell profile hanging down from y = -0.03 to -0.24
  const profile = [
    new T.Vector2(0.001, 0.0),
    new T.Vector2(0.032, -0.01),
    new T.Vector2(0.048, -0.04),
    new T.Vector2(0.056, -0.11),
    new T.Vector2(0.078, -0.17),
    new T.Vector2(0.104, -0.205),
    new T.Vector2(0.094, -0.215),
  ];
  const bellGeo = new T.LatheGeometry(profile, 28);
  g.add(mesh(bellGeo, brass, { pos: [0, -0.032, 0] }));
  // Clapper bead inside
  g.add(mesh(new T.SphereGeometry(0.024, 12, 10), brass, { pos: [0, -0.248, 0] }));
  // Tiny crimson velvet bow at top crown
  const loopGeo = new T.TorusGeometry(0.028, 0.010, 8, 14);
  g.add(mesh(loopGeo, vel, { pos: [-0.03, -0.038, 0.018], rot: [0.1, 0.3, 0.3] }));
  g.add(mesh(loopGeo, vel, { pos: [0.03, -0.038, 0.018], rot: [0.1, -0.3, -0.3] }));
  return g;
}

/**
 * 10. Sculpted 3D Toy Drum (hanging ornament)
 */
function buildDrum() {
  const g = new T.Group();
  const red = new T.MeshPhysicalMaterial({ color: 0xa8242b, roughness: 0.42, clearcoat: 0.45 });
  const cream = new T.MeshStandardMaterial({ color: 0xf4e8ce, roughness: 0.72 });
  const gold = goldMat(0xdca850, 0.28, 0.76);
  addHangingLoop(g, gold, -0.012);

  const cy = -0.125;
  g.add(mesh(new T.CylinderGeometry(0.088, 0.088, 0.145, 24), red, { pos: [0, cy, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.092, 0.092, 0.022, 24), gold, { pos: [0, cy + 0.068, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.092, 0.092, 0.022, 24), gold, { pos: [0, cy - 0.068, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.085, 0.085, 0.008, 24), cream, { pos: [0, cy + 0.078, 0] }));
  // Zig-zag brass tension cords
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(mesh(new T.CylinderGeometry(0.0045, 0.0045, 0.135, 6), cream, {
      pos: [Math.cos(a) * 0.091, cy, Math.sin(a) * 0.091],
      rot: [0, -a, i % 2 === 0 ? 0.24 : -0.24],
    }));
  }
  return g;
}

/**
 * 11. Sculpted 3D Miniature Holly Wreath (hanging ornament)
 */
function buildMiniWreath() {
  const g = new T.Group();
  const pine = new T.MeshStandardMaterial({ color: 0x1e5238, roughness: 0.78 });
  const berry = new T.MeshPhysicalMaterial({ color: 0xb81e26, roughness: 0.22, clearcoat: 0.85 });
  const vel = velvetMat(0x941c27);
  const gold = goldMat();
  addHangingLoop(g, gold, -0.012);

  const cy = -0.135;
  const r = 0.095;
  g.add(mesh(new T.TorusGeometry(r, 0.026, 10, 24), pine, { pos: [0, cy, 0] }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(mesh(new T.ConeGeometry(0.024, 0.05, 6), pine, {
      pos: [Math.cos(a) * r, cy + Math.sin(a) * r, 0.008],
      rot: [0.3, 0, a - Math.PI / 2 + 0.4],
    }));
    if (i % 3 === 0) {
      g.add(mesh(new T.SphereGeometry(0.011, 8, 6), berry, {
        pos: [Math.cos(a + 0.15) * r, cy + Math.sin(a + 0.15) * r, 0.026],
      }));
    }
  }
  // Top crimson velvet bow
  const loopGeo = new T.TorusGeometry(0.028, 0.010, 8, 14);
  g.add(mesh(loopGeo, vel, { pos: [-0.028, cy + r - 0.01, 0.028], rot: [0.1, 0.3, 0.3] }));
  g.add(mesh(loopGeo, vel, { pos: [0.028, cy + r - 0.01, 0.028], rot: [0.1, -0.3, -0.3] }));
  return g;
}

/**
 * 12. Sculpted 3D Golden Pinecone (hanging ornament)
 */
function buildPinecone() {
  const g = new T.Group();
  const gold = goldMat(0xc48f3e, 0.34, 0.68);
  const bronze = goldMat(0x7c5124, 0.48, 0.52);
  addHangingLoop(g, gold, -0.012);

  g.add(mesh(new T.SphereGeometry(0.056, 12, 10), bronze, { pos: [0, -0.13, 0], scale: [0.9, 1.55, 0.9] }));
  const scaleGeo = new T.ConeGeometry(0.022, 0.042, 5);
  for (let row = 0; row < 5; row++) {
    const f = row / 4;
    const y = -0.055 - f * 0.145;
    const rad = 0.026 + Math.sin(f * Math.PI) * 0.042;
    const count = row === 0 || row === 4 ? 5 : 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + row * 0.5;
      g.add(mesh(scaleGeo, gold, {
        pos: [Math.cos(a) * rad, y, Math.sin(a) * rad],
        rot: [Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9],
      }));
    }
  }
  return g;
}

/**
 * 13. Sculpted 3D Twisted Crystal Glass Icicle (hanging ornament)
 */
function buildIcicle() {
  const g = new T.Group();
  const crystal = crystalMat(0xdaf0ff);
  const silver = goldMat(0xd5dde8, 0.2, 0.85);
  addHangingLoop(g, silver, -0.012);

  const geo = new T.ConeGeometry(0.026, 0.28, 8, 12);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const twist = y * 14.0;
    const c = Math.cos(twist), s = Math.sin(twist);
    const pinch = 1 + 0.14 * Math.sin(y * 32.0);
    pos.setXYZ(i, (x * c - z * s) * pinch, y, (x * s + z * c) * pinch);
  }
  geo.computeVertexNormals();
  g.add(mesh(geo, crystal, { pos: [0, -0.165, 0], rot: [Math.PI, 0, 0] }));
  return g;
}

const PROCEDURAL_ORNAMENTS = {
  star: buildStarTopper,
  'ice-star': buildIceStarTopper,
  angel: buildAngelTopper,
  'gift-red': () => buildGiftBox({ boxColor: 0xa6262c, ribbonColor: 0xe6c173, width: 0.36, height: 0.31, depth: 0.36 }),
  'gift-green': () => buildGiftBox({ boxColor: 0x1f5944, ribbonColor: 0xdcb05c, width: 0.31, height: 0.27, depth: 0.31 }),
  'gift-cream': () => buildGiftBox({ boxColor: 0xf0e3c8, ribbonColor: 0x9c2831, width: 0.34, height: 0.28, depth: 0.32 }),
  'gift-tartan': () => buildGiftBox({ boxColor: 0xffffff, ribbonColor: 0xdcb05c, width: 0.38, height: 0.32, depth: 0.34, tartan: true }),
  'gingerbread-house': buildGingerbreadHouse,
  nutcracker: buildNutcracker,
  bow: buildVelvetBow,
  cane: buildCandyCane,
  bell: buildBell,
  drum: buildDrum,
  wreath: buildMiniWreath,
  pinecone: buildPinecone,
  icicle: buildIcicle,
};

export function hasProceduralOrnament(key) {
  return Object.hasOwn(PROCEDURAL_ORNAMENTS, key);
}

export function buildProceduralOrnament(key) {
  const factory = PROCEDURAL_ORNAMENTS[key];
  if (!factory) return null;
  const model = factory();
  model.name = 'Sculpted_' + key;
  return model;
}
