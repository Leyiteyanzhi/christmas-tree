import * as T from './vendor/three.js';
import {
  parquetTextures,
  plasterTextures,
  cobblestoneTextures,
  bakeryTileTextures,
  plazaPlinthTexture,
  rugTexture,
  awningTexture,
  stoneTexture,
  glowSpriteTexture,
  contactShadowTexture,
} from './textures.js';

export const FLOOR_Y = 0.196;
export const STAGE_Y = 0.216;

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mesh(geo, mat, { pos, rot, scale, cast = false, receive = true } = {}) {
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

function addGlow(parent, x, y, z, color, scale, opacity = 0.72) {
  const mat = new T.SpriteMaterial({
    map: glowSpriteTexture(),
    color,
    transparent: true,
    opacity,
    blending: T.AdditiveBlending,
    depthWrite: false,
  });
  const s = new T.Sprite(mat);
  s.position.set(x, y, z);
  s.scale.setScalar(scale);
  parent.add(s);
  return s;
}

/**
 * Shared sculptural props
 */
function createBrassMaterial(color = 0xd3a459, roughness = 0.28) {
  return new T.MeshStandardMaterial({
    color,
    metalness: 0.82,
    roughness,
    envMapIntensity: 1.45,
  });
}

function createWreath(radius = 0.42, evergreenMat, berryMat, velvetMat) {
  const g = new T.Group();
  const baseTorus = mesh(new T.TorusGeometry(radius, radius * 0.22, 10, 28), evergreenMat, { cast: false, receive: true });
  g.add(baseTorus);

  const tuftGeo = new T.ConeGeometry(radius * 0.17, radius * 0.34, 6);
  const count = 18;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const tuft = mesh(tuftGeo, evergreenMat, {
      pos: [Math.cos(a) * radius, Math.sin(a) * radius, 0.03],
      rot: [0.35, 0, a - Math.PI / 2 + 0.35],
    });
    g.add(tuft);
    if (i % 3 === 0) {
      const berry = mesh(new T.SphereGeometry(radius * 0.065, 8, 6), berryMat, {
        pos: [Math.cos(a + 0.1) * (radius * 0.98), Math.sin(a + 0.1) * (radius * 0.98), radius * 0.22],
      });
      g.add(berry);
    }
  }

  // Velvet bow at bottom
  const loopGeo = new T.TorusGeometry(radius * 0.16, radius * 0.055, 8, 16);
  const leftLoop = mesh(loopGeo, velvetMat, {
    pos: [-radius * 0.17, -radius * 0.95, radius * 0.22],
    rot: [0.15, 0.3, 0.35],
    scale: [1.25, 0.78, 0.6],
  });
  const rightLoop = mesh(loopGeo, velvetMat, {
    pos: [radius * 0.17, -radius * 0.95, radius * 0.22],
    rot: [0.15, -0.3, -0.35],
    scale: [1.25, 0.78, 0.6],
  });
  const knot = mesh(new T.SphereGeometry(radius * 0.08, 10, 8), velvetMat, {
    pos: [0, -radius * 0.96, radius * 0.26],
  });
  const tailGeo = new T.BoxGeometry(radius * 0.11, radius * 0.45, 0.02);
  const tailL = mesh(tailGeo, velvetMat, { pos: [-radius * 0.10, -radius * 1.24, radius * 0.20], rot: [0, 0, -0.22] });
  const tailR = mesh(tailGeo, velvetMat, { pos: [radius * 0.10, -radius * 1.24, radius * 0.20], rot: [0, 0, 0.22] });
  g.add(leftLoop, rightLoop, knot, tailL, tailR);
  return g;
}

function createCandle(height, radius, brassMat, waxMat, flameMat) {
  const g = new T.Group();
  // Dish + stem
  g.add(mesh(new T.CylinderGeometry(radius * 1.85, radius * 2.1, 0.025, 16), brassMat, { pos: [0, 0.012, 0] }));
  g.add(mesh(new T.CylinderGeometry(radius * 0.55, radius * 0.8, 0.05, 12), brassMat, { pos: [0, 0.045, 0] }));
  // Wax pillar
  g.add(mesh(new T.CylinderGeometry(radius, radius * 1.04, height, 14), waxMat, { pos: [0, 0.07 + height / 2, 0] }));
  // Glowing flame teardrop
  const flame = mesh(new T.ConeGeometry(radius * 0.48, radius * 1.6, 8), flameMat, {
    pos: [0, 0.08 + height + radius * 0.7, 0],
    receive: false,
  });
  g.add(flame);
  const halo = addGlow(g, 0, 0.08 + height + radius * 0.9, 0, 0xffc66e, 0.34, 0.68);
  return { group: g, flame, halo };
}

function createWallSconce(brassMat, glassMat) {
  const g = new T.Group();
  g.add(mesh(new T.CylinderGeometry(0.085, 0.095, 0.028, 18), brassMat, { rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.20, 8), brassMat, { pos: [0, -0.05, 0.09], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.015, 0.015, 0.24, 8), brassMat, { pos: [0, 0.06, 0.18] }));
  g.add(mesh(new T.CylinderGeometry(0.055, 0.042, 0.22, 16), glassMat, { pos: [0, 0.21, 0.18], receive: false }));
  addGlow(g, 0, 0.23, 0.20, 0xffcf82, 0.72, 0.55);
  return g;
}

/**
 * Custom soft-circle snow/mote particle field (zero harsh square pixels).
 */
function createParticleField({
  count,
  bounds,
  color = 0xffffff,
  size = 18,
  speedY = -0.35,
  sway = 0.22,
  opacity = 0.72,
  seed = 101,
}) {
  const rand = seeded(seed);
  const positions = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const scales = new Float32Array(count);

  const [minX, maxX, minY, maxY, minZ, maxZ] = bounds;
  for (let i = 0; i < count; i++) {
    positions[i * 3] = minX + rand() * (maxX - minX);
    positions[i * 3 + 1] = minY + rand() * (maxY - minY);
    positions[i * 3 + 2] = minZ + rand() * (maxZ - minZ);
    phases[i] = rand() * Math.PI * 2;
    scales[i] = 0.55 + rand() * 0.95;
  }

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(positions, 3));
  geo.setAttribute('aPhase', new T.BufferAttribute(phases, 1));
  geo.setAttribute('aScale', new T.BufferAttribute(scales, 1));

  const mat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new T.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uMinY: { value: minY },
      uHeight: { value: maxY - minY },
      uSpeedY: { value: speedY },
      uSway: { value: sway },
    },
    vertexShader: `
      attribute float aPhase;
      attribute float aScale;
      uniform float uTime;
      uniform float uSize;
      uniform float uMinY;
      uniform float uHeight;
      uniform float uSpeedY;
      uniform float uSway;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        float span = max(0.01, uHeight);
        float relY = mod((p.y - uMinY) + uTime * uSpeedY, span);
        p.y = uMinY + relY;
        p.x += sin(uTime * 0.65 + aPhase) * uSway;
        p.z += cos(uTime * 0.52 + aPhase * 1.3) * uSway;
        float edgeFade = smoothstep(0.0, 0.12, relY / span) * (1.0 - smoothstep(0.86, 1.0, relY / span));
        float twinkle = 0.72 + 0.28 * sin(uTime * 1.9 + aPhase * 3.0);
        vAlpha = edgeFade * twinkle;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(uSize * aScale * (4.5 / max(1.0, -mvPosition.z)), 1.5, 28.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d);
        if (r > 0.5) discard;
        float soft = pow(1.0 - r * 2.0, 1.8);
        gl_FragColor = vec4(uColor, soft * vAlpha * uOpacity);
      }
    `,
  });

  const points = new T.Points(geo, mat);
  points.frustumCulled = false;
  return {
    object: points,
    update(time) {
      mat.uniforms.uTime.value = time;
    },
  };
}

/**
 * Hand-painted miniature winter landscape for the framed artwork above the cabin mantel.
 */
function framedArtTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 192);
  sky.addColorStop(0, '#132641');
  sky.addColorStop(0.55, '#2b4769');
  sky.addColorStop(1, '#c9b498');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 192);

  // Moon
  ctx.fillStyle = '#fff0c8';
  ctx.beginPath();
  ctx.arc(192, 46, 14, 0, Math.PI * 2);
  ctx.fill();

  // Distant snowy mountain ridge
  ctx.fillStyle = '#6c839e';
  ctx.beginPath();
  ctx.moveTo(0, 125);
  ctx.lineTo(54, 82);
  ctx.lineTo(122, 114);
  ctx.lineTo(188, 74);
  ctx.lineTo(256, 118);
  ctx.lineTo(256, 192);
  ctx.lineTo(0, 192);
  ctx.fill();

  // Snowy foreground hills
  ctx.fillStyle = '#d7dfe8';
  ctx.beginPath();
  ctx.moveTo(0, 142);
  ctx.quadraticCurveTo(95, 118, 256, 146);
  ctx.lineTo(256, 192);
  ctx.lineTo(0, 192);
  ctx.fill();

  // Pine silhouettes + cozy cottage light
  ctx.fillStyle = '#183029';
  for (const [x, h] of [[28, 44], [52, 54], [76, 38], [212, 48], [234, 40]]) {
    ctx.beginPath();
    ctx.moveTo(x, 148 - h);
    ctx.lineTo(x - 14, 152);
    ctx.lineTo(x + 14, 152);
    ctx.fill();
  }
  ctx.fillStyle = '#5c3424';
  ctx.fillRect(118, 126, 26, 18);
  ctx.fillStyle = '#ffd178';
  ctx.fillRect(123, 132, 6, 7);
  ctx.fillRect(133, 132, 6, 7);

  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  return tex;
}

/**
 * Shared circular grounding shadow under the tree (subtle contact darkening).
 */
