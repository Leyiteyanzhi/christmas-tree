import * as T from './vendor/three.js';
import {
  parquetTextures,
  plasterTextures,
  cobblestoneTextures,
  bakeryTileTextures,
  plazaPlinthTexture,
  woodTextures,
  brickTextures,
  alpineVistaTexture,
  chaletInteriorTexture,
  signTexture,
  wallWashTexture,
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
 * Soft architectural light wash projected onto walls or floors (zero extra shadow cost!).
 */
function addLightWash(parent, x, y, z, w, h, color, opacity = 0.36, rot = [0, 0, 0]) {
  const mat = new T.MeshBasicMaterial({
    map: wallWashTexture(),
    color,
    transparent: true,
    opacity,
    blending: T.AdditiveBlending,
    depthWrite: false,
  });
  const p = mesh(new T.PlaneGeometry(w, h), mat, { pos: [x, y, z], rot, receive: false });
  parent.add(p);
  return p;
}

function createBrassMaterial(color = 0xd6a65a, roughness = 0.26) {
  return new T.MeshStandardMaterial({
    color,
    metalness: 0.84,
    roughness,
    envMapIntensity: 1.5,
  });
}

function createWoodMaterial(key, opts, roughness = 0.54) {
  const tex = woodTextures(key, opts);
  return new T.MeshStandardMaterial({
    map: tex.map,
    bumpMap: tex.bumpMap,
    bumpScale: 0.015,
    roughness,
    metalness: 0.05,
    envMapIntensity: 0.95,
  });
}

/**
 * Lush 3D evergreen pine wreath with clustered pine needles, red berries & velvet bow.
 */
function createWreath(radius = 0.44, evergreenMat, berryMat, velvetMat) {
  const g = new T.Group();
  g.add(mesh(new T.TorusGeometry(radius, radius * 0.22, 10, 28), evergreenMat));
  const tuftGeo = new T.ConeGeometry(radius * 0.17, radius * 0.36, 6);
  const count = 22;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    g.add(mesh(tuftGeo, evergreenMat, {
      pos: [Math.cos(a) * radius, Math.sin(a) * radius, 0.035],
      rot: [0.35, 0, a - Math.PI / 2 + 0.38],
    }));
    if (i % 3 === 0) {
      g.add(mesh(new T.SphereGeometry(radius * 0.062, 8, 6), berryMat, {
        pos: [Math.cos(a + 0.1) * radius, Math.sin(a + 0.1) * radius, radius * 0.22],
      }));
    }
  }
  const loopGeo = new T.TorusGeometry(radius * 0.17, radius * 0.058, 8, 16);
  g.add(mesh(loopGeo, velvetMat, { pos: [-radius * 0.17, -radius * 0.95, radius * 0.22], rot: [0.15, 0.32, 0.35], scale: [1.28, 0.78, 0.6] }));
  g.add(mesh(loopGeo, velvetMat, { pos: [radius * 0.17, -radius * 0.95, radius * 0.22], rot: [0.15, -0.32, -0.35], scale: [1.28, 0.78, 0.6] }));
  g.add(mesh(new T.SphereGeometry(radius * 0.085, 10, 8), velvetMat, { pos: [0, -radius * 0.96, radius * 0.26] }));
  const tailGeo = new T.BoxGeometry(radius * 0.11, radius * 0.48, 0.02);
  g.add(mesh(tailGeo, velvetMat, { pos: [-radius * 0.10, -radius * 1.24, radius * 0.20], rot: [0, 0, -0.22] }));
  g.add(mesh(tailGeo, velvetMat, { pos: [radius * 0.10, -radius * 1.24, radius * 0.20], rot: [0, 0, 0.22] }));
  return g;
}

/**
 * Draped 3D evergreen pine garland with crimson berries & warm micro fairy lights!
 */
function createPineGarland(width, sag, evergreenMat, berryMat, lit = true) {
  const g = new T.Group();
  const steps = Math.max(12, Math.round(width * 8));
  const tuftGeo = new T.ConeGeometry(0.068, 0.16, 6);
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const x = (f - 0.5) * width;
    const y = -Math.sin(f * Math.PI) * sag;
    const thickness = 0.85 + Math.sin(f * Math.PI) * 0.35;
    for (const s of [-1, 0, 1]) {
      g.add(mesh(tuftGeo, evergreenMat, {
        pos: [x, y + s * 0.025, Math.abs(s) * 0.02],
        rot: [0.35 + s * 0.35, i * 0.7, (f - 0.5) * 0.8 + s * 0.5],
        scale: thickness,
      }));
    }
    if (i % 3 === 1) {
      g.add(mesh(new T.SphereGeometry(0.024, 7, 6), berryMat, { pos: [x, y - 0.01, 0.075] }));
    }
    if (lit && i % 2 === 1 && i < steps) {
      addGlow(g, x, y + 0.01, 0.095, 0xffd280, 0.26, 0.65);
    }
  }
  return g;
}

function createCandle(height, radius, brassMat, waxMat, flameMat) {
  const g = new T.Group();
  g.add(mesh(new T.CylinderGeometry(radius * 1.85, radius * 2.1, 0.025, 16), brassMat, { pos: [0, 0.012, 0] }));
  g.add(mesh(new T.CylinderGeometry(radius * 0.55, radius * 0.8, 0.05, 12), brassMat, { pos: [0, 0.045, 0] }));
  g.add(mesh(new T.CylinderGeometry(radius, radius * 1.04, height, 14), waxMat, { pos: [0, 0.07 + height / 2, 0] }));
  const flame = mesh(new T.ConeGeometry(radius * 0.48, radius * 1.6, 8), flameMat, {
    pos: [0, 0.08 + height + radius * 0.7, 0],
    receive: false,
  });
  g.add(flame);
  const halo = addGlow(g, 0, 0.08 + height + radius * 0.9, 0, 0xffc66e, 0.38, 0.72);
  return { group: g, flame, halo };
}

