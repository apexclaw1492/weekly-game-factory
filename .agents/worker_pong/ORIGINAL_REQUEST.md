## 2026-07-11T13:18:02-05:00
Refactor Red Bull Pong in src/scenes/PongScene.ts.

### 1. Dynamic Paddle Scaling
- Calculate aspect ratio scale dynamically: baseline is `0.6` (portrait). If aspect ratio is larger, scale paddle width up (up to `1.8x` cap).
- In `create()`, `handleResize()`, and `startGameplay()`, apply dynamic scale to player and AI paddles. Call `body.setSize()` to keep physics size in sync.
- Adjust player paddle boundary clamps and AI prediction margins dynamically using `paddle.displayWidth / 2` instead of hardcoded `30`.

### 2. AI Delay & Wobble
- Cap the minimum reaction delay at `120ms` (instead of `40ms`) in `updateAI()`.
- Scale target error wobble based on ball speed: calculate `speedRatio = ballSpeed / ballInitialSpeed`. Multiply the level-based base error range by `speedRatio` to increase AI tracking error as the ball speeds up.

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### Verification Instructions
Run the build and test commands:
- `npm run build`
- `npm run smoke`
- `npm run touch:all`
Verify everything compiles and runs without error.
Write a handoff report at `/Users/apexclaw/Projects/weekly-game-factory/.agents/worker_pong/handoff.md` and include the build/test commands and outcomes.
