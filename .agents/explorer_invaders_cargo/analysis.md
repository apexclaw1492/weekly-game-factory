# Refactoring Analysis & Recommendations: Space Invaders & Cosmic Cargo

This report provides target code locations and recommended refactoring strategies for `SpaceInvadersScene.ts` and `CosmicCargoScene.ts`.

---

## 1. Space Invaders: Player Respawn Invulnerability & Flashing

### Current Implementation Details
In `SpaceInvadersScene.ts`, the player loses a life in `loseLife()` (lines 601–623). The player's physics body is disabled and hidden for 900ms, after which it is re-enabled:
```typescript
618:     this.time.delayedCall(900, () => {
619:       if (this.isGameOver) return;
620:       this.player.enableBody(true, this.scale.width / 2, this.scale.height - 70, true, true);
621:       this.player.setVisible(true);
622:     });
```
At line 152 in `create()`, the collision overlap handler is registered without any check for invulnerability:
```typescript
152:     this.physics.add.overlap(this.enemyBullets, this.player, this.hitPlayer, undefined, this);
```
Upon respawn, the player is immediately vulnerable to any active enemy bullets in the vicinity.

### Recommended Refactoring Strategy
1. **State Tracking**: Add a member variable `private playerInvulnerable = false;` to the `SpaceInvadersScene` class.
2. **Overlap Filter**: Update the overlap registration in `create()` to utilize Arcade Physics' `processCallback` parameter (the 4th argument). This filters out collision processing when the player is invulnerable:
   ```typescript
   this.physics.add.overlap(
     this.enemyBullets,
     this.player,
     this.hitPlayer,
     () => !this.playerInvulnerable && this.player.active,
     this
   );
   ```
3. **Flashing Effect & Cooldown**: In `loseLife()`, when re-enabling the player, set `this.playerInvulnerable = true` and run a Phaser tween that oscillates the player's opacity (`alpha`) for 2 seconds, clearing the flag and resetting `alpha` on completion:
   ```typescript
   this.time.delayedCall(900, () => {
     if (this.isGameOver) return;
     this.player.enableBody(true, this.scale.width / 2, this.scale.height - 70, true, true);
     this.player.setVisible(true);
     
     // 2-second invulnerability flash
     this.playerInvulnerable = true;
     this.player.setAlpha(1);
     
     this.tweens.add({
       targets: this.player,
       alpha: 0.2,
       duration: 100,
       yoyo: true,
       repeat: 9, // 10 iterations of 200ms = 2000ms
       onComplete: () => {
         this.player.setAlpha(1);
         this.playerInvulnerable = false;
       }
     });
   });
   ```
4. **Cleanup**: In `init()` and `resetGameplay()`, ensure `this.playerInvulnerable = false` is reset and any active tweens on the player are killed via `this.tweens.killTweensOf(this.player)` to prevent leaking state across restarts.

---

## 2. Space Invaders: Correct Pause Behavior & Suspended Enemy Shoots

### Current Implementation Details
In `SpaceInvadersScene.ts`, `pauseGameplay()` calls `this.physics.pause()` and displays the pause overlay (lines 402–409).
Active enemy shoots are technically suspended during pause because `update()` returns early when not `'playing'`:
```typescript
245:     if (!this.lifecycleManager) return;
246:     const state = this.lifecycleManager.update(time);
247:     if (state !== 'playing') return;
```
However, Phaser's scene clock (`time` passed to `update`) keeps ticking while the game is paused. When gameplay resumes:
- The condition `time - this.lastEnemyShotTime > 1500` evaluates to true immediately because `time` has advanced. This triggers an instant enemy bullet.
- The condition `time - this.lastEnemyMoveTime` also triggers an instant move of the enemy formation.
- The condition `time > this.nextSaucerTime` triggers an instant saucer spawn.
This causes an overwhelming burst of action the exact millisecond the player resumes the game.

### Recommended Refactoring Strategy
1. **Track Pause Duration**: Introduce a member variable `private pauseStartTime = 0;`.
2. **Capture Pause Start**: In `pauseGameplay()`, record the timestamp:
   ```typescript
   this.pauseStartTime = this.time.now;
   this.tweens.pauseAll(); // Pause UI floating texts or other active tweens
   ```
3. **Shift Timestamps on Resume**: In `resumeGameplay()`, compute the elapsed pause duration and offset all time-dependent gameplay trackers so that they do not accumulate duration during the pause window:
   ```typescript
   public resumeGameplay(): void {
     this.lifecycleState = 'playing';
     this.physics.resume();
     this.tweens.resumeAll();
     this.overlays.clear();
     
     if (this.pauseStartTime > 0) {
       const pauseDuration = this.time.now - this.pauseStartTime;
       this.lastEnemyShotTime += pauseDuration;
       this.lastEnemyMoveTime += pauseDuration;
       this.lastShotTime += pauseDuration;
       this.nextSaucerTime += pauseDuration;
       this.pauseStartTime = 0;
     }
   }
   ```

---

## 3. Cosmic Cargo: Physics-Based Cargo / Asteroid Collision

### Current Implementation Details
In `CosmicCargoScene.ts`, `this.cargoPods` is a static group (line 123) and `this.asteroids` is a dynamic group (line 117).
Currently, there is no collision check registered between them. Consequently, asteroids pass straight through cargo pods without any physical interaction.

