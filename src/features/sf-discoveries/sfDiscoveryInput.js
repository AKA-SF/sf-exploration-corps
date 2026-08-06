import { validateEditorialPayload } from './editorialDraft.js';

export function slugifyDiscoveryTitle(value) {
  const normalized = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || `sf-signal-${Date.now()}`;
}

export function publishedEditorialWorkflowChanged(current, input) {
  if (current?.publication_status !== 'PUBLISHED' || input?.publication_status !== 'PUBLISHED') return false;
  return current.kind !== input.kind
    || current.editorial_stage !== input.editorial_stage
    || JSON.stringify(current.editorial_payload ?? null) !== JSON.stringify(input.editorial_payload ?? null)
    || current.selection_approval_ref !== input.selection_approval_ref
    || current.selection_approved_at !== input.selection_approved_at;
}

export function normalizeDiscoveryInput(input, { preservePublished = false } = {}) {
  const publicationStatus = input.publication_status === 'ARCHIVED' ? 'ARCHIVED' : 'DRAFT';
  const editorialPayload = input.kind === 'EDITOR_PICK' ? input.editorial_payload ?? null : null;
  if (editorialPayload) {
    const validation = validateEditorialPayload(editorialPayload);
    if (!validation.valid) throw new Error(validation.errors[0]);
  }

  return {
    editorial_payload: editorialPayload,
    editorial_stage: input.kind === 'EDITOR_PICK' ? input.editorial_stage || 'DRAFTING' : 'NONE',
    image_alt: String(input.image_alt ?? '').trim() || null,
    image_url: String(input.image_url ?? '').trim() || null,
    internal_notes: String(input.internal_notes ?? '').trim(),
    is_spoiler: Boolean(input.is_spoiler),
    kind: input.kind,
    media_type: input.media_type,
    ...(!preservePublished || input.publication_status !== 'PUBLISHED' ? {
      publication_status: publicationStatus,
      published_at: null,
    } : {}),
    release_date: input.release_date || null,
    selection_approval_ref: input.kind === 'EDITOR_PICK' ? String(input.selection_approval_ref ?? '').trim() || null : null,
    selection_approved_at: input.kind === 'EDITOR_PICK' ? input.selection_approved_at || null : null,
    slug: String(input.slug || slugifyDiscoveryTitle(input.title)).trim(),
    sort_priority: Number(input.sort_priority) || 0,
    source_name: String(input.source_name ?? '').trim(),
    source_url: String(input.source_url ?? '').trim(),
    summary: String(input.summary ?? '').trim(),
    title: String(input.title ?? '').trim(),
  };
}
