# Handoff Report: 2048 3D Performance & Implementation Investigation

## 1. Observation

Direct observations and evidence from the codebase:

### A. Repetitive Grid Board Slots and Borders
- **File:** `src/scenes/TwoZeroFourEightScene.ts`
- **Lines 482–498 (within `build3DGridBoard()`):**
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

### B. Resource/Asset Disposal (Tile Merges & Shutdown)
- **File:** `src/scenes/TwoZeroFourEightScene.ts`
- **Lines 551–554 (within `syncVisualTilesFromBoard()`):**
  ```typescript
  private syncVisualTilesFromBoard() {
    // Clear existing visual tiles
    this.visualTiles.forEach(vt => this.threeScene.remove(vt.mesh));
    this.visualTiles = [];
  ```
- **Lines 539–546 (within `create3DTileMesh()`):**
  ```typescript
  private create3DTileMesh(value: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(0.88, 0.5, 0.88);
    const sideMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 5 });
    const topMat = new THREE.MeshPhongMaterial({ map: this.getTileTexture(value), flatShading: true, shininess: 5 });

    // Materials map to: right, left, top, bottom, front, back
    const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const mesh = new THREE.Mesh(geo, mats);
  ```
- **Lines 830–840 (within `update()` slide resolution):**
  ```typescript
  this.visualTiles.forEach((vt) => {
    if (vt.mergedIntoId !== undefined) {
      // Remove merging tiles
      this.threeScene.remove(vt.mesh);
      vt.mesh.geometry.dispose();
      if (Array.isArray(vt.mesh.material)) {
        vt.mesh.material.forEach(m => m.dispose());
      } else {
        vt.mesh.material.dispose();
      }
    }
  ```
- **Lines 975–984 (within `destroySceneResources()`):**
  ```typescript
  // 4. Dispose visual tiles mesh geometries & materials
  this.visualTiles.forEach((vt) => {
    this.threeScene.remove(vt.mesh);
    vt.mesh.geometry.dispose();
    if (Array.isArray(vt.mesh.material)) {
      vt.mesh.material.forEach(m => m.dispose());
    } else {
      vt.mesh.material.dispose();
    }
  });
  ```

### C. Touch Gesture and Swiping Controls
- **File:** `src/runtime/InputRuntime.ts`
- **Lines 290–309 (within `detectGesturesOnEnd()`):**
  ```typescript
  private detectGesturesOnEnd(touch: TouchPoint, now: number) {
    const duration = now - touch.startTime;
    const dx = touch.x - touch.startX;
    const dy = touch.y - touch.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (duration < TAP_MAX_MS && dist < TAP_MAX_DIST) {
      ...
    } else if (duration < SWIPE_MAX_MS && dist > SWIPE_MIN_DIST) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.pendingSwipe = dx > 0 ? 'right' : 'left';
      } else {
        this.pendingSwipe = dy > 0 ? 'down' : 'up';
      }
    }
  }
  ```
- **File:** `src/scenes/TwoZeroFourEightScene.ts`
- **Lines 707–710 (within `handleArcadeInput()`):**
  ```typescript
  public handleArcadeInput(frame: ArcadeInputFrame): void {
    if (this.lifecycleState !== 'playing') return;
    if (this.animState !== 'idle') return;
  ```

---

## 2. Logic Chain

