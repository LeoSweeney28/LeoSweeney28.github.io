const { test, expect } = require('@playwright/test');

test('force boss appears when requested', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await page.waitForSelector('canvas#game', { timeout: 5000 });
  await page.click('canvas#game');
  // request a forced boss via exposed test API
  await page.evaluate(() => window.__TEST_API__.forceBoss());
  // wait for bossActive to become true
  await page.waitForFunction(() => window.__TEST_HOOK__ && window.__TEST_HOOK__.bossActive === true, { timeout: 5000 });
  const bossActive = await page.evaluate(() => !!(window.__TEST_HOOK__ && window.__TEST_HOOK__.bossActive));
  expect(bossActive).toBe(true);
});
