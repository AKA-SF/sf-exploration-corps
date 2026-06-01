import { useState } from 'react';
import { Download } from 'lucide-react';
import QRCode from 'qrcode';
import './ProfileCyberIdCard.css';

const CARD_WIDTH = 1600;
const CARD_HEIGHT = 1000;
const GRID = 18;
const CYAN = '#19F7FF';
const CYAN_SOFT = '#00B8C8';
const WHITE = '#F2FBFF';
const MUTED = '#9FB8C0';
const AMBER = '#FFBD4A';

function hashString(value = 'sf-explorer') {
  return value.split('').reduce((hash, char) => {
    const nextHash = ((hash << 5) - hash) + char.charCodeAt(0);
    return nextHash & nextHash;
  }, 0);
}

function makeRng(seed) {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function drawRoundRect(context, x, y, width, height, radius) {
  if (context.roundRect) {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    return;
  }

  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
}

function drawText(context, text, x, y, options = {}) {
  const {
    align = 'left',
    color = WHITE,
    font = '700 34px system-ui, sans-serif',
    maxWidth,
  } = options;
  context.save();
  context.fillStyle = color;
  context.font = font;
  context.textAlign = align;
  context.fillText(String(text ?? ''), x, y, maxWidth);
  context.restore();
}

function drawLine(context, x1, y1, x2, y2, color = 'rgba(25, 247, 255, 0.22)', width = 1) {
  context.save();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
  context.restore();
}

function drawScanGrid(context, x, y, width, height, gap = 20) {
  context.save();
  context.strokeStyle = 'rgba(25, 247, 255, 0.055)';
  context.lineWidth = 1;
  for (let lineY = y; lineY <= y + height; lineY += gap) drawLine(context, x, lineY, x + width, lineY, context.strokeStyle);
  for (let lineX = x; lineX <= x + width; lineX += gap) drawLine(context, lineX, y, lineX, y + height, context.strokeStyle);
  context.restore();
}

function drawGlassPanel(context, x, y, width, height, radius = 22, accent = CYAN) {
  context.save();
  drawRoundRect(context, x, y, width, height, radius);
  context.fillStyle = 'rgba(2, 16, 23, 0.72)';
  context.fill();
  context.strokeStyle = `${accent}88`;
  context.lineWidth = 2;
  context.stroke();

  const sheen = context.createLinearGradient(x, y, x + width, y + height);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
  sheen.addColorStop(0.24, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.72, 'rgba(25, 247, 255, 0.05)');
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
  drawRoundRect(context, x + 2, y + 2, width - 4, height - 4, radius - 2);
  context.fillStyle = sheen;
  context.fill();
  context.restore();
}

function drawCornerTicks(context, x, y, width, height, color = CYAN) {
  context.save();
  context.strokeStyle = `${color}cc`;
  context.lineWidth = 4;
  const size = 36;
  [
    [x, y, x + size, y, x, y + size],
    [x + width, y, x + width - size, y, x + width, y + size],
    [x, y + height, x + size, y + height, x, y + height - size],
    [x + width, y + height, x + width - size, y + height, x + width, y + height - size],
  ].forEach(([a, b, c, d, e, f]) => {
    context.beginPath();
    context.moveTo(a, b);
    context.lineTo(c, d);
    context.moveTo(a, b);
    context.lineTo(e, f);
    context.stroke();
  });
  context.restore();
}

function drawCompass(context, cx, cy, size) {
  context.save();
  context.translate(cx, cy);
  context.strokeStyle = `${CYAN}99`;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, size * 0.45, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = CYAN;
  context.globalAlpha = 0.9;
  context.beginPath();
  context.moveTo(0, -size * 0.55);
  context.lineTo(size * 0.12, -size * 0.08);
  context.lineTo(size * 0.55, 0);
  context.lineTo(size * 0.12, size * 0.08);
  context.lineTo(0, size * 0.55);
  context.lineTo(-size * 0.12, size * 0.08);
  context.lineTo(-size * 0.55, 0);
  context.lineTo(-size * 0.12, -size * 0.08);
  context.closePath();
  context.fill();
  context.fillStyle = '#020B10';
  context.beginPath();
  context.arc(0, 0, size * 0.09, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function drawNfcIcon(context, x, y) {
  context.save();
  context.strokeStyle = CYAN;
  context.lineWidth = 4;
  for (let index = 0; index < 3; index += 1) {
    context.beginPath();
    context.arc(x, y, 18 + index * 18, -Math.PI / 3, Math.PI / 3);
    context.stroke();
  }
  drawText(context, 'NFC', x - 10, y + 76, {
    color: CYAN,
    font: '800 22px "Courier New", monospace',
  });
  context.restore();
}

function drawHolographicSeal(context, x, y, radius) {
  context.save();
  context.translate(x, y);
  const glow = context.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 1.25);
  glow.addColorStop(0, 'rgba(242, 251, 255, 0.35)');
  glow.addColorStop(0.42, 'rgba(25, 247, 255, 0.24)');
  glow.addColorStop(0.72, 'rgba(104, 131, 255, 0.22)');
  glow.addColorStop(1, 'rgba(25, 247, 255, 0)');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(105, 185, 255, 0.95)';
  context.lineWidth = 4;
  context.beginPath();
  context.arc(0, 0, radius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = 'rgba(25, 247, 255, 0.72)';
  context.lineWidth = 2;
  context.beginPath();
  context.arc(0, 0, radius * 0.78, 0, Math.PI * 2);
  context.stroke();

  drawCompass(context, 0, 0, radius * 0.9);
  context.fillStyle = 'rgba(242, 251, 255, 0.86)';
  context.font = '900 15px "Courier New", monospace';
  context.textAlign = 'center';
  context.fillText('OFFICIAL SEAL', 0, radius + 22);
  context.restore();
}

function drawHudIcon(context, x, y, type) {
  context.save();
  context.strokeStyle = `${CYAN}88`;
  context.lineWidth = 2;
  context.fillStyle = 'rgba(25, 247, 255, 0.08)';
  drawRoundRect(context, x, y, 58, 58, 14);
  context.fill();
  context.stroke();
  context.translate(x + 29, y + 29);
  context.strokeStyle = CYAN;
  context.lineWidth = 3;
  if (type === 'brain') {
    context.beginPath();
    context.arc(-8, -4, 10, Math.PI * 0.2, Math.PI * 1.8);
    context.arc(8, -4, 10, Math.PI * 1.2, Math.PI * 0.8, true);
    context.moveTo(-4, 8);
    context.lineTo(-4, 20);
    context.moveTo(8, 8);
    context.lineTo(8, 18);
    context.stroke();
  } else if (type === 'target') {
    context.beginPath();
    context.arc(0, 0, 16, 0, Math.PI * 2);
    context.moveTo(-24, 0);
    context.lineTo(24, 0);
    context.moveTo(0, -24);
    context.lineTo(0, 24);
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(0, -24);
    context.lineTo(12, 20);
    context.lineTo(0, 12);
    context.lineTo(-12, 20);
    context.closePath();
    context.stroke();
  }
  context.restore();
}

function avatarPixels(seed) {
  const hash = Math.abs(hashString(seed));
  const random = makeRng(hash);
  const pixels = new Map();

  const addRect = (x, y, width, height, alpha = 1) => {
    for (let row = y; row < y + height; row += 1) {
      for (let col = x; col < x + width; col += 1) pixels.set(`${col},${row}`, alpha);
    }
  };
  const addSymmetric = (leftX, y, alpha = 1) => {
    pixels.set(`${leftX},${y}`, alpha);
    pixels.set(`${GRID - 1 - leftX},${y}`, alpha);
  };

  addRect(5, hash % 5 === 0 ? 2 : 3, 8, hash % 5 === 0 ? 2 : 1, 0.44);
  addRect(4, 4, 10, 2, 0.72);
  addRect(3, 6, 12, 6, 0.94);
  addRect(4, 12, 10, 2, 0.76);
  addRect(5, 14, 8, 2, 0.62);
  addRect(3, 16, 12, 2, 0.44);

  if (hash % 3 === 0) {
    addRect(7, 11, 4, 2, 1);
    addSymmetric(6, 12, 0.86);
  } else {
    addRect(6, 8, 6, 2, 1);
    addSymmetric(5, 10, 0.7);
  }

  if (hash % 2 === 0) {
    addSymmetric(2, 3, 0.72);
    addSymmetric(1, 2, 0.54);
    addSymmetric(0, 1, 0.92);
  }

  for (let index = 0; index < 16; index += 1) {
    const x = 2 + Math.floor(random() * 14);
    const y = 2 + Math.floor(random() * 15);
    if (random() > 0.74) pixels.set(`${x},${y}`, 0.24 + random() * 0.3);
  }

  return pixels;
}

function drawAvatar(context, seed, x, y, size) {
  const pixels = avatarPixels(seed);
  const pixel = size / GRID;

  context.save();
  drawGlassPanel(context, x - 24, y - 24, size + 48, size + 98, 24);
  drawScanGrid(context, x, y, size, size, 16);
  context.fillStyle = 'rgba(25, 247, 255, 0.12)';
  context.fillRect(x, y, size, size);

  pixels.forEach((alpha, key) => {
    const [col, row] = key.split(',').map(Number);
    context.globalAlpha = alpha;
    context.fillStyle = CYAN;
    context.shadowColor = CYAN;
    context.shadowBlur = 10;
    context.fillRect(x + col * pixel, y + row * pixel, Math.ceil(pixel), Math.ceil(pixel));
  });

  context.globalAlpha = 1;
  context.shadowBlur = 0;
  drawText(context, 'AUTO AVATAR', x + size / 2, y + size + 45, {
    align: 'center',
    color: CYAN,
    font: '900 20px "Courier New", monospace',
  });
  context.restore();
}

function drawInfoField(context, icon, label, value, x, y, width) {
  drawHudIcon(context, x, y - 38, icon);
  drawText(context, label, x + 82, y - 16, {
    color: CYAN,
    font: '800 20px "Courier New", monospace',
  });
  drawText(context, value, x + 82, y + 28, {
    color: WHITE,
    font: '900 34px system-ui, sans-serif',
    maxWidth: width,
  });
  drawLine(context, x + 82, y + 48, x + width, y + 48, 'rgba(25, 247, 255, 0.34)', 2);
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  let line = '';
  let lineCount = 0;
  words.forEach(word => {
    if (lineCount >= maxLines) return;
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, y + lineCount * lineHeight);
      line = word;
      lineCount += 1;
      return;
    }
    line = nextLine;
  });
  if (line && lineCount < maxLines) context.fillText(line, x, y + lineCount * lineHeight);
}

function drawSecurityStrip(context, x, y, width, height, label) {
  context.save();
  drawRoundRect(context, x, y, width, height, 18);
  context.fillStyle = 'rgba(255, 189, 74, 0.08)';
  context.fill();
  context.strokeStyle = 'rgba(255, 189, 74, 0.52)';
  context.lineWidth = 2;
  context.stroke();
  drawText(context, label, x + width / 2, y + height / 2 + 10, {
    align: 'center',
    color: AMBER,
    font: '900 26px "Courier New", monospace',
  });
  context.restore();
}

function drawBarcode(context, x, y, width, height, seed) {
  const random = makeRng(Math.abs(hashString(seed)));
  context.save();
  context.fillStyle = 'rgba(25, 247, 255, 0.72)';
  let cursor = x;
  while (cursor < x + width) {
    const barWidth = 2 + Math.floor(random() * 6);
    const alpha = 0.26 + random() * 0.5;
    context.globalAlpha = alpha;
    context.fillRect(cursor, y, barWidth, height);
    cursor += barWidth + 3 + Math.floor(random() * 6);
  }
  context.restore();
}

function buildContactUrl(serial) {
  const origin = typeof window === 'undefined'
    ? 'https://sf-exploration-corps.vercel.app'
    : window.location.origin;
  return `${origin}/network?to=${encodeURIComponent(serial)}`;
}

async function drawContactQrPanel(context, contactUrl, x, y, width, height) {
  drawGlassPanel(context, x, y, width, height, 26);
  drawCornerTicks(context, x + 18, y + 18, width - 36, height - 36, CYAN);
  drawText(context, 'MESSENGER ACCESS', x + width / 2, y + 62, {
    align: 'center',
    color: 'rgba(159, 184, 192, 0.95)',
    font: '900 20px "Courier New", monospace',
  });

  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, contactUrl, {
    errorCorrectionLevel: 'M',
    margin: 3,
    width: 260,
    color: {
      dark: '#020B10',
      light: '#FFFFFF',
    },
  });

  const qrX = x + (width - 292) / 2;
  const qrY = y + 92;
  drawRoundRect(context, qrX, qrY, 292, 292, 18);
  context.fillStyle = '#ffffff';
  context.fill();
  context.drawImage(qrCanvas, qrX + 16, qrY + 16, 260, 260);

  drawText(context, 'SCAN TO CONTACT', x + width / 2, y + height - 68, {
    align: 'center',
    color: CYAN,
    font: '900 22px "Courier New", monospace',
  });
  drawText(context, 'DIRECT CHANNEL READY', x + width / 2, y + height - 34, {
    align: 'center',
    color: AMBER,
    font: '900 14px "Courier New", monospace',
  });
}

