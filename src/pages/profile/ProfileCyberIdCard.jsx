import { Download, Share2 } from 'lucide-react';
import './ProfileCyberIdCard.css';

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 750;
const GRID = 18;

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
    color = '#eaffff',
    font = '700 34px system-ui, sans-serif',
    maxWidth,
  } = options;
  context.fillStyle = color;
  context.font = font;
  context.fillText(String(text ?? ''), x, y, maxWidth);
}

function drawScanLine(context, x, y, width, height, gap = 18) {
  context.save();
  context.strokeStyle = 'rgba(25, 247, 241, 0.08)';
  context.lineWidth = 1;
  for (let lineY = y; lineY <= y + height; lineY += gap) {
    context.beginPath();
    context.moveTo(x, lineY);
    context.lineTo(x + width, lineY);
    context.stroke();
  }
  for (let lineX = x; lineX <= x + width; lineX += gap) {
    context.beginPath();
    context.moveTo(lineX, y);
    context.lineTo(lineX, y + height);
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
      for (let col = x; col < x + width; col += 1) {
        pixels.set(`${col},${row}`, alpha);
      }
    }
  };
  const addSymmetric = (leftX, y, alpha = 1) => {
    pixels.set(`${leftX},${y}`, alpha);
    pixels.set(`${GRID - 1 - leftX},${y}`, alpha);
  };

  const hasAntenna = hash % 2 === 0;
  const hasRespirator = hash % 3 === 0;
  const hasTallHelmet = hash % 5 === 0;

  addRect(5, hasTallHelmet ? 2 : 3, 8, hasTallHelmet ? 2 : 1, 0.42);
  addRect(4, 4, 10, 2, 0.72);
  addRect(3, 6, 12, 6, 0.92);
  addRect(4, 12, 10, 2, 0.72);
  addRect(5, 14, 8, 2, 0.6);
  addRect(3, 16, 12, 2, 0.42);

  if (hasRespirator) {
    addRect(7, 11, 4, 2, 1);
    addSymmetric(6, 12, 0.84);
  } else {
    addRect(6, 8, 6, 2, 1);
    addSymmetric(5, 10, 0.68);
  }

  if (hasAntenna) {
    addSymmetric(2, 3, 0.72);
    addSymmetric(1, 2, 0.54);
    addSymmetric(0, 1, 0.92);
  }

  for (let index = 0; index < 14; index += 1) {
    const x = 2 + Math.floor(random() * 14);
    const y = 2 + Math.floor(random() * 15);
    if (random() > 0.72) pixels.set(`${x},${y}`, 0.25 + random() * 0.28);
  }

  return { hash, pixels };
}

function drawAvatar(context, seed, x, y, size) {
  const { pixels } = avatarPixels(seed);
  const pixel = size / GRID;

  context.save();
  drawRoundRect(context, x - 18, y - 18, size + 36, size + 74, 18);
  context.fillStyle = 'rgba(4, 18, 24, 0.86)';
  context.fill();
  context.strokeStyle = 'rgba(25, 247, 241, 0.5)';
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = 'rgba(25, 247, 241, 0.1)';
  context.fillRect(x, y, size, size);
  pixels.forEach((alpha, key) => {
    const [col, row] = key.split(',').map(Number);
    context.globalAlpha = alpha;
    context.fillStyle = '#19f7f1';
    context.fillRect(x + col * pixel, y + row * pixel, Math.ceil(pixel), Math.ceil(pixel));
  });
  context.globalAlpha = 1;
  drawText(context, 'AUTO AVATAR', x + 4, y + size + 34, {
    color: 'rgba(234, 255, 255, 0.72)',
    font: '700 18px "Courier New", monospace',
  });
  context.restore();
}

function drawField(context, label, value, x, y, width) {
  drawText(context, label, x, y, {
    color: '#19f7f1',
    font: '800 18px "Courier New", monospace',
  });
  drawText(context, value, x, y + 38, {
    color: '#f4ffff',
    font: '800 30px system-ui, sans-serif',
    maxWidth: width,
  });
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

  if (line && lineCount < maxLines) {
    context.fillText(line, x, y + lineCount * lineHeight);
  }
}

