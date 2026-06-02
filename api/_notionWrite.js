export function normalizePropertyName(value) {
  return String(value ?? '').replace(/\s/g, '').toLowerCase();
}

export function findPropertyEntry(schema, preferredNames, type, { loose = false } = {}) {
  const entries = Object.entries(schema ?? {});
  const normalizedNames = preferredNames.map(normalizePropertyName);

  const exactMatch = entries.find(([name, property]) => (
    (!type || property.type === type) && normalizedNames.includes(normalizePropertyName(name))
  ));
  if (exactMatch || !loose) return exactMatch;

  return entries.find(([name, property]) => (
    (!type || property.type === type)
    && normalizedNames.some(candidate => normalizePropertyName(name).includes(candidate))
  ));
}

export function findPropertyName(schema, preferredNames, type, options) {
  return findPropertyEntry(schema, preferredNames, type, options)?.[0]
    ?? Object.entries(schema ?? {}).find(([, property]) => !type || property.type === type)?.[0]
    ?? '';
}

export async function readJsonBody(request, { maxBytes = 64 * 1024 } = {}) {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') {
    if (Buffer.byteLength(request.body, 'utf8') > maxBytes) {
      const error = new Error('Request body is too large');
      error.status = 413;
      throw error;
    }
    return JSON.parse(request.body || '{}');
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    request.on('data', chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
        const error = new Error('Request body is too large');
        error.status = 413;
        reject(error);
        request.destroy?.();
      }
    });
    request.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

export function richTextPayload(value, limit = 1900) {
  const content = String(value ?? '').slice(0, limit);
  return content ? [{ type: 'text', text: { content } }] : [];
}

export function richTextProperty(value, limit) {
  return { rich_text: richTextPayload(value, limit) };
}

export function titleProperty(value, limit) {
  return { title: richTextPayload(value, limit) };
}

export function selectProperty(value, limit = 100) {
  return { select: { name: String(value ?? '').slice(0, limit) } };
}

export function multiSelectProperty(values, limit = 100) {
  const safeValues = Array.isArray(values) ? values : [values];
  return {
    multi_select: [...new Set(safeValues.filter(Boolean).map(value => String(value).slice(0, limit)))]
      .map(name => ({ name })),
  };
}

export function splitList(value) {
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
  return String(value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}
