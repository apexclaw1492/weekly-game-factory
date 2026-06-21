import Phaser from 'phaser';
import { GameLifecycle, LifecycleState } from '../runtime/GameLifecycle';
import { LifecycleManager } from '../runtime/LifecycleManager';
import { ArcadeInputFrame } from '../runtime/ArcadeInputFrame';
import { InputRuntime } from '../runtime/InputRuntime';
import { SoundSynth } from '../utils/SoundSynth';

export class PongScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = 'PongScene';
  public lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = 'start';

  private ball!: Phaser.Physics.Arcade.Sprite;
  private bottomPaddle!: Phaser.Physics.Arcade.Sprite;
  private topPaddle!: Phaser.Physics.Arcade.Sprite;
  private starfield!: Phaser.GameObjects.Graphics;
  private courtGraphics!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; alpha: number }> = [];

  private scorePlayer = 0;
  private scoreAI = 0;
  private level = 1;
  private lives = 3;
  private ballSpeed = 200;
  private ballInitialSpeed = 200;
  private ballSpeedIncrement = 1.05;
  private setWinScore = 7;
  private maxLevels = 10;

  private aiTargetX = 0;
  private aiError = 0;
  private aiBaseSpeed = 150;
  private aiReactionDelay = 500;
  private lastAiUpdateTime = 0;

  private leftKey!: Phaser.Input.Keyboard.Key;
  private rightKey!: Phaser.Input.Keyboard.Key;

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private overlayBg!: Phaser.GameObjects.Graphics;
  private funFactBox!: Phaser.GameObjects.Container;
  private funFactText!: Phaser.GameObjects.Text;

  private usedFunFacts: Set<number> = new Set();
  private funFacts = [
    'Pong was the first video game to achieve mainstream popularity back in 1972!',
    'The original Pong arcade machine had a 9-inch black-and-white TV.',
    'Pong was released by Atari, founded by Nolan Bushnell in 1972.',
    'The word \'Pong\' comes from the sound the ball makes — \'PONG\'!',
    'Pong\'s creator Allan Alcorn was just 24 years old when he built the game.',
    'The original Pong had only 2 moving parts: paddle and ball.',
    'Pong was first tested in a bar called Andy Capp\'s Tavern in California.',
    'The very first Pong machine broke on day 2 — it was too popular and the coin box overflowed!',
    'Atari sold 8,000 Pong arcade cabinets in its first year.',
    'The home version of Pong was the best-selling Christmas gift of 1975!',
    'Pong tournaments were held in bars across California in the 1970s.',
    'Pong is considered the game that launched the entire video game industry.',
    'Steve Jobs worked on a prototype circuit board for a Pong variant at Atari.',
    'The iconic \'boop\' sound was created from a modified sync generator signal.',
    'Pong inspired the creation of the Atari 2600, the first wildly successful console.',
    'More than 100 unique Pong variants were released across all platforms.',
    'The ball speed increases the longer a rally goes on — just like this game!',
    'Pong was even featured on Saturday Night Live in 1976!',
    'Pong is one of the few games inducted into the World Video Game Hall of Fame.',
    'Pong\'s simplicity made it playable by anyone in seconds — no tutorial needed!'
  ];

  constructor() {
    super('PongScene');
  }

  init() {
    this.stars = [];
    this.scorePlayer = 0;
    this.scoreAI = 0;
    this.level = 1;
    this.lives = 3;
    this.ballSpeed = 200;
    this.lifecycleState = 'start';
    this.usedFunFacts.clear();
  }

  create() {
    const { width, height } = this.scale;

    // Background Gradient
    const bgGraphics = this.add.graphics();
    bgGraphics.fillGradientStyle(0x03020b, 0x03020b, 0x1a0030, 0x1a0030, 1);
    bgGraphics.fillRect(0, 0, width, height);
    bgGraphics.setScrollFactor(0);

    // Starfield
    this.starfield = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.7
      });
    }

    // Court Lines
    this.courtGraphics = this.add.graphics();
    this.drawCourt();

    // Textures
    if (!this.textures.exists('paddle-red')) {
      const g = this.add.graphics();
      // Red Bull red (#EE0000) with golden (#FFD700) border
      g.lineStyle(2, 0xFFD700, 1);
      g.fillStyle(0xEE0000, 1);
      g.fillRoundedRect(0, 0, 60, 14, 4);
      g.strokeRoundedRect(0, 0, 60, 14, 4);
      g.generateTexture('paddle-red', 60, 14);
      g.destroy();
    }

    if (!this.textures.exists('ball')) {
      const g = this.add.graphics();
      // White filled circle with red glow
      g.fillStyle(0xffffff, 1);
      g.fillCircle(6, 6, 6);
      g.generateTexture('ball', 12, 12);
      g.destroy();
    }

    if (!this.textures.exists('ball-glow')) {
      const g = this.add.graphics();
      g.fillStyle(0xff0000, 0.3);
      g.fillCircle(8, 8, 8);
      g.generateTexture('ball-glow', 16, 16);
      g.destroy();
    }

    // Paddles
    this.bottomPaddle = this.physics.add.sprite(width / 2, height - 60, 'paddle-red');
    this.bottomPaddle.setImmovable(true);
    this.bottomPaddle.setCollideWorldBounds(true);

    this.topPaddle = this.physics.add.sprite(width / 2, 60, 'paddle-red');
    this.topPaddle.setImmovable(true);
    this.topPaddle.setCollideWorldBounds(true);

    // Explicit physics body sizing for reliable collisions
    (this.bottomPaddle.body as Phaser.Physics.Arcade.Body).setSize(60, 14);
    (this.topPaddle.body as Phaser.Physics.Arcade.Body).setSize(60, 14);
    // Make bodies immovable
    (this.bottomPaddle.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.bottomPaddle.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.topPaddle.body as Phaser.Physics.Arcade.Body).setImmovable(true);
    (this.topPaddle.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    // Ball
    this.ball = this.physics.add.sprite(width / 2, height / 2, 'ball');
    this.ball.setBounce(1);
    this.ball.setCollideWorldBounds(true);
    (this.ball.body as Phaser.Physics.Arcade.Body).onWorldBounds = true;

    // World Bounds for side walls (gutters)
    this.physics.world.setBounds(20, 0, width - 40, height);
    this.physics.world.setBoundsCollision(true, true, false, false);
    this.physics.world.on('worldbounds', (body: Phaser.Physics.Arcade.Body) => {
      if (body.gameObject === this.ball) {
        SoundSynth.playTone(600, 0.05, 'sine', 0.02);
      }
    });

    // Collisions
    this.physics.add.collider(this.ball, this.bottomPaddle, this.hitPaddle, undefined, this);
    this.physics.add.collider(this.ball, this.topPaddle, this.hitPaddle, undefined, this);

    // HUD
    this.scoreText = this.add.text(width / 2, 40, 'PLAYER 0 - AI 0', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.levelText = this.add.text(20, 20, 'GRAND PRIX ROUND 1', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#FFD700'
    }).setScrollFactor(0);

    this.livesText = this.add.text(width - 20, 20, 'LIVES: ❤️ ❤️ ❤️', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#FFD700'
    }).setOrigin(1, 0).setScrollFactor(0);

    this.stateText = this.add.text(width / 2, height / 2 - 50, 'RED BULL PONG CHAMPIONSHIP', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#EE0000',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    this.hintText = this.add.text(width / 2, height / 2 + 50, 'TAP TO START\n\nDRAG ON BOTTOM HALF TO MOVE\nARROWS LEFT/RIGHT ON DESKTOP', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    this.leftKey = this.input.keyboard!.addKey('LEFT');
    this.rightKey = this.input.keyboard!.addKey('RIGHT');

    this.backBtn = this.add.text(20, 4, '<- BACK TO HUB', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.backBtn.setInteractive({ useHandCursor: true });
    this.backBtn.on('pointerdown', () => this.returnToHub());

    // Fun Fact Overlay
    this.overlayBg = this.add.graphics();
    this.overlayBg.fillStyle(0x000000, 0.85);
    this.overlayBg.fillRect(0, 0, width, height);
    this.overlayBg.setScrollFactor(0);
    this.overlayBg.setVisible(false);

    this.funFactBox = this.add.container(width / 2, height / 2).setScrollFactor(0).setVisible(false);
    const boxG = this.add.graphics();
    boxG.lineStyle(4, 0xFFD700, 1);
    boxG.fillStyle(0x1a0030, 1);
    boxG.fillRoundedRect(-150, -100, 300, 200, 12);
    boxG.strokeRoundedRect(-150, -100, 300, 200, 12);
    this.funFactBox.add(boxG);

    const setWonText = this.add.text(0, -130, 'SET WON!', {
      fontSize: '40px',
      fontFamily: 'monospace',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.funFactBox.add(setWonText);

    this.funFactText = this.add.text(0, 0, '', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 260 }
    }).setOrigin(0.5);
    this.funFactBox.add(this.funFactText);

    const tapContinue = this.add.text(0, 130, 'TAP TO CONTINUE', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#FFD700'
    }).setOrigin(0.5);
    this.funFactBox.add(tapContinue);

    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    this.lifecycleManager = new LifecycleManager(this, runtime);

    this.showStart();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private drawCourt() {
    const { width, height } = this.scale;
    this.courtGraphics.clear();
    
    // Side boundaries (gutters)
    this.courtGraphics.lineStyle(4, 0xFFD700, 0.5);
    this.courtGraphics.lineBetween(10, 0, 10, height);
    this.courtGraphics.lineBetween(width - 10, 0, width - 10, height);

    // Dashed center line (horizontal)
    this.courtGraphics.lineStyle(2, 0xFFD700, 0.3);
    const dashLength = 10;
    const gapLength = 10;
    for (let x = 10; x < width - 10; x += dashLength + gapLength) {
      this.courtGraphics.lineBetween(x, height / 2, x + dashLength, height / 2);
    }
  }

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

  update(time: number) {
    const { width, height } = this.scale;

    // Starfield animation
    this.starfield.clear();
    this.stars.forEach(star => {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      this.starfield.fillStyle(0xffffff, star.alpha);
      this.starfield.fillRect(star.x, star.y, 1.5, 1.5);
    });

    if (!this.lifecycleManager) return;
    const state = this.lifecycleManager.update(time);
    
    if (state !== 'playing') {
      this.ball.setVelocity(0, 0);
      return;
    }

    // Player controls — Phaser native pointer + keyboard
    const pointer = this.input.activePointer;
    const isTouching = pointer.isDown || pointer.wasTouch;
    
    if (isTouching && pointer.y > height / 2) {
      // Touch mode: move paddle to follow finger X position
      this.bottomPaddle.x = Phaser.Math.Clamp(pointer.x, 30, width - 30);
      this.bottomPaddle.setVelocityX(0);
    } else {
      // Keyboard mode: ArrowLeft / ArrowRight with smooth velocity
      let playerVx = 0;
      if (this.leftKey.isDown) {
        playerVx = -400;
      } else if (this.rightKey.isDown) {
        playerVx = 400;
      }
      this.bottomPaddle.setVelocityX(playerVx);
    }

    // AI controls
    this.updateAI(time);

    // Scoring (top/bottom)
    if (this.ball.y < 0) {
      this.scorePoint(true); // Player scores
    } else if (this.ball.y > height) {
      this.scorePoint(false); // AI scores
    }
  }

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

  private hitPaddle(_ball: any, _paddle: any) {
    const paddle = _paddle as Phaser.Physics.Arcade.Sprite;
    const paddleBody = paddle.body as Phaser.Physics.Arcade.Body;
    this.ballSpeed = Math.min(600, this.ballSpeed * this.ballSpeedIncrement);
    
    // Determine if this is the top or bottom paddle
    const isTopPaddle = paddle === this.topPaddle;
    
    // Compute where on the paddle the ball hit (-1 to 1 from left to right)
    const hitOffset = (this.ball.x - paddle.x) / (paddle.displayWidth / 2);
    const clampedOffset = Phaser.Math.Clamp(hitOffset, -0.9, 0.9);
    
    // Bounce angle: stronger near edges, but never perfectly vertical.
    const angleRad = clampedOffset * (Math.PI / 3); // max ±60°
    
    // New velocity direction
    const dirY = isTopPaddle ? 1 : -1; // ball goes down after hitting top, up after hitting bottom
    let newVx = Math.sin(angleRad) * this.ballSpeed;
    let newVy = Math.cos(angleRad) * this.ballSpeed * dirY;
    
    // Add a little "spin" from paddle movement so hits feel alive.
    newVx += paddleBody.velocity.x * 0.18;

    // Prevent the ball from getting stuck in boring straight vertical rallies.
    const minAbsVx = Math.max(90, this.ballSpeed * 0.28);
    if (Math.abs(newVx) < minAbsVx) {
      const direction = newVx !== 0 ? Math.sign(newVx) : (this.ball.x < this.scale.width / 2 ? -1 : 1);
      newVx = minAbsVx * direction;
    }

    // Clamp newVx so spin can't push it past the speed budget before computing maxVy.
    newVx = Phaser.Math.Clamp(newVx, -this.ballSpeed, this.ballSpeed);

    // Keep the total speed stable after the horizontal clamp.
    const maxVy = Math.sqrt(Math.max(1, (this.ballSpeed * this.ballSpeed) - (newVx * newVx)));
    newVy = Math.sign(newVy) * maxVy;
    
    this.ball.setVelocity(newVx, newVy);
    
    SoundSynth.playHit();
    this.cameras.main.flash(50, 255, 215, 0);
  }

  private scorePoint(isPlayer: boolean) {
    if (isPlayer) {
      this.scorePlayer++;
    } else {
      this.scoreAI++;
      this.lives--;
      this.updateLivesDisplay();
      SoundSynth.playDeath();
    }
    
    this.scoreText.setText(`PLAYER ${this.scorePlayer} - AI ${this.scoreAI}`);
    
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    if (this.scorePlayer >= this.setWinScore) {
      this.setWon();
      return;
    }

    if (this.scoreAI >= this.setWinScore) {
      this.gameOver();
      return;
    }

    this.resetBall(isPlayer);
  }

  private resetBall(serveUp: boolean) {
    const { width, height } = this.scale;
    this.ball.setPosition(width / 2, height / 2);
    this.ballSpeed = this.ballInitialSpeed + (this.level * 30);
    
    // Serve with a deliberate diagonal so rallies don't become vertical wall loops.
    const angleDeg = 25 + Math.random() * 20;
    const angle = Phaser.Math.DegToRad(angleDeg);
    const horizontalDir = Math.random() < 0.5 ? -1 : 1;
    const vy = Math.cos(angle) * this.ballSpeed * (serveUp ? -1 : 1);
    const vx = Math.sin(angle) * this.ballSpeed * horizontalDir;
    
    this.ball.setVelocity(vx, vy);
  }

  private updateLivesDisplay() {
    let livesStr = 'LIVES: ';
    for (let i = 0; i < 3; i++) {
      livesStr += i < this.lives ? '❤️ ' : '🖤 ';
    }
    this.livesText.setText(livesStr);
  }

  private setWon() {
    this.lifecycleState = 'levelComplete';
    this.overlayBg.setVisible(true);
    this.funFactBox.setVisible(true);
    
    let factIndex;
    if (this.usedFunFacts.size >= this.funFacts.length) {
      this.usedFunFacts.clear();
    }
    
    do {
      factIndex = Math.floor(Math.random() * this.funFacts.length);
    } while (this.usedFunFacts.has(factIndex));
    
    this.usedFunFacts.add(factIndex);
    this.funFactText.setText(this.funFacts[factIndex]);
    
    SoundSynth.playLevelUp();
  }

  private gameOver() {
    this.lifecycleState = 'gameOver';
    this.stateText.setText('GAME OVER').setVisible(true);
    this.hintText.setText('FINAL SCORE: ' + this.scorePlayer + '\nTAP TO RESTART').setVisible(true);
    this.ball.setVelocity(0, 0);
  }

  private victory() {
    this.lifecycleState = 'gameOver'; // Use gameOver state for victory screen pattern
    this.stateText.setText('WORLD CHAMPION!').setColor('#FFD700').setVisible(true);
    this.hintText.setText('YOU BEAT ALL 10 ROUNDS!\nTAP TO PLAY AGAIN').setVisible(true);
    this.ball.setVelocity(0, 0);
    SoundSynth.playLevelUp();
  }

  // GameLifecycle implementation
  public showStart(): void {
    this.lifecycleState = 'start';
    this.stateText.setVisible(true).setText('RED BULL PONG CHAMPIONSHIP');
    this.hintText.setVisible(true).setText('TAP TO START\n\nDRAG ON BOTTOM HALF TO MOVE\nARROWS LEFT/RIGHT ON DESKTOP');
    this.overlayBg.setVisible(false);
    this.funFactBox.setVisible(false);
    this.ball.setVisible(false);
  }

  public startGameplay(): void {
    if (this.lifecycleState === 'levelComplete') {
      this.level++;
      if (this.level > this.maxLevels) {
        this.victory();
        return;
      }
      this.scorePlayer = 0;
      this.scoreAI = 0;
      this.scoreText.setText(`PLAYER ${this.scorePlayer} - AI ${this.scoreAI}`);
      this.levelText.setText(`GRAND PRIX ROUND ${this.level}`);
      // Scale AI difficulty (shrink paddle width)
      this.topPaddle.setScale(Math.max(0.6, 1 - (this.level - 1) * 0.05), 1);
    }
    
    this.lifecycleState = 'playing';
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.overlayBg.setVisible(false);
    this.funFactBox.setVisible(false);
    this.ball.setVisible(true);
    this.resetBall(true);
  }

  public pauseGameplay(): void {
    this.lifecycleState = 'paused';
  }

  public resumeGameplay(): void {
    this.lifecycleState = 'playing';
  }

  public resetGameplay(): void {
    this.init();
    this.updateLivesDisplay();
    this.scoreText.setText('PLAYER 0 - AI 0');
    this.levelText.setText('GRAND PRIX ROUND 1');
    this.topPaddle.setScale(1, 1);
    this.showStart();
  }

  public returnToHub(): void {
    SoundSynth.playTone(400, 0.1, 'sine', 0.05);
    this.scene.start('HubScene');
  }

  public handleArcadeInput(_frame: ArcadeInputFrame): void {
    // Input handled in update() via runtime.readFrame()
  }

  public destroySceneResources(): void {
    this.stars = [];
  }

  public getGameplayStateForQA() {
    return {
      sceneKey: this.sceneKey,
      lifecycle: this.lifecycleState,
      orientation: (this.scale.height >= this.scale.width ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
      player: {
        x: this.bottomPaddle.x,
        y: this.bottomPaddle.y,
        vx: this.bottomPaddle.body?.velocity.x,
        vy: this.bottomPaddle.body?.velocity.y,
        alive: this.lives > 0
      },
      score: this.scorePlayer,
      lives: this.lives,
      primaryActionCount: 1, // Ball
      enemyOrHazardCount: 1, // AI Paddle
      messages: []
    };
  }
}
