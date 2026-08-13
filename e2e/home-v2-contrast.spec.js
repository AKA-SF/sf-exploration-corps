import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

function relativeLuminance(rgb) {
  const channels = rgb.match(/[\d.]+/g).slice(0, 3).map(value => Number(value) / 255);
  const linear = channels.map(value => (value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test('첫 작품 발견하기 CTA는 WCAG AA 대비와 focus-visible 표시를 유지한다', async ({ page }) => {
  await page.goto('/');
  const cta = page.getByRole('link', { name: /첫 작품 발견하기/ });
  await expect(cta).toBeVisible();

  const colors = await cta.evaluate(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, foreground: style.color };
  });
  expect(contrastRatio(colors.foreground, colors.background), colors).toBeGreaterThanOrEqual(4.5);

  const accessibility = await new AxeBuilder({ page })
    .include('.home-v2-button--primary')
    .withRules(['color-contrast'])
    .analyze();
  expect(accessibility.violations.filter(violation => (
    violation.impact === 'serious' || violation.impact === 'critical'
  ))).toEqual([]);

  await cta.focus();
  const focusStyle = await cta.evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  expect(focusStyle.outlineStyle).not.toBe('none');
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThan(0);
});
