## 2026-07-11T18:18:02Z
Refactor Contra Bonus and Asteroid Belt in src/scenes/ContraScene.ts and src/scenes/AsteroidsScene.ts.

### 1. Contra Bonus Air Physics & Mobile Controls
- **Air Damping**:
  - Add horizontal air damping so horizontal movement in mid-air maintains smooth momentum instead of snapping immediately.
  - In `update()`, check if player is on ground. If on ground, retain instant velocity overwrite.
  - If mid-air:
    - If left/right buttons are held, linearly interpolate current horizontal velocity toward target air speed (180 or -180) using `Phaser.Math.LinearInterpolate` with a factor of `0.15`.
    - If no left/right buttons are held, apply air damping: `vx = vx * 0.92`. If velocity drops below 5, stop it.
- **Mobile Touch Controls**:
  - Check if scene is running on mobile device.
  - Setup virtual joystick (D-pad) on bottom-left and virtual Jump / Fire buttons on bottom-right using Phaser shapes and pointer inputs. Support multi-touch (pointers count = 2).
  - Map touch gestures/joystick direction to internal directional flags (`virtualLeft`, `virtualRight`, `virtualUp`, `virtualDown`, `virtualJump`, `virtualFire`) so they combine with standard keyboard inputs.

### 2. Asteroids Safe Hyperspace
- **Hyperspace Scanner**:
  - In `useHyperspace()`, replace the 12% RNG self-destruction block.
  - Implement a 2-pass scanner to find safe coordinates:
    - Pass 1: Try up to 150 times to generate a coordinate `(px, py)`. Check distance to all active asteroids and saucers. If distance to all is >= `90` pixels, it is safe.
    - Pass 2 (Fallback): If no safe spot is found, generate 50 candidate spots and choose the one that has the maximum distance to its nearest asteroid/saucer.
  - Move the ship to the chosen spot, reset velocity to zero, and set ship invulnerability to 45 ticks.
