# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: boss.spec.js >> force boss appears when requested
- Location: tests\boss.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Target crashed 
Call log:
  - waiting for locator('canvas#game')
    - locator resolved to <canvas id="game" width="1280" height="720"></canvas>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="small muted">Cursor Style</div> from <div id="start" class="overlay">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="small muted">Cursor Style</div> from <div id="start" class="overlay">…</div> subtree intercepts pointer events
    - retrying click action
      - waiting 100ms
    16 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="small muted">Cursor Style</div> from <div id="start" class="overlay">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test('force boss appears when requested', async ({ page }) => {
  4  |   await page.goto('http://localhost:8080/');
  5  |   await page.waitForSelector('canvas#game', { timeout: 5000 });
> 6  |   await page.click('canvas#game');
     |              ^ Error: page.click: Target crashed 
  7  |   // request a forced boss via exposed test API
  8  |   await page.evaluate(() => window.__TEST_API__.forceBoss());
  9  |   // wait for bossActive to become true
  10 |   await page.waitForFunction(() => window.__TEST_HOOK__ && window.__TEST_HOOK__.bossActive === true, { timeout: 5000 });
  11 |   const bossActive = await page.evaluate(() => !!(window.__TEST_HOOK__ && window.__TEST_HOOK__.bossActive));
  12 |   expect(bossActive).toBe(true);
  13 | });
  14 | 
```