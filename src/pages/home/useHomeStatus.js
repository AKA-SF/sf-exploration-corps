import { useMemo } from 'react';
import { getDailyItem } from './homeUtils';
import { getWorkCategorySlug } from '../../data/workArchive';

function isNovelWork(work) {
  return getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`) === 'novels';
}

function getWorkDetailHref(work) {
  return work?.code ? `/works/novels?work=${encodeURIComponent(work.code)}` : '/works/novels';
}

export default function useHomeStatus({
  concepts,
  dailySignalKey,
  dashboard,
  mediaItems,
  selectedConcept,
  works,
}) {
  const isWorksArchiveReady = Boolean(dashboard.status.works);
  const selectedTodaySignal = useMemo(() => {
    if (!isWorksArchiveReady) return null;
    const dailyWork = getDailyItem(
      works.filter(isNovelWork),
      `${dailySignalKey}:hero-novel-work`,
      work => `${work.code}:${work.title}`,
    );
    return dailyWork ? {
      href: getWorkDetailHref(dailyWork),
      label: '오늘의 SF 소설',
      meta: dailyWork.medium || '작품 아카이브',
      title: dailyWork.title,
      workCode: dailyWork.code,
    } : null;
  }, [dailySignalKey, isWorksArchiveReady, works]);

  const metrics = useMemo(() => ({
    todaySignal: selectedTodaySignal,
    works: works.length,
    media: mediaItems.length,
    concepts: concepts.length,
    logs: dashboard.logs.length,
    questions: dashboard.questions.length,
    status: dashboard.status,
  }), [
    concepts.length,
    dashboard.logs.length,
    dashboard.questions.length,
    dashboard.status,
    mediaItems.length,
    selectedTodaySignal,
    works.length,
  ]);

  const recentSignals = useMemo(() => [
    works[0] && { id: 'WORK 001', label: `${works[0].title} / 작품 아카이브`, time: dashboard.status.works ? 'SYNC OK' : 'LOCAL FALLBACK' },
    mediaItems[0] && { id: 'MEDIA 001', label: `${mediaItems[0].title} / 미디어`, time: 'SYNC OK' },
    dashboard.logs[0] && { id: 'LOG 001', label: `${dashboard.logs[0].workTitle} / 탐사 로그`, time: 'SYNC OK' },
    dashboard.questions[0] && { id: 'BOARD 001', label: `${dashboard.questions[0].title} / 커뮤니티`, time: 'SYNC OK' },
    selectedConcept && { id: 'CONCEPT', label: `${selectedConcept.term} / 개념 사전`, time: dashboard.status.concepts ? 'SYNC OK' : 'LOCAL FALLBACK' },
  ].filter(Boolean).slice(0, 5), [
    dashboard.logs,
    dashboard.questions,
    dashboard.status.concepts,
    dashboard.status.works,
    mediaItems,
    selectedConcept,
    works,
  ]);

  const systemReady = useMemo(() => (
    Object.values(dashboard.status).filter(Boolean).length >= 3
  ), [dashboard.status]);

  return {
    metrics,
    recentSignals,
    systemReady,
  };
}
