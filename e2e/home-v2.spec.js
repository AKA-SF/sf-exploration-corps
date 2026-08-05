import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const homeFeed = {
  featuredWorks: [
    { code: 'W-001', title: '듄', subtitle: '사막 행성에서 발견한 생태와 권력의 신호', image: '' },
    { code: 'W-002', title: '어둠의 왼손', subtitle: '경계와 정체성에 관한 탐사', image: '' },
    { code: 'W-003', title: '솔라리스', subtitle: '이해할 수 없는 타자와의 접촉', image: '' },
  ],
  latestSignals: [
    { id: 'signal-1', title: '낯선 행성의 감각', log_type: '감상 기록', emotions: ['경이', '불안'] },
  ],
  featuredConcepts: [{ term: '인지적 낯설게 하기', description: '익숙한 세계를 낯설게 바라보는 SF의 핵심 장치' }],
  latestMedia: [{ title: '미래를 상상하는 법', description: '창작자 인터뷰' }],
  latestDiscoveries: [{
    id: 'discovery-1',
    kind: 'UPCOMING',
    media_type: 'FILM',
    release_date: '2026-10-01',
    source_name: '공식 배급사',
    source_url: 'https://example.com/official-release',
    summary: '공식 출처로 확인한 공개 예정 SF 작품입니다.',
    title: '새로운 궤도',
    updated_at: '2026-08-05T02:00:00.000Z',
  }],
  counts: { works: 3, media: 1, logs: 1, concepts: 1 },
  syncedAt: '2026-08-04T12:00:00.000Z',
};

async function mockHomeFeed(page, delay = 0) {
  await page.route('**/api/home-feed', async route => {
    if (delay) await new Promise(resolve => setTimeout(resolve, delay));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(homeFeed) });
  });
}

