import * as T from './vendor/three.js';
import { trees } from '../scene.js';
import { STAGE_Y } from './worlds.js';

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a true 3D volumetric conifer shoot (bottlebrush rosette of 3D tapered
 * needle blades radiating 360° around a central axis — NEVER a flat card from any angle!).
 * Vertex colors encode natural botanical shading from darker inner stem to brighter tips.
 */
function createConiferShootGeometry() {
  const positions = [];
  const normals = [];
  const colors = [];

  const pushTri = (a, b, c, ca, cb, cc) => {
    const ab = new T.Vector3().subVectors(b, a);
    const ac = new T.Vector3().subVectors(c, a);
    const n = new T.Vector3().crossVectors(ab, ac).normalize();
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    normals.push(n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z);
    colors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b);
  };

  // Helper: add a 3D folded V-ridge needle tuft (2 angled faces forming real 3D volume)
  const addNeedleTuft = (origin, dir, up, length, width, thickness, cBase, cTip) => {
    const fwd = dir.clone().normalize();
    const right = new T.Vector3().crossVectors(fwd, up);
    if (right.lengthSq() < 1e-4) right.set(1, 0, 0);
    right.normalize();
    const realUp = new T.Vector3().crossVectors(right, fwd).normalize();

    const mid = origin.clone().addScaledVector(fwd, length * 0.42);
    const tip = origin.clone().addScaledVector(fwd, length);
    const leftPt = mid.clone().addScaledVector(right, -width * 0.5).addScaledVector(realUp, -thickness * 0.3);
    const rightPt = mid.clone().addScaledVector(right, width * 0.5).addScaledVector(realUp, -thickness * 0.3);
    const ridgePt = mid.clone().addScaledVector(realUp, thickness);

    const cMid = cBase.clone().lerp(cTip, 0.52);

    // 4 faces forming a solid 3D diamond-prism needle cluster (visible & volumetric from all 360°)
    pushTri(origin, leftPt, ridgePt, cBase, cMid, cMid);
    pushTri(origin, ridgePt, rightPt, cBase, cMid, cMid);
    pushTri(leftPt, tip, ridgePt, cMid, cTip, cMid);
    pushTri(ridgePt, tip, rightPt, cMid, cTip, cMid);
  };

  const stemCol = new T.Color(0x526348);
  const tipCol = new T.Color(0xd2e4b8);
  const upRef = new T.Vector3(0, 1, 0);

  // Build 4 staggered 3D needle whorls along local +Z shoot axis (z from 0 to 1.0)
  const rings = [
    { z: 0.04, count: 5, len: 0.52, spread: 0.82, width: 0.22, thick: 0.075, phase: 0.0 },
    { z: 0.28, count: 6, len: 0.54, spread: 0.72, width: 0.21, thick: 0.070, phase: 0.52 },
    { z: 0.54, count: 5, len: 0.46, spread: 0.56, width: 0.18, thick: 0.062, phase: 0.25 },
    { z: 0.78, count: 4, len: 0.36, spread: 0.34, width: 0.15, thick: 0.052, phase: 0.78 },
  ];

  for (const ring of rings) {
    const o = new T.Vector3(0, 0, ring.z);
    for (let i = 0; i < ring.count; i++) {
      const a = ring.phase + (i / ring.count) * Math.PI * 2;
      const radial = Math.sin(ring.spread);
      const forward = Math.cos(ring.spread);
      const dir = new T.Vector3(Math.cos(a) * radial, Math.sin(a) * radial, forward);
      addNeedleTuft(o, dir, upRef, ring.len, ring.width, ring.thick, stemCol, tipCol);
    }
  }
  // Leading tip shoot
  addNeedleTuft(
    new T.Vector3(0, 0, 0.82),
    new T.Vector3(0, 0.06, 1),
    upRef,
    0.34,
    0.15,
    0.055,
    stemCol,
    tipCol
  );

  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Delicate irregular 3D frost/snow drift ribbon clinging along outer spruce twigs.
 */
