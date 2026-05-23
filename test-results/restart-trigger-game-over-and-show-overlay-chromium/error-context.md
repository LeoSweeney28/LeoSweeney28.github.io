# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: restart.spec.js >> trigger game over and show overlay
- Location: tests\restart.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
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
    51 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="small muted">Cursor Style</div> from <div id="start" class="overlay">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - heading "Mouse Dodge" [level=1] [ref=e3]
    - paragraph [ref=e4]: Move your mouse to control the blue circle. Avoid the red enemies. Click to start/restart.
    - generic [ref=e5]: "Tip: static obstacles stay longer but are easier to avoid."
    - generic [ref=e6]: "Score: 0"
    - generic [ref=e7]: "Multiplier: x1"
    - generic [ref=e8]: "Time: 0.0s"
    - generic [ref=e9]: "Best: 0"
  - generic [ref=e11]: "Difficulty Stage: 1"
  - generic [ref=e14]:
    - heading "Mouse Dodge" [level=2] [ref=e15]
    - paragraph [ref=e16]: Dodge enemies with your mouse. Survive as long as possible.
    - generic [ref=e17]:
      - button "Easy" [ref=e18] [cursor=pointer]
      - button "Normal" [ref=e19] [cursor=pointer]
      - button "Hard" [ref=e20] [cursor=pointer]
    - generic [ref=e22]:
      - generic [ref=e23]: Cursor Style
      - generic [ref=e24]:
        - button "Circle" [ref=e25] [cursor=pointer]
        - button "Square" [ref=e26] [cursor=pointer]
      - generic [ref=e27]:
        - checkbox "Smaller cursor (-10%)" [checked] [ref=e28]
        - text: Smaller cursor (-10%)
    - generic [ref=e30]:
      - button "Start Game" [ref=e31] [cursor=pointer]
      - button "Tutorial Showcase" [ref=e32] [cursor=pointer]
      - button "Settings" [ref=e33] [cursor=pointer]
  - generic [ref=e34]:
    - button "Force Boss" [ref=e35] [cursor=pointer]
    - button "Advance Stage" [ref=e36] [cursor=pointer]
    - button "Spawn Enemy" [ref=e37] [cursor=pointer]
    - button "Spawn Obstacle" [ref=e38] [cursor=pointer]
    - button "Game Over" [ref=e39] [cursor=pointer]
    - button "Toggle Sandbox" [ref=e40] [cursor=pointer]
```

# Test source

```ts
  1  | const { test, expect } = require('@playwright/test');
  2  | 
  3  | test('trigger game over and show overlay', async ({ page }) => {
  4  |   await page.goto('http://localhost:8080/');
  5  |   await page.waitForSelector('canvas#game', { timeout: 5000 });
> 6  |   await page.click('canvas#game');
     |              ^ Error: page.click: Test timeout of 30000ms exceeded.
  7  |   // force game over
  8  |   await page.evaluate(() => window.__TEST_API__.triggerGameOver());
  9  |   // wait for running to be false
  10 |   await page.waitForFunction(() => window.__TEST_HOOK__ && window.__TEST_HOOK__.elapsed !== undefined && window.__TEST_HOOK__ && window.__TEST_HOOK__.stage >= 1 && window.__TEST_HOOK__ && (window.__TEST_HOOK__.enemies !== undefined), { timeout: 2000 });
  11 |   // overlay should be visible (overlay element present and not hidden)
  12 |   const overlayVisible = await page.$eval('#overlay', el => !el.classList.contains('hidden'));
  13 |   expect(overlayVisible).toBe(true);
  14 | });
  15 | 
```