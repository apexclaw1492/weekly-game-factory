# 2048 3D Performance Optimization Analysis

This report documents the performance bottlenecks, memory management leaks, and touch control responsiveness issues found in `src/scenes/TwoZeroFourEightScene.ts` and `src/runtime/InputRuntime.ts`. It provides verified evidence chains (referencing specific line numbers) and recommends a concrete, non-destructive optimization strategy.

---

## 1. 3D InstancedMesh Implementation Analysis

### Direct Observations & Draw Call Bottlenecks
In the current implementation of the 3D board background grid, every slot and slot outline is generated as a separate `THREE.Mesh` and `THREE.LineSegments` object in a nested loop.
- **Evidence (Lines 482-498):**
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

- **Draw Call Overhead:** This loop creates 16 slots (meshes) and 16 slot borders (line segments). This creates **32 draw calls** in Three.js and instantiates 16 identical `BoxGeometry` objects, 16 identical `MeshPhongMaterial` objects, 16 identical `EdgesGeometry` objects, and 16 identical `LineBasicMaterial` objects. This is a severe CPU/GPU bottleneck and memory overhead for rendering a static 4x4 grid.

### InstancedMesh Implementation Strategy
To reduce the static board rendering overhead from 32 draw calls to **1 or 2 draw calls**, we should utilize `THREE.InstancedMesh`.

1. **Optimize Slots Base (1 Draw Call):**
   - Allocate **one** single `THREE.BoxGeometry(0.92, 0.02, 0.92)` and **one** single `THREE.MeshPhongMaterial` outside of the loop.
   - Create a `THREE.InstancedMesh(geometry, material, 16)` representing all 16 slots.
   - Iterate and apply the translation matrix to each instance via `instancedMesh.setMatrix(index, matrix)`.

2. **Optimize Neon Borders (1 Draw Call or Integrated):**
   - **Method A (Integrated - 1 Draw Call total):** Rather than drawing borders as a separate line segments object, create a single 128x128 canvas-based `THREE.CanvasTexture` representing the slot (a dark center with a neon green outline). Apply this texture to the `InstancedMesh` material. This eliminates the slot borders entirely, combining slots and outlines into a single draw call.
   - **Method B (Separate Line Merging - 2 Draw Calls total):** Standard `THREE.InstancedMesh` only accepts `THREE.Mesh` objects and does not support line objects like `LineSegments`. If separate line objects are necessary, merge all 16 `EdgesGeometry` instances using `BufferGeometryUtils.mergeGeometries` into a single `BufferGeometry` and render it using a single `THREE.LineSegments` mesh.

---

## 2. Resource Disposal and Memory Leaks

### Memory Leaks Found
Two significant memory leaks and memory churn patterns were identified:

#### Leak A: Visual Tile Re-creation Leak (Critical)
When resetting the game board, all active tile meshes are cleared and recreated, but their underlying geometries and materials are never disposed.
- **Evidence (Lines 551-554):**
```typescript
  private syncVisualTilesFromBoard() {
    // Clear existing visual tiles
    this.visualTiles.forEach(vt => this.threeScene.remove(vt.mesh));
    this.visualTiles = [];
```
- **Consequence:** The meshes are removed from the scene graph but their WebGL buffers for geometry and materials remain allocated in GPU memory. Every reset or restart leaks multiple geometries and materials.

#### Leak B: Geometry and Material Churn on Creation (Performance Overhead)
In `create3DTileMesh`, geometries and materials are allocated dynamically for every single tile, causing constant allocation and disposal overhead on merges.
- **Evidence (Lines 539-543):**
```typescript
  private create3DTileMesh(value: number): THREE.Mesh {
    const geo = new THREE.BoxGeometry(0.88, 0.5, 0.88);
    const sideMat = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 5 });
    const topMat = new THREE.MeshPhongMaterial({ map: this.getTileTexture(value), flatShading: true, shininess: 5 });
```
- **Consequence:** During active gameplay, every merge deletes two tiles (disposing their individual geometries/materials) and creates a new tile (allocating new geometries/materials). This triggers garbage collection pressure, leading to frame stutters.

### Recommendations for Disposal and Cache Optimization
1. **Fix Leak A (Tile Clear):** Update `syncVisualTilesFromBoard` to dispose of geometries and materials of `this.visualTiles` prior to clearing the array.
2. **Reuse Geometries and Materials:**
   - Define a single shared tile geometry (`this.sharedTileGeometry = new THREE.BoxGeometry(0.88, 0.5, 0.88)`).
   - Define a single shared side material (`this.sharedSideMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 5 })`).
   - Create a `materialCache` for the tile face materials (topMat) keyed by value.
