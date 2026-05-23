const { test, expect } = require('@playwright/test');

test('scheduling a spawn creates a telegraph/enemy', async ({ page }) => {
  await page.goto('http://localhost:8080/');
  await page.waitForSelector('canvas#game', { timeout: 5000 });
  await page.click('canvas#game');
  // schedule a telegraph/spawn
  await page.evaluate(() => window.__TEST_API__.scheduleSpawn());
  // telegraphs may appear first; wait for telegraphs or enemies
  await page.waitForFunction(() => window.__TEST_HOOK__ && (window.__TEST_HOOK__.telegraphs > 0 || window.__TEST_HOOK__.enemies > 0), { timeout: 4000 });
  const tele = await page.evaluate(() => window.__TEST_HOOK__.telegraphs);
  const enemies = await page.evaluate(() => window.__TEST_HOOK__.enemies);
  expect(tele + enemies).toBeGreaterThan(0);
});
