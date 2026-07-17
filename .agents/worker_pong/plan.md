# Implementation Plan - Pong Scene Refactoring

## 1. Dynamic Paddle Scaling
- Add a helper method `getDynamicPaddleScale(): number` to compute aspect ratio-based scale:
  - `aspectRatio = width / height`
  - If `aspectRatio > 0.6`, scale is `aspectRatio / 0.6`, capped at `1.8`. Otherwise, scale is `1.0`.
- Add a helper method `updatePaddleScales()`:
  - Apply the dynamic scale to the player paddle. Set physics body size: `body.setSize(this.bottomPaddle.displayWidth, 14)`.
  - Apply the level-based factor AND the dynamic scale to the AI paddle:
    - `aiLevelFactor = Math.max(0.6, 1 - (this.level - 1) * 0.05)`
    - `aiScaleX = aspectScale * aiLevelFactor`
    - Set physics body size: `body.setSize(this.topPaddle.displayWidth, 14)`.
- Invoke `updatePaddleScales()` in:
  - `create()` (after both paddles are initialized and body properties configured)
  - `handleResize()`
  - `startGameplay()` (replacing the manual scaling of `this.topPaddle`)
  - `resetGameplay()` (replacing `this.topPaddle.setScale(1, 1)`)
- Update boundary clamps and AI prediction margins to use `paddle.displayWidth / 2` instead of hardcoded `30`:
  - Player paddle boundary in `update()`: `const halfWidth = this.bottomPaddle.displayWidth / 2;`
  - AI paddle margin in `updateAI()`: `const margin = this.topPaddle.displayWidth / 2;`

## 2. AI Delay & Wobble
- In `updateAI()`:
  - Update `delay` calculation to cap minimum reaction delay at `120ms` instead of `40ms`:
    `const delay = Math.max(120, this.aiReactionDelay - (this.level * 40));`
  - Calculate speedRatio: `speedRatio = this.ballSpeed / this.ballInitialSpeed`.
  - Update `errorRange` calculation:
    `const errorRange = Math.max(8, 70 - (this.level * 6)) * speedRatio;`

## 3. Verification
- Run build command `npm run build`
- Run smoke test command `npm run smoke`
- Run validation command `npm run touch:all`
