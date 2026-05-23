const { test, expect } = require('@playwright/test');

test('trigger game over and show overlay', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await page.waitForSelector('canvas#game', { timeout: 5000 });
  await page.click('canvas#game');
  // force game over
  await page.evaluate(() => window.__TEST_API__.triggerGameOver());
  // wait for running to be false
  await page.waitForFunction(() => window.__TEST_HOOK__ && window.__TEST_HOOK__.elapsed !== undefined && window.__TEST_HOOK__ && window.__TEST_HOOK__.stage >= 1 && window.__TEST_HOOK__ && (window.__TEST_HOOK__.enemies !== undefined), { timeout: 2000 });
  // overlay should be visible (overlay element present and not hidden)
  const overlayVisible = await page.$eval('#overlay', el => !el.classList.contains('hidden'));
  expect(overlayVisible).toBe(true);
});