### Recommended Refactoring Strategy
1. **Standard Physics Collider**: Register a physics collider between `this.asteroids` and `this.cargoPods` in `create()` (around line 140). Because asteroids are dynamic and have bounce properties set (`bounceX: 1, bounceY: 1`), and cargo pods are static, they will bounce off cargo pods realistically without displacing them:
   ```typescript
   this.physics.add.collider(this.asteroids, this.cargoPods);
   ```
2. **Audio/Visual Polish (Optional but Recommended)**: To make the collision feel highly reactive, we can specify a collision callback:
   ```typescript
   this.physics.add.collider(
     this.asteroids,
     this.cargoPods,
     (asteroidObj, cargoObj) => {
       const asteroid = asteroidObj as Phaser.Physics.Arcade.Sprite;
       // Play a subtle collision synth clink
       SoundSynth.playTone(180, 0.05, 'triangle', 0.02);
       // Spawn a tiny dust/spark particle puff
       this.createBoostParticles(asteroid.x, asteroid.y, 0x8899aa, 3);
     },
     undefined,
     this
   );
   ```

---

## 4. Cosmic Cargo: Safe-Area Viewport HUD Repositioning

### Current Implementation Details
HUD text labels like `"FUEL:"`, `"SCORE:"`, `"CARGO:"` and the fuel bar drawing parameters are hardcoded in `create()` (lines 144–152) and `drawFuelBar()` (lines 776–785). When resized, only `levelText`, `gravityText`, and `portalText` are adjusted in `handleResize()` (lines 229–248), leaving the main top-left HUD elements overlapping notches or safe-area inset margins on mobile screens.

### Recommended Refactoring Strategy
1. **Expose Inset Utility**: Implement a helper method to parse CSS safe-area insets dynamically:
   ```typescript
   private getSafeAreaInsets() {
     const parseSafe = (key: string): number => {
       const val = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
       const match = val.match(/^(\d+)px/);
       return match ? parseInt(match[1], 10) : 0;
     };
     return {
       top: parseSafe('safe-area-inset-top'),
       left: parseSafe('safe-area-inset-left'),
       right: parseSafe('safe-area-inset-right'),
       bottom: parseSafe('safe-area-inset-bottom')
     };
   }
   ```
2. **Reference the Fuel Text**: Keep a reference to the fuel text object as a member variable `private fuelText!: Phaser.GameObjects.Text;`.
3. **Reposition in `handleResize()`**: Calculate layout coordinates dynamically using the safe area insets:
   ```typescript
   private handleResize() {
     const { width, height } = this.scale;
     const insets = this.getSafeAreaInsets();
     
     const leftX = Math.max(20, insets.left);
     const topY = Math.max(20, insets.top);
     const rightX = width - Math.max(20, insets.right);

     // Reposition HUD
     this.scoreText.setPosition(leftX, topY);
     this.cargoText.setPosition(leftX, topY + 25);
     this.fuelText.setPosition(leftX, topY + 50);
     this.levelText.setPosition(rightX, topY);
     
     this.gravityText.setPosition(width / 2, topY);
     this.portalText.setPosition(width / 2, topY + 22);
     this.backBtn.setPosition(leftX, topY); // Back button and score should either stack or shift, keeping backBtn notch-safe
     
     // Update portal exit
     if (this.portal) {
       this.portal.setPosition(width - Math.max(70, insets.right + 40), height - Math.max(70, insets.bottom + 40));
     }
   }
   ```
4. **Update `drawFuelBar()`**: Replace the hardcoded coordinates with the dynamically calculated positions matching `this.fuelText`:
   ```typescript
   private drawFuelBar() {
     this.fuelBar.clear();
     const insets = this.getSafeAreaInsets();
     const leftX = Math.max(20, insets.left);
     const topY = Math.max(20, insets.top);

     const barX = leftX + 40;
     const barY = topY + 52;

     // Border
     this.fuelBar.lineStyle(1, 0x555555, 1);
     this.fuelBar.strokeRect(barX, barY, 100, 10);
     
     // Fill
     const color = this.fuel > 30 ? 0x00ccff : 0xff4444;
     this.fuelBar.fillStyle(color, 1);
     this.fuelBar.fillRect(barX + 1, barY + 1, Math.max(0, this.fuel - 2), 8);
   }
   ```

---

## 5. Cosmic Cargo: Gravity Flip Gesture Debouncing

### Current Implementation Details
In `CosmicCargoScene.ts`, gravity flips can be triggered in rapid succession by multiple inputs: keyboard, swipes, tilt, and pointer move gestures.
Currently, pointer move gestures (`handleDirectPointerMove`) and swipe events (`handleArcadeInput`) have no delay between flips, making it very easy to trigger an accidental double-flip when swiping.

### Recommended Refactoring Strategy
Add a debounce cooldown of 200ms to all gravity flips initiated during active gameplay.

1. **State Tracking**: Add a member variable `private lastGravityFlipTime = 0;` to the `CosmicCargoScene` class.
2. **Throttle in `updateGravity()`**: Intercept gravity changes inside `updateGravity()` during active gameplay:
   ```typescript
   private updateGravity(dir: GravityDir) {
     if (this.activeGravity === dir && this.lifecycleState !== "start") return;

     if (this.lifecycleState === "playing") {
       const now = this.time.now;
       if (now - this.lastGravityFlipTime < 200) {
         return; // Debounce double-swipes
       }
       this.lastGravityFlipTime = now;
     }

     this.activeGravity = dir;
     // ... rest of the method handles gravity vector updates and text labels
   ```
   *Rationale*: Throttling inside `updateGravity` is cleaner than modifying all call sites individually (like keyboard, swipe gestures, direct pointer swipes, and tilt motion) and covers all pathways globally under a single unified state.
