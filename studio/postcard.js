/**
 * Compose a crisp Clean Photo or Vintage Museum Holiday Card (Landscape or 3:4 Portrait)
 * directly from the live 3D WebGL canvas.
 */
export function composePhotoCard(targetCanvas, sourceCanvas, options = {}) {
  const {
    style = 'card',     // 'clean' | 'card'
    ratio = 'portrait', // 'wide' | 'portrait'
    greeting = '',
    title = 'Christmas Tree Studio',
    dateText = '',
  } = options;

  const ctx = targetCanvas.getContext('2d');
  const sw = sourceCanvas.width;
  const sh = sourceCanvas.height;

  if (style === 'clean') {
    targetCanvas.width = sw;
    targetCanvas.height = sh;
    ctx.drawImage(sourceCanvas, 0, 0, sw, sh);
    return;
  }

  // Vintage wine-and-gold museum holiday card layout
  const isPortrait = ratio === 'portrait';
  const W = isPortrait ? 1200 : 1600;
  const H = isPortrait ? 1600 : 1120;
  targetCanvas.width = W;
  targetCanvas.height = H;

  // Rich holiday wine radial ground
  const bg = ctx.createRadialGradient(W * 0.5, H * 0.22, 40, W * 0.5, H * 0.5, Math.max(W, H) * 0.78);
  bg.addColorStop(0, '#6e2834');
  bg.addColorStop(0.55, '#4b1a24');
  bg.addColorStop(1, '#2b0e15');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Outer antique-gold double hairline frame
  const pad = isPortrait ? 46 : 44;
  ctx.strokeStyle = 'rgba(232, 193, 126, 0.78)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

  ctx.strokeStyle = 'rgba(232, 193, 126, 0.34)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(pad + 12, pad + 12, W - (pad + 12) * 2, H - (pad + 12) * 2);

  // Corner decorative stars
  ctx.fillStyle = '#e9c382';
  ctx.font = '24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const corners = [
    [pad + 26, pad + 28],
    [W - pad - 26, pad + 28],
    [pad + 26, H - pad - 26],
    [W - pad - 26, H - pad - 26],
  ];
  for (const [cx, cy] of corners) ctx.fillText('✦', cx, cy);

  // Photo matte window (cover-cropped nicely around center so the hero tree stays framed!)
  const frameX = pad + 42;
  const frameY = pad + 46;
  const frameW = W - (pad + 42) * 2;
  const frameH = isPortrait ? Math.round(H * 0.69) : Math.round(H * 0.70);

  // Soft shadow behind the framed 3D photo
  ctx.save();
  ctx.shadowColor = 'rgba(12, 4, 8, 0.55)';
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = '#141d1b';
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.restore();

  // Compute aspect-correct cover crop centered on the tree
  const srcAspect = sw / sh;
  const dstAspect = frameW / frameH;
  let sx = 0, sy = 0, cropW = sw, cropH = sh;
  if (srcAspect > dstAspect) {
    cropW = sh * dstAspect;
    sx = (sw - cropW) * 0.5;
  } else {
    cropH = sw / dstAspect;
    sy = (sh - cropH) * 0.5;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(frameX, frameY, frameW, frameH);
  ctx.clip();
  ctx.drawImage(sourceCanvas, sx, sy, cropW, cropH, frameX, frameY, frameW, frameH);
  // Subtle warm editorial vignette along photo edges
  const vig = ctx.createRadialGradient(
    frameX + frameW / 2, frameY + frameH / 2, Math.min(frameW, frameH) * 0.36,
    frameX + frameW / 2, frameY + frameH / 2, Math.max(frameW, frameH) * 0.72
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(15,8,10,0.28)');
  ctx.fillStyle = vig;
  ctx.fillRect(frameX, frameY, frameW, frameH);
  ctx.restore();

  // Gold inner bezel around photo
  ctx.strokeStyle = 'rgba(240, 204, 140, 0.85)';
  ctx.lineWidth = 3;
  ctx.strokeRect(frameX, frameY, frameW, frameH);

  // Typography area below photo
  const footerTop = frameY + frameH;
  const footerH = H - pad - footerTop;
  const centerX = W / 2;

  // Delicate divider ornament
  const divY = footerTop + footerH * 0.22;
  ctx.strokeStyle = 'rgba(232, 193, 126, 0.42)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - 180, divY);
  ctx.lineTo(centerX - 24, divY);
  ctx.moveTo(centerX + 24, divY);
  ctx.lineTo(centerX + 180, divY);
  ctx.stroke();
  ctx.fillStyle = '#e8c17e';
  ctx.font = '18px Georgia, serif';
  ctx.fillText('✦', centerX, divY);

  // Main greeting text
  const message = (greeting || '').trim() || 'Merry Christmas';
  ctx.fillStyle = '#fff3d6';
  const fontSize = isPortrait
    ? (message.length > 20 ? 40 : 50)
    : (message.length > 26 ? 38 : 46);
  ctx.font = `600 ${fontSize}px "Songti SC", "Noto Serif CJK SC", Georgia, serif`;
  ctx.fillText(message, centerX, footerTop + footerH * 0.54, frameW - 40);

  // Subtle subtitle + date stamp
  const stamp = [title, dateText].filter(Boolean).join('  ·  ');
  ctx.fillStyle = 'rgba(242, 207, 152, 0.76)';
  ctx.font = '500 20px "PingFang SC", system-ui, sans-serif';
  ctx.fillText(stamp, centerX, footerTop + footerH * 0.80);
}
