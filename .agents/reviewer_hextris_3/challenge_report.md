# Adversarial Review (Challenger) Report — Hextris Retry (Milestone 3)

## Challenge Summary

**Overall risk assessment**: LOW

The overall risk is assessed as Low. The implementation uses robust state management, cached Three.js assets, and safe index checks to prevent logic crashes and memory bloat. No critical security or stability failure modes were identified.

---

## Challenges

### [Low] Memory footprint growth under high spawn rate or long sessions

- **Assumption challenged**: Shared geometries and materials prevent memory leaks during extended sessions.
- **Attack scenario**: A user plays the game for hours, spawning thousands of blocks, resulting in multiple match/clear sequences.
- **Blast radius**: If single-use materials generated during block fades or temporary collapses are not fully disposed, this could lead to memory bloat and eventual crash on low-end devices.
- **Mitigation**: Verified that in `checkStackBlockCollision()`, `addBlockToHex()`, `clearThreeScene()`, and block deletion (`block.deleted === 2`), the individual block meshes have their materials explicitly disposed via:
  ```typescript
  if (block.mesh.material) {
    if (Array.isArray(block.mesh.material)) {
      block.mesh.material.forEach(m => m.dispose());
    } else {
      block.mesh.material.dispose();
    }
  }
  ```
  Since geometry is cached, we do not dispose it here, which is correct. The material disposal mitigation is fully active and prevents memory leaks during runtime gameplay.

### [Low] Edge Case: Splicing list from index `0` and concurrent lookups

- **Assumption challenged**: Decrementing `j` after array splicing is completely safe and doesn't skip blocks.
- **Attack scenario**: Multiple blocks in the same lane are deleted during a single frame, including the block at index `0`.
- **Blast radius**: An off-by-one error or skipping index evaluation could leave blocks "hanging" in a deleted state or skip gravity checks.
- **Mitigation**: Decrementing `j` (`j--`) inside the loop right after splicing `this.mainHex.blocks[side].splice(j, 1)` ensures that the next block (which shifts down to index `j`) is processed correctly on the next iteration. This is a standard and robust pattern for mutating arrays during traversal.

---

## Stress Test Results

- **Consecutive Scene Restarts**:
  - *Scenario*: Triggering restart (destroy/shutdown and immediate init) repeatedly in quick succession.
  - *Expected Behavior*: All Three.js DOM elements and renderers are cleaned up, and a single WebGL context is kept clean.
  - *Actual Behavior*: The `destroySceneResources` handler is fully idempotent due to `resourcesDestroyed` check, preventing double-disposal crashes, and `init` resets the state.
  - *Status*: PASS
- **Infinite Lane Accumulation / Game Over**:
  - *Scenario*: Blocks stack above the allowed height limit.
  - *Expected Behavior*: Scene detects infringement and transitions to GameOver state.
  - *Actual Behavior*: Correctly triggers game-over overlays via `isInfringing()` and `gameOver()`.
  - *Status*: PASS
- **Rapid Keyboard Input / Debounce Check**:
  - *Scenario*: User triggers multiple inputs per frame to rotate the hex.
  - *Expected Behavior*: Debounce logic handles it gracefully without throwing or mismatching local angles.
  - *Actual Behavior*: The 75ms debounce gate restricts rapid execution to stable levels.
  - *Status*: PASS

---

## Unchallenged Areas

- **Phaser Physics Engine integration**: Not challenged, as Hextris uses pure mathematical lane layouts and Three.js translations rather than Phaser Arcade/Matter physics.
