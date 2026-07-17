# Refactoring Analysis: PongScene Paddle Scaling and AI Adjustment

This document details the exploration of `src/scenes/PongScene.ts` and recommends a concrete refactoring strategy for the two main requirements.

---

## 1. Code Analysis and Target Locations

### A. Paddle Dimensions
- **Texture Definition (Lines 104-113)**: The paddle texture is dynamically generated as a static 60x14 rounded rectangle.
```typescript
if (!this.textures.exists('paddle-red')) {
  const g = this.add.graphics();
  // Neon green (#00c805) with white border
  g.lineStyle(2, 0xffffff, 1);
  g.fillStyle(0x00c805, 1);
  g.fillRoundedRect(0, 0, 60, 14, 4);
  g.strokeRoundedRect(0, 0, 60, 14, 4);
  g.generateTexture('paddle-red', 60, 14);
  g.destroy();
}
```
- **Sprite Instantiation and Body Sizing (Lines 133-149)**:
```typescript
this.bottomPaddle = this.physics.add.sprite(width / 2, height - 60, 'paddle-red');
// ...
this.topPaddle = this.physics.add.sprite(width / 2, 60, 'paddle-red');
// ...
(this.bottomPaddle.body as Phaser.Physics.Arcade.Body).setSize(60, 14);
(this.topPaddle.body as Phaser.Physics.Arcade.Body).setSize(60, 14);
```
- **AI Paddle Level-based Scaling (Line 571)**:
```typescript
// Scale AI difficulty (shrink paddle width)
this.topPaddle.setScale(Math.max(0.6, 1 - (this.level - 1) * 0.05), 1);
```

### B. Aspect Ratio Layouts
- **Layout Adjustments in `handleResize` (Lines 294-313)**:
```typescript
private handleResize() {
  const { width, height } = this.scale;
  this.drawCourt();
  this.scoreText.setPosition(width / 2, 40);
  this.levelText.setPosition(20, 20);
  this.livesText.setPosition(width - 20, 20);
  this.stateText.setPosition(width / 2, height / 2 - 50);
  this.hintText.setPosition(width / 2, height / 2 + 50);
  this.backBtn.setPosition(20, 4);
  
  this.bottomPaddle.setY(height - 60);
  this.topPaddle.setY(60);
  
  this.overlayBg.clear();
  this.overlayBg.fillStyle(0x000000, 0.85);
  this.overlayBg.fillRect(0, 0, width, height);
  this.funFactBox.setPosition(width / 2, height / 2);

  this.physics.world.setBounds(20, 0, width - 40, height);
}
```
- **Hardcoded Boundaries in `update` / Input Handling (Lines 333-336)**:
```typescript
if (isTouching && pointer.y > height / 2) {
  // Touch mode: move paddle to follow finger X position
  this.bottomPaddle.x = Phaser.Math.Clamp(pointer.x, 30, width - 30);
  this.bottomPaddle.setVelocityX(0);
}
```
*Note: The boundary clamp uses `30` which assumes a static paddle width of `60`.*

### C. AI Opponent Behavior
- **AI Configuration Fields (Lines 30-34)**:
```typescript
private aiTargetX = 0;
private aiError = 0;
private aiBaseSpeed = 150;
private aiReactionDelay = 500;
private lastAiUpdateTime = 0;
```
- **Update and Error Mechanics in `updateAI` (Lines 359-398)**:
```typescript
private updateAI(time: number) {
  const { width } = this.scale;
  const delay = Math.max(40, this.aiReactionDelay - (this.level * 40));
  const speed = this.aiBaseSpeed + (this.level * 20);
  
  if (time - this.lastAiUpdateTime > delay) {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    
    if (ballBody.velocity.y < 0) {
      // Ball is coming towards AI - simple destination prediction
      const distY = Math.abs(this.ball.y - this.topPaddle.y);
      const timeToHit = distY / Math.max(1, Math.abs(ballBody.velocity.y));
      let predictedX = this.ball.x + (ballBody.velocity.x * timeToHit);
      
      // Clamp prediction within playable bounds to account for wall bounces
      const margin = 30;
      if (predictedX < margin) predictedX = margin;
      if (predictedX > width - margin) predictedX = width - margin;
      
      this.aiTargetX = predictedX;
    } else {
      // Ball is moving away - track ball X lazily to stay in position
      this.aiTargetX = width / 2 + (this.ball.x - width / 2) * 0.5;
    }

    // AI error reduces with level (better accuracy), but remains beatable
    const errorRange = Math.max(8, 70 - (this.level * 6));
    this.aiError = (Math.random() - 0.5) * errorRange;
    this.lastAiUpdateTime = time;
  }

  const target = this.aiTargetX + this.aiError;
  const diff = target - this.topPaddle.x;
  
  if (Math.abs(diff) > 8) {
    this.topPaddle.setVelocityX(speed * Math.sign(diff));
  } else {
    this.topPaddle.setVelocityX(0);
  }
}
```

---

## 2. Refactoring Recommendations

### Recommendation 1: Dynamic Paddle Scaling for Wide Aspect Ratios

#### Objective
To balance gameplay on wide screen aspect ratios (landscape), the paddle's width should scale up horizontally. In portrait (vertical layout), the paddle should remain closer to its default size.

