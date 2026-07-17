## 2026-07-11T12:26:39Z
Your identity: WGF 2048 Rebuilder.
Your working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_2048
Objective:
Rebuild the legacy game 2048 as a native WebGL/Three.js/Phaser hybrid scene.
1. Read the legacy game code in `public-safe/games/2048/` to understand its game mechanics, scoring, and win conditions.
2. Read the `game-prompting` skill instructions in `/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md` for best practices on Phaser/Three.js hybrid setup.
3. Implement `src/scenes/TwoZeroFourEightScene.ts` utilizing Three.js inside Phaser:
   - Overlay Three.js renderer's canvas on top of the Phaser container.
   - Use low-poly flat-shaded 3D geometries for the tiles (blocks) and grid board.
   - Render and animate tile movements and merges in orthographic 3D.
   - Apply the new Robinhood visual theme (solid black background, Outfit typography, neon-green `#00c805` / `0x00c805` highlights).
   - Consume input from `ArcadeInputFrame` (swipe gestures left/right/up/down) to slide tiles on the board.
   - Expose `getGameplayStateForQA()` accurately.
   - Implement the `GameLifecycle` interface, using `src/utils/StandardOverlays.ts` for Pause, Game-Over, and Victory screens.
   - Clean up all Three.js renderers, geometries, materials, and listeners in `shutdown` and `destroy` to prevent memory leaks.
4. Update `src/main.ts` and `src/data/gameCatalog.ts` to register `TwoZeroFourEightScene` as a native scene (remove `url`, set `sceneClass` and `sceneKey`, set `certificationStatus` to `certified`).
5. Compile the project via `npm run build` and verify.
6. Write a report and handoff to `handoff.md` and notify parent.

Include the MANDATORY INTEGRITY WARNING:
"DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected."
