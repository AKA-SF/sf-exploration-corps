import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createEmptyEditorialPayload,
  validateEditorialPayload,
} from '../src/features/sf-discoveries/editorialDraft.js';
import { summerClimateEditorialDraft } from '../src/content/editorial/summerClimateEditorialDraft.js';
import discoveryHandler from '../api/discoveries.js';
import editorialDraftHandler from '../api/editorial-draft.js';

function createResponse() {
  return {
    body: '',
    headers: {},
    statusCode: 200,
    end(value = '') { this.body = value; },
    json(value) { this.body = JSON.stringify(value); return this; },
    setHeader(name, value) { this.headers[name] = value; },
    status(value) { this.statusCode = value; return this; },
  };
}

test('the approved summer climate draft contains exactly three valid translated books', () => {
  const result = validateEditorialPayload(summerClimateEditorialDraft.editorial_payload);

  assert.deepEqual(result, { errors: [], valid: true });
  assert.equal(summerClimateEditorialDraft.kind, 'EDITOR_PICK');
  assert.equal(summerClimateEditorialDraft.publication_status, 'DRAFT');
  assert.equal(summerClimateEditorialDraft.editorial_stage, 'REVIEW_READY');
  assert.equal(summerClimateEditorialDraft.editorial_payload.books.length, 3);
  assert.equal(new Set(summerClimateEditorialDraft.editorial_payload.books.map(book => book.isbn13)).size, 3);
  assert.ok(summerClimateEditorialDraft.editorial_payload.books.every(book => book.cover.rights_status === 'API_LICENSED'));
  assert.ok(summerClimateEditorialDraft.editorial_payload.books.every(book => book.cover.url.startsWith('https://image.aladin.co.kr/')));
  assert.ok(summerClimateEditorialDraft.editorial_payload.books.every(book => !('excerpt' in book)));
});

test('editorial validation rejects any book count other than three', () => {
  const empty = createEmptyEditorialPayload();
  const result = validateEditorialPayload({ ...empty, books: empty.books.slice(0, 2) });

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('편집 추천은 정확히 세 권이어야 합니다.'));
});

test('editorial validation rejects unreviewed cover rights', () => {
  const payload = structuredClone(summerClimateEditorialDraft.editorial_payload);
  payload.books[0].cover.rights_status = 'UNVERIFIED';

  const result = validateEditorialPayload(payload);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('표지 사용 근거')));
});

test('editorial validation requires translated-edition and cover provenance metadata', () => {
  const payload = structuredClone(summerClimateEditorialDraft.editorial_payload);
  payload.books[0].translator = '';
  payload.books[1].cover.rights_note = '';
  payload.books[2].cover.url = '';

  const result = validateEditorialPayload(payload);

  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.includes('번역자')));
  assert.ok(result.errors.some(error => error.includes('표지 권리 메모')));
  assert.ok(result.errors.some(error => error.includes('표지 주소')));
});

test('editorial validation rejects duplicate source URLs', () => {
  const payload = structuredClone(summerClimateEditorialDraft.editorial_payload);
  payload.sources[1].url = payload.sources[0].url;

  const result = validateEditorialPayload(payload);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('같은 출처 URL을 중복 기록할 수 없습니다.'));
});

test('editorial validation normalizes ISBN values before duplicate detection', () => {
  const payload = structuredClone(summerClimateEditorialDraft.editorial_payload);
  payload.books[1].isbn13 = Number(payload.books[0].isbn13);

  const result = validateEditorialPayload(payload);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('같은 ISBN의 책을 중복 추천할 수 없습니다.'));
});

test('approved draft endpoint is no-store and rejects unauthenticated reads', async () => {
  const response = createResponse();
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_ANON_KEY;
  process.env.SUPABASE_URL = 'https://example.invalid';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  try {
    await editorialDraftHandler({ headers: {}, method: 'GET' }, response);
    assert.equal(response.statusCode, 401);
    assert.equal(response.headers['Cache-Control'], 'private, no-store');
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = previousKey;
  }
});

test('approved draft endpoint is read-only', async () => {
  const response = createResponse();
  await editorialDraftHandler({ headers: {}, method: 'POST' }, response);
  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'GET');
});

test('public editorial detail rejects invalid slugs before data access', async () => {
  const response = createResponse();
  await discoveryHandler({ method: 'GET', url: '/api/discoveries?slug=../private-draft' }, response);
  assert.equal(response.statusCode, 400);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});
