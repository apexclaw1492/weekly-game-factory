# Phase 3 Execution Plan: WebGL Rebuild of Legacy Games

This document outlines the implementation, testing, and verification strategies for Phase 3: WebGL Rebuild of Legacy Games (2048, Clumsy Bird, Hextris, Pac-Man) as native Three.js/Phaser hybrid modules.

## Milestones

### Milestone 1: 2048 3D Optimization & Performance Guardrails (`src/scenes/TwoZeroFourEightScene.ts`)
- **Objective:**
  1. Optimize/rebuild the 3D 2048 game using native WebGL/Three.js/Phaser hybrid structure.
  2. Implement low-poly flat-shaded 3D geometries for the board, tiles, and text.
  3. Support custom touch controls (swipe left, right, up, down) registered properly in mobile viewports.
  4. Apply performance guardrails: Use `InstancedMesh` for repetitive grid slots, background panels, or border segments.
  5. Cleanly dispose of all retired geometries, materials, and textures when tiles merge or when the scene is shut down/destroyed.
- **Verification:**
  - Build checks and checking for console warnings/errors.
  - Run `npm run touch:2048` to verify gameplay, swipes, and score state.

### Milestone 2: Clumsy Bird 3D Pipe Instancing & Disposal (`src/scenes/ClumsyBirdScene.ts`)
- **Objective:**
  1. Rebuild/optimize the 3D Clumsy Bird game as a native WebGL/Three.js/Phaser hybrid.
  2. Implement low-poly flat-shaded 3D geometries for the bird body, beak, wings, and obstacles (pipes).
  3. Support custom touch controls (tap anywhere to flap/jump).
  4. Apply performance guardrails: Use `InstancedMesh` for repetitive background elements (trees, clouds) AND repetitive obstacles (pipes).
  5. Cleanly dispose of retired pipe geometries/materials when they go offscreen, and completely clear cache on shutdown/destroy.
- **Verification:**
  - Run `npm run touch:clumsy` to verify gameplay, flaps, and score state.

### Milestone 3: Hextris 3D Block Instancing & Disposal (`src/scenes/HextrisScene.ts`)
- **Objective:**
  1. Rebuild/optimize the Hextris game as a native WebGL/Three.js/Phaser hybrid.
  2. Use flat-shaded 3D geometries for the center hexagon and falling trapezoidal blocks.
  3. Support custom touch controls (tap left side of screen to rotate counter-clockwise, right side to rotate clockwise).
  4. Apply performance guardrails: Use `InstancedMesh` for falling blocks, settled blocks, or background particles.
  5. Cleanly dispose of all geometries/materials when blocks are cleared (combos) and on scene shutdown/destroy.
- **Verification:**
  - Run `npm run touch:hextris` to verify gameplay, rotations, combos, and score state.

### Milestone 4: Pac-Man 3D Maze Instancing & Disposal (`src/scenes/PacManScene.ts`)
- **Objective:**
  1. Rebuild/optimize the Pac-Man game as a native WebGL/Three.js/Phaser hybrid.
  2. Use flat-shaded 3D geometries for Pac-Man, ghosts, maze walls, dots, and power pellets.
  3. Support custom touch controls (swiping/dragging to change steer direction).
  4. Apply performance guardrails: Use `InstancedMesh` for repetitive maze wall segments, dots, and power pellets.
  5. Cleanly dispose of eaten dots, eaten pellets, and all maze geometries/materials on scene shutdown/destroy.
- **Verification:**
  - Run `npm run touch:pacman` to verify gameplay, movements, eating dots, and score state.

### Milestone 5: Verification & Forensic Audit
- **Objective:**
  1. Run `npm run build` and `npm run smoke` to ensure project compiles and basic game navigation works.
  2. Run `npm run touch:all` to verify touch gesture controls across all games.
  3. Run the Forensic Auditor (`teamwork_preview_auditor`) to ensure genuine implementation integrity, performance compliance, and correct resource disposal (no memory leaks).
