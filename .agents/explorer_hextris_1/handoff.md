# Hextris 3D Block Instancing & Disposal Strategy (Milestone 3)

## 1. Observation
From our code analysis of `src/scenes/HextrisScene.ts` and associated project files:

### Block Geometry and Material Issues:
- **Continuous CPU/GPU Churn**:
  During the update loop, the geometry of falling blocks is disposed and recreated *on every single animation frame* in `updateGameLogic()` (lines 767-768):
  ```typescript
  // Update block geometry size dynamically while falling
  const width = 2 * block.distFromHex / Math.sqrt(3);
  const widthWide = 2 * (block.distFromHex + block.height) / Math.sqrt(3);
  block.mesh.geometry.dispose();
  block.mesh.geometry = this.createBlockGeometry(width, widthWide, block.height);
  ```
  This also happens when a block settles in `addBlockToHex()` (lines 860-861):
  ```typescript
  block.mesh.geometry.dispose();
  block.mesh.geometry = this.createBlockGeometry(width, widthWide, block.height);
  ```
  Creating `THREE.ExtrudeGeometry` on the CPU dynamically is a heavy operation that triggers garbage collection and WebGL buffer re-allocations.
- **Lack of Mesh Batching / High Draw Calls**:
  Each block has its own unique `THREE.Mesh` and `THREE.MeshStandardMaterial` instance created in `createBlockMesh()` (lines 538-547), preventing WebGL batching and resulting in one draw call per block.
- **Resource Disposal Leaks**:
  In `destroySceneResources()` (lines 1025-1037), the scene only disposes dynamic block meshes. Multiple static geometries and materials created in `initThree()` are leaked:
  - `hexGeom` (CylinderGeometry)
  - `hexMat` (MeshStandardMaterial)
  - `edges` (EdgesGeometry)
  - `lineMat` (LineBasicMaterial)
  - `ringGeom` (CylinderGeometry)
  - `ringEdges` (EdgesGeometry)
  - `ringMat` (LineBasicMaterial)

### Touch Controls Implementation:
- In `handleArcadeInput()` (lines 626-633), lateral taps are evaluated as follows:
  ```typescript
  // 3. Lateral Taps
  if (frame.gestures.tap) {
    const { width } = this.scale;
    if (frame.touch.x < width / 2) {
      this.rotateHex(1);
    } else {
      this.rotateHex(-1);
    }
  }
  ```
  This rotates the hexagon left (`rotateHex(1)`) or right (`rotateHex(-1)`) depending on which half of the screen width was tapped.

---

## 2. Logic Chain
1. **Instancing Solution**:
   - The Hextris board has 6 lanes and a maximum of 8 rows of blocks, forming 48 grid slots.
   - For **settled blocks**, the radial distance of each row is completely static: `distFromHex = inradius + row * height`.
   - Therefore, we can pre-create exactly 8 geometries (one for each row) and instantiate them using 8 `THREE.InstancedMesh` instances of size 6 (one per row, parented to the central hexagon mesh `this.mainHex.mesh` so they automatically inherit the hexagon's rotation).
   - By default, all 6 instances in each row are scaled to 0 (hidden). When a block settles at `(lane, row)`, its matrix is updated to scale 1 (local position/rotation are constant for each lane), and its color is set via `InstancedMesh.setColorAt()`.
   - For **falling blocks**, we can use a separate `THREE.InstancedMesh` (or a single `THREE.Mesh` with a reference geometry scaled to approximate the trapezoid width as it falls, avoiding any geometry recreation).
2. **WebGL Disposal**:
   - Since `InstancedMesh` reuses a single geometry and material, when clearing blocks we do not dispose geometries/materials; we just scale them to 0 and call `needsUpdate = true`.
   - When the scene is shut down (in `destroySceneResources()`), we must cleanly call `.dispose()` on all 8 `InstancedMesh` geometries and materials, the falling block geometry/material, and the static hexagon and combo ring assets.
3. **Touch Input**:
   - Tap and swipe controls are already fully routed through the normalized `ArcadeInputFrame` system. Taps are mapped to screen halves correctly using `this.scale.width / 2`.

---

## 3. Caveats
- **Clear Animation (Fade-out)**: Since all instances in an `InstancedMesh` share a single material, updating material opacity would fade *all* blocks in that row.
  - *Mitigation A (Preferred)*: Implement a custom shader via `onBeforeCompile` to support a per-instance `instanceOpacity` float attribute.
  - *Mitigation B (Alternative)*: Animate the scale of the instance (shrinking it to 0) during clears instead of fading opacity, which requires no custom shader work and feels very responsive.
- **Continuous Falling Geometry**:
  - *Mitigation*: While falling, scaling a reference trapezoid geometry is visually acceptable because the block falls quickly. Alternatively, a custom vertex shader can warp a unit box into a perfect trapezoid based on a radius attribute.

---

## 4. Conclusion
To implement Milestone 3, we recommend:
1. **Initialize Instanced Meshes**: Define an array of 8 `THREE.InstancedMesh`es in `initThree()`, parented to `this.mainHex.mesh`. Pre-calculate the static geometries and local matrices for the 6 lanes.
2. **Update Block Lifecycle**:
   - Set instance scales to 0 by default.
   - On block settlement: set corresponding instance matrix scale to 1, apply color, and call `instanceMatrix.needsUpdate = true`.
   - On block clears: shrink scale to 0 (or animate scale/opacity) and mark for update.
3. **Disposal Fix**: Explicitly dispose `hexGeom`, `hexMat`, `edges`, `lineMat`, `ringGeom`, `ringEdges`, `ringMat`, and all `InstancedMesh` resources in `destroySceneResources()`.
4. **Touch Controls**: The current tap/swipe/drag logic is correct and requires no modification.

---

## 5. Verification Method
1. **Build Compilation**: Run `npm run build` to verify there are no TypeScript compile errors.
2. **Smoke and Touch Tests**: Run `npm run touch:hextris` and `npm run smoke` to verify that rotations and gameplay function correctly under the new instanced model.
3. **WebGL Leak Audit**: Monitor memory usage and GPU buffers in the browser developer tools to ensure `renderer.info.memory` drops to zero after scene destruction.