function createContactShadow(radius = 1.42) {
  const mat = new T.MeshBasicMaterial({
    map: contactShadowTexture(),
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const disc = new T.Mesh(new T.CircleGeometry(radius, 40), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = STAGE_Y + 0.002;
  return disc;
}

/**
 * ============================================================================
 * WORLD 1: SNOWY CABIN — "Nordic Alpine Hearth Salon"
 * ============================================================================
 */
function buildCabinWorld() {
  const root = new T.Group();
  const animators = [];

  const parquet = parquetTextures();
  const plaster = plasterTextures('cabin-emerald', '#1f3931', '#152823', 4, 2);
  const stone = stoneTexture();
  const brass = createBrassMaterial(0xd4a459, 0.27);
  const darkWalnut = new T.MeshStandardMaterial({ color: 0x3b2316, roughness: 0.56, metalness: 0.06, envMapIntensity: 0.9 });
  const warmOak = new T.MeshStandardMaterial({ color: 0x6b4328, roughness: 0.48, metalness: 0.05, envMapIntensity: 0.95 });
  const velvet = new T.MeshPhysicalMaterial({ color: 0x6e1c26, roughness: 0.82, sheen: 0.65, sheenColor: new T.Color(0xc44854), sheenRoughness: 0.6 });
  const creamFabric = new T.MeshStandardMaterial({ color: 0xebe0ca, roughness: 0.86 });
  const evergreen = new T.MeshStandardMaterial({ color: 0x204735, roughness: 0.78 });
  const berry = new T.MeshPhysicalMaterial({ color: 0xa81f24, roughness: 0.25, clearcoat: 0.8 });
  const waxMat = new T.MeshStandardMaterial({ color: 0xf7ecd4, roughness: 0.65 });
  const flameMat = new T.MeshBasicMaterial({ color: 0xffd27a });
  const sconceGlass = new T.MeshStandardMaterial({
    color: 0xfff0d0,
    emissive: 0xffbf66,
    emissiveIntensity: 1.55,
    roughness: 0.25,
  });

  const R = 6.0; // Room half-span
  const H = 5.4;

  // 1. Herringbone walnut parquet floor
  const floorMat = new T.MeshStandardMaterial({
    map: parquet.map,
    roughnessMap: parquet.roughnessMap,
    bumpMap: parquet.bumpMap,
    bumpScale: 0.012,
    roughness: 0.62,
    metalness: 0.06,
    envMapIntensity: 1.05,
  });
  const floor = mesh(new T.PlaneGeometry(R * 2.15, R * 2.15), floorMat, {
    pos: [0, FLOOR_Y, 0],
    rot: [-Math.PI / 2, 0, 0],
    receive: true,
  });
  root.add(floor);

  // 2. Woven circular Nordic rug anchoring the tree & gifts
  const rugTex = rugTexture('cabin', {
    base: '#eadbc1',
    ring1: '#6e2128',
    ring2: '#233f35',
    accent: '#c5974e',
  });
  const rugMat = new T.MeshStandardMaterial({
    map: rugTex,
    roughness: 0.92,
    metalness: 0.0,
    envMapIntensity: 0.55,
  });
  root.add(mesh(new T.CylinderGeometry(1.78, 1.82, 0.022, 64), rugMat, {
    pos: [0, FLOOR_Y + 0.009, 0],
    receive: true,
  }));
  // Subtle braided brass-gold trim edging around rug
  root.add(mesh(new T.TorusGeometry(1.79, 0.012, 8, 64), brass, {
    pos: [0, FLOOR_Y + 0.015, 0],
    rot: [Math.PI / 2, 0, 0],
  }));
  root.add(createContactShadow(1.38));

  // 3. Architectural shell: 4 walls + beveled corner timber pilasters + wainscoting + crown moulding
  const wallMat = new T.MeshStandardMaterial({
    map: plaster.map,
    bumpMap: plaster.bumpMap,
    bumpScale: 0.018,
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.65,
  });

  // Back wall (-Z) has a real recessed opening on the left for the panoramic snow window!
  // Let's build the back wall around the window aperture (x in [-4.05, -1.25], y in [1.28, 4.32]).
  const wallZ = -R;
  root.add(mesh(new T.BoxGeometry(R * 2, 1.08, 0.18), wallMat, { pos: [0, FLOOR_Y + 0.54, wallZ] })); // lower strip
  root.add(mesh(new T.BoxGeometry(R * 2, 1.15, 0.18), wallMat, { pos: [0, 4.32 + 0.575, wallZ] })); // upper strip
  root.add(mesh(new T.BoxGeometry(1.95, 3.04, 0.18), wallMat, { pos: [-5.025, 2.80, wallZ] })); // far left jamb
  root.add(mesh(new T.BoxGeometry(7.25, 3.04, 0.18), wallMat, { pos: [2.375, 2.80, wallZ] })); // center-to-right expanse

  // Other 3 solid walls (+Z, -X, +X)
  root.add(mesh(new T.BoxGeometry(R * 2, H, 0.18), wallMat, { pos: [0, FLOOR_Y + H / 2, R] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [-R, FLOOR_Y + H / 2, 0] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [R, FLOOR_Y + H / 2, 0] }));

  // Wainscoting, dado rails, crown mouldings & corner timber columns around all 4 walls
  for (let side = 0; side < 4; side++) {
    const wg = new T.Group();
    wg.rotation.y = (side * Math.PI) / 2;
    const z = -R + 0.10;
    // Lower walnut wainscoting panel band
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.94, 0.06), darkWalnut, { pos: [0, FLOOR_Y + 0.47, z] }));
    // Dado rail cap + baseboard
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.075, 0.11), warmOak, { pos: [0, FLOOR_Y + 0.96, z + 0.02] }));
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.15, 0.09), darkWalnut, { pos: [0, FLOOR_Y + 0.075, z + 0.015] }));
    // Recessed decorative vertical wainscoting battens
    for (let x = -5.2; x <= 5.2; x += 1.3) {
      wg.add(mesh(new T.BoxGeometry(0.06, 0.72, 0.03), warmOak, { pos: [x, FLOOR_Y + 0.51, z + 0.035] }));
    }
    // Crown moulding
    wg.add(mesh(new T.BoxGeometry(R * 2, 0.18, 0.16), darkWalnut, { pos: [0, FLOOR_Y + H - 0.09, z + 0.04] }));
    wg.add(mesh(new T.BoxGeometry(R * 2, 0.04, 0.20), warmOak, { pos: [0, FLOOR_Y + H - 0.20, z + 0.05] }));
    // Corner column
    wg.add(mesh(new T.BoxGeometry(0.26, H, 0.26), darkWalnut, { pos: [-R + 0.13, FLOOR_Y + H / 2, -R + 0.13] }));
    root.add(wg);
  }

  // 4. Vaulted dark-timber ceiling + exposed beams + central sculpted brass ring chandelier
  root.add(mesh(new T.PlaneGeometry(R * 2.1, R * 2.1), darkWalnut, {
    pos: [0, FLOOR_Y + H, 0],
    rot: [Math.PI / 2, 0, 0],
  }));
  for (let x = -4.2; x <= 4.2; x += 2.1) {
    root.add(mesh(new T.BoxGeometry(0.18, 0.24, R * 2), darkWalnut, { pos: [x, FLOOR_Y + H - 0.12, 0] }));
  }
  // Sculpted brass wheel chandelier high overhead (y = 4.95)
  const chandelier = new T.Group();
  chandelier.position.set(0, 4.95, 0);
  chandelier.add(mesh(new T.CylinderGeometry(0.025, 0.025, 0.75, 10), brass, { pos: [0, 0.37, 0] }));
  chandelier.add(mesh(new T.TorusGeometry(0.92, 0.024, 10, 48), brass, { rot: [Math.PI / 2, 0, 0] }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cx = Math.cos(a) * 0.92;
    const cz = Math.sin(a) * 0.92;
    chandelier.add(mesh(new T.CylinderGeometry(0.008, 0.008, 0.92, 6), brass, {
      pos: [cx * 0.5, 0.18, cz * 0.5],
      rot: [0, -a, Math.PI / 2 - 0.36],
    }));
    chandelier.add(mesh(new T.CylinderGeometry(0.022, 0.024, 0.14, 10), waxMat, { pos: [cx, 0.08, cz] }));
    chandelier.add(mesh(new T.SphereGeometry(0.022, 8, 6), flameMat, { pos: [cx, 0.17, cz] }));
    addGlow(chandelier, cx, 0.18, cz, 0xffd78c, 0.36, 0.45);
  }
  root.add(chandelier);

  // 5. HERO BACK-LEFT: Panoramic Recessed Snow Window + Real 3D Winter Night Diorama Behind Glass
  const winCenterX = -2.65;
  const winW = 2.82;
  const winH = 3.04;
  const winY = 2.80;
  const winGroup = new T.Group();
  winGroup.position.set(winCenterX, winY, wallZ);

  // Outer walnut casing & deep windowsill
  winGroup.add(mesh(new T.BoxGeometry(winW + 0.24, 0.15, 0.34), darkWalnut, { pos: [0, -winH / 2 - 0.04, 0.08] }));
  winGroup.add(mesh(new T.BoxGeometry(winW + 0.36, 0.07, 0.42), warmOak, { pos: [0, -winH / 2 - 0.10, 0.14] }));
  winGroup.add(mesh(new T.BoxGeometry(winW + 0.24, 0.16, 0.28), darkWalnut, { pos: [0, winH / 2 + 0.04, 0.06] }));
  for (const sx of [-1, 1]) {
    winGroup.add(mesh(new T.BoxGeometry(0.14, winH + 0.18, 0.28), darkWalnut, { pos: [sx * (winW / 2 + 0.05), 0, 0.06] }));
  }
  // Delicate mullions (3x3 Georgian grid)
  for (const mx of [-winW / 6, winW / 6]) {
    winGroup.add(mesh(new T.BoxGeometry(0.045, winH, 0.08), darkWalnut, { pos: [mx, 0, 0.02] }));
  }
  for (const my of [-winH / 6, winH / 6]) {
    winGroup.add(mesh(new T.BoxGeometry(winW, 0.045, 0.08), darkWalnut, { pos: [0, my, 0.02] }));
  }
  // Subtle frost drifts along each horizontal mullion
  const snowMat = new T.MeshStandardMaterial({ color: 0xe6effa, roughness: 0.72, metalness: 0.05, emissive: 0x3b597d, emissiveIntensity: 0.18 });
  for (const my of [-winH / 2 + 0.04, -winH / 6 + 0.03, winH / 6 + 0.03]) {
    winGroup.add(mesh(new T.BoxGeometry(winW - 0.08, 0.05, 0.06), snowMat, { pos: [0, my, -0.02] }));
  }

  // Deep 3D winter night diorama alcove behind the glass (z from -0.1 to -2.2)
  const nightSkyMat = new T.ShaderMaterial({
    side: T.FrontSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec3 top = vec3(0.04, 0.09, 0.20);
        vec3 mid = vec3(0.09, 0.19, 0.34);
        vec3 bot = vec3(0.20, 0.32, 0.48);
        vec3 c = mix(bot, mid, smoothstep(0.0, 0.45, vUv.y));
        c = mix(c, top, smoothstep(0.45, 1.0, vUv.y));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  winGroup.add(mesh(new T.PlaneGeometry(5.6, 5.2), nightSkyMat, { pos: [0, 0.2, -2.3], receive: false }));
  // Luminous winter moon outside
  winGroup.add(mesh(new T.CircleGeometry(0.24, 24), new T.MeshBasicMaterial({ color: 0xf7f2de }), { pos: [-0.72, 0.92, -2.22] }));
  addGlow(winGroup, -0.72, 0.92, -2.18, 0x9ec8ff, 1.8, 0.42);
  // Snow hills + silhouetted pines + glowing distant alpine cottages (strictly behind z < -0.5 so zero indoor poke-through!)
  winGroup.add(mesh(new T.SphereGeometry(2.1, 24, 16), snowMat, { pos: [0, -2.55, -2.25], scale: [1.8, 0.62, 0.32] }));
  const pineSilMat = new T.MeshStandardMaterial({ color: 0x102533, roughness: 0.9, emissive: 0x0a1c29, emissiveIntensity: 0.45 });
  const pineSpecs = [[-1.35, -0.65, -1.35, 1.1], [-0.95, -0.78, -1.55, 0.9], [0.95, -0.62, -1.45, 1.25], [1.4, -0.72, -1.25, 0.95], [0.25, -0.82, -1.7, 0.8]];
  for (const [px, py, pz, sc] of pineSpecs) {
    winGroup.add(mesh(new T.ConeGeometry(0.32 * sc, 0.95 * sc, 7), pineSilMat, { pos: [px, py, pz] }));
    winGroup.add(mesh(new T.ConeGeometry(0.24 * sc, 0.65 * sc, 7), pineSilMat, { pos: [px, py + 0.35 * sc, pz] }));
    winGroup.add(mesh(new T.ConeGeometry(0.16 * sc, 0.35 * sc, 7), snowMat, { pos: [px, py + 0.56 * sc, pz] }));
  }
  // Tiny distant warm cottage lights
  const houseGlow = new T.MeshBasicMaterial({ color: 0xffca6b });
  winGroup.add(mesh(new T.BoxGeometry(0.28, 0.22, 0.2), pineSilMat, { pos: [-0.22, -0.92, -1.55] }));
  winGroup.add(mesh(new T.ConeGeometry(0.24, 0.18, 4), snowMat, { pos: [-0.22, -0.73, -1.55], rot: [0, Math.PI / 4, 0] }));
  winGroup.add(mesh(new T.PlaneGeometry(0.06, 0.07), houseGlow, { pos: [-0.26, -0.90, -1.44] }));
  winGroup.add(mesh(new T.PlaneGeometry(0.06, 0.07), houseGlow, { pos: [-0.17, -0.90, -1.44] }));
  addGlow(winGroup, -0.22, -0.90, -1.42, 0xffbe5c, 0.42, 0.55);

  // Subtle reflective frosted window glass
  const glassMat = new T.MeshPhysicalMaterial({
    color: 0x9cc0e6,
    transparent: true,
    opacity: 0.14,
    roughness: 0.12,
    metalness: 0.1,
    envMapIntensity: 1.4,
    depthWrite: false,
  });
  winGroup.add(mesh(new T.PlaneGeometry(winW - 0.06, winH - 0.06), glassMat, { pos: [0, 0, 0.01], receive: false }));

  // Sculpted burgundy velvet curtains flanking the window + brass curtain rod
  winGroup.add(mesh(new T.CylinderGeometry(0.022, 0.022, winW + 0.95, 12), brass, {
    pos: [0, winH / 2 + 0.22, 0.22],
    rot: [0, 0, Math.PI / 2],
  }));
  for (const sx of [-1, 1]) {
    winGroup.add(mesh(new T.SphereGeometry(0.055, 12, 10), brass, { pos: [sx * (winW / 2 + 0.50), winH / 2 + 0.22, 0.22] }));
    for (let p = 0; p < 3; p++) {
      winGroup.add(mesh(new T.CylinderGeometry(0.11, 0.14, winH + 0.95, 12), velvet, {
        pos: [sx * (winW / 2 + 0.14 + p * 0.12), -0.18, 0.20 + (p % 2) * 0.03],
        scale: [0.85, 1, 0.55],
      }));
    }
    // Brass tieback ring
    winGroup.add(mesh(new T.TorusGeometry(0.16, 0.018, 8, 20), brass, {
      pos: [sx * (winW / 2 + 0.26), -0.58, 0.21],
      rot: [Math.PI / 2, sx * 0.2, 0],
    }));
  }
  root.add(winGroup);

  // Falling snow strictly outside the window!
  const windowSnow = createParticleField({
    count: 110,
    bounds: [winCenterX - 1.5, winCenterX + 1.5, 1.3, 4.4, wallZ - 1.7, wallZ - 0.25],
    color: 0xdcecff,
    size: 13,
    speedY: -0.42,
    sway: 0.14,
    opacity: 0.85,
    seed: 2026,
  });
  root.add(windowSnow.object);
  animators.push(t => windowSnow.update(t));

  // 6. HERO BACK-RIGHT: Sculpted Stone & Timber Fireplace Hearth
  const fpGroup = new T.Group();
  fpGroup.position.set(2.55, FLOOR_Y, wallZ + 0.36);

  const stoneMat = new T.MeshStandardMaterial({
    map: stone.map,
    bumpMap: stone.bumpMap,
    bumpScale: 0.025,
    roughness: 0.88,
    metalness: 0.03,
  });
  // Hearth slab & stone chimney breast
  fpGroup.add(mesh(new T.BoxGeometry(2.45, 0.16, 1.05), stoneMat, { pos: [0, 0.08, 0.22] }));
  fpGroup.add(mesh(new T.BoxGeometry(2.18, 1.72, 0.72), stoneMat, { pos: [0, 0.94, 0] }));
  // Tapered upper chimney breast rising to ceiling
  fpGroup.add(mesh(new T.BoxGeometry(1.76, 3.62, 0.56), stoneMat, { pos: [0, 3.60, -0.06] }));
  // Carved walnut mantel beam & corbels
  fpGroup.add(mesh(new T.BoxGeometry(2.48, 0.16, 0.92), darkWalnut, { pos: [0, 1.84, 0.10] }));
  fpGroup.add(mesh(new T.BoxGeometry(2.56, 0.055, 0.98), warmOak, { pos: [0, 1.93, 0.11] }));
  for (const sx of [-0.95, 0.95]) {
    fpGroup.add(mesh(new T.BoxGeometry(0.18, 0.28, 0.24), darkWalnut, { pos: [sx, 1.64, 0.36] }));
  }

  // Dark recessed firebox opening + glowing embers + charred logs + animated 3D flames
  const fireboxMat = new T.MeshStandardMaterial({ color: 0x160d0a, roughness: 0.95 });
  fpGroup.add(mesh(new T.BoxGeometry(1.18, 1.08, 0.26), fireboxMat, { pos: [0, 0.70, 0.28] }));
  const emberMat = new T.MeshBasicMaterial({ color: 0xff5a1f });
  const emberBed = mesh(new T.BoxGeometry(0.92, 0.10, 0.28), emberMat, { pos: [0, 0.22, 0.34], receive: false });
  fpGroup.add(emberBed);

  // Stacked hearth logs
  const logGeo = new T.CylinderGeometry(0.065, 0.072, 0.72, 10);
  const logMat = new T.MeshStandardMaterial({ color: 0x2b1810, roughness: 0.92, emissive: 0x6e1f08, emissiveIntensity: 0.45 });
  fpGroup.add(mesh(logGeo, logMat, { pos: [-0.08, 0.30, 0.36], rot: [0.15, 0.25, Math.PI / 2 - 0.12] }));
  fpGroup.add(mesh(logGeo, logMat, { pos: [0.10, 0.32, 0.34], rot: [-0.12, -0.30, Math.PI / 2 + 0.15] }));
  fpGroup.add(mesh(logGeo, logMat, { pos: [0.0, 0.39, 0.35], rot: [0.05, 0.08, Math.PI / 2] }));

  // Layered animated stylized 3D fire tongues
  const flames = [];
  const flameConfigs = [
    { x: 0.0, y: 0.56, z: 0.37, r: 0.16, h: 0.46, color: 0xff6a1a, phase: 0 },
    { x: -0.17, y: 0.50, z: 0.38, r: 0.11, h: 0.34, color: 0xff9229, phase: 1.7 },
    { x: 0.18, y: 0.49, z: 0.36, r: 0.12, h: 0.36, color: 0xff7e21, phase: 3.1 },
    { x: 0.02, y: 0.48, z: 0.40, r: 0.09, h: 0.28, color: 0xffe082, phase: 4.5 },
  ];
  for (const fc of flameConfigs) {
    const fMat = new T.MeshBasicMaterial({ color: fc.color, transparent: true, opacity: 0.92 });
    const fm = mesh(new T.ConeGeometry(fc.r, fc.h, 8), fMat, { pos: [fc.x, fc.y, fc.z], receive: false });
    fpGroup.add(fm);
    flames.push({ mesh: fm, baseY: fc.y, phase: fc.phase });
  }
  const fireGlow = addGlow(fpGroup, 0, 0.58, 0.48, 0xff8c38, 1.55, 0.52);

  // Wrought iron fender grate
  const ironMat = new T.MeshStandardMaterial({ color: 0x1d1c1d, roughness: 0.55, metalness: 0.78 });
  fpGroup.add(mesh(new T.BoxGeometry(1.16, 0.03, 0.03), ironMat, { pos: [0, 0.36, 0.50] }));
  for (let gx = -0.52; gx <= 0.52; gx += 0.13) {
    fpGroup.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.26, 6), ironMat, { pos: [gx, 0.24, 0.50] }));
  }

  // Mantelpiece styling: evergreen garland + brass pillar candles + framed winter art + hanging stockings
  for (let i = -8; i <= 8; i++) {
    const x = i * 0.13;
    fpGroup.add(mesh(new T.SphereGeometry(0.095, 8, 6), evergreen, {
      pos: [x, 1.98 + Math.sin(i * 0.7) * 0.02, 0.48],
      scale: [1.3, 0.75, 0.9],
    }));
    if (i % 3 === 0) {
      fpGroup.add(mesh(new T.SphereGeometry(0.028, 8, 6), berry, { pos: [x + 0.03, 2.02, 0.55] }));
    }
  }
  const mantelCandles = [
    createCandle(0.32, 0.038, brass, waxMat, flameMat),
    createCandle(0.22, 0.034, brass, waxMat, flameMat),
    createCandle(0.28, 0.036, brass, waxMat, flameMat),
  ];
  mantelCandles[0].group.position.set(-0.78, 1.96, 0.24);
  mantelCandles[1].group.position.set(-0.62, 1.96, 0.34);
  mantelCandles[2].group.position.set(0.76, 1.96, 0.28);
  mantelCandles.forEach(c => fpGroup.add(c.group));

  // Framed miniature winter art on chimney breast
  fpGroup.add(mesh(new T.BoxGeometry(1.18, 0.92, 0.06), brass, { pos: [0, 2.86, 0.24] }));
  fpGroup.add(mesh(new T.PlaneGeometry(1.04, 0.78), new T.MeshStandardMaterial({ map: framedArtTexture(), roughness: 0.65 }), {
    pos: [0, 2.86, 0.275],
  }));

  // Hanging velvet Christmas stockings
  for (const [sx, scale] of [[-0.86, 1.0], [-0.56, 0.86]]) {
    const st = new T.Group();
    st.position.set(sx, 1.62, 0.52);
    st.scale.setScalar(scale);
    st.add(mesh(new T.CylinderGeometry(0.095, 0.088, 0.11, 12), creamFabric, { pos: [0, 0.14, 0] }));
    st.add(mesh(new T.CylinderGeometry(0.08, 0.075, 0.34, 12), velvet, { pos: [0, -0.07, 0] }));
    st.add(mesh(new T.CapsuleGeometry(0.072, 0.12, 6, 10), velvet, { pos: [0.06, -0.24, 0], rot: [0, 0, Math.PI / 2 - 0.15] }));
    fpGroup.add(st);
  }

  // Real flickering hearth point light
  const hearthLight = new T.PointLight(0xff8232, 3.8, 8.5, 1.6);
  hearthLight.position.set(2.55, 0.95, wallZ + 1.05);
  root.add(hearthLight);
  root.add(fpGroup);

  animators.push(t => {
    const flicker = 0.88 + 0.09 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.7 + 1.2) + 0.03 * Math.cos(t * 19.1);
    hearthLight.intensity = 3.7 * flicker;
    fireGlow.material.opacity = 0.45 * flicker;
    fireGlow.scale.setScalar(1.48 + 0.12 * flicker);
    for (const f of flames) {
      const s = 0.86 + 0.20 * Math.sin(t * 9.5 + f.phase) + 0.08 * Math.cos(t * 16.0 + f.phase);
      f.mesh.scale.set(0.92 + 0.08 * Math.cos(t * 8 + f.phase), s, 0.92);
      f.mesh.position.y = f.baseY + (s - 1) * 0.14;
    }
    for (let i = 0; i < mantelCandles.length; i++) {
      const c = mantelCandles[i];
      const cf = 0.92 + 0.08 * Math.sin(t * 8.2 + i * 2.1);
      c.flame.scale.set(1, cf, 1);
      c.halo.material.opacity = 0.62 * cf;
    }
  });

  // 7. LEFT WALL (-X): Tufted velvet reading bench + warm arched brass floor lamp
  const leftGroup = new T.Group();
  leftGroup.position.set(-R + 0.65, FLOOR_Y, 0.2);
  leftGroup.rotation.y = Math.PI / 2;
  // Bench base & cushion
  leftGroup.add(mesh(new T.BoxGeometry(2.55, 0.12, 0.82), warmOak, { pos: [0, 0.48, 0] }));
  for (const lx of [-1.05, 1.05]) {
    leftGroup.add(mesh(new T.BoxGeometry(0.14, 0.48, 0.72), darkWalnut, { pos: [lx, 0.24, 0] }));
  }
  leftGroup.add(mesh(new T.BoxGeometry(2.42, 0.16, 0.74), velvet, { pos: [0, 0.61, 0] }));
  // Throw pillows
  leftGroup.add(mesh(new T.BoxGeometry(0.42, 0.40, 0.18), creamFabric, { pos: [-0.88, 0.84, -0.16], rot: [-0.22, 0.28, 0.08] }));
  leftGroup.add(mesh(new T.BoxGeometry(0.36, 0.34, 0.16), evergreen, { pos: [0.92, 0.81, -0.18], rot: [-0.2, -0.24, -0.05] }));
  // Brass floor lamp beside bench
  const lampGroup = new T.Group();
  lampGroup.position.set(-1.68, 0, -0.08);
  lampGroup.add(mesh(new T.CylinderGeometry(0.22, 0.25, 0.04, 24), brass, { pos: [0, 0.02, 0] }));
  lampGroup.add(mesh(new T.CylinderGeometry(0.022, 0.026, 2.05, 12), brass, { pos: [0, 1.04, 0] }));
  const shadeMat = new T.MeshStandardMaterial({
    color: 0xf7e7c8,
    emissive: 0xffbf6b,
    emissiveIntensity: 0.95,
    roughness: 0.72,
    side: T.DoubleSide,
  });
  lampGroup.add(mesh(new T.CylinderGeometry(0.20, 0.34, 0.36, 24, 1, true), shadeMat, { pos: [0, 2.02, 0] }));
  addGlow(lampGroup, 0, 1.98, 0, 0xffcd7a, 1.05, 0.48);
  leftGroup.add(lampGroup);
  // Wall sconces flanking the left wall
  const sL1 = createWallSconce(brass, sconceGlass);
  sL1.position.set(-2.6, 2.65, -0.52);
  const sL2 = createWallSconce(brass, sconceGlass);
  sL2.position.set(2.6, 2.65, -0.52);
  leftGroup.add(sL1, sL2);
  root.add(leftGroup);

  // 8. RIGHT WALL (+X): Built-in arched walnut bookcase alcove with curated books & ceramics
  const rightGroup = new T.Group();
  rightGroup.position.set(R - 0.42, FLOOR_Y, 0);
  rightGroup.rotation.y = -Math.PI / 2;
  rightGroup.add(mesh(new T.BoxGeometry(3.2, 3.65, 0.14), darkWalnut, { pos: [0, 1.825, -0.26] }));
  for (const sx of [-1.55, 0, 1.55]) {
    rightGroup.add(mesh(new T.BoxGeometry(0.12, 3.65, 0.56), darkWalnut, { pos: [sx, 1.825, 0] }));
  }
  rightGroup.add(mesh(new T.BoxGeometry(3.36, 0.14, 0.64), warmOak, { pos: [0, 3.66, 0.02] }));
  // Lower cabinet doors + brass knobs
  rightGroup.add(mesh(new T.BoxGeometry(3.04, 0.95, 0.48), warmOak, { pos: [0, 0.475, 0.02] }));
  for (const kx of [-0.22, 0.22]) {
    rightGroup.add(mesh(new T.SphereGeometry(0.04, 10, 8), brass, { pos: [kx, 0.62, 0.29] }));
  }
  // 3 shelves + stylized curated books & stoneware ceramics
  const bookColors = [0x7a2127, 0x20473a, 0xb8863d, 0x2c4260, 0x5c2e28, 0xd4c3a3];
  const shelfYs = [1.02, 1.84, 2.68];
  const rand = seeded(8842);
  for (const sy of shelfYs) {
    rightGroup.add(mesh(new T.BoxGeometry(3.16, 0.08, 0.52), warmOak, { pos: [0, sy, 0.02] }));
    // Left bay: neatly stacked colorful hardcover books
    let bx = -1.36;
    while (bx < -0.22) {
      const bw = 0.065 + rand() * 0.045;
      const bh = 0.34 + rand() * 0.18;
      const bMat = new T.MeshStandardMaterial({ color: bookColors[Math.floor(rand() * bookColors.length)], roughness: 0.72 });
      rightGroup.add(mesh(new T.BoxGeometry(bw, bh, 0.28), bMat, { pos: [bx + bw / 2, sy + 0.04 + bh / 2, 0.04] }));
      bx += bw + 0.012;
    }
    // Right bay: ceramic vessels & brass accents
    const ceramicMat = new T.MeshStandardMaterial({ color: 0xe6dac5, roughness: 0.38, metalness: 0.05 });
    rightGroup.add(mesh(new T.CylinderGeometry(0.11, 0.15, 0.36, 16), ceramicMat, { pos: [0.46, sy + 0.22, 0.04] }));
    rightGroup.add(mesh(new T.SphereGeometry(0.14, 14, 12), brass, { pos: [0.98, sy + 0.18, 0.06], scale: [1, 1.25, 1] }));
  }
  root.add(rightGroup);

  // 9. FRONT WALL (+Z, behind camera): Panelled entry door + hanging 3D wreath + flanking sconces
  const frontGroup = new T.Group();
  frontGroup.position.set(0, FLOOR_Y, R - 0.18);
  frontGroup.rotation.y = Math.PI;
  frontGroup.add(mesh(new T.BoxGeometry(2.08, 3.38, 0.16), darkWalnut, { pos: [0, 1.69, 0] }));
  frontGroup.add(mesh(new T.BoxGeometry(2.26, 0.14, 0.22), warmOak, { pos: [0, 3.42, 0.02] }));
  for (const dx of [-0.46, 0.46]) {
    for (const dy of [0.88, 2.38]) {
      frontGroup.add(mesh(new T.BoxGeometry(0.72, 1.15, 0.06), warmOak, { pos: [dx, dy, 0.08] }));
    }
  }
  frontGroup.add(mesh(new T.SphereGeometry(0.055, 12, 10), brass, { pos: [0.80, 1.56, 0.14] }));
  const doorWreath = createWreath(0.42, evergreen, berry, velvet);
  doorWreath.position.set(0, 2.36, 0.14);
  frontGroup.add(doorWreath);
  for (const sx of [-1.75, 1.75]) {
    const sc = createWallSconce(brass, sconceGlass);
    sc.position.set(sx, 2.65, 0.06);
    frontGroup.add(sc);
  }
  root.add(frontGroup);

  // Warm sconce & reading-lamp wall wash so side/back walls glow softly when orbiting 360°
  const leftLampLight = new T.PointLight(0xffc070, 2.2, 6.8, 1.5);
  leftLampLight.position.set(-R + 1.15, 2.35, -1.2);
  const backWallWash = new T.PointLight(0xffc378, 1.8, 6.8, 1.55);
  backWallWash.position.set(0, 2.85, R - 1.25);
  root.add(leftLampLight, backWallWash);

  // 10. Subtle floating golden dust motes in the warm room air
  const motes = createParticleField({
    count: 55,
    bounds: [-3.2, 3.2, 0.5, 4.2, -3.2, 3.2],
    color: 0xffe2a8,
    size: 8.5,
    speedY: 0.06,
    sway: 0.24,
    opacity: 0.42,
    seed: 505,
  });
  root.add(motes.object);
  animators.push(t => motes.update(t));

  return {
    group: root,
    background: new T.Color(0x131d1b),
    fog: new T.FogExp2(0x14201d, 0.026),
    lighting: {
      hemiSky: 0xffeed6,
      hemiGround: 0x3b261b,
      hemiIntensity: 0.72,
      keyColor: 0xffe3bd,
      keyIntensity: 1.75,
      keyPos: [-2.6, 5.2, 3.8],
      rimColor: 0x89bfff,
      rimIntensity: 1.05,
      rimPos: [-3.2, 3.1, -3.8],
      fillColor: 0xffa65c,
      fillIntensity: 0.55,
      fillPos: [3.2, 2.4, -2.5],
      exposure: 1.08,
    },
    update(t) {
      for (const fn of animators) fn(t);
    },
  };
}

