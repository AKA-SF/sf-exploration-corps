import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { createPublicDetailHandler } from '../api/public-detail.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const DETAIL_SLUG = 'hydration-detail';
const MISSING_SLUG = 'hydration-missing';
let server;
let origin;

const metadataSnapshot = page => page.evaluate(() => ({
  canonical: document.querySelector('link[rel="canonical"]')?.href,
  description: document.querySelector('meta[name="description"]')?.content,
  ogTitle: document.querySelector('meta[property="og:title"]')?.content,
  ogUrl: document.querySelector('meta[property="og:url"]')?.content,
  robots: document.querySelector('meta[name="robots"]')?.content,
  title: document.title,
}));

function metadataFromHtml(html) {
  const content = selector => html.match(selector)?.[1];
  return {
    canonical: content(/<link rel="canonical" href="([^"]*)"/),
    description: content(/<meta name="description" content="([^"]*)"/),
    ogTitle: content(/<meta property="og:title" content="([^"]*)"/),
    ogUrl: content(/<meta property="og:url" content="([^"]*)"/),
    robots: content(/<meta name="robots" content="([^"]*)"/),
    title: content(/<title>([^<]*)<\/title>/),
  };
}

async function serveAsset(request, response) {
  const pathname = new URL(request.url, origin).pathname;
  const filePath = path.join(ROOT, 'dist', pathname === '/' ? 'index.html' : pathname);
  try {
    const body = await readFile(filePath);
    const contentType = pathname.endsWith('.js') ? 'text/javascript; charset=utf-8'
      : pathname.endsWith('.css') ? 'text/css; charset=utf-8'
        : pathname.endsWith('.svg') ? 'image/svg+xml'
          : 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
}

async function startServer() {
  const handler = createPublicDetailHandler({
    loadShell: () => readFile(path.join(ROOT, 'dist/index.html'), 'utf8'),
    loaders: {
      discovery: async slug => slug === DETAIL_SLUG ? {
        kind: 'EDITOR_PICK',
        editorial_payload: { intro: '검증된 편집 추천' },
        slug,
        summary: '서버에서만 알 수 있는 고유 상세 설명',
        title: '서버 고유 상세 제목',
      } : null,
      network: async () => null,
      question: async () => null,
    },
  });

  server = createServer(async (request, response) => {
    const url = new URL(request.url, origin ?? 'http://127.0.0.1');
    const match = url.pathname.match(/^\/discover\/([^/]+)$/);
    if (!match) return serveAsset(request, response);

    const adapter = {
      setHeader: (name, value) => response.setHeader(name, value),
      status(code) { response.statusCode = code; return this; },
      send(body) { response.end(body); return this; },
    };
    await handler({ method: request.method, query: { type: 'discover', identifier: match[1] } }, adapter);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
}

test.beforeAll(async () => startServer());
test.afterAll(async () => new Promise(resolve => server.close(resolve)));

test('server detail metadata survives execution of the built React client', async ({ page }) => {
  const response = await page.goto(`${origin}/discover/${DETAIL_SLUG}`);
  const raw = metadataFromHtml(await response.text());
  await page.locator('#root > *').first().waitFor();
  await expect.poll(() => metadataSnapshot(page)).toEqual(raw);
});

test('server 404 noindex metadata survives execution of the built React client', async ({ page }) => {
  const response = await page.goto(`${origin}/discover/${MISSING_SLUG}`);
  expect(response.status()).toBe(404);
  const raw = metadataFromHtml(await response.text());
  expect(raw.robots).toBe('noindex, nofollow');
  await page.locator('#root > *').first().waitFor();
  await expect.poll(() => metadataSnapshot(page)).toEqual(raw);
});

test('initial server marker is not reused after client-side list and detail navigation', async ({ page }) => {
  await page.goto(`${origin}/discover/${DETAIL_SLUG}`);
  await page.locator('#root > *').first().waitFor();

  await page.evaluate(() => {
    history.pushState({}, '', '/discover');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).toHaveTitle('새로 포착된 SF | SF 탐사단');
  await expect(page.locator('meta[name="sf-server-seo"]')).toHaveCount(0);

  await page.evaluate(() => {
    history.pushState({}, '', '/discover/client-navigation');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).not.toHaveTitle('서버 고유 상세 제목 | SF 탐사단');
  await expect.poll(() => page.locator('link[rel="canonical"]').getAttribute('href'))
    .toBe('https://www.sf-explorer.net/discover/client-navigation');

  await page.evaluate(() => {
    history.pushState({}, '', '/discover/hydration-detail');
    dispatchEvent(new PopStateEvent('popstate'));
  });
  await expect(page).not.toHaveTitle('서버 고유 상세 제목 | SF 탐사단');
});
