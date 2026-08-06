const REQUIRED_TEXT_FIELDS = ['theme', 'deck', 'intro', 'closing'];
const APPROVED_COVER_RIGHTS = new Set(['APPROVED', 'API_LICENSED']);

function emptyBook(position) {
  return {
    author: '',
    cover: {
      alt: '',
      rights_note: '',
      rights_status: '',
      source_url: '',
      url: '',
    },
    isbn13: '',
    position,
    reason: '',
    reflection: '',
    standing: '',
    synopsis: '',
    title: '',
    translator: '',
  };
}

export function createEmptyEditorialPayload() {
  return {
    books: [emptyBook(1), emptyBook(2), emptyBook(3)],
    closing: '',
    deck: '',
    intro: '',
    sources: [],
    theme: '',
  };
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateEditorialPayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { errors: ['편집 추천 본문 형식이 올바르지 않습니다.'], valid: false };
  }

  for (const field of REQUIRED_TEXT_FIELDS) {
    if (!hasText(payload[field])) errors.push(`본문의 ${field} 항목이 비어 있습니다.`);
  }

  if (!Array.isArray(payload.books) || payload.books.length !== 3) {
    errors.push('편집 추천은 정확히 세 권이어야 합니다.');
  } else {
    const isbnSet = new Set();
    payload.books.forEach((book, index) => {
      const label = `${index + 1}번째 책`;
      const normalizedIsbn = String(book?.isbn13 ?? '');
      if (!hasText(book?.title) || !hasText(book?.author)) errors.push(`${label}의 제목과 저자가 필요합니다.`);
      if (!hasText(book?.translator)) errors.push(`${label}의 한국어판 번역자가 필요합니다.`);
      if (!/^\d{13}$/.test(normalizedIsbn)) errors.push(`${label}의 ISBN13이 올바르지 않습니다.`);
      if (isbnSet.has(normalizedIsbn)) errors.push('같은 ISBN의 책을 중복 추천할 수 없습니다.');
      isbnSet.add(normalizedIsbn);
      if (!hasText(book?.synopsis) || !hasText(book?.standing) || !hasText(book?.reason)) {
        errors.push(`${label}의 줄거리, 위상, 선정 이유가 필요합니다.`);
      }

      const cover = book?.cover;
      if (!hasText(cover?.url)) {
        errors.push(`${label}의 표지 주소가 필요합니다.`);
      } else {
        if (!cover.url.startsWith('https://')) errors.push(`${label}의 표지 주소는 HTTPS여야 합니다.`);
        if (!hasText(cover.alt)) errors.push(`${label}의 표지 대체 텍스트가 필요합니다.`);
        if (!APPROVED_COVER_RIGHTS.has(cover.rights_status)) errors.push(`${label}의 표지 사용 근거를 확인해야 합니다.`);
        if (!hasText(cover.source_url) || !cover.source_url.startsWith('https://')) errors.push(`${label}의 표지 출처 주소가 필요합니다.`);
        if (!hasText(cover.rights_note)) errors.push(`${label}의 표지 권리 메모가 필요합니다.`);
      }
    });
  }

  if (!Array.isArray(payload.sources) || payload.sources.length < 3) {
    errors.push('서로 다른 검증 출처를 세 개 이상 기록해야 합니다.');
  } else {
    const sourceUrls = new Set();
    payload.sources.forEach((source, index) => {
      if (!hasText(source?.label) || !hasText(source?.url) || !source.url.startsWith('https://')) {
        errors.push(`${index + 1}번째 출처의 이름과 HTTPS 주소가 필요합니다.`);
      }
      if (sourceUrls.has(source?.url)) errors.push('같은 출처 URL을 중복 기록할 수 없습니다.');
      sourceUrls.add(source?.url);
    });
  }

  return { errors: [...new Set(errors)], valid: errors.length === 0 };
}
