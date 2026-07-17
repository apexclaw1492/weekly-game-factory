# Handoff Report: Hextris 3D Block Instancing & Disposal Strategy (Milestone 3)

## 1. Observation
From investigating `/Users/apexclaw/Projects/weekly-game-factory/src/scenes/HextrisScene.ts`, the following patterns were directly observed:

### A. Individual Mesh & Geometry Recreation for Blocks
In `addNewBlock` (lines 522-531) and `createBlockMesh` (lines 533-559), every spawned block is created as an individual `THREE.Mesh` with its own geometry and material:
```typescript
  public addNewBlock(fallingLane: number, color: string, speed: number) {
    const startDist = this.settings.startDist * this.settings.scale;
    const block = new LogicalBlock(fallingLane, color, speed * this.settings.speedModifier, startDist, this.settings.blockHeight);

    // Create block mesh
    block.mesh = this.createBlockMesh(block);
    this.threeScene.add(block.mesh);

    this.fallingBlocks.push(block);
  }
```

In `createBlockGeometry` (lines 561-581), an `ExtrudeGeometry` is constructed using shape paths based on the block's current inner and outer widths:
```typescript
  private createBlockGeometry(width: number, widthWide: number, height: number): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    // Centered trapezoid outline
    shape.moveTo(-width / 2, -height / 2);
    ...
    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center();
    return geom;
  }
```

In `updateGameLogic` (lines 754-769), the geometry for all falling blocks is disposed and recreated **every frame** to adjust their widths dynamically as they slide inward:
```typescript
    // Update Three.js positions for falling blocks
    for (const block of this.fallingBlocks) {
      const angleRad = (90 - (30 + 60 * block.fallingLane)) * Math.PI / 180;
      ...
      // Update block geometry size dynamically while falling
      const width = 2 * block.distFromHex / Math.sqrt(3);
      const widthWide = 2 * (block.distFromHex + block.height) / Math.sqrt(3);
      block.mesh.geometry.dispose();
      block.mesh.geometry = this.createBlockGeometry(width, widthWide, block.height);
    }
```

When a block settles on the central hexagon in `addBlockToHex` (lines 852-870), it is reparented to `mainHex.mesh` and its geometry is recreated one final time to align with the grid:
```typescript
    // Parent to central hexagon mesh so it moves/rotates with it
    this.threeScene.remove(block.mesh);
    this.mainHex.mesh.add(block.mesh);

    // Apply finalized, static block size
    const width = 2 * block.distFromHex / Math.sqrt(3);
    const widthWide = 2 * (block.distFromHex + block.height) / Math.sqrt(3);

    block.mesh.geometry.dispose();
    block.mesh.geometry = this.createBlockGeometry(width, widthWide, block.height);
```

### B. Block Clearing and Disposal
When blocks are cleared via matching in the update loop (lines 704-716), individual meshes, geometries, and materials are disposed on the fly:
```typescript
        if (block.deleted === 2) {
          // Dispose resources
          if (block.mesh) {
            this.mainHex.mesh.remove(block.mesh);
            if (block.mesh.geometry) block.mesh.geometry.dispose();
            if (block.mesh.material) {
              if (Array.isArray(block.mesh.material)) {
                block.mesh.material.forEach(m => m.dispose());
              } else {
                block.mesh.material.dispose();
              }
            }
          }
```
This is also replicated on scene transitions or reset in `clearThreeScene` (lines 1039-1074).

### C. Touch Controls Implementation
Touch lateral taps are handled in `handleArcadeInput` (lines 625-633):
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
In addition, drag gestures are processed based on the horizontal displacement threshold (40px) relative to `dragStartX` (lines 635-653).

---

## 2. Logic Chain
1. **Inefficient Geometry Lifecycle**: Recreating an `ExtrudeGeometry` (which involves calculating custom shape outlines and tessellation) on every frame for all falling blocks, and then again upon settling, results in massive memory garbage creation and frequent GC pauses.
2. **Discrete Row Structures**: Once blocks settle on the hexagon, they are stacked in discrete rows (from row 0 to row 7) corresponding to fixed distances:
   $$d(row) = \text{inradius} + row \times \text{blockHeight}$$
   Therefore, we only have exactly 8 distinct geometries for settled blocks.
3. **Applying InstancedMesh to Settled Blocks**: Instead of rendering up to 48 individual `THREE.Mesh` objects for settled blocks, we can pre-create the 8 geometries corresponding to the 8 rows, and initialize 8 instances of `THREE.InstancedMesh` (one per row, each having a capacity of 6, since there are 6 lanes).
4. **Per-Instance Coloring**: We can use a single shared material across all 8 `InstancedMesh` objects. We can color individual settled blocks dynamically using `InstancedMesh.setColorAt(laneIndex, color)` with one of the 4 block colors.
5. **Visibility Management**: Since each lane represents a specific instance index (0 to 5) in a row's `InstancedMesh`, we can toggle block presence by setting its instance matrix to scale 0 (invisible) or scale 1 (visible), followed by setting `instanceMatrix.needsUpdate = true`.
6. **Optimizing Falling Blocks**:
   * *Option A (Mesh with Scaling)*: Since there are at most 6 falling blocks concurrently, we can use a standard `THREE.Mesh` for them but avoid geometry recreation by using a single base geometry of thickness 15 and scaling it horizontally/vertically to match the current distance.
   * *Option B (Shader-based Instancing)*: Alternatively, we can use a single `THREE.InstancedMesh` for falling blocks and write a custom vertex shader (or modify `MeshStandardMaterial` via `onBeforeCompile`) that takes the block's distance as an instanced attribute and adjusts the width dynamically:
     ```glsl
     transformed.x = position.x * (position.y + instanceDist) / position.y;
     ```
