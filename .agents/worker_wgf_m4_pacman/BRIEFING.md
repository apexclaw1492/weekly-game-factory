# BRIEFING — 2026-07-11T12:26:45Z

## Mission
Rebuild the legacy game Pac-Man as a native WebGL/Three.js/Phaser hybrid scene with neon-green visual theme.

## 🔒 My Identity
- Archetype: WGF Pac-Man Rebuilder
- Roles: implementer, qa, specialist
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_pacman
- Original parent: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Milestone: Pac-Man Rebuild

## 🔒 Key Constraints
- CODE_ONLY network mode: No external internet access, curl/wget/etc.
- Only write to my working directory for agent metadata.
- Native Phaser/Three.js hybrid setup.
- Solid black background, Outfit typography, neon-green `#00c805` / `0x00c805` highlights.
- Expose getGameplayStateForQA() accurately.
- Implement GameLifecycle interface and clean up Three.js renderers, geometries, materials to prevent leaks.
- DO NOT CHEAT: Genuine logic only, no hardcoded verification outputs.

## Current Parent
- Conversation ID: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Updated: not yet

## Task Summary
- **What to build**: Rebuilt Pac-Man native Three.js/Phaser hybrid game.
- **Success criteria**: Functional 3D Pac-Man scene running in Phaser canvas overlay. Walls render as 3D neon-green glowing shapes, ghosts as low-poly models with chase/scatter/frightened AI, controls mapping from ArcadeInputFrame swipe/drag, integration with standard overlays, proper cleanup, and QA status exposure.
- **Interface contracts**: GameLifecycle, ArcadeInputFrame, getGameplayStateForQA
- **Code layout**: src/scenes/PacManScene.ts, src/main.ts, src/data/gameCatalog.ts

## Key Decisions Made
- [TBD]

## Artifact Index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_pacman/handoff.md — Final handoff report
- /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_pacman/progress.md — Progress tracker

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: Implement PacManScene, modify gameCatalog and main.ts, build and verify

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None yet

## Loaded Skills
- **Source**: /Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md
- **Local copy**: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_pacman/skills/game-prompting/SKILL.md
- **Core methodology**: Emphasizes using explicit Three.js terminology, low-poly aesthetics, instancing for performance, and standard visual styles.
