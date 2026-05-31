export function plainText(value) {
  if (!value) return '';
  if (value.type === 'title' || value.type === 'rich_text') {
    return value[value.type]?.map(part => part.plain_text).join('') ?? '';
  }
  if (value.type === 'select') return value.select?.name ?? '';
  if (value.type === 'status') return value.status?.name ?? '';
  if (value.type === 'multi_select') return value.multi_select.map(tag => tag.name).join(', ');
  if (value.type === 'number') return String(value.number ?? '');
  if (value.type === 'url') return value.url ?? '';
  if (value.type === 'email') return value.email ?? '';
  if (value.type === 'date') return value.date?.start ?? '';
  if (value.type === 'created_time') return value.created_time ?? '';
  if (value.type === 'last_edited_time') return value.last_edited_time ?? '';
  if (value.type === 'relation') return value.relation?.length ? `${value.relation.length}개 연결` : '';
  return '';
}

export function multiSelect(value) {
  if (!value || value.type !== 'multi_select') return [];
  return value.multi_select.map(tag => tag.name);
}

export function textList(value) {
  if (!value) return [];
  if (value.type === 'multi_select') return multiSelect(value);
  return plainText(value)
    .split(/[,/、|]/)
    .map(item => item.trim())
    .filter(Boolean);
}

export function pick(properties, names) {
  return names.map(name => properties[name]).find(Boolean);
}

export function pickName(properties, names) {
  return names.find(name => properties[name]);
}
