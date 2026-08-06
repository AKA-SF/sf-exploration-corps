import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const port = 4180;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = '/tmp/sf-editorial-qa';
const vitePath = resolve('node_modules/vite/bin/vite.js');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/__editorial-preview`);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 100));
  }
  throw new Error('Editorial preview server did not become ready');
}

async function inspectViewport(browser, name, viewport) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));

  await page.goto(`${baseUrl}/__editorial-preview`, { waitUntil: 'networkidle' });
  await page.locator('.editorial-book').first().waitFor({ state: 'visible', timeout: 10_000 });
  const bookSections = page.locator('.editorial-book');
  for (let index = 0; index < await bookSections.count(); index += 1) {
    await bookSections.nth(index).scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  }
  await page.waitForFunction(
    () => [...document.querySelectorAll('.editorial-book__cover')].every(image => image.complete),
    undefined,
    { timeout: 15_000 },
  );

  assert.equal(await page.locator('.editorial-book').count(), 3, `${name}: exactly three books`);
  assert.equal(await page.locator('.editorial-book__cover').count(), 3, `${name}: three covers`);
  assert.ok(await page.locator('.editorial-article__sources a').count() >= 12, `${name}: source links`);
  assert.equal(await page.locator('h1').textContent(), '한여름의 기후 SF: 우리가 지키려는 것들');

  const metrics = await page.evaluate(() => {
    const scroller = document.querySelector('.page-container');
    return {
      coverFailures: [...document.querySelectorAll('.editorial-book__cover')].filter(image => image.naturalWidth === 0).length,
      documentHeight: scroller?.scrollHeight || document.documentElement.scrollHeight,
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        (scroller?.scrollWidth || 0) - (scroller?.clientWidth || 0),
      ),
    };
  });
  assert.equal(metrics.coverFailures, 0, `${name}: all covers load`);
  assert.ok(metrics.documentHeight > viewport.height * 2, `${name}: long-form page scrolls`);
  assert.ok(metrics.horizontalOverflow <= 1, `${name}: no horizontal overflow`);

  if (name === 'mobile') {
    const columns = await page.locator('.editorial-book').first().evaluate(element => getComputedStyle(element).gridTemplateColumns);
    assert.equal(columns.trim().split(/\s+/).length, 2, 'mobile: signal rail plus one content column');
  }

  assert.deepEqual(errors, [], `${name}: no browser errors`);
  const screenshotTargets = [
    ['top', '.editorial-article__header'],
    ['book-1', '.editorial-book:nth-of-type(1)'],
    ['book-2', '.editorial-book:nth-of-type(2)'],
    ['book-3', '.editorial-book:nth-of-type(3)'],
    ['sources', '.editorial-article__sources'],
  ];
  for (const [label, selector] of screenshotTargets) {
    await page.locator(selector).evaluate(element => element.scrollIntoView({ behavior: 'instant', block: 'start' }));
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${outputDir}/editorial-${name}-${label}.png` });
  }
  await context.close();
  return metrics;
}

await mkdir(outputDir, { recursive: true });
const server = spawn(process.execPath, [vitePath, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: 'ignore' });
let browser;
try {
  await waitForServer();
  browser = await chromium.launch({
    executablePath: existsSync(chromePath) ? chromePath : undefined,
    headless: true,
  });
  const desktop = await inspectViewport(browser, 'desktop', { width: 1440, height: 1000 });
  const mobile = await inspectViewport(browser, 'mobile', { width: 390, height: 844 });
  console.log(JSON.stringify({ desktop, mobile, screenshots: outputDir }, null, 2));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
