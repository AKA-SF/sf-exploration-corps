import { notionRequest } from './_notion.js';
import { fileUrl, pick, pickName, plainText, textList } from './_notionProperties.js';
import { richTextPayload, splitList } from './_notionWrite.js';

function pageCoverUrl(page) {
  if (page.cover?.type === 'external') return page.cover.external?.url ?? '';
  if (page.cover?.type === 'file') return page.cover.file?.url ?? '';
  return '';
}

function pickFileOrText(properties, names) {
  const property = pick(properties, names);
  return fileUrl(property) || plainText(property);
}

export function mapPageToWork(page, index, {
  codePrefix = 'SFA',
  defaultMedium = 'ARCHIVE',
  source = 'works',
} = {}) {
  const properties = page.properties ?? {};
  const title = plainText(pick(properties, ['제목', '작품명', 'Title', 'Name', '이름']));
  const originalTitle = plainText(pick(properties, ['원제', 'Original Title', 'Original', 'English Title']));
  const author = plainText(pick(properties, ['저자', '작가', '제작자', '감독', '개발사', 'Author', 'Creator', 'Director', 'Developer']));
  const publisher = plainText(pick(properties, ['출판사', '제작사', '배급사', '스튜디오', 'Publisher', 'Studio', 'Distributor']));
  const medium = plainText(pick(properties, ['매체', 'Medium', 'Type']));
  const category = plainText(pick(properties, ['카테고리', '분류', '장르', 'Category', 'Genre']));
  const subtitle = plainText(pick(properties, ['한줄 설명', '설명', '메모', 'Subtitle', 'Description', 'Summary']));
  const code = plainText(pick(properties, ['코드', 'Code', 'Archive Code'])) || `${codePrefix}-${String(index + 1).padStart(3, '0')}`;
  const link = plainText(pick(properties, ['링크', 'Link', 'URL', 'Url']));
  const recommender = plainText(pick(properties, ['추천자', 'Recommender', '추천']));
  const tags = textList(pick(properties, ['태그', 'Tags', '키워드', 'Keywords']));
  const year = plainText(pick(properties, ['연도', 'Year', 'Release Year']));
  const country = plainText(pick(properties, ['국가', 'Country']));
  const cover = pickFileOrText(properties, ['이미지', '포스터', '썸네일', 'Cover', 'Image', 'Poster', 'Thumbnail'])
    || pageCoverUrl(page);
  const description = subtitle || [author, publisher, year].filter(Boolean).join(' / ');

  return {
    code,
    medium: medium || category || defaultMedium,
    category,
    title,
    originalTitle,
    subtitle: description || '노션 작품 아카이브에서 동기화된 신호',
    author,
    publisher,
    year,
    country,
    link,
    recommender,
    tags: tags.length > 0 ? tags : ['Notion Sync'],
    cover,
    source,
  };
}

export function splitTags(value) {
  return splitList(value);
}

function notionPropertyValue(schema, value, fallbackType = 'rich_text') {
  const type = schema?.type ?? fallbackType;
  if (type === 'title') return { title: richTextPayload(value, 2000) };
  if (type === 'rich_text') return { rich_text: richTextPayload(value, 2000) };
  if (type === 'url') return { url: value || null };
  if (type === 'select') return { select: value ? { name: String(value) } : null };
  if (type === 'multi_select') return { multi_select: splitTags(value).map(name => ({ name })) };
  if (type === 'number') {
    const number = Number(value);
    return { number: Number.isFinite(number) ? number : null };
  }
  if (type === 'date') {
    const source = String(value ?? '').trim();
    const normalized = source.match(/^\d{4}$/) ? `${source}-01-01` : source;
    return { date: normalized ? { start: normalized } : null };
  }
  if (type === 'files') {
    return {
      files: value ? [{
        name: 'archive-image',
        type: 'external',
        external: { url: String(value) },
      }] : [],
    };
  }
  return { rich_text: richTextPayload(value, 2000) };
}

function assignNotionProperty(properties, databaseProperties, names, value, fallbackType) {
  const propertyName = pickName(databaseProperties, names);
  if (!propertyName) return;
  properties[propertyName] = notionPropertyValue(databaseProperties[propertyName], value, fallbackType);
}

async function getNotionDatabase(token, databaseId) {
  return notionRequest(`/databases/${databaseId}`, { token });
}

export async function createNotionWork(token, databaseId, body) {
  const database = await getNotionDatabase(token, databaseId);
  const databaseProperties = database.properties ?? {};
  const properties = {};
  const title = String(body.title ?? '').trim();
  const originalTitle = String(body.originalTitle ?? '').trim();
  const author = String(body.author ?? '').trim();
  const publisher = String(body.publisher ?? '').trim();
  const medium = String(body.medium ?? body.category ?? '소설').trim();
  const category = String(body.genre ?? body.workCategory ?? (medium === '소설' ? medium : '')).trim();
  const link = String(body.link ?? '').trim();
  const recommender = String(body.recommender ?? '').trim();
  const year = String(body.year ?? '').trim();
  const country = String(body.country ?? '').trim();
  const description = String(body.description ?? '').trim();
  const image = String(body.image ?? body.cover ?? '').trim();
  const tags = splitTags(body.tags);

  assignNotionProperty(properties, databaseProperties, ['제목', '작품명', 'Title', 'Name', '이름'], title, 'title');
  assignNotionProperty(properties, databaseProperties, ['원제', 'Original Title', 'Original', 'English Title'], originalTitle, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['저자', '작가', '제작자', '감독', '개발사', 'Author', 'Creator', 'Director', 'Developer'], author, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['출판사', '제작사', '배급사', '스튜디오', 'Publisher', 'Studio', 'Distributor'], publisher, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['매체', 'Medium', 'Type'], medium, 'select');
  assignNotionProperty(properties, databaseProperties, ['카테고리', '분류', '장르', 'Category', 'Genre'], category, 'select');
  assignNotionProperty(properties, databaseProperties, ['연도', 'Year', 'Release Year'], year, 'number');
  assignNotionProperty(properties, databaseProperties, ['국가', 'Country'], country, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['한줄 설명', '설명', '메모', 'Subtitle', 'Description', 'Summary'], description, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['이미지', '포스터', '썸네일', 'Cover', 'Image', 'Poster', 'Thumbnail'], image, 'files');
  assignNotionProperty(properties, databaseProperties, ['링크', 'Link', 'URL', 'Url'], link, 'url');
  assignNotionProperty(properties, databaseProperties, ['태그', 'Tags', '키워드', 'Keywords'], tags, 'multi_select');
  assignNotionProperty(properties, databaseProperties, ['추천자', 'Recommender', '추천'], recommender, 'rich_text');

  return notionRequest('/pages', {
    token,
    method: 'POST',
    body: {
      parent: { database_id: databaseId },
      properties,
    },
  });
}
