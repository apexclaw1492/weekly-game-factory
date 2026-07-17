## 2026-07-11T18:16:52Z

Explore the files src/scenes/ContraScene.ts and src/scenes/AsteroidsScene.ts.
Identify the code sections where character air physics, shooting/aiming, virtual controls, and hyperspace teleportation are handled.
Recommend a clear refactoring strategy for the following requirements:
1. Contra Bonus: Add horizontal air damping so horizontal movement in mid-air feels natural rather than overriding horizontal velocity instantly.
2. Contra Bonus: Implement standard virtual touch joystick overlays on mobile viewports for clean diagonal/vertical aiming.
3. Asteroids: Replace the hardcoded 12% chance of instant self-destruction on hyperspace exit with a coordinate scanner that avoids teleporting directly on top of active asteroids.

Write your findings to `/Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_contra_asteroids/analysis.md`. Include code snippets of target locations. Do not implement the changes yourself.
