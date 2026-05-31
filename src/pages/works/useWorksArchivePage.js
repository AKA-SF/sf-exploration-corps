import { useEffect, useMemo, useState } from 'react';
import { getWorkCategorySlug, workCategories } from '../../data/workArchive';
import { fallbackWorks } from '../home/homeContent';

function getWorkSearchText(work) {
  return [
    work.code,
    work.medium,
    work.title,
    work.subtitle,
    work.recommender,
    work.link,
    ...(Array.isArray(work.tags) ? work.tags : []),
  ].filter(Boolean).join(' ').toLowerCase();
}

export default function useWorksArchivePage(categorySlug) {
  const [works, setWorks] = useState(fallbackWorks);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('loading');
  const activeCategory = workCategories.find(category => category.slug === categorySlug) ?? workCategories[0];

  useEffect(() => {
    let isMounted = true;

    fetch('/api/works')
      .then(response => {
        if (!response.ok) throw new Error('Works archive unavailable');
        return response.json();
      })
      .then(data => {
        if (!isMounted) return;
        setWorks(Array.isArray(data.works) && data.works.length > 0 ? data.works : fallbackWorks);
        setStatus('ready');
      })
      .catch(() => {
        if (!isMounted) return;
        setWorks(fallbackWorks);
        setStatus('error');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const categoryWorks = useMemo(() => works.filter(work => (
    getWorkCategorySlug(`${work.medium ?? ''} ${work.category ?? ''}`) === activeCategory.slug
  )), [activeCategory.slug, works]);

  const visibleWorks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return categoryWorks;
    return categoryWorks.filter(work => getWorkSearchText(work).includes(query));
  }, [categoryWorks, searchQuery]);

  return {
    activeCategory,
    categoryWorks,
    searchQuery,
    setSearchQuery,
    setWorks,
    status,
    visibleWorks,
    workCategories,
    works,
  };
}
