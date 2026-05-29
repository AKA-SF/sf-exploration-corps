export const workCategories = [
  { label: 'NOVEL', title: '소설', slug: 'novels', count: '000 SIGNALS' },
  { label: 'CINEMA', title: '영화', slug: 'cinema', count: '000 SIGNALS' },
  { label: 'GAME', title: '게임', slug: 'games', count: '000 SIGNALS' },
  { label: 'ANIMATION', title: '애니메이션', slug: 'animation', count: '000 SIGNALS' },
];

export function getWorkCategorySlug(value = '') {
  const normalized = String(value).replace(/\s/g, '').toLowerCase();

  if (normalized.includes('애니') || normalized.includes('animation') || normalized.includes('anime')) {
    return 'animation';
  }

  if (normalized.includes('게임') || normalized.includes('game')) {
    return 'games';
  }

  if (
    normalized.includes('영화')
    || normalized.includes('cinema')
    || normalized.includes('film')
    || normalized.includes('movie')
  ) {
    return 'cinema';
  }

  return 'novels';
}
