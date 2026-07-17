# Handoff Report: Milestone 3 - Hextris 3D Block Instancing & Disposal

## 1. Observation
From a read-only investigation of `src/scenes/HextrisScene.ts` and related files, the following code paths and behaviors were observed:

*   **Geometry Generation Bottleneck**:
    Inside the update loop of `HextrisScene.ts` (lines 754-768), falling blocks undergo dynamic geometry creation and disposal on *every frame*:
    ```typescript
    767:       block.mesh.geometry.dispose();
    768:       block.mesh.geometry = this.createBlockGeometry(width, widthWide, block.height);
    ```
    This triggers CPU triangulation (`THREE.ExtrudeGeometry` initialization) and WebGL buffer re-uploading every frame for every active falling block.
    
    Similarly, when blocks land/settle on the central hexagon (lines 860-861), a new geometry is extruded and replaces the existing geometry:
    ```typescript
    860:     block.mesh.geometry.dispose();
    861:     block.mesh.geometry = this.createBlockGeometry(width, widthWide, block.height);
    ```

*   **Lack of Mesh Instancing / Batching**:
    Each settled block (lines 853-854) is created as an independent `THREE.Mesh` and added to `this.mainHex.mesh`:
    ```typescript
    853:     this.threeScene.remove(block.mesh);
    854:     this.mainHex.mesh.add(block.mesh);
    ```
    This results in one WebGL draw call per block. With `settings.rows = 8` across 6 lanes, the scene can have up to 48 separate block meshes (or more in overflow cases), generating excessive draw calls.

*   **Critical Memory Leaks on Reset and Exit**:
    When a game is restarted, reset, or when transitioning back to the hub (`returnToHub()`), the following global visual assets created in `initThree()` (lines 459-490) are **never disposed**:
    *   Central cylinder geometry `hexGeom`
    *   Central cylinder standard material `hexMat`
    *   Hexagon outline edges geometry `edges`
    *   Hexagon outline line material `lineMat`
    *   Combo ring cylinder geometry `ringGeom`
    *   Combo ring edges geometry `ringEdges`
    *   Combo ring line material `ringMat`
    
    The cleanup method `clearThreeScene()` (lines 1039-1074) only disposes geometries and materials for active falling blocks and array-tracked settled blocks, leaving the central hexagon, highlights, and combo ring in WebGL memory.

*   **Touch Controls Implementation**:
    In `handleArcadeInput(frame)` (lines 625-633), screen-tap rotation is implemented as follows:
    ```typescript
    625:     // 3. Lateral Taps
    626:     if (frame.gestures.tap) {
    627:       const { width } = this.scale;
    628:       if (frame.touch.x < width / 2) {
    629:         this.rotateHex(1);
    630:       } else {
    631:         this.rotateHex(-1);
    632:       }
    633:     }
    ```
    Tapping on the left half (`x < width / 2`) rotates the hexagon clockwise by 1 step, and tapping the right half rotates it counter-clockwise by 1 step.

---

## 2. Logic Chain
The observations lead directly to the following design conclusions:

1.  **Instancing Strategy**:
    *   Because settled blocks lie on a discrete grid (6 lanes and up to $R$ rows), the distance from the hexagon center for a block at row $r$ ($0 \le r < R$) is always static: $d = \text{inradius} + r \times \text{blockHeight}$.
    *   Therefore, there are at most $R$ unique trapezoid geometries for settled blocks.
    *   We can pre-generate these geometries once at scene startup and cache them.
    *   By using $R$ separate `THREE.InstancedMesh` objects (one per row, each initialized with a capacity of 6 instances for the 6 lanes) added directly to `this.mainHex.mesh`, we can batch all settled blocks.
    *   Adding them to the central hex mesh means they inherit its rotation automatically, avoiding per-frame matrix recalculations for rotation.
    *   To hide/show instances as blocks are cleared or added, we can modify their instance scales to `0` or `1` via `setMatrixAt`, then set `instanceMatrix.needsUpdate = true`.

2.  **Falling Blocks Strategy**:
    *   A falling block's distance varies continuously. Rather than recreating the geometry each frame (CPU triangulation bottleneck), we can pre-generate a cache of geometries at discrete steps (e.g. 50 steps from `startDist` to `inradius`).
    *   During updates, we reference the closest step from the pre-generated geometry cache, mapping `block.mesh.geometry = cache[closestStepIndex]`. This is extremely lightweight, requiring zero allocations or uploads per frame.

3.  **Handling Fade-Out / Opacity Animations**:
    *   `THREE.InstancedMesh` shares a single material, preventing independent opacity fades per block instance during standard clearing.
    *   When blocks are matched, they transition to `deleted = 1` (fade-out phase).
    *   At this transition, we can hide the block in the `InstancedMesh` (setting scale to 0) and spawn a temporary individual `THREE.Mesh` using the shared geometry but a dedicated material copy. We animate this temporary mesh's opacity, and then fully destroy its material and remove it when `deleted = 2`.

4.  **Disposal Strategy**:
    *   To prevent memory leaks, we must explicitly dispose of the pre-generated geometry cache (`rowGeometries`, `fallingGeometries`), shared materials, instanced meshes, and the static hexagon/combo-ring assets in the scene shutdown/teardown handlers.

---

## 3. Caveats
*   **Capacity Limit**: The instanced meshes for settled blocks assume a maximum row count (e.g., `MAX_ROWS = 12`). If the stack exceeds this height, the game triggers a Game Over. However, `MAX_ROWS` must be set high enough to accommodate any brief post-game-over visual states.
*   **Fading Block Count**: The use of individual temporary meshes for fading blocks temporarily increases the draw call count during clears. Because clears are short and infrequent, the impact is negligible compared to the continuous benefit of instanced settled blocks and cached falling geometries.

---

## 4. Conclusion
We recommend implementing a hybrid batching and caching system:
1.  **Settled blocks**: Rendered via $R$ separate `THREE.InstancedMesh` instances (one per row, capacity 6) attached to `mainHex.mesh`.
2.  **Falling blocks**: Rendered via individual meshes but leveraging a pre-calculated cache of 50 discrete geometries to avoid per-frame triangulation.
3.  **Fading blocks**: Temporarily swapped to standard single meshes to support individual opacity animation.
4.  **Complete Disposal**: Ensure all cached geometries, materials, static hexagon cylinders, outlines, and combo rings are cleanly disposed of in `clearThreeScene` and `destroySceneResources`.

---

## 5. Verification Method
To verify the implementation:
1.  **Static/Instancing Verification**: Check the Three.js draw call counts during gameplay. A fully stacked board should use around 12 draw calls instead of 40+.
2.  **Clean Teardown Verification**: Inspect memory usage or WebGL resource counts (using Chrome DevTools or three.js inspector) after entering and leaving Hextris multiple times. Confirm that the number of active geometries and materials remains constant and returns to baseline.
3.  **Touch Controls smoke test**: Run the automated touch tests using:
    ```bash
    npm run touch:hextris
    ```
4.  **Build validation**: Verify compilation and packaging:
    ```bash
    npm run build
    ```