function createWallSconce(brassMat, glassMat, washColor = 0xffc472) {
  const g = new T.Group();
  g.add(mesh(new T.CylinderGeometry(0.09, 0.10, 0.03, 20), brassMat, { rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.013, 0.013, 0.20, 8), brassMat, { pos: [0, -0.05, 0.09], rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(new T.CylinderGeometry(0.016, 0.016, 0.24, 8), brassMat, { pos: [0, 0.06, 0.18] }));
  g.add(mesh(new T.CylinderGeometry(0.058, 0.044, 0.24, 16), glassMat, { pos: [0, 0.22, 0.18], receive: false }));
  addGlow(g, 0, 0.24, 0.22, 0xffd084, 0.78, 0.62);
  // Soft warm architectural up/down wash on the wall behind the sconce!
  addLightWash(g, 0, 0.34, 0.025, 1.55, 2.25, washColor, 0.34);
  return g;
}

/**
 * Architectural decorative wall molding frame (boiserie) to give every wall depth & elegance.
 */
function addBoiserieFrame(parent, x, y, z, w, h, trimMat) {
  const t = 0.045;
  const d = 0.032;
  parent.add(mesh(new T.BoxGeometry(w, t, d), trimMat, { pos: [x, y + h / 2, z] }));
  parent.add(mesh(new T.BoxGeometry(w, t, d), trimMat, { pos: [x, y - h / 2, z] }));
  parent.add(mesh(new T.BoxGeometry(t, h, d), trimMat, { pos: [x - w / 2, y, z] }));
  parent.add(mesh(new T.BoxGeometry(t, h, d), trimMat, { pos: [x + w / 2, y, z] }));
}

function createParticleField({
  count, bounds, color = 0xffffff, size = 18, speedY = -0.35, sway = 0.22, opacity = 0.72, seed = 101,
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
      uniform float uTime, uSize, uMinY, uHeight, uSpeedY, uSway;
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
  return { object: points, update(time) { mat.uniforms.uTime.value = time; } };
}

function createContactShadow(radius = 1.42) {
  const mat = new T.MeshBasicMaterial({
    map: contactShadowTexture(),
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
  });
  const disc = new T.Mesh(new T.CircleGeometry(radius, 40), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = STAGE_Y + 0.002;
  return disc;
}

/**
 * ============================================================================
 * WORLD 1: SNOWY CABIN — "Nordic Alpine Hearth Salon" (High-Craft Architectural Edition)
 * ============================================================================
 */
function buildCabinWorld() {
  const root = new T.Group();
  const animators = [];

  const parquet = parquetTextures();
  const plaster = plasterTextures('cabin-emerald', '#213f36', '#172e27', 4, 2);
  const stone = stoneTexture();
  const brass = createBrassMaterial(0xd8a85c, 0.25);
  const darkWalnut = createWoodMaterial('walnut-dark', { base: [64, 38, 24], grain: [26, 14, 8], hi: [108, 68, 42], repeatX: 2, repeatY: 2 }, 0.52);
  const warmOak = createWoodMaterial('walnut-warm', { base: [104, 66, 39], grain: [48, 28, 15], hi: [148, 102, 64], repeatX: 2, repeatY: 2 }, 0.46);
  const velvet = new T.MeshPhysicalMaterial({ color: 0x731d28, roughness: 0.80, sheen: 0.72, sheenColor: new T.Color(0xcf5260), sheenRoughness: 0.55 });
  const creamFabric = new T.MeshStandardMaterial({ color: 0xefe4ce, roughness: 0.86 });
  const evergreen = new T.MeshStandardMaterial({ color: 0x1e4734, roughness: 0.78 });
  const berry = new T.MeshPhysicalMaterial({ color: 0xb01e24, roughness: 0.22, clearcoat: 0.85 });
  const waxMat = new T.MeshStandardMaterial({ color: 0xf7ecd4, roughness: 0.64 });
  const flameMat = new T.MeshBasicMaterial({ color: 0xffd582 });
  const sconceGlass = new T.MeshStandardMaterial({ color: 0xfff2d4, emissive: 0xffc068, emissiveIntensity: 1.65, roughness: 0.22 });

  const R = 6.0;
  const H = 5.45;

  // 1. Satin herringbone walnut parquet floor
  const floorMat = new T.MeshStandardMaterial({
    map: parquet.map,
    roughnessMap: parquet.roughnessMap,
    bumpMap: parquet.bumpMap,
    bumpScale: 0.014,
    roughness: 0.58,
    metalness: 0.06,
    envMapIntensity: 1.08,
  });
  root.add(mesh(new T.PlaneGeometry(R * 2.15, R * 2.15), floorMat, {
    pos: [0, FLOOR_Y, 0],
    rot: [-Math.PI / 2, 0, 0],
    receive: true,
  }));

  // 2. Woven circular Nordic rug + brass trim
  const rugTex = rugTexture('cabin', { base: '#eadbc1', ring1: '#6e2128', ring2: '#233f35', accent: '#c5974e' });
  root.add(mesh(new T.CylinderGeometry(1.78, 1.82, 0.022, 64), new T.MeshStandardMaterial({ map: rugTex, roughness: 0.90 }), {
    pos: [0, FLOOR_Y + 0.009, 0],
    receive: true,
  }));
  root.add(mesh(new T.TorusGeometry(1.79, 0.013, 8, 64), brass, { pos: [0, FLOOR_Y + 0.015, 0], rot: [Math.PI / 2, 0, 0] }));
  root.add(createContactShadow(1.38));

  // 3. Textured green Venetian plaster walls + wood-grained raised wainscoting & boiserie frames
  const wallMat = new T.MeshStandardMaterial({
    map: plaster.map,
    bumpMap: plaster.bumpMap,
    bumpScale: 0.018,
    roughness: 0.85,
    metalness: 0.02,
    envMapIntensity: 0.72,
  });
  const wallZ = -R;
  // Back wall around snow window opening (x in [-4.20, -1.40], y in [1.26, 4.34])
  root.add(mesh(new T.BoxGeometry(R * 2, 1.06, 0.18), wallMat, { pos: [0, FLOOR_Y + 0.53, wallZ] }));
  root.add(mesh(new T.BoxGeometry(R * 2, 1.18, 0.18), wallMat, { pos: [0, 4.34 + 0.59, wallZ] }));
  root.add(mesh(new T.BoxGeometry(1.80, 3.08, 0.18), wallMat, { pos: [-5.10, 2.80, wallZ] }));
  root.add(mesh(new T.BoxGeometry(7.40, 3.08, 0.18), wallMat, { pos: [2.30, 2.80, wallZ] }));

  root.add(mesh(new T.BoxGeometry(R * 2, H, 0.18), wallMat, { pos: [0, FLOOR_Y + H / 2, R] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [-R, FLOOR_Y + H / 2, 0] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [R, FLOOR_Y + H / 2, 0] }));

  // Architectural trim, raised wainscoting panels, dado rails, crown moulding & boiserie on all 4 walls!
  for (let side = 0; side < 4; side++) {
    const wg = new T.Group();
    wg.rotation.y = (side * Math.PI) / 2;
    const z = -R + 0.10;
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.96, 0.06), darkWalnut, { pos: [0, FLOOR_Y + 0.48, z] }));
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.075, 0.12), warmOak, { pos: [0, FLOOR_Y + 0.98, z + 0.025] }));
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.16, 0.10), darkWalnut, { pos: [0, FLOOR_Y + 0.08, z + 0.02] }));
    for (let x = -5.0; x <= 5.0; x += 1.25) {
      addBoiserieFrame(wg, x, FLOOR_Y + 0.52, z + 0.04, 0.96, 0.62, warmOak);
    }
    wg.add(mesh(new T.BoxGeometry(R * 2, 0.20, 0.18), darkWalnut, { pos: [0, FLOOR_Y + H - 0.10, z + 0.04] }));
    wg.add(mesh(new T.BoxGeometry(R * 2, 0.045, 0.22), warmOak, { pos: [0, FLOOR_Y + H - 0.22, z + 0.05] }));
    wg.add(mesh(new T.BoxGeometry(0.28, H, 0.28), darkWalnut, { pos: [-R + 0.14, FLOOR_Y + H / 2, -R + 0.14] }));
    // Upper wall architectural boiserie frames on side & back walls
    if (side !== 0) {
      for (const bx of [-3.6, 3.6]) {
        addBoiserieFrame(wg, bx, 3.15, z + 0.015, 2.25, 2.55, darkWalnut);
      }
    }
    root.add(wg);
  }

  // 4. Wood-grained coffered timber ceiling + exposed rafters + sculpted brass chandelier
  root.add(mesh(new T.PlaneGeometry(R * 2.1, R * 2.1), darkWalnut, { pos: [0, FLOOR_Y + H, 0], rot: [Math.PI / 2, 0, 0] }));
  for (let x = -4.2; x <= 4.2; x += 2.1) {
    root.add(mesh(new T.BoxGeometry(0.20, 0.26, R * 2), darkWalnut, { pos: [x, FLOOR_Y + H - 0.13, 0] }));
  }
  const chandelier = new T.Group();
  chandelier.position.set(0, 5.0, 0);
  chandelier.add(mesh(new T.CylinderGeometry(0.025, 0.025, 0.72, 10), brass, { pos: [0, 0.36, 0] }));
  chandelier.add(mesh(new T.TorusGeometry(0.95, 0.026, 10, 48), brass, { rot: [Math.PI / 2, 0, 0] }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const cx = Math.cos(a) * 0.95, cz = Math.sin(a) * 0.95;
    chandelier.add(mesh(new T.CylinderGeometry(0.009, 0.009, 0.95, 6), brass, { pos: [cx * 0.5, 0.18, cz * 0.5], rot: [0, -a, Math.PI / 2 - 0.36] }));
    chandelier.add(mesh(new T.CylinderGeometry(0.022, 0.024, 0.14, 10), waxMat, { pos: [cx, 0.08, cz] }));
    chandelier.add(mesh(new T.SphereGeometry(0.022, 8, 6), flameMat, { pos: [cx, 0.17, cz] }));
    addGlow(chandelier, cx, 0.18, cz, 0xffd78c, 0.40, 0.48);
  }
  root.add(chandelier);

  // 5. HERO BACK-LEFT: Panoramic Snow Window with Painterly Alpine Village Vista & Lit Pine Garland
  const winCenterX = -2.80;
  const winW = 2.82, winH = 3.08, winY = 2.80;
  const winGroup = new T.Group();
  winGroup.position.set(winCenterX, winY, wallZ);

  // Carved walnut window surround & deep sill
  winGroup.add(mesh(new T.BoxGeometry(winW + 0.28, 0.16, 0.38), darkWalnut, { pos: [0, -winH / 2 - 0.04, 0.09] }));
  winGroup.add(mesh(new T.BoxGeometry(winW + 0.42, 0.075, 0.48), warmOak, { pos: [0, -winH / 2 - 0.10, 0.16] }));
  winGroup.add(mesh(new T.BoxGeometry(winW + 0.36, 0.20, 0.34), darkWalnut, { pos: [0, winH / 2 + 0.06, 0.08] }));
  for (const sx of [-1, 1]) {
    winGroup.add(mesh(new T.BoxGeometry(0.16, winH + 0.22, 0.30), darkWalnut, { pos: [sx * (winW / 2 + 0.06), 0, 0.06] }));
  }
  for (const mx of [-winW / 6, winW / 6]) winGroup.add(mesh(new T.BoxGeometry(0.045, winH, 0.08), darkWalnut, { pos: [mx, 0, 0.02] }));
  for (const my of [-winH / 6, winH / 6]) winGroup.add(mesh(new T.BoxGeometry(winW, 0.045, 0.08), darkWalnut, { pos: [0, my, 0.02] }));

  // Subtle frost drifts on outer mullions
  const snowMat = new T.MeshStandardMaterial({ color: 0xe6effa, roughness: 0.70, emissive: 0x3a5a80, emissiveIntensity: 0.22 });
  for (const my of [-winH / 2 + 0.04, -winH / 6 + 0.03, winH / 6 + 0.03]) {
    winGroup.add(mesh(new T.BoxGeometry(winW - 0.08, 0.045, 0.05), snowMat, { pos: [0, my, -0.02] }));
  }

  // High-res painterly nocturnal Alpine Christmas village panorama behind the window!
  const vistaMat = new T.MeshBasicMaterial({ map: alpineVistaTexture('window') });
  winGroup.add(mesh(new T.PlaneGeometry(5.8, 3.8), vistaMat, { pos: [0, 0.05, -1.65], receive: false }));
  // Soft reflective frost-tinted window pane
  const glassMat = new T.MeshPhysicalMaterial({
    color: 0xa2c6eb, transparent: true, opacity: 0.12, roughness: 0.10, metalness: 0.08, envMapIntensity: 1.5, depthWrite: false,
  });
  winGroup.add(mesh(new T.PlaneGeometry(winW - 0.06, winH - 0.06), glassMat, { pos: [0, 0, 0.01], receive: false }));

  // Lush velvet curtains + brass rod + lit evergreen window cornice swag + windowsill candle
  winGroup.add(mesh(new T.CylinderGeometry(0.024, 0.024, winW + 1.05, 12), brass, { pos: [0, winH / 2 + 0.26, 0.24], rot: [0, 0, Math.PI / 2] }));
  for (const sx of [-1, 1]) {
    winGroup.add(mesh(new T.SphereGeometry(0.058, 12, 10), brass, { pos: [sx * (winW / 2 + 0.56), winH / 2 + 0.26, 0.24] }));
    for (let p = 0; p < 4; p++) {
      winGroup.add(mesh(new T.CylinderGeometry(0.10, 0.135, winH + 1.05, 12), velvet, {
        pos: [sx * (winW / 2 + 0.10 + p * 0.11), -0.18, 0.20 + (p % 2) * 0.03],
        scale: [0.82, 1, 0.55],
      }));
    }
    winGroup.add(mesh(new T.TorusGeometry(0.18, 0.018, 8, 20), brass, { pos: [sx * (winW / 2 + 0.26), -0.58, 0.21], rot: [Math.PI / 2, sx * 0.2, 0] }));
  }
  const winGarland = createPineGarland(winW + 0.55, 0.22, evergreen, berry, true);
  winGarland.position.set(0, winH / 2 + 0.22, 0.30);
  winGroup.add(winGarland);

  const sillCandle = createCandle(0.24, 0.032, brass, waxMat, flameMat);
  sillCandle.group.position.set(0.82, -winH / 2 - 0.05, 0.26);
  winGroup.add(sillCandle.group);
  root.add(winGroup);

  // Soft snowfall strictly outside the window pane
  const windowSnow = createParticleField({
    count: 130, bounds: [winCenterX - 1.5, winCenterX + 1.5, 1.3, 4.4, wallZ - 1.45, wallZ - 0.18],
    color: 0xe2f0ff, size: 13, speedY: -0.44, sway: 0.14, opacity: 0.88, seed: 2026,
  });
  root.add(windowSnow.object);
  animators.push(t => windowSnow.update(t));

  // 6. HERO BACK-RIGHT: Sculpted Arched Stone Fireplace Hearth + Firewood Alcove + Lit Garland
  const fpGroup = new T.Group();
  fpGroup.position.set(2.85, FLOOR_Y, wallZ + 0.42);
  const stoneMat = new T.MeshStandardMaterial({ map: stone.map, bumpMap: stone.bumpMap, bumpScale: 0.028, roughness: 0.86, metalness: 0.03 });
  const ironMat = new T.MeshStandardMaterial({ color: 0x1e1d1f, roughness: 0.48, metalness: 0.82 });

  // Stepped stone hearth slab + lower chimney breast + tapered upper stack
  fpGroup.add(mesh(new T.BoxGeometry(2.68, 0.18, 1.15), stoneMat, { pos: [0, 0.09, 0.24] }));
  fpGroup.add(mesh(new T.BoxGeometry(2.38, 1.80, 0.78), stoneMat, { pos: [0, 0.99, 0] }));
  fpGroup.add(mesh(new T.BoxGeometry(1.88, 3.65, 0.60), stoneMat, { pos: [0, 3.68, -0.06] }));

  // Sculpted stone keystone & voussoir arch framing the firebox
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    fpGroup.add(mesh(new T.BoxGeometry(0.18, 0.24, 0.16), stoneMat, {
      pos: [Math.cos(a) * 0.66, 0.88 + Math.sin(a) * 0.46, 0.39],
      rot: [0, 0, a - Math.PI / 2],
    }));
  }

  // Carved walnut mantelpiece with fluted pilasters & dentil shelf
  fpGroup.add(mesh(new T.BoxGeometry(2.64, 0.18, 0.96), darkWalnut, { pos: [0, 1.94, 0.12] }));
  fpGroup.add(mesh(new T.BoxGeometry(2.74, 0.065, 1.04), warmOak, { pos: [0, 2.05, 0.14] }));
  for (const sx of [-1.05, 1.05]) {
    fpGroup.add(mesh(new T.BoxGeometry(0.22, 1.72, 0.22), darkWalnut, { pos: [sx, 1.02, 0.36] }));
    fpGroup.add(mesh(new T.BoxGeometry(0.28, 0.26, 0.28), warmOak, { pos: [sx, 1.74, 0.38] }));
  }

  // Deep recessed arched firebox + warm glowing hearth back + birch logs + layered animated flames
  const fireboxMat = new T.MeshStandardMaterial({ color: 0x1a0e0a, roughness: 0.95 });
  fpGroup.add(mesh(new T.BoxGeometry(1.18, 1.06, 0.28), fireboxMat, { pos: [0, 0.72, 0.28] }));
  addLightWash(fpGroup, 0, 0.66, 0.43, 1.45, 1.15, 0xff7b28, 0.52);
  fpGroup.add(mesh(new T.BoxGeometry(0.96, 0.12, 0.28), new T.MeshBasicMaterial({ color: 0xff5e1f }), { pos: [0, 0.24, 0.34], receive: false }));

  const logGeo = new T.CylinderGeometry(0.065, 0.072, 0.74, 10);
  const logMat = new T.MeshStandardMaterial({ color: 0x2d1910, roughness: 0.92, emissive: 0x7a2208, emissiveIntensity: 0.55 });
  fpGroup.add(mesh(logGeo, logMat, { pos: [-0.08, 0.31, 0.36], rot: [0.15, 0.25, Math.PI / 2 - 0.12] }));
  fpGroup.add(mesh(logGeo, logMat, { pos: [0.10, 0.33, 0.34], rot: [-0.12, -0.30, Math.PI / 2 + 0.15] }));
  fpGroup.add(mesh(logGeo, logMat, { pos: [0.0, 0.40, 0.35], rot: [0.05, 0.08, Math.PI / 2] }));

  const flames = [];
  for (const fc of [
    { x: 0.0, y: 0.58, z: 0.37, r: 0.17, h: 0.48, color: 0xff6a1a, phase: 0 },
    { x: -0.18, y: 0.52, z: 0.38, r: 0.12, h: 0.36, color: 0xff9229, phase: 1.7 },
    { x: 0.18, y: 0.51, z: 0.36, r: 0.12, h: 0.38, color: 0xff7e21, phase: 3.1 },
    { x: 0.02, y: 0.49, z: 0.40, r: 0.095, h: 0.30, color: 0xffe48a, phase: 4.5 },
  ]) {
    const fm = mesh(new T.ConeGeometry(fc.r, fc.h, 8), new T.MeshBasicMaterial({ color: fc.color, transparent: true, opacity: 0.92 }), {
      pos: [fc.x, fc.y, fc.z], receive: false,
    });
    fpGroup.add(fm);
    flames.push({ mesh: fm, baseY: fc.y, phase: fc.phase });
  }
  const fireGlow = addGlow(fpGroup, 0, 0.62, 0.50, 0xff8c38, 1.75, 0.58);
  // Warm firelight glow pool spilling onto the parquet floor right in front of the hearth!
  addLightWash(fpGroup, 0, 0.015, 1.35, 3.2, 2.4, 0xff8d3a, 0.32, [-Math.PI / 2, 0, 0]);

  // Wrought iron fender grate + side birch firewood rack
  fpGroup.add(mesh(new T.BoxGeometry(1.18, 0.032, 0.032), ironMat, { pos: [0, 0.38, 0.50] }));
  for (let gx = -0.52; gx <= 0.52; gx += 0.13) {
    fpGroup.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.28, 6), ironMat, { pos: [gx, 0.25, 0.50] }));
  }
  // Stacked birch logs beside fireplace right
  const birchMat = new T.MeshStandardMaterial({ color: 0xd9cdb8, roughness: 0.85 });
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3 - r; c++) {
      fpGroup.add(mesh(new T.CylinderGeometry(0.06, 0.06, 0.42, 9), birchMat, {
        pos: [1.56 + (c - (2 - r) * 0.5) * 0.13, 0.08 + r * 0.11, 0.28],
        rot: [Math.PI / 2, 0, 0],
      }));
    }
  }

  // Lit lush pine garland along mantel + brass pillar candles + richly framed winter oil painting + stockings
  const mantelGarland = createPineGarland(2.45, 0.14, evergreen, berry, true);
  mantelGarland.position.set(0, 2.10, 0.56);
  fpGroup.add(mantelGarland);

  const mantelCandles = [
    createCandle(0.34, 0.038, brass, waxMat, flameMat),
    createCandle(0.24, 0.034, brass, waxMat, flameMat),
    createCandle(0.30, 0.036, brass, waxMat, flameMat),
  ];
  mantelCandles[0].group.position.set(-0.84, 2.08, 0.28);
  mantelCandles[1].group.position.set(-0.66, 2.08, 0.38);
  mantelCandles[2].group.position.set(0.82, 2.08, 0.30);
  mantelCandles.forEach(c => fpGroup.add(c.group));

  // Framed vintage alpine landscape painting with antique gold double frame + picture light!
  fpGroup.add(mesh(new T.BoxGeometry(1.34, 0.98, 0.065), brass, { pos: [0, 3.02, 0.26] }));
  fpGroup.add(mesh(new T.BoxGeometry(1.22, 0.86, 0.075), darkWalnut, { pos: [0, 3.02, 0.265] }));
  fpGroup.add(mesh(new T.PlaneGeometry(1.12, 0.76), new T.MeshStandardMaterial({ map: alpineVistaTexture('window'), roughness: 0.55 }), {
    pos: [0, 3.02, 0.305],
  }));
  // Brass picture light bar above painting
  fpGroup.add(mesh(new T.CylinderGeometry(0.018, 0.018, 0.44, 10), brass, { pos: [0, 3.62, 0.40], rot: [0, 0, Math.PI / 2] }));
  addGlow(fpGroup, 0, 3.55, 0.40, 0xffd58a, 0.65, 0.45);

  for (const [sx, scale] of [[-0.86, 1.0], [-0.54, 0.88]]) {
    const st = new T.Group();
    st.position.set(sx, 1.72, 0.58);
    st.scale.setScalar(scale);
    st.add(mesh(new T.CylinderGeometry(0.095, 0.088, 0.11, 12), creamFabric, { pos: [0, 0.14, 0] }));
    st.add(mesh(new T.CylinderGeometry(0.08, 0.075, 0.34, 12), velvet, { pos: [0, -0.07, 0] }));
    st.add(mesh(new T.CapsuleGeometry(0.072, 0.12, 6, 10), velvet, { pos: [0.06, -0.24, 0], rot: [0, 0, Math.PI / 2 - 0.15] }));
    fpGroup.add(st);
  }

  const hearthLight = new T.PointLight(0xff8434, 4.2, 9.2, 1.55);
  hearthLight.position.set(2.85, 1.05, wallZ + 1.15);
  root.add(hearthLight, fpGroup);

  animators.push(t => {
    const flicker = 0.88 + 0.09 * Math.sin(t * 7.3) + 0.05 * Math.sin(t * 13.7 + 1.2) + 0.03 * Math.cos(t * 19.1);
    hearthLight.intensity = 4.1 * flicker;
    fireGlow.material.opacity = 0.52 * flicker;
    fireGlow.scale.setScalar(1.65 + 0.14 * flicker);
    for (const f of flames) {
      const s = 0.86 + 0.20 * Math.sin(t * 9.5 + f.phase) + 0.08 * Math.cos(t * 16.0 + f.phase);
      f.mesh.scale.set(0.92 + 0.08 * Math.cos(t * 8 + f.phase), s, 0.92);
      f.mesh.position.y = f.baseY + (s - 1) * 0.14;
    }
    for (let i = 0; i < mantelCandles.length; i++) {
      const c = mantelCandles[i];
      const cf = 0.92 + 0.08 * Math.sin(t * 8.2 + i * 2.1);
      c.flame.scale.set(1, cf, 1);
      c.halo.material.opacity = 0.65 * cf;
    }
  });

  // 7. LEFT WALL (-X): Sculpted Wingback Velvet Armchair + Side Table + Arched Brass Floor Lamp + Sconces
  const leftGroup = new T.Group();
  leftGroup.position.set(-R + 0.82, FLOOR_Y, 0.1);
  leftGroup.rotation.y = Math.PI / 2;

  // Sculpted velvet armchair angled cozily toward the tree
  const chair = new T.Group();
  chair.position.set(-0.35, 0, 0.18);
  chair.rotation.y = 0.25;
  for (const [lx, lz] of [[-0.38, -0.35], [0.38, -0.35], [-0.38, 0.35], [0.38, 0.35]]) {
    chair.add(mesh(new T.CylinderGeometry(0.032, 0.022, 0.34, 10), darkWalnut, { pos: [lx, 0.17, lz] }));
  }
  chair.add(mesh(new T.BoxGeometry(0.92, 0.22, 0.84), velvet, { pos: [0, 0.42, 0] }));
  chair.add(mesh(new T.BoxGeometry(0.86, 0.88, 0.20), velvet, { pos: [0, 0.92, -0.34], rot: [-0.14, 0, 0] }));
  for (const sx of [-0.42, 0.42]) {
    chair.add(mesh(new T.BoxGeometry(0.16, 0.32, 0.78), velvet, { pos: [sx, 0.64, -0.02] }));
    chair.add(mesh(new T.BoxGeometry(0.14, 0.48, 0.26), velvet, { pos: [sx, 1.02, -0.22], rot: [-0.12, 0, 0] })); // wingback cheeks!
  }
  chair.add(mesh(new T.BoxGeometry(0.38, 0.34, 0.14), creamFabric, { pos: [0.06, 0.68, -0.14], rot: [-0.24, -0.18, 0.08] }));
  leftGroup.add(chair);

  // Round walnut side table with glowing lantern & mug
  const sideTable = new T.Group();
  sideTable.position.set(0.82, 0, 0.12);
  sideTable.add(mesh(new T.CylinderGeometry(0.38, 0.38, 0.045, 24), warmOak, { pos: [0, 0.64, 0] }));
  sideTable.add(mesh(new T.CylinderGeometry(0.045, 0.065, 0.62, 12), darkWalnut, { pos: [0, 0.32, 0] }));
  sideTable.add(mesh(new T.CylinderGeometry(0.24, 0.28, 0.04, 18), darkWalnut, { pos: [0, 0.02, 0] }));
  const tableCandle = createCandle(0.18, 0.030, brass, waxMat, flameMat);
  tableCandle.group.position.set(-0.08, 0.66, 0.04);
  sideTable.add(tableCandle.group);
  leftGroup.add(sideTable);

  // Arched brass floor reading lamp with warm glowing linen shade
  const lampGroup = new T.Group();
  lampGroup.position.set(-1.35, 0, -0.08);
  lampGroup.add(mesh(new T.CylinderGeometry(0.22, 0.26, 0.045, 24), brass, { pos: [0, 0.022, 0] }));
  lampGroup.add(mesh(new T.CylinderGeometry(0.022, 0.026, 2.08, 12), brass, { pos: [0, 1.06, 0] }));
  const shadeMat = new T.MeshStandardMaterial({ color: 0xf9ebd0, emissive: 0xffc370, emissiveIntensity: 1.05, roughness: 0.70, side: T.DoubleSide });
  lampGroup.add(mesh(new T.CylinderGeometry(0.21, 0.36, 0.38, 24, 1, true), shadeMat, { pos: [0, 2.05, 0] }));
  addGlow(lampGroup, 0, 2.0, 0, 0xffcd7a, 1.25, 0.55);
  leftGroup.add(lampGroup);

  // Framed holiday artwork centered on left wall + flanking sconces with warm wall washes
  leftGroup.add(mesh(new T.BoxGeometry(1.42, 1.04, 0.055), brass, { pos: [0, 2.95, -0.64] }));
  leftGroup.add(mesh(new T.PlaneGeometry(1.26, 0.88), new T.MeshStandardMaterial({ map: alpineVistaTexture('bakery'), roughness: 0.6 }), {
    pos: [0, 2.95, -0.605],
  }));
  const sL1 = createWallSconce(brass, sconceGlass); sL1.position.set(-2.35, 2.75, -0.66);
  const sL2 = createWallSconce(brass, sconceGlass); sL2.position.set(2.35, 2.75, -0.66);
  leftGroup.add(sL1, sL2);
  root.add(leftGroup);

  // 8. RIGHT WALL (+X): Wood-Grained Library Bookcase Alcove with Warm Shelf Lighting
  const rightGroup = new T.Group();
  rightGroup.position.set(R - 0.44, FLOOR_Y, 0);
  rightGroup.rotation.y = -Math.PI / 2;
  rightGroup.add(mesh(new T.BoxGeometry(3.4, 3.80, 0.14), darkWalnut, { pos: [0, 1.90, -0.26] }));
  for (const sx of [-1.64, 0, 1.64]) rightGroup.add(mesh(new T.BoxGeometry(0.14, 3.80, 0.58), darkWalnut, { pos: [sx, 1.90, 0] }));
  rightGroup.add(mesh(new T.BoxGeometry(3.62, 0.18, 0.68), warmOak, { pos: [0, 3.82, 0.03] }));
  rightGroup.add(mesh(new T.BoxGeometry(3.20, 0.96, 0.50), warmOak, { pos: [0, 0.48, 0.02] }));
  for (const kx of [-0.22, 0.22]) rightGroup.add(mesh(new T.SphereGeometry(0.042, 10, 8), brass, { pos: [kx, 0.64, 0.30] }));

  const bookColors = [0x7a2127, 0x20473a, 0xb8863d, 0x2c4260, 0x5c2e28, 0xd4c3a3];
  const rand = seeded(8842);
  for (const sy of [1.04, 1.88, 2.74]) {
    rightGroup.add(mesh(new T.BoxGeometry(3.32, 0.08, 0.54), warmOak, { pos: [0, sy, 0.02] }));
    addLightWash(rightGroup, 0, sy + 0.44, -0.17, 2.8, 0.82, 0xffca7a, 0.28);
    let bx = -1.42;
    while (bx < -0.20) {
      const bw = 0.065 + rand() * 0.045, bh = 0.34 + rand() * 0.20;
      rightGroup.add(mesh(new T.BoxGeometry(bw, bh, 0.28), new T.MeshStandardMaterial({ color: bookColors[Math.floor(rand() * bookColors.length)], roughness: 0.7 }), {
        pos: [bx + bw / 2, sy + 0.04 + bh / 2, 0.04],
      }));
      bx += bw + 0.012;
    }
    const ceramicMat = new T.MeshPhysicalMaterial({ color: 0xebe0cb, roughness: 0.28, clearcoat: 0.5 });
    rightGroup.add(mesh(new T.CylinderGeometry(0.11, 0.15, 0.38, 16), ceramicMat, { pos: [0.46, sy + 0.23, 0.04] }));
    rightGroup.add(mesh(new T.SphereGeometry(0.14, 14, 12), brass, { pos: [1.02, sy + 0.18, 0.06], scale: [1, 1.25, 1] }));
  }
  const sR1 = createWallSconce(brass, sconceGlass); sR1.position.set(-2.65, 2.75, -0.32);
  const sR2 = createWallSconce(brass, sconceGlass); sR2.position.set(2.65, 2.75, -0.32);
  rightGroup.add(sR1, sR2);
  root.add(rightGroup);

  // 9. FRONT WALL (+Z, behind camera): Grand Panelled Entry Door + Wreath + Sconces
  const frontGroup = new T.Group();
  frontGroup.position.set(0, FLOOR_Y, R - 0.18);
  frontGroup.rotation.y = Math.PI;
  frontGroup.add(mesh(new T.BoxGeometry(2.20, 3.45, 0.18), darkWalnut, { pos: [0, 1.725, 0] }));
  frontGroup.add(mesh(new T.BoxGeometry(2.44, 0.16, 0.26), warmOak, { pos: [0, 3.48, 0.03] }));
  for (const dx of [-0.48, 0.48]) {
    for (const dy of [0.90, 2.42]) frontGroup.add(mesh(new T.BoxGeometry(0.76, 1.18, 0.06), warmOak, { pos: [dx, dy, 0.09] }));
  }
  frontGroup.add(mesh(new T.SphereGeometry(0.058, 12, 10), brass, { pos: [0.84, 1.58, 0.16] }));
  const doorWreath = createWreath(0.45, evergreen, berry, velvet);
  doorWreath.position.set(0, 2.40, 0.16);
  frontGroup.add(doorWreath);
  for (const sx of [-1.95, 1.95]) {
    const sc = createWallSconce(brass, sconceGlass);
    sc.position.set(sx, 2.75, 0.06);
    frontGroup.add(sc);
  }
  root.add(frontGroup);

  // Warm ambient wall-wash lights for balanced 360° cozy glow
  const leftLampLight = new T.PointLight(0xffc272, 2.5, 7.6, 1.45);
  leftLampLight.position.set(-R + 1.35, 2.40, -0.4);
  const backWallWash = new T.PointLight(0xffc478, 2.1, 7.6, 1.5);
  backWallWash.position.set(0, 2.85, R - 1.35);
  root.add(leftLampLight, backWallWash);

  const motes = createParticleField({
    count: 60, bounds: [-3.4, 3.4, 0.5, 4.3, -3.4, 3.4],
    color: 0xffe4aa, size: 8.5, speedY: 0.06, sway: 0.24, opacity: 0.44, seed: 505,
  });
  root.add(motes.object);
  animators.push(t => motes.update(t));

  return {
    group: root,
    background: new T.Color(0x131d1b),
    fog: new T.FogExp2(0x14201d, 0.022),
    lighting: {
      hemiSky: 0xffeed6, hemiGround: 0x3b261b, hemiIntensity: 0.78,
      keyColor: 0xffe3bd, keyIntensity: 1.78, keyPos: [-2.6, 5.2, 3.8],
      rimColor: 0x89bfff, rimIntensity: 1.08, rimPos: [-3.2, 3.1, -3.8],
      fillColor: 0xffa65c, fillIntensity: 0.62, fillPos: [3.2, 2.4, -2.5],
      exposure: 1.10,
    },
    update(t) { for (const fn of animators) fn(t); },
  };
}

