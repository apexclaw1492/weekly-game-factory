## 2026-07-11T18:16:52Z
Explore the files src/scenes/SpaceInvadersScene.ts and src/scenes/CosmicCargoScene.ts.
Identify the code sections where player respawning, collisions, shooting, pause overlays, fuel HUD bar layout, and gravity flip gestures are handled.
Recommend a clear refactoring strategy for the following requirements:
1. Space Invaders: 2-second player respawn invulnerability window where incoming collisions are ignored and the car flashes visually (opacity).
2. Space Invaders: Ensure standard pause overlays function correctly and suspend active enemy shoots.
3. Cosmic Cargo: Integrate physics-based cargo/asteroid collision handling.
4. Cosmic Cargo: Reposition the fuel HUD bar layout dynamically using safe-area viewport boundaries.
5. Cosmic Cargo: Debounce gravity flip gestures (e.g., 200ms delay) to prevent accidental double-swiping.

Write your findings to `/Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_invaders_cargo/analysis.md`. Include code snippets of target locations. Do not implement the changes yourself.
