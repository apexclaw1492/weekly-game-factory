# BRIEFING — 2026-07-11T12:26:39Z

## Mission
Rebuild legacy game Clumsy Bird as Clumsy Bird 3D, a native Phaser/Three.js hybrid scene with flat-shaded low-poly 3D aesthetics, physics, and Robinhood green accents.

## 🔒 My Identity
- Archetype: WGF Clumsy Bird Rebuilder
- Roles: implementer, qa, specialist
- Working directory: /Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_clumsy
- Original parent: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Milestone: Clumsy Bird 3D Rebuild

## 🔒 Key Constraints
- Code modification: follow minimal change principle. Do not perform unrelated refactorings.
- File workspace convention: Write only to your folder; read any folder. No source code or tests in `.agents/`.
- No cheats: genuine implementations only. No hardcoded test results, expected outputs, or verification strings in source.
- Network restrictions: CODE_ONLY mode. Do not access external websites or services.

## Current Parent
- Conversation ID: 68486049-c533-4d69-b9ec-ee3ab43f38a2
- Updated: not yet

## Task Summary
- **What to build**: Clumsy Bird 3D native scene using Three.js inside Phaser, overlaying Three.js canvas, using low-poly 3D assets/obstacles, ArcadeInputFrame controls, standard game state/overlays, and WebGL asset disposal.
- **Success criteria**:
  - Three.js overlay on Phaser canvas
  - 3D physics for bird (impulses, gravity, jumping, collision)
  - Robinhood styling (black background, Outfit typography, neon green highlights `#00c805`)
  - WebGL performance guardrails (use InstancedMesh for clouds/trees)
  - Expose getGameplayStateForQA()
  - Implementation of GameLifecycle and correct clean up
  - Registered as native in game catalog and src/main.ts
  - Clean build and execution
- **Interface contracts**: `src/scenes/GameLifecycle.ts`, `src/utils/StandardOverlays.ts`, `src/components/ArcadeInputFrame` (if any), QA interfaces.
- **Code layout**: Source in `src/`, tests co-located (or in `src/`), workspace in `.agents/worker_wgf_m4_clumsy`.

## Change Tracker
- **Files modified**: None yet
- **Build status**: Unknown
- **Pending issues**: None yet

## Quality Status
- **Build/test result**: Unknown
- **Lint status**: Unknown
- **Tests added/modified**: None yet

## Loaded Skills
- **Source**: `/Users/apexclaw/Projects/weekly-game-factory/.agents/skills/game-prompting/SKILL.md`
- **Local copy**: `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_wgf_m4_clumsy/skills/game-prompting/SKILL.md`
- **Core methodology**: Visual keywords (low poly), explicit Three.js integration, performance instancing, physics engine outsourcing (or direct simple 3D bounding boxes).

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]
