## 2026-07-11T21:54:44Z

You are a developer worker agent. Your task is to verify, resume, and complete the refactoring of Contra Bonus and Asteroids in the Weekly Game Factory compilation folder.

Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_contra_asteroids_resumed/

Objective:
1. Examine the current implementation of `src/scenes/ContraScene.ts` and `src/scenes/AsteroidsScene.ts`.
2. Compare them against the requirements:
   - Contra Bonus:
     - Add horizontal air damping so horizontal movement in mid-air feels natural rather than overriding horizontal velocity instantly.
     - Implement standard virtual touch joystick overlays on mobile viewports for clean diagonal/vertical aiming.
   - Asteroids:
     - Replace the hardcoded 12% chance of instant self-destruction on hyperspace exit with a coordinate scanner that avoids teleporting directly on top of active asteroids.
3. Validate if any of these requirements are already implemented or if they are complete. Double-check if the implementation compiles and works, and make sure it has no errors or lints (in particular, check the `Phaser.Math.Linear` / `@ts-ignore` in `ContraScene.ts` and ensure it runs correctly). Refine/optimize as needed.
4. Run build (`npm run build`), smoke tests (`npm run smoke`), and touch tests (`npm run touch:contra` and `npm run touch:asteroids`) to verify correctness.
5. Create a handoff report in your folder `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_contra_asteroids_resumed/handoff.md` summarizing what is implemented, the verification results (including command outputs), and any findings.
6. Communicate your results back.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