/**
 * ============================================================================
 * WORLD 2: VILLAGE MARKET — "Cinematic European Winter Piazza"
 * ============================================================================
 */
function buildMarketWorld() {
  const root = new T.Group();
  const animators = [];

  const cobble = cobblestoneTextures();
  const brass = createBrassMaterial(0xd8aa5e, 0.26);
  const darkTimber = createWoodMaterial('chalet-dark', { base: [62, 39, 24], grain: [24, 14, 8], hi: [98, 66, 40], repeatX: 2, repeatY: 2 }, 0.70);
  const warmTimber = createWoodMaterial('chalet-warm', { base: [108, 70, 42], grain: [52, 30, 16], hi: [148, 102, 64], repeatX: 2, repeatY: 1 }, 0.64);
  const stuccoTex = plasterTextures('chalet-stucco', '#efe4cf', '#dfd0b4', 2, 1);
  const stucco = new T.MeshStandardMaterial({ map: stuccoTex.map, bumpMap: stuccoTex.bumpMap, bumpScale: 0.015, roughness: 0.85 });
  const snowMat = new T.MeshStandardMaterial({ color: 0xeaf1fa, roughness: 0.58, metalness: 0.06, envMapIntensity: 1.05 });
  const icicleMat = new T.MeshPhysicalMaterial({ color: 0xdff0ff, roughness: 0.08, clearcoat: 1.0, metalness: 0.15, envMapIntensity: 1.8 });
  const ironMat = new T.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.40, metalness: 0.85 });
  const evergreen = new T.MeshStandardMaterial({ color: 0x193d2e, roughness: 0.80 });
  const berry = new T.MeshPhysicalMaterial({ color: 0xb42228, roughness: 0.25, clearcoat: 0.8 });
  const lanternGlass = new T.MeshStandardMaterial({ color: 0xffe8b4, emissive: 0xffb34e, emissiveIntensity: 1.95, roughness: 0.2 });

  // 1. Starlit twilight aurora sky dome + FULL 360° Painterly Alpine Village Skyline Panorama!
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
        vec3 horizon = vec3(0.15, 0.24, 0.40);
        vec3 col = mix(horizon, mid, smoothstep(0.0, 0.34, h));
        col = mix(col, zenith, smoothstep(0.34, 0.88, h));
        float ribbon = sin(vDir.x * 3.2 + uTime * 0.12) * cos(vDir.z * 2.5 - uTime * 0.08);
        float band = smoothstep(0.20, 0.48, h) * (1.0 - smoothstep(0.48, 0.80, h));
        col += vec3(0.07, 0.18, 0.25) * max(0.0, ribbon) * band * 0.58;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  root.add(mesh(new T.SphereGeometry(28, 32, 20), skyMat, { receive: false }));
  animators.push(t => { skyMat.uniforms.uTime.value = t; });

  // Seamless 360° painterly nocturnal Alpine skyline cylinder (replaces primitive cones with storybook village depth!)
  const panoramaMat = new T.MeshBasicMaterial({
    map: alpineVistaTexture('panorama'),
    side: T.BackSide,
    fog: true,
  });
  root.add(mesh(new T.CylinderGeometry(16.8, 16.8, 11.5, 48, 1, true), panoramaMat, {
    pos: [0, FLOOR_Y + 4.85, 0],
    receive: false,
  }));

  // Twinkling winter starfield
  const starCount = 260;
  const starPos = new Float32Array(starCount * 3);
  const starPhase = new Float32Array(starCount);
  const starScale = new Float32Array(starCount);
  const rand = seeded(1225);
  for (let i = 0; i < starCount; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = 0.28 + rand() * 1.1;
    const rad = 24;
    starPos[i * 3] = rad * Math.cos(phi) * Math.sin(theta);
    starPos[i * 3 + 1] = rad * Math.sin(phi) + 2.0;
    starPos[i * 3 + 2] = rad * Math.cos(phi) * Math.cos(theta);
    starPhase[i] = rand() * Math.PI * 2;
    starScale[i] = 0.6 + rand() * 1.1;
  }
  const starGeo = new T.BufferGeometry();
  starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
  starGeo.setAttribute('aPhase', new T.BufferAttribute(starPhase, 1));
  starGeo.setAttribute('aScale', new T.BufferAttribute(starScale, 1));
  const starMat = new T.ShaderMaterial({
    transparent: true, depthWrite: false, blending: T.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aPhase; attribute float aScale; uniform float uTime; varying float vA;
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
        gl_FragColor = vec4(0.90, 0.95, 1.0, pow(1.0 - r * 2.0, 2.0) * vA);
      }
    `,
  });
  root.add(new T.Points(starGeo, starMat));
  animators.push(t => { starMat.uniforms.uTime.value = t; });

  // Luminous crescent moon overhead
  root.add(mesh(new T.SphereGeometry(0.75, 20, 16), new T.MeshBasicMaterial({ color: 0xf9f3de }), { pos: [-7.8, 11.4, -16.5], receive: false }));
  addGlow(root, -7.8, 11.4, -16.0, 0xa8d0ff, 6.2, 0.38);

  // 2. Snow-dusted European cobblestone piazza ground
  const cobbleMat = new T.MeshStandardMaterial({
    map: cobble.map, roughnessMap: cobble.roughnessMap, bumpMap: cobble.bumpMap,
    bumpScale: 0.022, roughness: 0.72, metalness: 0.08, envMapIntensity: 1.02,
  });
  root.add(mesh(new T.CircleGeometry(17.5, 64), cobbleMat, { pos: [0, FLOOR_Y, 0], rot: [-Math.PI / 2, 0, 0], receive: true }));

  // 3. Dressed-Limestone Medallion Plaza Plinth + Brass Rim + 4 Festive Bollard Uplights
  const stonePlinthMat = new T.MeshStandardMaterial({ color: 0x8d99ab, roughness: 0.70, metalness: 0.06 });
  root.add(mesh(new T.CylinderGeometry(1.86, 1.98, 0.022, 8), stonePlinthMat, { pos: [0, FLOOR_Y + 0.009, 0], rot: [0, Math.PI / 8, 0], receive: true }));
  root.add(mesh(new T.CylinderGeometry(1.76, 1.79, 0.024, 48), new T.MeshStandardMaterial({ map: plazaPlinthTexture(), roughness: 0.66, metalness: 0.08, envMapIntensity: 1.0 }), {
    pos: [0, FLOOR_Y + 0.008, 0], receive: true,
  }));
  root.add(mesh(new T.TorusGeometry(1.78, 0.015, 8, 48), brass, { pos: [0, STAGE_Y, 0], rot: [Math.PI / 2, 0, 0] }));
  root.add(createContactShadow(1.38));

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const bx = Math.cos(a) * 2.08, bz = Math.sin(a) * 2.08;
    const bol = new T.Group();
    bol.position.set(bx, FLOOR_Y, bz);
    bol.add(mesh(new T.CylinderGeometry(0.055, 0.074, 0.34, 12), ironMat, { pos: [0, 0.17, 0] }));
    bol.add(mesh(new T.CylinderGeometry(0.048, 0.048, 0.09, 12), lanternGlass, { pos: [0, 0.36, 0], receive: false }));
    bol.add(mesh(new T.ConeGeometry(0.078, 0.075, 12), brass, { pos: [0, 0.44, 0] }));
    addGlow(bol, 0, 0.36, 0, 0xffc66e, 0.48, 0.60);
    addLightWash(bol, 0, 0.01, 0, 1.25, 1.25, 0xffbe66, 0.28, [-Math.PI / 2, 0, 0]);
    root.add(bol);
  }

  // 4. Four High-Craft Half-Timbered Alpine Market Chalets with Painted Shop Interiors, Signboards, Icicles & Barrels!
  function buildChalet(angle, { awningColor, signTitle, signSub, variant = 0 }) {
    const g = new T.Group();
    const dist = 6.25;
    g.position.set(Math.sin(angle) * dist, FLOOR_Y, Math.cos(angle) * dist);
    g.rotation.y = angle + Math.PI;

    // Plank-textured chalet walls + stucco half-timbered upper gable
    g.add(mesh(new T.BoxGeometry(3.65, 2.82, 2.15), darkTimber, { pos: [0, 1.41, 0] }));
    g.add(mesh(new T.BoxGeometry(3.48, 1.15, 2.19), stucco, { pos: [0, 2.15, 0] }));
    // Carved half-timber corner posts & decorative diagonal X-braces
    for (const px of [-1.72, 1.72]) g.add(mesh(new T.BoxGeometry(0.18, 2.88, 0.22), darkTimber, { pos: [px, 1.44, 1.04] }));
    for (const sx of [-1.30, 1.30]) {
      g.add(mesh(new T.BoxGeometry(0.08, 0.72, 0.06), darkTimber, { pos: [sx, 2.48, 1.10], rot: [0, 0, sx > 0 ? 0.48 : -0.48] }));
    }
    // Warm honey-oak serving counter with lower panelled timber facade
    g.add(mesh(new T.BoxGeometry(3.72, 0.13, 0.68), warmTimber, { pos: [0, 1.08, 1.16] }));
    g.add(mesh(new T.BoxGeometry(3.54, 0.96, 0.14), warmTimber, { pos: [0, 0.54, 1.06] }));
    for (let x = -1.2; x <= 1.2; x += 0.8) addBoiserieFrame(g, x, 0.54, 1.14, 0.62, 0.66, darkTimber);

    // Richly painted glowing Christmas shop interior behind dark-timber window mullions!
    const shopMat = new T.MeshBasicMaterial({ map: chaletInteriorTexture(variant) });
    g.add(mesh(new T.PlaneGeometry(3.16, 1.38), shopMat, { pos: [0, 1.78, 1.09], receive: false }));
    for (const mx of [-0.82, 0.82]) g.add(mesh(new T.BoxGeometry(0.075, 1.42, 0.08), darkTimber, { pos: [mx, 1.78, 1.12] }));
    g.add(mesh(new T.BoxGeometry(3.20, 0.06, 0.08), darkTimber, { pos: [0, 1.98, 1.12] }));
    // Warm golden light pool spilling onto the cobblestone plaza in front of the stall!
    addLightWash(g, 0, 0.015, 2.1, 3.8, 2.6, 0xffbe66, 0.34, [-Math.PI / 2, 0, 0]);

    // Striped pitched fabric awning + hanging scalloped valance + warm awning mini-lights
    const awMat = new T.MeshStandardMaterial({ map: awningTexture(awningColor, '#f4e7cf'), roughness: 0.84, side: T.DoubleSide });
    g.add(mesh(new T.PlaneGeometry(3.74, 1.12), awMat, { pos: [0, 2.42, 1.44], rot: [-Math.PI / 2 + 0.44, 0, 0] }));
    g.add(mesh(new T.BoxGeometry(3.74, 0.18, 0.03), awMat, { pos: [0, 2.13, 1.94] }));
    for (let i = -5; i <= 5; i++) {
      addGlow(g, i * 0.33, 2.04, 1.97, 0xffd384, 0.28, 0.68);
    }

    // Thick snow-blanketed Alpine pitched roof + glittering 3D crystal icicles along the eaves!
    const roofW = 2.55, roofL = 4.20;
    g.add(mesh(new T.BoxGeometry(roofL, 0.20, roofW), snowMat, { pos: [0, 3.44, 0.68], rot: [0.52, 0, 0] }));
    g.add(mesh(new T.BoxGeometry(roofL, 0.20, roofW), snowMat, { pos: [0, 3.44, -0.68], rot: [-0.52, 0, 0] }));
    g.add(mesh(new T.BoxGeometry(roofL - 0.10, 0.14, roofW - 0.10), darkTimber, { pos: [0, 3.30, 0.68], rot: [0.52, 0, 0] }));
    g.add(mesh(new T.BoxGeometry(roofL - 0.10, 0.14, roofW - 0.10), darkTimber, { pos: [0, 3.30, -0.68], rot: [-0.52, 0, 0] }));
    for (let i = -8; i <= 8; i++) {
      const ilen = 0.14 + ((i * 7 + 5) % 4) * 0.045;
      g.add(mesh(new T.ConeGeometry(0.022, ilen, 5), icicleMat, {
        pos: [i * 0.24, 2.74 - ilen * 0.5, 1.76], rot: [Math.PI, 0, 0], receive: false,
      }));
    }

    // Carved wooden hanging signboard prominently mounted along the front gable overhang!
    const signMat = new T.MeshStandardMaterial({ map: signTexture(signTitle, signSub), roughness: 0.62 });
    g.add(mesh(new T.BoxGeometry(1.62, 0.44, 0.07), darkTimber, { pos: [0, 2.86, 1.82] }));
    g.add(mesh(new T.PlaneGeometry(1.50, 0.36), signMat, { pos: [0, 2.86, 1.86] }));

    // Lush 3D lit pine garland across chalet fascia
    const chalGarland = createPineGarland(3.52, 0.14, evergreen, berry, true);
    chalGarland.position.set(0, 2.66, 1.18);
    g.add(chalGarland);

    // Countertop wrapped gifts & glowing brass lantern
    for (let i = 0; i < 3; i++) {
      const gc = [0x9e2a2b, 0x225542, 0xc99648][i];
      g.add(mesh(new T.BoxGeometry(0.24, 0.22, 0.24), new T.MeshStandardMaterial({ color: gc, roughness: 0.56 }), {
        pos: [-1.18 + i * 0.34, 1.25, 1.22], rot: [0, i * 0.28, 0],
      }));
    }
    g.add(mesh(new T.CylinderGeometry(0.085, 0.095, 0.26, 8), lanternGlass, { pos: [1.14, 1.27, 1.22], receive: false }));
    g.add(mesh(new T.ConeGeometry(0.115, 0.095, 8), brass, { pos: [1.14, 1.44, 1.22] }));
    addGlow(g, 1.14, 1.29, 1.26, 0xffbe60, 0.98, 0.68);

    // Standing oak wine-barrel bistro table beside chalet with glowing candle lantern!
    const barrel = new T.Group();
    barrel.position.set(2.38, 0, 0.95);
    barrel.add(mesh(new T.CylinderGeometry(0.30, 0.32, 0.96, 16), warmTimber, { pos: [0, 0.48, 0] }));
    for (const ry of [0.22, 0.74]) barrel.add(mesh(new T.TorusGeometry(0.315, 0.015, 6, 20), ironMat, { pos: [0, ry, 0], rot: [Math.PI / 2, 0, 0] }));
    barrel.add(mesh(new T.CylinderGeometry(0.42, 0.42, 0.05, 20), darkTimber, { pos: [0, 0.98, 0] }));
    barrel.add(mesh(new T.CylinderGeometry(0.065, 0.072, 0.18, 8), lanternGlass, { pos: [0, 1.10, 0], receive: false }));
    addGlow(barrel, 0, 1.12, 0, 0xffc66e, 0.62, 0.62);
    g.add(barrel);

    root.add(g);
  }

  buildChalet(Math.PI + 0.56, { awningColor: '#7c222b', signTitle: 'GLÜHWEIN', signSub: 'Winter Spiced Wine', variant: 0 });
  buildChalet(Math.PI - 0.56, { awningColor: '#224a3c', signTitle: 'NOËL CRAFTS', signSub: 'Handcrafted Gifts', variant: 1 });
  buildChalet(0.62, { awningColor: '#7c222b', signTitle: 'LEBKUCHEN', signSub: 'Gingerbread & Sweets', variant: 0 });
  buildChalet(-0.68, { awningColor: '#224a3c', signTitle: 'WINTER TOYS', signSub: 'Alpine Woodwork', variant: 1 });

  // 5. Five Vintage Wrought-Iron Streetlamps + Warm Ground Light Pools + Overhead Catenary Festoon Lights
  const lampPositions = [];
  const festoonAngles = [-2.52, -1.26, 0.0, 1.26, 2.52];
  const lampR = 5.15;
  for (const a of festoonAngles) {
    const lx = Math.sin(a) * lampR, lz = Math.cos(a) * lampR;
    lampPositions.push(new T.Vector3(lx, FLOOR_Y + 4.10, lz));
    const post = new T.Group();
    post.position.set(lx, FLOOR_Y, lz);
    post.add(mesh(new T.CylinderGeometry(0.12, 0.17, 0.58, 10), ironMat, { pos: [0, 0.29, 0] }));
    post.add(mesh(new T.CylinderGeometry(0.045, 0.076, 3.68, 10), ironMat, { pos: [0, 2.18, 0] }));
    post.add(mesh(new T.CylinderGeometry(0.19, 0.115, 0.36, 6), lanternGlass, { pos: [0, 4.22, 0], receive: false }));
    post.add(mesh(new T.ConeGeometry(0.25, 0.19, 6), ironMat, { pos: [0, 4.49, 0] }));
    addGlow(post, 0, 4.22, 0, 0xffca70, 1.55, 0.76);
    addLightWash(post, 0, 0.015, 0, 3.6, 3.6, 0xffbf66, 0.32, [-Math.PI / 2, 0, 0]);
    root.add(post);
  }

  // Overhead catenary festoon light strands around the square
  const festoonBulbPos = [];
  const wireMat = new T.MeshStandardMaterial({ color: 0x1e2228, roughness: 0.7 });
  for (let i = 0; i < lampPositions.length; i++) {
    const pA = lampPositions[i];
    const pB = lampPositions[(i + 1) % lampPositions.length];
    const mid = pA.clone().add(pB).multiplyScalar(0.5);
    mid.y -= 0.72;
    const curve = new T.CatmullRomCurve3([pA, mid, pB]);
    root.add(mesh(new T.TubeGeometry(curve, 18, 0.012, 6, false), wireMat, { receive: false }));
    for (let k = 1; k <= 7; k++) festoonBulbPos.push(curve.getPoint(k / 8));
  }
  const festoonBulbs = new T.InstancedMesh(new T.SphereGeometry(0.048, 8, 6), new T.MeshBasicMaterial({ color: 0xffe4a0 }), festoonBulbPos.length);
  const m4 = new T.Matrix4();
  festoonBulbPos.forEach((p, idx) => {
    m4.makeTranslation(p.x, p.y, p.z);
    festoonBulbs.setMatrixAt(idx, m4);
    if (idx % 2 === 0) addGlow(root, p.x, p.y, p.z, 0xffc76e, 0.58, 0.46);
  });
  festoonBulbs.instanceMatrix.needsUpdate = true;
  root.add(festoonBulbs);

  // Carved stone evergreen winter planters framing the square
  for (const a of [-1.92, 1.92, -0.02, Math.PI]) {
    const px = Math.sin(a) * 4.85, pz = Math.cos(a) * 4.85;
    const urn = new T.Group();
    urn.position.set(px, FLOOR_Y, pz);
    urn.add(mesh(new T.CylinderGeometry(0.36, 0.28, 0.44, 8), stonePlinthMat, { pos: [0, 0.22, 0] }));
    urn.add(mesh(new T.CylinderGeometry(0.40, 0.38, 0.08, 8), stonePlinthMat, { pos: [0, 0.46, 0] }));
    for (let k = 0; k < 7; k++) {
      const ka = (k / 7) * Math.PI * 2;
      urn.add(mesh(new T.ConeGeometry(0.14, 0.42, 6), evergreen, { pos: [Math.cos(ka) * 0.14, 0.64, Math.sin(ka) * 0.14], rot: [Math.sin(ka) * 0.4, 0, -Math.cos(ka) * 0.4] }));
    }
    urn.add(mesh(new T.ConeGeometry(0.16, 0.56, 7), evergreen, { pos: [0, 0.72, 0] }));
    addGlow(urn, 0, 0.74, 0, 0xffd284, 0.48, 0.52);
    root.add(urn);
  }

  const marketWarmL = new T.PointLight(0xffb55a, 3.6, 12, 1.45); marketWarmL.position.set(-3.2, 3.6, -4.1);
  const marketWarmR = new T.PointLight(0xffa94c, 3.4, 12, 1.45); marketWarmR.position.set(3.2, 3.6, -4.1);
  root.add(marketWarmL, marketWarmR);

  const snowfall = createParticleField({
    count: 260, bounds: [-7.8, 7.8, 0.25, 6.4, -7.8, 7.8],
    color: 0xe8f3ff, size: 14, speedY: -0.45, sway: 0.32, opacity: 0.85, seed: 1224,
  });
  root.add(snowfall.object);
  animators.push(t => snowfall.update(t));

  return {
    group: root,
    background: new T.Color(0x0b152a),
    fog: new T.FogExp2(0x101d36, 0.025),
    lighting: {
      hemiSky: 0xa4c6f8, hemiGround: 0x2c2535, hemiIntensity: 0.82,
      keyColor: 0xffe4bc, keyIntensity: 1.60, keyPos: [-2.8, 5.4, 3.9],
      rimColor: 0x9ac6ff, rimIntensity: 1.38, rimPos: [2.4, 4.2, -4.5],
      fillColor: 0xffb35e, fillIntensity: 0.72, fillPos: [-3.4, 2.2, -2.2],
      exposure: 1.08,
    },
    update(t) { for (const fn of animators) fn(t); },
  };
}

/**
 * ============================================================================
 * WORLD 3: GINGERBREAD BAKERY — "Parisian Terracotta Patisserie Atelier"
 * ============================================================================
 */
function buildBakeryWorld() {
  const root = new T.Group();
  const animators = [];

  const tiles = bakeryTileTextures();
  const wallPlaster = plasterTextures('bakery-terracotta', '#964532', '#703022', 4, 2);
  const bricks = brickTextures();
  const creamTrim = new T.MeshStandardMaterial({ color: 0xf2e5ce, roughness: 0.58 });
  const honeyOak = createWoodMaterial('bakery-oak', { base: [134, 88, 52], grain: [72, 42, 22], hi: [176, 126, 82], repeatX: 2, repeatY: 2 }, 0.48);
  const cocoaWood = createWoodMaterial('bakery-cocoa', { base: [68, 39, 25], grain: [30, 16, 10], hi: [102, 62, 40], repeatX: 2, repeatY: 2 }, 0.54);
  const copper = createBrassMaterial(0xdc8858, 0.22);
  const brass = createBrassMaterial(0xe0b464, 0.25);
  const marble = new T.MeshPhysicalMaterial({ color: 0xf5efe4, roughness: 0.18, metalness: 0.04, clearcoat: 0.45, envMapIntensity: 1.25 });
  const evergreen = new T.MeshStandardMaterial({ color: 0x224d38, roughness: 0.78 });
  const berry = new T.MeshPhysicalMaterial({ color: 0xb42228, roughness: 0.22, clearcoat: 0.85 });
  const velvet = new T.MeshPhysicalMaterial({ color: 0x85232b, roughness: 0.78, sheen: 0.6 });
  const glassMat = new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.20, roughness: 0.06, clearcoat: 1.0, depthWrite: false });
  const globeLightMat = new T.MeshStandardMaterial({ color: 0xfff4da, emissive: 0xffcc7e, emissiveIntensity: 1.75, roughness: 0.18 });

  const R = 5.95;
  const H = 5.38;

  // 1. Honed limestone & warm travertine diagonal patisserie tile floor
  const floorMat = new T.MeshStandardMaterial({
    map: tiles.map, roughnessMap: tiles.roughnessMap, bumpMap: tiles.bumpMap,
    bumpScale: 0.011, roughness: 0.50, metalness: 0.06, envMapIntensity: 1.15,
  });
  root.add(mesh(new T.PlaneGeometry(R * 2.15, R * 2.15), floorMat, {
    pos: [0, FLOOR_Y, 0], rot: [-Math.PI / 2, 0, Math.PI / 4], receive: true,
  }));

  // 2. Scalloped cream & cinnamon braided wool rug
  const rugTex = rugTexture('bakery', { base: '#f3e5cc', ring1: '#9c4331', ring2: '#c98e4b', accent: '#59301e' });
  root.add(mesh(new T.CylinderGeometry(1.76, 1.80, 0.022, 64), new T.MeshStandardMaterial({ map: rugTex, roughness: 0.90 }), {
    pos: [0, FLOOR_Y + 0.009, 0], receive: true,
  }));
  root.add(mesh(new T.TorusGeometry(1.77, 0.013, 8, 64), copper, { pos: [0, FLOOR_Y + 0.015, 0], rot: [Math.PI / 2, 0, 0] }));
  root.add(createContactShadow(1.38));

  // 3. Seamless terracotta limewash walls + cream raised-panel wainscoting + Parisian boiserie frames on ALL 4 walls!
  const wallMat = new T.MeshStandardMaterial({
    map: wallPlaster.map, bumpMap: wallPlaster.bumpMap, bumpScale: 0.016, roughness: 0.84, envMapIntensity: 0.72,
  });
  const wallZ = -R;
  root.add(mesh(new T.BoxGeometry(R * 2, 1.03, 0.18), wallMat, { pos: [0, FLOOR_Y + 0.515, wallZ] }));
  root.add(mesh(new T.BoxGeometry(R * 2, 1.18, 0.18), wallMat, { pos: [0, 4.24 + 0.59, wallZ] }));
  root.add(mesh(new T.BoxGeometry(1.75, 3.02, 0.18), wallMat, { pos: [-5.075, 2.73, wallZ] }));
  root.add(mesh(new T.BoxGeometry(7.35, 3.02, 0.18), wallMat, { pos: [2.275, 2.73, wallZ] }));

  root.add(mesh(new T.BoxGeometry(R * 2, H, 0.18), wallMat, { pos: [0, FLOOR_Y + H / 2, R] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [-R, FLOOR_Y + H / 2, 0] }));
  root.add(mesh(new T.BoxGeometry(0.18, H, R * 2), wallMat, { pos: [R, FLOOR_Y + H / 2, 0] }));

  for (let side = 0; side < 4; side++) {
    const wg = new T.Group();
    wg.rotation.y = (side * Math.PI) / 2;
    const z = -R + 0.10;
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.96, 0.06), creamTrim, { pos: [0, FLOOR_Y + 0.48, z] }));
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.075, 0.12), honeyOak, { pos: [0, FLOOR_Y + 0.98, z + 0.025] }));
    wg.add(mesh(new T.BoxGeometry(R * 2 - 0.1, 0.15, 0.10), cocoaWood, { pos: [0, FLOOR_Y + 0.075, z + 0.02] }));
    for (let x = -5.0; x <= 5.0; x += 1.25) {
      addBoiserieFrame(wg, x, FLOOR_Y + 0.52, z + 0.04, 0.96, 0.60, honeyOak);
    }
    wg.add(mesh(new T.BoxGeometry(R * 2, 0.20, 0.18), creamTrim, { pos: [0, FLOOR_Y + H - 0.10, z + 0.04] }));
    wg.add(mesh(new T.BoxGeometry(0.26, H, 0.26), creamTrim, { pos: [-R + 0.13, FLOOR_Y + H / 2, -R + 0.13] }));
    if (side !== 0) {
      for (const bx of [-3.6, 3.6]) addBoiserieFrame(wg, bx, 3.10, z + 0.015, 2.25, 2.48, creamTrim);
    }
    root.add(wg);
  }

  // Coffered cream ceiling + wood-grained honey-oak beams + milk-glass brass pendant globes
  root.add(mesh(new T.PlaneGeometry(R * 2.1, R * 2.1), creamTrim, { pos: [0, FLOOR_Y + H, 0], rot: [Math.PI / 2, 0, 0] }));
  for (let x = -3.8; x <= 3.8; x += 1.9) {
    root.add(mesh(new T.BoxGeometry(0.18, 0.22, R * 2), honeyOak, { pos: [x, FLOOR_Y + H - 0.11, 0] }));
  }
  for (const [px, pz] of [[-2.4, -2.2], [2.4, -2.2], [-2.4, 2.2], [2.4, 2.2]]) {
    root.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.9, 8), brass, { pos: [px, FLOOR_Y + H - 0.45, pz] }));
    root.add(mesh(new T.SphereGeometry(0.145, 16, 12), globeLightMat, { pos: [px, FLOOR_Y + H - 0.95, pz], receive: false }));
    addGlow(root, px, FLOOR_Y + H - 0.95, pz, 0xffd594, 0.92, 0.48);
  }

  // 4. HERO BACK-LEFT: Parisian Patisserie Shopfront Window + Painterly Dusk Street + Moravian Stars + Lit Garland
  const swGroup = new T.Group();
  const swX = -2.80, swW = 2.80, swH = 3.02;
  swGroup.position.set(swX, 2.73, wallZ);
  swGroup.add(mesh(new T.BoxGeometry(swW + 0.28, 0.16, 0.34), creamTrim, { pos: [0, -swH / 2 - 0.04, 0.08] }));
  swGroup.add(mesh(new T.BoxGeometry(swW + 0.38, 0.07, 0.44), honeyOak, { pos: [0, -swH / 2 - 0.10, 0.14] }));
  swGroup.add(mesh(new T.BoxGeometry(swW + 0.34, 0.18, 0.32), creamTrim, { pos: [0, swH / 2 + 0.05, 0.08] }));
  for (const sx of [-1, 1]) swGroup.add(mesh(new T.BoxGeometry(0.16, swH + 0.22, 0.30), creamTrim, { pos: [sx * (swW / 2 + 0.06), 0, 0.06] }));
  swGroup.add(mesh(new T.BoxGeometry(0.05, swH, 0.08), creamTrim, { pos: [0, 0, 0.02] }));
  swGroup.add(mesh(new T.BoxGeometry(swW, 0.05, 0.08), creamTrim, { pos: [0, 0.28, 0.02] }));

  // Painterly snowy dusk street vista behind the shopfront
  swGroup.add(mesh(new T.PlaneGeometry(5.6, 3.8), new T.MeshBasicMaterial({ map: alpineVistaTexture('bakery') }), {
    pos: [0, 0.06, -1.6], receive: false,
  }));
  const starLanternMat = new T.MeshStandardMaterial({ color: 0xfff4da, emissive: 0xffc872, emissiveIntensity: 1.65, roughness: 0.35 });
  for (const [sx, sy, sz, sr] of [[-0.72, 0.72, 0.18, 0.22], [0.06, 0.96, 0.16, 0.19], [0.76, 0.62, 0.20, 0.20]]) {
    swGroup.add(mesh(new T.CylinderGeometry(0.006, 0.006, 1.52 - sy, 6), brass, { pos: [sx, (1.52 + sy) / 2, sz] }));
    const lantern = new T.Group();
    lantern.position.set(sx, sy, sz);
    lantern.add(mesh(new T.OctahedronGeometry(sr, 0), starLanternMat, { receive: false }));
    lantern.add(mesh(new T.OctahedronGeometry(sr * 0.92, 0), starLanternMat, { rot: [Math.PI / 4, Math.PI / 4, 0], receive: false }));
    addGlow(lantern, 0, 0, 0, 0xffd284, sr * 4.8, 0.58);
    swGroup.add(lantern);
  }
  const swGarland = createPineGarland(swW + 0.40, 0.18, evergreen, berry, true);
  swGarland.position.set(0, swH / 2 + 0.14, 0.24);
  swGroup.add(swGarland);
  swGroup.add(mesh(new T.PlaneGeometry(swW - 0.06, swH - 0.06), glassMat, { pos: [0, 0, 0.01], receive: false }));
  root.add(swGroup);

  const bakerySnow = createParticleField({
    count: 95, bounds: [swX - 1.5, swX + 1.5, 1.25, 4.3, wallZ - 1.45, wallZ - 0.18],
    color: 0xe3f0ff, size: 12, speedY: -0.38, sway: 0.12, opacity: 0.80, seed: 991,
  });
  root.add(bakerySnow.object);
  animators.push(t => bakerySnow.update(t));

  // 5. HERO BACK-RIGHT: Sculpted Kiln-Brick Arched Patisserie Oven + Copper Hood + Marble Cake Counter
  const ovenGroup = new T.Group();
  ovenGroup.position.set(2.80, FLOOR_Y, wallZ + 0.46);
  const brickMat = new T.MeshStandardMaterial({ map: bricks.map, bumpMap: bricks.bumpMap, bumpScale: 0.024, roughness: 0.84 });

  // Cream panelled base cabinetry + thick veined marble counter
  ovenGroup.add(mesh(new T.BoxGeometry(2.62, 0.98, 0.98), creamTrim, { pos: [0, 0.49, 0.06] }));
  for (const bx of [-0.78, 0.78]) addBoiserieFrame(ovenGroup, bx, 0.49, 0.56, 0.86, 0.68, honeyOak);
  ovenGroup.add(mesh(new T.BoxGeometry(2.74, 0.085, 1.06), marble, { pos: [0, 1.02, 0.08] }));

  // Textured kiln-fired brick oven body + stone voussoir arch surround!
  ovenGroup.add(mesh(new T.BoxGeometry(2.26, 1.42, 0.86), brickMat, { pos: [0, 1.75, -0.02] }));
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * Math.PI;
    ovenGroup.add(mesh(new T.BoxGeometry(0.15, 0.20, 0.14), creamTrim, {
      pos: [Math.cos(a) * 0.54, 1.48 + Math.sin(a) * 0.44, 0.40], rot: [0, 0, a - Math.PI / 2],
    }));
  }
  // Deep recessed glowing oven baking chamber + warm baked golden loaves inside!
  ovenGroup.add(mesh(new T.BoxGeometry(0.96, 0.64, 0.20), new T.MeshStandardMaterial({ color: 0x2a1008, roughness: 0.9 }), { pos: [0, 1.38, 0.34] }));
  ovenGroup.add(mesh(new T.PlaneGeometry(0.88, 0.52), new T.MeshBasicMaterial({ color: 0xff8a2c }), { pos: [0, 1.36, 0.42], receive: false }));
  for (const lx of [-0.22, 0.20]) {
    ovenGroup.add(mesh(new T.SphereGeometry(0.12, 12, 8), new T.MeshStandardMaterial({ color: 0xc27732, roughness: 0.72 }), {
      pos: [lx, 1.15, 0.42], scale: [1.3, 0.65, 0.9],
    }));
  }
  const ovenHalo = addGlow(ovenGroup, 0, 1.44, 0.54, 0xff9438, 1.55, 0.58);

  // Riveted brushed-copper range hood + brass rim + hanging copper pots
  ovenGroup.add(mesh(new T.CylinderGeometry(0.42, 1.24, 1.18, 4), copper, { pos: [0, 3.04, 0.05], rot: [0, Math.PI / 4, 0] }));
  ovenGroup.add(mesh(new T.BoxGeometry(1.78, 0.08, 1.78), brass, { pos: [0, 2.48, 0.05] }));
  ovenGroup.add(mesh(new T.CylinderGeometry(0.32, 0.36, 1.78, 4), copper, { pos: [0, 4.48, 0.05], rot: [0, Math.PI / 4, 0] }));
  ovenGroup.add(mesh(new T.CylinderGeometry(0.016, 0.016, 1.88, 8), brass, { pos: [0, 2.44, 0.52], rot: [0, 0, Math.PI / 2] }));
  for (const px of [-0.62, -0.22, 0.24, 0.62]) {
    ovenGroup.add(mesh(new T.CylinderGeometry(0.11, 0.11, 0.036, 16), copper, { pos: [px, 2.16, 0.53], rot: [Math.PI / 2, 0, 0] }));
    ovenGroup.add(mesh(new T.CylinderGeometry(0.012, 0.012, 0.16, 6), brass, { pos: [px, 2.34, 0.53] }));
  }
  // 2-tier holiday cake under a glass cloche on the marble counter!
  ovenGroup.add(mesh(new T.CylinderGeometry(0.24, 0.26, 0.03, 18), brass, { pos: [-0.88, 1.10, 0.30] }));
  ovenGroup.add(mesh(new T.CylinderGeometry(0.18, 0.19, 0.16, 18), new T.MeshStandardMaterial({ color: 0x6b3b24, roughness: 0.7 }), { pos: [-0.88, 1.20, 0.30] }));
  ovenGroup.add(mesh(new T.CylinderGeometry(0.185, 0.185, 0.04, 18), creamTrim, { pos: [-0.88, 1.29, 0.30] }));
  ovenGroup.add(mesh(new T.SphereGeometry(0.23, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), glassMat, { pos: [-0.88, 1.12, 0.30], scale: [1, 1.3, 1], receive: false }));

  const ovenLight = new T.PointLight(0xff903d, 3.6, 8.8, 1.5);
  ovenLight.position.set(2.80, 1.68, wallZ + 1.22);
  root.add(ovenLight, ovenGroup);
  animators.push(t => {
    const glow = 0.92 + 0.08 * Math.sin(t * 5.6) + 0.04 * Math.cos(t * 11.2);
    ovenLight.intensity = 3.5 * glow;
    ovenHalo.material.opacity = 0.54 * glow;
  });

  // 6. RIGHT WALL (+X): Artisan Patisserie Display Showcase & Lit Shelving
  const shelfGroup = new T.Group();
  shelfGroup.position.set(R - 0.48, FLOOR_Y, 0);
  shelfGroup.rotation.y = -Math.PI / 2;
  shelfGroup.add(mesh(new T.BoxGeometry(3.5, 0.96, 0.72), honeyOak, { pos: [0, 0.48, 0] }));
  shelfGroup.add(mesh(new T.BoxGeometry(3.64, 0.08, 0.80), marble, { pos: [0, 1.0, 0.02] }));
  shelfGroup.add(mesh(new T.BoxGeometry(1.85, 0.70, 0.58), glassMat, { pos: [-0.62, 1.39, 0.04], receive: false }));
  for (const cx of [-1.52, 0.28]) {
    for (const cz of [-0.23, 0.31]) shelfGroup.add(mesh(new T.CylinderGeometry(0.015, 0.015, 0.72, 8), brass, { pos: [cx, 1.39, cz] }));
  }
  const pastryColors = [0xf4d5c6, 0xb83b3b, 0xe8ba68, 0x5c3422];
  for (let i = 0; i < 4; i++) {
    shelfGroup.add(mesh(new T.CylinderGeometry(0.14, 0.15, 0.14, 14), new T.MeshStandardMaterial({ color: pastryColors[i], roughness: 0.52 }), {
      pos: [-1.24 + i * 0.41, 1.12, 0.06],
    }));
  }
  for (const sy of [2.15, 2.98]) {
    shelfGroup.add(mesh(new T.BoxGeometry(3.4, 0.085, 0.46), honeyOak, { pos: [0, sy, -0.10] }));
    addLightWash(shelfGroup, 0, sy + 0.36, -0.28, 3.0, 0.78, 0xffd188, 0.30);
    for (let j = -2; j <= 2; j++) {
      if (j % 2 === 0) {
        shelfGroup.add(mesh(new T.CylinderGeometry(0.11, 0.11, 0.26, 14), glassMat, { pos: [j * 0.58, sy + 0.18, -0.08], receive: false }));
        shelfGroup.add(mesh(new T.CylinderGeometry(0.09, 0.09, 0.16, 12), new T.MeshStandardMaterial({ color: 0x9c5b2e, roughness: 0.8 }), { pos: [j * 0.58, sy + 0.13, -0.08] }));
        shelfGroup.add(mesh(new T.SphereGeometry(0.04, 10, 8), brass, { pos: [j * 0.58, sy + 0.33, -0.08] }));
      } else {
        shelfGroup.add(mesh(new T.BoxGeometry(0.32, 0.22, 0.26), creamTrim, { pos: [j * 0.58, sy + 0.15, -0.08] }));
        shelfGroup.add(mesh(new T.BoxGeometry(0.34, 0.05, 0.28), velvet, { pos: [j * 0.58, sy + 0.26, -0.08] }));
      }
    }
  }
  const bsR1 = createWallSconce(brass, globeLightMat, 0xffcc7e); bsR1.position.set(-2.55, 2.72, -0.30);
  const bsR2 = createWallSconce(brass, globeLightMat, 0xffcc7e); bsR2.position.set(2.55, 2.72, -0.30);
  shelfGroup.add(bsR1, bsR2);
  root.add(shelfGroup);

  // 7. LEFT WALL (-X): Marble Café Bistro Table + Bentwood Chairs + Vintage Patisserie Chalkboard Menu + Sconces
  const cafeGroup = new T.Group();
  cafeGroup.position.set(-R + 0.92, FLOOR_Y, 0.2);
  cafeGroup.rotation.y = Math.PI / 2;
  cafeGroup.add(mesh(new T.CylinderGeometry(0.58, 0.58, 0.048, 28), marble, { pos: [0, 0.84, 0] }));
  cafeGroup.add(mesh(new T.CylinderGeometry(0.04, 0.06, 0.82, 12), brass, { pos: [0, 0.42, 0] }));
  cafeGroup.add(mesh(new T.CylinderGeometry(0.28, 0.32, 0.04, 20), brass, { pos: [0, 0.02, 0] }));
  const tableCandle = createCandle(0.17, 0.028, brass, creamTrim, new T.MeshBasicMaterial({ color: 0xffd584 }));
  tableCandle.group.position.set(0.06, 0.86, 0);
  cafeGroup.add(tableCandle.group);
  for (const cx of [-0.76, 0.76]) {
    const ch = new T.Group();
    ch.position.set(cx, 0, 0);
    ch.rotation.y = cx < 0 ? 0.28 : -0.28;
    ch.add(mesh(new T.CylinderGeometry(0.24, 0.24, 0.04, 18), honeyOak, { pos: [0, 0.50, 0] }));
    for (const [lx, lz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
      ch.add(mesh(new T.CylinderGeometry(0.018, 0.016, 0.50, 8), cocoaWood, { pos: [lx, 0.25, lz] }));
    }
    ch.add(mesh(new T.TorusGeometry(0.22, 0.02, 8, 20, Math.PI), cocoaWood, { pos: [cx < 0 ? -0.20 : 0.20, 0.84, 0], rot: [0, Math.PI / 2, 0] }));
    cafeGroup.add(ch);
  }
  // Vintage gold-framed French patisserie chalkboard menu on the left wall!
  const menuMat = new T.MeshStandardMaterial({
    map: signTexture('Pâtisserie de Noël', 'Gingerbread · Stollen · Spiced Cocoa', { bg: '#201918', border: '#e0b464', fg: '#f8ebd2' }),
    roughness: 0.72,
  });
  cafeGroup.add(mesh(new T.BoxGeometry(1.76, 0.96, 0.06), brass, { pos: [0, 2.86, -0.74] }));
  cafeGroup.add(mesh(new T.PlaneGeometry(1.62, 0.82), menuMat, { pos: [0, 2.86, -0.70] }));
  const bsL1 = createWallSconce(brass, globeLightMat, 0xffcc7e); bsL1.position.set(-2.35, 2.72, -0.75);
  const bsL2 = createWallSconce(brass, globeLightMat, 0xffcc7e); bsL2.position.set(2.35, 2.72, -0.75);
  cafeGroup.add(bsL1, bsL2);
  root.add(cafeGroup);

  // 8. FRONT WALL (+Z, behind camera): Cream & Glass Patisserie Double Entrance Door + Wreath + Sconces
  const doorGroup = new T.Group();
  doorGroup.position.set(0, FLOOR_Y, R - 0.18);
  doorGroup.rotation.y = Math.PI;
  doorGroup.add(mesh(new T.BoxGeometry(2.18, 3.40, 0.16), creamTrim, { pos: [0, 1.70, 0] }));
  doorGroup.add(mesh(new T.BoxGeometry(2.40, 0.16, 0.24), honeyOak, { pos: [0, 3.44, 0.02] }));
  for (const dx of [-0.48, 0.48]) {
    doorGroup.add(mesh(new T.BoxGeometry(0.74, 1.58, 0.05), new T.MeshStandardMaterial({ map: alpineVistaTexture('bakery'), roughness: 0.25 }), {
      pos: [dx, 2.28, 0.08],
    }));
    doorGroup.add(mesh(new T.CylinderGeometry(0.018, 0.018, 0.42, 8), brass, { pos: [dx > 0 ? 0.12 : -0.12, 1.44, 0.15] }));
  }
  const bWreath = createWreath(0.45, evergreen, berry, velvet);
  bWreath.position.set(0, 2.40, 0.16);
  doorGroup.add(bWreath);
  for (const sx of [-1.95, 1.95]) {
    const sc = createWallSconce(brass, globeLightMat, 0xffcc7e);
    sc.position.set(sx, 2.72, 0.06);
    doorGroup.add(sc);
  }
  root.add(doorGroup);

  // Warm side & back wall point lights so 360° orbit feels warmly enveloped
  const bakeryLeftLight = new T.PointLight(0xffc982, 2.3, 7.6, 1.45); bakeryLeftLight.position.set(-R + 1.35, 2.55, 0);
  const bakeryBackLight = new T.PointLight(0xffc982, 2.0, 7.6, 1.45); bakeryBackLight.position.set(0, 2.85, R - 1.35);
  root.add(bakeryLeftLight, bakeryBackLight);

  const motes = createParticleField({
    count: 65, bounds: [-3.4, 3.4, 0.5, 4.3, -3.4, 3.4],
    color: 0xffdc9a, size: 9, speedY: 0.08, sway: 0.22, opacity: 0.46, seed: 707,
  });
  root.add(motes.object);
  animators.push(t => motes.update(t));

  return {
    group: root,
    background: new T.Color(0x28130e),
    fog: new T.FogExp2(0x2d1610, 0.021),
    lighting: {
      hemiSky: 0xfff0d9, hemiGround: 0x5c3020, hemiIntensity: 0.85,
      keyColor: 0xffe8c4, keyIntensity: 1.75, keyPos: [-2.5, 5.2, 3.8],
      rimColor: 0xa4c9ff, rimIntensity: 0.96, rimPos: [-3.2, 3.0, -3.8],
      fillColor: 0xffaa5e, fillIntensity: 0.72, fillPos: [3.2, 2.4, -2.5],
      exposure: 1.09,
    },
    update(t) { for (const fn of animators) fn(t); },
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
