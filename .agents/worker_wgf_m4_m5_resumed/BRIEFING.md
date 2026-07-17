# BRIEFING — 2026-07-11T17:10:00Z

## Mission
Finish Milestone 4 (rebuilding all 4 legacy games in 3D) and Milestone 5 (touch simulation testing).

## 🔒 My Identity
- Archetype: WGF M4/M5 Resumed Worker
- Roles: implementer, qa, specialist
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_m5_resumed
- Original parent: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Milestone: Milestone 4 & 5

## 🔒 Key Constraints
- CODE_ONLY network mode: no external requests, no curl/wget/lynx.
- Do not cheat: no hardcoded test results, facade implementations, or circumventing tasks.
- Keep BRIEFING.md under 100 lines.

## Current Parent
- Conversation ID: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Updated: yes

## Task Summary
- **What to build**: Rebuild 4 legacy games (2048, Clumsy Bird, Hextris, Pacman) in Phaser/Three.js 3D and register them. Write touch simulation test scripts and update package.json.
- **Success criteria**: All games compile clean, smoke test loads viewport, and touch tests pass successfully.
- **Interface contracts**: src/scenes/TwoZeroFourEightScene.ts, ClumsyBirdScene.ts, HextrisScene.ts, PacManScene.ts, gameCatalog.ts, package.json
- **Code layout**: src/scenes/, src/data/, scratch/

## Key Decisions Made
- Adjusted `ClumsyBirdScene` back button to match standard layout coordinate `y = 16` and origin `0, 0.5`.
- Programmatically scrolled the Hub list inside touch simulation test scripts to center target game cards before tapping.
- Corrected Pac-Man spawn reset coordinates in `handleLoseLife` from `(7, 13)` to `(7, 7)` to prevent crash/race conditions.
- Repositioned Inky ghost's spawn point from `(7, 5)` to `(7, 1)` to prevent immediate collision on test start.

## Artifact Index
- None

## Change Tracker
- **Files modified**:
  - `src/data/gameCatalog.ts` (registered Hextris and Pac-Man)
  - `src/scenes/HextrisScene.ts` (fixed unused local variable)
  - `src/scenes/ClumsyBirdScene.ts` (standardized back button coordinates)
  - `src/scenes/PacManScene.ts` (new 3D scene)
  - `package.json` (integrated touch test scripts in touch:all)
  - `scratch/run-touch-2048.js` (touch test)
  - `scratch/run-touch-clumsy.js` (touch test)
  - `scratch/run-touch-hextris.js` (touch test)
  - `scratch/run-touch-pacman.js` (touch test)
- **Build status**: Pass
- **Pending issues**: None

## Quality Status
- **Build/test result**: Pass (npm run build, npm run smoke, npm run touch:all all pass)
- **Lint status**: 0 outstanding violations
- **Tests added/modified**: 4 new touch scripts added

## Loaded Skills
- **Source**: game-prompting, modern-web-guidance
- **Local copy**: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_m5_resumed/game_prompting_skill.md, /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_m5_resumed/modern_web_guidance_skill.md
- **Core methodology**: game prompting and modern web guidelines
