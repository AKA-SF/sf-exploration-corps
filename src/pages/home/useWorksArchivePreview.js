import { useMemo } from 'react';
import { getWorkCategorySlug, workCategories } from '../../data/workArchive';
import useMobilePreviewLimit from './useMobilePreviewLimit';

export default function useWorksArchivePreview({ randomWorkCodes, works }) {
  const previewLimit = useMobilePreviewLimit({ desktop: 6, mobile: 2 });
  const worksByCode = useMemo(() => new Map(works.map(work => [work.code, work])), [works]);
  const displayedWorks = useMemo(() => (
    randomWorkCodes
      .map(code => worksByCode.get(code))
      .filter(Boolean)
      .slice(0, previewLimit)
  ), [previewLimit, randomWorkCodes, worksByCode]);
  const workCategoryCounts = useMemo(() => {
    const counts = Object.fromEntries(workCategories.map(category => [category.slug, 0]));
    works.forEach(work => {
      const slug = getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`);
      counts[slug] = (counts[slug] ?? 0) + 1;
    });
    return counts;
  }, [works]);

  return {
    displayedWorks,
    workCategories,
    workCategoryCounts,
  };
}
