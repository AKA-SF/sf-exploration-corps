import { readFile } from 'node:fs/promises';

import { loadPublishedDiscovery } from './discoveries.js';
import { supabaseRestRequest, supabaseRpcRequest } from './_supabaseRest.js';
import { buildRouteHtml } from '../scripts/generate-seo-assets.mjs';

const SITE_URL = 'https://www.sf-explorer.net';
const NO_STORE = 'private, no-store';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISCOVERY_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,119}$/;
const TYPE_CONTRACT = {
  discover: {
    isValid: value => DISCOVERY_SLUG_PATTERN.test(value),
    path: identifier => `/discover/${identifier}`,
  },
  network: {
    isValid: value => UUID_PATTERN.test(value),
    path: identifier => `/network/${identifier}`,
  },
  questions: {
    isValid: value => UUID_PATTERN.test(value),
    path: identifier => `/questions/${identifier}`,
  },
};

function firstRow(rows) {
  return Array.isArray(rows) ? rows[0] ?? null : rows ?? null;
}

export async function loadPublicQuestion(identifier) {
  const params = new URLSearchParams({
    id: `eq.${identifier}`,
    limit: '1',
    select: 'id,title,body,status',
    status: 'eq.public',
  });
  return firstRow(await supabaseRestRequest(`community_posts?${params.toString()}`));
}

export async function loadVisibleNetworkDetail(identifier) {
  return firstRow(await supabaseRpcRequest('get_visible_exploration_log_detail', {
    body: { p_id: identifier },
  }));
}

const defaultLoaders = {
  discovery: loadPublishedDiscovery,
  network: loadVisibleNetworkDetail,
  question: loadPublicQuestion,
};

function cleanText(value, fallback) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

function summarize(value, fallback) {
  const text = cleanText(value, fallback);
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function isApprovedDiscovery(record) {
  // This projection does not expose editorial_stage. Release therefore requires
  // 20260813090000_restore_published_editorial_detail_contract.sql so the RPC
  // remains the authority for APPROVED + payload-valid published rows.
  return record?.kind === 'EDITOR_PICK'
    && record.editorial_payload
    && typeof record.editorial_payload === 'object';
}

function isPublicQuestion(record) {
  return record?.status === 'public';
}

function isVisibleNetworkRecord(record) {
  return record && ['ANON_NETWORK', 'PUBLIC_SIGNAL'].includes(record.visibility);
}

function metadataFor(type, identifier, record) {
  const canonical = `${SITE_URL}${TYPE_CONTRACT[type].path(identifier)}`;
  let title;
  let description;

  if (type === 'discover') {
    title = cleanText(record.title, '편집 추천');
    description = summarize(record.summary, `${title} 편집 추천을 SF 탐사단에서 확인하세요.`);
  } else if (type === 'questions') {
    title = cleanText(record.title, '커뮤니티 질문');
    description = summarize(record.body, `${title} 커뮤니티 글을 SF 탐사단에서 확인하세요.`);
  } else {
    const classified = record.spoiler === 'CLASSIFIED_SIGNAL';
    title = classified ? '분류된 탐사 신호' : cleanText(record.title, '공개 탐사 신호');
    description = classified
      ? '스포일러 보호를 위해 내용이 분류된 SF 탐사단 공개 신호입니다.'
      : summarize(record.memo, `${title} 공개 신호를 SF 탐사단 네트워크에서 확인하세요.`);
  }

  return {
    canonical,
    description,
    image: `${SITE_URL}/og-image.png`,
    robots: 'index, follow, max-image-preview:large',
    siteName: 'SF 탐사단',
    title: `${title} | SF 탐사단`,
  };
}

function errorMetadata(type, identifier, status) {
  const contract = TYPE_CONTRACT[type];
  return {
    canonical: `${SITE_URL}${contract ? contract.path(identifier) : '/'}`,
    description: status === 404
      ? '요청한 공개 상세 정보를 찾을 수 없습니다.'
      : '공개 상세 정보를 일시적으로 불러올 수 없습니다.',
    image: `${SITE_URL}/og-image.png`,
    robots: 'noindex, nofollow',
    siteName: 'SF 탐사단',
    title: status === 404 ? '상세 정보를 찾을 수 없습니다 | SF 탐사단' : '일시적인 연결 오류 | SF 탐사단',
  };
}

function sendHtml(response, shell, metadata, status) {
  response.status(status);
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', NO_STORE);
  if (status !== 200) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  const markerPath = new URL(metadata.canonical).pathname;
  return response.send(buildRouteHtml(shell, metadata, { markerPath }));
}

async function loadBuiltShell() {
  return readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
}

export function createPublicDetailHandler({
  loaders = defaultLoaders,
  loadShell = loadBuiltShell,
} = {}) {
  return async function publicDetailHandler(request, response) {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      response.setHeader('Cache-Control', NO_STORE);
      return response.status(405).send('Method not allowed');
    }

    const type = String(request.query?.type ?? '');
    const identifier = String(request.query?.identifier ?? '').trim();
    const contract = TYPE_CONTRACT[type];
    let shell;

    try {
      shell = await loadShell();
    } catch {
      response.setHeader('X-Robots-Tag', 'noindex, nofollow');
      response.setHeader('Cache-Control', NO_STORE);
      return response.status(503).send('Service unavailable');
    }

    if (!contract || !contract.isValid(identifier)) {
      return sendHtml(response, shell, errorMetadata(type, identifier, 404), 404);
    }

    try {
      const loader = type === 'discover' ? loaders.discovery : type === 'questions' ? loaders.question : loaders.network;
      const record = await loader(identifier);
      const isPublic = type === 'discover'
        ? isApprovedDiscovery(record)
        : type === 'questions'
          ? isPublicQuestion(record)
          : isVisibleNetworkRecord(record);
      if (!isPublic) return sendHtml(response, shell, errorMetadata(type, identifier, 404), 404);
      return sendHtml(response, shell, metadataFor(type, identifier, record), 200);
    } catch {
      return sendHtml(response, shell, errorMetadata(type, identifier, 503), 503);
    }
  };
}

export default createPublicDetailHandler();
