import { getDailyItem } from './homeUtils';

export default function useHomeStatus({
  concepts,
  dailySignalKey,
  dashboard,
  mediaItems,
  selectedConcept,
  works,
}) {
  const dailyWork = getDailyItem(works, `${dailySignalKey}:hero-work`, work => `${work.code}:${work.title}`);
  const dailyConcept = getDailyItem(concepts, `${dailySignalKey}:hero-concept`, concept => `${concept.code}:${concept.term}`);
  const dailyQuestion = getDailyItem(dashboard.questions, `${dailySignalKey}:hero-question`, question => `${question.id}:${question.title}`);
  const dailyMedia = getDailyItem(mediaItems, `${dailySignalKey}:hero-media`, item => `${item.code}:${item.title}`);
  const todaySignal = [
    dailyWork && {
      href: '#works-archive',
      label: '오늘의 작품',
      meta: dailyWork.medium || '작품 아카이브',
      title: dailyWork.title,
    },
    dailyConcept && {
      href: '#concept-dictionary',
      label: '오늘의 개념',
      meta: dailyConcept.english || dailyConcept.category,
      title: dailyConcept.term,
    },
    dailyQuestion && {
      href: dailyQuestion.id ? `/questions/${dailyQuestion.id}` : '/questions',
      label: '오늘의 토론',
      meta: dailyQuestion.category || '커뮤니티',
      title: dailyQuestion.title,
    },
    dailyMedia && {
      href: '#media-archive',
      label: '오늘의 미디어',
      meta: dailyMedia.category || dailyMedia.medium,
      title: dailyMedia.title,
    },
  ].filter(Boolean);
  const todaySignalIndex = todaySignal.length > 0
    ? Math.abs([...`${dailySignalKey}:hero-signal`].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % todaySignal.length
    : -1;
  const selectedTodaySignal = todaySignal[todaySignalIndex] ?? null;

  const metrics = {
    todaySignal: selectedTodaySignal,
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
