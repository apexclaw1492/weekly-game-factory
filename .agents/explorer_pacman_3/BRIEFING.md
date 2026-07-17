# BRIEFING — 2026-07-12T08:11:47Z

## Mission
Investigate PacManScene.ts and design an optimization strategy using InstancedMesh, touch controls, and clean disposal.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer, Read-only investigator
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_3
- Original parent: 89b6cdd6-c9db-4fca-ae80-352d08844e22
- Milestone: Milestone 4

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- CODE_ONLY network mode (no external HTTP access)

## Current Parent
- Conversation ID: 89b6cdd6-c9db-4fca-ae80-352d08844e22
- Updated: 2026-07-12T08:11:47Z

## Investigation State
- **Explored paths**: src/scenes/PacManScene.ts
- **Key findings**:
  - Found a critical double-disposal bug where shared geometries/materials are disposed of upon eating a dot/pellet or resetting the game, affecting remaining dots and causing visual errors.
  - Designed an InstancedMesh strategy for walls, dots, and pellets, decreasing draw calls from 200+ to 3.
  - Cached geometries and materials at the scene-session level (as private fields of the class), reusing them during reset and disposing of them once on scene shutdown.
  - Added flatShading: true to improve low-poly voxel style.
  - Normalized touch vector checks to prevent steering input lag.
- **Unexplored areas**: None.

## Key Decisions Made
- Cached all materials and geometries at class level to avoid recreating them and double-disposal bugs.
- Scaled eaten dots/pellets via `matrix.makeScale(0, 0, 0)` in InstancedMesh rather than recreating/deleting objects.
- Wrote full optimized code to `proposed_PacManScene.ts`.

## Artifact Index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_3/ORIGINAL_REQUEST.md — Original task description
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_3/proposed_PacManScene.ts — Proposed implementation of PacManScene
- /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_3/handoff.md — Design document & Handoff report
