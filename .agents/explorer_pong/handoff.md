# Handoff Report: PongScene Refactoring Investigation

This report summarizes the read-only exploration of `src/scenes/PongScene.ts` and recommendations for scaling the paddle dimensions on wide screens and adjusting the AI reaction/wobble logic.

---

## 1. Observation
In `src/scenes/PongScene.ts`, the following structures define paddle dimensions, aspect ratio layouts, and AI opponent behavior:

*   **Paddle Size Definition**:
    *   Line 111: `g.generateTexture('paddle-red', 60, 14);` generates a 60x14 texture.
    *   Lines 142-143: `(this.bottomPaddle.body as Phaser.Physics.Arcade.Body).setSize(60, 14);` sets the physics body sizes to 60x14.
    *   Line 571: AI paddle scaling: `this.topPaddle.setScale(Math.max(0.6, 1 - (this.level - 1) * 0.05), 1);` shrinks the paddle horizontally as the level increases.
*   **Aspect Ratio Layout and Hardcoded Values**:
    *   Line 294: `handleResize()` updates positions and world bounds but does not adjust paddle scale.
    *   Line 335: `this.bottomPaddle.x = Phaser.Math.Clamp(pointer.x, 30, width - 30);` uses `30` (half of 60) for screen boundaries.
    *   Line 374: `const margin = 30;` in `updateAI()` limits target coordinates based on a 30px offset.
*   **AI Opponent Behavior**:
    *   Line 361: `const delay = Math.max(40, this.aiReactionDelay - (this.level * 40));` computes reaction delay, floor capped at 40ms.
    *   Line 385: `const errorRange = Math.max(8, 70 - (this.level * 6));` computes random tracking error, floor capped at 8px (high precision).
    *   Line 403: `this.ballSpeed = Math.min(600, this.ballSpeed * this.ballSpeedIncrement);` increments ball speed up to 600px/sec.

---

## 2. Logic Chain
1.  **Defensive Imbalance on Wide Screens**: On wide aspect ratios, the horizontal distance to defend is larger, but paddles remain 60px wide. Thus, scaling the paddles proportionally to `width / height` (up to a ceiling) will maintain gameplay balance.
2.  **High Round Unplayability**: 
    *   At Level 10, the AI reaction delay is `Math.max(40, 500 - 400) = 100ms`, and its error margin is `Math.max(8, 70 - 60) = 10px`.
    *   Combined with a max ball speed of `600px/s` (where the ball spans the 1000px screen height in under 1.5 seconds), a 100ms delay and 10px error range makes the AI effectively perfect at defending and nearly impossible to beat.
3.  **Refactoring Solution**:
    *   Capping the minimum reaction delay to `120ms` (or `150ms`) ensures that the AI cannot instantly track fast rebounds.
    *   Multiplying the base `errorRange` by `this.ballSpeed / this.ballInitialSpeed` (up to a 3.0x scaling factor) introduces error wobble at high velocities, mimicking tracking lag under stress and giving the player beatable scoring opportunities.

---

## 3. Caveats
*   This was a read-only investigation. No code changes have been applied to `src/scenes/PongScene.ts`.
*   The exact scaling multipliers for aspect ratios and speed wobble should be play-tested to tune responsiveness and difficulty.
*   Phaser's Arcade Physics body sizing might require an explicit call to `body.updateFromGameObject()` or manually re-applying `.setSize(60 * scaleX, 14)` on scale changes.

---

## 4. Conclusion
We recommend refactoring `src/scenes/PongScene.ts` by:
1.  Adding a dynamic aspect ratio helper `getAspectRatioScale()` to scale paddle widths (both player and AI) and updating paddle clamps to use `displayWidth / 2` instead of hardcoded `30`.
2.  Updating the reaction delay limit to `120ms` and multiplying the AI target error range by `ballSpeed / ballInitialSpeed` inside `updateAI()`.

A full layout of these recommendations is written to `.agents/explorer_pong/analysis.md`.

---

## 5. Verification Method
1.  Apply the recommended changes in `src/scenes/PongScene.ts`.
2.  Verify compilation by running:
    ```bash
    npm run build
    ```
3.  Launch the local dev environment (`npm run dev`) or test via routing scripts.
4.  Test wide-screen layout changes in the browser (resizing the window) and observe paddle widths scaling up accordingly.
5.  Play through level 8+ and verify that the AI exhibits reaction lag and wobbles on high-speed rallies, allowing points to be scored.
