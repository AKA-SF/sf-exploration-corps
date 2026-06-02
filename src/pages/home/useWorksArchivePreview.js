import { useMemo } from 'react';
import { getWorkCategorySlug, workCategories } from '../../data/workArchive';
import useMobilePreviewLimit from './useMobilePreviewLimit';

export default function useWorksArchivePreview({ randomWorkCodes, works }) {
  const previewLimit = useMobilePreviewLimit({ desktop: 6, mobile: 2 });
  const worksByCode = useMemo(() => new Map(works.map(work => [work.code, work])), [works]);
  const displayedWorks = randomWorkCodes
    .map(code => worksByCode.get(code))
    .filter(Boolean)
    .slice(0, previewLimit);
  const workCategoryCounts = useMemo(() => Object.fromEntries(
    workCategories.map(category => [
      category.slug,
      works.filter(work => getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`) === category.slug).length,
    ]),
  ), [works]);

  return {
    displayedWorks,
    workCategories,
    workCategoryCounts,
  };
}
