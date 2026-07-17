# Handoff Report: Space Invaders & Cosmic Cargo Refactoring Strategy

## 1. Observation
- In `SpaceInvadersScene.ts` (lines 601–623), player respawning enables the body after 900ms:
  ```typescript
  618:     this.time.delayedCall(900, () => {
  619:       if (this.isGameOver) return;
  620:       this.player.enableBody(true, this.scale.width / 2, this.scale.height - 70, true, true);
  621:       this.player.setVisible(true);
  622:     });
  ```
  And the collision overlaps are defined as:
  ```typescript
  152:     this.physics.add.overlap(this.enemyBullets, this.player, this.hitPlayer, undefined, this);
  ```
- In `SpaceInvadersScene.ts` (lines 402–415), the scene relies on `this.physics.pause()` and checking `state !== 'playing'` in `update()` to suspend game execution. However, time-dependent variables like `lastEnemyShotTime` (line 273), `lastEnemyMoveTime` (line 348), and `nextSaucerTime` (line 278) rely on `time` or `this.time.now` passed from Phaser's active core tick, which continues to advance during paused states.
- In `CosmicCargoScene.ts` (lines 117–142), there is a group `this.asteroids` and a static group `this.cargoPods`. The collision overlap configuration in `create()` only registers ship overlap with cargo, ship overlap with portal, and ship collision with asteroids:
  ```typescript
  136:     this.physics.add.overlap(this.ship, this.cargoPods, this.collectCargo, undefined, this);
  ```
  No physics-based collider exists between `this.asteroids` and `this.cargoPods`.
- In `CosmicCargoScene.ts` (lines 150–152), the fuel label is statically placed at `(20, 70)` and the graphics bar coordinates are hardcoded in `drawFuelBar()` (lines 776–785):
  ```typescript
  780:     this.fuelBar.strokeRect(60, 72, 100, 10);
  ```
  These are not updated inside the window resizing handler `handleResize()` (lines 229–248).
- In `CosmicCargoScene.ts` (lines 357–397 and 422–437), gravity flips can be triggered in quick succession without cooldown check, as shown in `handleDirectPointerMove()`:
  ```typescript
  432:       this.updateGravity(dx > 0 ? GravityDir.RIGHT : GravityDir.LEFT);
  ```

---

## 2. Logic Chain
1. **Invulnerability logic**:
   - Because `this.physics.add.overlap` uses `undefined` for `processCallback`, every overlap immediately invokes `hitPlayer()`.
   - By creating `this.playerInvulnerable` state and returning `!this.playerInvulnerable` from `processCallback`, we prevent collision callback registration when the player is invulnerable.
   - Tweens that scale down and up the player's alpha (`0.2` to `1.0`) inside `loseLife()` will visually flash the car during the invulnerability period.
2. **Timer suspension logic**:
   - Because `time` ticks continuously, when the scene resumes, `time - lastEnemyShotTime` is artificially inflated by the duration of the pause.
   - Offsetting `lastEnemyShotTime` and other timestamps by the pause duration (recorded via `this.time.now` at pause onset) will cancel out this elapsed time shift, ensuring gameplay states resume precisely where they left off.
3. **Asteroid bounce logic**:
   - Because `this.asteroids` has `bounceX: 1, bounceY: 1` properties, registering `this.physics.add.collider(this.asteroids, this.cargoPods)` will cause the dynamic asteroids to bounce off the static cargo pods automatically according to Phaser Arcade Physics laws.
4. **Notch-safe dynamic positioning**:
   - Because phone screens have varying notch profiles, using CSS safe-area-inset parameters (`safe-area-inset-top` and `safe-area-inset-left`) provides the most accurate view boundaries.
   - Shifting the HUD elements dynamically inside `handleResize()` by calculating positions relative to these insets ensures that the labels and fuel bar remain fully visible.
5. **Accidental swipe debounce**:
   - Accidental double-swipes occur when the swipe gesture fires twice in rapid succession.
   - By adding a 200ms throttle gate checking `this.time.now - this.lastGravityFlipTime` inside the global `updateGravity` function, we intercept and ignore quick consecutive flips from all input sources.

---

## 3. Caveats
- **Back button placement**: Repositioning the HUD with safe area boundaries might conflict slightly with the hardcoded position of the HUB back button. We assume the implementer will adjust the back button alignment accordingly so they do not overlap.
- **Powerup collision**: The player's invulnerability should only ignore hazardous bullet collisions; powerup gathering should remain functional. Using the `processCallback` specifically on `this.enemyBullets` overlap addresses this correctly.

---

## 4. Conclusion
The proposed refactoring strategies directly address all five requirements by updating overlap callbacks, adjusting clock trackers on pause, integrating standard Phaser physics colliders, querying safe area CSS variables, and introducing simple timestamp-based debounce checks.

---

## 5. Verification Method
1. **Files to inspect**:
   - `/Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_invaders_cargo/analysis.md`
   - `/Users/apexclaw/Projects/weekly-game-factory/src/scenes/SpaceInvadersScene.ts`
   - `/Users/apexclaw/Projects/weekly-game-factory/src/scenes/CosmicCargoScene.ts`
2. **Build and test command**:
   Run `npm run build` or `npm run test` (if unit tests are configured in the project) to ensure typescript compilation compiles successfully after implementation.
3. **Manual verification**:
   - Play Space Invaders: lose a life and verify you can move through incoming bullets safely for 2 seconds while flashing.
   - Play Space Invaders: pause, wait 5 seconds, resume, and verify that the enemy doesn't instantly fire a bullet, move the formation, or spawn a saucer.
   - Play Cosmic Cargo: verify that asteroids bounce off gold cargo pod diamonds.
   - Play Cosmic Cargo: simulate landscape/notch modes using DevTools and check that the fuel bar and HUD align nicely with notch borders.
   - Play Cosmic Cargo: swipe rapidly in different directions and verify gravity flips only once per 200ms window.
