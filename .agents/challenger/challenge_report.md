# Challenge Report: Pac-Man 3D Optimization and Input Verification

## Challenge Summary

**Overall risk assessment**: LOW

## Challenges

### [Medium] Challenge 1: Unused Memory Arrays and Potential Leaks of Untracked Objects
- **Assumption challenged**: All Three.js geometries and materials are fully disposed of by the scene traversal method, making explicit tracking arrays unnecessary.
- **Attack scenario**: If a future modification creates a geometry or material and associates it with a mesh that is either not added to the scene graph immediately or is removed from the scene graph before scene destruction, the scene traversal `clearThreeSceneResources()` will miss it, causing a WebGL memory leak.
- **Blast radius**: Repeated scene re-entries would trigger an Out of Memory (OOM) error or WebGL context loss due to accumulated un-disposed geometries/materials.
- **Mitigation**: Remove the unused `geometriesToDispose` and `materialsToDispose` arrays to prevent developer confusion, or update `clearThreeSceneResources()` to iterate and dispose of elements tracked in these lists as a fallback for untracked/detached objects.

### [Low] Challenge 2: Multi-touch and Gestures Interference
- **Assumption challenged**: The primary touch mapped by `InputRuntime.ts` remains consistent and stable during multi-finger gestures.
- **Attack scenario**: A user resting their palm or a second finger on the screen could toggle the `primaryTouchId` or reset the start coordinates, leading to erratic jump deltas in `frame.touch.dx` / `frame.touch.dy`.
- **Blast radius**: Pac-Man steering input could register unintended direction shifts.
- **Mitigation**: The input runtime enforces single-finger primary tracking (`this.primaryTouchId` holds onto the initial identifier until `touchEnd`), which shields the steering logic from secondary touch events.

### [Low] Challenge 3: Heavy Frame Spikes / Lag overshoot
- **Assumption challenged**: High delta-time spikes (e.g., page backgrounding or CPU stutter) will not cause Pac-Man to overshoot his path or clip through walls.
- **Attack scenario**: A frame time delta exceeding `0.5s` could compute a step size larger than the grid spacing, skipping collision checks.
- **Blast radius**: Potential wall clipping or ghost boundary evasion.
- **Mitigation**: `updatePacmanMovement()` clamps progress: `if (p.progress > 1.0) p.progress = 1.0;`. This ensures movement resolves exactly at the target tile boundary before path redirection is evaluated, preventing wall clipping.

## Stress Test Results

- **Re-entrance Leak Test**: Open Pac-Man → start → return to hub → re-open Pac-Man → verify canvas count.
  - Expected: Canvas count goes 1 (hub) → 2 (game) → 1 (hub) → 2 (game) → 1 (hub).
  - Actual: 1 → 2 → 1 → 2 → 1. No canvas accumulation.
  - Verdict: **PASS**

- **WebGL Crash/Error Test**: Play game, steer Pac-Man to eat multiple dots, monitoring console for WebGL warnings/errors.
  - Expected: Dots are eaten, score increases, zero WebGL context errors.
  - Actual: Score increased from 0 to 30, primaryActionCount decreased by 3. Zero page/console/WebGL errors.
  - Verdict: **PASS**

- **Touch Swipe/Drag Steering Responsiveness**: Perform short drag left (delta dx = -95px).
  - Expected: Pac-Man moves left (playerX goes from 7 to 4).
  - Actual: playerX went from 7 to 4. Steering responds immediately during the drag.
  - Verdict: **PASS**

## Unchallenged Areas

- **GPU Performance under thermal throttling**: The instanced rendering limits draw-calls to 3, but the rendering behavior under heavy thermal throttling on low-end mobile devices was not measured.
