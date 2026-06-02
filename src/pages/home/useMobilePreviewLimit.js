import { useEffect, useState } from 'react';

const MOBILE_QUERY = '(max-width: 760px)';

const getIsMobileViewport = () => (
  typeof window !== 'undefined'
  && window.matchMedia(MOBILE_QUERY).matches
);

export default function useMobilePreviewLimit({ desktop, mobile }) {
  const [isMobileViewport, setIsMobileViewport] = useState(getIsMobileViewport);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const query = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobileViewport(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isMobileViewport ? mobile : desktop;
}