/**
 * ============================================================================
 * WORLD 2: VILLAGE MARKET — "Starlit European Winter Piazza"
 * ============================================================================
 */
function buildMarketWorld() {
  const root = new T.Group();
  const animators = [];

  const cobble = cobblestoneTextures();
  const awningTex = awningTexture('#7c222b', '#f2e6cf');
  const brass = createBrassMaterial(0xd5a85d, 0.26);
  const darkTimber = new T.MeshStandardMaterial({ color: 0x3a2417, roughness: 0.74 });
  const warmTimber = new T.MeshStandardMaterial({ color: 0x6b452a, roughness: 0.68 });
  const stucco = new T.MeshStandardMaterial({ color: 0xe6dac5, roughness: 0.86 });
  const snowMat = new T.MeshStandardMaterial({
    color: 0xe7effa,
    roughness: 0.62,
    metalness: 0.06,
    envMapIntensity: 1.05,
  });
  const ironMat = new T.MeshStandardMaterial({ color: 0x1b2129, roughness: 0.42, metalness: 0.82 });
  const evergreen = new T.MeshStandardMaterial({ color: 0x19382d, roughness: 0.82 });
  const berry = new T.MeshStandardMaterial({ color: 0xab242a, roughness: 0.35 });
  const warmWindowMat = new T.MeshStandardMaterial({
    color: 0xffe4ad,
    emissive: 0xffaa44,
    emissiveIntensity: 1.9,
    roughness: 0.22,
  });

  // 1. Open-air starlit twilight sky dome (custom GLSL gradient + subtle aurora)
  const skyMat = new T.ShaderMaterial({
    side: T.BackSide,
    depthWrite: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uTime;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 zenith = vec3(0.03, 0.06, 0.16);
        vec3 mid = vec3(0.07, 0.14, 0.29);
        vec3 horizon = vec3(0.16, 0.24, 0.40);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.32, h));
        col = mix(col, zenith, smoothstep(0.32, 0.88, h));
        // Subtle dreamy northern twilight ribbon
        float ribbon = sin(vDir.x * 3.2 + uTime * 0.12) * cos(vDir.z * 2.5 - uTime * 0.08);
        float band = smoothstep(0.18, 0.48, h) * (1.0 - smoothstep(0.48, 0.78, h));
        col += vec3(0.06, 0.16, 0.22) * max(0.0, ribbon) * band * 0.55;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  root.add(mesh(new T.SphereGeometry(28, 32, 20), skyMat, { pos: [0, 0, 0], receive: false }));
  animators.push(t => { skyMat.uniforms.uTime.value = t; });

  // Twinkling winter starfield in upper sky dome
  const starCount = 260;
  const starPos = new Float32Array(starCount * 3);
  const starPhase = new Float32Array(starCount);
  const starScale = new Float32Array(starCount);
  const rand = seeded(1225);
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = 0.18 + rand() * 1.15;
    const rad = 24;
    starPos[i * 3] = rad * Math.cos(phi) * Math.sin(theta);
    starPos[i * 3 + 1] = rad * Math.sin(phi) + 1.5;
    starPos[i * 3 + 2] = rad * Math.cos(phi) * Math.cos(theta);
    starPhase[i] = rand() * Math.PI * 2;
    starScale[i] = 0.6 + rand() * 1.1;
  }
  const starGeo = new T.BufferGeometry();
  starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aPhase', new T.BufferAttribute(starPhase, 1));
  starGeo.setAttribute('aScale', new T.BufferAttribute(starScale, 1));
  const starMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aPhase;
      attribute float aScale;
      uniform float uTime;
      varying float vA;
      void main() {
        vA = 0.45 + 0.55 * sin(uTime * 1.8 + aPhase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(aScale * 3.8, 1.5, 5.5);
      }
    `,
    fragmentShader: `
      varying float vA;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float s = pow(1.0 - r * 2.0, 2.0);
        gl_FragColor = vec4(0.88, 0.94, 1.0, s * vA);
      }
    `,
  });
  root.add(new T.Points(starGeo, starMat));
  animators.push(t => { starMat.uniforms.uTime.value = t; });

  // Luminous winter moon in upper-left sky
  root.add(mesh(new T.SphereGeometry(0.75, 20, 16), new T.MeshBasicMaterial({ color: 0xf7f1dc }), {
    pos: [-8.5, 11.2, -16.5],
    receive: false,
  }));
  addGlow(root, -8.5, 11.2, -16.0, 0xa8d0ff, 5.8, 0.36);

  // 2. Circular European cobblestone piazza ground
  const cobbleMat = new T.MeshStandardMaterial({
    map: cobble.map,
    roughnessMap: cobble.roughnessMap,
    bumpMap: cobble.bumpMap,
    bumpScale: 0.02,
    roughness: 0.76,
    metalness: 0.08,
    envMapIntensity: 0.95,
  });
  root.add(mesh(new T.CircleGeometry(16, 64), cobbleMat, {
    pos: [0, FLOOR_Y, 0],
    rot: [-Math.PI / 2, 0, 0],
    receive: true,
  }));

  // 3. Center Stage: Dressed-Limestone Medallion & Brass Plaza Plinth (top flush at STAGE_Y = 0.216!)
  const stonePlinthMat = new T.MeshStandardMaterial({ color: 0x8d99ab, roughness: 0.72, metalness: 0.06 });
  root.add(mesh(new T.CylinderGeometry(1.86, 1.98, 0.022, 8), stonePlinthMat, {
    pos: [0, FLOOR_Y + 0.009, 0],
    rot: [0, Math.PI / 8, 0],
    receive: true,
  }));
  const medallionMat = new T.MeshStandardMaterial({
    map: plazaPlinthTexture(),
    roughness: 0.68,
    metalness: 0.08,
    envMapIntensity: 0.95,
  });
  root.add(mesh(new T.CylinderGeometry(1.76, 1.79, 0.024, 48), medallionMat, {
    pos: [0, FLOOR_Y + 0.008, 0],
    receive: true,
  }));
  // Brass inlay ring around plinth perimeter
  root.add(mesh(new T.TorusGeometry(1.78, 0.014, 8, 48), brass, {
    pos: [0, STAGE_Y, 0],
    rot: [Math.PI / 2, 0, 0],
  }));
  root.add(createContactShadow(1.38));

  // 4 subtle brass perimeter bollard uplights around the plinth (at r = 2.02, out of floor-item collision!)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const bx = Math.cos(a) * 2.05;
    const bz = Math.sin(a) * 2.05;
    const bol = new T.Group();
    bol.position.set(bx, FLOOR_Y, bz);
    bol.add(mesh(new T.CylinderGeometry(0.055, 0.072, 0.34, 12), ironMat, { pos: [0, 0.17, 0] }));
    bol.add(mesh(new T.CylinderGeometry(0.048, 0.048, 0.09, 12), warmWindowMat, { pos: [0, 0.36, 0], receive: false }));
    bol.add(mesh(new T.ConeGeometry(0.075, 0.07, 12), brass, { pos: [0, 0.44, 0] }));
    addGlow(bol, 0, 0.36, 0, 0xffc66e, 0.45, 0.58);
    root.add(bol);
  }

  // 4. Sculpted Half-Timbered Alpine Market Chalets (3 stalls placed around the piazza at r ~ 6.1)
  function buildChalet(angle, awningColor = '#7c222b') {
    const g = new T.Group();
    const dist = 6.35;
    g.position.set(Math.sin(angle) * dist, FLOOR_Y, Math.cos(angle) * dist);
    g.rotation.y = angle + Math.PI; // face piazza center

    // Main timber chalet body
    g.add(mesh(new T.BoxGeometry(3.4, 2.75, 2.0), darkTimber, { pos: [0, 1.375, 0] }));
    // Stucco upper half-timbered panel
    g.add(mesh(new T.BoxGeometry(3.26, 1.15, 2.04), stucco, { pos: [0, 2.05, 0] }));
    // Front timber framing posts & counter
    for (const px of [-1.58, 1.58]) {
      g.add(mesh(new T.BoxGeometry(0.16, 2.78, 0.18), darkTimber, { pos: [px, 1.39, 0.98] }));
    }
    g.add(mesh(new T.BoxGeometry(3.52, 0.12, 0.62), warmTimber, { pos: [0, 1.08, 1.12] }));

    // Warm glowing interior shop alcove
    g.add(mesh(new T.PlaneGeometry(2.96, 1.35), warmWindowMat, { pos: [0, 1.76, 1.02], receive: false }));
    // Window mullions across shop front
    g.add(mesh(new T.BoxGeometry(0.08, 1.38, 0.08), darkTimber, { pos: [-0.75, 1.76, 1.04] }));
    g.add(mesh(new T.BoxGeometry(0.08, 1.38, 0.08), darkTimber, { pos: [0.75, 1.76, 1.04] }));

    // Striped pitched fabric awning overhanging the counter
    const awMat = new T.MeshStandardMaterial({
      map: awningColor === '#7c222b' ? awningTex : awningTexture(awningColor, '#f2e6cf'),
      roughness: 0.85,
      side: T.DoubleSide,
    });
    g.add(mesh(new T.PlaneGeometry(3.56, 1.05), awMat, { pos: [0, 2.38, 1.38], rot: [-Math.PI / 2 + 0.44, 0, 0] }));

    // Pitched snow-blanketed Alpine roof + gable
    const roofW = 2.42;
    const roofL = 3.95;
    const roofMat = snowMat;
    g.add(mesh(new T.BoxGeometry(roofL, 0.16, roofW), roofMat, { pos: [0, 3.38, 0.65], rot: [0.52, 0, 0] }));
    g.add(mesh(new T.BoxGeometry(roofL, 0.16, roofW), roofMat, { pos: [0, 3.38, -0.65], rot: [-0.52, 0, 0] }));
    // Dark wooden gable soffit beneath snow roof
    g.add(mesh(new T.BoxGeometry(roofL - 0.1, 0.12, roofW - 0.1), darkTimber, { pos: [0, 3.26, 0.65], rot: [0.52, 0, 0] }));
    g.add(mesh(new T.BoxGeometry(roofL - 0.1, 0.12, roofW - 0.1), darkTimber, { pos: [0, 3.26, -0.65], rot: [-0.52, 0, 0] }));

    // Countertop festive props: miniature gift boxes, mugs & glowing lantern
    const giftColors = [0x9e2a2b, 0x225542, 0xc99648];
    for (let i = 0; i < 3; i++) {
      g.add(mesh(new T.BoxGeometry(0.24, 0.22, 0.24), new T.MeshStandardMaterial({ color: giftColors[i], roughness: 0.6 }), {
        pos: [-1.05 + i * 0.34, 1.25, 1.18],
        rot: [0, i * 0.3, 0],
      }));
    }
    // Glowing brass lantern on counter
    g.add(mesh(new T.CylinderGeometry(0.08, 0.09, 0.24, 8), warmWindowMat, { pos: [1.02, 1.26, 1.18], receive: false }));
    g.add(mesh(new T.ConeGeometry(0.11, 0.09, 8), brass, { pos: [1.02, 1.42, 1.18] }));
    addGlow(g, 1.02, 1.28, 1.22, 0xffbe60, 0.95, 0.65);

    // Evergreen swag along fascia
    for (let i = -6; i <= 6; i++) {
      g.add(mesh(new T.SphereGeometry(0.11, 7, 6), evergreen, {
        pos: [i * 0.26, 2.66 - Math.abs(Math.sin(i * 0.4)) * 0.08, 1.08],
        scale: [1.3, 0.8, 0.8],
      }));
      if (i % 2 === 0) g.add(mesh(new T.SphereGeometry(0.03, 6, 6), berry, { pos: [i * 0.26, 2.65, 1.16] }));
    }

    root.add(g);
  }

  buildChalet(Math.PI + 0.54, '#7c222b'); // Back-left hero chalet
  buildChalet(Math.PI - 0.58, '#234a3c'); // Back-right hero chalet
  buildChalet(0.68, '#7c222b');           // Behind-right chalet (visible on 180° orbit)

  // 5. Four Victorian Wrought-Iron Streetlamps + Overhead Catenary Festoon String Lights
  const lampPositions = [];
  const festoonAngles = [-2.52, -1.30, -0.18, 1.38, 2.52];
  const lampR = 5.15;
  for (const a of festoonAngles) {
    const lx = Math.sin(a) * lampR;
    const lz = Math.cos(a) * lampR;
    lampPositions.push(new T.Vector3(lx, FLOOR_Y + 4.05, lz));

    const post = new T.Group();
    post.position.set(lx, FLOOR_Y, lz);
    post.add(mesh(new T.CylinderGeometry(0.11, 0.16, 0.55, 10), ironMat, { pos: [0, 0.275, 0] }));
    post.add(mesh(new T.CylinderGeometry(0.045, 0.075, 3.65, 10), ironMat, { pos: [0, 2.15, 0] }));
    post.add(mesh(new T.CylinderGeometry(0.18, 0.11, 0.34, 6), warmWindowMat, { pos: [0, 4.18, 0], receive: false }));
    post.add(mesh(new T.ConeGeometry(0.24, 0.18, 6), ironMat, { pos: [0, 4.44, 0] }));
    addGlow(post, 0, 4.18, 0, 0xffca70, 1.45, 0.72);
    root.add(post);
  }

  // Overhead catenary festoon cables + glowing warm market bulbs spanning around the square
  const festoonBulbPos = [];
  const wireMat = new T.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.7 });
  for (let i = 0; i < lampPositions.length; i++) {
    const pA = lampPositions[i];
    const pB = lampPositions[(i + 1) % lampPositions.length];
    const mid = pA.clone().add(pB).multiplyScalar(0.5);
    mid.y -= 0.72;
    const curve = new T.CatmullRomCurve3([pA, mid, pB]);
    root.add(mesh(new T.TubeGeometry(curve, 18, 0.012, 6, false), wireMat, { receive: false }));
    for (let k = 1; k <= 7; k++) {
      festoonBulbPos.push(curve.getPoint(k / 8));
    }
  }
  const festoonBulbs = new T.InstancedMesh(
    new T.SphereGeometry(0.048, 8, 6),
    new T.MeshBasicMaterial({ color: 0xffe09a }),
    festoonBulbPos.length
  );
  const m4 = new T.Matrix4();
  festoonBulbPos.forEach((p, idx) => {
    m4.makeTranslation(p.x, p.y, p.z);
    festoonBulbs.setMatrixAt(idx, m4);
    if (idx % 2 === 0) addGlow(root, p.x, p.y, p.z, 0xffc76e, 0.56, 0.42);
  });
  festoonBulbs.instanceMatrix.needsUpdate = true;
  root.add(festoonBulbs);

  // 6. Outer ring of sculpted 5-tier frosted Alpine spruces & distant gabled village houses
  const darkPine = new T.MeshStandardMaterial({ color: 0x142c26, roughness: 0.86 });
  const gableMat = new T.MeshStandardMaterial({ color: 0x1c2536, roughness: 0.88 });
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + 0.14;
    const r = 9.4 + (i % 3) * 1.45;
    const h = 3.2 + (i % 4) * 0.85;
    const px = Math.sin(a) * r;
    const pz = Math.cos(a) * r;
    const pine = new T.Group();
    pine.position.set(px, FLOOR_Y, pz);
    // Trunk
    pine.add(mesh(new T.CylinderGeometry(0.11, 0.16, h * 0.28, 7), darkTimber, { pos: [0, h * 0.14, 0] }));
    // 5 organic graduated bough tiers with delicate snow-dusted crown edges
    const tiers = 5;
    for (let t = 0; t < tiers; t++) {
      const f = t / (tiers - 1);
      const rad = (1.15 - f * 0.74) * (0.92 + (i % 2) * 0.14);
      const th = h * (0.34 - f * 0.04);
      const ty = h * (0.24 + f * 0.64);
      pine.add(mesh(new T.ConeGeometry(rad, th, 9), darkPine, {
        pos: [0, ty, 0],
        rot: [0, t * 0.55 + i, 0],
      }));
      // Subtle snow blanket capping each tier slightly higher rather than one giant white cone
      pine.add(mesh(new T.ConeGeometry(rad * 0.86, th * 0.36, 9), snowMat, {
        pos: [0, ty + th * 0.24, 0],
        rot: [0, t * 0.55 + i, 0],
      }));
    }
    root.add(pine);

    // Distant warm-lit Alpine village house silhouettes between outer pines
    if (i % 3 === 1) {
      const hr = r + 2.4;
      const ha = a + 0.16;
      const house = new T.Group();
      house.position.set(Math.sin(ha) * hr, FLOOR_Y, Math.cos(ha) * hr);
      house.rotation.y = ha + Math.PI;
      const hh = 2.6 + (i % 2) * 0.9;
      house.add(mesh(new T.BoxGeometry(2.1, hh, 1.6), gableMat, { pos: [0, hh / 2, 0] }));
      house.add(mesh(new T.ConeGeometry(1.72, 1.45, 4), snowMat, { pos: [0, hh + 0.65, 0], rot: [0, Math.PI / 4, 0] }));
      for (const wx of [-0.46, 0.46]) {
        house.add(mesh(new T.PlaneGeometry(0.32, 0.44), warmWindowMat, { pos: [wx, hh * 0.62, 0.82], receive: false }));
      }
      root.add(house);
    }
  }
  // Soft snowbank pillows around outer piazza edge
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const sr = 6.9 + (i % 2) * 0.8;
    root.add(mesh(new T.SphereGeometry(1.15, 14, 10), snowMat, {
      pos: [Math.sin(a) * sr, FLOOR_Y - 0.15, Math.cos(a) * sr],
      scale: [1.4, 0.36, 1.1],
    }));
  }

  // Warm lantern point lights around the square
  const marketWarmL = new T.PointLight(0xffb55a, 3.2, 11, 1.5);
  marketWarmL.position.set(-3.2, 3.6, -4.1);
  const marketWarmR = new T.PointLight(0xffa94c, 3.0, 11, 1.5);
  marketWarmR.position.set(3.2, 3.6, -4.1);
  root.add(marketWarmL, marketWarmR);

  // 7. Magical drifting 3D winter snowfall across the open piazza!
  const snowfall = createParticleField({
    count: 240,
    bounds: [-7.5, 7.5, 0.25, 6.2, -7.5, 7.5],
    color: 0xe6f1ff,
    size: 14,
    speedY: -0.45,
    sway: 0.32,
    opacity: 0.82,
    seed: 1224,
  });
  root.add(snowfall.object);
  animators.push(t => snowfall.update(t));

  return {
    group: root,
    background: new T.Color(0x0b152a),
    fog: new T.FogExp2(0x101d36, 0.032),
    lighting: {
      hemiSky: 0x9fc2f5,
      hemiGround: 0x2a2433,
      hemiIntensity: 0.78,
      keyColor: 0xffe4bc,
      keyIntensity: 1.55,
      keyPos: [-2.8, 5.4, 3.9],
      rimColor: 0x9ac6ff,
      rimIntensity: 1.35,
      rimPos: [2.4, 4.2, -4.5],
      fillColor: 0xffb35e,
      fillIntensity: 0.65,
      fillPos: [-3.4, 2.2, -2.2],
      exposure: 1.06,
    },
    update(t) {
      for (const fn of animators) fn(t);
    },
  };
}

/**
 * ============================================================================
 * WORLD 3: GINGERBREAD BAKERY — "Warm Terracotta Patisserie Atelier"
 * ============================================================================
 */
function buildBakeryWorld() {
  const root = new T.Group();
  const animators = [];

  const tiles = bakeryTileTextures();
  const wallPlaster = plasterTextures('bakery-terracotta', '#964431', '#6e2d20', 4, 2);
  const creamTrim = new T.MeshStandardMaterial({ color: 0xf1e3ca, roughness: 0.62 });
  const honeyOak = new T.MeshStandardMaterial({ color: 0x875532, roughness: 0.50, envMapIntensity: 0.95 });
  const cocoaWood = new T.MeshStandardMaterial({ color: 0x452618, roughness: 0.58 });
  const copper = createBrassMaterial(0xd98456, 0.24);
  const brass = createBrassMaterial(0xdcb062, 0.26);
  const marble = new T.MeshStandardMaterial({ color: 0xf4ede1, roughness: 0.22, metalness: 0.05, envMapIntensity: 1.2 });
  const evergreen = new T.MeshStandardMaterial({ color: 0x244e3a, roughness: 0.78 });
  const berry = new T.MeshPhysicalMaterial({ color: 0xb02328, roughness: 0.25, clearcoat: 0.8 });
  const velvet = new T.MeshStandardMaterial({ color: 0x85232b, roughness: 0.80 });
  const glassMat = new T.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.22,
    roughness: 0.08,
    clearcoat: 1.0,
    depthWrite: false,
  });
  const globeLightMat = new T.MeshStandardMaterial({
    color: 0xfff3d8,
    emissive: 0xffca7a,
    emissiveIntensity: 1.7,
    roughness: 0.2,
  });

  const R = 5.95;
  const H = 5.35;

  // 1. Satin checkerboard glazed ceramic floor
  const floorMat = new T.MeshStandardMaterial({
    map: tiles.map,
    roughnessMap: tiles.roughnessMap,
    bumpMap: tiles.bumpMap,
    bumpScale: 0.01,
    roughness: 0.52,
    metalness: 0.08,
    envMapIntensity: 1.15,
  });
  root.add(mesh(new T.PlaneGeometry(R * 2.1, R * 2.1), floorMat, {
    pos: [0, FLOOR_Y, 0],
    rot: [-Math.PI / 2, 0, Math.PI / 4], // Diagonal diamond checkerboard!
    receive: true,
  }));

  // 2. Scalloped cream & cinnamon braided wool rug under the tree
  const rugTex = rugTexture('bakery', {
    base: '#f3e5cc',
    ring1: '#9c4331',
    ring2: '#c98e4b',
    accent: '#59301e',
  });
  root.add(mesh(new T.CylinderGeometry(1.76, 1.80, 0.022, 64), new T.MeshStandardMaterial({ map: rugTex, roughness: 0.90 }), {
    pos: [0, FLOOR_Y + 0.009, 0],
    receive: true,
  }));
  root.add(mesh(new T.TorusGeometry(1.77, 0.012, 8, 64), copper, {
    pos: [0, FLOOR_Y + 0.015, 0],
    rot: [Math.PI / 2, 0, 0],
  }));
  root.add(createContactShadow(1.38));

  // 3. Terracotta plaster walls + cream wainscoting + arched ceiling beams
  const wallMat = new T.MeshStandardMaterial({
    map: wallPlaster.map,
    bumpMap: wallPlaster.bumpMap,
    bumpScale: 0.016,
    roughness: 0.84,
    envMapIntensity: 0.72,
  });
  const wallZ = -R;
  // Back wall with shopfront window opening on the left (x in [-4.0, -1.2], y in [1.22, 4.24])
  root.add(mesh(new T.BoxGeometry(R * 2, 1.03, 0.18), wallMat, { pos: [0, FLOOR_Y + 0.515, wallZ] }));
  root.add(mesh(new T.BoxGeometry(R * 2, 1.15, 0.18), wallMat, { pos: [0, 4.24 + 0.575, wallZ] }));
  root.add(mesh(new T.BoxGeometry(1.95, 3.02, 0.18), wallMat, { pos: [-4.975, 2.73, wallZ] }));
  root.add(mesh(new T.BoxGeometry(7.15, 3.02, 0.18), wallMat, { pos: [2.375, 2.73, wallZ] }));

  root.add(mesh(new T.BoxGeometry(R * 2, H, 0.18), wallMat, { pos: [0, FLOOR_Y + H / 2, R] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [-R, FLOOR_Y + H / 2, 0] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [R, FLOOR_Y + H / 2, 0] }));

  // Cream panelled wainscoting & crown trim around all 4 walls
  for (let side = 0; side < 4; side++) {
    const wg = new T.Group();
    wg.rotation.y = (side * Math.PI) / 2;
    const z = -R + 0.10;
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.94, 0.06), creamTrim, { pos: [0, FLOOR_Y + 0.47, z] }));
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.07, 0.10), honeyOak, { pos: [0, FLOOR_Y + 0.96, z + 0.02] }));
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.14, 0.09), cocoaWood, { pos: [0, FLOOR_Y + 0.07, z + 0.015] }));
    wg.add(mesh(new T.BoxGeometry(R * 2, 0.18, 0.16), creamTrim, { pos: [0, FLOOR_Y + H - 0.09, z + 0.04] }));
    wg.add(mesh(new T.BoxGeometry(0.24, H, 0.24), creamTrim, { pos: [-R + 0.12, FLOOR_Y + H / 2, -R + 0.12] }));
    root.add(wg);
  }

  // Coffered warm cream ceiling with honey-oak beams + suspended brass opal pendant globes
  root.add(mesh(new T.PlaneGeometry(R * 2.1, R * 2.1), creamTrim, {
    pos: [0, FLOOR_Y + H, 0],
    rot: [Math.PI / 2, 0, 0],
  }));
  for (let x = -3.8; x <= 3.8; x += 1.9) {
    root.add(mesh(new T.BoxGeometry(0.16, 0.20, R * 2), honeyOak, { pos: [x, FLOOR_Y + H - 0.10, 0] }));
  }
  for (const [px, pz] of [[-2.4, -2.2], [2.4, -2.2], [-2.4, 2.2], [2.4, 2.2]]) {
    root.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.9, 8), brass, { pos: [px, FLOOR_Y + H - 0.45, pz] }));
    root.add(mesh(new T.SphereGeometry(0.14, 16, 12), globeLightMat, { pos: [px, FLOOR_Y + H - 0.95, pz], receive: false }));
    addGlow(root, px, FLOOR_Y + H - 0.95, pz, 0xffd594, 0.85, 0.45);
  }

  // 4. HERO BACK-LEFT: Frosted Patisserie Shopfront Window with Glowing Paper Star Lanterns
  const swGroup = new T.Group();
  const swX = -2.6;
  const swW = 2.8;
  const swH = 3.02;
  swGroup.position.set(swX, 2.73, wallZ);
  // Cream shopfront framing
  swGroup.add(mesh(new T.BoxGeometry(swW + 0.24, 0.15, 0.30), creamTrim, { pos: [0, -swH / 2 - 0.04, 0.07] }));
  swGroup.add(mesh(new T.BoxGeometry(swW + 0.24, 0.16, 0.30), creamTrim, { pos: [0, swH / 2 + 0.04, 0.07] }));
  for (const sx of [-1, 1]) {
    swGroup.add(mesh(new T.BoxGeometry(0.14, swH + 0.2, 0.28), creamTrim, { pos: [sx * (swW / 2 + 0.05), 0, 0.06] }));
  }
  swGroup.add(mesh(new T.BoxGeometry(0.05, swH, 0.08), creamTrim, { pos: [0, 0, 0.02] }));
  swGroup.add(mesh(new T.BoxGeometry(swW, 0.05, 0.08), creamTrim, { pos: [0, 0.28, 0.02] }));

  // Winter dusk street backdrop behind the shopfront
  const duskMat = new T.ShaderMaterial({
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec3 top = vec3(0.07, 0.13, 0.26);
        vec3 bot = vec3(0.24, 0.31, 0.46);
        gl_FragColor = vec4(mix(bot, top, vUv.y), 1.0);
      }
    `,
  });
  swGroup.add(mesh(new T.PlaneGeometry(5.2, 4.8), duskMat, { pos: [0, 0.1, -2.0], receive: false }));
  // Glowing Moravian paper star lanterns suspended inside the shopfront!
  const starLanternMat = new T.MeshStandardMaterial({
    color: 0xfff2d6,
    emissive: 0xffc66e,
    emissiveIntensity: 1.55,
    roughness: 0.4,
  });
  const stars = [[-0.68, 0.72, 0.18, 0.22], [0.06, 0.96, 0.16, 0.18], [0.74, 0.60, 0.20, 0.20]];
  for (const [sx, sy, sz, sr] of stars) {
    swGroup.add(mesh(new T.CylinderGeometry(0.006, 0.006, 1.5 - sy, 6), brass, { pos: [sx, (1.5 + sy) / 2, sz] }));
    const lantern = new T.Group();
    lantern.position.set(sx, sy, sz);
    lantern.add(mesh(new T.OctahedronGeometry(sr, 0), starLanternMat, { receive: false }));
    lantern.add(mesh(new T.OctahedronGeometry(sr * 0.92, 0), starLanternMat, { rot: [Math.PI / 4, Math.PI / 4, 0], receive: false }));
    addGlow(lantern, 0, 0, 0, 0xffd284, sr * 4.5, 0.55);
    swGroup.add(lantern);
  }
  swGroup.add(mesh(new T.PlaneGeometry(swW - 0.06, swH - 0.06), glassMat, { pos: [0, 0, 0.01], receive: false }));
  root.add(swGroup);

  const bakerySnow = createParticleField({
    count: 85,
    bounds: [swX - 1.5, swX + 1.5, 1.25, 4.3, wallZ - 1.6, wallZ - 0.25],
    color: 0xe3f0ff,
    size: 12,
    speedY: -0.38,
    sway: 0.12,
    opacity: 0.78,
    seed: 991,
  });
  root.add(bakerySnow.object);
  animators.push(t => bakerySnow.update(t));

  // 5. HERO BACK-RIGHT: Sculpted Arched Brick Patisserie Oven + Copper Hood + Marble Prep Counter
  const ovenGroup = new T.Group();
  ovenGroup.position.set(2.45, FLOOR_Y, wallZ + 0.45);
  const brickMat = new T.MeshStandardMaterial({ color: 0x7a3425, roughness: 0.86 });
  // Marble counter base
  ovenGroup.add(mesh(new T.BoxGeometry(2.45, 0.98, 0.92), creamTrim, { pos: [0, 0.49, 0.06] }));
  ovenGroup.add(mesh(new T.BoxGeometry(2.54, 0.08, 0.98), marble, { pos: [0, 1.02, 0.08] }));
  // Brick oven dome housing
  ovenGroup.add(mesh(new T.BoxGeometry(2.12, 1.38, 0.82), brickMat, { pos: [0, 1.72, -0.02] }));
  // Glowing recessed arched oven mouth
  const ovenGlowMat = new T.MeshBasicMaterial({ color: 0xff8f34 });
  ovenGroup.add(mesh(new T.CylinderGeometry(0.46, 0.46, 0.16, 20, 1, false, 0, Math.PI), ovenGlowMat, {
    pos: [0, 1.46, 0.36],
    rot: [0, 0, Math.PI / 2],
    scale: [0.9, 1, 1],
    receive: false,
  }));
  ovenGroup.add(mesh(new T.PlaneGeometry(0.92, 0.44), ovenGlowMat, { pos: [0, 1.28, 0.41], receive: false }));
  const ovenHalo = addGlow(ovenGroup, 0, 1.44, 0.52, 0xff9438, 1.45, 0.55);

  // Sculpted brushed-copper range hood tapering to ceiling
  ovenGroup.add(mesh(new T.CylinderGeometry(0.42, 1.18, 1.18, 4), copper, {
    pos: [0, 2.98, 0.05],
    rot: [0, Math.PI / 4, 0],
  }));
  ovenGroup.add(mesh(new T.CylinderGeometry(0.32, 0.36, 1.75, 4), copper, {
    pos: [0, 4.44, 0.05],
    rot: [0, Math.PI / 4, 0],
  }));
  // Brass utensil rail with hanging copper saucepans
  ovenGroup.add(mesh(new T.CylinderGeometry(0.016, 0.016, 1.85, 8), brass, {
    pos: [0, 2.44, 0.46],
    rot: [0, 0, Math.PI / 2],
  }));
  for (const px of [-0.62, -0.22, 0.24, 0.62]) {
    ovenGroup.add(mesh(new T.CylinderGeometry(0.11, 0.11, 0.035, 16), copper, {
      pos: [px, 2.18, 0.47],
      rot: [Math.PI / 2, 0, 0],
    }));
  }
  // Stylized iced holiday cake on marble counter
  ovenGroup.add(mesh(new T.CylinderGeometry(0.22, 0.24, 0.03, 18), brass, { pos: [-0.82, 1.12, 0.28] }));
  ovenGroup.add(mesh(new T.CylinderGeometry(0.17, 0.18, 0.16, 18), new T.MeshStandardMaterial({ color: 0x693a24, roughness: 0.72 }), {
    pos: [-0.82, 1.22, 0.28],
  }));
  ovenGroup.add(mesh(new T.CylinderGeometry(0.175, 0.175, 0.04, 18), creamTrim, { pos: [-0.82, 1.31, 0.28] }));

  const ovenLight = new T.PointLight(0xff8f3d, 3.3, 8.2, 1.55);
  ovenLight.position.set(2.45, 1.65, wallZ + 1.15);
  root.add(ovenLight, ovenGroup);

  animators.push(t => {
    const glow = 0.92 + 0.08 * Math.sin(t * 5.6) + 0.04 * Math.cos(t * 11.2);
    ovenLight.intensity = 3.2 * glow;
    ovenHalo.material.opacity = 0.50 * glow;
  });

  // 6. RIGHT WALL (+X): Artisan Patisserie Display Showcase & Shelving
  const shelfGroup = new T.Group();
  shelfGroup.position.set(R - 0.48, FLOOR_Y, 0);
  shelfGroup.rotation.y = -Math.PI / 2;
  // Base counter + marble top
  shelfGroup.add(mesh(new T.BoxGeometry(3.3, 0.96, 0.68), honeyOak, { pos: [0, 0.48, 0] }));
  shelfGroup.add(mesh(new T.BoxGeometry(3.42, 0.08, 0.76), marble, { pos: [0, 1.0, 0.02] }));
  // Glass display case on counter + brass corner posts
  shelfGroup.add(mesh(new T.BoxGeometry(1.75, 0.68, 0.56), glassMat, { pos: [-0.62, 1.38, 0.04], receive: false }));
  for (const cx of [-1.48, 0.24]) {
    for (const cz of [-0.22, 0.30]) {
      shelfGroup.add(mesh(new T.CylinderGeometry(0.015, 0.015, 0.70, 8), brass, { pos: [cx, 1.38, cz] }));
    }
  }
  // Tiered pastries inside the glass case
  const pastryColors = [0xf4d5c6, 0xb83b3b, 0xe8ba68, 0x5c3422];
  for (let i = 0; i < 4; i++) {
    shelfGroup.add(mesh(new T.CylinderGeometry(0.14, 0.15, 0.14, 14), new T.MeshStandardMaterial({ color: pastryColors[i], roughness: 0.55 }), {
      pos: [-1.20 + i * 0.40, 1.12, 0.06],
    }));
  }
  // Upper floating honey-oak shelves with glass cookie jars & striped gift boxes
  for (const sy of [2.15, 2.95]) {
    shelfGroup.add(mesh(new T.BoxGeometry(3.2, 0.08, 0.44), honeyOak, { pos: [0, sy, -0.10] }));
    for (let j = -2; j <= 2; j++) {
      if (j % 2 === 0) {
        // Glass cookie jar
        shelfGroup.add(mesh(new T.CylinderGeometry(0.11, 0.11, 0.26, 14), glassMat, { pos: [j * 0.56, sy + 0.18, -0.08], receive: false }));
        shelfGroup.add(mesh(new T.CylinderGeometry(0.09, 0.09, 0.16, 12), new T.MeshStandardMaterial({ color: 0x9c5b2e, roughness: 0.8 }), {
          pos: [j * 0.56, sy + 0.13, -0.08],
        }));
        shelfGroup.add(mesh(new T.SphereGeometry(0.04, 10, 8), brass, { pos: [j * 0.56, sy + 0.33, -0.08] }));
      } else {
        // Striped bakery box
        shelfGroup.add(mesh(new T.BoxGeometry(0.32, 0.22, 0.26), creamTrim, { pos: [j * 0.56, sy + 0.15, -0.08] }));
        shelfGroup.add(mesh(new T.BoxGeometry(0.34, 0.05, 0.28), velvet, { pos: [j * 0.56, sy + 0.26, -0.08] }));
      }
    }
  }
  root.add(shelfGroup);

  // 7. LEFT WALL (-X): Parisian Marble Bistro Table & Bentwood Chairs
  const cafeGroup = new T.Group();
  cafeGroup.position.set(-R + 0.92, FLOOR_Y, 0.35);
  cafeGroup.rotation.y = Math.PI / 2;
  // Round marble bistro table
  cafeGroup.add(mesh(new T.CylinderGeometry(0.56, 0.56, 0.045, 28), marble, { pos: [0, 0.84, 0] }));
  cafeGroup.add(mesh(new T.CylinderGeometry(0.04, 0.06, 0.82, 12), brass, { pos: [0, 0.42, 0] }));
  cafeGroup.add(mesh(new T.CylinderGeometry(0.28, 0.32, 0.04, 20), brass, { pos: [0, 0.02, 0] }));
  const tableCandle = createCandle(0.16, 0.028, brass, creamTrim, new T.MeshBasicMaterial({ color: 0xffd584 }));
  tableCandle.group.position.set(0.06, 0.86, 0);
  cafeGroup.add(tableCandle.group);
  // Two stylized bistro chairs
  for (const cx of [-0.74, 0.74]) {
    const ch = new T.Group();
    ch.position.set(cx, 0, 0);
    ch.rotation.y = cx < 0 ? 0.28 : -0.28;
    ch.add(mesh(new T.CylinderGeometry(0.24, 0.24, 0.04, 18), honeyOak, { pos: [0, 0.50, 0] }));
    for (const [lx, lz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
      ch.add(mesh(new T.CylinderGeometry(0.018, 0.016, 0.50, 8), cocoaWood, { pos: [lx, 0.25, lz] }));
    }
    ch.add(mesh(new T.TorusGeometry(0.22, 0.02, 8, 20, Math.PI), cocoaWood, {
      pos: [cx < 0 ? -0.20 : 0.20, 0.84, 0],
      rot: [0, Math.PI / 2, 0],
    }));
    cafeGroup.add(ch);
  }
  root.add(cafeGroup);

  // 8. FRONT WALL (+Z, behind camera): Cream & Brass Patisserie Entrance Door + Wreath
  const doorGroup = new T.Group();
  doorGroup.position.set(0, FLOOR_Y, R - 0.18);
  doorGroup.rotation.y = Math.PI;
  doorGroup.add(mesh(new T.BoxGeometry(2.12, 3.34, 0.14), creamTrim, { pos: [0, 1.67, 0] }));
  doorGroup.add(mesh(new T.BoxGeometry(2.30, 0.14, 0.22), honeyOak, { pos: [0, 3.38, 0.02] }));
  for (const dx of [-0.48, 0.48]) {
    doorGroup.add(mesh(new T.BoxGeometry(0.72, 1.55, 0.05), new T.MeshStandardMaterial({ color: 0x22324d, roughness: 0.25, metalness: 0.15 }), {
      pos: [dx, 2.28, 0.07],
    }));
    doorGroup.add(mesh(new T.CylinderGeometry(0.018, 0.018, 0.42, 8), brass, { pos: [dx > 0 ? 0.12 : -0.12, 1.44, 0.14] }));
  }
  const bWreath = createWreath(0.42, evergreen, berry, velvet);
  bWreath.position.set(0, 2.38, 0.14);
  doorGroup.add(bWreath);
  root.add(doorGroup);

  // 9. Warm golden rising sugar/spice dust motes
  const motes = createParticleField({
    count: 60,
    bounds: [-3.2, 3.2, 0.5, 4.3, -3.2, 3.2],
    color: 0xffd996,
    size: 9,
    speedY: 0.08,
    sway: 0.22,
    opacity: 0.46,
    seed: 707,
  });
  root.add(motes.object);
  animators.push(t => motes.update(t));

  return {
    group: root,
    background: new T.Color(0x28130e),
    fog: new T.FogExp2(0x2d1610, 0.024),
    lighting: {
      hemiSky: 0xfff0d9,
      hemiGround: 0x5c3020,
      hemiIntensity: 0.82,
      keyColor: 0xffe8c4,
      keyIntensity: 1.72,
      keyPos: [-2.5, 5.2, 3.8],
      rimColor: 0xa4c9ff,
      rimIntensity: 0.92,
      rimPos: [-3.2, 3.0, -3.8],
      fillColor: 0xffaa5e,
      fillIntensity: 0.68,
      fillPos: [3.2, 2.4, -2.5],
      exposure: 1.08,
    },
    update(t) {
      for (const fn of animators) fn(t);
    },
  };
}

const builders = {
  room: buildCabinWorld,
  market: buildMarketWorld,
  bakery: buildBakeryWorld,
};

export function createWorldManager(parent) {
  const worlds = {};
  let activeKey = null;

  return {
    activate(key) {
      const target = builders[key] ? key : 'room';
      if (!worlds[target]) {
        const built = builders[target]();
        built.group.visible = false;
        parent.add(built.group);
        worlds[target] = built;
      }
      for (const [id, world] of Object.entries(worlds)) {
        world.group.visible = id === target;
      }
      activeKey = target;
      return worlds[target];
    },
    current() {
      return activeKey ? worlds[activeKey] : null;
    },
    update(time) {
      const w = this.current();
      if (w) w.update(time);
    },
  };
}
