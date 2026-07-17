## 2026-07-11T18:18:02Z

Refactor Space Invaders and Cosmic Cargo in src/scenes/SpaceInvadersScene.ts and src/scenes/CosmicCargoScene.ts.

### 1. Space Invaders Polish
- **Invulnerability**:
  - Add a class-level variable `playerInvulnerable = false`.
  - In `loseLife()`, when re-enabling the player, set `this.playerInvulnerable = true`.
  - Run a Phaser tween to oscillate player's opacity (`alpha`) from 0.2 to 1.0 (e.g. 100ms duration, yoyo: true, repeat: 9 for 2 seconds total). On completion, set `alpha` back to 1.0 and `playerInvulnerable = false`.
  - In `init()` and `resetGameplay()`, ensure `this.playerInvulnerable = false` is reset and any active player tweens are killed via `this.tweens.killTweensOf(this.player)`.
  - Update `create()` overlap registration with enemy bullets to utilize Arcade Physics' `processCallback` (the 4th argument) to block collision processing when `playerInvulnerable` is true.
- **Pause & Resume**:
  - Track `pauseStartTime` using `this.time.now` in `pauseGameplay()` and call `this.tweens.pauseAll()`.
  - In `resumeGameplay()`, if `pauseStartTime > 0`, calculate `pauseDuration = this.time.now - this.pauseStartTime`.
  - Shift time trackers (`lastEnemyShotTime`, `lastEnemyMoveTime`, `lastShotTime`, `nextSaucerTime`) forward by `pauseDuration` to prevent a post-pause action burst.
  - Resume tweens via `this.tweens.resumeAll()`.

### 2. Cosmic Cargo Refactoring
- **Cargo/Asteroid Physics Collision**:
  - Add a collider between `this.asteroids` and `this.cargoPods` in `create()` so asteroids bounce off cargo pods physically. Add a collision callback to play a subtle sound tone and spawn particles at collision point.
- **Fuel HUD Repositioning**:
  - Expose a safe-area insets reader method that parses CSS safe-area insets (`safe-area-inset-*`).
  - Keep a reference to the fuel text as a class property `fuelText`.
  - In `handleResize()`, calculate left, top, right, and bottom coordinates adjusting for safe area insets. Reposition all HUD texts (`scoreText`, `cargoText`, `fuelText`, `levelText`, `gravityText`, `portalText`, `backBtn`) and `portal` using these coordinates.
  - Update `drawFuelBar()` to render the bar next to the dynamic `fuelText` coordinates.
- **Gravity Flip Debouncing**:
  - Track `lastGravityFlipTime = 0`.
  - In `updateGravity()`, if `lifecycleState === "playing"`, check if `this.time.now - this.lastGravityFlipTime < 200` and return early if so, to debounce gravity flip gestures.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Verification Instructions
Run the build and test commands:
- `npm run build`
- `npm run smoke`
- `npm run touch:all`
Verify everything compiles and runs without error.
Write a handoff report at `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_invaders_cargo/handoff.md` and include the build/test commands and outcomes.
