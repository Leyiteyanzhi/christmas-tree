import * as T from './vendor/three.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext('2d')];
}

function configureTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true, wrap = T.RepeatWrapping } = {}) {
  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

const cache = new Map();
function memo(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

/**
 * Rich satin herringbone walnut parquet (color + roughness + bump).
 */
export function parquetTextures() {
  return memo('parquet', () => {
    const size = 512;
    const [cColor, ctxC] = makeCanvas(size, size);
    const [cRough, ctxR] = makeCanvas(size, size);
    const [cBump, ctxB] = makeCanvas(size, size);
    const rand = mulberry32(4109);

    ctxC.fillStyle = '#24140d';
    ctxC.fillRect(0, 0, size, size);
    ctxR.fillStyle = '#b5b5b5';
    ctxR.fillRect(0, 0, size, size);
    ctxB.fillStyle = '#383838';
    ctxB.fillRect(0, 0, size, size);

    const cols = 4;
    const rows = 16;
    const plankW = size / cols;
    const plankH = size / rows;

    const palette = [
      [88, 52, 31],
      [77, 45, 27],
      [101, 61, 36],
      [68, 40, 24],
      [94, 57, 34],
    ];

    for (let r = 0; r < rows; r++) {
      const offset = (r % 2) * (plankW * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * plankW + offset;
        const y = r * plankH;
        const base = palette[Math.floor(rand() * palette.length)];
        const jitter = (rand() - 0.5) * 14;
        const R = Math.max(20, Math.min(220, base[0] + jitter));
        const G = Math.max(15, Math.min(200, base[1] + jitter * 0.72));
        const B = Math.max(10, Math.min(180, base[2] + jitter * 0.52));

        // Base plank
        ctxC.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
        ctxC.fillRect(x + 1.5, y + 1.5, plankW - 3, plankH - 3);

        // Subtle longitudinal wood grain fibers
        for (let g = 0; g < 10; g++) {
          const gy = y + 2 + rand() * (plankH - 4);
          const alpha = 0.06 + rand() * 0.09;
          ctxC.strokeStyle = rand() > 0.45 ? `rgba(26,12,6,${alpha})` : `rgba(176,122,74,${alpha * 0.75})`;
          ctxC.lineWidth = 0.7 + rand() * 1.1;
          ctxC.beginPath();
          ctxC.moveTo(x + 2, gy);
          ctxC.bezierCurveTo(
            x + plankW * 0.33, gy + (rand() - 0.5) * 3,
            x + plankW * 0.66, gy + (rand() - 0.5) * 3,
            x + plankW - 2, gy + (rand() - 0.5) * 2
          );
          ctxC.stroke();
        }

        // Plank satin gloss variation
        const roughVal = Math.round(96 + rand() * 44);
        ctxR.fillStyle = `rgb(${roughVal},${roughVal},${roughVal})`;
        ctxR.fillRect(x + 1.5, y + 1.5, plankW - 3, plankH - 3);

        const bumpVal = Math.round(168 + rand() * 38);
        ctxB.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
        ctxB.fillRect(x + 1.5, y + 1.5, plankW - 3, plankH - 3);
      }
    }

    return {
      map: configureTexture(cColor, { repeatX: 5.5, repeatY: 5.5, srgb: true }),
      roughnessMap: configureTexture(cRough, { repeatX: 5.5, repeatY: 5.5, srgb: false }),
      bumpMap: configureTexture(cBump, { repeatX: 5.5, repeatY: 5.5, srgb: false }),
    };
  });
}

/**
 * Seamlessly tileable Venetian limewash plaster wall texture (zero horizontal seams!).
 */
export function plasterTextures(key, hexA, hexB, repeatX = 3, repeatY = 2) {
  return memo('plaster:' + key, () => {
    const size = 512;
    const [cColor, ctxC] = makeCanvas(size, size);
    const [cBump, ctxB] = makeCanvas(size, size);
    const rand = mulberry32(key.split('').reduce((s, ch) => s * 31 + ch.charCodeAt(0), 17));

    const cA = new T.Color(hexA);
    const cB = new T.Color(hexB);
    const mid = cA.clone().lerp(cB, 0.5);
    ctxC.fillStyle = '#' + mid.getHexString();
    ctxC.fillRect(0, 0, size, size);

    ctxB.fillStyle = '#808080';
    ctxB.fillRect(0, 0, size, size);

    const paintWrapped = (ctx, x, y, rad, innerColor) => {
      for (const ox of [-size, 0, size]) {
        for (const oy of [-size, 0, size]) {
          const px = x + ox, py = y + oy;
          if (px + rad < 0 || px - rad > size || py + rad < 0 || py - rad > size) continue;
          const g = ctx.createRadialGradient(px, py, 2, px, py, rad);
          g.addColorStop(0, innerColor);
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, rad, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    for (let i = 0; i < 110; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const rad = 36 + rand() * 92;
      const light = rand() > 0.48;
      paintWrapped(ctxC, x, y, rad, light ? 'rgba(255,244,225,0.048)' : 'rgba(12,14,14,0.055)');
      paintWrapped(ctxB, x, y, rad * 0.72, light ? 'rgba(200,200,200,0.11)' : 'rgba(56,56,56,0.11)');
    }

    for (let i = 0; i < 1600; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const w = 1.5 + rand() * 5;
      ctxC.fillStyle = rand() > 0.5 ? 'rgba(255,242,222,0.026)' : 'rgba(0,0,0,0.028)';
      ctxC.fillRect(x, y, w, 1.2);
    }

    return {
      map: configureTexture(cColor, { repeatX, repeatY, srgb: true }),
      bumpMap: configureTexture(cBump, { repeatX, repeatY, srgb: false }),
    };
  });
}

/**
 * European snow-dusted cobblestone piazza floor.
 */
export function cobblestoneTextures() {
  return memo('cobble', () => {
    const size = 512;
    const [cColor, ctxC] = makeCanvas(size, size);
    const [cRough, ctxR] = makeCanvas(size, size);
    const [cBump, ctxB] = makeCanvas(size, size);
    const rand = mulberry32(90210);

    // Frosty snow mortar base
    ctxC.fillStyle = '#9aaec2';
    ctxC.fillRect(0, 0, size, size);
    ctxR.fillStyle = '#c8c8c8';
    ctxR.fillRect(0, 0, size, size);
    ctxB.fillStyle = '#323232';
    ctxB.fillRect(0, 0, size, size);

    const rows = 14;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 10 + (r % 2);
      const colW = size / cols;
      const shift = (r % 2) * colW * 0.48;
      for (let c = -1; c <= cols; c++) {
        const x = c * colW + shift + (rand() - 0.5) * 3;
        const y = r * rowH + (rand() - 0.5) * 2;
        const w = colW - 5.5;
        const h = rowH - 5.5;
        const tone = 44 + rand() * 32;
        const blueShift = 8 + rand() * 14;
        const snowDust = rand() > 0.68 ? 0.35 + rand() * 0.35 : 0;

        const cr = Math.round(tone * (1 - snowDust) + 205 * snowDust);
        const cg = Math.round((tone + 4) * (1 - snowDust) + 216 * snowDust);
        const cb = Math.round((tone + blueShift) * (1 - snowDust) + 232 * snowDust);

        const drawStone = (ctx, fill, pad = 0) => {
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.roundRect(x + 2.5 + pad, y + 2.5 + pad, Math.max(4, w - pad * 2), Math.max(4, h - pad * 2), 6);
          ctx.fill();
        };

        drawStone(ctxC, `rgb(${cr},${cg},${cb})`);
        // Highlight edge
        drawStone(ctxC, 'rgba(220,235,255,0.12)', 2);

        const rVal = Math.round(snowDust > 0.2 ? 180 : 78 + rand() * 58);
        drawStone(ctxR, `rgb(${rVal},${rVal},${rVal})`);

        const bVal = Math.round(165 + rand() * 65);
        drawStone(ctxB, `rgb(${bVal},${bVal},${bVal})`);
      }
    }

    return {
      map: configureTexture(cColor, { repeatX: 6.5, repeatY: 6.5, srgb: true }),
      roughnessMap: configureTexture(cRough, { repeatX: 6.5, repeatY: 6.5, srgb: false }),
      bumpMap: configureTexture(cBump, { repeatX: 6.5, repeatY: 6.5, srgb: false }),
    };
  });
}

/**
 * Artisan honed limestone & warm travertine checkerboard patisserie floor tiles.
 */
export function bakeryTileTextures() {
  return memo('bakery-tile', () => {
    const size = 512;
    const [cColor, ctxC] = makeCanvas(size, size);
    const [cRough, ctxR] = makeCanvas(size, size);
    const [cBump, ctxB] = makeCanvas(size, size);
    const rand = mulberry32(31415);

    ctxC.fillStyle = '#624839';
    ctxC.fillRect(0, 0, size, size);
    ctxR.fillStyle = '#c8c8c8';
    ctxR.fillRect(0, 0, size, size);
    ctxB.fillStyle = '#484848';
    ctxB.fillRect(0, 0, size, size);

    const grid = 4;
    const cell = size / grid;
    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        const light = (r + c) % 2 === 0;
        const x = c * cell;
        const y = r * cell;
        const v = (rand() - 0.5) * 9;
        const fill = light
          ? `rgb(${(202 + v) | 0},${(181 + v) | 0},${(152 + v) | 0})`
          : `rgb(${(122 + v) | 0},${(86 + v) | 0},${(68 + v) | 0})`;
        ctxC.fillStyle = fill;
        ctxC.fillRect(x + 2.5, y + 2.5, cell - 5, cell - 5);

        const g = ctxC.createRadialGradient(
          x + cell * 0.4, y + cell * 0.35, 4,
          x + cell * 0.5, y + cell * 0.5, cell * 0.65
        );
        g.addColorStop(0, light ? 'rgba(255,248,234,0.14)' : 'rgba(182,126,96,0.12)');
        g.addColorStop(1, 'rgba(30,15,10,0.06)');
        ctxC.fillStyle = g;
        ctxC.fillRect(x + 2.5, y + 2.5, cell - 5, cell - 5);

        const rv = light ? 96 + rand() * 24 : 88 + rand() * 24;
        ctxR.fillStyle = `rgb(${rv | 0},${rv | 0},${rv | 0})`;
        ctxR.fillRect(x + 2.5, y + 2.5, cell - 5, cell - 5);

        ctxB.fillStyle = '#d4d4d4';
        ctxB.fillRect(x + 2.5, y + 2.5, cell - 5, cell - 5);
      }
    }

    return {
      map: configureTexture(cColor, { repeatX: 7.5, repeatY: 7.5, srgb: true }),
      roughnessMap: configureTexture(cRough, { repeatX: 7.5, repeatY: 7.5, srgb: false }),
      bumpMap: configureTexture(cBump, { repeatX: 7.5, repeatY: 7.5, srgb: false }),
    };
  });
}

/**
 * Radial dressed-limestone winter plaza medallion texture for the Market plinth.
 */
export function plazaPlinthTexture() {
  return memo('plaza-plinth', () => {
    const size = 512;
    const [canvas, ctx] = makeCanvas(size, size);
    const rand = mulberry32(4419);
    const cx = size / 2, cy = size / 2, R = size * 0.48;

    ctx.fillStyle = '#737f92';
    ctx.fillRect(0, 0, size, size);

    const rings = [
      { r0: 0, r1: R * 0.32, segs: 8, base: [132, 144, 160] },
      { r0: R * 0.33, r1: R * 0.64, segs: 16, base: [116, 129, 147] },
      { r0: R * 0.65, r1: R * 0.90, segs: 24, base: [142, 152, 168] },
      { r0: R * 0.91, r1: R * 1.0, segs: 32, base: [164, 174, 190] },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.segs; i++) {
        const a0 = (i / ring.segs) * Math.PI * 2 + 0.012;
        const a1 = ((i + 1) / ring.segs) * Math.PI * 2 - 0.012;
        const j = (rand() - 0.5) * 18;
        ctx.fillStyle = `rgb(${(ring.base[0] + j) | 0},${(ring.base[1] + j) | 0},${(ring.base[2] + j + 4) | 0})`;
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r1, a0, a1);
        ctx.arc(cx, cy, ring.r0, a1, a0, true);
        ctx.closePath();
        ctx.fill();
      }
    }

    const frost = ctx.createRadialGradient(cx, cy, R * 0.52, cx, cy, R);
    frost.addColorStop(0, 'rgba(235,244,255,0)');
    frost.addColorStop(0.7, 'rgba(225,236,252,0.18)');
    frost.addColorStop(1, 'rgba(238,245,255,0.48)');
    ctx.fillStyle = frost;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(218,176,104,0.58)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.90, 0, Math.PI * 2);
    ctx.stroke();

    return configureTexture(canvas, { srgb: true, wrap: T.ClampToEdgeWrapping });
  });
}

