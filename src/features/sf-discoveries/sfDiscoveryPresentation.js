function isAladinUrl(value) {
  try {
    const hostname = new URL(String(value ?? '')).hostname;
    return /(^|\.)aladin\.co\.kr$/i.test(hostname);
  } catch {
    return false;
  }
}

export function discoverySourceLinkLabel(item) {
  if (isAladinUrl(item?.source_url)) return '알라딘 링크';
  const sourceName = String(item?.source_name ?? '').trim();
  return sourceName ? `${sourceName}에서 원문 확인` : '출처 링크';
}
