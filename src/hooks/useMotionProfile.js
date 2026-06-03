import { useEffect, useState } from 'react';

export const COMPACT_VIEWPORT_QUERY = '(max-width: 760px)';
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function getMotionProfile() {
  if (typeof window === 'undefined') {
    return { compact: false, reduced: false };
  }

  return {
    compact: window.matchMedia(COMPACT_VIEWPORT_QUERY).matches,
    reduced: window.matchMedia(REDUCED_MOTION_QUERY).matches,
  };
}

function watchMediaQuery(query, onChange) {
  const mediaQuery = window.matchMedia(query);
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }

  mediaQuery.addListener(onChange);
  return () => mediaQuery.removeListener(onChange);
}

export function useMotionProfile() {
  const [motionProfile, setMotionProfile] = useState(getMotionProfile);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const updateProfile = () => setMotionProfile(getMotionProfile());
    const unwatchCompact = watchMediaQuery(COMPACT_VIEWPORT_QUERY, updateProfile);
    const unwatchReduced = watchMediaQuery(REDUCED_MOTION_QUERY, updateProfile);

    updateProfile();

    return () => {
      unwatchCompact();
      unwatchReduced();
    };
  }, []);

  return motionProfile;
}
