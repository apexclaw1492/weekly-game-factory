# Handoff Report: M1 - 2048 3D Optimization Analysis

This report is prepared by the Explorer for the Implementer to carry out Milestones 1 & 5. It contains a read-only architectural investigation and concrete optimization recommendations for 2048 3D in Weekly Game Factory (WGF).

---

## 1. Observation

### 3D Rendering & Slots (Line-by-Line Evidence)
- **Path:** `/Users/apexclaw/Projects/weekly-game-factory/src/scenes/TwoZeroFourEightScene.ts`
- **Lines 482-498 (`build3DGridBoard()`):**
  ```typescript
      // 16 slots
      for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
          const slotGeo = new THREE.BoxGeometry(0.92, 0.02, 0.92);
          const slotMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, flatShading: true });
          const slotMesh = new THREE.Mesh(slotGeo, slotMat);
          const pos = this.getCell3DPosition(col, row);
          slotMesh.position.set(pos.x, 0.01, pos.z);
          this.threeScene.add(slotMesh);

          // Subtly lit neon borders on slots
          const slotEdges = new THREE.EdgesGeometry(slotGeo);
          const slotLine = new THREE.LineSegments(slotEdges, new THREE.LineBasicMaterial({ color: 0x00c805, opacity: 0.18, transparent: true }));
          slotLine.position.set(pos.x, 0.01, pos.z);
          this.threeScene.add(slotLine);
        }
      }
  ```
  *Direct Observation:* Inside a double loop running 16 times, a new `BoxGeometry`, `MeshPhongMaterial`, `EdgesGeometry`, and `LineBasicMaterial` are instantiated. This creates 16 separate slot meshes and 16 separate line segments, causing **32 draw calls** for a static board grid.

### Resource Disposal & Memory Leaks (Line-by-Line Evidence)
- **Path:** `/Users/apexclaw/Projects/weekly-game-factory/src/scenes/TwoZeroFourEightScene.ts`
- **Lines 551-554 (`syncVisualTilesFromBoard()`):**
  ```typescript
    private syncVisualTilesFromBoard() {
      // Clear existing visual tiles
      this.visualTiles.forEach(vt => this.threeScene.remove(vt.mesh));
      this.visualTiles = [];
  ```
  *Direct Observation:* The tile meshes are removed from the scene and discarded from the `visualTiles` array, but their geometries and materials are **never** disposed.
- **Lines 539-543 (`create3DTileMesh()`):**
  ```typescript
    private create3DTileMesh(value: number): THREE.Mesh {
      const geo = new THREE.BoxGeometry(0.88, 0.5, 0.88);
      const sideMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 5 });
      const topMat = new THREE.MeshPhongMaterial({ map: this.getTileTexture(value), flatShading: true, shininess: 5 });
  ```
  *Direct Observation:* Every visual tile creates its own `BoxGeometry` and materials, leading to high garbage collection churn during tile merges.

### Touch Controls & Input Responsiveness (Line-by-Line Evidence)
- **Path:** `/Users/apexclaw/Projects/weekly-game-factory/src/runtime/InputRuntime.ts`
- **Lines 150 & 177 (`onTouchStart()` and `onTouchMove()`):**
  ```typescript
      if (e.touches.length >= 2) e.preventDefault();
  ```
  *Direct Observation:* Standard page scroll prevention (`preventDefault`) is only called on multi-touch inputs. Single-finger swipes are left unprevented, which allows page panning and bounce.
- **Lines 189-201, 290-309 (`onTouchEnd()` / `onMouseUp()` / `detectGesturesOnEnd()`):**
  ```typescript
    private onTouchEnd = (e: TouchEvent) => {
      ...
          this.detectGesturesOnEnd(touch, now);
    };
  ```
  *Direct Observation:* Swipe gestures are only evaluated at `touchend` and `mouseup`. The user has to lift their finger to trigger the slide.
- **Path:** `/Users/apexclaw/Projects/weekly-game-factory/src/scenes/TwoZeroFourEightScene.ts`
- **Lines 708-709 & 585-586 (`handleArcadeInput()` & `executeMove()`):**
  ```typescript
    public handleArcadeInput(frame: ArcadeInputFrame): void {
      if (this.lifecycleState !== 'playing') return;
      if (this.animState !== 'idle') return;
  ```
  *Direct Observation:* Inputs are ignored if they are received while an animation (sliding/merging) is active. Slide (150ms) and pop (120ms) animations total 270ms of swallowed inputs.

---

## 2. Logic Chain

1. **Slots Instancing:** Since all 16 slots are visually and structurally identical, they can be represented by a single `THREE.InstancedMesh(geometry, material, 16)`. By combining the slots into an instanced mesh, Three.js renders all of them in a single draw call. Adding a slot texture with a border allows combining slots and borders into **1 draw call** instead of 32.
2. **Disposal Leak:** When `resetGameplay()` is called, `syncVisualTilesFromBoard()` removes old tile meshes from the scene, but because it doesn't call `.dispose()` on their geometry and materials, the WebGL memory remains allocated. This leads to a cumulative memory leak. Disposing these assets before clearing the array fixes the leak.
3. **Allocation Churn:** Creating unique geometries/materials for every tile created/merged generates GPU resource overhead and causes garbage collection stutters. Sharing a single geometry and caching materials by tile value resolves this latency.
4. **Touch Input Lag:** Because `InputRuntime` only evaluates swipes on `touchend`, there is a delay equal to the touch-drag duration. Evaluating displacement during `touchmove` and firing once `dist > SWIPE_MIN_DIST` makes swipes feel instantaneous.
5. **Swallowed Inputs:** Since sliding and popping animations take 270ms, fast keyboard/touch play will swallow inputs during this window. Implementing an input queue that buffers the last move direction and processes it immediately once `animState` returns to `idle` restores responsiveness.

---

## 3. Caveats

- We investigated the source code in a read-only fashion. No changes were applied or tested in a live browser.
- Multi-game impact: Modifying `InputRuntime.ts` changes swipe behavior for all games (Pac-Man, Clumsy Bird, Hextris). Test coverage must verify that other games are unaffected by the input runtime updates.

---

## 4. Conclusion

The 2048 3D performance and implementation can be optimized with:
1. **Instancing:** Rebuilding `build3DGridBoard` to use a single `THREE.InstancedMesh` for slot bases, and integrating slot outlines into the slot texture to reduce draw calls from 32 to 1.
2. **Memory Leak Fix:** Disposing of retired visual tile geometries/materials in `syncVisualTilesFromBoard()` on resets.
3. **Geometry/Material Sharing:** Reusing a single `BoxGeometry` and caching materials by tile value instead of re-creating them.
4. **Gesture Optimization:** Detecting swipes instantly during `touchmove` and calling `preventDefault()` on single-finger touch moves.
5. **Input Queueing:** Queueing a single movement direction during animations and executing it instantly when the board returns to `idle`.

---

## 5. Verification Method

To verify the optimizations after they are implemented:
1. **Draw Call count:** Inspect `renderer.info.render.calls` before and after. The draw calls for the empty board should drop from 34 to 3 (renderer overhead, board base, slots).
2. **Memory leak check:** Open Chrome DevTools, capture a heap snapshot, click "Reset" 10 times, and take another snapshot. Verify that the count of `BoxGeometry` and `MeshPhongMaterial` objects has not increased.
3. **Input Lag test:** Run `npm run touch:2048` and playtest the game on a mobile viewport. Perform rapid swipes and swipe-and-hold gestures. Ensure swipes execute immediately when the gesture starts and that inputs are not swallowed.
