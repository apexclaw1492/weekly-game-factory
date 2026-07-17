# Analysis & Refactoring Report — Contra and Asteroids Scenes

This document contains the read-only investigation, code locations, and proposed refactoring strategies for:
1. Horizontal air damping in `ContraScene.ts`
2. Virtual touch joystick overlays on mobile viewports in `ContraScene.ts`
3. Safe hyperspace coordinate scanner in `AsteroidsScene.ts`

---

## 1. Identified Code Sections (Target Locations)

### A. Contra: Air Physics & Gravity
In `src/scenes/ContraScene.ts`, character gravity is applied in `create()`, and left/right movement is directly mapped to velocity in `update()`.

* **Gravity Application (`create`):**
  Lines 172-174:
  ```typescript
  if (this.player.body) {
    (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(800);
  }
  ```

* **Ground/Air Movement Logic (`update`):**
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

* **Jump Trigger (`update`):**
  Lines 375-385:
  ```typescript
  // Jump
  const justJump = frame.actions.jump.justPressed || frame.gestures.swipeUp;
  if (justJump && isGnd) {
    this.player.setVelocityY(-350);
    this.player.setTexture('player-jump');
    SoundSynth.playTone(350, 0.08, 'sine', 0.03);
    this.jumpsTriggered++;
  }
  ```

### B. Contra: Shooting / Aiming & Virtual Controls
* **Aim calculations (`update`):**
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

* **Firing & Trajectory Handling:**
  In `update()` (lines 396-403), the game triggers the weapon if standard `actions.fire.held` is true:
  ```typescript
  if (isFiring && this.fireCooldown === 0) {
    this.fireWeapon(aim);
  }
  ```
  The trajectory is computed in `fireWeapon(aim)` (lines 545-614) based on the computed `aim` parameter:
  ```typescript
  if (this.weapon === 'rifle') {
    let vx = this.faceDirection * 350;
    let vy = 0;

    if (aim === -1) {
      vx = this.faceDirection * 250;
      vy = -250;
    } else if (aim === -2) {
      vx = 0;
      vy = -350;
    ...
  ```

### C. Asteroids: Hyperspace Teleportation
In `src/scenes/AsteroidsScene.ts`, hyperspace behavior is controlled in `useHyperspace()` where a random location is selected, and a hardcoded 12% chance of instant self-destruction is applied.

* **Target Location:**
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

---

## 2. Refactoring Recommendations

### Recommendation 1: Contra Horizontal Air Damping
**Goal:** Prevent horizontal velocity from instantly changing to target velocity or zero while in mid-air. Allow players to slide/drift with inertia, responding smoothly to inputs.

**Proposed Implementation:**
We introduce constants for mid-air movement:
- `AIR_ACCEL = 0.15` (Mid-air acceleration rate)
- `AIR_DRAG = 0.08`  (Mid-air deceleration/damping rate)

We split the left/right movement check in `update()` based on `isGnd`:
1. **On Ground:** Retain the current instant velocity overwrite behavior.
2. **In Mid-Air:** 
   - Determine target horizontal speed (`targetVx = 180` for right, `-180` for left, `0` for no input).
   - If input is held (`targetVx !== 0`), linearly interpolate (`lerp`) or accelerate the current velocity toward `targetVx`:
     `currentVx = currentVx + (targetVx - currentVx) * AIR_ACCEL;`
   - If no input is held (`targetVx === 0`), apply damping to decelerate:
     `currentVx = currentVx * (1 - AIR_DRAG);`
   - Apply the final computed velocity `this.player.setVelocityX(currentVx)`.

