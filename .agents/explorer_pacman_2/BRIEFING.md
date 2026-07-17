# BRIEFING — 2026-07-12T08:11:32Z

## Mission
Analyze PacManScene.ts and legacy Pac-Man code to plan Milestone 4 (Instancing, Disposal, Touch Controls, QA reporting).

## 🔒 My Identity
- Archetype: Explorer
- Roles: read-only investigator, analyzer
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_2
- Original parent: 92d02aef-85d6-472c-8358-94b429a68799
- Milestone: Milestone 4: Pac-Man 3D Maze Instancing & Disposal

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CODE_ONLY network mode: no external web access

## Current Parent
- Conversation ID: 92d02aef-85d6-472c-8358-94b429a68799
- Updated: 2026-07-12T08:11:32Z

## Investigation State
- **Explored paths**:
  - `src/scenes/PacManScene.ts`
  - `public-safe/games/pac-man/app.js`
  - `src/runtime/ArcadeInputFrame.ts`
  - `src/runtime/InputRuntime.ts`
  - `src/runtime/GameLifecycle.ts`
- **Key findings**:
  1. Found a critical bug in original `PacManScene.ts` where eating a dot disposes of the shared geometry/material, breaking WebGL rendering.
  2. Found a silent bug in touch control steering where `dragVectorX` / `dragVectorY` are checked against a pixel threshold of `18` while the runtime normalizes these values between `-1.0` and `1.0`.
  3. Identified how to optimize draw calls by introducing `THREE.InstancedMesh` for walls, dots, and pellets.
  4. Designed safe resource reuse during game resets to prevent GC overhead and frame stuttering.
  5. Designed a way to keep QA state metrics active and accurate under instancing.
- **Unexplored areas**: None. All requested areas fully explored.

## Key Decisions Made
- Reuse geometries, materials, and `InstancedMesh`es on reset rather than recreating them.
- Target a normalized drag threshold of `0.15` for mobile steering.
- Hide eaten dots by setting their scale to 0 and moving them out of bounds (`y = -100`) via their instance matrices.

## Artifact Index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_2/analysis.md — Detailed analysis and recommendations report
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_2/handoff.md — Handoff report
