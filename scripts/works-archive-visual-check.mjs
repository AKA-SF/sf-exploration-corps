import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const archiveCss = await readFile(new URL('../src/pages/WorksArchive.css', import.meta.url), 'utf8');
const archiveHeader = await readFile(new URL('../src/pages/works/WorksArchiveHeader.jsx', import.meta.url), 'utf8');
const archiveTabs = await readFile(new URL('../src/pages/works/WorksArchiveTabs.jsx', import.meta.url), 'utf8');
const globalCss = await readFile(new URL('../src/index.css', import.meta.url), 'utf8');
const mediaArchive = await readFile(new URL('../src/pages/MediaArchive.jsx', import.meta.url), 'utf8');
const mediaArchiveCss = await readFile(new URL('../src/pages/MediaArchive.css', import.meta.url), 'utf8');
const questionsBoard = await readFile(new URL('../src/pages/questions/QuestionsBoard.jsx', import.meta.url), 'utf8');

test('works archive shares the quiet observatory palette with HomeV2', () => {
  assert.match(archiveCss, /--works-bg:\s*#05090d/);
  assert.match(archiveCss, /--works-panel:\s*rgba\(10,\s*20,\s*27,\s*0\.78\)/);
  assert.match(archiveCss, /--works-line:\s*rgba\(117,\s*233,\s*225,\s*0\.18\)/);
  assert.match(archiveCss, /--works-cyan:\s*#73eee5/);
  assert.match(archiveCss, /--works-amber:\s*#ffbd59/);
  assert.match(archiveCss, /\.works-full-page::before/);
});

test('works archive actions use user-facing language and visible focus', () => {
  assert.match(archiveHeader, /작품 제보하기/);
  assert.match(archiveCss, /\.works-full-page :focus-visible/);
  assert.match(archiveCss, /outline:\s*2px solid var\(--works-focus\)/);
});

test('reading mode uses the cool mineral palette instead of the old yellow paper surface', () => {
  assert.match(globalCss, /--mode-reading-bg:\s*#eaf0ef/);
  assert.match(globalCss, /--mode-reading-panel:\s*#f7faf9/);
  assert.match(globalCss, /--mode-reading-cyan:\s*#27656d/);
  assert.match(globalCss, /--mode-reading-focus:\s*#8a4f13/);
  assert.doesNotMatch(archiveCss, /#f3efe6|#fffdf6|255,\s*252,\s*244|232,\s*222,\s*202/);
});

test('selected archive and board filters expose their state without relying on color', () => {
  assert.match(archiveTabs, /aria-current=.*['"]page['"]/);
  assert.match(mediaArchive, /aria-current=.*['"]page['"]/);
  assert.match(questionsBoard, /aria-pressed=\{activeCategory === category\}/);
});

test('media archive header uses product language and the shared flat archive hierarchy', () => {
  assert.doesNotMatch(mediaArchive, /노션/);
  assert.match(mediaArchive, /인터뷰와 영상, 고전 SF 영화를 분류별로 살펴보세요\./);
  assert.match(mediaArchiveCss, /\.media-archive-header\s*\{[\s\S]*?border-bottom:\s*1px solid/);
  assert.match(mediaArchiveCss, /\.media-back-link\s*\{[\s\S]*?min-height:\s*44px;[\s\S]*?border-radius:\s*999px;/);
  assert.match(mediaArchiveCss, /\.media-archive-header p\s*\{[\s\S]*?word-break:\s*keep-all;/);
});
