# Handoff Report: Milestone 4 - Pac-Man 3D Maze Instancing & Disposal

## 1. Observation
- **WebGL Buffer Disposal Bug**:
  In `src/scenes/PacManScene.ts` (lines 551-554):
  ```typescript
  const dot = this.dots[dotIdx];
  this.threeScene.remove(dot.mesh);
  dot.mesh.geometry.dispose();
  (dot.mesh.material as THREE.Material).dispose();
  ```
  This is called on every dot eaten, although they share the same global `dotGeo` and `dotMat` instances.

- **Touch Controls Drag Threshold Mismatch**:
  In `src/scenes/PacManScene.ts` (lines 916-920):
  ```typescript
  if (frame.touch.active) {
    const threshold = 18;
    if (Math.abs(frame.gestures.dragVectorX) > Math.abs(frame.gestures.dragVectorY)) {
      if (frame.gestures.dragVectorX > threshold) {
  ```
  In `src/runtime/InputRuntime.ts` (lines 375-376):
  ```typescript
  nextFrame.gestures.dragVectorX = Math.max(-1, Math.min(1, dx / (this.canvas.width / 2)));
  nextFrame.gestures.dragVectorY = Math.max(-1, Math.min(1, dy / (this.canvas.height / 2)));
  ```
  The drag vectors are normalized between `-1.0` and `1.0`.

- **QA State Tracker**:
  In `src/scenes/PacManScene.ts` (line 952):
  ```typescript
  objectiveProgress: this.totalDots > 0 ? (this.totalDots - this.dots.length) / this.totalDots : 1.0,
  ```
  This computes progress using the length of the `dots` array.

---

## 2. Logic Chain
- **WebGL Crash / Resource Disposal**:
  1. `PacManScene.ts` uses single shared geometry (`dotGeo`) and material (`dotMat`) for all dots.
  2. When a dot is eaten, `dot.mesh.geometry.dispose()` is executed.
  3. Disposing the shared geometry frees GPU resources immediately.
  4. Remaining meshes referencing this geometry will render blank or raise WebGL errors.
  5. *Conclusion*: Matrix scaling `(0, 0, 0)` combined with out-of-bounds positioning avoids disposing shared buffers, fixing the crash and rendering remaining dots correctly.

- **Steering Controls**:
  1. Touch dragging in `PacManScene.ts` requires `dragVector` to exceed a threshold of `18`.
  2. `InputRuntime.ts` normalizes `dragVector` between `-1.0` and `1.0`.
  3. The normalized values can never exceed `1.0`, meaning they will never be greater than `18` or less than `-18`.
  4. *Conclusion*: Setting the drag threshold to a normalized ratio (e.g., `0.15`) restores steering touch control functionality.

- **QA Reporting Compliance**:
  1. `PacManScene.ts` returns `dots.length` to track remaining dots.
  2. If instanced meshes are used, dots are not removed from the `dots` array, so `dots.length` stays constant.
  3. *Conclusion*: The QA reporter must query only active dots (e.g., `activeDotsCount` or `dots.filter(d => d.active).length`) to maintain correct state metrics.

---

## 3. Caveats
- Touch-to-swipe gestures (e.g., `frame.gestures.swipeUp`) were assumed to function correctly independently, but drag controls are more robust for steering and must be prioritized.
- Sound tone durations and syntheses were not changed.
- We assumed that `walls` are never modified during gameplay, which is standard for Pac-Man.

---

## 4. Conclusion
Milestone 4 is highly feasible and requires refactoring `PacManScene.ts` to utilize three `THREE.InstancedMesh` nodes (walls, dots, and pellets). This will decrease draw calls from 224 to 3. Hiding eaten dots by scaling to 0 solves a critical WebGL buffer disposal crash. Correcting the touch control threshold to `0.15` fixes broken mobile/drag steering. Modifying QA reporting to check `.active` keeps analytics accurate.

---

## 5. Verification Method
- **Code Review**: Ensure `wallsInstancedMesh`, `dotsInstancedMesh`, and `pelletsInstancedMesh` are properly created and managed.
- **Console Validation**: Verify there are no WebGL context errors (e.g., "Buffer object was not found") in the developer console when Pac-Man eats dots.
- **Control Validation**: Test dragging on a touch-simulated browser view. Dragging in a direction should update `nextDirX`/`nextDirZ` responsive to swipes and holds.
- **QA Metrics Validation**: Verify that calls to `getGameplayStateForQA()` return correctly updating `primaryActionCount` and `objectiveProgress` values as dots are eaten.
