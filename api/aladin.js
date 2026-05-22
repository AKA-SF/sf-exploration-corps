const ALADIN_ENDPOINT = 'http://www.aladin.co.kr/ttb/api/ItemSearch.aspx';

const pickFirst = (value) => (Array.isArray(value) ? value[0] : value);

const allowedParams = [
  'Query',
  'QueryType',
  'MaxResults',
  'start',
  'SearchTarget',
  'output',
  'Version',
];

export default async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.status(204).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.ALADIN_TTB_KEY || process.env.VITE_ALADIN_TTB_KEY;
  if (!apiKey) {
    response.status(500).json({ error: 'ALADIN_TTB_KEY is not configured' });
    return;
  }

  const params = new URLSearchParams({
    ttbkey: apiKey,
    QueryType: 'Keyword',
    MaxResults: '25',
    start: '1',
    SearchTarget: 'Book',
    output: 'js',
    Version: '20131101',
  });

  allowedParams.forEach((key) => {
    const value = pickFirst(request.query?.[key]);
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, value);
    }
  });

  if (!params.get('Query')) {
    response.status(400).json({ error: 'Query is required' });
    return;
  }

  try {
    const upstream = await fetch(`${ALADIN_ENDPOINT}?${params.toString()}`);
    const text = await upstream.text();

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    response.status(upstream.status).send(text.trim().replace(/;$/, ''));
  } catch (error) {
    response.status(502).json({ error: 'Aladin relay failed', detail: error.message });
  }
}
