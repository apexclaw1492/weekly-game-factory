# Detailed Analysis & Recommendations Report: Pac-Man 3D Maze Instancing & Disposal

## 1. Executive Summary
This report analyzes `src/scenes/PacManScene.ts` and its related input modules to plan **Milestone 4: Pac-Man 3D Maze Instancing & Disposal**. The current codebase uses individual `THREE.Mesh` instances for every wall block, dot, and power pellet. This approach causes high CPU-to-GPU draw call overhead and memory fragmentation, particularly on mobile devices.

We recommend replacing individual meshes with three `THREE.InstancedMesh` containers (for walls, dots, and pellets). We will manage eating states by scaling instanced elements to `0` and moving them out of bounds, avoiding resource recreation. Furthermore, we identified a critical bug in the touch-dragging logic where normalized vectors are compared against a pixel-scale threshold, rendering drag controls non-functional. We propose a dynamic-pivot drag steering algorithm to resolve this. Finally, we audit WebGL resource disposal to eliminate memory leaks and ensure the QA state reporter accurately tracks victory conditions.

---

## 2. Technical Findings & Recommendations

### Part 1: Optimization via `THREE.InstancedMesh`
Currently, `PacManScene.ts` instantiates individual meshes for walls, dots, and pellets:
- **Walls**: Lines 288-292 create a new `THREE.Mesh(wallGeo, wallMat)` for every wall node.
- **Dots**: Lines 293-297 create a new `THREE.Mesh(dotGeo, dotMat)` for every dot.
- **Pellets**: Lines 298-302 create a new `THREE.Mesh(pelletGeo, pelletMat)` for every power pellet.

#### Recommendation:
Create three separate `THREE.InstancedMesh` instances during scene build:
1. `wallInstancedMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount)`
2. `dotInstancedMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotCount)`
3. `pelletInstancedMesh = new THREE.InstancedMesh(pelletGeo, pelletMat, pelletCount)`

For static wall instances, positions are set once using a dummy `THREE.Object3D`:
```typescript
const dummy = new THREE.Object3D();
let index = 0;
// loop to position each wall block:
dummy.position.set(x, 0.3, z);
dummy.updateMatrix();
wallInstancedMesh.setMatrixAt(index++, dummy.matrix);
// after loop:
wallInstancedMesh.instanceMatrix.needsUpdate = true;
```

---

### Part 2: Collectible State Tracking (Dot & Pellet Eating)
In the current code, eating a collectible disposes of the geometry/material and removes the mesh from the scene (lines 546-594):
```typescript
const dot = this.dots[dotIdx];
this.threeScene.remove(dot.mesh);
dot.mesh.geometry.dispose();
(dot.mesh.material as THREE.Material).dispose();
this.dots.splice(dotIdx, 1);
```
*Issue*: This is extremely inefficient, disposes shared geometries/materials prematurely, and forces the scene to completely rebuild all entities on reset, causing GC stutter.

#### Recommendation:
1. Keep track of collectible instances in state arrays:
   ```typescript
   interface CollectibleState {
     gridX: number;
     gridZ: number;
     instanceIndex: number;
     eaten: boolean;
   }
   private dotStates: CollectibleState[] = [];
   private pelletStates: CollectibleState[] = [];
   ```
2. When Pacman moves onto a grid cell containing an active collectible, mark it as eaten and update its matrix to hide it:
   ```typescript
   const dummy = new THREE.Object3D();
   dummy.position.set(0, -999, 0); // Move out of bounds
   dummy.scale.set(0, 0, 0);       // Scale to 0
   dummy.updateMatrix();
   this.dotInstancedMesh.setMatrixAt(dotState.instanceIndex, dummy.matrix);
   this.dotInstancedMesh.instanceMatrix.needsUpdate = true;
   ```
3. During `resetGameplay()`, do NOT dispose of any geometries or materials. Simply iterate through the states, reset `eaten = false`, restore positions, set scale back to `1.0`, and update the instanced meshes.

#### Pellet Pulsation:
Power pellets pulsate over time (lines 441-445). Using an instanced mesh, update the matrices of active pellets in the `update()` loop:
```typescript
const pulse = 1.0 + 0.2 * Math.sin(time * 0.008);
const dummy = new THREE.Object3D();
this.pelletStates.forEach((p) => {
  if (!p.eaten) {
    const x = (p.gridX - 7) * CELL_WIDTH;
    const z = (p.gridZ - 7) * CELL_WIDTH;
    dummy.position.set(x, 0.15, z);
    dummy.scale.set(pulse, pulse, pulse);
    dummy.updateMatrix();
    this.pelletInstancedMesh.setMatrixAt(p.instanceIndex, dummy.matrix);
  }
});
this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;
```

---

### Part 3: Clean WebGL Resource Disposal & Memory Management
The current disposal code in `destroySceneResources()` (lines 963-1000) traverses the scene and disposes of materials and geometries, but there are multiple issues:
1. Re-running `buildMaze3D()` in `resetGameplay()` pushes new instances of geometries and materials to `geometriesToDispose` and `materialsToDispose` without ever cleaning up the previous list elements, causing an array-bound leak.
2. Geometry disposal is performed multiple times on shared geometries inside `resetGameplay()`.

#### Recommendation:
Adopt a strict resource lifecycle:
- Create shared geometries and materials *once* in `create()`.
- Store them in dedicated scene properties: `this.wallGeo`, `this.dotGeo`, etc.
- In `resetGameplay()`, do not dispose of anything. Only reset matrices.
- In `destroySceneResources()`, perform clean disposal:
  1. Remove all meshes and instanced meshes from the `threeScene`.
  2. Call `.dispose()` on all geometries and materials stored in scene properties.
  3. Dispose of the `threeRenderer` using `this.threeRenderer.dispose()`.
  4. Nullify all references to allow garbage collection.

