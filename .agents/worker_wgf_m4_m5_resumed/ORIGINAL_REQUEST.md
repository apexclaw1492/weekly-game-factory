## 2026-07-11T16:56:39Z

Your identity: WGF M4/M5 Resumed Worker.
Your working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_m5_resumed
Objective:
Finish Milestone 4 (rebuilding all 4 legacy games in 3D) and Milestone 5 (touch simulation testing) since the rate limits have cleared.

Tasks:
1. Review existing 2048, Clumsy Bird, Hextris scenes in `src/scenes/` (`TwoZeroFourEightScene.ts`, `ClumsyBirdScene.ts`, `HextrisScene.ts`). They are mostly implemented.
2. Register `HextrisScene` in `src/data/gameCatalog.ts`:
   - Import `HextrisScene` from `../scenes/HextrisScene`.
   - Update the `hextris` catalog definition: remove `url`, add `sceneKey: 'HextrisScene'`, `sceneClass: HextrisScene`, and set status/label to `'certified'` / `'CERTIFIED TOUCH'`. Set color to `0x00c805`.
3. Implement `src/scenes/PacManScene.ts` as a native Phaser/Three.js hybrid 3D scene:
   - Overlay Three.js renderer's canvas on top of the Phaser container.
   - Render maze walls as glowing 3D neon-green structures and ghosts as low-poly 3D models.
   - Implement movement grid alignment, ghost AI pathfinding, dots, and power pellets.
   - Apply the Robinhood visual theme (solid black background, Outfit typography, neon-green highlights).
   - Consume input from `ArcadeInputFrame` (drag vectors or swipe directions) to steer Pac-Man.
   - Expose `getGameplayStateForQA()` accurately.
   - Implement the `GameLifecycle` interface, using `src/utils/StandardOverlays.ts` for Pause, Game-Over, and Victory screens.
   - Clean up all Three.js resources in `shutdown` and `destroy` to prevent memory leaks.
4. Register `PacManScene` in `src/data/gameCatalog.ts`:
   - Import `PacManScene` from `../scenes/PacManScene`.
   - Update the `pac-man` catalog definition: remove `url`, add `sceneKey: 'PacManScene'`, `sceneClass: PacManScene`, set status/label to `'certified'` / `'CERTIFIED TOUCH'`, and color to `0x00c805`.
5. Create Playwright/Puppeteer touch-simulation test scripts in `scratch/`:
   - Write `run-touch-2048.js`, `run-touch-clumsy.js`, `run-touch-hextris.js`, and `run-touch-pacman.js` simulating touches/swipes to verify player movements, actions, score increases, and return-to-hub.
   - Update `package.json` to include these 4 tests in the `touch:all` script.
6. Verify:
   - Run `npm run build` to verify clean compilation.
   - Run `npm run smoke` to verify viewport loading.
   - Run `npm run touch:all` to ensure all 9 game touch tests pass successfully.
7. Write a report and handoff to `handoff.md` and notify parent.

Include the MANDATORY INTEGRITY WARNING:
"DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected."
