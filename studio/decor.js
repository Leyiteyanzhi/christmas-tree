import * as T from './vendor/three.js';
import { glowSpriteTexture } from './textures.js';
import { STAGE_Y } from './worlds.js';

const WARM_BULBS = [0xffe7aa, 0xffd17a, 0xfff2cf, 0xffc666];
const COLOUR_BULBS = [0xff6857, 0xffcb66, 0x62d6b6, 0x7aaeff, 0xff9fbe];
const OFF_BULB = 0x5c5347;

/**
 * Upgrade loaded tree GLB materials so the hand-painted needles react gracefully
 * to cinematic lighting instead of looking flatly self-illuminated.
 */
export function enhanceTree(model, key) {
  const needleMats = [];
  model.traverse(node => {
    if (!node.isMesh || !node.material) return;
    node.castShadow = true;
    node.receiveShadow = true;
    const mat = node.material;
    if (mat.isMeshStandardMaterial) {
      mat.roughness = key === 'spruce' ? 0.68 : 0.80;
      mat.metalness = key === 'spruce' ? 0.06 : 0.02;
      mat.envMapIntensity = key === 'spruce' ? 0.95 : 0.68;
      if (mat.alphaTest > 0 || mat.transparent) {
        mat.alphaTest = 0.34;
        mat.transparent = false;
      }
      if (mat.emissiveMap || (mat.emissive && mat.emissiveIntensity > 0)) {
        mat.emissiveIntensity = 0.11;
        needleMats.push(mat);
      }
      mat.needsUpdate = true;
    }
  });
  model.userData.needleMats = needleMats;
}

/**
 * Upgrade loaded ornament GLB materials into tactile PBR/Physical craft finishes
 * (lacquered glass baubles, crystal icicles, antique brass, velvet, painted wood).
 */
export function enhanceOrnament(model, key, category) {
  const metallicSet = new Set(['gold', 'silver', 'star', 'bell', 'pinecone']);
  const crystalSet = new Set(['icicle', 'ice-star']);
  const velvetSet = new Set(['bow', 'wreath', 'cardinal']);

  model.traverse(node => {
    if (!node.isMesh || !node.material) return;
    node.castShadow = true;
    node.receiveShadow = true;

    const src = node.material;
    const baseOpts = {
      map: src.map || null,
      alphaMap: src.alphaMap || null,
      alphaTest: src.alphaTest || (src.transparent ? 0.32 : 0),
      transparent: false,
      side: src.side,
      color: src.color ? src.color.clone() : new T.Color(0xffffff),
    };

    let mat;
    if (category === 'ball') {
      const isMetal = key === 'gold' || key === 'silver';
      mat = new T.MeshPhysicalMaterial({
        ...baseOpts,
        metalness: isMetal ? 0.62 : 0.28,
        roughness: isMetal ? 0.22 : 0.24,
        clearcoat: 0.95,
        clearcoatRoughness: 0.09,
        reflectivity: 0.9,
        envMapIntensity: 1.55,
      });
    } else if (crystalSet.has(key)) {
      mat = new T.MeshPhysicalMaterial({
        ...baseOpts,
        metalness: 0.22,
        roughness: 0.12,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.85,
        emissive: new T.Color(0x9ec8f0),
        emissiveIntensity: 0.12,
      });
    } else if (metallicSet.has(key)) {
      mat = new T.MeshPhysicalMaterial({
        ...baseOpts,
        metalness: 0.64,
        roughness: 0.28,
        clearcoat: 0.38,
        clearcoatRoughness: 0.18,
        envMapIntensity: 1.60,
        emissive: key === 'star' ? new T.Color(0xffc96b) : new T.Color(0x000000),
        emissiveIntensity: key === 'star' ? 0.16 : 0,
      });
    } else if (velvetSet.has(key)) {
      mat = new T.MeshPhysicalMaterial({
        ...baseOpts,
        metalness: 0.02,
        roughness: 0.78,
        sheen: 0.55,
        sheenRoughness: 0.62,
        sheenColor: new T.Color(0xffd8d8),
        envMapIntensity: 0.82,
      });
    } else {
      mat = new T.MeshPhysicalMaterial({
        ...baseOpts,
        metalness: 0.05,
        roughness: 0.58,
        clearcoat: 0.18,
        clearcoatRoughness: 0.36,
        envMapIntensity: 0.98,
      });
    }
    node.material = mat;
  });
}