function buildCardCanvas({ nickname, points, rank, stats, tasteProfile, unlockedBadges, user }) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  const seed = user?.id || user?.email || nickname || 'sf-explorer';
  const serial = `SFA-${String(Math.abs(hashString(seed)) % 999999).padStart(6, '0')}`;
  const issuedDate = new Date().toLocaleDateString('ko-KR');
  const taste = tasteProfile ?? {
    code: 'TYPE-SCAN',
    title: '성향 미확인',
    genre: '테스트 대기',
    vessel: '미배정 탐사선',
    summary: 'SF 탐사 성향 테스트를 완료하면 이 영역에 개인 탐사 유형이 표시됩니다.',
  };

  const bg = context.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  bg.addColorStop(0, '#02070c');
  bg.addColorStop(0.55, '#03171d');
  bg.addColorStop(1, '#010305');
  context.fillStyle = bg;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  drawScanLine(context, 0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.save();
  context.globalCompositeOperation = 'lighter';
  const glow = context.createRadialGradient(850, 220, 20, 850, 220, 460);
  glow.addColorStop(0, 'rgba(25, 247, 241, 0.28)');
  glow.addColorStop(0.42, 'rgba(25, 247, 241, 0.08)');
  glow.addColorStop(1, 'rgba(25, 247, 241, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  context.restore();

  drawRoundRect(context, 48, 48, CARD_WIDTH - 96, CARD_HEIGHT - 96, 28);
  context.fillStyle = 'rgba(2, 12, 18, 0.72)';
  context.fill();
  context.strokeStyle = 'rgba(25, 247, 241, 0.7)';
  context.lineWidth = 3;
  context.stroke();

  context.strokeStyle = 'rgba(25, 247, 241, 0.26)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(410, 108);
  context.lineTo(410, 640);
  context.stroke();

  drawText(context, 'SF 탐사단', 86, 116, {
    color: '#ffffff',
    font: '900 48px system-ui, sans-serif',
  });
  drawText(context, 'CERTIFIED INTERSTELLAR ARCHIVE CREW', 88, 156, {
    color: '#19f7f1',
    font: '800 19px "Courier New", monospace',
  });
  drawText(context, serial, 908, 116, {
    color: '#19f7f1',
    font: '900 28px "Courier New", monospace',
  });

  drawAvatar(context, seed, 112, 214, 220);
  drawField(context, 'CALLSIGN', nickname || '탐사 대원', 88, 552, 290);
  drawField(context, 'CREW RANK', rank.current.title, 88, 638, 290);

  drawField(context, 'TASTE PROFILE', taste.title, 460, 238, 560);
  drawField(context, 'GENRE VECTOR', taste.genre, 460, 330, 600);
  drawField(context, 'VESSEL', taste.vessel, 460, 422, 560);

  context.fillStyle = 'rgba(234, 255, 255, 0.78)';
  context.font = '700 25px system-ui, sans-serif';
  drawWrappedText(context, taste.summary, 460, 514, 610, 35, 2);

  drawRoundRect(context, 460, 578, 620, 74, 14);
  context.fillStyle = 'rgba(25, 247, 241, 0.08)';
  context.fill();
  context.strokeStyle = 'rgba(25, 247, 241, 0.22)';
  context.stroke();

  drawText(context, `${taste.code}  /  ${points} MP  /  ${unlockedBadges.length} BADGES  /  ${stats.reviews} REVIEWS`, 484, 624, {
    color: '#f0b85a',
    font: '900 23px "Courier New", monospace',
    maxWidth: 570,
  });

  drawText(context, `ISSUED ${issuedDate}`, 86, 704, {
    color: 'rgba(234, 255, 255, 0.56)',
    font: '800 18px "Courier New", monospace',
  });
  drawText(context, 'sf-exploration-corps.vercel.app', 786, 704, {
    color: 'rgba(25, 247, 241, 0.72)',
    font: '800 18px "Courier New", monospace',
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
  const hasTasteProfile = Boolean(tasteProfile);
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

  const handleDownload = () => {
    downloadCanvas(createCanvas(), filename);
  };

  const handleShare = async () => {
    const canvas = createCanvas();
    canvas.toBlob(async blob => {
      if (!blob) {
        downloadCanvas(canvas, filename);
        return;
      }

      const file = new File([blob], filename, { type: 'image/png' });
      try {
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'SF 탐사단 대원증',
            text: `${nickname || '탐사 대원'}의 SF 탐사단 대원증`,
          });
          return;
        }
      } catch {
        // Sharing is optional; download remains the reliable fallback.
      }

      downloadCanvas(canvas, filename);
    }, 'image/png');
  };

  return (
    <div className="profile-cyber-id-panel">
      <div className="profile-cyber-id-copy">
        <div>
          <span className="mono text-muted text-xs">CYBER ID CARD</span>
          <h3 className="mono">ID 카드 다운</h3>
        </div>
        <p>
          {hasTasteProfile
            ? `${tasteProfile.title} 기록 포함`
            : '성향 테스트 후 결과 포함'}
        </p>
      </div>
      <div className="profile-cyber-id-preview" aria-hidden="true">
        <i />
        <small className="mono">{tasteProfile?.code ?? 'TYPE-SCAN'}</small>
      </div>
      <div className="profile-cyber-id-actions">
        <button type="button" onClick={handleDownload}>
          <Download size={15} aria-hidden="true" />
          PNG
        </button>
        <button type="button" onClick={handleShare}>
          <Share2 size={15} aria-hidden="true" />
          공유
        </button>
      </div>
    </div>
  );
}
