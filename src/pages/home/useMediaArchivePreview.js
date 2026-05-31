import { useState } from 'react';
import { mediaCategories, mediaCategorySlugs } from './homeContent';
import { normalizeMediaCategory, sortMediaByLatest } from './homeUtils';

export default function useMediaArchivePreview(mediaItems) {
  const [activeMediaCategory, setActiveMediaCategory] = useState(mediaCategories[0]);
  const displayedMedia = sortMediaByLatest(
    mediaItems.filter(item => normalizeMediaCategory(item.category) === activeMediaCategory),
  );
  const previewMedia = displayedMedia.slice(0, 3);
  const activeMediaArchivePath = `/media/${mediaCategorySlugs[activeMediaCategory] ?? 'media'}`;

  return {
    activeMediaArchivePath,
    activeMediaCategory,
    mediaCategories,
    previewMedia,
    setActiveMediaCategory,
  };
}