/**
 * Sculptural pleated tree collar & brass rim nesting cleanly around the tree basket.
 */
export function createTreeCollar() {
  const g = new T.Group();
  const collarMat = new T.MeshPhysicalMaterial({
    color: 0xe9dcc2,
    roughness: 0.86,
    sheen: 0.45,
    sheenRoughness: 0.75,
    envMapIntensity: 0.75,
  });
  const brassMat = new T.MeshStandardMaterial({
    color: 0xd6a75b,
    metalness: 0.82,
    roughness: 0.26,
    envMapIntensity: 1.4,
  });
  // Soft tapered pleated base collar
  const skirt = new T.Mesh(new T.CylinderGeometry(0.41, 0.56, 0.22, 32), collarMat);
  skirt.position.y = STAGE_Y + 0.11;
  skirt.receiveShadow = true;
  skirt.castShadow = true;
  g.add(skirt);

  // Subtle top & bottom brass trim rings
  const bottomRing = new T.Mesh(new T.TorusGeometry(0.565, 0.012, 8, 40), brassMat);
  bottomRing.rotation.x = Math.PI / 2;
  bottomRing.position.y = STAGE_Y + 0.012;
  const topRing = new T.Mesh(new T.TorusGeometry(0.415, 0.010, 8, 36), brassMat);
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = STAGE_Y + 0.215;
  g.add(bottomRing, topRing);
  return g;
}

/**
 * Redesigned 3D Fairy Light Garland:
 * - Sculpted metallic cord (TubeGeometry) spiraling gracefully around the boughs
 * - 76 glowing incandescent bulbs + custom GLSL twinkling bokeh halo sprites
 * - 3 vertically distributed dynamic tree PointLights + soft topper crown aura
 */