#### Strategy
1. **Define a Helper Method** to compute the scaling factor based on current width/height.
   - Baseline aspect ratio: `0.6` (standard mobile/portrait).
   - If the aspect ratio increases beyond `0.6`, increase the paddle scale linearly, capped at a maximum factor of `1.8x` or `2.0x`.
2. **Apply Scaling in `create`, `handleResize`, and `startGameplay`**:
   - For the Player: Scale horizontally by the aspect ratio scale.
   - For the AI: Multiply the aspect ratio scale by the level-based difficulty scale factor.
   - Explicitly call `body.setSize()` to ensure physics matches the visual bounds.
3. **Refactor Boundary Clamps**: Replace the hardcoded `30` bounds with `paddle.displayWidth / 2` to prevent paddles from clipping or stopping short of the walls.

#### Proposed Code Changes

##### Helper Method
```typescript
private getAspectRatioScale(): number {
  const { width, height } = this.scale;
  const aspectRatio = width / height;
  const baseRatio = 0.6; // Baseline portrait aspect ratio
  
  if (aspectRatio > baseRatio) {
    // Increase scale up to 1.8x on wide screens
    return Math.min(1.8, 1.0 + (aspectRatio - baseRatio) * 0.65);
  }
  return 1.0;
}
```

##### Applying Scaling
Create a consolidated `updatePaddleScales` method and call it from `create`, `handleResize`, and `startGameplay`:
```typescript
private updatePaddleScales() {
  const arScale = this.getAspectRatioScale();
  const levelScale = Math.max(0.6, 1 - (this.level - 1) * 0.05);
  
  // Apply to Player Paddle
  this.bottomPaddle.setScale(arScale, 1);
  (this.bottomPaddle.body as Phaser.Physics.Arcade.Body).setSize(60 * arScale, 14);

  // Apply to AI Paddle (combining level difficulty shrink with aspect ratio scale)
  const aiScaleX = arScale * levelScale;
  this.topPaddle.setScale(aiScaleX, 1);
  (this.topPaddle.body as Phaser.Physics.Arcade.Body).setSize(60 * aiScaleX, 14);
}
```

##### Fixing Hardcoded Offsets
- In `update()` (Player movement clamp):
```typescript
// Replace: this.bottomPaddle.x = Phaser.Math.Clamp(pointer.x, 30, width - 30);
const halfWidth = this.bottomPaddle.displayWidth / 2;
this.bottomPaddle.x = Phaser.Math.Clamp(pointer.x, halfWidth, width - halfWidth);
```

- In `updateAI()` (AI prediction margin):
```typescript
// Replace: const margin = 30;
const margin = this.topPaddle.displayWidth / 2;
```

---

### Recommendation 2: Capped AI Delay and Speed-based Error Wobble

#### Objective
Ensure that high rounds (levels 8-10) remain beatable even when ball speed accelerates. At high levels, the AI react too quickly (minimum 40ms) and has low error rates (10px range).

#### Strategy
1. **Increase the Minimum Reaction Delay Cap**: Raise the reaction delay floor from `40ms` to `120ms` (or `150ms`). This introduces a reliable window for the player to sneak the ball past the AI during fast returns.
2. **Scale AI Target Error with Ball Speed (Wobble)**: Scale the `errorRange` dynamically based on how fast the ball is moving relative to its initial speed. As the ball speeds up, the AI's target estimation becomes less precise, simulating tracking instability under high velocity.

#### Proposed Code Changes

##### In `updateAI` (reaction delay and error calculation):
```typescript
private updateAI(time: number) {
  const { width } = this.scale;
  
  // Cap the minimum reaction delay to 120ms instead of 40ms
  const minReactionDelay = 120;
  const delay = Math.max(minReactionDelay, this.aiReactionDelay - (this.level * 40));
  const speed = this.aiBaseSpeed + (this.level * 20);
  
  if (time - this.lastAiUpdateTime > delay) {
    const ballBody = this.ball.body as Phaser.Physics.Arcade.Body;
    
    if (ballBody.velocity.y < 0) {
      const distY = Math.abs(this.ball.y - this.topPaddle.y);
      const timeToHit = distY / Math.max(1, Math.abs(ballBody.velocity.y));
      let predictedX = this.ball.x + (ballBody.velocity.x * timeToHit);
      
      const margin = this.topPaddle.displayWidth / 2;
      if (predictedX < margin) predictedX = margin;
      if (predictedX > width - margin) predictedX = width - margin;
      
      this.aiTargetX = predictedX;
    } else {
      this.aiTargetX = width / 2 + (this.ball.x - width / 2) * 0.5;
    }

    // AI base error reduces with level (better accuracy)
    const baseErrorRange = Math.max(8, 70 - (this.level * 6));
    
    // Wobble factor scales error range up with ball speed (ratio of current speed to initial speed)
    const speedRatio = this.ballSpeed / this.ballInitialSpeed; // scales from 1.0 up to 3.0
    const errorRange = baseErrorRange * speedRatio;
    
    this.aiError = (Math.random() - 0.5) * errorRange;
    this.lastAiUpdateTime = time;
  }

  const target = this.aiTargetX + this.aiError;
  const diff = target - this.topPaddle.x;
  
  if (Math.abs(diff) > 8) {
    this.topPaddle.setVelocityX(speed * Math.sign(diff));
  } else {
    this.topPaddle.setVelocityX(0);
  }
}
```
