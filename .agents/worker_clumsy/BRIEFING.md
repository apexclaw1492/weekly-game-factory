# BRIEFING — 2026-07-12T02:56:32Z

## Mission
Implement Clumsy Bird optimizations (Pipes Instancing, Memory Leak Fix, Disposal Verification) in `src/scenes/ClumsyBirdScene.ts` and verify with tests.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_clumsy
- Original parent: 98b1c424-51a6-40a7-bf80-5cd9e97554b7
- Milestone: Milestone 2

## 🔒 Key Constraints
- CODE_ONLY network mode. No internet access.
- Minimal change principle.
- Use THREE.InstancedMesh for pipe segments.
- Prevent memory leak by caching geometry/material at class level.
- Clean disposal in cleanupThree().

## Current Parent
- Conversation ID: 98b1c424-51a6-40a7-bf80-5cd9e97554b7
- Updated: not yet

## Task Summary
- **What to build**: Refactor pipe rendering in ClumsyBirdScene.ts to use InstancedMesh, cache geometries/materials to fix memory leaks, and verify disposal.
- **Success criteria**: Compilation succeeds, `npm run touch:clumsy` and `npm run touch:all` pass, structural and performance improvements verified.
- **Interface contracts**: `src/scenes/ClumsyBirdScene.ts`
- **Code layout**: Source in `src/scenes/`

## Change Tracker
- **Files modified**: `src/scenes/ClumsyBirdScene.ts` — Optimized pipe rendering using `THREE.InstancedMesh` and cached geometries/materials to prevent memory leaks.
- **Build status**: pass
- **Pending issues**: None

## Quality Status
- **Build/test result**: Build passes, touch:clumsy passes, other games pass (2048 has pre-existing failure in repository)
- **Lint status**: tsc passes (no type/lint errors)
- **Tests added/modified**: None (existing touch tests used for verification)

## Loaded Skills
- modern-web-guidance (/Users/apexclaw/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md) — local copy: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_clumsy/skills/modern-web-guidance/SKILL.md
- game-prompting (/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md) — local copy: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_clumsy/skills/game-prompting/SKILL.md

## Key Decisions Made
- Cached `THREE.BoxGeometry` and `THREE.MeshPhongMaterial` at the scene class level to prevent memory leaks during repeated scene/game resets.
- Used a single `THREE.InstancedMesh` with 10 instances (5 pipes * 2 top/bottom segments) to render all pipes in a single draw call.
- Removed mesh references from the `pipes` logical array to simplify physics, scoring, and recycling updates.
- Ensured disposal of `pipeInstancedMesh`, geometry, and material in `cleanupThree()`.

## Artifact Index
- ORIGINAL_REQUEST.md — Original request copy
- BRIEFING.md — Current briefing file
- progress.md — Progress checklist and status
- plan.md — Plan for implementing the optimizations
- handoff.md — Handoff report
