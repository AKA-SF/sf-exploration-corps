import { useLogs } from '../context/LogContext';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';
import { useMotionProfile } from '../hooks/useMotionProfile';

const seeded = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const getParticleCount = ({ isHome, isStatic, compact }) => {
  if (isStatic) return 0;
  if (isHome) return compact ? 18 : 40;
  return compact ? 8 : 18;
};

const InteractiveBackground = ({ lowPower = false }) => {
  const { currentSystemState } = useLogs();
  const location = useLocation();
  const motionProfile = useMotionProfile();
  const risk = currentSystemState.riskLevel || 0;
  const isHome = location.pathname === '/';
  const isVisualSurface = isHome
    || location.pathname.startsWith('/works')
    || location.pathname.startsWith('/media')
    || location.pathname === '/exploration-log'
    || location.pathname.startsWith('/questions')
    || location.pathname.startsWith('/network');
  const isStatic = lowPower || motionProfile.reduced;
  const particleCount = getParticleCount({
    isHome,
    isStatic,
    compact: motionProfile.compact,
  });
  const showGeometry = isVisualSurface && !isStatic && !(motionProfile.compact && !isHome);
  
  const speed = 1 + (risk / 100) * 3; 
  const isDanger = risk > 80 && isVisualSurface;

  const particles = useMemo(() => Array.from({ length: particleCount }).map((_, i) => ({
    id: i,
    x: seeded(i + 11) * 100,
    y: seeded(i + 37) * 100,
    r: seeded(i + 71) * 0.8 + 0.2,
    delay: seeded(i + 103) * 2
  })), [particleCount]);

  return (
    <>
      <div className={`noise-bg ${isStatic ? 'is-static' : ''}`}></div>
      <div className={`crt-overlay ${isStatic || motionProfile.compact ? 'is-static' : ''}`}></div>
      {!isStatic && !motionProfile.compact && <div className="scanline"></div>}

      {showGeometry && (
        <div className="bg-geometry" style={{ filter: isDanger ? 'hue-rotate(180deg) saturate(2)' : 'none' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="radar-svg">
          {/* Radar Grid and Sweep - Only on Home Page */}
          {isHome ? (
            <>
              {/* Radar Grid Circles */}
              <circle cx="50" cy="50" r="20" className="geo-shape" strokeDasharray="1 2" />
              <circle cx="50" cy="50" r="35" className="geo-shape" strokeDasharray="1 4" />
              <circle cx="50" cy="50" r="50" className="geo-shape" />
              
              {/* Crosshairs */}
              <line x1="50" y1="0" x2="50" y2="100" className="geo-shape" strokeDasharray="1 4" />
              <line x1="0" y1="50" x2="100" y2="50" className="geo-shape" strokeDasharray="1 4" />

              {/* Radar Sweep */}
              <path
                className="geo-spin"
                d="M50,50 L50,0 A50,50 0 0,1 100,50 Z"
                fill="url(#sweepGradient)"
                style={{ '--duration': `${8 / speed}s`, transformOrigin: '50% 50%' }}
              />
              
              {/* Defs for Sweep */}
              <defs>
                <radialGradient id="sweepGradient" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--primary-cyan-glow)" />
                  <stop offset="100%" stopColor="transparent" />
                </radialGradient>
              </defs>
            </>
          ) : (
            <>
              {/* Original V2 Background Elements for Log, Profile, Archive */}
              <circle
                cx="50" cy="50" r="40" 
                className="geo-shape geo-circle geo-spin"
                fill="none"
                stroke="var(--primary-cyan-dim)"
                strokeWidth="0.5"
                style={{ '--duration': `${60 / speed}s`, transformOrigin: '50% 50%' }}
              />
              <polygon
                points="50,10 84.6,70 15.4,70" 
                className="geo-shape geo-triangle geo-spin-reverse"
                fill="none"
                stroke="var(--primary-cyan-dim)"
                strokeWidth="0.5"
                style={{ '--duration': `${40 / speed}s`, transformOrigin: '50% 50%' }}
              />
            </>
          )}

          {/* Particles */}
          {particles.map((p) => (
            <circle
              key={p.id}
              cx={p.x} 
              cy={p.y} 
              r={p.r} 
              className="geo-pulse"
              fill="var(--primary-cyan)"
              style={{ '--duration': `${3 + p.delay}s` }}
            />
          ))}

          {/* Reactive typing pulses */}
          {currentSystemState.isTyping && (
            <>
               <circle className="geo-typing-pulse" cx="30" cy="30" r="1" fill="var(--primary-cyan)" style={{ '--duration': '0.5s' }} />
               <circle className="geo-typing-pulse" cx="70" cy="80" r="1.5" fill="var(--accent-amber)" style={{ '--duration': '0.8s' }} />
            </>
          )}
        </svg>
      </div>
      )}
    </>
  );
};

export default InteractiveBackground;
