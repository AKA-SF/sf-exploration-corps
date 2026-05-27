const GRID = 18;
const PIXEL = 10;

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

function addRect(pixels, x, y, w, h, opacity = 1) {
  for (let row = y; row < y + h; row += 1) {
    for (let col = x; col < x + w; col += 1) {
      pixels.set(`${col},${row}`, opacity);
    }
  }
}

function addSymmetric(pixels, leftX, y, opacity = 1) {
  pixels.set(`${leftX},${y}`, opacity);
  pixels.set(`${GRID - 1 - leftX},${y}`, opacity);
}

export default function CrewAvatar({ seed = 'sf-explorer', label = '탐사 대원' }) {
  const hash = Math.abs(hashString(seed));
  const random = makeRng(hash);
  const pixels = new Map();
  const hasAntenna = hash % 2 === 0;
  const hasRespirator = hash % 3 === 0;
  const hasTallHelmet = hash % 5 === 0;
  const serial = `SFA-${String(hash % 9999).padStart(4, '0')}`;

  addRect(pixels, 5, hasTallHelmet ? 2 : 3, 8, hasTallHelmet ? 2 : 1, 0.42);
  addRect(pixels, 4, 4, 10, 2, 0.72);
  addRect(pixels, 3, 6, 12, 6, 0.92);
  addRect(pixels, 4, 12, 10, 2, 0.72);
  addRect(pixels, 5, 14, 8, 2, 0.6);
  addRect(pixels, 3, 16, 12, 2, 0.42);

  if (hasRespirator) {
    addRect(pixels, 7, 11, 4, 2, 1);
    addSymmetric(pixels, 6, 12, 0.84);
  } else {
    addRect(pixels, 6, 8, 6, 2, 1);
    addSymmetric(pixels, 5, 10, 0.68);
  }

  if (hasAntenna) {
    addSymmetric(pixels, 2, 3, 0.72);
    addSymmetric(pixels, 1, 2, 0.54);
    addSymmetric(pixels, 0, 1, 0.92);
  }

  for (let i = 0; i < 14; i += 1) {
    const x = 2 + Math.floor(random() * 14);
    const y = 2 + Math.floor(random() * 15);
    if (random() > 0.72) pixels.set(`${x},${y}`, 0.25 + random() * 0.28);
  }

  const pixelNodes = Array.from(pixels.entries()).map(([key, opacity]) => {
    const [x, y] = key.split(',').map(Number);
    return (
      <rect
        fill="currentColor"
        height={PIXEL}
        key={key}
        opacity={opacity}
        shapeRendering="crispEdges"
        width={PIXEL}
        x={x * PIXEL}
        y={y * PIXEL}
      />
    );
  });

  return (
    <div className="crew-avatar" aria-label={`${label} 자동 생성 8비트 증명사진`}>
      <svg viewBox="0 0 180 220" role="img">
        <title>{label} 자동 생성 8비트 탐사 대원 이미지</title>
        <rect className="crew-avatar-bg" width="180" height="220" />
        <g transform="translate(0 8)">
          {pixelNodes}
        </g>
        <g className="crew-avatar-frame">
          <rect x="12" y="190" width="156" height="1" />
          <rect x="12" y="198" width="86" height="1" />
          <rect x="12" y="206" width="126" height="1" />
        </g>
        <text className="crew-avatar-serial" x="14" y="185">{serial}</text>
      </svg>
    </div>
  );
}
