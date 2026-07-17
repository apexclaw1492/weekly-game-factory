## 2026-07-12T03:13:42Z

Objective: Implement Milestone 3 (Hextris 3D Block Instancing & Disposal) in `src/scenes/HextrisScene.ts`.

Key Requirements:
1. Optimize Three.js rendering for Hextris blocks using instancing and geometry caching:
   - For settled blocks, create an array of `THREE.InstancedMesh` instances (one per row, capacity 6 for the 6 lanes) added as children of `this.mainHex.mesh`. Pre-generate and cache the geometries for all rows (e.g. MAX_ROWS = 12). Update instances dynamically by changing scale to 0 (hidden) or 1 (visible) and using `setColorAt` to set the block's color.
   - For falling blocks, pre-calculate a cache of 50 discrete geometries corresponding to distance steps from `startDist` to `inradius`. During the update loop, assign the closest cached geometry to the block mesh instead of recreating and disposing geometries every frame.
   - For fading/clearing blocks (where `deleted === 1`), hide the block in the `InstancedMesh` (scale to 0) and spawn a temporary individual `THREE.Mesh` with its own material copy to perform the opacity fade animation. Dispose of this temporary mesh's resources when the fade completes (`deleted === 2`).
2. Implement clean disposal of ALL WebGL resources to prevent memory leaks:
   - Make sure `clearThreeScene()` and `destroySceneResources()` cleanly dispose of all instanced meshes, pre-generated geometry caches, shared materials, static hexagon cylinders, outlines, and combo rings.
3. Custom Touch Controls:
   - Ensure the existing custom touch controls (taps on left/right halves of screen to rotate) remain fully operational and responsive.
4. Compilation and Test Verification:
   - Compile and build the project using: `npm run build`
   - Run the Hextris-specific puppeteer playtest using: `npm run touch:hextris`
   - Verify that all checks pass and no console/page errors occur.
