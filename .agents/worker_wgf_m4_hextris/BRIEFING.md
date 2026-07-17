# BRIEFING — 2026-07-11T12:26:39Z

## Mission
Rebuild legacy Hextris as a native WebGL/Three.js/Phaser hybrid scene using the Robinhood visual theme and integrating standard overlays, input, and QA hooks.

## 🔒 My Identity
- Archetype: WGF Hextris Rebuilder
- Roles: implementer, qa, specialist
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_hextris
- Original parent: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Milestone: Hextris Rebuild

## 🔒 Key Constraints
- CODE_ONLY network mode: No external network access, curl, wget, etc.
- No "while I'm here" refactoring; keep modifications minimal.
- DO NOT CHEAT: All implementations must be genuine. No hardcoded test results, facade implementations, or circumventing tasks.
- Keep BRIEFING.md under ~100 lines. Append-only sections must be preserved.
- Output path discipline: write only to own worker directory under `.agents/`.

## Current Parent
- Conversation ID: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Updated: 2026-07-11T12:26:39Z

## Task Summary
- **What to build**: Native `HextrisScene.ts` in Phaser using Three.js inside it. Central rotating hexagon, falling colored lines/blocks in 3D (flat-shaded low-poly). Color-matching, combos, and game-over detection (overflow bounds). Robinhood visual theme (solid black background, Outfit typography, neon-green `#00c805` highlights). Consume `ArcadeInputFrame` inputs to rotate the hexagon. Expose `getGameplayStateForQA()`. Implement `GameLifecycle`. Clean up Three.js objects in shutdown/destroy. Register scene in `src/main.ts` and `src/data/gameCatalog.ts`.
- **Success criteria**: Successful compilation, zero memory leaks, matches Hextris game logic (blocks falling, rotating hexagon, match 3+ same color blocks, combos, game over), QA hook works, standard overlays work.
- **Interface contracts**: `src/scenes/HextrisScene.ts`, `src/main.ts`, `src/data/gameCatalog.ts`
- **Code layout**: Source in `src/`, tests in `src/__tests__/` or next to source.

## Key Decisions Made
- [TBD]

## Artifact Index
- `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_hextris/handoff.md` — Handoff report
- `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_hextris/progress.md` — Progress tracker

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None

## Loaded Skills
- **Source**: `/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md`
- **Local copy**: `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_hextris/skills/game-prompting/SKILL.md`
- **Core methodology**: technical keywords and structure for 3D Phaser/Three.js hybrid setup.
