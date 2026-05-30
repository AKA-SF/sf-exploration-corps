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
  status: {
    works: false,
    media: false,
    concepts: false,
    logs: false,
    questions: false,
  },
};

export default function useHomeData({
  conceptEntries,
  fallbackWorks,
  getRandomWorks,
  mergeWorksByCode,
}) {
  const [works, setWorks] = useState(fallbackWorks);
  const [randomWorkCodes, setRandomWorkCodes] = useState(() => getRandomWorks(fallbackWorks, 6).map(work => work.code));
  const [mediaItems, setMediaItems] = useState([]);
  const [concepts, setConcepts] = useState(conceptEntries);
  const [randomConceptCodes, setRandomConceptCodes] = useState(() => getRandomWorks(conceptEntries, conceptEntries.length).map(concept => concept.code));
  const [activeConceptCode, setActiveConceptCode] = useState('');
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [lazySections, setLazySections] = useState(initialLazySections);
  const worksArchiveRef = useRef(null);
  const mediaArchiveRef = useRef(null);
  const conceptSectionRef = useRef(null);
  const communitySectionRef = useRef(null);

  useEffect(() => {
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
      if (!ref.current) return;
      ref.current.dataset.lazySection = key;
      observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch('/api/works?covers=0')
      .then(response => {
        if (!response.ok) throw new Error('Notion archive unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.works) && data.works.length > 0) {
          setWorks(data.works);
          setRandomWorkCodes(getRandomWorks(data.works, 6).map(work => work.code));
          setDashboard(state => ({ ...state, status: { ...state.status, works: true } }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setWorks(fallbackWorks);
          setDashboard(state => ({ ...state, status: { ...state.status, works: false } }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fallbackWorks, getRandomWorks]);

  useEffect(() => {
    if (!lazySections.worksCovers) return undefined;
    let isMounted = true;

    fetch('/api/works')
      .then(response => {
        if (!response.ok) throw new Error('Notion archive covers unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.works) && data.works.length > 0) {
          setWorks(current => mergeWorksByCode(current, data.works));
          setDashboard(state => ({ ...state, status: { ...state.status, works: true } }));
        }
      })
      .catch(() => {
        // Cover enrichment is optional; the text archive remains usable without it.
      });

    return () => {
      isMounted = false;
    };
  }, [lazySections.worksCovers, mergeWorksByCode]);

  useEffect(() => {
    if (!lazySections.media) return undefined;
    let isMounted = true;

    fetch('/api/media', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Notion media unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.media)) {
          setMediaItems(data.media);
          setDashboard(state => ({ ...state, status: { ...state.status, media: true } }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setMediaItems([]);
          setDashboard(state => ({ ...state, status: { ...state.status, media: false } }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [lazySections.media]);

  useEffect(() => {
    if (!lazySections.concepts) return undefined;
    let isMounted = true;

    fetch('/api/concepts', { cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Notion concepts unavailable');
        return response.json();
      })
      .then(data => {
        if (isMounted && Array.isArray(data.concepts)) {
          const randomizedConcepts = getRandomWorks(data.concepts, data.concepts.length);
          setConcepts(data.concepts);
          setRandomConceptCodes(randomizedConcepts.map(concept => concept.code));
          setActiveConceptCode(randomizedConcepts[0]?.code ?? '');
          setDashboard(state => ({ ...state, status: { ...state.status, concepts: true } }));
        }
      })
      .catch(() => {
        if (isMounted) {
          const randomizedConcepts = getRandomWorks(conceptEntries, conceptEntries.length);
          setConcepts(conceptEntries);
          setRandomConceptCodes(randomizedConcepts.map(concept => concept.code));
          setActiveConceptCode(randomizedConcepts[0]?.code ?? '');
          setDashboard(state => ({ ...state, status: { ...state.status, concepts: false } }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [conceptEntries, getRandomWorks, lazySections.concepts]);

  useEffect(() => {
    let isMounted = true;
    const scheduleIdle = window.requestIdleCallback ?? (callback => window.setTimeout(callback, 1400));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;

    const idleId = scheduleIdle(() => {
      Promise.allSettled([
        fetch('/api/exploration-log', { cache: 'no-store' }).then(response => {
          if (!response.ok) throw new Error('Exploration log unavailable');
          return response.json();
        }),
        fetch('/api/questions', { cache: 'no-store' }).then(response => {
          if (!response.ok) throw new Error('Questions unavailable');
          return response.json();
        }),
      ]).then(([logsResult, questionsResult]) => {
        if (!isMounted) return;

        setDashboard(state => ({
          ...state,
          logs: logsResult.status === 'fulfilled' && Array.isArray(logsResult.value.logs) ? logsResult.value.logs : [],
          questions: questionsResult.status === 'fulfilled' && Array.isArray(questionsResult.value.questions) ? questionsResult.value.questions : [],
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
