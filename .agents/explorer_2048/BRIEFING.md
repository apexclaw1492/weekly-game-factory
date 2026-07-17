# BRIEFING — 2026-07-12T02:34:20Z

## Mission
Investigate TwoZeroFourEightScene.ts (2048) in WGF to optimize 3D performance and implementation.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Investigation, analysis, synthesis, structured reporting
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048
- Original parent: 98b1c424-51a6-40a7-bf80-5cd9e97554b7
- Milestone: Milestone 1: 2048 3D Optimization & Performance Guardrails

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code changes.
- Provide verified evidence chains citing line numbers in the code.
- Recommend concrete optimization strategy.

## Current Parent
- Conversation ID: 98b1c424-51a6-40a7-bf80-5cd9e97554b7
- Updated: 2026-07-12T02:34:20Z

## Investigation State
- **Explored paths**:
  - `src/scenes/TwoZeroFourEightScene.ts` (3D Board rendering, dynamic tile creation, disposal, animations, and input processing)
  - `src/runtime/InputRuntime.ts` (Touch/gesture handlers, swiping math, and pointer state propagation)
  - `src/scenes/PacManScene.ts` (Reference comparison for swipe controls)
- **Key findings**:
  - Critical memory leak in `syncVisualTilesFromBoard()` where old tile geometries and materials are not disposed when clearing the array.
  - Severe draw call overhead (32 calls) due to loop-instantiation of separate box meshes and line borders for the 16 slots.
  - Excessive CPU allocation churn during tile merges/spawns due to dynamic creation/destruction of BoxGeometry and materials.
  - Swiping lag caused by `InputRuntime.ts` only registering swipes on `touchend` (user must lift finger) and not preventing browser scrolling on single-finger touches.
  - Inputs swallowed during 270ms of active tile animations (sliding + merging/popping).
- **Unexplored areas**: None.

## Key Decisions Made
- Recommended using `THREE.InstancedMesh` for 16 slots and integrating borders into the slot texture to reduce draw calls from 32 to 1.
- Recommended sharing a single tile `BoxGeometry`, caching materials by tile value, and disposing of them once on scene shutdown.
- Recommended performing swipe gesture detection immediately during `touchmove` with a `hasSwiped` gate to prevent multi-firing.
- Recommended implementing an input queue (`this.queuedDirection`) to buffer player inputs during active animations.

## Artifact Index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048/ORIGINAL_REQUEST.md — Original request copy
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048/BRIEFING.md — Current status index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048/progress.md — Liveness progress heartbeat tracker
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048/analysis.md — Detailed analysis report
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_2048/handoff.md — Handoff report following the 5-component team protocol
