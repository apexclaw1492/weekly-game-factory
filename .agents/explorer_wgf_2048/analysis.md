# 2048 3D Optimization Analysis Report

This report analyzes the performance bottlenecks, resource disposal mechanisms, and touch gesture responsiveness of the 3D 2048 game in the Weekly Game Factory project.

---

## 1. InstancedMesh Implementation Strategy

### Direct Observations & Evidence Chain
- **File:** `src/scenes/TwoZeroFourEightScene.ts`
- **Lines 482–498:** 
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

### Analysis of Current Issues
- The current implementation instantiates **16 separate instances** of `BoxGeometry`, `MeshPhongMaterial`, and `Mesh` for the background grid slots.
- It also instantiates **16 separate instances** of `EdgesGeometry`, `LineBasicMaterial`, and `LineSegments` for the neon borders.
- This creates 32 individual geometries, 32 materials, and results in **32 separate draw calls** for the grid layout alone.

### Recommended Strategy
1. **Slots Instancing:** Rebuild the background slots using a single `THREE.InstancedMesh`.
   - Instantiate one `BoxGeometry(0.92, 0.02, 0.92)` and one `MeshPhongMaterial`.
   - Initialize `THREE.InstancedMesh(geometry, material, 16)`.
   - Loop and set the transform matrix for each cell index using `instancedMesh.setMatrixAt(index, matrix)`.
   - Result: Reduces 16 draw calls for background slots to **1 draw call**.
2. **Neon Borders Instancing:** Three.js `LineSegments` do not natively support instancing via `InstancedMesh`.
   - **Alternative:** Represent the neon borders as thin wireframe meshes instead of line segments.
   - Use `THREE.BoxGeometry(0.93, 0.025, 0.93)` with `THREE.MeshBasicMaterial({ color: 0x00c805, wireframe: true, transparent: true, opacity: 0.18 })`.
   - Instantiate a second `THREE.InstancedMesh` with a count of 16 for these borders.
   - Result: Reduces 16 border draw calls to **1 draw call**, bringing the entire grid layout down to just **2 draw calls**.

---

## 2. Resource Disposal & Memory Leak Auditing

### Direct Observations & Evidence Chain
- **File:** `src/scenes/TwoZeroFourEightScene.ts`
- **Lines 551–554 (Mesh removal in sync):**
  ```typescript
  private syncVisualTilesFromBoard() {
    // Clear existing visual tiles
    this.visualTiles.forEach(vt => this.threeScene.remove(vt.mesh));
    this.visualTiles = [];
  ```
- **Lines 539–549 (Mesh creation):**
  ```typescript
  private create3DTileMesh(value: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(0.88, 0.5, 0.88);
    const sideMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 5 });
    const topMat = new THREE.MeshPhongMaterial({ map: this.getTileTexture(value), flatShading: true, shininess: 5 });

    // Materials map to: right, left, top, bottom, front, back
    const mats = [sideMat, sideMat, topMat, sideMat, sideMat, sideMat];
    const mesh = new THREE.Mesh(geo, mats);
  ```
- **Lines 975–984 (Shutdown cleanup of visual tiles):**
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

