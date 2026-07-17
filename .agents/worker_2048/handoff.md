# Handoff Report: 2048 performance and input responsiveness optimizations

This report documents the implementation and verification of performance, memory leak, and input responsiveness optimizations for 2048 in WGF.

## 1. Observation

- **Path:** `/Users/apexclaw/Projects/weekly-game-factory/src/scenes/TwoZeroFourEightScene.ts`
  - *Grid Building (Original lines 482-498):* The grid used nested loops to construct 16 instances of `BoxGeometry` and `MeshPhongMaterial` for slots, and another 16 instances of `EdgesGeometry` and `LineBasicMaterial` for outlines. This generated 32 WebGL draw calls for a static board background.
  - *Tile Clears (Original lines 551-554):* In `syncVisualTilesFromBoard()`, tiles were removed from the scene and the array cleared without calling `.dispose()` on geometries and materials, leading to GPU memory leaks.
  - *Tile Creation (Original lines 539-543):* Every tile dynamically allocated a new `BoxGeometry` and side material `MeshPhongMaterial`, creating allocation/deallocation churn and GC stutters.
  - *Input Swallowing (Original lines 708-709):* Inputs were ignored if `animState !== 'idle'`, meaning swipes or keypresses during the 270ms animation phase were lost.
- **Path:** `/Users/apexclaw/Projects/weekly-game-factory/src/runtime/InputRuntime.ts`
  - *Touch Move Scroll (Original line 177):* `preventDefault()` was only called if there were 2 or more touches. Single-finger swipes were unprevented, allowing browser bounce and touch event cancelation.
  - *Swipe Lag (Original lines 189-201):* Swipe gesture evaluation was triggered only in `onTouchEnd()`, forcing users to release their fingers before the game acted.
- **Commands and Results:**
  - `npm run build` completed successfully, compiling the code cleanly:
    ```
    vite v5.4.21 building for production...
    transforming...
    ✓ 30 modules transformed.
    rendering chunks...
    computing gzip size...
    dist/index.html                           2.56 kB │ gzip:   1.13 kB
    dist/assets/InputRuntime-Cq2utTFB.js      9.87 kB │ gzip:   2.83 kB
    dist/assets/index-CBDrzf4w.js         2,214.68 kB │ gzip: 521.87 kB
    ✓ built in 10.04s
    ```
  - `npm run touch:2048` verified that the 2048 playtest and gesture tests pass:
    ```json
    {
      "started": { "sceneKey": "TwoZeroFourEightScene", "primaryActionCount": 2, "enemyOrHazardCount": 4 },
      "afterSwipeLeft": { "sceneKey": "TwoZeroFourEightScene", "primaryActionCount": 2, "enemyOrHazardCount": 4 },
      "afterSwipeRight": { "sceneKey": "TwoZeroFourEightScene", "primaryActionCount": 4, "enemyOrHazardCount": 4 },
      "backToHub": "HubScene",
      "checks": { "correctScene": true, "startedGameplay": true, "validTiles": true, "noPageErrors": true, "returnedToHub": true }
    }
    ```
  - `npm run touch:all` verified all games (Pong, Asteroids, Clumsy Bird, Hextris, Pacman) pass without regression.

## 2. Logic Chain

1. **Slots Instancing:** Utilizing `THREE.InstancedMesh` for both the slot bases and slot outlines allows Three.js to render all 16 slots in a single batch, reducing draw calls from 32 down to 2 (one for base mesh, one for outline mesh).
2. **Disposal Leak Fix:** Disposing of the custom tile material `topMat` before removing the mesh from the scene ensures GPU resources are immediately reclaimed.
3. **Geometry/Material Sharing:** Sharing a single `sharedTileGeometry` and `sharedSideMaterial` at the class level avoids re-creating geometries and materials. This stops heap/GC churn, and prevents cross-disposal bugs when clearing retired visual tiles since only the custom `topMat` is disposed.
4. **Input Queueing:** Storing incoming inputs in `queuedDirection` when `animState !== 'idle'` and executing it immediately when the board returns to `idle` ensures fast keyboard/touch play is never swallowed.
5. **Responsiveness in InputRuntime:** Evaluating touch/mouse displacement during `touchmove`/`mousemove` instead of waiting for `touchend` allows the swipe to fire immediately once `dist > SWIPE_MIN_DIST = 40` within the `SWIPE_MAX_MS = 500` window. Adding the `hasSwiped` property on `TouchPoint` prevents double-firing of swipes, which is reset upon touch/mouse release. Calling `preventDefault()` unconditionally on touch moves stops single-finger page scrolling/bounces from canceling the touch stream.

## 3. Caveats

- Playtesting verification was executed in a headless browser test suite (`npm run touch:2048` and `npm run touch:all`). Verification does not replace final manual visual regression testing on actual physical mobile devices.

## 4. Conclusion

All 5 optimization points have been implemented cleanly and verified to compile without error. All automated playtests and touch gesture tests pass successfully with no regressions.

## 5. Verification Method

To independently verify:
1. Run `npm run build` to verify there are no compilation errors.
2. Run `npm run touch:2048` to verify 2048 gesture interactions, scene lifecycle transitions, and basic playability.
3. Run `npm run touch:all` to verify that all other games on the hub still receive gestures properly and exhibit zero regressions.
