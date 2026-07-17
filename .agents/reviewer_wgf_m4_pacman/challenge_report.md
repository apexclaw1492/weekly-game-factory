# Adversarial Challenge Report — Pac-Man 3D Maze Instancing & Disposal (Milestone 4)

## Challenge Summary

**Overall risk assessment**: LOW

The Pac-Man 3D implementation exhibits robust logic with minimal regression risks. The identified memory leak is a JS-side object reference leak that does not trigger WebGL GPU resource leaks.

---

## Challenges

### [Low] Challenge 1: Memory Leak due to Accumulating JS References
- **Assumption challenged**: The scene shutdown and reset logic correctly reclaims all memory allocated for geometries and materials.
- **Attack scenario**: A user plays the game and repeatedly restarts it (either by winning, losing, or manually selecting restart).
- **Blast radius**: The arrays `this.geometriesToDispose` and `this.materialsToDispose` grow linearly by appending references to Three.js geometries and materials on every restart. While WebGL/GPU resources are freed by `clearThreeSceneResources()`, the JavaScript objects themselves cannot be garbage-collected, slowly increasing JS heap size.
- **Mitigation**: Update `resetGameplay()` to clear the arrays: `this.geometriesToDispose = [];` and `this.materialsToDispose = [];` after `clearThreeSceneResources()`.

### [Low] Challenge 2: Ghost Movement Stuck/Wall Collision
- **Assumption challenged**: The ghost pathfinding logic assumes it will always find at least one valid non-wall option or fallback option.
- **Attack scenario**: A ghost is placed in a corner where all adjacent cells (excluding reverse) are walls, and the reverse direction is also blocked.
- **Blast radius**: If `options.length` and reverse direction are blocked, the ghost could cause a crash or infinite loop.
- **Analysis**: The code handles this gracefully. If `options.length === 0`, it allows reversing. If that is also blocked, it defaults to:
  ```typescript
  g.dirX = 0;
  g.dirZ = 0;
  ```
  This safely keeps the ghost static until the path clears.

### [Low] Challenge 3: Continuous Input Overrides
- **Assumption challenged**: The touch-drag threshold checks work continuously when dragging diagonally or making circular sweeps.
- **Attack scenario**: A user performs a fast, diagonal touch gesture that oscillates between horizontal and vertical dominance.
- **Blast radius**: Pac-Man's steering direction changes rapidly or ignores directions.
- **Analysis**: The input check compares `Math.abs(frame.touch.dx)` and `Math.abs(frame.touch.dy)` to choose the dominant direction. Since direction is queued in `this.nextDirX`/`nextDirZ` and only applied when Pac-Man reaches a grid node, rapid steering inputs do not cause erratic path glitches; Pac-Man simply makes the turn when aligning with the grid.

---

## Stress Test Results

- **Build Pipeline Verification** → Run `npm run build` → TypeScript and Vite compile successfully with no errors → PASS
- **Swipe and Steer Verification** → Run `npm run touch:pacman` → Puppeteer simulates swipe-left. Pac-Man correctly changes gridX coordinate from 7 to 5 (eats dots at (6,7) and (5,7)), and scores 20 points → PASS
- **Global Integration Verification** → Run `npm run smoke` → All other games are launched and playtested in various viewports without errors → PASS
- **Ghost Target Coordinates Check** → Verify that Pinky targets 2 tiles ahead of Pac-Man → verified via code inspection → PASS