function drawPremiumBackground(context) {
  const bg = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, '#020B10');
  bg.addColorStop(0.45, '#061923');
  bg.addColorStop(1, '#071E26');
  context.fillStyle = bg;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  drawScanGrid(context, 0, 0, CARD_WIDTH, CARD_HEIGHT, 22);
  context.save();
  context.globalCompositeOperation = 'lighter';
  [
    [340, 300, 420, 'rgba(25, 247, 255, 0.15)'],
    [1160, 200, 520, `${CYAN_SOFT}24`],
    [980, 760, 560, 'rgba(255, 189, 74, 0.06)'],
  ].forEach(([x, y, radius, color]) => {
    const glow = context.createRadialGradient(x, y, 20, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  });
  context.restore();
}

async function buildCardCanvas({ nickname, points, rank, stats, tasteProfile, unlockedBadges, user }) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  const seed = user?.id || user?.email || nickname || 'sf-explorer';
  const serial = `SFA-${String(Math.abs(hashString(seed)) % 999999).padStart(6, '0')}`;
  const issuedDate = new Date().toLocaleDateString('ko-KR');
  const contactUrl = buildContactUrl(serial);
  const taste = tasteProfile ?? {
    code: 'TYPE-SCAN',
    title: '성향 미확인',
    genre: '테스트 대기',
    vessel: '미배정 탐사선',
    summary: 'SF 탐사 성향 테스트를 완료하면 이 영역에 개인 탐사 유형이 표시됩니다.',
  };

  drawPremiumBackground(context);
  drawRoundRect(context, 42, 42, CARD_WIDTH - 84, CARD_HEIGHT - 84, 54);
  context.fillStyle = 'rgba(2, 11, 16, 0.74)';
  context.fill();
  context.shadowColor = CYAN;
  context.shadowBlur = 22;
  context.strokeStyle = 'rgba(25, 247, 255, 0.9)';
  context.lineWidth = 5;
  context.stroke();
  context.shadowBlur = 0;
  drawCornerTicks(context, 66, 66, CARD_WIDTH - 132, CARD_HEIGHT - 132);

  drawLine(context, 226, 92, 660, 92, 'rgba(25, 247, 255, 0.56)', 2);
  drawLine(context, 1010, 92, 1380, 92, 'rgba(25, 247, 255, 0.56)', 2);
  drawText(context, 'SF EXPLORATION CORPS', 245, 72, {
    color: CYAN,
    font: '900 19px "Courier New", monospace',
  });

  drawCompass(context, 134, 164, 84);
  drawText(context, 'SF 탐사단', 210, 184, {
    color: WHITE,
    font: '900 78px system-ui, sans-serif',
  });
  drawText(context, 'CERTIFIED INTERSTELLAR ARCHIVE CREW', 210, 236, {
    color: CYAN,
    font: '900 24px "Courier New", monospace',
  });

  drawHolographicSeal(context, 970, 160, 76);
  drawText(context, serial, 1160, 158, {
    color: CYAN,
    font: '900 42px "Courier New", monospace',
  });
  drawGlassPanel(context, 1156, 182, 280, 48, 12);
  drawText(context, '✓ VERIFIED CREW', 1192, 214, {
    color: CYAN,
    font: '900 22px "Courier New", monospace',
  });
  drawGlassPanel(context, 1455, 104, 86, 140, 20);
  drawNfcIcon(context, 1494, 154);

  drawAvatar(context, seed, 150, 330, 260);
  drawGlassPanel(context, 108, 724, 394, 68, 14);
  drawText(context, 'CALLSIGN', 150, 766, {
    color: CYAN,
    font: '900 20px "Courier New", monospace',
  });
  drawText(context, nickname || '탐사 대원', 342, 770, {
    color: WHITE,
    font: '900 34px system-ui, sans-serif',
    maxWidth: 140,
  });
  drawGlassPanel(context, 108, 808, 394, 68, 14);
  drawText(context, 'CREW RANK', 150, 850, {
    color: CYAN,
    font: '900 20px "Courier New", monospace',
  });
  drawText(context, rank.current.title, 342, 854, {
    color: WHITE,
    font: '900 32px system-ui, sans-serif',
    maxWidth: 140,
  });

  drawInfoField(context, 'brain', 'TASTE PROFILE', taste.title, 570, 346, 1040);
  drawInfoField(context, 'target', 'GENRE VECTOR', taste.genre, 570, 476, 1040);
  drawInfoField(context, 'ship', 'VESSEL', taste.vessel, 570, 606, 1040);

  drawGlassPanel(context, 570, 666, 540, 126, 18);
  context.fillStyle = 'rgba(242, 251, 255, 0.78)';
  context.font = '800 27px system-ui, sans-serif';
  drawWrappedText(context, `“${taste.summary}”`, 602, 716, 485, 36, 2);

  await drawContactQrPanel(context, contactUrl, 1168, 306, 310, 486);
  drawSecurityStrip(
    context,
    560,
    830,
    780,
    76,
    `${taste.code}  /  ${points} MP  /  ${unlockedBadges.length} BADGES  /  ${stats.reviews} REVIEWS`,
  );

  drawBarcode(context, 470, 920, 450, 18, seed);
  drawText(context, `ISSUED ${issuedDate}`, 110, 935, {
    color: 'rgba(242, 251, 255, 0.7)',
    font: '900 18px "Courier New", monospace',
  });
  drawText(context, 'BIOMETRIC VERIFIED', 610, 945, {
    color: CYAN,
    font: '900 20px "Courier New", monospace',
  });
  drawText(context, 'sf-exploration-corps.vercel.app', 1120, 935, {
    color: CYAN,
    font: '900 20px "Courier New", monospace',
  });
  drawText(context, 'SF EXPLORATION CORPS · ARCHIVE CREW · VERIFIED · INTERSTELLAR PASS', 800, 978, {
    align: 'center',
    color: `${MUTED}75`,
    font: '900 11px "Courier New", monospace',
  });

  return canvas;
}

function downloadCanvas(canvas, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export default function ProfileCyberIdCard({
  nickname,
  points,
  rank,
  stats,
  tasteProfile,
  unlockedBadges,
  user,
}) {
  const [isExporting, setIsExporting] = useState(false);
  const filename = `sf-crew-id-${(nickname || 'explorer').replace(/\s+/g, '-').toLowerCase()}.png`;

  const createCanvas = () => buildCardCanvas({
    nickname,
    points,
    rank,
    stats,
    tasteProfile,
    unlockedBadges,
    user,
  });

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      downloadCanvas(await createCanvas(), filename);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button className="profile-cyber-id-tab" type="button" onClick={handleDownload} disabled={isExporting}>
      <span className="mono">CYBER ID</span>
      <strong>{isExporting ? '생성 중' : 'ID카드 다운'}</strong>
      <Download size={15} aria-hidden="true" />
    </button>
  );
}
