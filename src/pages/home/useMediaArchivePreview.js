import { useMemo, useState } from 'react';
import { mediaCategories, mediaCategorySlugs } from './homeContent';
import { normalizeMediaCategory, sortMediaByLatest } from './homeUtils';
import useMobilePreviewLimit from './useMobilePreviewLimit';

export default function useMediaArchivePreview(mediaItems) {
  const previewLimit = useMobilePreviewLimit({ desktop: 3, mobile: 1 });
  const [activeMediaCategory, setActiveMediaCategory] = useState(mediaCategories[0]);
  const displayedMedia = useMemo(() => sortMediaByLatest(
    mediaItems.filter(item => normalizeMediaCategory(item.category) === activeMediaCategory),
  ), [activeMediaCategory, mediaItems]);
  const previewMedia = useMemo(() => displayedMedia.slice(0, previewLimit), [displayedMedia, previewLimit]);
  const activeMediaArchivePath = `/media/${mediaCategorySlugs[activeMediaCategory] ?? 'media'}`;

  return {
    activeMediaArchivePath,
    activeMediaCategory,
    mediaCategories,
    previewMedia,
    setActiveMediaCategory,
  };
}
