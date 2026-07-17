# BRIEFING — 2026-07-12T08:11:45Z

## Mission
Investigate PacManScene.ts and design an instancing and resource disposal strategy for Milestone 4.

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_pacman_1
- Original parent: 89b6cdd6-c9db-4fca-ae80-352d08844e22
- Milestone: Milestone 4 (Pac-Man 3D Maze Instancing & Disposal)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Code-only network mode (no external web access, no curl/wget to external URLs)

## Current Parent
- Conversation ID: 89b6cdd6-c9db-4fca-ae80-352d08844e22
- Updated: 2026-07-12T08:11:45Z

## Investigation State
- **Explored paths**: src/scenes/PacManScene.ts, src/runtime/ArcadeInputFrame.ts
- **Key findings**: Found critical bugs where shared geometries/materials are incorrectly disposed during dot/pellet eating. Identified memory leak of wall geometries/materials on resets. Designed a persistent resource model utilizing Three.js `InstancedMesh`.
- **Unexplored areas**: None.

## Key Decisions Made
- Use InstancedMesh for walls, dots, and power pellets.
- Apply flatShading: true on materials for a low-poly style.
- Hide eaten dots/pellets by scaling to 0 or translating offscreen.
- Reuse geometries/materials across resets; dispose exactly once during scene SHUTDOWN/DESTROY events.

## Artifact Index
- .agents/explorer_pacman_1/ORIGINAL_REQUEST.md — Original user request
- .agents/explorer_pacman_1/BRIEFING.md — Agent briefing and index
- .agents/explorer_pacman_1/progress.md — Liveness heartbeat and step tracking
- .agents/explorer_pacman_1/handoff.md — Detailed analysis, design strategy, and verification steps
- .agents/explorer_pacman_1/proposed_PacManScene.ts — Reference implementation draft
