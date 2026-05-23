# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: spawn.spec.js >> scheduling a spawn creates a telegraph/enemy
- Location: tests\spawn.spec.js:3:1

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
    34 × waiting for element to be visible, enabled and stable
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
  3  | test('scheduling a spawn creates a telegraph/enemy', async ({ page }) => {
  4  |   await page.goto('http://localhost:8080/');
  5  |   await page.waitForSelector('canvas#game', { timeout: 5000 });
> 6  |   await page.click('canvas#game');
     |              ^ Error: page.click: Target crashed 
  7  |   // schedule a telegraph/spawn
  8  |   await page.evaluate(() => window.__TEST_API__.scheduleSpawn());
  9  |   // telegraphs may appear first; wait for telegraphs or enemies
  10 |   await page.waitForFunction(() => window.__TEST_HOOK__ && (window.__TEST_HOOK__.telegraphs > 0 || window.__TEST_HOOK__.enemies > 0), { timeout: 4000 });
  11 |   const tele = await page.evaluate(() => window.__TEST_HOOK__.telegraphs);
  12 |   const enemies = await page.evaluate(() => window.__TEST_HOOK__.enemies);
  13 |   expect(tele + enemies).toBeGreaterThan(0);
  14 | });
  15 | 
```