function createSnowFlockGeometry() {
  const geo = new T.IcosahedronGeometry(0.048, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const bump = 1 + 0.28 * Math.sin(x * 37 + z * 29) * Math.cos(y * 31);
    // Slender organic ridge clinging along the twig (+Z), never a round pancake!
    pos.setXYZ(i, x * 1.15 * bump, y * 0.42 * bump, z * 1.95 * bump);
  }
  geo.computeVertexNormals();
  return geo;
}

let sharedShootGeo = null;
let sharedSnowGeo = null;
let sharedTwigGeo = null;

function getSharedGeos() {
  if (!sharedShootGeo) sharedShootGeo = createConiferShootGeometry();
  if (!sharedSnowGeo) sharedSnowGeo = createSnowFlockGeometry();
  if (!sharedTwigGeo) {
    sharedTwigGeo = new T.CylinderGeometry(0.012, 0.032, 1.0, 6);
    sharedTwigGeo.translate(0, 0.5, 0);
    sharedTwigGeo.rotateX(Math.PI / 2); // align along +Z so lookAt aims twigs outward!
  }
  return { shootGeo: sharedShootGeo, snowGeo: sharedSnowGeo, twigGeo: sharedTwigGeo };
}

/**
 * Procedural bark texture for the central trunk & inner branches.
 */
let cachedBarkTex = null;
function barkTexture() {
  if (cachedBarkTex) return cachedBarkTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d');
  const rand = seeded(611);
  ctx.fillStyle = '#3a2417';
  ctx.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 260; i++) {
    const x = rand() * 128;
    const y = rand() * 256;
    const h = 14 + rand() * 34;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(22,12,7,0.45)' : 'rgba(92,62,40,0.32)';
    ctx.fillRect(x, y, 2 + rand() * 4, h);
  }
  const tex = new T.CanvasTexture(c);
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(2, 4);
  tex.colorSpace = T.SRGBColorSpace;
  cachedBarkTex = tex;
  return tex;
}

/**
 * Species visual & botanical profiles.
 */
const SPECIES = {
  pine: {
    seed: 1224,
    innerCol: new T.Color(0x142c1d),
    midCol: new T.Color(0x234c30),
    tipCol: new T.Color(0x427546),
    roughness: 0.74,
    tiers: 17,
    branchesPerBase: 14,
    droop: 0.24,
    tipLift: 0.14,
    shootScale: 0.24,
    snowy: false,
  },
  fir: {
    seed: 2025,
    innerCol: new T.Color(0x102721),
    midCol: new T.Color(0x1c463b),
    tipCol: new T.Color(0x316955),
    roughness: 0.70,
    tiers: 20,
    branchesPerBase: 12,
    droop: 0.20,
    tipLift: 0.18,
    shootScale: 0.215,
    snowy: false,
  },
  spruce: {
    seed: 3119,
    innerCol: new T.Color(0x163030),
    midCol: new T.Color(0x285452),
    tipCol: new T.Color(0x4b7d78),
    roughness: 0.64,
    tiers: 18,
    branchesPerBase: 13,
    droop: 0.26,
    tipLift: 0.13,
    shootScale: 0.23,
    snowy: true,
  },
};

/**
 * Build a true 3D volumetric Christmas tree aligned precisely to the project's
 * ornament anchor envelope (base y=0.22..0.52, foliage y=0.56..3.40, topper y=3.41).
 */