export function createLightGarland(treeGroup) {
  const group = new T.Group();
  treeGroup.add(group);

  const sampleCount = 320;
  const points = [];
  for (let i = 0; i <= sampleCount; i++) {
    const f = i / sampleCount;
    const angle = f * Math.PI * 9.2;
    const r = 1.13 * Math.pow(1 - f, 0.84) + 0.055;
    const swag = 0.042 * Math.sin(angle * 2.5) * (1 - f * 0.4);
    points.push(new T.Vector3(r * Math.sin(angle), 0.78 + 2.48 * f + swag, r * Math.cos(angle)));
  }

  // Delicate fine dark-brass garland cord blending organically into pine boughs
  const curve = new T.CatmullRomCurve3(points);
  const wireMat = new T.MeshStandardMaterial({
    color: 0x4f442e,
    metalness: 0.55,
    roughness: 0.48,
  });
  const wire = new T.Mesh(new T.TubeGeometry(curve, 220, 0.0038, 6, false), wireMat);
  group.add(wire);

  // 76 bulbs + brass collars along the garland
  const bulbCount = 76;
  const bulbPositions = [];
  const bulbGeo = new T.SphereGeometry(0.0185, 10, 8);
  const bulbMat = new T.MeshBasicMaterial({ color: 0xffffff });
  const bulbs = new T.InstancedMesh(bulbGeo, bulbMat, bulbCount);
  const socketGeo = new T.CylinderGeometry(0.009, 0.011, 0.018, 6);
  const socketMat = new T.MeshStandardMaterial({ color: 0xb98d44, metalness: 0.8, roughness: 0.35 });
  const sockets = new T.InstancedMesh(socketGeo, socketMat, bulbCount);

  const haloPos = new Float32Array(bulbCount * 3);
  const haloCol = new Float32Array(bulbCount * 3);
  const haloPhase = new Float32Array(bulbCount);
  const m4 = new T.Matrix4();

  for (let i = 0; i < bulbCount; i++) {
    const t = (i + 0.5) / bulbCount;
    const p = curve.getPoint(t);
    bulbPositions.push(p);
    m4.makeTranslation(p.x, p.y, p.z);
    bulbs.setMatrixAt(i, m4);
    m4.makeTranslation(p.x, p.y + 0.016, p.z);
    sockets.setMatrixAt(i, m4);
    haloPos[i * 3] = p.x;
    haloPos[i * 3 + 1] = p.y;
    haloPos[i * 3 + 2] = p.z;
    haloPhase[i] = i * 1.6180339;
  }
  bulbs.instanceMatrix.needsUpdate = true;
  sockets.instanceMatrix.needsUpdate = true;
  group.add(bulbs, sockets);

  // Twinkling soft radial bokeh halos on every lit bulb
  const haloGeo = new T.BufferGeometry();
  haloGeo.setAttribute('position', new T.BufferAttribute(haloPos, 3));
  haloGeo.setAttribute('aColor', new T.BufferAttribute(haloCol, 3));
  haloGeo.setAttribute('aPhase', new T.BufferAttribute(haloPhase, 1));
  const haloMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
    },
    vertexShader: `
      attribute vec3 aColor;
      attribute float aPhase;
      uniform float uTime;
      uniform float uIntensity;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = aColor;
        float wave = 0.74 + 0.26 * sin(uTime * 2.4 + aPhase * 2.1) * cos(uTime * 1.1 + aPhase);
        vTwinkle = wave * uIntensity;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((34.0 + 10.0 * wave) * (4.2 / max(1.2, -mv.z)), 8.0, 58.0);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float core = exp(-r * r * 26.0);
        float halo = pow(max(0.0, 1.0 - r * 2.0), 2.4) * 0.58;
        float a = (core * 0.95 + halo) * vTwinkle;
        gl_FragColor = vec4(vColor, a);
      }
    `,
  });
  const halos = new T.Points(haloGeo, haloMat);
  halos.frustumCulled = false;
  group.add(halos);

  // Soft crown halo behind the topper star
  const topperAura = new T.Sprite(new T.SpriteMaterial({
    map: glowSpriteTexture(),
    color: 0xffd788,
    transparent: true,
    opacity: 0.42,
    blending: T.AdditiveBlending,
    depthWrite: false,
  }));
  topperAura.position.set(0, 3.56, 0);
  topperAura.scale.setScalar(0.95);
  group.add(topperAura);

  // 3 balanced warm/jewel internal point lights casting warm bounce through branches & onto ornaments
  const lightSpecs = [
    { pos: [0.55, 1.15, 0.75], base: 1.05, dist: 3.8 },
    { pos: [-0.52, 2.05, 0.58], base: 0.92, dist: 3.6 },
    { pos: [0.10, 2.95, -0.45], base: 0.78, dist: 3.4 },
  ];
  const pointLights = lightSpecs.map(spec => {
    const pl = new T.PointLight(0xffbe66, spec.base, spec.dist, 1.75);
    pl.position.set(...spec.pos);
    treeGroup.add(pl);
    return { light: pl, base: spec.base };
  });

  let currentMode = 'warm';
  const tempColor = new T.Color();

  function applyMode(mode) {
    currentMode = mode;
    const isOn = mode !== 'off';
    const palette = mode === 'colour' ? COLOUR_BULBS : WARM_BULBS;
    const colAttr = haloGeo.getAttribute('aColor');

    for (let i = 0; i < bulbCount; i++) {
      if (isOn) {
        tempColor.setHex(palette[i % palette.length]);
      } else {
        tempColor.setHex(OFF_BULB);
      }
      bulbs.setColorAt(i, tempColor);
      colAttr.setXYZ(i, tempColor.r, tempColor.g, tempColor.b);
    }
    bulbs.instanceColor.needsUpdate = true;
    colAttr.needsUpdate = true;

    halos.visible = isOn;
    topperAura.visible = isOn;

    // Tune internal lights color & intensity
    const lightTint = mode === 'colour' ? 0xffc694 : 0xffbd63;
    for (const pl of pointLights) {
      pl.light.color.setHex(lightTint);
      pl.light.intensity = isOn ? pl.base : 0;
    }
  }

  function update(time) {
    if (currentMode === 'off') return;
    haloMat.uniforms.uTime.value = time;
    const breath = 0.94 + 0.06 * Math.sin(time * 2.1);
    topperAura.material.opacity = 0.36 * breath;
    topperAura.scale.setScalar(0.92 + 0.08 * Math.sin(time * 1.7));
    for (let i = 0; i < pointLights.length; i++) {
      const p = pointLights[i];
      p.light.intensity = p.base * (0.93 + 0.07 * Math.sin(time * 2.4 + i * 1.9));
    }
  }

  function setScale(w, h) {
    group.scale.set(w, h, w);
  }

  return { group, applyMode, update, setScale };
}

