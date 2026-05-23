Mouse Dodge — simple browser 2D game

How to run

- Open `index.html` in your browser (double-click or use "Open File...").

Controls

- Move your mouse to control the blue player circle.
- Click anywhere to start or restart the game.

Notes

- Score increases each time an enemy leaves the screen.
- Difficulty increases over time: enemies spawn faster and move quicker.
- Best score is saved to `localStorage` in your browser.

Project structure

- `game.js` is the bootstrap entry point.
- `src/core/` holds shared config and utility helpers.
- `src/systems/` holds gameplay tables and subsystem-specific logic.
- Add new mechanics by extending the matching subsystem instead of growing `game.js`.

Recent fixes (automated sweep)
-----------------------------
- Guarded DOM writes and canvas usage to prevent runtime exceptions when elements are missing.
- Preserved `state` array references on restart (use `length = 0`) to avoid stale references.
- Defensive checks before pushing factory results into `state.enemies` / `state.obstacleTelegraphs`.
- Fixed telegraph enemy creation to reflect runtime `type` changes and initialize charger vectors.
- Improved boss scheduling so bosses wait for the arena to clear (uses `bossPending`), and added a forced-start option when appropriate.

Quick test checklist
--------------------
1. Open `index.html` in a browser and open DevTools Console.
2. Start the game and play a few rounds; watch for console errors.
3. Verify HUD updates, telegraphed enemies/obstacles spawn, boss stages behave as described above.

If you find issues, paste console output here and I'll patch them.
