import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const port = 4181;
const baseUrl = `http://127.0.0.1:${port}`;
const outputDir = '/tmp/sf-admin-qa';
const vitePath = resolve('node_modules/vite/bin/vite.js');
const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/admin/__visual-preview`);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await new Promise(resolvePromise => setTimeout(resolvePromise, 100));
  }
  throw new Error('Admin preview server did not become ready');
}

async function inspectViewport(browser, name, viewport) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));

  await page.goto(`${baseUrl}/admin/__visual-preview`, { waitUntil: 'networkidle' });
  await page.locator('.admin-operation-card').waitFor({ state: 'visible', timeout: 10_000 });

  assert.equal(await page.locator('.admin-operation-card').count(), 1, `${name}: one primary operation`);
  assert.equal(await page.locator('.admin-security-form input').count(), 3, `${name}: password change fields`);
  assert.match(await page.locator('h1').textContent(), /관리자 관측실/);
  const bodyText = await page.locator('body').innerText();
  assert.doesNotMatch(bodyText, /MP 부여|히든 배지 지급|회원 권한|최근 무전/);

  const metrics = await page.evaluate(() => {
    const scroller = document.querySelector('.page-container');
    const layout = document.querySelector('.admin-hub-layout');
    const security = document.querySelector('.admin-security');
    const surface = document.querySelector('.admin-hub');
    const title = document.querySelector('.admin-header h1');
    const disclosure = document.querySelector('.admin-security-disclosure');
    const controls = [...document.querySelectorAll('.admin-security summary, .admin-security input, .admin-security button')]
      .filter(element => element.getBoundingClientRect().height > 0);
    const titleStyle = getComputedStyle(title);
    return {
      columns: getComputedStyle(layout).gridTemplateColumns.trim().split(/\s+/).length,
      disclosureOpen: disclosure.open,
      horizontalOverflow: Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        (scroller?.scrollWidth || 0) - (scroller?.clientWidth || 0),
      ),
      minimumControlHeight: Math.min(...controls.map(element => element.getBoundingClientRect().height)),
      securityPosition: getComputedStyle(security).position,
      surfaceWidth: surface.getBoundingClientRect().width,
      titleLines: Math.round(title.getBoundingClientRect().height / Number.parseFloat(titleStyle.lineHeight)),
    };
  });

  assert.ok(metrics.horizontalOverflow <= 1, `${name}: no horizontal overflow`);
  assert.equal(metrics.disclosureOpen, false, `${name}: password form is collapsed by default`);
  assert.ok(metrics.minimumControlHeight >= 44, `${name}: security controls meet touch target`);
  if (name === 'desktop') {
    assert.ok(metrics.surfaceWidth >= 1100, 'desktop: Admin uses the available workspace');
    assert.ok(metrics.titleLines <= 2, 'desktop: title does not wrap vertically');
    assert.equal(metrics.columns, 2, 'desktop: operations and security use two columns');
    assert.equal(metrics.securityPosition, 'sticky', 'desktop: security remains reachable');
  } else {
    assert.equal(metrics.columns, 1, 'mobile: one reading column');
    assert.equal(metrics.securityPosition, 'static', 'mobile: security follows content flow');
  }

  assert.deepEqual(errors, [], `${name}: no browser errors`);
  await page.locator('.admin-hub').screenshot({ path: `${outputDir}/admin-${name}.png` });
  await page.locator('.admin-security').screenshot({ path: `${outputDir}/admin-${name}-security.png` });
  await page.locator('.admin-security-disclosure').evaluate(element => { element.open = true; });
  const inputHeights = await page.locator('.admin-security-form input').evaluateAll(elements => (
    elements.map(element => element.getBoundingClientRect().height)
  ));
  assert.ok(inputHeights.every(height => height >= 44), `${name}: expanded password fields meet touch target`);
  await page.locator('.admin-security').screenshot({ path: `${outputDir}/admin-${name}-security-expanded.png` });
  await context.close();
  return metrics;
}

async function inspectGate(browser, name, viewport) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport });
  const page = await context.newPage();
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => errors.push(`page: ${error.message}`));
  await page.goto(`${baseUrl}/admin/__visual-preview?surface=gate`, { waitUntil: 'networkidle' });
  await page.locator('.admin-access-card').waitFor({ state: 'visible', timeout: 10_000 });
  assert.equal(await page.locator('input[type="password"]').count(), 1, `${name}: one gate password field`);
  assert.equal(await page.locator('.admin-operation-card').count(), 0, `${name}: dashboard stays hidden`);
  const metrics = await page.evaluate(() => ({
    cardWidth: document.querySelector('.admin-access-card').getBoundingClientRect().width,
    horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    submitHeight: document.querySelector('.admin-access-submit').getBoundingClientRect().height,
  }));
  assert.ok(metrics.horizontalOverflow <= 1, `${name}: gate has no horizontal overflow`);
  assert.ok(metrics.submitHeight >= 44, `${name}: gate submit meets touch target`);
  assert.ok(metrics.cardWidth <= 520, `${name}: gate remains a focused surface`);
  assert.deepEqual(errors, [], `${name}: gate has no browser errors`);
  await page.locator('.admin-access-card').screenshot({ path: `${outputDir}/admin-${name}-gate.png` });
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
  const desktopGate = await inspectGate(browser, 'desktop', { width: 1440, height: 1000 });
  const mobileGate = await inspectGate(browser, 'mobile', { width: 390, height: 844 });
  console.log(JSON.stringify({ desktop, desktopGate, mobile, mobileGate, screenshots: outputDir }, null, 2));
} finally {
  await browser?.close();
  server.kill('SIGTERM');
}