7. **Disposal Overhaul**: In an instanced design, geometries and materials are shared. Individual block deletions must NOT call `.dispose()`. We must register shared assets in central tracking arrays (`geometriesToDispose` and `materialsToDispose`) and dispose of them only when the scene is destroyed or reset.

---

## 3. Caveats
* **Visual Gaps in Scaling**: In Option A, using simple scale transforms for falling blocks might cause slight angle variations (not perfectly $30^\circ$) during flight, but this is typically unnoticeable at high speeds.
* **Material Emissive Effect on Match Fading**: The current game fades cleared blocks by modifying their material opacity and setting their emissive color to white. With shared materials in an `InstancedMesh`, we cannot easily change individual materials. Instead, we can:
  - Allocate a separate shared material for "fading blocks" and switch the instance's material index (if supported) or handle the fade out by scaling the block down to 0 over a few frames.
  - Or simply scale the block down to 0 instantly upon matching to skip the fading animation, or use instanced attributes to control the fade factor inside a custom shader.

---

## 4. Conclusion & Implementation Strategy
To implement Milestone 3, the implementer should follow these steps:

### Step A: Setup Asset Tracking
Add the disposal arrays to `HextrisScene`:
```typescript
private geometriesToDispose: THREE.BufferGeometry[] = [];
private materialsToDispose: THREE.Material[] = [];
```

### Step B: Initialize Settled InstancedMeshes
In `initThree()`, calculate and cache the 8 geometries:
```typescript
this.settledGeometries = [];
const sharedMat = new THREE.MeshStandardMaterial({
  flatShading: true,
  roughness: 0.4,
  metalness: 0.1,
  transparent: true,
  opacity: 1.0
});
this.materialsToDispose.push(sharedMat);

for (let r = 0; r < this.settings.rows; r++) {
  const d = inradius + r * this.settings.blockHeight;
  const width = 2 * d / Math.sqrt(3);
  const widthWide = 2 * (d + this.settings.blockHeight) / Math.sqrt(3);
  const geom = this.createBlockGeometry(width, widthWide, this.settings.blockHeight);
  this.settledGeometries.push(geom);
  this.geometriesToDispose.push(geom);
}

this.settledInstancedMeshes = [];
for (let r = 0; r < this.settings.rows; r++) {
  // 6 lanes max per row
  const instMesh = new THREE.InstancedMesh(this.settledGeometries[r], sharedMat, 6);
  // Hide all instances initially by setting scale to 0
  const dummy = new THREE.Object3D();
  dummy.scale.set(0, 0, 0);
  dummy.updateMatrix();
  for (let i = 0; i < 6; i++) {
    instMesh.setMatrixAt(i, dummy.matrix);
  }
  instMesh.instanceMatrix.needsUpdate = true;
  this.mainHex.mesh.add(instMesh); // Parent to hex so they rotate together
  this.settledInstancedMeshes.push(instMesh);
}
```

### Step C: Update Settlement Logic (`addBlockToHex`)
When a block settles at `(lane, row)`:
- Retrieve `this.settledInstancedMeshes[row]`.
- Calculate the local transform matrix for `lane` (local angle, local position).
- Apply this matrix to instance index `lane`:
  ```typescript
  const dummy = new THREE.Object3D();
  dummy.position.set(localX, localY, 0);
  dummy.rotation.set(0, 0, -localAngleRad);
  dummy.scale.set(1, 1, 1);
  dummy.updateMatrix();
  instMesh.setMatrixAt(lane, dummy.matrix);
  instMesh.setColorAt(lane, new THREE.Color(block.color));
  instMesh.instanceMatrix.needsUpdate = true;
  if (instMesh.instanceColor) instMesh.instanceColor.needsUpdate = true;
  ```
- Store the logical reference without the unique `Mesh` object.

### Step D: Update Collision and Clearing Logic
* When collapsing the stack, instead of shifting individual meshes, compute the new positions of all blocks, apply their active matrices to the respective `InstancedMesh`, and set unused slots to scale 0.
* For matched blocks fading out, either scale down their matrix scale dynamically over a few frames or hide them instantly by setting their scale to 0.

### Step E: Overhaul Cleanup
In `clearThreeScene` and `destroySceneResources`, clear the matrices of all instances (set scale to 0) to clear the screen. Dispose of all elements in `geometriesToDispose` and `materialsToDispose` during scene destroy, and call `.dispose()` on all `InstancedMesh` objects.

---

## 5. Verification Method
1. **Compilation Check**: Run `npm run build` to verify there are no TypeScript compilation or bundling errors.
2. **Automated Touch Test**: Run `npm run touch:hextris` to verify that the touch control rotation triggers correctly.
3. **Smoke Test**: Launch the game, play through spawning, stacking, scoring/matching, and game-over to visually verify rendering alignment and correct gameplay state reporting.
4. **Memory Verification**: Open Chrome DevTools Memory tab, play a game, and verify that the count of `BufferGeometry` and `ExtrudeGeometry` remains constant during active gameplay (no allocations in the update loop).
