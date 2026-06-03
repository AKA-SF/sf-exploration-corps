import { Activity, AlertTriangle, Hexagon, Skull } from 'lucide-react';

export const LOG_TYPES = {
  WARNING: { color: 'var(--accent-amber)', icon: AlertTriangle },
  DEEP_SIGNAL: { color: 'var(--primary-cyan)', icon: Activity },
  ANOMALY: { color: '#a855f7', icon: Hexagon },
  LOST_TRANSMISSION: { color: '#ef4444', icon: Skull },
};

export const SIGNAL_ACTIONS = ['RESONATE', 'DECODE_REQ', 'ECHO', 'DISTORT', 'ARCHIVE'];
export const MAX_VISIBLE_NODES = 80;
export const MAX_VISIBLE_EDGES = 160;
export const MAX_ANIMATED_EDGES = 72;
export const MAX_EDGE_COMPARE_WINDOW = 26;
export const RADIO_MESSAGE_LIMIT = 48;

export function getNetworkMotionProfile() {
  if (typeof window === 'undefined') {
    return { compact: false, reduced: false };
  }

  return {
    compact: window.matchMedia('(max-width: 760px)').matches,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

export function formatSignalTime(value) {
  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSignalLine(log, index) {
  const emotion = log.emotions?.[0] || '미확인 감정';
  const idea = log.ideas?.[0] || '미확인 개념';
  const action = SIGNAL_ACTIONS[index % SIGNAL_ACTIONS.length];
  return `${log.explorerId} // ${log.type} 섹터에서 '${log.title}' ${action} / ${emotion} + ${idea}`;
}
