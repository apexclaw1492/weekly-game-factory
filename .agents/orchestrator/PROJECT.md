# Project: Weekly Game Factory - Phase 3 WebGL Rebuild of Legacy Games

## Architecture
Weekly Game Factory is a single-page web app built on Phaser 3, Three.js, Vite, and TypeScript.
We are refactoring/rebuilding 4 legacy games as Three.js/Phaser hybrid modules with performance optimization:
1. **2048** (`src/scenes/TwoZeroFourEightScene.ts`)
2. **Clumsy Bird** (`src/scenes/ClumsyBirdScene.ts`)
3. **Hextris** (`src/scenes/HextrisScene.ts`)
4. **Pac-Man** (`src/scenes/PacManScene.ts`)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: 2048 3D Optimization | InstancedMesh for slots, asset disposal, swipe touch controls | None | DONE |
| 2 | M2: Clumsy Bird 3D Instancing | InstancedMesh for background & pipes, asset disposal, flap controls | None | DONE |
| 3 | M3: Hextris 3D Block Instancing | InstancedMesh for falling/settled blocks, asset disposal, rotation touch controls | None | DONE |
| 4 | M4: Pac-Man 3D Maze Instancing | InstancedMesh for walls, dots, pellets, asset disposal, steer swipe controls | None | IN_PROGRESS |
| 5 | M5: Verification & Forensic Audit | Compile build, run smoke & touch:all tests, run Forensic Auditor | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
- Standard Game Lifecycle integration (`GameLifecycle` interface hooks) is maintained.
- Playtest QAs are verified by ensuring standard `getGameplayStateForQA()` returns correct game state properties:
  - 2048: tiles count (`primaryActionCount`), highest tile value (`enemyOrHazardCount`).
  - Clumsy Bird: player Y, score, primaryActionCount (flap count).
  - Hextris: falling lane, rotation angle, score.
  - Pac-Man: player grid coordinates (x, y/z), score, primaryActionCount (dot count remaining), enemy count (ghost count).
