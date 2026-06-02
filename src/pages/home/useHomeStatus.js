export default function useHomeStatus({
  concepts,
  dashboard,
  mediaItems,
  selectedConcept,
  works,
}) {
  const todaySignal = [
    works[0] && {
      href: '#works-archive',
      label: '오늘의 작품',
      meta: works[0].medium || '작품 아카이브',
      title: works[0].title,
    },
    selectedConcept && {
      href: '#concept-dictionary',
      label: '오늘의 개념',
      meta: selectedConcept.english || selectedConcept.category,
      title: selectedConcept.term,
    },
    dashboard.questions[0] && {
      href: '/questions',
      label: '오늘의 토론',
      meta: dashboard.questions[0].category || '커뮤니티',
      title: dashboard.questions[0].title,
    },
    mediaItems[0] && {
      href: '#media-archive',
      label: '오늘의 미디어',
      meta: mediaItems[0].category || mediaItems[0].medium,
      title: mediaItems[0].title,
    },
  ].filter(Boolean)[0] ?? null;

  const metrics = {
    todaySignal,
    works: works.length,
    media: mediaItems.length,
    concepts: concepts.length,
    logs: dashboard.logs.length,
    questions: dashboard.questions.length,
    status: dashboard.status,
  };

  const recentSignals = [
    works[0] && { id: 'WORK 001', label: `${works[0].title} / 작품 아카이브`, time: dashboard.status.works ? 'SYNC OK' : 'LOCAL FALLBACK' },
    mediaItems[0] && { id: 'MEDIA 001', label: `${mediaItems[0].title} / 미디어`, time: 'SYNC OK' },
    dashboard.logs[0] && { id: 'LOG 001', label: `${dashboard.logs[0].workTitle} / 탐사 로그`, time: 'SYNC OK' },
    dashboard.questions[0] && { id: 'BOARD 001', label: `${dashboard.questions[0].title} / 커뮤니티`, time: 'SYNC OK' },
    selectedConcept && { id: 'CONCEPT', label: `${selectedConcept.term} / 개념 사전`, time: dashboard.status.concepts ? 'SYNC OK' : 'LOCAL FALLBACK' },
  ].filter(Boolean).slice(0, 5);

  return {
    metrics,
    recentSignals,
    systemReady: Object.values(dashboard.status).filter(Boolean).length >= 3,
  };
}
