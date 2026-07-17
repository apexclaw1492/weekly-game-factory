## 2026-07-11T21:34:25Z

You are a Worker. Your task is to implement the optimizations for 2048 (Milestone 1) in `src/scenes/TwoZeroFourEightScene.ts` and `src/runtime/InputRuntime.ts` as analyzed by the Explorer.

Please review the Explorer reports at:
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048/analysis.md
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048/handoff.md

Your work must cover all 5 points:
1. **Slots Instancing**: Update `build3DGridBoard()` to use a single `THREE.InstancedMesh` for slot bases, and another `THREE.InstancedMesh` (or merged geometry) with `wireframe: true` or equivalent for the neon green slot outlines. This should reduce the 32 draw calls of the static grid down to 1 or 2.
2. **Memory Leak Fix**: In `syncVisualTilesFromBoard()`, dispose of geometries and materials of visual tiles before clearing the array. Ensure you do not cause cross-disposal issues if resources are shared.
3. **Geometry and Material Sharing**: Cache a single shared `BoxGeometry` and `sideMat` at the class level of `TwoZeroFourEightScene`. Do not re-create them for every tile. During tile merges or resets, only dispose of the custom `topMat` (which uses a unique canvas texture per tile value). Clean up the shared geometries/materials and cached materials only when the scene is shut down / destroyed (`destroySceneResources()`).
4. **Input Queueing**: Buffer inputs in `TwoZeroFourEightScene.ts`. If an arrow key or swipe input is received while the animation state is not 'idle', queue it in a `queuedDirection` field. Execute the queued direction immediately when the slide/merge animation finishes and the state returns to 'idle' in `update()`.
5. **Responsiveness in InputRuntime**: In `src/runtime/InputRuntime.ts`, evaluate swipe gestures during `touchmove` / `mousemove` instead of waiting for `touchend` / `mouseup`. Once the displacement exceeds `SWIPE_MIN_DIST = 40` within the swipe window, immediately fire the pending swipe action. Use a flag to ensure it only fires once per gesture, and reset the flag on touch/mouse release. Also, ensure `preventDefault()` is called on single-finger touch moves to prevent browser bounce and interrupts.

After implementing these optimizations, run the following verification checks:
- Run `npm run build` to ensure there are no compilation errors.
- Run `npm run touch:2048` to verify that 2048 playtest and gesture tests pass.
- Run `npm run touch:all` to ensure no regression in other games.

Write a detailed handoff.md in your working directory (.agents/worker_2048) documenting your changes, verification results, and any details needed by the reviewer.

> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
