## 2026-07-12T02:56:32Z

You are a Worker. Your task is to implement the optimizations for Clumsy Bird (Milestone 2) in `src/scenes/ClumsyBirdScene.ts`.

Specifically:
1. **Pipes Instancing**: Replace the individual `topMesh` and `bottomMesh` in `initPipes()`, `updatePipePositions()`, and collision checking with a single `THREE.InstancedMesh`.
   - The scene spawns 5 pipes, each with a top and a bottom section. This means you need a `pipeInstancedMesh: THREE.InstancedMesh` with 10 instances.
   - Modify `initPipes()` to create/reset the `pipeInstancedMesh` and position the 10 instances using dummy Object3D matrices.
   - Modify `updatePipePositions()` to update the instance matrices of the `pipeInstancedMesh` for the 10 instances (5 pipes * 2 top/bottom segments). Don't forget to set `pipeInstancedMesh.instanceMatrix.needsUpdate = true`.
   - Update the `pipes` array structure to store only the logical state (`z`, `gapY`, `passed`) rather than references to individual meshes.
2. **Memory Leak Fix**:
   - Prevent the memory leak where new geometries and materials are allocated on every call to `initPipes()`.
   - Cache a single `pipeGeometry: THREE.BoxGeometry` and `pipeMaterial: THREE.MeshPhongMaterial` at the scene class level (initialize them once in `initPipes` or `create`).
   - Reuse them for the `pipeInstancedMesh`.
   - Make sure they are cleanly disposed of in `cleanupThree()`.
3. **Disposal Verification**: Ensure that `cleanupThree()` removes the `pipeInstancedMesh` from the scene and disposes of it cleanly.

After implementing these optimizations, run the following verification checks:
- Run `npm run build` to ensure there are no compilation errors.
- Run `npm run touch:clumsy` to verify that Clumsy Bird playtest and gesture tests pass.
- Run `npm run touch:all` to ensure no regression in other games.

Write a detailed handoff.md in your working directory (.agents/worker_clumsy) documenting your changes, verification results, and any details needed by the reviewer.
