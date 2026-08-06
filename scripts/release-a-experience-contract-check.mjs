import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('기록 작성은 작품과 한 줄 감상을 필수로 안내한다', async () => {
  const page = await read('src/pages/LogEntry.jsx');
  assert.match(page, /작품/);
  assert.match(page, /한 줄 감상/);
  assert.match(page, /PRIVATE_ARCHIVE/);
  assert.doesNotMatch(page, /QUICK_LOG|DEEP_ANALYSIS|TARGET_IDENTIFIER|EXPERIENTIAL_METRICS/);
  assert.doesNotMatch(page, /reportMode|Sliders|coords/);
});

test('저장 결과는 가짜 분석이나 인위적인 대기 없이 비공개 저장을 확인한다', async () => {
  const page = await read('src/pages/LogResult.jsx');
  assert.match(page, /나만 볼 수 있게 저장/);
  assert.match(page, /네트워크에 공개/);
  assert.doesNotMatch(page, /setTimeout|RISK|GALACTIC_COORD|뇌파|위험/);
});

test('개인 화면은 CRT와 노이즈 없이 HomeV2의 조용한 관측소 배경을 공유한다', async () => {
  const [background, appCss] = await Promise.all([
    read('src/components/InteractiveBackground.jsx'),
    read('src/App.css'),
  ]);

  assert.doesNotMatch(background, /className={`noise-bg|className={`crt-overlay|className="scanline"/);
  assert.match(appCss, /\.page-container:has\(\.log-entry-container\)/);
  assert.match(appCss, /\.page-container:has\(\.profile-home\)/);
  assert.match(appCss, /radial-gradient\(circle at 78% 10%, rgba\(21, 149, 151, 0\.14\)/);
  assert.match(appCss, /linear-gradient\(180deg, #05090d 0%, #071016 55%, #05090d 100%\)/);
  assert.match(appCss, /background-size:\s*80px 80px/);
});

test('내 정보는 localhost에서만 개인 데이터 없는 검토 모드를 제공한다', async () => {
  const source = await read('src/pages/Profile.jsx');

  assert.match(source, /localhost/);
  assert.match(source, /127\.0\.0\.1/);
  assert.match(source, /preview.*profile/);
  assert.match(source, /로컬 화면 검토 모드/);
  assert.match(source, /실제 개인 기록은 표시하지 않습니다/);
});