*Proposed Code structure for `ContraScene.ts`:*
```typescript
// Define at class level or as constants
const GROUND_SPEED = 180;
const AIR_SPEED = 180;
const AIR_ACCEL = 0.15;
const AIR_DRAG = 0.08;

// In update(time):
const isGnd = this.player.body!.blocked.down || this.player.body!.touching.down;
const leftHeld = frame.actions.left.held || this.virtualLeft;
const rightHeld = frame.actions.right.held || this.virtualRight;
const aimingDown = frame.actions.down.held || this.virtualDown || (frame.gestures.dragVectorY > 0.2);

if (isGnd) {
  let vx = 0;
  if (aimingDown) {
    vx = 0;
    this.player.stop();
    this.player.setTexture('player-stand');
  } else if (leftHeld) {
    vx = -GROUND_SPEED;
    this.faceDirection = -1;
    this.player.setFlipX(true);
    this.player.play('run', true);
  } else if (rightHeld) {
    vx = GROUND_SPEED;
    this.faceDirection = 1;
    this.player.setFlipX(false);
    this.player.play('run', true);
  } else {
    this.player.stop();
    this.player.setTexture('player-stand');
  }
  this.player.setVelocityX(vx);
} else {
  // Mid-air physics with damping/inertia
  let currentVx = this.player.body!.velocity.x;
  let targetVx = 0;

  if (leftHeld) {
    targetVx = -AIR_SPEED;
    this.faceDirection = -1;
    this.player.setFlipX(true);
  } else if (rightHeld) {
    targetVx = AIR_SPEED;
    this.faceDirection = 1;
    this.player.setFlipX(false);
  }

  if (targetVx !== 0) {
    // Accelerate toward input direction
    currentVx = Phaser.Math.LinearInterpolate(currentVx, targetVx, AIR_ACCEL);
  } else {
    // Damping/Drifting deceleration
    currentVx = currentVx * (1 - AIR_DRAG);
    if (Math.abs(currentVx) < 5) currentVx = 0;
  }
  this.player.setVelocityX(currentVx);
  this.player.setTexture('player-jump');
}
```

---

### Recommendation 2: Contra Mobile Virtual Touch Joysticks
**Goal:** Replace the counterintuitive single-touch gesture/tilt mechanism with a robust standard layout on mobile screens:
- An interactive dynamic/static virtual Joystick (D-pad) on the bottom-left for horizontal movement and multi-directional aiming.
- Interactive Fire and Jump buttons on the bottom-right.

**Proposed Implementation:**
1. Enable multi-touch pointers in `create()`: `this.input.addPointer(2);`.
2. Check if the scene is running on mobile. We can check `this.sys.game.device.input.touch`. If true, trigger a setup function: `this.setupMobileControls()`.
3. The setup function will render UI elements with `.setScrollFactor(0)` and high depth (`.setDepth(2000)`):
   - **Joystick Base & Knob:** Render visual circles at the bottom-left. Attach touch events (`pointerdown`, `pointermove`, `pointerup`) to compute the polar angle. Map the angle to directional flags:
     - Left: `nx < -0.38`
     - Right: `nx > 0.38`
     - Up: `ny < -0.38` (Diagonal or vertical up aiming)
     - Down: `ny > 0.38` (Diagonal or vertical down aiming)
   - **Jump Button:** A button at the bottom-right. Triggers `this.virtualJump = true` and sets `this.virtualJumpJustPressed = true`.
   - **Fire Button:** A button at the bottom-right. Sets `this.virtualFire = true` on hold.
4. Clean up `this.virtualJumpJustPressed = false` at the end of the update loop.
5. Combine inputs in `update()` so that player controls accept both keyboard frames and virtual touch inputs.

