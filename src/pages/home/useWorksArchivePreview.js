import { useMemo } from 'react';
import { getWorkCategorySlug, workCategories } from '../../data/workArchive';

export default function useWorksArchivePreview({ randomWorkCodes, works }) {
  const displayedWorks = works.filter(work => randomWorkCodes.includes(work.code)).slice(0, 6);
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