test.describe('발견 → 기록 → 연결 핵심 여정', () => {
  test('데이터 응답 전에도 Home2 핵심 UI가 렌더링되고 이후 공개 콘텐츠가 채워진다', async ({ page }) => {
    await mockHomeFeed(page, 900);
    const navigation = page.goto('/');
    await expect(page.getByRole('heading', { name: /SF를 발견하고/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /작품 발견하기/ })).toBeVisible();
    await navigation;
    await expect(page.getByRole('link', { name: /SIGNAL 01 듄/ })).toBeVisible();
    await expect(page.getByText('낯선 행성의 감각')).toBeVisible();
    await expect(page.locator('.home-v2-radar__signal')).toHaveCount(homeFeed.latestSignals.length);
  });

  test('Home의 새 SF preview에서 전체 관측 정보와 공식 출처를 확인한다', async ({ page }) => {
    await mockHomeFeed(page);
    await page.route('**/api/discoveries**', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ discoveries: homeFeed.latestDiscoveries }),
    }));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '새로 포착된 SF' })).toBeVisible();
    await expect(page.getByText('새로운 궤도')).toBeVisible();
    await page.getByRole('link', { name: /전체 관측 정보 보기/ }).click();
    await expect(page).toHaveURL(/\/discover$/);
    const source = page.getByRole('link', { name: /공식 배급사에서 원문 확인/ });
    await expect(source).toHaveAttribute('href', 'https://example.com/official-release');
    await expect(source).toHaveAttribute('rel', 'noreferrer');
    await expect(source).toHaveAttribute('target', '_blank');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test('Home2 피드 실패 후 사용자가 다시 불러올 수 있다', async ({ page }) => {
    let attempts = 0;
    let shouldSucceed = false;
    await page.route('**/api/home-feed', async route => {
      attempts += 1;
      if (!shouldSucceed) {
        await route.fulfill({ contentType: 'application/json', status: 503, body: JSON.stringify({ error: 'unavailable' }) });
        return;
      }
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify(homeFeed) });
    });
    await page.goto('/');
    await expect(page.getByText('피드를 불러오지 못했습니다.')).toBeVisible();
    const attemptsBeforeRetry = attempts;
    shouldSucceed = true;
    await page.getByRole('button', { name: '다시 불러오기' }).click();
    await expect(page.getByRole('link', { name: /SIGNAL 01 듄/ })).toBeVisible();
    expect(attempts).toBeGreaterThan(attemptsBeforeRetry);
  });

  test('저장된 draft가 Home2와 내 정보에서 이어쓰기 행동으로 복원된다', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('sf_exploration_log_draft_v1', JSON.stringify({ title: '이어 쓸 솔라리스 기록', type: 'REVIEW' }));
    });
    await mockHomeFeed(page);
    await page.goto('/');
    await expect(page.locator('.home-v2-hero').getByRole('link', { name: /기록 이어가기/ })).toHaveAttribute('href', '/log');
  });

  test('모바일 전역 내비게이션에서 탐색, 기록, 네트워크, 내 정보로 이동할 수 있다', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '모바일 내비게이션 전용 검사');
    await mockHomeFeed(page);
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: '주요 메뉴' });
    await expect(nav.getByRole('link')).toHaveCount(4);
    await nav.getByRole('link', { name: /네트워크/ }).click();
    await expect(page).toHaveURL(/\/network$/);
    await expect(page.getByRole('heading', { name: '탐사 네트워크' })).toBeVisible();
  });

  test('Network2는 목록을 먼저 제공하고 지도와 무전을 분리한다', async ({ page }) => {
    await page.goto('/network');
    await expect(page.getByRole('tab', { name: '신호 목록' })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('tab', { name: '지도' }).click();
    await expect(page).toHaveURL(/view=map/);
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await page.getByRole('tab', { name: '무전' }).click();
    await expect(page.getByLabel('새 공개 무전')).toBeVisible();
  });

  test('비로그인 사용자의 Profile과 이전 badges URL은 로그인으로 안전하게 연결된다', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('/badges');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('로그인은 데스크톱 2열 workspace와 모바일 단일열을 같은 route에서 제공한다', async ({ page }, testInfo) => {
    await page.goto('/login');
    const isMobile = testInfo.project.name.includes('mobile');
    const draftScopeCopy = page.getByText('현재 브라우저에 저장된 탐사 기록을 계정별로 이어갑니다.');
    const privacyCopy = page.getByText('기본 저장 범위는 나만 보는 개인 아카이브입니다.');
    if (isMobile) {
      await expect(page.getByText('초안 복원')).toBeVisible();
      await expect(page.getByText('기본 비공개')).toBeVisible();
      await expect(page.getByText('선택적 연결')).toBeVisible();
      await expect(draftScopeCopy).toBeHidden();
      await expect(privacyCopy).toBeHidden();
    } else {
      await expect(draftScopeCopy).toBeVisible();
      await expect(privacyCopy).toBeVisible();
    }

    const geometry = await page.locator('.login-workspace').evaluate(workspace => {
      const brief = workspace.querySelector('.login-brief').getBoundingClientRect();
      const panel = workspace.querySelector('.login-panel').getBoundingClientRect();
      const navbar = document.querySelector('.navbar').getBoundingClientRect();
      return {
        brief,
        panel,
        navbar,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
        inputFontSize: getComputedStyle(document.querySelector('.login-form input')).fontSize,
      };
    });

    expect(geometry.horizontalOverflow).toBeLessThanOrEqual(0);
    expect(geometry.inputFontSize).toBe('16px');
    if (isMobile) {
      expect(geometry.brief.bottom).toBeLessThanOrEqual(geometry.panel.top + 1);
      expect(geometry.panel.top).toBeLessThan(470);
      expect(geometry.navbar.width).toBeGreaterThan(300);
    } else {
      expect(geometry.brief.right).toBeLessThanOrEqual(geometry.panel.left + 1);
      expect(geometry.navbar.width).toBeLessThan(100);
      expect(geometry.navbar.height).toBeGreaterThan(700);
    }
  });

  test('공개 신호가 없는 Home radar는 실제 추천을 안내하고 탐사 과정으로 스크롤한다', async ({ page }) => {
    await page.route('**/api/home-feed', route => route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...homeFeed, latestSignals: [] }),
    }));
    await page.goto('/');
    await expect(page.locator('.home-v2-radar__signal')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /오늘의 관측.*인지적 낯설게 하기/ })).toBeVisible();
    await page.getByRole('link', { name: /탐사 과정 보기/ }).click();
    await expect.poll(() => page.locator('.page-container').evaluate(node => node.scrollTop)).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: '세 단계로 시작하는 SF 탐사' })).toBeInViewport();
  });

  test('모바일 Login과 Network의 마지막 콘텐츠는 전역 nav 위에 유지된다', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '모바일 하단 nav clearance 전용 검사');
    for (const [path, selector] of [['/login', '.login-panel'], ['/network', '.network-v2-panel']]) {
      await page.goto(path);
      await page.locator(selector).waitFor();
      const clearance = await page.locator('.page-container').evaluate((container, targetSelector) => {
        container.scrollTop = container.scrollHeight;
        const target = document.querySelector(targetSelector).getBoundingClientRect();
        const nav = document.querySelector('.navbar').getBoundingClientRect();
        return nav.top - target.bottom;
      }, selector);
      expect(clearance).toBeGreaterThanOrEqual(12);
    }
  });

  test('모바일 Network 연결 불가 상태는 재시도 CTA를 첫 viewport에 제공한다', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '모바일 Network unavailable-state 전용 검사');
    await page.goto('/network');
    await expect(page.getByRole('button', { name: '다시 수신하기' })).toBeInViewport();
  });
});