*Proposed Code structure for `ContraScene.ts` mobile controls:*
```typescript
// Class level fields
private isMobile = false;
private virtualLeft = false;
private virtualRight = false;
private virtualUp = false;
private virtualDown = false;
private virtualJump = false;
private virtualJumpJustPressed = false;
private virtualFire = false;

private joystickBase?: Phaser.GameObjects.Circle;
private joystickKnob?: Phaser.GameObjects.Circle;
private fireButton?: Phaser.GameObjects.Circle;
private jumpButton?: Phaser.GameObjects.Circle;

private setupMobileControls() {
  const layout = getMobileLayout(this);
  const joystickCenterX = layout.leftPad + 60;
  const joystickCenterY = layout.controlCenterY;

  // Add 2 active touch inputs
  this.input.addPointer(2);

  // Draw Joystick Graphics
  this.joystickBase = this.add.circle(joystickCenterX, joystickCenterY, 50, 0xffffff, 0.1)
    .setStrokeStyle(2, 0xffffff, 0.3)
    .setScrollFactor(0)
    .setDepth(2000);
  
  this.joystickKnob = this.add.circle(joystickCenterX, joystickCenterY, 24, 0xffffff, 0.3)
    .setScrollFactor(0)
    .setDepth(2001);

  // Joystick Input Area
  const joyZone = this.add.zone(joystickCenterX, joystickCenterY, 120, 120)
    .setScrollFactor(0)
    .setDepth(2002)
    .setInteractive();

  let activePointerId: number | null = null;

  joyZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    activePointerId = pointer.id;
    this.updateJoystickPosition(pointer, joystickCenterX, joystickCenterY);
  });

  this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
    if (activePointerId === pointer.id) {
      this.updateJoystickPosition(pointer, joystickCenterX, joystickCenterY);
    }
  });

  const resetJoy = (pointer: Phaser.Input.Pointer) => {
    if (activePointerId === pointer.id) {
      activePointerId = null;
      this.joystickKnob?.setPosition(joystickCenterX, joystickCenterY);
      this.virtualLeft = false;
      this.virtualRight = false;
      this.virtualUp = false;
      this.virtualDown = false;
    }
  };

  this.input.on('pointerup', resetJoy);
  this.input.on('pointercancel', resetJoy);

  // Draw Action Buttons (Fire on bottom-right, Jump slightly offset)
  const fireX = layout.width - layout.rightPad - 110;
  const fireY = layout.controlCenterY + 10;
  const jumpX = layout.width - layout.rightPad - 40;
  const jumpY = layout.controlCenterY - 30;

  this.fireButton = this.add.circle(fireX, fireY, 32, 0xff5555, 0.4)
    .setStrokeStyle(2, 0xff5555, 0.7)
    .setScrollFactor(0)
    .setDepth(2000)
    .setInteractive();
  this.add.text(fireX, fireY, 'FIRE', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5).setScrollFactor(0).setDepth(2001);

  this.fireButton.on('pointerdown', () => { this.virtualFire = true; });
  this.fireButton.on('pointerup', () => { this.virtualFire = false; });
  this.fireButton.on('pointerout', () => { this.virtualFire = false; });

  this.jumpButton = this.add.circle(jumpX, jumpY, 32, 0x55ff55, 0.4)
    .setStrokeStyle(2, 0x55ff55, 0.7)
    .setScrollFactor(0)
    .setDepth(2000)
    .setInteractive();
  this.add.text(jumpX, jumpY, 'JUMP', { fontSize: '11px', color: '#ffffff', fontStyle: 'bold' })
    .setOrigin(0.5).setScrollFactor(0).setDepth(2001);

  this.jumpButton.on('pointerdown', () => {
    this.virtualJump = true;
    this.virtualJumpJustPressed = true;
  });
  this.jumpButton.on('pointerup', () => { this.virtualJump = false; });
  this.jumpButton.on('pointerout', () => { this.virtualJump = false; });
}

private updateJoystickPosition(pointer: Phaser.Input.Pointer, cx: number, cy: number) {
  const dx = pointer.x - cx;
  const dy = pointer.y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxRadius = 45;
  const deadzone = 12;

  const clampedDist = Math.min(dist, maxRadius);
  const angle = Math.atan2(dy, dx);

  this.joystickKnob?.setPosition(cx + Math.cos(angle) * clampedDist, cy + Math.sin(angle) * clampedDist);

  if (dist > deadzone) {
    const nx = dx / dist;
    const ny = dy / dist;
    this.virtualLeft = nx < -0.38;
    this.virtualRight = nx > 0.38;
    this.virtualUp = ny < -0.38;
    this.virtualDown = ny > 0.38;
  } else {
    this.virtualLeft = false;
    this.virtualRight = false;
    this.virtualUp = false;
    this.virtualDown = false;
  }
}
```

