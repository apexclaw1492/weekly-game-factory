## 2026-07-11T21:54:43Z
You are a developer worker agent. Your task is to verify, resume, and complete the refactoring of Space Invaders and Cosmic Cargo in the Weekly Game Factory compilation folder.

Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_invaders_cargo_resumed/

Objective:
1. Examine the current implementation of `src/scenes/SpaceInvadersScene.ts` and `src/scenes/CosmicCargoScene.ts`.
2. Compare them against the requirements:
   - Space Invaders:
     - 2-second player respawn invulnerability window where incoming collisions (enemy bullets/obstacles) are ignored and the player car/sprite flashes visually.
     - Verify standard pause overlays function correctly and suspend active enemy shoots.
   - Cosmic Cargo:
     - Physics-based cargo/asteroid collision handling (Matter.js or Arcade equivalent).
     - Reposition the fuel HUD bar layout dynamically using safe-area viewport boundaries.
     - Debounce gravity flip gestures (e.g. 200ms delay) to prevent accidental double-swiping.
3. Validate if any of these requirements are already implemented or if they are complete. If they are incomplete, incorrect, or need adjustments, implement/complete them.
4. Run build (`npm run build`), smoke tests (`npm run smoke`), and touch tests (`npm run touch:f1` and `npm run touch:cargo`) to verify correctness.
5. Create a handoff report in your folder `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_invaders_cargo_resumed/handoff.md` summarizing what is implemented, the verification results (including command outputs), and any findings.
6. Communicate your results back.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