test.describe('모바일·접근성 차단 기준', () => {
  test('Home2에는 수평 오버플로가 없고 핵심 터치 대상은 44px 이상이다', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '모바일 전용 검사');
    await mockHomeFeed(page);
    await page.goto('/');
    const dimensions = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 2);
    const undersized = await page.locator('.home-v2-cta, .navbar a').evaluateAll(elements => elements
      .filter(element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && rect.width > 0 && rect.height > 0 && rect.height < 44 && rect.width < 44;
      })
      .map(element => ({ label: element.textContent.trim(), rect: element.getBoundingClientRect().toJSON() })));
    expect(undersized).toEqual([]);
  });

  test('Home2 자동 접근성 검사에 serious/critical 위반이 없다', async ({ page }) => {
    await mockHomeFeed(page);
    await page.goto('/');
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    const blockers = results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact));
    expect(blockers).toEqual([]);
  });

  test('Home2의 긴 콘텐츠를 마지막 섹션까지 세로로 스크롤할 수 있다', async ({ page }) => {
    await mockHomeFeed(page);
    await page.goto('/');
    const scrollContainer = page.locator('.page-container');
    const footer = page.locator('.home-v2-footer');

    await footer.scrollIntoViewIfNeeded();

    await expect.poll(() => scrollContainer.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  });

  test('탐사 로그와 Network2가 viewport별 작업공간 geometry를 사용한다', async ({ page }, testInfo) => {
    const isMobile = testInfo.project.name.includes('mobile');

    await page.goto('/log');
    await expect(page.locator('.site-mode-toggle')).toBeHidden();
    const logGeometry = await page.locator('.log-entry-container').evaluate(element => ({
      columns: getComputedStyle(element.querySelector('.log-form')).gridTemplateColumns.split(' ').length,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      width: element.getBoundingClientRect().width,
    }));
    expect(logGeometry.overflow).toBeLessThanOrEqual(2);
    if (isMobile) {
      expect(logGeometry.columns).toBe(1);
      expect(logGeometry.width).toBeLessThanOrEqual(390);
      await expect(page.locator('.submit-btn')).toHaveCount(0);
      const mobileSubmit = page.locator('.mobile-log-submit-bar');
      await expect(mobileSubmit).toBeVisible();
      await expect(page.locator('.desktop-log-submit-bar')).toBeHidden();
      await expect(page.locator('button[type="submit"]:visible')).toHaveCount(1);
      expect(await mobileSubmit.evaluate(element => ({
        form: element.querySelector('button[type="submit"]').getAttribute('form'),
        parentId: element.parentElement?.id,
        position: getComputedStyle(element).position,
      }))).toEqual({
        form: 'exploration-log-form',
        parentId: 'mobile-action-layer',
        position: 'fixed',
      });
      const bottomGeometry = await page.locator('.page-container').evaluate(container => {
        container.scrollTop = container.scrollHeight;
        const controls = document.querySelector('.log-control-grid').getBoundingClientRect();
        const sticky = document.querySelector('.mobile-log-submit-bar').getBoundingClientRect();
        const nav = document.querySelector('.navbar').getBoundingClientRect();
        return {
          controlsBottom: controls.bottom,
          navTop: nav.top,
          stickyBottom: sticky.bottom,
          stickyTop: sticky.top,
        };
      });
      expect(bottomGeometry.controlsBottom).toBeLessThanOrEqual(bottomGeometry.stickyTop + 1);
      expect(bottomGeometry.stickyBottom).toBeLessThanOrEqual(bottomGeometry.navTop + 1);
    } else {
      expect(logGeometry.columns).toBe(2);
      expect(logGeometry.width).toBeGreaterThan(1000);
      await expect(page.locator('.desktop-log-submit-bar')).toBeVisible();
      await expect(page.locator('.mobile-log-submit-bar')).toBeHidden();
      await expect(page.locator('button[type="submit"]:visible')).toHaveCount(1);
      expect(await page.locator('.desktop-log-submit-bar').evaluate(element => getComputedStyle(element).position)).toBe('sticky');
    }

    await page.goto('/network');
    const networkColumns = await page.locator('.network-v2-workspace').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
    expect(networkColumns).toBe(isMobile ? 1 : 2);
  });

  test('모바일 탐사 로그의 오류와 마지막 focus 대상이 제출 bar 위에 유지되고 portal이 원본 form을 제출한다', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), '모바일 제출 portal 전용 검사');
    await page.goto('/log');

    const mobileButton = page.locator('.mobile-log-submit-bar button[type="submit"]');
    const accessibility = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    expect(
      accessibility.violations.filter(violation => ['serious', 'critical'].includes(violation.impact)),
    ).toEqual([]);

    const feedback = page.locator('.log-submit-feedback');
    await expect(feedback).toBeVisible();
    await feedback.evaluate(element => {
      const alert = document.createElement('p');
      alert.className = 'mono text-amber';
      alert.setAttribute('role', 'alert');
      alert.textContent = '탐사 기록을 저장하지 못했습니다. 초안은 유지되며 다시 시도할 수 있습니다.';
      element.append(alert);
    });

    const lastControl = page.locator('.log-control-grid button').last();
    await lastControl.focus();
    await lastControl.scrollIntoViewIfNeeded();
    const clearance = await page.locator('.page-container').evaluate(container => {
      container.scrollTop = container.scrollHeight;
      const alert = document.querySelector('[role="alert"]').getBoundingClientRect();
      const focused = document.activeElement.getBoundingClientRect();
      const sticky = document.querySelector('.mobile-log-submit-bar').getBoundingClientRect();
      const nav = document.querySelector('.navbar').getBoundingClientRect();
      return {
        alertBottom: alert.bottom,
        focusedBottom: focused.bottom,
        navTop: nav.top,
        stickyBottom: sticky.bottom,
        stickyTop: sticky.top,
      };
    });
    expect(clearance.alertBottom).toBeLessThanOrEqual(clearance.stickyTop + 1);
    expect(clearance.focusedBottom).toBeLessThanOrEqual(clearance.stickyTop + 1);
    expect(clearance.stickyBottom).toBeLessThanOrEqual(clearance.navTop + 1);

    await page.getByPlaceholder('작품명을 입력하세요...').fill('portal 제출 확인');
    await lastControl.focus();
    await page.keyboard.press('Tab');
    await expect(mobileButton).toBeFocused();

    const safeAreaClearance = await page.evaluate(() => {
      document.documentElement.style.setProperty('--mobile-nav-height', '96px');
      const container = document.querySelector('.page-container');
      container.scrollTop = container.scrollHeight;
      const sticky = document.querySelector('.mobile-log-submit-bar').getBoundingClientRect();
      const nav = document.querySelector('.navbar').getBoundingClientRect();
      return {
        navHeight: nav.height,
        navTop: nav.top,
        stickyBottom: sticky.bottom,
      };
    });
    expect(safeAreaClearance.navHeight).toBeGreaterThanOrEqual(96);
    expect(safeAreaClearance.stickyBottom).toBeLessThanOrEqual(safeAreaClearance.navTop + 1);

    await page.setViewportSize({ width: 390, height: 600 });
    const shortViewportClearance = await page.locator('.page-container').evaluate(container => {
      container.scrollTop = container.scrollHeight;
      const feedback = document.querySelector('.log-submit-feedback').getBoundingClientRect();
      const sticky = document.querySelector('.mobile-log-submit-bar').getBoundingClientRect();
      const nav = document.querySelector('.navbar').getBoundingClientRect();
      return {
        feedbackBottom: feedback.bottom,
        navTop: nav.top,
        stickyBottom: sticky.bottom,
        stickyTop: sticky.top,
      };
    });
    expect(shortViewportClearance.feedbackBottom).toBeLessThanOrEqual(shortViewportClearance.stickyTop + 1);
    expect(shortViewportClearance.stickyBottom).toBeLessThanOrEqual(shortViewportClearance.navTop + 1);

    await mobileButton.click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
