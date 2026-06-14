import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const DEFAULT_PORT = 4188;
const BASE_URL = process.env.SCREEN_QA_URL || `http://127.0.0.1:${DEFAULT_PORT}`;
const SHOULD_START_SERVER = !process.env.SCREEN_QA_URL;
const ROUTES = ['/', '/works/novels', '/media/interviews', '/questions', '/login'];
const VIEWPORTS = [
  { name: 'desktop', width: 1366, height: 900, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];
const MODES = ['console', 'reading'];
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await wait(350);
  }
  throw new Error(`Screen QA server did not respond at ${url}`);
}

function startDevServer() {
  const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmBin, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(DEFAULT_PORT)], {
    env: { ...process.env, BROWSER: 'none' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', chunk => {
    if (process.env.SCREEN_QA_VERBOSE) process.stdout.write(chunk);
  });
  child.stderr.on('data', chunk => {
    if (process.env.SCREEN_QA_VERBOSE) process.stderr.write(chunk);
  });

  return child;
}

async function runScreenQa() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    throw new Error(`Playwright is required for screen QA. Install it with npm install -D playwright. ${error.message}`);
  }

  const launchOptions = {
    headless: true,
    ...(existsSync(CHROME_PATH) ? { executablePath: CHROME_PATH } : {}),
  };
  const browser = await playwright.chromium.launch(launchOptions);
  const results = [];

  for (const viewport of VIEWPORTS) {
    for (const mode of MODES) {
      for (const route of ROUTES) {
        const page = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
          isMobile: viewport.isMobile,
        });
        const entry = { route, viewport: viewport.name, mode, issues: [] };

        try {
          await page.addInitScript(({ mode: initialMode }) => {
            localStorage.setItem('sf-site-mode', initialMode);
            if (window.innerWidth <= 760) localStorage.removeItem('sf-view-mode');
            else localStorage.setItem('sf-view-mode', 'desktop');
          }, { mode });
          await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
          await page.waitForTimeout(1500);
          entry.issues = await page.evaluate(({ contrastThreshold }) => {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const issues = [];
            const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);

            if (scrollWidth > viewportWidth + 3) {
              issues.push({ type: 'page-overflow', detail: `${scrollWidth}px > ${viewportWidth}px` });
            }

            const isVisible = element => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return rect.width > 3
                && rect.height > 3
                && style.visibility !== 'hidden'
                && style.display !== 'none'
                && Number(style.opacity) > 0.03
                && rect.bottom > 0
                && rect.top < viewportHeight;
            };

            const clippedSelectors = 'button, input, textarea, select, [role="button"], .questions-filter, .media-archive-tabs, .works-full-tabs';
            [...document.querySelectorAll(clippedSelectors)]
              .filter(isVisible)
              .forEach(element => {
                const rect = element.getBoundingClientRect();
                if (rect.left < -4 || rect.right > viewportWidth + 4) {
                  issues.push({
                    type: 'element-clipped',
                    label: (element.innerText || element.getAttribute('aria-label') || element.className || element.tagName)
                      .toString()
                      .trim()
                      .replace(/\s+/g, ' ')
                      .slice(0, 80),
                    detail: `left ${Math.round(rect.left)}, right ${Math.round(rect.right)}`,
                  });
                }
              });

            const parseColor = value => {
              const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
              if (!match) return null;
              const alpha = match[4] == null ? 1 : Number(match[4]);
              if (alpha < 0.82) return null;
              return [Number(match[1]), Number(match[2]), Number(match[3])];
            };
            const luminance = rgb => rgb
              .map(value => {
                const channel = value / 255;
                return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
              })
              .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
            const contrast = (foreground, background) => {
              const a = luminance(foreground);
              const b = luminance(background);
              return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            };

            const textSelectors = 'button, label, p, span, strong, h1, h2, h3, input, textarea, select';
            for (const element of [...document.querySelectorAll(textSelectors)].filter(isVisible)) {
              const text = (element.innerText || element.value || element.placeholder || element.getAttribute('aria-label') || '')
                .trim()
                .replace(/\s+/g, ' ');
              if (text.length < 2) continue;
              const foreground = parseColor(getComputedStyle(element).color);
              if (!foreground) continue;

              let current = element;
              let background = null;
              for (let depth = 0; depth < 5 && current; depth += 1) {
                const color = parseColor(getComputedStyle(current).backgroundColor);
                if (color) {
                  background = color;
                  break;
                }
                current = current.parentElement;
              }
              if (!background) continue;

              const ratio = contrast(foreground, background);
              if (ratio < contrastThreshold) {
                issues.push({
                  type: 'low-contrast',
                  label: text.slice(0, 70),
                  detail: `ratio ${ratio.toFixed(2)}`,
                });
                break;
              }
            }

            return issues;
          }, { contrastThreshold: 2.6 });
        } catch (error) {
          entry.issues.push({ type: 'load-error', detail: error.message });
        } finally {
          await page.close();
        }

        results.push(entry);
      }
    }
  }

  await browser.close();
  return results;
}

let server;
try {
  if (SHOULD_START_SERVER) {
    server = startDevServer();
    await waitForServer(BASE_URL);
  }

  const results = await runScreenQa();
  const failures = results.filter(result => result.issues.length > 0);

  if (failures.length > 0) {
    console.error(JSON.stringify({ checked: results.length, failures }, null, 2));
    process.exitCode = 1;
  } else {
    console.log(`Screen QA passed (${results.length} route/view/mode checks).`);
  }
} finally {
  if (server) {
    server.kill('SIGTERM');
    await wait(250);
    if (!server.killed) server.kill('SIGKILL');
  }
}
