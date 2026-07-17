# BRIEFING — 2026-07-11T07:26:39-05:00

## Mission
Rebuild the legacy 2048 game as a native WebGL/Three.js/Phaser hybrid scene with a Robinhood visual theme, clean input handling, and proper state reporting/lifecycle.

## 🔒 My Identity
- Archetype: WGF 2048 Rebuilder
- Roles: implementer, qa, specialist
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_2048
- Original parent: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Milestone: Rebuild 2048 in Three.js/Phaser hybrid

## 🔒 Key Constraints
- WebGL/Three.js/Phaser hybrid scene.
- Overlay Three.js renderer canvas on top of Phaser container.
- Low-poly flat-shaded 3D geometries for tiles and grid.
- Orthographic 3D tile movement and merge animations.
- Robinhood visual theme (solid black background, Outfit typography, neon-green `#00c805` highlights).
- Input from ArcadeInputFrame (swipe left/right/up/down).
- Expose `getGameplayStateForQA()` accurately.
- GameLifecycle interface with standard overlays (Pause, Game-Over, Victory).
- Complete cleanup in `shutdown`/`destroy` to prevent memory leaks.
- Register scene in `src/main.ts` and `src/data/gameCatalog.ts` (remove `url`, set `sceneClass` and `sceneKey`, set `certificationStatus` to `certified`).
- Compile via `npm run build` and verify.
- Mandatory Integrity Warning must be in handoff.md.

## Current Parent
- Conversation ID: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Updated: not yet

## Task Summary
- **What to build**: Three.js rendering layer for 2048 inside a Phaser scene, 2048 logic, animations, input bindings, UI integration.
- **Success criteria**: Functional 2048 game in 3D orthographic view, swipe inputs work, standard overlays display, build succeeds, no memory leaks, QA state correctly exposed.
- **Interface contracts**: `src/scenes/TwoZeroFourEightScene.ts`, `src/main.ts`, `src/data/gameCatalog.ts`
- **Code layout**: Source in `src/`, config files in project root.

## Change Tracker
- **Files modified**: None yet
- **Build status**: TBD
- **Pending issues**: None yet

## Quality Status
- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: TBD

## Loaded Skills
- **Source**: `/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md`
- **Local copy**: `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_2048/skills/game-prompting/SKILL.md`
- **Core methodology**: Prompts and technical conventions for 3D Phaser/Three.js games.

## Key Decisions Made
- TBD

## Artifact Index
- `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_2048/BRIEFING.md` — Agent Briefing
- `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_2048/progress.md` — Task progress tracking