export function buildVolumetricTree(key, branchSites = []) {
  const spec = SPECIES[key] || SPECIES.pine;
  const rand = seeded(spec.seed);
  const { shootGeo, snowGeo, twigGeo } = getSharedGeos();

  const wScale = trees[key].width / trees.pine.width;
  const hScale = (728 - trees[key].top) / (728 - trees.pine.top);

  const root = new T.Group();
  root.name = 'VolumetricTree_' + key;

  // 1. Handcrafted dark bark central trunk (hidden deep inside foliage, glimpsed organically between boughs)
  const barkMat = new T.MeshStandardMaterial({
    map: barkTexture(),
    roughness: 0.90,
    metalness: 0.02,
  });
  const trunkH = 3.16 * hScale;
  const trunk = new T.Mesh(new T.CylinderGeometry(0.032, 0.135, trunkH, 12), barkMat);
  trunk.position.y = STAGE_Y + trunkH * 0.5;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  root.add(trunk);

  // Dark woody base soil + inner woven willow basket rim peeking cleanly above the pleated collar
  const soilMat = new T.MeshStandardMaterial({ color: 0x221710, roughness: 0.95 });
  const soil = new T.Mesh(new T.CylinderGeometry(0.36, 0.36, 0.04, 24), soilMat);
  soil.position.y = STAGE_Y + 0.20;
  root.add(soil);

  // 2. Sculpted inner shadow-evergreen core bough volume (ensures 100% lush density from every angle, zero see-through gaps)
  const coreMat = new T.MeshStandardMaterial({
    color: spec.innerCol,
    roughness: 0.88,
    metalness: 0.0,
    envMapIntensity: 0.45,
  });
  const coreTiers = 7;
  for (let i = 0; i < coreTiers; i++) {
    const f = i / (coreTiers - 1);
    const cy = (0.76 + f * 2.24) * hScale;
    const cr = (0.76 * Math.pow(1 - f, 0.84) + 0.08) * wScale;
    const ch = (0.58 - f * 0.22) * hScale;
    const cone = new T.Mesh(new T.ConeGeometry(cr, ch, 11), coreMat);
    cone.position.y = cy;
    cone.rotation.y = i * 0.9;
    cone.castShadow = true;
    cone.receiveShadow = true;
    root.add(cone);
  }

  // 3. Collect woody branches, 3D conifer shoots, and optional snow flock transforms
  const branchMatrices = [];
  const shootTransforms = []; // { pos, target, scale, color }
  const snowTransforms = [];  // { pos, rotY, scale }

  const dummy = new T.Object3D();
  const vPos = new T.Vector3();
  const vTip = new T.Vector3();
  const vDir = new T.Vector3();
  const vSide = new T.Vector3();
  const upVec = new T.Vector3(0, 1, 0);

  const envelopeRadius = f => (1.16 * Math.pow(Math.max(0.01, 1 - f), 0.85) + 0.05) * wScale;

  // Generate botanical whorls from bottom skirt to spire crown
  for (let t = 0; t < spec.tiers; t++) {
    const f = t / (spec.tiers - 1);
    const yBase = (0.66 + f * 2.66) * hScale;
    const maxR = envelopeRadius(f);
    const count = Math.max(4, Math.round(spec.branchesPerBase * (1 - f * 0.68)));
    const whorlPhase = t * 2.399963 + (rand() - 0.5) * 0.22; // golden-angle phyllotaxis!

    for (let b = 0; b < count; b++) {
      const a = whorlPhase + (b / count) * Math.PI * 2 + (rand() - 0.5) * 0.18;
      const len = maxR * (0.86 + rand() * 0.21);
      const droopAmt = spec.droop * (1 - f * 0.65) * (0.85 + rand() * 0.35);

      const startY = yBase + 0.14 * (1 - f * 0.5) * hScale;
      const endY = yBase - droopAmt * 0.45 * hScale + (rand() - 0.5) * 0.04;
      const cosA = Math.cos(a);
      const sinA = Math.sin(a);

      // Primary woody branch
      vPos.set(cosA * 0.04, startY, sinA * 0.04);
      vTip.set(cosA * len * 0.84, endY, sinA * len * 0.84);
      dummy.position.copy(vPos);
      dummy.lookAt(vTip);
      const bLen = vPos.distanceTo(vTip);
      dummy.scale.set(1 - f * 0.45, 1 - f * 0.45, bLen);
      dummy.updateMatrix();
      branchMatrices.push(dummy.matrix.clone());

      // Populate lush 3D needle shoots along the arching branch + forked lateral twigs!
      const segments = Math.max(3, Math.round(6 * (1 - f * 0.45)));
      for (let s = 0; s <= segments; s++) {
        const u = 0.22 + (s / segments) * 0.78;
        // Graceful botanical curve: dips slightly in middle, lifts subtly at the tip!
        const sag = -Math.sin(u * Math.PI) * droopAmt * 0.42 + Math.pow(u, 2.4) * spec.tipLift * (1 - f * 0.4);
        const rHere = len * u;
        const py = startY * (1 - u) + endY * u + sag * hScale;
        const px = cosA * rHere;
        const pz = sinA * rHere;

        vDir.set(cosA, -droopAmt * 0.3 + u * spec.tipLift * 1.4, sinA).normalize();
        vSide.crossVectors(vDir, upVec).normalize();

        // Central shoot along the bough + 2 lateral fanned sub-shoots (3D forked spray!)
        const fanOffsets = u > 0.85 ? [0] : [-1, 0, 1];
        for (const side of fanOffsets) {
          const latAngle = side * (0.48 + rand() * 0.22);
          const sp = new T.Vector3(px, py, pz);
          if (side !== 0) {
            sp.addScaledVector(vSide, side * (0.04 + (1 - f) * 0.06));
          }
          const dir = vDir.clone()
            .addScaledVector(vSide, Math.sin(latAngle) * 0.72)
            .addScaledVector(upVec, (rand() - 0.35) * 0.24)
            .normalize();

          const tipFactor = Math.min(1, u * 0.75 + (side === 0 ? 0.15 : 0.08) + f * 0.12);
          const col = spec.innerCol.clone().lerp(spec.midCol, Math.min(1, tipFactor * 1.35));
          if (tipFactor > 0.55) {
            col.lerp(spec.tipCol, (tipFactor - 0.55) / 0.45);
          }
          // Subtle organic hue/value variation per shoot
          const vJitter = (rand() - 0.5) * 0.08;
          col.offsetHSL((rand() - 0.5) * 0.025, (rand() - 0.5) * 0.06, vJitter);

          // For Snowy Spruce: naturally frost the outermost upper needle tips into crisp alpine snow-frost!
          if (spec.snowy && u > 0.62) {
            const frostAmt = Math.min(0.88, ((u - 0.62) / 0.38) * (0.48 + rand() * 0.44));
            col.lerp(new T.Color(0xdce8f4), frostAmt);
          }

          const sc = spec.shootScale * (1.18 - f * 0.46) * (0.82 + rand() * 0.38) * (side === 0 ? 1.05 : 0.88);
          shootTransforms.push({
            pos: sp,
            target: sp.clone().add(dir),
            roll: rand() * Math.PI * 2,
            scale: new T.Vector3(sc * wScale * 0.96, sc * 0.94, sc * (1.06 + rand() * 0.22)),
            color: col,
          });

          // Delicate granular frost crystals clinging along the upper ridge of outer spruce twigs
          if (spec.snowy && u > 0.74 && side === 0 && rand() < 0.45) {
            snowTransforms.push({
              pos: new T.Vector3(
                sp.x + dir.x * sc * 0.54,
                sp.y + dir.y * sc * 0.36 + 0.022,
                sp.z + dir.z * sc * 0.54
              ),
              target: sp.clone().add(dir),
              scale: (0.65 + rand() * 0.55) * (1.05 - f * 0.42) * wScale,
            });
          }
        }
      }
    }
  }

  // 4. Add dedicated sculpted outer tip tufts hugging actual ornament anchor sites
  //    so every single ornament hangs nestled against lush real 3D needles!
  for (let i = 0; i < branchSites.length; i++) {
    const s = branchSites[i];
    const sx = s.pos.x * wScale;
    const sy = s.pos.y * hScale;
    const sz = s.pos.z * wScale;
    const a = Math.atan2(sz, sx);
    const r = Math.hypot(sx, sz);
    const f = Math.max(0, Math.min(1, (s.pos.y - 0.65) / 2.65));

    // Place a pair of lush tip shoots originating slightly inward so needles cradle the ornament
    for (const offset of [-0.14, 0.14]) {
      const sp = new T.Vector3(
        Math.cos(a + offset) * (r * 0.78),
        sy + 0.03,
        Math.sin(a + offset) * (r * 0.78)
      );
      const dir = new T.Vector3(Math.cos(a + offset * 0.4), -0.08, Math.sin(a + offset * 0.4)).normalize();
      const sc = spec.shootScale * (1.06 - f * 0.38);
      const col = spec.midCol.clone().lerp(spec.tipCol, 0.58 + rand() * 0.32);
      if (spec.snowy) col.lerp(new T.Color(0xdce8f4), 0.35 + rand() * 0.35);
      shootTransforms.push({
        pos: sp,
        target: sp.clone().add(dir),
        roll: rand() * Math.PI * 2,
        scale: new T.Vector3(sc * wScale, sc, sc * 1.15),
        color: col,
      });
    }
  }

  // 5. Sculpted spire crown shoots encircling the topper base (y ~ 3.22..3.40)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const sp = new T.Vector3(Math.cos(a) * 0.03, 3.24 * hScale, Math.sin(a) * 0.03);
    const dir = new T.Vector3(Math.cos(a) * 0.45, 0.88, Math.sin(a) * 0.45).normalize();
    const sc = spec.shootScale * 0.62;
    shootTransforms.push({
      pos: sp,
      target: sp.clone().add(dir),
      roll: a,
      scale: new T.Vector3(sc, sc, sc * 1.2),
      color: spec.tipCol.clone(),
    });
  }

  // Build InstancedMesh for woody branches
  const branchMesh = new T.InstancedMesh(twigGeo, barkMat, branchMatrices.length);
  branchMatrices.forEach((m, idx) => branchMesh.setMatrixAt(idx, m));
  branchMesh.instanceMatrix.needsUpdate = true;
  branchMesh.receiveShadow = true;
  root.add(branchMesh);

  // Build InstancedMesh for ALL 3D volumetric conifer shoots (1 single draw call!)
  const needleMat = new T.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: spec.roughness,
    metalness: 0.02,
    envMapIntensity: spec.snowy ? 0.95 : 0.72,
    emissive: new T.Color(0x1f361e),
    emissiveIntensity: 0.14,
  });
  const shootMesh = new T.InstancedMesh(shootGeo, needleMat, shootTransforms.length);
  for (let i = 0; i < shootTransforms.length; i++) {
    const item = shootTransforms[i];
    dummy.position.copy(item.pos);
    dummy.lookAt(item.target);
    dummy.rotateZ(item.roll);
    dummy.scale.copy(item.scale);
    dummy.updateMatrix();
    shootMesh.setMatrixAt(i, dummy.matrix);
    shootMesh.setColorAt(i, item.color);
  }
  shootMesh.instanceMatrix.needsUpdate = true;
  shootMesh.instanceColor.needsUpdate = true;
  shootMesh.castShadow = true;
  shootMesh.receiveShadow = true;
  root.add(shootMesh);

  // Build InstancedMesh for Snowy Spruce 3D snow cushions
  if (spec.snowy && snowTransforms.length > 0) {
    const snowMat = new T.MeshPhysicalMaterial({
      color: 0xf1f6fd,
      roughness: 0.52,
      metalness: 0.04,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.15,
      emissive: new T.Color(0x5d7aa0),
      emissiveIntensity: 0.08,
    });
    const snowMesh = new T.InstancedMesh(snowGeo, snowMat, snowTransforms.length);
    for (let i = 0; i < snowTransforms.length; i++) {
      const sn = snowTransforms[i];
      dummy.position.copy(sn.pos);
      dummy.lookAt(sn.target);
      dummy.scale.setScalar(sn.scale);
      dummy.updateMatrix();
      snowMesh.setMatrixAt(i, dummy.matrix);
    }
    snowMesh.instanceMatrix.needsUpdate = true;
    snowMesh.receiveShadow = true;
    root.add(snowMesh);
  }

  // Expose needle material so renderLights() can gently warm the foliage when fairy lights turn on!
  root.userData.needleMats = [needleMat];
  return root;
}