3. **Skip Dynamic Disposal:** By sharing geometries and materials, we do not need to dispose of them during tile merges (only remove the mesh from the scene). Disposing of them is done once when the scene shuts down (`destroySceneResources()`).
4. **Explicit Asset Cleanup:** In `destroySceneResources()`, explicitly call `.dispose()` on all cached and shared geometries/materials and null out variables (e.g. `this.threeRenderer = null!`) to assist the garbage collector.

---

## 3. Touch Controls (Swiping) and Responsiveness

Three major issues were identified in the swipe input pipeline, affecting responsiveness and gameplay feel.

### Issue 1: Default Scroll Prevention is Incomplete
If the user swipes with a single finger on a mobile device, the browser may perform a default page bounce/scroll, which cancels touch events and interrupts gameplay.
- **Evidence (InputRuntime.ts, Lines 150 & 177):**
```typescript
    if (e.touches.length >= 2) e.preventDefault();
```
- **Consequence:** `e.preventDefault()` is only invoked on multi-touch inputs. Single-finger swipes are left to the browser's default behavior.
- **Correction:** Call `e.preventDefault()` on single-finger touch moves if the game is active, or ensure that `touch-action: none` is applied to both the Phaser and Three.js canvas elements via CSS (which is currently defined in `index.html` globally).

### Issue 2: Swipe Gesture Delay (Detected only on TouchEnd)
Swipes are currently detected only when the user *releases* their finger.
- **Evidence (InputRuntime.ts, Lines 189-201, 290-309):**
```typescript
  private onTouchEnd = (e: TouchEvent) => {
    ...
        this.detectGesturesOnEnd(touch, now);
  };
```
- **Consequence:** If a user performs a long swipe or keeps their finger on the screen after swiping, the game does not react until the finger is lifted. This causes a noticeable input lag.
- **Correction:** Perform swipe detection inside `onTouchMove` / `onMouseMove`. When the displacement exceeds `SWIPE_MIN_DIST` and time is under `SWIPE_MAX_MS`, immediately trigger the action. Set a `hasSwiped = true` flag on the touch point to prevent repeated firing, and reset it in `onTouchEnd`.

### Issue 3: Inputs Discarded During Active Animations (Swallowed Swipes)
Swipes or arrow key presses are ignored if they happen while a slide or merge animation is playing.
- **Evidence (TwoZeroFourEightScene.ts, Lines 708-709 & 585-586):**
```typescript
  public handleArcadeInput(frame: ArcadeInputFrame): void {
    if (this.lifecycleState !== 'playing') return;
    if (this.animState !== 'idle') return;
```
- **Consequence:** Sliding (150ms) plus popping (120ms) totals 270ms. Any key presses or swipes made during this 270ms window are lost. This makes rapid swiping/pressing feel unresponsive.
- **Correction:** Implement a buffer parameter (e.g. `this.queuedDirection: number | null = null`). If an input arrives while `this.animState !== 'idle'`, save it. When the animation transitions back to `'idle'` in `update()`, check the queue and execute the move instantly.

---

## 4. Concrete Optimization Plan

Below is a proposed non-destructive refactoring plan that the implementer can safely apply:

### Plan 1: Slots Instancing
- Declare `private slotInstancedMesh: THREE.InstancedMesh`.
- In `build3DGridBoard()`, instantiate `THREE.InstancedMesh` with 16 instances.
- Pre-generate a 128x128 texture containing a border and apply it to a single shared `MeshPhongMaterial`.
- Position instances using matrices in a single loop, then add the `InstancedMesh` to the scene.

### Plan 2: Tile Resource Sharing & Disposal Fix
- Store single instances of tile geometry and side materials as private fields on the scene class.
- Implement a `tileMaterialCache: { [key: number]: THREE.MeshPhongMaterial }` to reuse top materials.
- In `syncVisualTilesFromBoard()`, prior to clearing the array, run a loop that removes tile meshes from the scene, and if we are not sharing materials/geometries, disposes them. If we are sharing them, we only dispose them on `destroySceneResources()`.
- In `destroySceneResources()`, explicitly dispose of all shared geometries and materials, and clear out the material cache.

### Plan 3: Responsive Swipe & Input Queueing
- Add `private queuedDirection: number | null = null` to `TwoZeroFourEightScene`.
- In `handleArcadeInput`, if `this.animState !== 'idle'`, store the direction in `this.queuedDirection`.
- In `update()`'s animation complete block (line 917), check if `this.queuedDirection !== null`. If so, execute it immediately.
- Optimize `InputRuntime.ts` to detect swipes in `onTouchMove` instead of waiting for `onTouchEnd`.
