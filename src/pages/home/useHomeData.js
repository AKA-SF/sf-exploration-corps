import { useEffect, useRef, useState } from 'react';

const initialLazySections = {
  worksCovers: false,
  media: false,
  concepts: false,
  community: false,
};

const initialDashboard = {
  logs: [],
  questions: [],
  loadState: {
    logs: 'loading',
    questions: 'loading',
  },
  status: {
    works: false,
    media: false,
    concepts: false,
    logs: false,
    questions: false,
  },
};

const isAbortError = error => error?.name === 'AbortError';

const fetchJson = async (path, options = {}) => {
  const response = await fetch(path, options);
  if (!response.ok) throw new Error(options.errorMessage || 'Request failed');
  return response.json();
};

export default function useHomeData({
  conceptEntries,
  dailySignalKey,
  deferredSectionsReady = true,
  fallbackWorks,
  getRandomWorks,
  mergeWorksByCode,
}) {
  const [works, setWorks] = useState(fallbackWorks);
  const [randomWorkCodes, setRandomWorkCodes] = useState(() => getRandomWorks(fallbackWorks, 6, `works:${dailySignalKey}`).map(work => work.code));
  const [mediaItems, setMediaItems] = useState([]);
  const [concepts, setConcepts] = useState(conceptEntries);
  const [randomConceptCodes, setRandomConceptCodes] = useState(() => getRandomWorks(conceptEntries, conceptEntries.length, `concepts:${dailySignalKey}`).map(concept => concept.code));
  const [activeConceptCode, setActiveConceptCode] = useState('');
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [lazySections, setLazySections] = useState(initialLazySections);
  const worksArchiveRef = useRef(null);
  const mediaArchiveRef = useRef(null);
  const conceptSectionRef = useRef(null);
  const communitySectionRef = useRef(null);

  useEffect(() => {
    if (!deferredSectionsReady) return undefined;

    const sectionTargets = [
      ['worksCovers', worksArchiveRef],
      ['media', mediaArchiveRef],
      ['concepts', conceptSectionRef],
      ['community', communitySectionRef],
    ];

    if (!('IntersectionObserver' in window)) {
      const fallbackId = window.setTimeout(() => setLazySections({
        worksCovers: true,
        media: true,
        concepts: true,
        community: true,
      }), 0);
      return () => window.clearTimeout(fallbackId);
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const key = entry.target.dataset.lazySection;
        setLazySections(current => current[key] ? current : { ...current, [key]: true });
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '420px 0px' });

    sectionTargets.forEach(([key, ref]) => {
      if (!ref.current) {
        setLazySections(current => current[key] ? current : { ...current, [key]: true });
        return;
      }
      ref.current.dataset.lazySection = key;
      observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, [deferredSectionsReady]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    fetchJson('/api/works?covers=0', {
      signal: controller.signal,
      errorMessage: 'Notion archive unavailable',
    })
      .then(data => {
        if (isMounted && Array.isArray(data.works) && data.works.length > 0) {
          setWorks(data.works);
          setRandomWorkCodes(getRandomWorks(data.works, 6, `works:${dailySignalKey}`).map(work => work.code));
          setDashboard(state => ({ ...state, status: { ...state.status, works: true } }));
        }
      })
      .catch(error => {
        if (isAbortError(error)) return;
        if (isMounted) {
          setWorks(fallbackWorks);
          setRandomWorkCodes(getRandomWorks(fallbackWorks, 6, `works:${dailySignalKey}`).map(work => work.code));
          setDashboard(state => ({ ...state, status: { ...state.status, works: false } }));
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [dailySignalKey, fallbackWorks, getRandomWorks]);

  useEffect(() => {
    if (!lazySections.worksCovers) return undefined;
    let isMounted = true;
    const controller = new AbortController();

    fetchJson('/api/works', {
      signal: controller.signal,
      errorMessage: 'Notion archive covers unavailable',
    })
      .then(data => {
        if (isMounted && Array.isArray(data.works) && data.works.length > 0) {
          setWorks(current => mergeWorksByCode(current, data.works));
          setDashboard(state => ({ ...state, status: { ...state.status, works: true } }));
        }
      })
      .catch(error => {
        if (isAbortError(error)) return;
        // Cover enrichment is optional; the text archive remains usable without it.
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [lazySections.worksCovers, mergeWorksByCode]);

  useEffect(() => {
    if (!lazySections.media) return undefined;
    let isMounted = true;
    const controller = new AbortController();

    fetchJson('/api/media', {
      cache: 'no-store',
      signal: controller.signal,
      errorMessage: 'Notion media unavailable',
    })
      .then(data => {
        if (isMounted && Array.isArray(data.media)) {
          setMediaItems(data.media);
          setDashboard(state => ({ ...state, status: { ...state.status, media: true } }));
        }
      })
      .catch(error => {
        if (isAbortError(error)) return;
        if (isMounted) {
          setMediaItems([]);
          setDashboard(state => ({ ...state, status: { ...state.status, media: false } }));
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [lazySections.media]);

  useEffect(() => {
    if (!lazySections.concepts) return undefined;
    let isMounted = true;
    const controller = new AbortController();

    fetchJson('/api/concepts', {
      cache: 'no-store',
      signal: controller.signal,
      errorMessage: 'Notion concepts unavailable',
    })
      .then(data => {
        if (isMounted && Array.isArray(data.concepts)) {
          const randomizedConcepts = getRandomWorks(data.concepts, data.concepts.length, `concepts:${dailySignalKey}`);
          setConcepts(data.concepts);
          setRandomConceptCodes(randomizedConcepts.map(concept => concept.code));
          setActiveConceptCode(randomizedConcepts[0]?.code ?? '');
          setDashboard(state => ({ ...state, status: { ...state.status, concepts: true } }));
        }
      })
      .catch(error => {
        if (isAbortError(error)) return;
        if (isMounted) {
          const randomizedConcepts = getRandomWorks(conceptEntries, conceptEntries.length, `concepts:${dailySignalKey}`);
          setConcepts(conceptEntries);
          setRandomConceptCodes(randomizedConcepts.map(concept => concept.code));
          setActiveConceptCode(randomizedConcepts[0]?.code ?? '');
          setDashboard(state => ({ ...state, status: { ...state.status, concepts: false } }));
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [conceptEntries, dailySignalKey, getRandomWorks, lazySections.concepts]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const scheduleIdle = window.requestIdleCallback ?? (callback => window.setTimeout(callback, 1400));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;

    const idleId = scheduleIdle(() => {
      Promise.allSettled([
        fetchJson('/api/exploration-log', {
          cache: 'no-store',
          signal: controller.signal,
          errorMessage: 'Exploration log unavailable',
        }),
        fetchJson('/api/questions?pageSize=12', {
          cache: 'no-store',
          signal: controller.signal,
          errorMessage: 'Questions unavailable',
        }),
      ]).then(([logsResult, questionsResult]) => {
        if (!isMounted) return;

        setDashboard(state => ({
          ...state,
          logs: logsResult.status === 'fulfilled' && Array.isArray(logsResult.value.logs) ? logsResult.value.logs : [],
          questions: questionsResult.status === 'fulfilled' && Array.isArray(questionsResult.value.questions) ? questionsResult.value.questions : [],
          loadState: {
            ...state.loadState,
            logs: logsResult.status === 'fulfilled' ? 'ready' : 'error',
            questions: questionsResult.status === 'fulfilled' ? 'ready' : 'error',
          },
          status: {
            ...state.status,
            logs: logsResult.status === 'fulfilled',
            questions: questionsResult.status === 'fulfilled',
          },
        }));
      });
    });

    return () => {
      isMounted = false;
      controller.abort();
      cancelIdle(idleId);
    };
  }, []);

  return {
    activeConceptCode,
    communitySectionRef,
    conceptSectionRef,
    concepts,
    dashboard,
    mediaArchiveRef,
    mediaItems,
    randomConceptCodes,
    randomWorkCodes,
    setActiveConceptCode,
    setDashboard,
    setRandomWorkCodes,
    setWorks,
    works,
    worksArchiveRef,
  };
}