1. **Draw Call Overhead:** The grid board is constructed dynamically using a nested loop (`col` 0–3, `row` 0–3) inside `build3DGridBoard()`. For each cell, the scene receives a distinct slot mesh and border line segment. This translates to 16 slot meshes + 16 slot border line segments, totaling 32 distinct geometries, 32 materials, and **32 separate draw calls** to render a static board grid layout.
2. **InstancedMesh Feasibility:** Since the 16 slots share the exact same dimensions `(0.92, 0.02, 0.92)` and material properties (`color: 0x0a0a0a`), they are prime candidates for a single `THREE.InstancedMesh`. For the borders, while `LineSegments` cannot be natively instanced in Three.js, modeling them as wireframe boxes (`wireframe: true`) allows them to be rendered as meshes and instanced in a second `THREE.InstancedMesh`. This reduces the rendering overhead to only **2 draw calls**.
3. **Memory Leaks during Reset:** When a user restarts the game, `resetGameplay()` calls `syncVisualTilesFromBoard()`. In this method, the active `visualTiles` are removed from the scene graph (`this.threeScene.remove(vt.mesh)`), but `.dispose()` is never called on their geometries or materials. Consequently, every tile on the board when the game resets is permanently leaked in GPU memory.
4. **Heap Churn on Tile Creation:** `create3DTileMesh()` constructs a new `BoxGeometry` and a new `sideMat` (for 5 of the 6 box sides) every time a tile is spawned or merged. Since these assets have identical dimensions and attributes, instantiating them dynamically causes excessive garbage collection and unnecessary GPU memory allocation/deallocation overhead.
5. **Swipe Lag and Missed Inputs:** In `InputRuntime.ts`, swipes are only parsed inside `detectGesturesOnEnd()`, which is triggered exclusively during `touchend` and `mouseup`. This creates physical latency, as the action cannot occur until the user lifts their finger. Furthermore, if a gesture takes longer than 500ms (`SWIPE_MAX_MS`), it is silently ignored, leading to missed controls.
6. **Lost Inputs During Animations:** In `TwoZeroFourEightScene.ts`, `handleArcadeInput` discards any swipes received when `this.animState !== 'idle'`. Because the swipe state in the `InputRuntime` frame only persists for a single frame, rapid swiping during tile sliding results in inputs being entirely dropped.

---

## 3. Caveats

- **No Shared Resource Cross-Disposal Issues:** If the implementation is changed to use a single shared geometry and side material for all tiles, the per-tile merge disposal logic must be updated to **only** dispose of the unique `topMat`. Calling `.dispose()` on shared resources will invalidate them for all other active tiles, causing rendering failures.
- **Physical vs Canvas Coordinates:** We assume the canvas size directly scales to match the viewport dimensions (as dictated by `RESIZE` scale mode in Phaser configuration). If this behavior is overridden or nested inside smaller sub-containers, the `SWIPE_MIN_DIST = 40` constant may require adjustment or physical-pixel normalization.

---

## 4. Conclusion

- **Optimization is required:** Implementing instancing, fixing the reset memory leak, and updating touch gesture polling will drastically improve memory consumption, frame consistency (reducing GC spikes), and input responsiveness.
- **Concrete Recommendations:**
  1. Replace the individual slots and borders inside `build3DGridBoard()` with two `THREE.InstancedMesh` instances (one for solid slot bases, one for wireframe neon borders).
  2. Modify `syncVisualTilesFromBoard()` to call `.dispose()` on all geometries and materials of removed tiles to plug the memory leak.
  3. Cache a single shared `BoxGeometry` and `sideMat` at the scene class level. Do not dispose of them during tile merges; only dispose of them on scene shutdown.
  4. Modify `InputRuntime.ts` to detect swipes instantly during `touchmove`/`mousemove` as soon as displacement exceeds `SWIPE_MIN_DIST = 40`, using a boolean flag on the touch object to prevent multi-triggering.
  5. Implement input buffering in `TwoZeroFourEightScene` to capture inputs during tile animations and execute them consecutively when the scene returns to idle.

---

## 5. Verification Method

### Build and Compilation
Verify that the project compiles with no TypeScript or bundling errors:
```bash
npm run build
```

### Automation & QA State Tests
1. Verify the game runs, can slide tiles, and compiles under test environments:
   ```bash
   npm run touch:2048
   ```
2. Inspect the returned QA state to verify correctness:
   Ensure `primaryActionCount` reports the correct tile count and `enemyOrHazardCount` returns the highest merged tile value.