### Analysis of Current Issues
1. **Critical Memory Leak on Reset:** In `syncVisualTilesFromBoard()`, tiles are removed from the scene and the array is cleared, but **none of the geometries or materials are disposed**. When `resetGameplay()` is triggered (on starting a new game), all active tiles from the previous run are permanently leaked in GPU memory.
2. **Redundant Allocations on Tile Spawn:** Every time `create3DTileMesh` is called:
   - A new `BoxGeometry` is allocated (even though dimensions are always `0.88, 0.5, 0.88`).
   - A new `MeshPhongMaterial` is allocated for `sideMat` (even though it's always color `0x111111` with the same properties).
   - This creates unnecessary GC churn and extra WebGL state compilation overhead.
3. **Double Disposal Risks / Shared References:** If we share the `sideMat` or `BoxGeometry` to fix the redundant allocations, we must update the disposal logic. Disposing of shared assets per-mesh in `vt.mesh.geometry.dispose()` or `m.dispose()` on tile merge will break other active tiles that reference the same shared asset.
4. **Scene Graph Pollution:** During `destroySceneResources()`, traversed meshes are disposed, but they are not explicitly detached/removed from the scene object (`this.threeScene.remove(mesh)` is not called for the grid board or outlines).

### Recommended Strategy
1. **Fix Leak in syncVisualTilesFromBoard:** Update it to properly dispose of the geometry and materials of all meshes in `this.visualTiles` before clearing the array.
2. **Implement Asset Caching (Flyweight Pattern):**
   - Create class-level references `this.tileGeometry = new THREE.BoxGeometry(0.88, 0.5, 0.88)` and `this.tileSideMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 5 })` inside `create()`.
   - In `create3DTileMesh()`, reuse `this.tileGeometry` and `this.tileSideMaterial`. Only instantiate `topMat` uniquely because it depends on the tile texture.
   - Modify tile disposal logic (on merge/reset) to **only** dispose of the unique `topMat` (index 2 of the material array). Do not call `.dispose()` on the shared geometry or shared side materials.
   - Properly dispose of the shared `this.tileGeometry` and `this.tileSideMaterial` inside `destroySceneResources()`.
3. **Clean Scene Graph Detachment:** In `destroySceneResources()`, empty `this.threeScene` by calling `this.threeScene.remove(child)` for all child objects, and set references to `null` to ensure GC can reclaim the memory.

---

## 3. Touch Gesture (Swipe) Controls Responsiveness

### Direct Observations & Evidence Chain
- **File:** `src/runtime/InputRuntime.ts`
- **Lines 290–309 (Gesture detection on touch end):**
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
- **Lines 707–710 (Input mapping check):**
  ```typescript
  public handleArcadeInput(frame: ArcadeInputFrame): void {
    if (this.lifecycleState !== 'playing') return;
    if (this.animState !== 'idle') return;
  ```

### Analysis of Current Issues
1. **Latency due to Release Requirement:** Swipe detection only runs in `detectGesturesOnEnd`, which is called during the `touchend` and `mouseup` events. This forces users to physically lift their finger before any slide command is triggered, adding significant delay.
2. **Ignored Fast/Slow Swipes:** Because of the strict time limit `duration < SWIPE_MAX_MS` (500ms), if a user starts a swipe but hesitates or leaves their finger stationary for a fraction of a second before lifting, the gesture is completely ignored.
3. **Lost Inputs During Animations:** If a user swipes while the tiles are sliding or popping (`this.animState !== 'idle'`), the input is queried in `handleArcadeInput` but immediately discarded. Because `pendingSwipe` is cleared on the very next frame, the swipe is lost forever, making fast gameplay feel buggy or non-responsive.

### Recommended Strategy
1. **Instant Swipe Detection on Move:**
   - Detect swipes during `onTouchMove` (and `onMouseMove`) rather than waiting for `onTouchEnd`.
   - Track if a swipe has already been triggered for the current touch via a flag `touch.swipeTriggered = true`.
   - As soon as the finger moves past `SWIPE_MIN_DIST` (40px) and `touch.swipeTriggered` is false:
     - Determine the dominant direction.
     - Queue the swipe.
     - Set `touch.swipeTriggered = true`.
   - This eliminates the `touchend` release latency and removes the strict duration timeout constraint.
2. **Input Buffering in Scene:**
   - Add a class-level variable `private bufferedDirection: number | null = null` in `TwoZeroFourEightScene`.
   - In `handleArcadeInput`, if `this.animState !== 'idle'`, store the input direction in `this.bufferedDirection` instead of discarding it.
   - In the `update()` loop, when the animations finish and `this.animState` returns to `idle`, check if `this.bufferedDirection !== null`. If so, execute the move immediately and reset the buffer.
   - This guarantees that fast swiping inputs are never lost and execute consecutively.