---

### Part 4: Touch Controls & Vector Steering Analysis
In `handleArcadeInput` (lines 915-935), touch drag steering is written as:
```typescript
    // Touch dragging
    if (frame.touch.active) {
      const threshold = 18;
      if (Math.abs(frame.gestures.dragVectorX) > Math.abs(frame.gestures.dragVectorY)) {
        if (frame.gestures.dragVectorX > threshold) {
          this.nextDirX = 1;
...
```
- **Critical Bug**: `frame.gestures.dragVectorX` and `dragVectorY` are normalized values in the range `[-1.0, 1.0]` (computed in `InputRuntime.ts:375-376` relative to canvas width/height). Comparing these values to `threshold = 18` is a logic error; the condition will never pass, rendering drag steering completely broken.
- **Usability Limitation**: The drag vector is computed from the fixed touch-down starting point (`startX`, `startY`). To change directions, the user must drag all the way back across the origin.

#### Recommendation:
1. **Option A (Quick Fix)**: Use `frame.touch.dx` and `frame.touch.dy` instead of `dragVectorX`/`dragVectorY` for pixel-based thresholds.
2. **Option B (Dynamic Pivot Steering - Best Practice)**: Introduce local variables to track touch state dynamically:
   ```typescript
   private lastTouchX = 0;
   private lastTouchY = 0;
   ```
   When a touch begins (`frame.touch.justStarted`), set `lastTouchX = frame.touch.x` and `lastTouchY = frame.touch.y`.
   During continuous drag (`frame.touch.active`), measure the delta from the *dynamic pivot*:
   ```typescript
   const dx = frame.touch.x - this.lastTouchX;
   const dy = frame.touch.y - this.lastTouchY;
   const dist = Math.sqrt(dx * dx + dy * dy);
   const steerThreshold = 20; // pixels

   if (dist > steerThreshold) {
     if (Math.abs(dx) > Math.abs(dy)) {
       this.nextDirX = dx > 0 ? 1 : -1;
       this.nextDirZ = 0;
     } else {
       this.nextDirX = 0;
       this.nextDirZ = dy > 0 ? 1 : -1;
     }
     // Shift the pivot to current touch coordinates to allow smooth continuous steering
     this.lastTouchX = frame.touch.x;
     this.lastTouchY = frame.touch.y;
   }
   ```

---

### Part 5: QA Reporting & Interface Contract Audit
The `GameLifecycle` interface contracts are fully satisfied by `PacManScene.ts`. However, the QA state reporting contains a critical inaccuracy.
- **Current implementation of `getGameplayStateForQA()`**:
  - `primaryActionCount` returns `this.dots.length`.
  - `objectiveProgress` is computed using only `dots.length`.
- **Inaccuracy**: The victory condition (line 561) requires eating both all dots and all power pellets:
  ```typescript
  if (this.dots.length === 0 && this.pellets.length === 0) { this.handleVictory(); }
  ```
  If all dots are eaten but power pellets remain, `primaryActionCount` reports `0` (which implies level complete in automated QA suites), but the game state is still active.

#### Recommendation:
Update QA calculations to represent the union of dots and power pellets:
- `primaryActionCount` should be `dotsRemaining + pelletsRemaining`.
- `objectiveProgress` should be `(totalCollectibles - remainingCollectibles) / totalCollectibles`.

---

## 3. Implementation Plan & Proposed Diff

The proposed modifications to `src/scenes/PacManScene.ts` are structured below.

### 3.1 Properties and Setup Changes
```typescript
  // --- Instanced Meshes ---
  private wallInstancedMesh!: THREE.InstancedMesh;
  private dotInstancedMesh!: THREE.InstancedMesh;
  private pelletInstancedMesh!: THREE.InstancedMesh;

  // --- Collection States ---
  private dotStates: CollectibleState[] = [];
  private pelletStates: CollectibleState[] = [];

  // --- Dynamic Touch Pivot ---
  private lastTouchX = 0;
  private lastTouchY = 0;
```

### 3.2 Dynamic Pivot Steering Logic
Replace lines 915-935 in `handleArcadeInput` with:
```typescript
    if (frame.touch.active) {
      if (frame.touch.justStarted) {
        this.lastTouchX = frame.touch.x;
        this.lastTouchY = frame.touch.y;
      }
      
      const dx = frame.touch.x - this.lastTouchX;
      const dy = frame.touch.y - this.lastTouchY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const steerThreshold = 20;

      if (dist > steerThreshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          this.nextDirX = dx > 0 ? 1 : -1;
          this.nextDirZ = 0;
        } else {
          this.nextDirX = 0;
          this.nextDirZ = dy > 0 ? 1 : -1;
        }
        this.lastTouchX = frame.touch.x;
        this.lastTouchY = frame.touch.y;
      }
    }
```

---

## 4. Verification Methods

To verify the implementation of Milestone 4, the following tests should be performed:
1. **WebGL Heap Tracking**: Use Chrome DevTools Memory tab (Heap Snapshots) to track `THREE.WebGLRenderer` and geometry allocations. Re-start the gameplay and return to the hub multiple times to verify that active WebGL buffers do not grow.
2. **Touch Drag Steering Simulation**: Using mobile emulation in DevTools, drag continuously in a circular motion on the canvas. Ensure Pacman turns accurately as the finger shifts, and does not require returning to the start coordinate.
3. **Automated QA Check**: Verify that when only power pellets are left on the board, `getGameplayStateForQA().primaryActionCount` does not return `0`.
