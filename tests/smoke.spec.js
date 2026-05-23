const { test, expect } = require('@playwright/test');

test('basic smoke test - page loads and runs without console errors', async ({ page }) => {
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.goto('http://localhost:8080/');
  await page.waitForSelector('canvas#game', { timeout: 5000 });
  await page.click('canvas#game');
  await page.mouse.move(300, 300);
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
});
