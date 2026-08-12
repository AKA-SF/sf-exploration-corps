import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('unknown routes recover through a branded 404 with safe home and archive exits', async () => {
  const app = await read('src/App.jsx');
  const page = await read('src/pages/NotFound.jsx');
  const css = await read('src/pages/NotFound.css');

  assert.match(app, /import\('\.\/pages\/NotFound'\)/);
  assert.match(app, /<Route path="\*" element={<NotFound\s*\/>}\s*\/>/);
  assert.match(page, /SIGNAL NOT FOUND/);
  assert.match(page, /to="\/"/);
  assert.match(page, /to="\/works\/novels"/);
  assert.match(css, /:focus-visible/);
});

test('editorial details distinguish malformed, missing, and temporarily unavailable routes', async () => {
  const detail = await read('src/pages/SfDiscoveryDetail.jsx');

  assert.match(detail, /DISCOVERY_SLUG_PATTERN/);
  assert.match(detail, /error\.status = response\.status/);
  assert.match(detail, /error\.status === 404 \? 'not-found' : 'error'/);
  assert.match(detail, /!hasValidSlug/);
  assert.match(detail, /이 편집 추천을 찾을 수 없습니다/);
  assert.match(detail, /편집 추천 연결이 지연되고 있습니다/);
});

test('home CTAs expose strong borders and a non-color keyboard focus indicator', async () => {
  const home = await read('src/pages/HomeV2.jsx');
  const css = await read('src/pages/HomeV2.css');

  assert.match(home, /conceptsUnavailable && mediaUnavailable[\s\S]*개념·미디어 연결이 지연되고 있습니다/);
  assert.match(css, /\.home-v2-button\s*\{[^}]*border:\s*1px solid rgba\(115, 238, 229, \.62\)/);
  assert.match(css, /\.home-v2-button:focus-visible\s*\{\s*outline:\s*3px solid #ffffff/);
});

test('media active tabs are vertically centered and visibly selected', async () => {
  const page = await read('src/pages/MediaArchive.jsx');
  const css = await read('src/pages/MediaArchive.css');

  assert.match(page, /aria-current=\{category\.slug === activeCategory\.slug \? 'page' : undefined\}/);
  assert.match(css, /\.media-archive-page\s*\{\s*--cyan:\s*#19f7f1;/);
  assert.match(css, /\.media-archive-tabs a\s*\{[\s\S]*?padding:\s*0 16px;[\s\S]*?align-items:\s*center;/);
  assert.match(css, /\.media-archive-tabs a\.is-active[\s\S]*?box-shadow:/);
});

test('image fallback keeps home, media archive, and discovery detail surfaces intact', async () => {
  const image = await read('src/components/ResilientImage.jsx');
  const home = await read('src/pages/HomeV2.jsx');
  const media = await read('src/pages/MediaArchive.jsx');
  const dialog = await read('src/features/sf-discoveries/SfDiscoveryDialog.jsx');

  assert.match(image, /key=\{src \|\| 'missing'\}/);
  assert.match(image, /onError=\{\(\) => setHasError\(true\)\}/);
  assert.match(image, /if \(!src \|\| hasError\) return fallback/);
  assert.match(home, /ResilientImage[\s\S]*fallback=\{<BookOpen/);
  assert.match(home, /ResilientImage[\s\S]*fallback=\{<Play/);
  assert.match(media, /ResilientImage[\s\S]*fallback=\{item\.medium === 'Article'/);
  assert.match(dialog, /ResilientImage[\s\S]*fallback=\{<span>표지 정보 없음<\/span>\}/);
});
