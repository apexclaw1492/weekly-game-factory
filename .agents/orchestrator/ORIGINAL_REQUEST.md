# Original User Request

## Initial Request — 2026-07-11T06:57:18-05:00

You are the Project Orchestrator for the Weekly Game Factory project. Your task is to lead the team to review, rebuild, and optimize all 9 games in the Weekly Game Factory based on the requirements in /Users/apexclaw/Projects/weekly-game-factory/ORIGINAL_REQUEST.md.

## Follow-up — 2026-07-11T18:16:09Z

Refactor the gameplay mechanics, controls, and physics configurations of the 5 custom Phaser games in the Weekly Game Factory compilation folder.

### Requirements

#### R1. F1 Space Invaders Polish
- Implement a 2-second player respawn invulnerability window where incoming collisions are ignored and the car flashes visually.
- Verify standard pause overlays function correctly and suspend active enemy shoots.

#### R2. Cosmic Cargo Refactoring
- Integrate physics-based cargo/asteroid collision handling (Matter.js or Arcade equivalent).
- Reposition the fuel HUD bar layout dynamically using safe-area viewport boundaries.
- Debounce gravity flip gestures (e.g. 200ms delay) to prevent accidental double-swiping.

#### R3. Contra Bonus Momentum & Touch Controls
- Add horizontal air damping so horizontal movement in mid-air feels natural rather than overriding horizontal velocity instantly.
- Implement standard virtual touch joystick overlays on mobile viewports for clean diagonal/vertical aiming.

#### R4. Asteroid Belt Safe Hyperspace
- Replace the hardcoded `12%` chance of instant self-destruction on hyperspace exit with a coordinate scanner that avoids teleporting directly on top of active asteroids.

#### R5. Red Bull Pong Difficulty Scaling
- Scale paddle dimensions dynamically on wide aspect ratios to balance defense.
- Cap the AI minimum reaction delay and introduce target error wobble scaling with ball speed to ensure high rounds remain beatable.

## 2026-07-11T21:53:46Z

You are the Project Orchestrator. Your mission is to refactor the gameplay mechanics, controls, and physics configurations of the 5 custom Phaser games in the Weekly Game Factory compilation folder. The original request is stored in /Users/apexclaw/Projects/weekly-game-factory/ORIGINAL_REQUEST.md. Please check the existing plans and progress logs under `.agents/orchestrator/` to resume execution. Specifically, worker_pong has completed, while work on Space Invaders/Cosmic Cargo and Contra/Asteroids needs to be resumed or restarted.

## Follow-up — 2026-07-12T02:32:25Z

You are the Project Orchestrator for the Weekly Game Factory project. We are starting Phase 3: WebGL Rebuild of Legacy Games.
Your task is to:
- Rebuild the 4 legacy games (2048, Clumsy Bird, Hextris, Pac-Man) as native WebGL/Three.js/Phaser hybrid modules integrated cleanly into the folder structure. They must use low-poly flat-shaded 3D geometries and include custom touch controls.
- Maintain performance guardrails: use InstancedMesh for repetitive background/obstacles and cleanly dispose of retired assets to maintain a locked 60 FPS on mobile.
Please establish a plan in `.agents/orchestrator/plan.md`, keep track of progress in `.agents/orchestrator/progress.md`, and direct subagents as needed to execute the project. Once all milestones are met, report completion to me.

## Resume — 2026-07-12T08:10:11Z

Resume work at /Users/apexclaw/Projects/weekly-game-factory/.agents/orchestrator. Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, and progress.md for current state.
Your parent is 98b1c424-51a6-40a7-bf80-5cd9e97554b7 — use this ID for all escalation and status reporting (send_message).
