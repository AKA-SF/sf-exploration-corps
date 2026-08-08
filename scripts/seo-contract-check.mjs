import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  PUBLIC_SEO_ROUTES,
  buildRouteHtml,
  buildSitemap,
  generateSeoAssets,
} from './generate-seo-assets.mjs';
import { getSeoMetadata } from '../src/lib/seo.js';

const readProjectFile = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const PUBLIC_ROUTE_CONTRACT = [
  {
    path: '/',
    title: 'SF 탐사단 | 과학소설 아카이브와 탐사 커뮤니티',
    description: 'SF 탐사단은 SF 소설, 영화, 게임, 애니메이션, 개념 사전, 미디어 자료, 커뮤니티 기록을 탐사 좌표처럼 연결하는 과학소설 아카이브입니다.',
  },
  {
    path: '/discover',
    title: '새로 포착된 SF | SF 탐사단',
    description: 'SF 신작, 공개 예정작과 편집 추천을 공식 출처와 공개 일정으로 확인하는 SF 탐사단의 관측 정보 페이지입니다.',
  },
  {
    path: '/works/novels',
    title: 'SF 소설 아카이브 | SF 탐사단',
    description: 'SF 탐사단의 소설 아카이브입니다. 한국 과학소설, 해외 SF, 고전, 장르 태그, 추천자 기록을 탐사 좌표처럼 찾아볼 수 있습니다.',
  },
  {
    path: '/works/cinema',
    title: 'SF 영화 아카이브 | SF 탐사단',
    description: 'SF 영화와 영상 작품을 장르, 질문, 감각적 키워드로 정리하는 SF 탐사단 작품 아카이브입니다.',
  },
  {
    path: '/works/games',
    title: 'SF 게임 아카이브 | SF 탐사단',
    description: 'SF 게임과 인터랙티브 작품을 세계관, 질문, 장르 좌표로 연결해 살펴보는 SF 탐사단 아카이브입니다.',
  },
  {
    path: '/works/animation',
    title: 'SF 애니메이션 아카이브 | SF 탐사단',
    description: 'SF 애니메이션 작품을 장르와 핵심 질문으로 탐사하는 SF 탐사단 작품 아카이브입니다.',
  },
  {
    path: '/media/media',
    title: 'SF 관련 미디어 아카이브 | SF 탐사단',
    description: 'SF 관련 영상, 기사, 자료, 해설 콘텐츠를 모아 과학소설을 넓게 탐사하는 미디어 아카이브입니다.',
  },
  {
    path: '/media/classic-films',
    title: 'SF 고전 영화 아카이브 | SF 탐사단',
    description: 'SF 고전 영화와 오래된 미래 상상력을 모아 현재의 SF 읽기와 연결하는 미디어 아카이브입니다.',
  },
  {
    path: '/exploration-log',
    title: '탐사 로그 | SF 탐사단',
    description: '인스타그램 리뷰와 서평 기록을 탐사 로그처럼 모아보는 SF 탐사단의 독서 기록 아카이브입니다.',
  },
  {
    path: '/questions',
    title: '커뮤니티 게시판 | SF 탐사단',
    description: 'SF 작품 추천, 질문, 토론, 자유글을 남기고 다른 탐사자들과 댓글로 교신하는 커뮤니티 게시판입니다.',
  },
  {
    path: '/network',
    title: '탐사 네트워크 | SF 탐사단',
    description: '커뮤니티 글, 작품 댓글, 무전 메시지를 실시간 신호망처럼 연결해 보여주는 SF 탐사단 네트워크입니다.',
  },
];

const PRODUCTION_APP_ROUTE_PATHS = [
  '/',
  '/home-v2',
  '/discover',
  '/discover/:slug',
  '/works/:categorySlug',
  '/media/interviews',
  '/media/:categorySlug',
  '/exploration-log',
  '/questions',
  '/questions/:questionId',
  '/log',
  '/result/:id',
  '/network',
  '/network/:id',
  '/badges',
  '/profile',
  '/crew/:crewCode/message',
  '/login',
  '/admin',
  '/admin/discoveries',
];

const DEVELOPMENT_ONLY_ROUTE_PATHS = ['/admin/__visual-preview', '/__editorial-preview'];

const SPA_REWRITE_PATHS = [
  '/discover/:slug',
  '/questions/:questionId',
  '/log',
  '/result/:id',
  '/network/:id',
  '/badges',
  '/profile',
  '/crew/:crewCode/message',
  '/login',
  '/admin',
  '/admin/discoveries',
];

