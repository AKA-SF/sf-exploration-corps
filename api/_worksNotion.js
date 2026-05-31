import { notionRequest } from './_notion.js';
import { multiSelect, pick, pickName, plainText } from './_notionProperties.js';
import { richTextPayload, splitList } from './_notionWrite.js';

export function mapPageToWork(page, index) {
  const properties = page.properties ?? {};
  const title = plainText(pick(properties, ['제목', '작품명', 'Title', 'Name', '이름']));
  const author = plainText(pick(properties, ['저자', 'Author', 'Creator']));
  const publisher = plainText(pick(properties, ['출판사', 'Publisher', 'Studio']));
  const medium = plainText(pick(properties, ['매체', '카테고리', 'Medium', 'Type', '분류']));
  const subtitle = plainText(pick(properties, ['설명', '메모', 'Subtitle', 'Description']));
  const code = plainText(pick(properties, ['코드', 'Code', 'Archive Code'])) || `SFA-${String(index + 1).padStart(3, '0')}`;
  const link = plainText(pick(properties, ['링크', 'Link', 'URL', 'Url']));
  const recommender = plainText(pick(properties, ['추천자', 'Recommender', '추천']));
  const tags = multiSelect(pick(properties, ['태그', 'Tags', '키워드', 'Keywords']));
  const description = subtitle || [author, publisher].filter(Boolean).join(' / ');

  return {
    code,
    medium: medium || 'ARCHIVE',
    title,
    subtitle: description || '노션 작품 아카이브에서 동기화된 신호',
    link,
    recommender,
    tags: tags.length > 0 ? tags : ['Notion Sync'],
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
  const author = String(body.author ?? '').trim();
  const publisher = String(body.publisher ?? '').trim();
  const category = String(body.category ?? '소설').trim();
  const link = String(body.link ?? '').trim();
  const recommender = String(body.recommender ?? '').trim();
  const tags = splitTags(body.tags);

  assignNotionProperty(properties, databaseProperties, ['제목', '작품명', 'Title', 'Name', '이름'], title, 'title');
  assignNotionProperty(properties, databaseProperties, ['저자', 'Author', 'Creator'], author, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['출판사', 'Publisher', 'Studio'], publisher, 'rich_text');
  assignNotionProperty(properties, databaseProperties, ['카테고리', '매체', 'Medium', 'Type', '분류'], category, 'select');
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
