# Handoff Report — Explorer Pac-Man 3

## 1. Observation
- In `src/scenes/PacManScene.ts` (lines 917–919):
  ```typescript
  const threshold = 18;
  if (Math.abs(frame.gestures.dragVectorX) > Math.abs(frame.gestures.dragVectorY)) {
    if (frame.gestures.dragVectorX > threshold) {
  ```
- In `src/runtime/InputRuntime.ts` (lines 375–376):
  ```typescript
  nextFrame.gestures.dragVectorX = Math.max(-1, Math.min(1, dx / (this.canvas.width / 2)));
  nextFrame.gestures.dragVectorY = Math.max(-1, Math.min(1, dy / (this.canvas.height / 2)));
  ```
- In `src/scenes/PacManScene.ts` (lines 551–554):
  ```typescript
  const dot = this.dots[dotIdx];
  this.threeScene.remove(dot.mesh);
  dot.mesh.geometry.dispose();
  (dot.mesh.material as THREE.Material).dispose();
  ```
- In `src/scenes/PacManScene.ts` (line 952):
  ```typescript
  objectiveProgress: this.totalDots > 0 ? (this.totalDots - this.dots.length) / this.totalDots : 1.0,
  ```
- In `src/scenes/PacManScene.ts` (lines 834–852):
  ```typescript
  // Clear all dynamic 3D elements in scene
  this.dots.forEach((d) => {
    this.threeScene.remove(d.mesh);
    d.mesh.geometry.dispose();
    (d.mesh.material as THREE.Material).dispose();
  });
  this.dots = [];
  // ... similar loops for pellets and walls
  ```

---

## 2. Logic Chain
- **Touch Controls are Broken**:
  1. `InputRuntime.ts` normalizes `dragVectorX`/`dragVectorY` to be in the range `[-1.0, 1.0]`.
  2. `PacManScene.ts` checks if these normalized values exceed `threshold = 18`.
  3. A value in `[-1.0, 1.0]` can never exceed 18; therefore, touch dragging fails to trigger any direction steering.
- **Resource Disposal issues**:
  1. The game disposes of the shared `dotGeo` and `dotMat` when the first dot is eaten. Any subsequent dots sharing that geometry/material will refer to a disposed resource.
  2. During `resetGameplay()`, calling `buildMaze3D()` recreates all geometries/materials and pushes them to `geometriesToDispose` and `materialsToDispose` arrays without clearing the previous elements, causing memory leak growth in arrays.
- **QA Reporting is Inaccurate**:
  1. Victory is triggered when both `dots.length === 0` and `pellets.length === 0`.
  2. However, the QA state reporter only tracks `dots.length` in `primaryActionCount` and `objectiveProgress`. If only power pellets remain, the reporter will falsely indicate the level is completed (remaining collectibles = 0).

---

## 3. Caveats
- Touch events were analyzed via static inspection of the runtime input loop. Multi-touch handling (e.g. if the user touches with multiple fingers) is handled at the `InputRuntime` level, but PacMan's scene assumes a single pointer interaction.

---

## 4. Conclusion
1. **Instancing**: Repetitive walls, dots, and power pellets must be optimized into three `THREE.InstancedMesh` instances.
2. **Eating State**: Hiding dots/pellets must be achieved by editing instance matrices (scaling to `0` and shifting coordinates out of bounds) instead of recreating meshes, preventing GC stalls.
3. **Resource Disposal**: WebGL resources (geometries and materials) must be created once during initialization, kept active through game resets, and cleaned up strictly when the scene is destroyed via `destroySceneResources()`.
4. **Touch Dragging**: Steering should be computed using a local dynamic pivot model based on pixel delta (`frame.touch.dx`/`dy`) rather than checking normalized drag vectors against a pixel threshold.
5. **QA Interface**: The QA state reporter needs to combine dots and pellets in its remaining collectible and progress calculations.

---

## 5. Verification Method
- **Verify Touch Drag Controls**: Emulate touch inputs in Chrome DevTools. Check if Pacman responds to dragging and turns instantly when sliding in a new direction.
- **Verify WebGL Memory leak**: Take heap snapshots before and after resetting the game 5 times; confirm that geometry count and WebGL context allocations remain static.
- **Verify QA State**: Run a game, leave only 1 power pellet on the map, and check if `getGameplayStateForQA().primaryActionCount` returns `1`.
