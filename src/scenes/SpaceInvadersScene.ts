import Phaser from 'phaser';
import { TouchControls } from '../objects/TouchControls';
import { SoundSynth } from '../utils/SoundSynth';

export class SpaceInvadersScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  
  private touchControls?: TouchControls;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  // Game state
  private level = 1;
  private score = 0;
  private multiplier = 1;
  private lastHitTime = 0;
  private playerSpeed = 300;
  private lastShotTime = 0;
  private lastEnemyShotTime = 0;
  private highScores: number[] = [];

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hiScoreText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  
  private starfield!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; alpha: number }> = [];

  private isGameOver = false;
  private isLevelComplete = false;
  private isWaitingToStart = true;

  constructor() {
    super('SpaceInvadersScene');
  }

  init() {
    this.level = 1;
    this.score = 0;
    this.multiplier = 1;
    this.lastHitTime = 0;
    this.playerSpeed = 300;
    this.lastShotTime = 0;
    this.lastEnemyShotTime = 0;
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.isWaitingToStart = true;

    const savedScores = localStorage.getItem('f1_scores');
    this.highScores = savedScores ? JSON.parse(savedScores) : [];
  }

  create() {
    const { width, height } = this.scale;

    // 1. Create starfield background
    this.starfield = this.add.graphics();
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.7
      });
    }

    // 2. Physics groups
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 30,
      runChildUpdate: true
    });

    this.enemyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 30,
      runChildUpdate: true
    });

    this.powerUps = this.physics.add.group();

    // Generate bullet and powerup textures once
    if (!this.textures.exists('p-bullet')) {
      const g = this.add.graphics();
      g.fillStyle(0xff0000, 1);
      g.fillRect(0, 0, 4, 12);
      g.generateTexture('p-bullet', 4, 12);
      g.destroy();
    }
    if (!this.textures.exists('e-bullet')) {
      const g = this.add.graphics();
      g.fillStyle(0x00ff00, 1);
      g.fillRect(0, 0, 4, 12);
      g.generateTexture('e-bullet', 4, 12);
      g.destroy();
    }
    if (!this.textures.exists('pup-speed')) {
      const g = this.add.graphics();
      g.fillStyle(0x00ccff, 1);
      g.fillRect(0, 0, 14, 14);
      g.lineStyle(1.5, 0xffffff, 1);
      g.strokeRect(0, 0, 14, 14);
      g.generateTexture('pup-speed', 14, 14);
      g.destroy();
    }

    // 3. Player car setup
    this.player = this.physics.add.sprite(width / 2, height - 70, 'player-f1');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.2);

    // 4. Enemies setup
    this.enemies = this.physics.add.group();
    this.initEnemies();

    // 5. Physics collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.hitPlayer, undefined, this);
    this.physics.add.overlap(this.powerUps, this.player, this.collectPowerUp, undefined, this);

    // 6. Controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Load Touch controls for mobile viewports
    if (this.sys.game.device.input.touch) {
      this.touchControls = new TouchControls(this, 'lr-shoot');
    }

    // 7. UI setup
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', { fontSize: '18px', fontFamily: 'monospace', color: '#ffffff' });
    this.levelText = this.add.text(width - 20, 20, 'LEVEL 1', { fontSize: '18px', fontFamily: 'monospace', color: '#8888a0' }).setOrigin(1, 0);
    
    this.comboText = this.add.text(20, 45, '', { fontSize: '14px', fontFamily: 'monospace', color: '#ffd700' });
    
    // Title overlay
    this.stateText = this.add.text(width / 2, height / 2 - 50, 'F1 SPACE INVADERS', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.hintText = this.add.text(width / 2, height / 2 + 20, 'TAP OR SPACE TO START\n\n[<- ->] to Move | [SPACE] to Fire', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // Dynamic High Score display
    const hiScore = this.highScores.length > 0 ? this.highScores[0] : 0;
    this.hiScoreText = this.add.text(width / 2, height / 2 + 100, `🏆 HI SCORE: ${hiScore}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffd700'
    }).setOrigin(0.5);

    // Back to Hub Button (floating UI)
    this.backBtn = this.add.text(width - 20, height - 30, '← BACK TO HUB', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });

    this.backBtn.on('pointerdown', () => {
      SoundSynth.playTone(400, 0.1, 'sine', 0.05);
      this.scene.start('HubScene');
    });

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);

    // Start trigger
    this.input.on('pointerdown', () => {
      if (this.isWaitingToStart) {
        this.startGame();
      } else if (this.isGameOver) {
        this.scene.restart();
      } else if (this.isLevelComplete) {
        this.nextLevel();
      } else {
        this.firePlayerBullet();
      }
    });
  }

  private handleResize() {
    const { width, height } = this.scale;

    // Reposition UI
    this.levelText.setPosition(width - 20, 20);
    this.stateText.setPosition(width / 2, height / 2 - 50);
    this.hintText.setPosition(width / 2, height / 2 + 20);
    this.hiScoreText.setPosition(width / 2, height / 2 + 100);
    this.backBtn.setPosition(width - 20, height - 30);

    // Update starfield
    this.starfield.clear();
    this.stars.forEach(star => {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    });

    // Resize touch controls
    if (this.touchControls) {
      this.touchControls.resize();
    }

    // Reposition player
    if (this.player) {
      this.player.setY(height - 70);
    }
  }

  update(time: number) {
    const { width, height } = this.scale;

    // Background star scrolling
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

    if (this.isWaitingToStart || this.isGameOver || this.isLevelComplete) {
      this.player.setVelocityX(0);
      return;
    }

    // --- PLAYER MOVEMENT ---
    let vx = 0;
    if (this.cursors.left.isDown || this.touchControls?.leftPressed) {
      vx = -this.playerSpeed;
    } else if (this.cursors.right.isDown || this.touchControls?.rightPressed) {
      vx = this.playerSpeed;
    }
    this.player.setVelocityX(vx);

    // --- PLAYER AUTO-FIRE (Keyboard Space or touch button) ---
    if (this.spaceKey.isDown || this.touchControls?.aPressed) {
      this.firePlayerBullet();
    }

    // --- ENEMY MOVEMENT & DOWN-STEPPING ---
    let shiftDown = false;
    let dir = 1;
    this.enemies.getChildren().forEach(child => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const enemyDir = enemy.getData('dir') as number;
      dir = enemyDir;
      const speed = enemy.getData('speed') as number;
      enemy.setVelocityX(speed * enemyDir);

      if (enemyDir > 0 && enemy.x >= width - 25) {
        shiftDown = true;
      } else if (enemyDir < 0 && enemy.x <= 25) {
        shiftDown = true;
      }
    });

    if (shiftDown) {
      this.enemies.getChildren().forEach(child => {
        const enemy = child as Phaser.Physics.Arcade.Sprite;
        enemy.setData('dir', dir * -1);
        enemy.y += 20;

        // Check if enemies reached bottom / player car height
        if (enemy.y >= this.player.y - 10) {
          this.gameOver();
        }
      });
    }

    // --- ENEMY SHOOTING ---
    if (time - this.lastEnemyShotTime > 1500) {
      this.fireEnemyBullet();
      this.lastEnemyShotTime = time;
    }

    // Bullet bounds cleaners
    this.bullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      if (b.y < 0) b.destroy();
    });

    this.enemyBullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      if (b.y > height) b.destroy();
    });

    this.powerUps.getChildren().forEach(pup => {
      const p = pup as Phaser.Physics.Arcade.Image;
      if (p.y > height) p.destroy();
    });

    // Combo timer decay
    if (Date.now() - this.lastHitTime > 2000 && this.multiplier > 1) {
      this.multiplier = 1;
      this.comboText.setText('');
    }
  }

  private initEnemies() {
    this.enemies.clear(true, true);

    const rows = 4 + this.level;
    const cols = 6 + Math.min(this.level, 4);
    const spacingX = 50;
    const spacingY = 32;
    
    const { width } = this.scale;
    const gridWidth = (cols - 1) * spacingX;
    const startX = (width - gridWidth) / 2;
    const startY = 80;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const enemy = this.physics.add.sprite(startX + col * spacingX, startY + row * spacingY, 'enemy-f1');
        enemy.setOrigin(0.5);
        enemy.setData('speed', 40 + this.level * 10);
        enemy.setData('dir', 1);
        this.enemies.add(enemy);
      }
    }
  }

  private startGame() {
    this.isWaitingToStart = false;
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
  }

  private firePlayerBullet() {
    const timeNow = this.time.now;
    if (timeNow - this.lastShotTime < 280) return; // limit fire rate
    this.lastShotTime = timeNow;

    const bullet = this.bullets.get(this.player.x, this.player.y - 20) as Phaser.Physics.Arcade.Image;
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setTexture('p-bullet');
      bullet.body?.setSize(4, 12);
      bullet.setVelocityY(-400);

      SoundSynth.playShoot();
    }
  }

  private fireEnemyBullet() {
    const children = this.enemies.getChildren();
    if (children.length === 0) return;

    const shooter = Phaser.Utils.Array.GetRandom(children) as Phaser.Physics.Arcade.Sprite;
    const bullet = this.enemyBullets.get(shooter.x, shooter.y + 20) as Phaser.Physics.Arcade.Image;
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setTexture('e-bullet');
      bullet.body?.setSize(4, 12);
      bullet.setVelocityY(200 + this.level * 10);
    }
  }

  private hitEnemy(bulletObj: any, enemyObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;

    // Create custom particle burst using Graphics textures
    this.createExplosionParticles(enemy.x, enemy.y, 0xffff00);

    bullet.destroy();
    enemy.destroy();

    SoundSynth.playHit();

    // Scoring Combo
    const now = Date.now();
    if (now - this.lastHitTime < 2000) {
      this.multiplier++;
    } else {
      this.multiplier = 1;
    }
    this.lastHitTime = now;

    this.score += 100 * this.multiplier;
    this.scoreText.setText(`SCORE: ${this.score}`);
    
    if (this.multiplier > 1) {
      this.comboText.setText(`🔥 x${this.multiplier} COMBO!`);
    }

    // Power-up chance
    if (Math.random() < 0.15) {
      this.spawnPowerUp(enemy.x, enemy.y);
    }

    // Check Win
    if (this.enemies.countActive() === 0) {
      this.levelComplete();
    }
  }

  private spawnPowerUp(x: number, y: number) {
    const pup = this.powerUps.create(x, y, 'pup-speed') as Phaser.Physics.Arcade.Image;
    pup.setVelocityY(100);
  }

  private collectPowerUp(_playerObj: any, pupObj: any) {
    const pup = pupObj as Phaser.Physics.Arcade.Image;
    pup.destroy();
    
    SoundSynth.playPowerUp();
    this.playerSpeed += 30;

    // Popup text floating up
    const floatText = this.add.text(this.player.x, this.player.y - 20, 'SPEED UP!', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: floatText,
      y: floatText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => floatText.destroy()
    });
  }

  private hitPlayer(_playerObj: any, bulletObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    bullet.destroy();

    this.gameOver();
  }

  private createExplosionParticles(x: number, y: number, color: number) {
    const particles = this.add.particles(0, 0, 'pup-speed', {
      x,
      y,
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.4, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 600,
      maxParticles: 12
    });
    
    this.time.delayedCall(800, () => particles.destroy());
  }

  private levelComplete() {
    this.isLevelComplete = true;
    this.stateText.setText('LEVEL COMPLETE!').setColor('#55ff55').setVisible(true);
    this.hintText.setText('TAP OR SPACE FOR NEXT LEVEL').setVisible(true);

    this.bullets.clear(true, true);
    this.enemyBullets.clear(true, true);

    SoundSynth.playLevelUp();
  }

  private nextLevel() {
    this.level++;
    this.isLevelComplete = false;
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);

    this.levelText.setText(`LEVEL ${this.level}`);
    this.initEnemies();
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    SoundSynth.playDeath();
    this.createExplosionParticles(this.player.x, this.player.y, 0xff0000);
    this.player.setVisible(false);

    // Save Score
    this.highScores.push(this.score);
    this.highScores.sort((a, b) => b - a);
    this.highScores = this.highScores.slice(0, 10);
    localStorage.setItem('f1_scores', JSON.stringify(this.highScores));

    this.stateText.setText('GAME OVER').setColor('#ff4444').setVisible(true);
    this.hintText.setText('TAP OR SPACE TO RETRY').setVisible(true);
  }
}
