export const NOTION_PAGE_SIZE = 100;
export const NOTION_VERSION = '2022-06-28';

export function normalizeNotionId(value) {
  const source = value?.trim() ?? '';
  const compactId = source.match(/(?:^|[^0-9a-f])([0-9a-f]{32})(?:[^0-9a-f]|$)/i)?.[1];
  const dashedId = source.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0];
  return (compactId ?? dashedId ?? '').replace(/-/g, '');
}

export function getNotionConfig(databaseEnvName, fallbackDatabaseId = '') {
  const token = process.env.NOTION_TOKEN;
  const databaseId = normalizeNotionId(process.env[databaseEnvName] || fallbackDatabaseId);

  return {
    token,
    databaseId,
    missing: [
      !token ? 'NOTION_TOKEN' : null,
      !databaseId ? databaseEnvName : null,
    ].filter(Boolean),
  };
}

export function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

export async function readNotionError(notionResponse) {
  try {
    return await notionResponse.json();
  } catch {
    return { message: await notionResponse.text() };
  }
}

export function createNotionError(message, status, notion) {
  const error = new Error(notion?.message || message);
  error.status = status;
  error.notion = notion;
  return error;
}

export async function notionRequest(path, { token, method = 'GET', body } = {}) {
  const notionResponse = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: notionHeaders(token),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!notionResponse.ok) {
    const notion = await readNotionError(notionResponse);
    throw createNotionError('Notion request failed', notionResponse.status, notion);
  }

  return notionResponse.json();
}

export async function queryNotionDatabaseAll(token, databaseId, query = {}) {
  const results = [];
  let startCursor;

  do {
    const data = await notionRequest(`/databases/${databaseId}/query`, {
      token,
      method: 'POST',
      body: {
        page_size: NOTION_PAGE_SIZE,
        ...query,
        ...(startCursor ? { start_cursor: startCursor } : {}),
      },
    });

    results.push(...(data.results ?? []));
    startCursor = data.has_more ? data.next_cursor : null;
  } while (startCursor);

  return results;
}

export async function queryNotionDatabasePage(token, databaseId, {
  pageSize = NOTION_PAGE_SIZE,
  startCursor = '',
  ...query
} = {}) {
  return notionRequest(`/databases/${databaseId}/query`, {
    token,
    method: 'POST',
    body: {
      page_size: Math.min(Math.max(Number(pageSize) || NOTION_PAGE_SIZE, 1), NOTION_PAGE_SIZE),
      ...query,
      ...(startCursor ? { start_cursor: startCursor } : {}),
    },
  });
}

export function sendNotionError(response, {
  error,
  fallbackMessage = 'Notion request failed',
  payload = {},
}) {
  return response.status(error.status || 500).json({
    ...payload,
    error: fallbackMessage,
    status: error.status,
    notion: {
      code: error.notion?.code,
      message: error.notion?.message || error.message,
    },
  });
}
