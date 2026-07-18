import Phaser from 'phaser';
import { GameLifecycle, LifecycleState } from '../runtime/GameLifecycle';
import { LifecycleManager } from '../runtime/LifecycleManager';
import { ArcadeInputFrame } from '../runtime/ArcadeInputFrame';
import { InputRuntime } from '../runtime/InputRuntime';
import { SoundSynth } from '../utils/SoundSynth';
import { readStoredNumberArray, writeStoredJson } from '../utils/SafeStorage';
import { StandardOverlays } from '../utils/StandardOverlays';

export class SpaceInvadersScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = 'SpaceInvadersScene';
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private powerUps!: Phaser.Physics.Arcade.Group;
  private shields!: Phaser.Physics.Arcade.StaticGroup;
  private saucers!: Phaser.Physics.Arcade.Group;

  public lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = 'start';

  private level = 1;
  private score = 0;
  private multiplier = 1;
  private lastHitTime = 0;
  private playerSpeed = 300;
  private lastShotTime = 0;
  private lastEnemyShotTime = 0;
  private lastEnemyMoveTime = 0;
  private enemyDir = 1;
  private lives = 3;
  private nextSaucerTime = 0;
  private highScores: number[] = [];

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private controlsText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hiScoreText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private overlays!: StandardOverlays;

  private starfield!: Phaser.GameObjects.Graphics;

  private isGameOver = false;
  private isLevelComplete = false;
  private isWaitingToStart = true;
  private playerInvulnerable = false;
  private pauseStartTime = 0;

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
    this.lastEnemyMoveTime = 0;
    this.enemyDir = 1;
    this.lives = 3;
    this.nextSaucerTime = 0;
    this.lifecycleState = 'start';
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.isWaitingToStart = true;
    this.playerInvulnerable = false;
    if (this.tweens && this.player) {
      this.tweens.killTweensOf(this.player);
    }

    this.highScores = readStoredNumberArray('f1_scores', 10);
  }

  create() {
    const { width, height } = this.scale;

    this.starfield = this.add.graphics();
    // No stars for Robinhood premium solid black background

    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 8,
      runChildUpdate: true
    });

    this.enemyBullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image,
      maxSize: 30,
      runChildUpdate: true
    });

    this.powerUps = this.physics.add.group();
    this.shields = this.physics.add.staticGroup();
    this.saucers = this.physics.add.group();

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
    if (!this.textures.exists('shield-block')) {
      const g = this.add.graphics();
      g.fillStyle(0x55ff88, 1);
      g.fillRect(0, 0, 10, 8);
      g.generateTexture('shield-block', 10, 8);
      g.destroy();
    }
    if (!this.textures.exists('bonus-saucer')) {
      const g = this.add.graphics();
      g.fillStyle(0xff3355, 1);
      g.fillRoundedRect(0, 5, 36, 10, 4);
      g.fillStyle(0xffffff, 1);
      g.fillRect(10, 0, 16, 8);
      g.generateTexture('bonus-saucer', 36, 18);
      g.destroy();
    }

    this.player = this.physics.add.sprite(width / 2, height - 70, 'player-f1');
    this.player.setCollideWorldBounds(true);
    this.player.setScale(1.2);

    this.enemies = this.physics.add.group();
    this.initEnemies();
    this.initShields();
    this.scheduleSaucer();

    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.bullets, this.saucers, this.hitSaucer, undefined, this);
    this.physics.add.overlap(this.bullets, this.shields, this.erodeShield, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.shields, this.erodeShield, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.hitPlayer, () => !this.playerInvulnerable, this);
    this.physics.add.overlap(this.powerUps, this.player, this.collectPowerUp, undefined, this);

    this.scoreText = this.add.text(20, 20, 'SCORE: 0', { fontSize: '18px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#ffffff' });
    this.levelText = this.add.text(width - 20, 20, 'LEVEL 1', { fontSize: '18px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#8e8e93' }).setOrigin(1, 0);
    this.livesText = this.add.text(width / 2, 20, 'LIVES: 3', { fontSize: '15px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#00c805' }).setOrigin(0.5, 0);
    this.comboText = this.add.text(20, 45, '', { fontSize: '14px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#00c805' });

    this.stateText = this.add.text(width / 2, height / 2 - 52, 'F1 SPACE INVADERS', {
      fontSize: '32px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stateText.setShadow(0, 0, '#00c805', 8, true, true);

    this.hintText = this.add.text(width / 2, height / 2 + 20, 'TAP OR SPACE TO START\n\nPHONE: DRAG TO MOVE, HOLD TO FIRE\nDESKTOP: LEFT / RIGHT + SPACE', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.controlsText = this.add.text(width / 2, height / 2 + 72, 'MOVE: ARROWS OR DRAG | SHOOT: SPACE OR HOLD TOUCH | BACK: TAP IN CORNER', {
      fontSize: '11px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      align: 'center'
    }).setOrigin(0.5);

    const hiScore = this.highScores.length > 0 ? this.highScores[0] : 0;
    this.hiScoreText = this.add.text(width / 2, height / 2 + 102, `HI SCORE: ${hiScore}`, {
      fontSize: '12px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805'
    }).setOrigin(0.5);

    this.backBtn = this.add.text(20, 20, '<- BACK TO HUB', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);

    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    if (runtime) {
      runtime.blockHubInputUntil(performance.now() + 100);
    }

    this.overlays = new StandardOverlays(this);
    this.lifecycleManager = new LifecycleManager(this, runtime);

    this.backBtn.setInteractive({ useHandCursor: true });
    this.backBtn.on('pointerdown', () => {
      SoundSynth.playTone(400, 0.1, 'sine', 0.05);
      this.scene.start('HubScene');
    });

    this.showStart();

    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  private handleResize() {
    const { width, height } = this.scale;

    this.levelText.setPosition(width - 20, 20);
    this.livesText.setPosition(width / 2, 20);
    this.stateText.setPosition(width / 2, height / 2 - 52);
    this.hintText.setPosition(width / 2, height / 2 + 20);
    this.controlsText.setPosition(width / 2, height / 2 + 72);
    this.hiScoreText.setPosition(width / 2, height / 2 + 102);
    this.backBtn.setPosition(20, 20);

    this.starfield.clear();

    if (this.player) {
      this.player.setY(height - 70);
    }

    if (this.shields) {
      this.initShields();
    }
  }

  update(time: number) {
    const { width, height } = this.scale;

    this.starfield.clear();

    if (!this.lifecycleManager) return;
    const state = this.lifecycleManager.update(time);
    if (state !== 'playing') return;

    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    if (!runtime) return;
    const frame = runtime.readFrame();

    let vx = 0;
    if (Math.abs(frame.gestures.dragVectorX) > 0.05) {
      vx = frame.gestures.dragVectorX * this.playerSpeed;
    }
    if (!frame.touch.active) {
      if (frame.actions.left.held) {
        vx = -this.playerSpeed;
      } else if (frame.actions.right.held) {
        vx = this.playerSpeed;
      }
    }
    this.player.setVelocityX(vx);

    const isRealTouch = frame.touch.active && frame.touch.primaryId !== -1;
    if (isRealTouch || frame.actions.fire.held) {
      this.firePlayerBullet();
    }

    this.moveEnemyFormation(time);

    if (time - this.lastEnemyShotTime > 1500) {
      this.fireEnemyBullet();
      this.lastEnemyShotTime = time;
    }

    if (time > this.nextSaucerTime) {
      this.spawnSaucer();
      this.scheduleSaucer();
    }

    this.bullets.getChildren().filter(b => (b as Phaser.Physics.Arcade.Image).y < 0).forEach(b => b.destroy());
    this.enemyBullets.getChildren().filter(b => (b as Phaser.Physics.Arcade.Image).y > height).forEach(b => b.destroy());
    this.powerUps.getChildren().filter(p => (p as Phaser.Physics.Arcade.Image).y > height).forEach(p => p.destroy());
    this.saucers.getChildren()
      .filter(s => {
        const saucer = s as Phaser.Physics.Arcade.Image;
        return saucer.x < -60 || saucer.x > width + 60;
      })
      .forEach(s => s.destroy());

    if (Date.now() - this.lastHitTime > 2000 && this.multiplier > 1) {
      this.multiplier = 1;
      this.comboText.setText('');
    }
  }

  private initEnemies() {
    this.enemies.clear(true, true);

    const rows = 5;
    const cols = this.scale.width < 460 ? 8 : 11;
    const spacingX = Math.min(46, (this.scale.width - 80) / Math.max(1, cols - 1));
    const spacingY = 32;

    const { width } = this.scale;
    const gridWidth = (cols - 1) * spacingX;
    const startX = (width - gridWidth) / 2;
    const startY = 80;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const enemy = this.physics.add.sprite(startX + col * spacingX, startY + row * spacingY, 'enemy-f1');
        enemy.setOrigin(0.5);
        enemy.setData('row', row);
        enemy.setData('col', col);
        enemy.setData('points', row === 0 ? 40 : row < 3 ? 20 : 10);
        enemy.setScale(Math.min(1, spacingX / 46));
        this.enemies.add(enemy);
      }
    }
  }

  private initShields() {
    this.shields.clear(true, true);
    const { width, height } = this.scale;
    const shieldCount = width < 460 ? 3 : 4;
    const startX = width / (shieldCount + 1);
    const baseY = Math.max(height - 165, height * 0.68);

    for (let shield = 1; shield <= shieldCount; shield++) {
      const cx = startX * shield;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 7; col++) {
          if (row > 1 && col >= 2 && col <= 4) continue;
          this.shields.create(cx + (col - 3) * 10, baseY + row * 8, 'shield-block');
        }
      }
    }
  }

  private moveEnemyFormation(time: number) {
    const enemies = this.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[];
    if (enemies.length === 0) return;

    const interval = Math.max(90, 620 - this.level * 45 - (55 - enemies.length) * 8);
    if (time - this.lastEnemyMoveTime < interval) return;
    this.lastEnemyMoveTime = time;

    const { width } = this.scale;
    const stepX = 10 + Math.min(this.level, 6);
    const minX = Math.min(...enemies.map(enemy => enemy.x));
    const maxX = Math.max(...enemies.map(enemy => enemy.x));
    const shouldDrop = (this.enemyDir > 0 && maxX + stepX >= width - 22) ||
      (this.enemyDir < 0 && minX - stepX <= 22);

    enemies.forEach(enemy => {
      if (shouldDrop) {
        enemy.y += 18;
      } else {
        enemy.x += stepX * this.enemyDir;
      }

      if (enemy.y >= this.player.y - 14) {
        this.gameOver();
      }
    });

    if (shouldDrop) {
      this.enemyDir *= -1;
    }
  }

  public showStart(): void {
    this.isWaitingToStart = true;
    this.lifecycleState = 'start';
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.controlsText.setVisible(false);
    this.hiScoreText.setVisible(false);
    
    this.overlays.showInstructions(
      'Space Invaders',
      '• Move: Press Left/Right Arrow keys or drag on-screen.\n• Shoot: Press Spacebar or hold touch.\n• Goal: Protect shields and blast all alien invaders!',
      () => {
        this.startGameplay();
      }
    );
  }

  public startGameplay(): void {
    if (this.isLevelComplete) {
      this.nextLevel();
      this.lifecycleState = 'playing';
      return;
    }
    this.isWaitingToStart = false;
    this.lifecycleState = 'playing';
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.controlsText.setVisible(false);
    this.hiScoreText.setVisible(false);
    this.overlays.clear();
  }

  public pauseGameplay(): void {
    this.lifecycleState = 'paused';
    this.physics.pause();
    this.pauseStartTime = this.time.now;
    this.tweens.pauseAll();
    this.overlays.showPause(
      () => this.resumeGameplay(),
      () => this.returnToHub()
    );
  }

  public resumeGameplay(): void {
    this.lifecycleState = 'playing';
    this.physics.resume();
    if (this.pauseStartTime > 0) {
      const pauseDuration = this.time.now - this.pauseStartTime;
      this.lastEnemyShotTime += pauseDuration;
      this.lastEnemyMoveTime += pauseDuration;
      this.lastShotTime += pauseDuration;
      this.nextSaucerTime += pauseDuration;
      this.pauseStartTime = 0;
    }
    this.tweens.resumeAll();
    this.overlays.clear();
  }

  public resetGameplay(): void {
    this.playerInvulnerable = false;
    if (this.tweens && this.player) {
      this.tweens.killTweensOf(this.player);
    }
    this.overlays.clear();
    this.scene.restart();
  }

  public returnToHub(): void {
    SoundSynth.playTone(400, 0.1, 'sine', 0.05);
    this.scene.start('HubScene');
  }

  public handleArcadeInput(_frame: ArcadeInputFrame): void {
    // This scene reads the runtime frame directly in update().
  }

  public destroySceneResources(): void {
  }

  public getGameplayStateForQA() {
    return {
      sceneKey: this.scene.key,
      lifecycle: (this.lifecycleState === 'start'
        ? 'start'
        : this.isGameOver
          ? 'gameOver'
          : this.isLevelComplete
            ? 'levelComplete'
            : 'playing') as any,
      orientation: (this.scale.height >= this.scale.width ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
      player: {
        x: this.player?.x ?? 0,
        y: this.player?.y ?? 0,
        vx: this.player?.body?.velocity?.x,
        vy: this.player?.body?.velocity?.y,
        alive: Boolean(this.player?.active)
      },
      score: this.score,
      lives: this.lives,
      primaryActionCount: this.bullets?.countActive?.(true) ?? 0,
      enemyOrHazardCount: this.enemies?.countActive?.(true) ?? 0,
      messages: []
    };
  }

  private firePlayerBullet() {
    const timeNow = this.time.now;
    if (timeNow - this.lastShotTime < 190) return;
    if (this.bullets.countActive(true) >= 4) return;
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
    const shooters = this.getExposedShooters();
    if (shooters.length === 0) return;

    const shooter = Phaser.Utils.Array.GetRandom(shooters);
    const bullet = this.enemyBullets.get(shooter.x, shooter.y + 20) as Phaser.Physics.Arcade.Image;
    if (bullet) {
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setTexture('e-bullet');
      bullet.body?.setSize(4, 12);
      bullet.setVelocityY(200 + this.level * 10);
    }
  }

  private getExposedShooters() {
    const byColumn = new Map<number, Phaser.Physics.Arcade.Sprite>();
    this.enemies.getChildren().forEach(child => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const col = enemy.getData('col') as number;
      const existing = byColumn.get(col);
      if (!existing || enemy.y > existing.y) {
        byColumn.set(col, enemy);
      }
    });

    return [...byColumn.values()];
  }

  private hitEnemy(bulletObj: any, enemyObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;

    this.createExplosionParticles(enemy.x, enemy.y, 0xffff00);
    this.cameras.main.shake(50, 0.005);
    bullet.destroy();
    enemy.destroy();
    SoundSynth.playHit();

    if (Date.now() - this.lastHitTime < 2000) {
      this.multiplier = Math.min(10, this.multiplier + 1);
    } else {
      this.multiplier = 1;
    }

    const basePoints = Number(enemy.getData('points')) || 10;
    const points = basePoints * this.multiplier;
    this.score += points;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.comboText.setText(`COMBO x${this.multiplier} (+${points})`);
    this.lastHitTime = Date.now();

    if (this.enemies.countActive() === 0) {
      this.levelComplete();
    }
  }

  private collectPowerUp(_playerObj: any, pupObj: any) {
    const pup = pupObj as Phaser.Physics.Arcade.Image;
    pup.destroy();

    SoundSynth.playPowerUp();
    this.playerSpeed += 30;

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
    this.loseLife();
  }

  private erodeShield(projectileObj: any, shieldObj: any) {
    const projectile = projectileObj as Phaser.Physics.Arcade.Image;
    const shield = shieldObj as Phaser.Physics.Arcade.Image;
    projectile.destroy();
    shield.destroy();
    SoundSynth.playHit();
  }

  private scheduleSaucer() {
    this.nextSaucerTime = this.time.now + Phaser.Math.Between(9000, 15000);
  }

  private spawnSaucer() {
    if (this.saucers.countActive(true) > 0 || this.isWaitingToStart || this.isGameOver || this.isLevelComplete) return;

    const { width } = this.scale;
    const fromLeft = Math.random() < 0.5;
    const saucer = this.saucers.create(fromLeft ? -40 : width + 40, 62, 'bonus-saucer') as Phaser.Physics.Arcade.Image;
    saucer.setVelocityX((fromLeft ? 1 : -1) * (80 + this.level * 5));
    saucer.setData('points', Phaser.Utils.Array.GetRandom([50, 100, 150, 300]));
    SoundSynth.playTone(320, 0.08, 'square', 0.03);
  }

  private hitSaucer(bulletObj: any, saucerObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const saucer = saucerObj as Phaser.Physics.Arcade.Image;
    const basePoints = saucer.getData('points') as number;
    const points = basePoints * this.multiplier;
    bullet.destroy();
    saucer.destroy();
    this.createExplosionParticles(saucer.x, saucer.y, 0xff3355);
    this.cameras.main.shake(100, 0.01);
    this.score += points;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.comboText.setText(`SAUCER x${this.multiplier} (+${points})`);
    SoundSynth.playExplosion();
  }

  private loseLife() {
    this.lives--;
    this.livesText.setText(`LIVES: ${this.lives}`);
    SoundSynth.playDeath();
    this.createExplosionParticles(this.player.x, this.player.y, 0xff0000);
    this.cameras.main.shake(200, 0.012);
    this.cameras.main.flash(100, 255, 0, 0);

    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    this.player.setVisible(false);
    this.player.disableBody(true, false);
    this.bullets.clear(true, true);
    this.enemyBullets.clear(true, true);

    this.time.delayedCall(900, () => {
      if (this.isGameOver) return;
      this.player.enableBody(true, this.scale.width / 2, this.scale.height - 70, true, true);
      this.player.setVisible(true);
      this.playerInvulnerable = true;
      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        duration: 100,
        yoyo: true,
        repeat: 9,
        onComplete: () => {
          this.player.alpha = 1.0;
          this.playerInvulnerable = false;
        }
      });
    });
  }

  private createExplosionParticles(x: number, y: number, color: number) {
    const particles = this.add.particles(0, 0, 'pup-speed', {
      x,
      y,
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 },
      blendMode: 'ADD',
      tint: color,
      lifespan: 600,
      maxParticles: 16
    });

    this.time.delayedCall(800, () => particles.destroy());
  }

  private levelComplete() {
    this.isLevelComplete = true;
    this.lifecycleState = 'levelComplete';
    this.bullets.clear(true, true);
    this.enemyBullets.clear(true, true);

    SoundSynth.playLevelUp();

    this.overlays.showVictory(
      'LEVEL COMPLETE!',
      `Score: ${this.score}\nLevel ${this.level} Cleared`,
      () => this.startGameplay(),
      () => this.returnToHub()
    );
  }

  private nextLevel() {
    this.level++;
    this.isLevelComplete = false;
    this.overlays.clear();

    this.levelText.setText(`LEVEL ${this.level}`);
    this.enemyDir = 1;
    this.initEnemies();
    this.initShields();
    this.scheduleSaucer();
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.lifecycleState = 'gameOver';

    SoundSynth.playDeath();
    this.createExplosionParticles(this.player.x, this.player.y, 0xff0000);
    this.player.setVisible(false);

    this.highScores.push(this.score);
    this.highScores.sort((a, b) => b - a);
    this.highScores = this.highScores.slice(0, 10);
    writeStoredJson('f1_scores', this.highScores);

    this.overlays.showGameOver(
      this.score,
      () => this.resetGameplay(),
      () => this.returnToHub()
    );
  }
}
