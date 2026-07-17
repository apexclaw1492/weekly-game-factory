## 2026-07-11T12:26:39Z

Objective:
Rebuild the legacy game Clumsy Bird as a native WebGL/Three.js/Phaser hybrid scene (Clumsy Bird 3D).
1. Read the legacy/3D runner game code in `public-safe/games/clumsy-bird/` and `public-safe/games/low-poly-runner/index.html` to understand its game mechanics, physics, and asset generation.
2. Read the `game-prompting` skill instructions in `/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md` for best practices on Phaser/Three.js hybrid setup.
3. Implement `src/scenes/ClumsyBirdScene.ts` utilizing Three.js inside Phaser:
   - Overlay Three.js renderer's canvas on top of the Phaser container.
   - Use low-poly flat-shaded 3D geometries for the bird, ground, procedural obstacles/pipes, trees, and sky details.
   - Implement 3D physics (impulses, gravity, jumping, collision detection) for the bird flying through the pipes.
   - Implement WebGL performance guardrails (use `InstancedMesh` for trees/clouds/background elements, reuse/dispose of retired assets).
   - Apply the new Robinhood visual theme (solid black background, Outfit typography, neon-green `#00c805` / `0x00c805` highlights).
   - Consume input from `ArcadeInputFrame` (taps or screen hold) to flap/fly/jump.
   - Expose `getGameplayStateForQA()` accurately.
   - Implement the `GameLifecycle` interface, using `src/utils/StandardOverlays.ts` for Pause, Game-Over, and Victory screens.
   - Clean up all Three.js renderers, geometries, materials, and listeners in `shutdown` and `destroy` to prevent memory leaks.
4. Update `src/main.ts` and `src/data/gameCatalog.ts` to register `ClumsyBirdScene` as a native scene (remove `url`, set `sceneClass` and `sceneKey`, set `certificationStatus` to `certified`).
5. Compile the project via `npm run build` and verify.
6. Write a report and handoff to `handoff.md` and notify parent.