---

### Recommendation 3: Asteroids Hyperspace Coordinate Scanner
**Goal:** Replace the frustrating 12% chance of instant self-destruction with a coordinate scanner that avoids teleporting directly on top of active asteroids. If a safe spot is not found, fallback to the least dangerous coordinate (maximizing the distance from the nearest asteroid).

**Proposed Implementation:**
1. Remove the RNG self-destruction block:
   ```typescript
   if (Math.random() < 0.12) { ... }
   ```
2. Write a coordinate scanner inside `useHyperspace()` that generates coordinates and checks them against all active asteroid positions using `Phaser.Math.Distance.Between()`.
3. Set the distance safety threshold to `90` pixels (combining ship size, max asteroid size, and a safety margin).
4. Run a loop to check up to 150 candidate spots.
5. If no candidate spot satisfies the threshold (e.g. at very high levels with high asteroid density), run a second pass (e.g. 50 attempts) to find the location that has the maximum distance to its nearest asteroid (i.e. the "least dangerous" coordinate).
6. Set the ship position to the scanner's chosen coordinate, reset ship velocity, and set invulnerability with a brief timer.

*Proposed Code structure for `AsteroidsScene.ts`:*
```typescript
private useHyperspace() {
  if (this.isInvulnerable) return;

  const { width, height } = this.scale;
  let targetX = width / 2;
  let targetY = height / 2;
  let foundSafeSpot = false;
  
  const safeDistanceThreshold = 90; // Ship radius (~10) + Asteroid radius (max 24) + safe buffer
  const maxAttempts = 150;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const px = Phaser.Math.Between(60, width - 60);
    const py = Phaser.Math.Between(80, height - 80);
    
    // Check if distance to all active asteroids and saucers is safe
    let isCandidateSafe = true;
    this.asteroids.getChildren().forEach((child) => {
      const asteroid = child as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(px, py, asteroid.x, asteroid.y);
      if (dist < safeDistanceThreshold) {
        isCandidateSafe = false;
      }
    });
    
    this.saucers.getChildren().forEach((child) => {
      const saucer = child as Phaser.Physics.Arcade.Image;
      const dist = Phaser.Math.Distance.Between(px, py, saucer.x, saucer.y);
      if (dist < safeDistanceThreshold) {
        isCandidateSafe = false;
      }
    });

    if (isCandidateSafe) {
      targetX = px;
      targetY = py;
      foundSafeSpot = true;
      break;
    }
  }
  
  // Fallback if no safe spot was found: find the least dangerous candidate spot
  if (!foundSafeSpot) {
    let maxMinDist = -1;
    for (let attempt = 0; attempt < 50; attempt++) {
      const px = Phaser.Math.Between(60, width - 60);
      const py = Phaser.Math.Between(80, height - 80);
      
      let minDist = Infinity;
      this.asteroids.getChildren().forEach((child) => {
        const asteroid = child as Phaser.Physics.Arcade.Sprite;
        const dist = Phaser.Math.Distance.Between(px, py, asteroid.x, asteroid.y);
        if (dist < minDist) {
          minDist = dist;
        }
      });
      
      if (minDist > maxMinDist) {
        maxMinDist = minDist;
        targetX = px;
        targetY = py;
      }
    }
  }

  // Teleport ship to the scanned coordinates
  this.ship.setPosition(targetX, targetY);
  this.ship.setVelocity(0, 0);
  
  // Grant invulnerability to prevent immediate cheap death on exit
  this.isInvulnerable = true;
  this.invulnTimer = 45; 
}
```
