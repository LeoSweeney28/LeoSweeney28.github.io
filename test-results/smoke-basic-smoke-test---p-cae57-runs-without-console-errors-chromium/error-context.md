# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: smoke.spec.js >> basic smoke test - page loads and runs without console errors
- Location: tests\smoke.spec.js:3:1

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
    43 × waiting for element to be visible, enabled and stable
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
  3  | test('basic smoke test - page loads and runs without console errors', async ({ page }) => {
  4  |   const errors = [];
  5  |   page.on('console', msg => {
  6  |     if (msg.type() === 'error') errors.push(msg.text());
  7  |   });
  8  |   await page.goto('http://localhost:8080/');
  9  |   await page.waitForSelector('canvas#game', { timeout: 5000 });
> 10 |   await page.click('canvas#game');
     |              ^ Error: page.click: Target crashed 
  11 |   await page.mouse.move(300, 300);
  12 |   await page.waitForTimeout(2000);
  13 |   expect(errors).toEqual([]);
  14 | });
  15 | 
```