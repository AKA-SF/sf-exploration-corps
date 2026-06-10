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
  const novelWorks = isWorksArchiveReady ? works.filter(isNovelWork) : [];
  const dailyWork = getDailyItem(novelWorks, `${dailySignalKey}:hero-novel-work`, work => `${work.code}:${work.title}`);
  const selectedTodaySignal = dailyWork ? {
    href: getWorkDetailHref(dailyWork),
    label: '오늘의 SF 소설',
    meta: dailyWork.medium || '작품 아카이브',
    title: dailyWork.title,
    workCode: dailyWork.code,
  } : null;

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
