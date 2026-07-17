# Handoff Report — Contra and Asteroids Scenes Exploration

## 1. Observation
I directly observed the structure, input logic, and physics of the game scenes by viewing files on the local filesystem.

* **Contra Air Physics:**
  In `src/scenes/ContraScene.ts`, the player's horizontal movement in `update()` instantly overwrites `vx` and sets `this.player.setVelocityX(vx)`.
  Lines 349-372:
  ```typescript
  let vx = 0;
  const isGnd = this.player.body!.blocked.down || this.player.body!.touching.down;
  const aimingDown = frame.actions.down.held || (frame.gestures.dragVectorY > 0.2);

  // Left/Right
  if (aimingDown && isGnd) {
    vx = 0;
    this.player.stop();
    this.player.setTexture('player-stand');
  } else if (frame.actions.left.held) {
    vx = -180;
    this.faceDirection = -1;
    this.player.setFlipX(true);
    if (isGnd) this.player.play('run', true);
  } else if (frame.actions.right.held) {
    vx = 180;
    this.faceDirection = 1;
    this.player.setFlipX(false);
    if (isGnd) this.player.play('run', true);
  } else {
    this.player.stop();
    if (isGnd) this.player.setTexture('player-stand');
  }

  this.player.setVelocityX(vx);
  ```

* **Contra Virtual Controls & Aiming:**
  Aiming directions are calculated relative to `vx` and touch drag gestures.
  Lines 387-395:
  ```typescript
  // Aim calculations
  let aim = 0; // 0 = straight, -1 = diagonal up, -2 = up, 1 = diagonal down, 2 = down
  const aimingUp = frame.actions.up.held || (frame.gestures.dragVectorY < -0.2);
  if (aimingUp) {
    aim = (vx !== 0) ? -1 : -2;
  } else if (aimingDown) {
    aim = (!isGnd && vx !== 0) ? 1 : !isGnd ? 2 : 0;
  }
  ```
  Standard touch support in `InputRuntime.ts` maps screen-wide dragging to general left/right movements and hold triggers auto-fire:
  Lines 418-426 in `InputRuntime.ts`:
  ```typescript
  if (frame.gestures.dragVectorX < -0.3) {
    if (!frame.actions.left.held) setAction('left', true, false, 'touch');
  } else if (frame.gestures.dragVectorX > 0.3) {
    if (!frame.actions.right.held) setAction('right', true, false, 'touch');
  }
  
  if (frame.gestures.hold) {
    if (!frame.actions.fire.held) setAction('fire', true, false, 'touch');
  }
  ```

* **Asteroids Hyperspace Teleportation:**
  In `src/scenes/AsteroidsScene.ts`, the ship is randomly relocated with a hardcoded 12% chance of self-destruction after 250ms.
  Lines 569-584:
  ```typescript
  private useHyperspace() {
    if (this.isInvulnerable) return;

    const { width, height } = this.scale;
    this.ship.setPosition(Phaser.Math.Between(60, width - 60), Phaser.Math.Between(80, height - 80));
    this.ship.setVelocity(0, 0);
    this.isInvulnerable = true;
    this.invulnTimer = 45;

    if (Math.random() < 0.12) {
      this.time.delayedCall(250, () => {
        this.isInvulnerable = false;
        this.hitShip(this.ship, this.ship);
      });
    }
  }
  ```

* **Compilation/Testing commands:**
  Running `npm run build` succeeds and produces clean output:
  `dist/assets/index-DbgEoCi5.js         2,207.22 kB │ gzip: 520.04 kB`
  Running `npm run smoke` fails with connection error because the dev server is not active during this read-only investigation.

---

## 2. Logic Chain
1. From the **Contra Air Physics** observation, we see that releasing horizontal buttons in mid-air instantly sets velocity to 0 (since `vx` defaults to 0). This causes a rigid and unnatural mid-air feel. By separating physics logic into on-ground vs mid-air and applying interpolation (lerping toward input direction) and damping (multiplying current velocity by `1 - AIR_DRAG` on release), we can achieve smooth mid-air drifting and air acceleration.
2. From the **Contra Virtual Controls** observation, we see that screen-wide drag/swipe gestures are mapped to general horizontal and jump commands. This is insufficient for precise multi-directional aiming. By implementing a dedicated virtual joystick and action buttons (Jump, Fire) container on mobile viewports using Phaser graphics and touch events, and combining virtual action flags with input frame actions, we can enable intuitive touch-based diagonal aiming. Importantly, preserving the fallback check for `frame.actions` ensures that automated tests (which use screen-wide swipes/drags) continue to pass.
3. From the **Asteroids Hyperspace Teleportation** observation, the current 12% RNG self-destruction is frustrating. By implementing a coordinate scanner using `Phaser.Math.Distance.Between` that tests candidate locations against active asteroids and fallback to the "least dangerous" coordinate when the board is too full, we completely eliminate the hardcoded RNG death and replace it with a strategic, fair game mechanic.

---

## 3. Caveats
- The virtual joystick overlay has been designed and tested theoretically in pseudo-code. During implementation, fine-tuning of deadzones, button dimensions, and touch pointer scaling might be needed depending on the device pixel ratio.
- The `isMobile` check is assumed to rely on touch support and viewport dimensions; if the project uses a different mechanism for layout orientation updates, it should be adapted.

---

## 4. Conclusion
The codebase is structured appropriately to accept these refactoring changes without architectural changes:
- In `ContraScene.ts`, character air physics can be refactored inside the `update()` loop. Mobile controls can be added as a dynamic UI overlays layer in `create()`.
- In `AsteroidsScene.ts`, `useHyperspace()` can be refactored by replacing the `Math.random() < 0.12` block with the safe coordinate scanner.

Detailed strategies and code templates have been written to:
`/Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_contra_asteroids/analysis.md`

---

## 5. Verification Method
To verify the refactoring after it is implemented:
1. Run `npm run build` to verify there are no compilation or TypeScript errors.
2. Run `npm run touch:contra` and `npm run touch:asteroids` (or `npm run touch:all`) with a running Vite dev server to verify the automated test suites pass and do not break under the new mobile layouts.
3. Playtest Contra on a simulated mobile viewport in Chrome DevTools to confirm the virtual joystick correctly sets diagonal aiming states and the buttons function properly.
4. Trigger hyperspace multiple times in Asteroids to verify the ship never teleports directly on top of active asteroids.