/**
 * Rich grained wood PBR textures (smoked walnut / honey oak / chalet timber)
 * so beams, wainscoting, cabinetry, and chalets never look like flat plastic!
 */
export function woodTextures(key = 'walnut', { base = [74, 46, 29], grain = [32, 18, 10], hi = [122, 82, 52], repeatX = 2, repeatY = 2 } = {}) {
  return memo(`wood:${key}:${repeatX}:${repeatY}`, () => {
    const size = 512;
    const [cColor, ctxC] = makeCanvas(size, size);
    const [cBump, ctxB] = makeCanvas(size, size);
    const rand = mulberry32(key.split('').reduce((s, ch) => s * 37 + ch.charCodeAt(0), 53));

    ctxC.fillStyle = `rgb(${base[0]},${base[1]},${base[2]})`;
    ctxC.fillRect(0, 0, size, size);
    ctxB.fillStyle = '#808080';
    ctxB.fillRect(0, 0, size, size);

    // Seamless longitudinal plank variation + natural grain fibers
    const bands = 8;
    const bh = size / bands;
    for (let b = 0; b < bands; b++) {
      const y0 = b * bh;
      const shift = (rand() - 0.5) * 14;
      ctxC.fillStyle = `rgb(${Math.max(15, base[0] + shift) | 0},${Math.max(10, base[1] + shift * 0.75) | 0},${Math.max(8, base[2] + shift * 0.55) | 0})`;
      ctxC.fillRect(0, y0, size, bh);

      // Subtle plank seam groove
      ctxC.fillStyle = `rgba(${grain[0]},${grain[1]},${grain[2]},0.35)`;
      ctxC.fillRect(0, y0, size, 1.5);
      ctxB.fillStyle = '#404040';
      ctxB.fillRect(0, y0, size, 2);

      // Fine organic grain streams
      for (let g = 0; g < 18; g++) {
        const gy = y0 + 2 + rand() * (bh - 4);
        const dark = rand() > 0.35;
        const col = dark ? grain : hi;
        const alpha = dark ? 0.14 + rand() * 0.14 : 0.08 + rand() * 0.10;
        ctxC.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${alpha})`;
        ctxC.lineWidth = 0.8 + rand() * 1.6;
        ctxC.beginPath();
        ctxC.moveTo(0, gy);
        ctxC.bezierCurveTo(size * 0.33, gy + (rand() - 0.5) * 4, size * 0.66, gy + (rand() - 0.5) * 4, size, gy);
        ctxC.stroke();

        ctxB.strokeStyle = dark ? 'rgba(90,90,90,0.35)' : 'rgba(175,175,175,0.28)';
        ctxB.lineWidth = 1;
        ctxB.beginPath();
        ctxB.moveTo(0, gy);
        ctxB.lineTo(size, gy);
        ctxB.stroke();
      }
    }

    return {
      map: configureTexture(cColor, { repeatX, repeatY, srgb: true }),
      bumpMap: configureTexture(cBump, { repeatX, repeatY, srgb: false }),
    };
  });
}

/**
 * Artisan kiln-fired brick masonry PBR texture for the bakery hearth oven.
 */
export function brickTextures() {
  return memo('bakery-brick', () => {
    const size = 512;
    const [cColor, ctxC] = makeCanvas(size, size);
    const [cBump, ctxB] = makeCanvas(size, size);
    const rand = mulberry32(4821);

    // Warm cream lime mortar
    ctxC.fillStyle = '#c8b69c';
    ctxC.fillRect(0, 0, size, size);
    ctxB.fillStyle = '#383838';
    ctxB.fillRect(0, 0, size, size);

    const rows = 12;
    const cols = 6;
    const rh = size / rows;
    const cw = size / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const x = c * cw + off;
        const y = r * rh;
        const R = 132 + (rand() - 0.5) * 34;
        const G = 64 + (rand() - 0.5) * 20;
        const B = 45 + (rand() - 0.5) * 14;
        ctxC.fillStyle = `rgb(${R | 0},${G | 0},${B | 0})`;
        ctxC.beginPath();
        ctxC.roundRect(x + 3, y + 3, cw - 6, rh - 6, 3);
        ctxC.fill();

        // Kiln-char variation
        ctxC.fillStyle = rand() > 0.5 ? 'rgba(255,210,165,0.08)' : 'rgba(35,12,8,0.14)';
        ctxC.fillRect(x + 5, y + 5, cw - 10, rh - 10);

        const bv = 165 + rand() * 55;
        ctxB.fillStyle = `rgb(${bv | 0},${bv | 0},${bv | 0})`;
        ctxB.beginPath();
        ctxB.roundRect(x + 3, y + 3, cw - 6, rh - 6, 3);
        ctxB.fill();
      }
    }

    return {
      map: configureTexture(cColor, { repeatX: 2.2, repeatY: 2.2, srgb: true }),
      bumpMap: configureTexture(cBump, { repeatX: 2.2, repeatY: 2.2, srgb: false }),
    };
  });
}

/**
 * Painterly nocturnal Alpine Christmas village vista (for Cabin window, Bakery shopfront,
 * and full 360° Village Market distant skyline!) — eliminates low-poly cone silhouettes!
 */
export function alpineVistaTexture(mode = 'window') {
  return memo('vista:' + mode, () => {
    const w = mode === 'panorama' ? 1536 : 1024;
    const h = 512;
    const [canvas, ctx] = makeCanvas(w, h);
    const rand = mulberry32(mode === 'panorama' ? 9921 : mode === 'bakery' ? 7412 : 3318);

    // 1. Deep nocturnal twilight winter sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    if (mode === 'bakery') {
      sky.addColorStop(0.0, '#0d1930');
      sky.addColorStop(0.45, '#1d3354');
      sky.addColorStop(0.76, '#395273');
      sky.addColorStop(1.0, '#222b3b');
    } else {
      sky.addColorStop(0.0, '#071022');
      sky.addColorStop(0.42, '#132645');
      sky.addColorStop(0.74, '#274368');
      sky.addColorStop(1.0, '#182438');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // 2. Soft dreamy winter cloud mist & subtle aurora shimmer
    for (let i = 0; i < 18; i++) {
      const cx = rand() * w;
      const cy = h * (0.14 + rand() * 0.42);
      const rx = 120 + rand() * 220;
      const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
      g.addColorStop(0, 'rgba(130,178,225,0.09)');
      g.addColorStop(1, 'rgba(130,178,225,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - rx, cy - rx * 0.5, rx * 2, rx);
    }

    // 3. Crisp starry winter night
    for (let i = 0; i < 220; i++) {
      const sx = rand() * w;
      const sy = rand() * h * 0.62;
      const r = 0.6 + rand() * 1.5;
      ctx.fillStyle = `rgba(242,248,255,${0.35 + rand() * 0.65})`;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Luminous crescent/full moon with soft atmospheric halo (for window views)
    if (mode !== 'panorama') {
      const mx = mode === 'bakery' ? w * 0.72 : w * 0.30;
      const my = h * 0.24;
      const mg = ctx.createRadialGradient(mx, my, 8, mx, my, 125);
      mg.addColorStop(0, 'rgba(255,248,225,0.95)');
      mg.addColorStop(0.18, 'rgba(255,242,208,0.55)');
      mg.addColorStop(0.55, 'rgba(140,188,245,0.16)');
      mg.addColorStop(1, 'rgba(140,188,245,0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, 125, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6dc';
      ctx.beginPath();
      ctx.arc(mx, my, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Layered snowy Alpine mountain range (seamless wrap for panorama!)
    const drawRidge = (baseY, amp, freq, colTop, colBot, phase) => {
      const grad = ctx.createLinearGradient(0, baseY - amp, 0, h);
      grad.addColorStop(0, colTop);
      grad.addColorStop(1, colBot);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) {
        const a = (x / w) * Math.PI * 2;
        const y = baseY
          - Math.abs(Math.sin(a * freq + phase)) * amp * 0.72
          - Math.sin(a * (freq * 2 + 1) + phase * 1.7) * amp * 0.28;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    };
    drawRidge(h * 0.70, 92, 3, '#4c6788', '#1d314d', 0.4);
    drawRidge(h * 0.77, 58, 5, '#728dad', '#293e5c', 1.8);

    // 6. Rolling snow-blanketed hills in middle distance
    const hillGrad = ctx.createLinearGradient(0, h * 0.72, 0, h);
    hillGrad.addColorStop(0, '#c6d6ea');
    hillGrad.addColorStop(0.5, '#8fa6c2');
    hillGrad.addColorStop(1, '#4c627e');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) {
      const a = (x / w) * Math.PI * 2;
      ctx.lineTo(x, h * 0.78 + Math.sin(a * 2 + 0.5) * 18 + Math.cos(a * 4) * 8);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // Helper: painterly multi-tiered snow-dusted pine silhouette
    const drawPine = (px, py, ph, col, snowAlpha = 0.65) => {
      const tiers = 5;
      for (let t = 0; t < tiers; t++) {
        const f = t / (tiers - 1);
        const tw = ph * (0.34 - f * 0.21);
        const ty = py - ph * (0.16 + f * 0.72);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(px, ty - ph * 0.22);
        ctx.lineTo(px - tw, ty + ph * 0.08);
        ctx.lineTo(px + tw, ty + ph * 0.08);
        ctx.closePath();
        ctx.fill();
        // Snow dusting along top slopes
        ctx.fillStyle = `rgba(222,236,252,${snowAlpha * (0.55 + f * 0.45)})`;
        ctx.beginPath();
        ctx.moveTo(px, ty - ph * 0.22);
        ctx.lineTo(px - tw * 0.72, ty - ph * 0.04);
        ctx.lineTo(px, ty - ph * 0.09);
        ctx.lineTo(px + tw * 0.72, ty - ph * 0.04);
        ctx.closePath();
        ctx.fill();
      }
    };

    // Distant pine treeline
    const pineCount = mode === 'panorama' ? 88 : 42;
    for (let i = 0; i < pineCount; i++) {
      const px = (i / pineCount) * w + (rand() - 0.5) * 18;
      const py = h * (0.81 + rand() * 0.07);
      const ph = 42 + rand() * 58;
      drawPine(px, py, ph, '#122636', 0.52);
    }

    // 7. Storybook Alpine village houses + church steeple with glowing warm amber windows!
    const houseSpots = mode === 'panorama'
      ? [0.06, 0.14, 0.23, 0.34, 0.46, 0.58, 0.69, 0.81, 0.92]
      : [0.22, 0.46, 0.54, 0.76];

    for (let i = 0; i < houseSpots.length; i++) {
      const hx = houseSpots[i] * w;
      const hy = h * 0.82 + (i % 2) * 10;
      const hw = 42 + (i % 3) * 14;
      const hh = 34 + (i % 2) * 14;

      // Subtle golden glow pool on snow in front of cottage
      const wg = ctx.createRadialGradient(hx, hy - hh * 0.3, 4, hx, hy, hw * 1.4);
      wg.addColorStop(0, 'rgba(255,196,96,0.34)');
      wg.addColorStop(1, 'rgba(255,196,96,0)');
      ctx.fillStyle = wg;
      ctx.fillRect(hx - hw * 1.4, hy - hh * 1.2, hw * 2.8, hw * 2.2);

      // House facade & snowy pitched gable roof
      ctx.fillStyle = '#25212a';
      ctx.fillRect(hx - hw / 2, hy - hh, hw, hh);
      ctx.fillStyle = '#d8e6f6';
      ctx.beginPath();
      ctx.moveTo(hx - hw * 0.62, hy - hh + 2);
      ctx.lineTo(hx, hy - hh - hw * 0.44);
      ctx.lineTo(hx + hw * 0.62, hy - hh + 2);
      ctx.closePath();
      ctx.fill();

      // Optional village church steeple on one cottage
      if (i === 1 || i === 5) {
        ctx.fillStyle = '#222838';
        ctx.fillRect(hx - 10, hy - hh - 46, 20, 48);
        ctx.fillStyle = '#dce8f8';
        ctx.beginPath();
        ctx.moveTo(hx - 13, hy - hh - 46);
        ctx.lineTo(hx, hy - hh - 88);
        ctx.lineTo(hx + 13, hy - hh - 46);
        ctx.closePath();
        ctx.fill();
      }

      // Warm glowing windows
      ctx.fillStyle = '#ffd580';
      const cols = hw > 48 ? 3 : 2;
      for (let c = 0; c < cols; c++) {
        const wx = hx - hw * 0.34 + (c / Math.max(1, cols - 1)) * hw * 0.68 - 4;
        ctx.fillRect(wx, hy - hh * 0.68, 8, 10);
      }
    }

    // Foreground framing frosted spruce silhouettes
    const fgCount = mode === 'panorama' ? 52 : 16;
    for (let i = 0; i < fgCount; i++) {
      const px = (i / fgCount) * w + (rand() - 0.5) * 26;
      const py = h * (0.93 + rand() * 0.08);
      const ph = 72 + rand() * 78;
      drawPine(px, py, ph, '#0c1c28', 0.72);
    }

    return configureTexture(canvas, {
      repeatX: 1,
      repeatY: 1,
      srgb: true,
      wrap: mode === 'panorama' ? T.RepeatWrapping : T.ClampToEdgeWrapping,
    });
  });
}

/**
 * Richly illustrated warm-lit Christmas Market chalet shopfront interior texture
 * (wooden shelves, glowing brass lanterns, mulled wine mugs, gingerbread & toys!).
 */
export function chaletInteriorTexture(variant = 0) {
  return memo('chalet-interior:' + variant, () => {
    const w = 512, h = 256;
    const [canvas, ctx] = makeCanvas(w, h);
    const rand = mulberry32(4100 + variant * 131);

    // Warm candlelit timber interior backdrop
    const bg = ctx.createRadialGradient(w * 0.5, h * 0.42, 16, w * 0.5, h * 0.5, w * 0.68);
    bg.addColorStop(0, '#ffd48a');
    bg.addColorStop(0.45, '#c77a38');
    bg.addColorStop(1, '#582c16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Vertical tongue-and-groove interior wood wall lines
    ctx.strokeStyle = 'rgba(54,24,10,0.28)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 28) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }

    // Two interior wooden display shelves loaded with festive goods!
    const shelfYs = [110, 185];
    const itemPalette = variant === 0
      ? ['#9c252b', '#20553f', '#e8be6c', '#f5e8ce', '#b8532a']
      : ['#235440', '#b83236', '#e6c27a', '#d48d56', '#f2e4cc'];

    for (const sy of shelfYs) {
      ctx.fillStyle = '#472615';
      ctx.fillRect(16, sy, w - 32, 12);
      ctx.fillStyle = 'rgba(255,222,158,0.25)';
      ctx.fillRect(16, sy, w - 32, 3);

      // Painted jars, wrapped boxes, ceramic mugs & nutcrackers along shelf
      let x = 28;
      while (x < w - 52) {
        const iw = 20 + rand() * 24;
        const ih = 28 + rand() * 28;
        ctx.fillStyle = itemPalette[Math.floor(rand() * itemPalette.length)];
        ctx.beginPath();
        ctx.roundRect(x, sy - ih, iw, ih, 4);
        ctx.fill();
        // Highlight & ribbon detail
        ctx.fillStyle = 'rgba(255,244,214,0.35)';
        ctx.fillRect(x + 3, sy - ih + 3, 4, ih - 6);
        if (rand() > 0.45) {
          ctx.fillStyle = '#f2cf84';
          ctx.fillRect(x + iw * 0.42, sy - ih, 4, ih);
        }
        x += iw + 10 + rand() * 14;
      }
    }

    // Hanging warm string lights & lanterns across top of shop interior
    ctx.strokeStyle = '#331c10';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, 24);
    ctx.quadraticCurveTo(w * 0.5, 62, w, 24);
    ctx.stroke();

    for (let i = 1; i <= 7; i++) {
      const t = i / 8;
      const lx = w * t;
      const ly = 24 + 4 * 38 * t * (1 - t);
      const lg = ctx.createRadialGradient(lx, ly, 2, lx, ly, 26);
      lg.addColorStop(0, 'rgba(255,252,232,1)');
      lg.addColorStop(0.35, 'rgba(255,214,126,0.75)');
      lg.addColorStop(1, 'rgba(255,190,85,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(lx, ly, 26, 0, Math.PI * 2); ctx.fill();
    }

    return configureTexture(canvas, { srgb: true, wrap: T.ClampToEdgeWrapping });
  });
}

/**
 * Vintage hand-lettered signboard / Parisian bakery chalkboard menu texture.
 */
export function signTexture(title, subtitle, { bg = '#1c2420', border = '#d8ae62', fg = '#f7ebd2' } = {}) {
  return memo(`sign:${title}:${subtitle}`, () => {
    const [canvas, ctx] = makeCanvas(512, 256);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = border;
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 480, 224);
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, 460, 204);

    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 54px Georgia, serif';
    ctx.fillText(title, 256, 108);
    ctx.fillStyle = border;
    ctx.font = 'italic 28px Georgia, serif';
    ctx.fillText(`✦  ${subtitle}  ✦`, 256, 174);

    return configureTexture(canvas, { srgb: true, wrap: T.ClampToEdgeWrapping });
  });
}

/**
 * Soft architectural sconce wall-wash light cone texture (projected subtly onto walls).
 */
export function wallWashTexture() {
  return memo('wall-wash', () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 122);
    g.addColorStop(0.0, 'rgba(255,212,138,0.65)');
    g.addColorStop(0.38, 'rgba(255,186,102,0.26)');
    g.addColorStop(0.75, 'rgba(255,168,84,0.06)');
    g.addColorStop(1.0, 'rgba(255,168,84,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return configureTexture(canvas, { srgb: true, wrap: T.ClampToEdgeWrapping });
  });
}

/**
 * Woven circular Nordic / Patisserie tree rug texture.
 */
export function rugTexture(key, { base, ring1, ring2, accent }) {
  return memo('rug:' + key, () => {
    const size = 512;
    const [canvas, ctx] = makeCanvas(size, size);
    const cx = size / 2;
    const cy = size / 2;
    const R = size * 0.48;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    // Subtle radial wool weave
    for (let r = 8; r < R; r += 3.5) {
      ctx.strokeStyle = r % 7 < 3.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Concentric design bands
    const drawBand = (radius, width, color, dash = []) => {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dash);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    drawBand(R * 0.94, 16, ring1);
    drawBand(R * 0.87, 3, accent);
    drawBand(R * 0.80, 10, ring2);
    drawBand(R * 0.72, 2.5, accent, [7, 7]);
    drawBand(R * 0.56, 3, ring1, [3, 9]);

    // Delicate geometric winter diamonds around border
    const motifs = 24;
    ctx.fillStyle = accent;
    for (let i = 0; i < motifs; i++) {
      const a = (i / motifs) * Math.PI * 2;
      const mx = cx + Math.cos(a) * R * 0.80;
      const my = cy + Math.sin(a) * R * 0.80;
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    return configureTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true, wrap: T.ClampToEdgeWrapping });
  });
}

/**
 * Striped woven fabric for market awnings.
 */
export function awningTexture(colorA = '#7a222b', colorB = '#efe3cb') {
  return memo('awning:' + colorA + colorB, () => {
    const [canvas, ctx] = makeCanvas(256, 256);
    const stripes = 8;
    const sw = 256 / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.fillRect(i * sw, 0, sw, 256);
    }
    // Subtle woven texture
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 256, 1);
    return configureTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true });
  });
}

/**
 * Stacked rustic stone masonry texture for the cabin fireplace.
 */
export function stoneTexture() {
  return memo('stone', () => {
    const size = 512;
    const [cColor, ctxC] = makeCanvas(size, size);
    const [cBump, ctxB] = makeCanvas(size, size);
    const rand = mulberry32(7712);

    ctxC.fillStyle = '#332d28';
    ctxC.fillRect(0, 0, size, size);
    ctxB.fillStyle = '#282828';
    ctxB.fillRect(0, 0, size, size);

    const rows = 10;
    const rowH = size / rows;
    for (let r = 0; r < rows; r++) {
      let x = -(rand() * 34);
      while (x < size) {
        const w = 52 + rand() * 58;
        const h = rowH - 5;
        const y = r * rowH + 2.5;
        const v = 78 + rand() * 44;
        const warm = rand() * 14;
        ctxC.fillStyle = `rgb(${(v + warm) | 0},${(v + warm * 0.45) | 0},${(v - 6) | 0})`;
        ctxC.beginPath();
        ctxC.roundRect(x + 2.5, y, w - 5, h, 5);
        ctxC.fill();

        const b = 155 + rand() * 75;
        ctxB.fillStyle = `rgb(${b | 0},${b | 0},${b | 0})`;
        ctxB.beginPath();
        ctxB.roundRect(x + 2.5, y, w - 5, h, 5);
        ctxB.fill();

        x += w;
      }
    }

    return {
      map: configureTexture(cColor, { repeatX: 1.8, repeatY: 2.2, srgb: true }),
      bumpMap: configureTexture(cBump, { repeatX: 1.8, repeatY: 2.2, srgb: false }),
    };
  });
}

/**
 * Soft radial bokeh glow sprite texture (for fairy lights, lanterns, topper halo).
 */
export function glowSpriteTexture() {
  return memo('glow-sprite', () => {
    const size = 128;
    const [canvas, ctx] = makeCanvas(size, size);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0.0, 'rgba(255,255,255,1.0)');
    g.addColorStop(0.18, 'rgba(255,252,240,0.85)');
    g.addColorStop(0.45, 'rgba(255,236,195,0.28)');
    g.addColorStop(0.75, 'rgba(255,220,165,0.06)');
    g.addColorStop(1.0, 'rgba(255,220,165,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return configureTexture(canvas, { srgb: true, wrap: T.ClampToEdgeWrapping });
  });
}

/**
 * Rich grained wood PBR textures (smoked walnut / honey oak / chalet timber)

 * Soft circular ground contact shadow under the tree.
 */
export function contactShadowTexture() {
  return memo('contact-shadow', () => {
    const size = 256;
    const [canvas, ctx] = makeCanvas(size, size);
    const g = ctx.createRadialGradient(128, 128, 12, 128, 128, 124);
    g.addColorStop(0.0, 'rgba(10,7,5,0.72)');
    g.addColorStop(0.45, 'rgba(12,8,6,0.42)');
    g.addColorStop(0.78, 'rgba(12,8,6,0.12)');
    g.addColorStop(1.0, 'rgba(12,8,6,0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return configureTexture(canvas, { srgb: true, wrap: T.ClampToEdgeWrapping });
  });
}

/**
 * Rich grained wood PBR textures (smoked walnut / honey oak / chalet timber)
 * so beams, wainscoting, cabinetry, and chalets never look like flat plastic!

 * passed through PMREMGenerator for lifelike reflections on glass, brass, and ornaments.
 */
export function createEnvironmentMap(renderer, key) {
  return memo('env:' + key, () => {
    const w = 256;
    const h = 128;
    const [canvas, ctx] = makeCanvas(w, h);

    const moods = {
      room: {
        top: '#2d231c',
        mid: '#1b2c26',
        bot: '#1a110c',
        spots: [
          { x: 0.72, y: 0.48, r: 0.24, c: 'rgba(255,152,66,0.95)' }, // Hearth glow
          { x: 0.25, y: 0.42, r: 0.22, c: 'rgba(130,185,255,0.75)' }, // Snow window
          { x: 0.50, y: 0.12, r: 0.26, c: 'rgba(255,232,188,0.85)' }, // Chandelier
          { x: 0.08, y: 0.52, r: 0.16, c: 'rgba(255,204,132,0.55)' }, // Sconce
          { x: 0.92, y: 0.52, r: 0.16, c: 'rgba(255,198,125,0.55)' }, // Sconce
        ],
      },
      market: {
        top: '#0d1a36',
        mid: '#192b4d',
        bot: '#1c2433',
        spots: [
          { x: 0.22, y: 0.36, r: 0.18, c: 'rgba(255,196,105,0.92)' }, // Festoon / lantern
          { x: 0.78, y: 0.36, r: 0.18, c: 'rgba(255,196,105,0.92)' },
          { x: 0.50, y: 0.18, r: 0.28, c: 'rgba(168,208,255,0.78)' }, // Moonlight sky
          { x: 0.50, y: 0.52, r: 0.15, c: 'rgba(255,214,142,0.70)' }, // Chalet window
          { x: 0.10, y: 0.46, r: 0.14, c: 'rgba(255,180,96,0.70)' },
        ],
      },
      bakery: {
        top: '#4e2c1d',
        mid: '#5a2d21',
        bot: '#291710',
        spots: [
          { x: 0.74, y: 0.45, r: 0.24, c: 'rgba(255,168,84,0.95)' }, // Brick oven
          { x: 0.26, y: 0.40, r: 0.22, c: 'rgba(162,205,255,0.68)' }, // Shopfront frost window
          { x: 0.50, y: 0.14, r: 0.28, c: 'rgba(255,236,200,0.88)' }, // Warm ceiling bounce
          { x: 0.88, y: 0.50, r: 0.18, c: 'rgba(255,218,158,0.75)' }, // Pastry case lights
        ],
      },
    };

    const mood = moods[key] || moods.room;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, mood.top);
    grad.addColorStop(0.52, mood.mid);
    grad.addColorStop(1, mood.bot);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (const s of mood.spots) {
      const gx = s.x * w;
      const gy = s.y * h;
      const gr = s.r * w;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      rg.addColorStop(0, s.c);
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    }

    const eqTex = new T.CanvasTexture(canvas);
    eqTex.mapping = T.EquirectangularReflectionMapping;
    eqTex.colorSpace = T.SRGBColorSpace;

    const pmrem = new T.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envRT = pmrem.fromEquirectangular(eqTex);
    eqTex.dispose();
    pmrem.dispose();
    return envRT.texture;
  });
}
