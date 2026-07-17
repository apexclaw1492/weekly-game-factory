# BRIEFING — 2026-07-11T18:18:02Z

## Mission
Refactor Space Invaders and Cosmic Cargo scenes for polish, collision logic, safe-area dynamic UI repositioning, and gravity flip debouncing.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_invaders_cargo
- Original parent: 007cd3fc-f995-4d0d-bceb-121420b1bcfa
- Milestone: Space Invaders & Cosmic Cargo Refactoring

## 🔒 Key Constraints
- CODE_ONLY network mode: no external HTTP requests.
- No dummy/facade implementations, genuine logic only.
- Strict minimal change principle.
- Use of replace_file_content/multi_replace_file_content.
- Run build/tests before and after edits.

## Current Parent
- Conversation ID: 007cd3fc-f995-4d0d-bceb-121420b1bcfa
- Updated: not yet

## Task Summary
- **What to build**: 
  - Space Invaders: player invulnerability with tween oscillation and processCallback; pause/resume logic shifting time trackers.
  - Cosmic Cargo: physics collision between cargo and asteroids with audio and particle spawn; fuel HUD repositioning using a safe-area insets reader method; gravity flip debouncing.
- **Success criteria**: All smoke tests and builds pass, invulnerability prevents hits, pause doesn't cause bullet burst, asteroids bounce off cargo, fuel HUD is positioned correctly with safe area, and gravity flips are debounced.
- **Interface contracts**: src/scenes/SpaceInvadersScene.ts and src/scenes/CosmicCargoScene.ts
- **Code layout**: src/scenes/

## Change Tracker
- **Files modified**: None yet
- **Build status**: TBD
- **Pending issues**: None yet

## Quality Status
- **Build/test result**: TBD
- **Lint status**: TBD
- **Tests added/modified**: None yet

## Loaded Skills
- None loaded yet

## Key Decisions Made
- [TBD]

## Artifact Index
- /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_invaders_cargo/handoff.md — Handoff report containing details of observation, logic chain, caveats, conclusion, and verification.
- /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_invaders_cargo/progress.md — Liveness heartbeat.
