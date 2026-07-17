## 2026-07-11T12:26:39Z
Your identity: WGF Hextris Rebuilder.
Your working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_hextris
Objective:
Rebuild the legacy game Hextris as a native WebGL/Three.js/Phaser hybrid scene.
1. Read the legacy game code in `public-safe/games/hextris/` to understand the rotating hexagon color-matching logic, spawning waves of blocks, and score/combo rules.
2. Read the `game-prompting` skill instructions in `/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md` for best practices on Phaser/Three.js hybrid setup.
3. Implement `src/scenes/HextrisScene.ts` utilizing Three.js inside Phaser:
   - Overlay Three.js renderer's canvas on top of the Phaser container.
   - Render the central hexagon and falling colorful lines/blocks in orthographic 3D. Use flat-shaded low-poly geometries.
   - Implement color-matching, combo multipliers, and game-over detection (when blocks overflow the hex bounds).
   - Apply the new Robinhood visual theme (solid black background, Outfit typography, neon-green `#00c805` / `0x00c805` highlights).
   - Consume input from `ArcadeInputFrame` (drag gestures, left/right swipes, or lateral taps) to rotate the hexagon left/right.
   - Expose `getGameplayStateForQA()` accurately.
   - Implement the `GameLifecycle` interface, using `src/utils/StandardOverlays.ts` for Pause, Game-Over, and Victory screens.
   - Clean up all Three.js renderers, geometries, materials, and listeners in `shutdown` and `destroy` to prevent memory leaks.
4. Update `src/main.ts` and `src/data/gameCatalog.ts` to register `HextrisScene` as a native scene (remove `url`, set `sceneClass` and `sceneKey`, set `certificationStatus` to `certified`).
5. Compile the project via `npm run build` and verify.
6. Write a report and handoff to `handoff.md` and notify parent.

Include the MANDATORY INTEGRITY WARNING:
"DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected."
