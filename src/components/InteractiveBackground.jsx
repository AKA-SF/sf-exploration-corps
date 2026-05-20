import { useLogs } from '../context/LogContext';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useMemo } from 'react';

const seeded = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const InteractiveBackground = () => {
  const { currentSystemState } = useLogs();
  const location = useLocation();
  const risk = currentSystemState.riskLevel || 0;
  
  const speed = 1 + (risk / 100) * 3; 
  const isDanger = risk > 80;

  // Generate random static particles
  const particles = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    x: seeded(i + 11) * 100,
    y: seeded(i + 37) * 100,
    r: seeded(i + 71) * 0.8 + 0.2,
    delay: seeded(i + 103) * 2
  })), []);

  return (
    <>
      <div className="noise-bg"></div>
      <div className="crt-overlay"></div>
      <div className="scanline"></div>
      
      <div className="bg-geometry" style={{ filter: isDanger ? 'hue-rotate(180deg) saturate(2)' : 'none' }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="radar-svg">
          {/* Radar Grid and Sweep - Only on Home Page */}
          {location.pathname === '/' ? (
            <>
              {/* Radar Grid Circles */}
              <circle cx="50" cy="50" r="20" className="geo-shape" strokeDasharray="1 2" />
              <circle cx="50" cy="50" r="35" className="geo-shape" strokeDasharray="1 4" />
              <circle cx="50" cy="50" r="50" className="geo-shape" />
              
              {/* Crosshairs */}
              <line x1="50" y1="0" x2="50" y2="100" className="geo-shape" strokeDasharray="1 4" />
              <line x1="0" y1="50" x2="100" y2="50" className="geo-shape" strokeDasharray="1 4" />

              {/* Radar Sweep */}
              <motion.path
                d="M50,50 L50,0 A50,50 0 0,1 100,50 Z"
                fill="url(#sweepGradient)"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 8 / speed, ease: "linear" }}
                style={{ transformOrigin: "50% 50%" }}
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
              <motion.circle 
                cx="50" cy="50" r="40" 
                className="geo-shape geo-circle" 
                fill="none"
                stroke="var(--primary-cyan-dim)"
                strokeWidth="0.5"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 60 / speed, ease: "linear" }}
                style={{ transformOrigin: "50% 50%" }}
              />
              <motion.polygon 
                points="50,10 84.6,70 15.4,70" 
                className="geo-shape geo-triangle" 
                fill="none"
                stroke="var(--primary-cyan-dim)"
                strokeWidth="0.5"
                animate={{ rotate: -360 }}
                transition={{ repeat: Infinity, duration: 40 / speed, ease: "linear" }}
                style={{ transformOrigin: "50% 50%" }}
              />
            </>
          )}

          {/* Particles */}
          {particles.map((p) => (
            <motion.circle 
              key={p.id}
              cx={p.x} 
              cy={p.y} 
              r={p.r} 
              fill="var(--primary-cyan)"
              initial={{ opacity: 0.1 }}
              animate={{ opacity: [0.1, 0.8, 0.1] }}
              transition={{ repeat: Infinity, duration: 3 + p.delay, ease: "easeInOut" }}
            />
          ))}

          {/* Reactive typing pulses */}
          {currentSystemState.isTyping && (
            <>
               <motion.circle cx="30" cy="30" r="1" fill="var(--primary-cyan)"
                 animate={{ scale: [1, 2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 0.5 }} />
               <motion.circle cx="70" cy="80" r="1.5" fill="var(--accent-amber)"
                 animate={{ scale: [1, 3, 1], opacity: [0.2, 0.8, 0.2] }} transition={{ repeat: Infinity, duration: 0.8 }} />
            </>
          )}
        </svg>
      </div>
    </>
  );
};

export default InteractiveBackground;
