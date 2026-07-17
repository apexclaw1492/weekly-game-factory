# BRIEFING — 2026-07-12T03:12:43Z

## Mission
Investigate `src/scenes/HextrisScene.ts` and formulate a strategy to implement Milestone 3 (Hextris 3D Block Instancing & Disposal).

## 🔒 My Identity
- Archetype: explorer_hextris_2 (Read-only investigator)
- Roles: investigator, analyzer, synthesizer
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_hextris_2
- Original parent: 550119ce-d659-46f3-bdd2-57c08adc6ca5
- Milestone: Milestone 3 (Hextris 3D Block Instancing & Disposal)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT write or edit any source files (only agent folder metadata)
- Do NOT run any code execution or tests
- Recommend a fix strategy but do NOT implement

## Current Parent
- Conversation ID: 550119ce-d659-46f3-bdd2-57c08adc6ca5
- Updated: 2026-07-12T03:12:55Z

## Investigation State
- **Explored paths**:
  - `src/scenes/HextrisScene.ts` (full structure viewed and analyzed)
  - `src/scenes/TwoZeroFourEightScene.ts` (inspected InstancedMesh usage)
  - `src/scenes/ClumsyBirdScene.ts` (inspected InstancedMesh and disposal usage)
  - `PROJECT.md` (read milestones and requirements)
- **Key findings**:
  - Found critical performance bottleneck in `HextrisScene.ts` where geometries are re-created and disposed on every frame for falling blocks.
  - Identified lack of batching for settled blocks, causing individual draw calls per block.
  - Detected memory leaks: `hexGeom`, `hexMat`, `edgesLine`, `comboRing` assets are never disposed on scene reset or destruction.
  - Verified touch controls: lateral taps (left vs right half of screen) are correctly mapped to clockwise/counter-clockwise rotations.
- **Unexplored areas**: None. The scope is fully investigated and analyzed.

## Key Decisions Made
- Formulate a hybrid instancing + geometry caching approach.
- Use `THREE.InstancedMesh` for settled blocks, with one instanced mesh per row index to handle discrete trapezoid shapes.
- Use pre-generated geometry caching (discrete steps) for falling blocks to avoid per-frame CPU triangulation and GPU uploading.
- Use temporary single meshes for matched blocks during their fade-out phase to preserve transparency animations, then clean them up.
- Provide a robust asset disposal routine to eliminate all WebGL memory leaks.

## Artifact Index
- `/Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_hextris_2/ORIGINAL_REQUEST.md` — Original request text.
- `/Users/apexclaw/Projects/weekly-game-factory/.agents/explorer_hextris_2/handoff.md` — Detailed investigation & strategy report.