/**
 * Refined, jewel-like placement beacons and double-ring selection reticle for Edit mode.
 */
export function createInteractionGuides(scene, maxSites) {
  const spotGeo = new T.SphereGeometry(0.026, 12, 10);
  const spotMat = new T.MeshBasicMaterial({
    color: 0xffe9aa,
    transparent: true,
    opacity: 0.92,
  });
  const spotMesh = new T.InstancedMesh(spotGeo, spotMat, maxSites);
  spotMesh.frustumCulled = false;
  spotMesh.renderOrder = 3;
  scene.add(spotMesh);

  // Delicate, subtle pulsing pin-halo sprites (keeps tree and ornaments cleanly visible!)
  const haloPos = new Float32Array(maxSites * 3);
  const haloGeo = new T.BufferGeometry();
  haloGeo.setAttribute('position', new T.BufferAttribute(haloPos, 3));
  const haloMat = new T.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying float vPulse;
      void main() {
        vPulse = 0.65 + 0.35 * sin(uTime * 3.2 + position.y * 5.0 + position.x * 3.0);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp((14.0 + 3.5 * vPulse) * (4.2 / max(1.2, -mv.z)), 8.0, 20.0);
      }
    `,
    fragmentShader: `
      varying float vPulse;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float ring = smoothstep(0.46, 0.36, r) * smoothstep(0.24, 0.33, r);
        float core = exp(-r * r * 22.0) * 0.45;
        gl_FragColor = vec4(1.0, 0.89, 0.58, (ring * 0.52 + core) * vPulse);
      }
    `,
  });
  const spotHalos = new T.Points(haloGeo, haloMat);
  spotHalos.frustumCulled = false;
  spotHalos.renderOrder = 4;
  spotHalos.visible = false;
  scene.add(spotHalos);

  // Sleek double-ring golden selection reticle
  const selection = new T.Group();
  const outerRing = new T.Mesh(
    new T.TorusGeometry(0.165, 0.0085, 8, 48),
    new T.MeshBasicMaterial({ color: 0xffe7a3, transparent: true, opacity: 0.95 })
  );
  const innerRing = new T.Mesh(
    new T.TorusGeometry(0.132, 0.0045, 8, 40),
    new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
  );
  selection.add(outerRing, innerRing);
  selection.visible = false;
  selection.renderOrder = 5;
  scene.add(selection);

  const m4 = new T.Matrix4();
  let lastCount = 0;

  return {
    spotMesh,
    selection,
    setSpots(worldPoints) {
      lastCount = worldPoints.length;
      spotMesh.count = lastCount;
      const posAttr = haloGeo.getAttribute('position');
      for (let i = 0; i < lastCount; i++) {
        const p = worldPoints[i];
        m4.makeTranslation(p.x, p.y, p.z);
        spotMesh.setMatrixAt(i, m4);
        posAttr.setXYZ(i, p.x, p.y, p.z);
      }
      spotMesh.instanceMatrix.needsUpdate = true;
      posAttr.needsUpdate = true;
      haloGeo.setDrawRange(0, lastCount);
      spotMesh.visible = lastCount > 0;
      spotHalos.visible = lastCount > 0;
    },
    setVisible(visible) {
      spotMesh.visible = visible && lastCount > 0;
      spotHalos.visible = visible && lastCount > 0;
      if (!visible) selection.visible = false;
    },
    update(time) {
      if (spotHalos.visible) {
        haloMat.uniforms.uTime.value = time;
      }
      if (selection.visible) {
        const s = 1 + 0.05 * Math.sin(time * 4.2);
        selection.scale.setScalar(s);
      }
    },
  };
}
