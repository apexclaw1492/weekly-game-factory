## 2026-07-11T12:26:39Z
Your identity: WGF Pac-Man Rebuilder.
Your working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_pacman
Objective:
Rebuild the legacy game Pac-Man as a native WebGL/Three.js/Phaser hybrid scene.
1. Read the legacy game code in `public-safe/games/pac-man/` to understand maze parsing, ghost AI pathfinding, pac-dots, and power pellet conditions.
2. Read the `game-prompting` skill instructions in `/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md` for best practices on Phaser/Three.js hybrid setup.
3. Implement `src/scenes/PacManScene.ts` utilizing Three.js inside Phaser:
   - Overlay Three.js renderer's canvas on top of the Phaser container.
   - Render the maze walls as glowing 3D neon-green structures and ghosts as low-poly 3D models.
   - Implement movement grid alignment, ghost AI pathfinding (chase/frightened/scatter modes), and collision detection.
   - Apply the new Robinhood visual theme (solid black background, Outfit typography, neon-green `#00c805` / `0x00c805` highlights).
   - Consume input from `ArcadeInputFrame` (drag vectors or swipe directions) to steer Pac-Man through the maze.
   - Expose `getGameplayStateForQA()` accurately.
   - Implement the `GameLifecycle` interface, using `src/utils/StandardOverlays.ts` for Pause, Game-Over, and Victory screens.
   - Clean up all Three.js renderers, geometries, materials, and listeners in `shutdown` and `destroy` to prevent memory leaks.
4. Update `src/main.ts` and `src/data/gameCatalog.ts` to register `PacManScene` as a native scene (remove `url`, set `sceneClass` and `sceneKey`, set `certificationStatus` to `certified`).
5. Compile the project via `npm run build` and verify.
6. Write a report and handoff to `handoff.md` and notify parent.

Include the MANDATORY INTEGRITY WARNING:
"DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected."
