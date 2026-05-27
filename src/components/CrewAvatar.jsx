const palettes = [
  { suit: '#d7e4e4', visor: '#14f1ff', accent: '#ffb000', skin: '#7dd3fc' },
  { suit: '#1f2937', visor: '#7dd3fc', accent: '#a78bfa', skin: '#86efac' },
  { suit: '#e8dcc8', visor: '#2f6f78', accent: '#ef4444', skin: '#facc15' },
  { suit: '#0f172a', visor: '#22d3ee', accent: '#f97316', skin: '#c084fc' },
  { suit: '#cbd5e1', visor: '#67e8f9', accent: '#38bdf8', skin: '#fda4af' },
];

function hashString(value = 'sf-explorer') {
  return value.split('').reduce((hash, char) => {
    const nextHash = ((hash << 5) - hash) + char.charCodeAt(0);
    return nextHash & nextHash;
  }, 0);
}

export default function CrewAvatar({ seed = 'sf-explorer', label = '탐사 대원' }) {
  const hash = Math.abs(hashString(seed));
  const palette = palettes[hash % palettes.length];
  const variant = hash % 5;
  const antenna = hash % 2 === 0;
  const respirator = hash % 3 === 0;
  const serial = `SFA-${String(hash % 9999).padStart(4, '0')}`;
  const gradientId = `crew-visor-${hash}`;

  return (
    <div className="crew-avatar" aria-label={`${label} 자동 생성 증명사진`}>
      <svg viewBox="0 0 180 220" role="img">
        <title>{label} 자동 생성 탐사 대원 이미지</title>
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor={palette.visor} stopOpacity="0.95" />
            <stop offset="100%" stopColor="#001417" stopOpacity="0.9" />
          </linearGradient>
          <filter id="avatarNoise">
            <feTurbulence baseFrequency="0.9" numOctaves="2" seed={hash % 23} type="fractalNoise" />
            <feColorMatrix type="saturate" values="0" />
            <feComponentTransfer>
              <feFuncA slope="0.08" type="linear" />
            </feComponentTransfer>
          </filter>
        </defs>
        <rect width="180" height="220" fill="#061015" />
        <rect width="180" height="220" fill="url(#avatarNoise)" />
        <circle cx="90" cy="88" r="58" fill={palette.suit} opacity="0.98" />
        <path d="M38 202c8-40 26-62 52-62s44 22 52 62H38Z" fill={palette.suit} />
        <path d="M52 90c0-31 16-50 38-50s38 19 38 50c0 34-17 54-38 54S52 124 52 90Z" fill={palette.skin} opacity="0.92" />
        {variant === 0 && <path d="M58 84c14-22 48-25 64 0v30H58V84Z" fill={`url(#${gradientId})`} />}
        {variant === 1 && <ellipse cx="90" cy="91" rx="42" ry="25" fill={`url(#${gradientId})`} />}
        {variant === 2 && <path d="M57 78h66l-8 38H65L57 78Z" fill={`url(#${gradientId})`} />}
        {variant === 3 && <path d="M63 71h54c7 12 7 29 0 42H63c-7-13-7-30 0-42Z" fill={`url(#${gradientId})`} />}
        {variant === 4 && <path d="M58 77c20-13 45-13 64 0l-10 42H68L58 77Z" fill={`url(#${gradientId})`} />}
        <line x1="64" x2="116" y1="96" y2="96" stroke={palette.accent} strokeOpacity="0.8" />
        {respirator && (
          <g>
            <rect x="72" y="119" width="36" height="22" rx="8" fill="#111827" stroke={palette.accent} strokeOpacity="0.72" />
            <circle cx="82" cy="130" r="4" fill={palette.visor} />
            <circle cx="98" cy="130" r="4" fill={palette.visor} />
          </g>
        )}
        {antenna && (
          <g stroke={palette.accent} strokeWidth="3" strokeLinecap="round">
            <path d="M53 49 32 28" />
            <path d="M127 49 148 28" />
            <circle cx="29" cy="25" r="4" fill={palette.accent} stroke="none" />
            <circle cx="151" cy="25" r="4" fill={palette.accent} stroke="none" />
          </g>
        )}
        <path d="M46 161h88" stroke={palette.accent} strokeOpacity="0.55" />
        <circle cx="90" cy="170" r="10" fill="#08151a" stroke={palette.visor} strokeOpacity="0.8" />
        <path d="M88 169h4v-16h-4v16Zm0 13h4v-8h-4v8Z" fill={palette.visor} />
        <text x="16" y="205" fill={palette.visor} fontFamily="Courier New, monospace" fontSize="10" fontWeight="700">{serial}</text>
      </svg>
    </div>
  );
}
