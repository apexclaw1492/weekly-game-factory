# BRIEFING — 2026-07-11T22:20:00-05:00

## Mission
Investigate HextrisScene.ts and design a 3D instancing and disposal strategy for Milestone 3.

## 🔒 My Identity
- Archetype: explorer
- Roles: read-only investigator
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_hextris_3
- Original parent: 550119ce-d659-46f3-bdd2-57c08adc6ca5
- Milestone: Milestone 3 (Hextris 3D Block Instancing & Disposal)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT run code execution or tests

## Current Parent
- Conversation ID: 550119ce-d659-46f3-bdd2-57c08adc6ca5
- Updated: 2026-07-11T22:20:00-05:00

## Investigation State
- **Explored paths**:
  - `src/scenes/HextrisScene.ts` (Hextris scene structure, block spawning, rendering, disposal, inputs)
  - `src/runtime/GameLifecycle.ts`, `src/runtime/ArcadeInputFrame.ts` (Interface contracts and inputs)
  - `src/scenes/ClumsyBirdScene.ts`, `src/scenes/TwoZeroFourEightScene.ts` (Reference instancing & cleanup patterns)
- **Key findings**:
  - `HextrisScene.ts` recreates and disposes geometry for falling blocks every frame, and recreates geometry when blocks settle.
  - No instancing is currently used; each block has a distinct mesh, geometry, and material.
  - Touch controls are implemented via lateral taps (`frame.touch.x < width / 2`) and swipes/drags in `handleArcadeInput`.
- **Unexplored areas**: None. Complete investigation of codebase done.

## Key Decisions Made
- Propose Option A (discrete pre-calculated row geometries for settled blocks + standard mesh with cached scale/geometry for falling blocks) as the most maintainable path.
- Detail Option B (dynamic geometry computation in vertex shader for a single InstancedMesh) as a high-performance alternative.
- Propose using `geometriesToDispose` and `materialsToDispose` tracking arrays for cleanup, matching the pattern in ClumsyBirdScene.ts.

## Artifact Index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_hextris_3/handoff.md — Analysis and recommendation report