test('sitemap contains only canonical public routes without unverifiable freshness hints', () => {
  const paths = PUBLIC_SEO_ROUTES.map(route => route.path);
  const sitemap = buildSitemap();

  assert.deepEqual(paths, PUBLIC_ROUTE_CONTRACT.map(route => route.path));
  assert.match(sitemap, /<loc>https:\/\/www\.sf-explorer\.net\/discover<\/loc>/);
  assert.doesNotMatch(sitemap, /<lastmod>|<changefreq>|<priority>/);
  assert.doesNotMatch(sitemap, /media\/interviews|\/profile|\/login|\/admin/);
});

test('route HTML shell exposes canonical metadata before client JavaScript runs', () => {
  const template = `<!doctype html><html><head>
    <title>Home title</title>
    <meta name="description" content="Home description" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.sf-explorer.net/" />
    <meta property="og:title" content="Home title" />
    <meta property="og:description" content="Home description" />
    <meta property="og:url" content="https://www.sf-explorer.net/" />
    <meta property="og:image" content="https://www.sf-explorer.net/og-image.svg" />
    <meta property="og:image:type" content="image/svg+xml" />
    <meta name="twitter:title" content="Home title" />
    <meta name="twitter:description" content="Home description" />
    <meta name="twitter:image" content="https://www.sf-explorer.net/og-image.svg" />
  </head><body><div id="root"></div></body></html>`;
  const metadata = getSeoMetadata('/works/novels');
  const html = buildRouteHtml(template, metadata);

  assert.match(html, /<title>SF 소설 아카이브 \| SF 탐사단<\/title>/);
  assert.match(html, /canonical" href="https:\/\/www\.sf-explorer\.net\/works\/novels"/);
  assert.match(html, /og:url" content="https:\/\/www\.sf-explorer\.net\/works\/novels"/);
  assert.match(html, /og:image" content="https:\/\/www\.sf-explorer\.net\/og-image\.png"/);
  assert.match(html, /og:image:type" content="image\/png"/);
  assert.doesNotMatch(html, /canonical" href="https:\/\/www\.sf-explorer\.net\/" \/>/);
});

test('SEO build writes sitemap and route-specific HTML shells', async () => {
  const distDir = await mkdtemp(path.join(tmpdir(), 'sf-seo-'));
  const template = `<!doctype html><html><head>
    <title>Home title</title>
    <meta name="description" content="Home description" />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://www.sf-explorer.net/" />
    <meta property="og:title" content="Home title" />
    <meta property="og:description" content="Home description" />
    <meta property="og:url" content="https://www.sf-explorer.net/" />
    <meta property="og:image" content="https://www.sf-explorer.net/og-image.svg" />
    <meta property="og:image:type" content="image/svg+xml" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Home title" />
    <meta name="twitter:description" content="Home description" />
    <meta name="twitter:image" content="https://www.sf-explorer.net/og-image.svg" />
  </head><body><div id="root"></div></body></html>`;

  try {
    await writeFile(path.join(distDir, 'index.html'), template, 'utf8');
    await generateSeoAssets({ distDir });

    const sitemap = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
    assert.doesNotMatch(sitemap, /<lastmod>|<changefreq>|<priority>/);
    for (const route of PUBLIC_ROUTE_CONTRACT) {
      const outputPath = route.path === '/'
        ? path.join(distDir, 'index.html')
        : path.join(distDir, 'seo', `${route.path.slice(1)}.html`);
      const html = await readFile(outputPath, 'utf8');
      const canonical = `https://www.sf-explorer.net${route.path}`;

      assert.ok(html.includes(`<title>${route.title}</title>`), `${route.path} title`);
      assert.ok(html.includes(`name="description" content="${route.description}"`), `${route.path} description`);
      assert.ok(html.includes('name="robots" content="index, follow, max-image-preview:large"'), `${route.path} robots`);
      assert.ok(html.includes(`rel="canonical" href="${canonical}"`), `${route.path} canonical`);
      assert.ok(html.includes(`property="og:title" content="${route.title}"`), `${route.path} og:title`);
      assert.ok(html.includes(`property="og:description" content="${route.description}"`), `${route.path} og:description`);
      assert.ok(html.includes(`property="og:url" content="${canonical}"`), `${route.path} og:url`);
      assert.ok(html.includes('property="og:image" content="https://www.sf-explorer.net/og-image.png"'), `${route.path} og:image`);
      assert.ok(html.includes('property="og:image:type" content="image/png"'), `${route.path} og:image:type`);
      assert.ok(html.includes('property="og:image:width" content="1200"'), `${route.path} og:image:width`);
      assert.ok(html.includes('property="og:image:height" content="630"'), `${route.path} og:image:height`);
      assert.ok(html.includes('name="twitter:card" content="summary_large_image"'), `${route.path} twitter:card`);
      assert.ok(html.includes(`name="twitter:title" content="${route.title}"`), `${route.path} twitter:title`);
      assert.ok(html.includes(`name="twitter:description" content="${route.description}"`), `${route.path} twitter:description`);
      assert.ok(html.includes('name="twitter:image" content="https://www.sf-explorer.net/og-image.png"'), `${route.path} twitter:image`);
    }
  } finally {
    await rm(distDir, { force: true, recursive: true });
  }
});

test('build and hosting expose route metadata, redirects and private noindex headers', async () => {
  const [app, indexHtml, packageSource, vercelSource] = await Promise.all([
    readProjectFile('src/App.jsx'),
    readProjectFile('index.html'),
    readProjectFile('package.json'),
    readProjectFile('vercel.json'),
  ]);
  const packageJson = JSON.parse(packageSource);
  const vercel = JSON.parse(vercelSource);

  assert.match(packageJson.scripts.build, /node scripts\/generate-seo-assets\.mjs/);
  assert.equal(packageJson.scripts['test:seo'], 'node --test scripts/seo-contract-check.mjs');
  assert.match(packageJson.scripts['test:release'], /npm run test:seo/);
  assert.match(indexHtml, /"alternateName": "SF EXPLORER"/);
  assert.match(indexHtml, /og-image\.png/);
  assert.doesNotMatch(indexHtml, /SF Exploration Corps|og-image\.svg/);

  assert.match(app, /path="\/home-v2" element=\{<Navigate to="\/" replace \/>\}/);
  assert.match(app, /path="\/media\/interviews" element=\{<Navigate to="\/media\/media" replace \/>\}/);
  const appRoutePaths = [...app.matchAll(/<Route path="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(appRoutePaths, [...PRODUCTION_APP_ROUTE_PATHS, ...DEVELOPMENT_ONLY_ROUTE_PATHS]);

  const redirects = new Map(vercel.redirects.map(rule => [rule.source, rule]));
  assert.deepEqual(redirects.get('/home-v2'), {
    source: '/home-v2',
    destination: '/',
    permanent: true,
  });
  assert.deepEqual(redirects.get('/media/interviews'), {
    source: '/media/interviews',
    destination: '/media/media',
    permanent: true,
  });

  const publicRewriteSources = PUBLIC_ROUTE_CONTRACT.filter(route => route.path !== '/').map(route => route.path);
  const rewriteSources = vercel.rewrites.map(rule => rule.source);
  assert.equal(new Set(rewriteSources).size, rewriteSources.length, 'rewrite sources must be unique');
  assert.deepEqual(rewriteSources, [...publicRewriteSources, ...SPA_REWRITE_PATHS]);

  const rewrites = new Map(vercel.rewrites.map(rule => [rule.source, rule.destination]));
  PUBLIC_SEO_ROUTES.filter(route => route.path !== '/').forEach(route => {
    assert.equal(rewrites.get(route.path), `/seo${route.path}.html`);
  });
  SPA_REWRITE_PATHS.forEach(source => assert.equal(rewrites.get(source), '/index.html'));
  DEVELOPMENT_ONLY_ROUTE_PATHS.forEach(source => assert.equal(rewrites.has(source), false));

  const noindexContract = new Map([
    ['/api/:path*', 'noindex, nofollow, nosnippet'],
    ['/admin/:path*', 'noindex, nofollow'],
    ['/crew/:path*', 'noindex, nofollow'],
    ['/result/:path*', 'noindex, nofollow'],
    ['/profile', 'noindex, nofollow'],
    ['/login', 'noindex, nofollow'],
    ['/log', 'noindex, nofollow'],
    ['/badges', 'noindex, nofollow'],
    ['/__editorial-preview', 'noindex, nofollow'],
  ]);
  assert.equal(vercel.headers.length, noindexContract.size);
  for (const rule of vercel.headers) {
    assert.equal(rule.headers.length, 1, `${rule.source} must have one robots header`);
    assert.deepEqual(rule.headers[0], {
      key: 'X-Robots-Tag',
      value: noindexContract.get(rule.source),
    });
  }
});

test('Open Graph PNG is a real 1200 by 630 image', async () => {
  const image = await readFile(new URL('../public/og-image.png', import.meta.url));

  assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});

test('checked-in sitemap has no retired or private URLs', async () => {
  const sitemap = await readProjectFile('public/sitemap.xml');

  assert.equal(sitemap, buildSitemap());
  assert.match(sitemap, /<loc>https:\/\/www\.sf-explorer\.net\/discover<\/loc>/);
  assert.doesNotMatch(sitemap, /<lastmod>|<changefreq>|<priority>/);
  assert.doesNotMatch(sitemap, /media\/interviews|\/profile|\/login|\/admin/);
});
