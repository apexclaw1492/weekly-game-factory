import Phaser from 'phaser';
import { SoundSynth } from '../utils/SoundSynth';
import { readStoredNumber, writeStoredNumber } from '../utils/SafeStorage';
import { GameLifecycle, LifecycleState } from "../runtime/GameLifecycle";
import { LifecycleManager } from "../runtime/LifecycleManager";
import { ArcadeInputFrame } from "../runtime/ArcadeInputFrame";
import { InputRuntime } from "../runtime/InputRuntime";

export class AsteroidsScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = "AsteroidsScene";
  private ship!: Phaser.Physics.Arcade.Sprite;
  private asteroids!: Phaser.Physics.Arcade.Group;
  private bullets!: Phaser.Physics.Arcade.Group;
  private saucers!: Phaser.Physics.Arcade.Group;
  private saucerBullets!: Phaser.Physics.Arcade.Group;
  
  private lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = "start";

  // Game state
  private score = 0;
  private lives = 3;
  private level = 1;
  private hiScore = 0;
  private frameCount = 0;
  private combo = 0;
  private maxCombo = 0;
  private nextExtraLifeScore = 10000;
  private nextSaucerTime = 0;
  private lastSaucerShotTime = 0;
  private isInvulnerable = false;
  private invulnTimer = 0;
  private thrustFlame?: Phaser.GameObjects.Graphics;
  private shotsFired = 0;
  private asteroidsSplit = 0;
  private asteroidsDestroyed = 0;
  private thrustHeldFrames = 0;
  private safeGestureLifeLosses = 0;

  private isGameOver = false;
  private isWaitingToStart = true;

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private hiText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private backHitZone!: Phaser.GameObjects.Zone;

  private starfield!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; alpha: number }> = [];

  constructor() {
    super('AsteroidsScene');
  }

  init() {
    this.stars = [];
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.nextExtraLifeScore = 10000;
    this.nextSaucerTime = 0;
    this.lastSaucerShotTime = 0;
    this.frameCount = 0;
    this.isGameOver = false;
    this.isWaitingToStart = true;
    this.lifecycleState = "start";
    this.isInvulnerable = false;
    this.shotsFired = 0;
    this.asteroidsSplit = 0;
    this.asteroidsDestroyed = 0;
    this.thrustHeldFrames = 0;
    this.safeGestureLifeLosses = 0;

    this.hiScore = readStoredNumber('ast_hi');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Scrolling star background
    this.starfield = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.2 + Math.random() * 0.4,
        alpha: 0.3 + Math.random() * 0.6
      });
    }

    // 2. Generate textures programmatically
    this.createGameTextures();

    // 3. Create ship
    this.ship = this.physics.add.sprite(width / 2, height / 2 - 20, 'ast-ship');
    this.ship.setOrigin(0.5);
    this.ship.setDrag(0.985);
    this.ship.setDamping(true);
    this.ship.setMaxVelocity(280, 280);
    this.ship.setCollideWorldBounds(false);

    // Thrust flame graphic attachment
    this.thrustFlame = this.add.graphics();
    this.thrustFlame.setVisible(false);

    // 4. Create bullet group
    this.bullets = this.physics.add.group({
      classType: Phaser.Physics.Arcade.Image
    });
    this.saucers = this.physics.add.group();
    this.saucerBullets = this.physics.add.group();

    // 5. Create asteroids group
    this.asteroids = this.physics.add.group();
    this.spawnAsteroids(4, true);

    // Collisions
    this.physics.add.overlap(this.bullets, this.asteroids, this.hitAsteroid, undefined, this);
    this.physics.add.overlap(this.bullets, this.saucers, this.hitSaucer, undefined, this);
    this.physics.add.overlap(this.ship, this.asteroids, this.hitShip, undefined, this);
    this.physics.add.overlap(this.ship, this.saucers, this.hitShip, undefined, this);
    this.physics.add.overlap(this.ship, this.saucerBullets, this.hitShip, undefined, this);

    // 6. Shared Input Runtime
    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    if (runtime) {
      runtime.blockHubInputUntil(performance.now() + 100);
    }
    this.lifecycleManager = new LifecycleManager(this, runtime);

    // 7. HUD setup
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', { fontSize: '16px', fontFamily: 'monospace', color: '#00ccff' });
    this.hiText = this.add.text(20, 42, `HI: ${this.hiScore}`, { fontSize: '11px', fontFamily: 'monospace', color: '#6666aa' });
    this.levelText = this.add.text(width - 20, 20, 'LVL 1', { fontSize: '15px', fontFamily: 'monospace', color: '#8888a0' }).setOrigin(1, 0);
    this.livesText = this.add.text(20, 60, '▲ ▲ ▲', { fontSize: '14px', fontFamily: 'monospace', color: '#00ccff' });
    
    this.comboText = this.add.text(width / 2, 20, '', { fontSize: '14px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold' }).setOrigin(0.5, 0);

    // Overlay Game States
    this.stateText = this.add.text(width / 2, height / 2 - 60, 'ASTEROID BELT', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stateText.setShadow(0, 0, '#00ccff', 10, true, true);

    this.hintText = this.add.text(width / 2, height / 2 + 10, '', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#8888a0',
      align: 'center'
    }).setOrigin(0.5);
    this.showStart();

    // Back to Hub Button
    this.backBtn = this.add.text(20, 20, '← BACK TO HUB', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    this.backHitZone = this.add.zone(20 + 46, 20, 184, 58)
      .setOrigin(0.5)
      .setDepth(1001)
      .setInteractive({ useHandCursor: true });

    this.backBtn.on("pointerdown", () => {
      SoundSynth.playTone(400, 0.1, "sine", 0.05);
      this.scene.start("HubScene");
    });
    this.backHitZone.on("pointerdown", () => {
      SoundSynth.playTone(400, 0.1, "sine", 0.05);
      this.scene.start("HubScene");
    });
    this.input.on('pointerdown', this.handleDirectBackPointer, this);

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.input.off('pointerdown', this.handleDirectBackPointer, this);
    });
  }

  private handleDirectBackPointer(pointer: Phaser.Input.Pointer) {
    if (pointer.x <= 160 && pointer.y <= 70) {
      SoundSynth.playTone(400, 0.1, "sine", 0.05);
      this.scene.start("HubScene");
    }
  }

  private handleResize() {
    const { width, height } = this.scale;

    // Reposition HUD
    this.levelText.setPosition(width - 20, 20);
    this.comboText.setPosition(width / 2, 20);
    this.stateText.setPosition(width / 2, height / 2 - 60);
    this.hintText.setPosition(width / 2, height / 2 + 10);
    this.backBtn.setPosition(20, 20);
    this.backHitZone.setPosition(20 + 46, 20);

    // Update starfield
    this.starfield.clear();
    this.stars.forEach(star => {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    });

    // Center ship if waiting to start
    if (this.isWaitingToStart && this.ship) {
      this.ship.setPosition(width / 2, height / 2 - 20);
    }
  }

  update() {
    const { width, height } = this.scale;
    this.frameCount++;

    // Background Stars Scrolling
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

    // Route through lifecycle manager
    if (!this.lifecycleManager) return;
    const state = this.lifecycleManager.update(performance.now());
    if (state !== "playing") {
      this.ship.setVelocity(0, 0);
      return;
    }

    // Decay invulnerability frames
    if (this.isInvulnerable) {
      this.invulnTimer--;
      this.ship.setVisible(Math.floor(this.invulnTimer / 4) % 2 === 0);
      if (this.invulnTimer <= 0) {
        this.isInvulnerable = false;
        this.ship.setVisible(true);
      }
    }

    // Read input frame
    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    if (!runtime) return;
    const frame = runtime.readFrame();

    // --- CONTROLLER MOVEMENT ---
    let rotateSpeed = 0;
    if (frame.gestures.dragVectorX < -0.1) {
      rotateSpeed = Math.max(-1, frame.gestures.dragVectorX) * 3.5;
    } else if (frame.gestures.dragVectorX > 0.1) {
      rotateSpeed = Math.min(1, frame.gestures.dragVectorX) * 3.5;
    } else if (frame.actions.left.held) {
      rotateSpeed = -3.5;
    } else if (frame.actions.right.held) {
      rotateSpeed = 3.5;
    }
    this.ship.setAngularVelocity(rotateSpeed * 60);

    // Thrust acceleration
    const isThrusting = frame.actions.thrust.held || frame.actions.up.held || (frame.actions.fire.held && frame.actions.fire.source === "touch");
    if (isThrusting) {
      this.thrustHeldFrames++;
      const angleRad = Phaser.Math.DegToRad(this.ship.angle);
      this.ship.setAcceleration(Math.cos(angleRad) * 200, Math.sin(angleRad) * 200);
      this.drawThrustFlame(angleRad);
      SoundSynth.playThrust();
    } else {
      this.ship.setAcceleration(0, 0);
      this.thrustFlame?.clear().setVisible(false);
    }

    // Limit ship max velocity (same logic)
    const body = this.ship.body as Phaser.Physics.Arcade.Body;
    const speed = body.speed;
    const maxSpd = 200 + this.level * 8;
    if (speed > maxSpd) {
      this.ship.setVelocity(body.velocity.x / speed * maxSpd, body.velocity.y / speed * maxSpd);
    }

    // Screen Boundary Wrapping (same)
    this.physics.world.wrap(this.ship, 12);
    this.physics.world.wrap(this.asteroids, 24);
    this.physics.world.wrap(this.saucers, 32);
    this.physics.world.wrap(this.bullets, 4);
    this.physics.world.wrap(this.saucerBullets, 4);

    // FIRE — use frame actions
    const autoFire = frame.actions.fire.held || frame.actions.thrust.held;
    if (autoFire && this.frameCount % 8 === 0) {
      this.fireBullet();
    } else if (frame.actions.fire.justPressed && this.frameCount % 8 === 0) {
      this.fireBullet();
    }

    // Hyperspace
    if (frame.actions.hyperspace.justPressed) {
      this.useHyperspace();
    }

    // Same saucer logic
    if (this.time.now > this.nextSaucerTime) {
      this.spawnSaucer();
      this.scheduleSaucer();
    }

    this.updateSaucers();

    // Same bullet cleanup
    this.bullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      const age = b.getData("age") as number;
      b.setData("age", age + 1);
      if (age > 45) b.destroy();
    });
    this.saucerBullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      const age = b.getData("age") as number;
      b.setData("age", age + 1);
      if (age > 90) b.destroy();
    });

    // Level complete
    if (this.asteroids.countActive() === 0) {
      this.nextLevel();
    }
  }

  private createGameTextures() {
    // Ship facing right (0 radians)
    if (!this.textures.exists('ast-ship')) {
      const g = this.add.graphics();
      g.lineStyle(2, 0x00ccff, 1);
      g.fillStyle(0x00ccff, 0.25);
      g.beginPath();
      g.moveTo(20, 8);
      g.lineTo(0, 0);
      g.lineTo(5, 8);
      g.lineTo(0, 16);
      g.closePath();
      g.fill();
      g.stroke();
      g.generateTexture('ast-ship', 20, 16);
      g.destroy();
    }

    // Asteroids textures Size 1, 2, 3
    for (let size = 1; size <= 3; size++) {
      const r = size === 3 ? 24 : size === 2 ? 14 : 7;
      const key = `ast-${size}`;
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        g.lineStyle(2, 0x8899aa, 1);
        g.fillStyle(0x0a0a14, 1);

        const pts = size === 3 ? 10 : size === 2 ? 8 : 6;
        g.beginPath();
        for (let i = 0; i < pts; i++) {
          const angle = (i / pts) * Math.PI * 2;
          const rad = r * (0.75 + Math.random() * 0.25);
          const px = r + Math.cos(angle) * rad;
          const py = r + Math.sin(angle) * rad;
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
        g.stroke();

        g.generateTexture(key, r * 2, r * 2);
        g.destroy();
      }
    }

    // Bullet
    if (!this.textures.exists('ast-bullet')) {
      const g = this.add.graphics();
      g.fillStyle(0xffdd44, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('ast-bullet', 4, 4);
      g.destroy();
    }
    if (!this.textures.exists('ast-saucer')) {
      const g = this.add.graphics();
      g.lineStyle(2, 0xff55aa, 1);
      g.strokeEllipse(18, 10, 34, 12);
      g.strokeRect(10, 3, 16, 7);
      g.generateTexture('ast-saucer', 36, 20);
      g.destroy();
    }
    if (!this.textures.exists('saucer-bullet')) {
      const g = this.add.graphics();
      g.fillStyle(0xff55aa, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture('saucer-bullet', 4, 4);
      g.destroy();
    }
  }

  private drawThrustFlame(angleRad: number) {
    this.thrustFlame?.clear().setVisible(true);

    const length = 12 + Math.random() * 8;
    const px = this.ship.x - Math.cos(angleRad) * 8;
    const py = this.ship.y - Math.sin(angleRad) * 8;

    this.thrustFlame?.fillStyle(0xffa500, 0.7);
    this.thrustFlame?.beginPath();
    
    // Draw flame pointing backwards
    this.thrustFlame?.moveTo(px + Math.cos(angleRad + Math.PI / 2) * 3, py + Math.sin(angleRad + Math.PI / 2) * 3);
    this.thrustFlame?.lineTo(px - Math.cos(angleRad) * length, py - Math.sin(angleRad) * length);
    this.thrustFlame?.lineTo(px - Math.cos(angleRad - Math.PI / 2) * 3, py - Math.sin(angleRad - Math.PI / 2) * 3);
    this.thrustFlame?.closePath();
    this.thrustFlame?.fill();
  }

  private spawnAsteroids(count: number, avoidShip: boolean) {
    const { width, height } = this.scale;
    const info = { r: 24, pts: 10 };

    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, safe = false;
      let attempts = 0;
      while (!safe && attempts < 100) {
        attempts++;
        x = Math.random() * width;
        y = Math.random() * height;

        const dist = Phaser.Math.Distance.Between(x, y, this.ship.x, this.ship.y);
        safe = !avoidShip || dist > 120;
      }

      const asteroid = this.asteroids.create(x, y, 'ast-3') as Phaser.Physics.Arcade.Sprite;
      asteroid.body?.setCircle(info.r);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30 + this.level * 4;
      asteroid.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      asteroid.setData('size', 3);
    }
  }

  private fireBullet() {
    if (this.isGameOver || this.isWaitingToStart) return;
    if (this.bullets.countActive(true) >= 4) return;

    const angleRad = Phaser.Math.DegToRad(this.ship.angle);
    // Fire from the nose of the ship
    const bx = this.ship.x + Math.cos(angleRad) * 14;
    const by = this.ship.y + Math.sin(angleRad) * 14;

    const b = this.bullets.get(bx, by, 'ast-bullet') as Phaser.Physics.Arcade.Image;
    if (b) {
      b.setActive(true);
      b.setVisible(true);
      if (b.body) (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      
      // Speed vector
      b.setVelocity(Math.cos(angleRad) * 350 + this.ship.body!.velocity.x * 0.5, Math.sin(angleRad) * 350 + this.ship.body!.velocity.y * 0.5);
      b.setData('age', 0);
      SoundSynth.playShoot();
      this.shotsFired++;
    }
  }

  private hitAsteroid(bulletObj: any, astObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const asteroid = astObj as Phaser.Physics.Arcade.Sprite;

    bullet.destroy();

    const size = asteroid.getData('size') as number;
    const px = asteroid.x;
    const py = asteroid.y;
    
    // Split Asteroid
    this.splitAsteroid(asteroid);
    this.asteroidsDestroyed++;

    // Scoring Combo logic
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const basePoints = size === 3 ? 20 : size === 2 ? 50 : 100;
    const comboMul = Math.min(this.combo, 10);
    const award = basePoints * comboMul;
    this.score += award;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.awardExtraLifeIfNeeded();

    if (this.combo > 1) {
      this.comboText.setText(`${this.combo}x COMBO`);
    }

    // Floating text point rewards
    const float = this.add.text(px, py - 10, `+${award}`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: float,
      y: float.y - 20,
      alpha: 0,
      duration: 600,
      onComplete: () => float.destroy()
    });

    // Particle explosions
    this.createExplosion(px, py, size * 8, 0x8899aa);
  }

  private scheduleSaucer() {
    this.nextSaucerTime = this.time.now + Phaser.Math.Between(9000, 15000);
  }

  private spawnSaucer() {
    if (this.saucers.countActive(true) > 0 || this.isGameOver || this.isWaitingToStart) return;

    const { width, height } = this.scale;
    const fromLeft = Math.random() < 0.5;
    const saucer = this.saucers.create(fromLeft ? -30 : width + 30, Phaser.Math.Between(80, Math.max(100, height - 120)), 'ast-saucer') as Phaser.Physics.Arcade.Image;
    saucer.setVelocityX((fromLeft ? 1 : -1) * (70 + this.level * 5));
    saucer.setData('size', this.level >= 3 ? 'small' : 'large');
    saucer.setData('points', this.level >= 3 ? 1000 : 200);
  }

  private updateSaucers() {
    const saucers = this.saucers.getChildren() as Phaser.Physics.Arcade.Image[];
    if (saucers.length === 0) return;

    if (this.time.now - this.lastSaucerShotTime < 1200) return;
    this.lastSaucerShotTime = this.time.now;

    saucers.forEach(saucer => {
      const isSmall = saucer.getData('size') === 'small';
      const angleToShip = Phaser.Math.Angle.Between(saucer.x, saucer.y, this.ship.x, this.ship.y);
      const angle = angleToShip + Phaser.Math.FloatBetween(isSmall ? -0.18 : -0.65, isSmall ? 0.18 : 0.65);
      const bullet = this.saucerBullets.create(saucer.x, saucer.y, 'saucer-bullet') as Phaser.Physics.Arcade.Image;
      bullet.setVelocity(Math.cos(angle) * 190, Math.sin(angle) * 190);
      bullet.setData('age', 0);
      if (bullet.body) (bullet.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    });
  }

  private hitSaucer(bulletObj: any, saucerObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const saucer = saucerObj as Phaser.Physics.Arcade.Image;
    const points = saucer.getData('points') as number;
    bullet.destroy();
    saucer.destroy();
    this.score += points;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.comboText.setText(`SAUCER +${points}`);
    this.awardExtraLifeIfNeeded();
    this.createExplosion(saucer.x, saucer.y, 18, 0xff55aa);
    SoundSynth.playExplosion();
  }

  private useHyperspace() {
    if (this.isInvulnerable) return;

    const { width, height } = this.scale;
    this.ship.setPosition(Phaser.Math.Between(60, width - 60), Phaser.Math.Between(80, height - 80));
    this.ship.setVelocity(0, 0);
    this.isInvulnerable = true;
    this.invulnTimer = 45;

    if (Math.random() < 0.12) {
      this.time.delayedCall(250, () => {
        this.isInvulnerable = false;
        this.hitShip(this.ship, this.ship);
      });
    }
  }

  private awardExtraLifeIfNeeded() {
    while (this.score >= this.nextExtraLifeScore) {
      this.lives++;
      this.nextExtraLifeScore += 10000;
      this.livesText.setText('▲ '.repeat(this.lives));
      SoundSynth.playPowerUp();
    }
  }

  private splitAsteroid(parent: Phaser.Physics.Arcade.Sprite) {
    const size = parent.getData('size') as number;
    parent.destroy();

    if (size <= 1) {
      SoundSynth.playHit();
      return;
    }

    const nextSize = size - 1;
    const r = nextSize === 2 ? 14 : 7;
    SoundSynth.playSplit();
    this.asteroidsSplit++;

    for (let i = 0; i < 2; i++) {
      const asteroid = this.asteroids.create(parent.x, parent.y, `ast-${nextSize}`) as Phaser.Physics.Arcade.Sprite;
      asteroid.body?.setCircle(r);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 40 + this.level * 5;
      asteroid.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      asteroid.setData('size', nextSize);
    }
  }

  private hitShip(_shipObj: any, _astObj: any) {
    if (this.isInvulnerable || this.isGameOver) return;

    SoundSynth.playDeath();
    this.cameras.main.shake(150, 0.015);
    this.createExplosion(this.ship.x, this.ship.y, 20, 0x00ccff);

    this.lives--;
    this.combo = 0;
    this.comboText.setText('');

    // Rebuild lives indicators
    let shipSymbols = '';
    for (let i = 0; i < this.lives; i++) shipSymbols += '▲ ';
    this.livesText.setText(shipSymbols);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      // Reset ship
      this.ship.setPosition(this.scale.width / 2, this.scale.height / 2);
      this.ship.setVelocity(0, 0);
      this.isInvulnerable = true;
      this.invulnTimer = 100;
    }
  }

  private createExplosion(x: number, y: number, count: number, color: number) {
    const particles = this.add.particles(0, 0, 'ast-bullet', {
      x,
      y,
      speed: { min: 30, max: 140 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 500,
      maxParticles: count
    });
    this.time.delayedCall(600, () => particles.destroy());
  }

  showStart(): void {
    this.isWaitingToStart = true;
    this.lifecycleState = "start";
    this.stateText.setVisible(true);
    this.stateText.setText("ASTEROID BELT").setColor("#00ccff");
    this.hintText.setVisible(true);
    this.hintText.setText("TAP TO START\n\nPHONE: DRAG OR TILT TO STEER\nHOLD = THRUST + AUTO-FIRE\n\nDESKTOP: ARROWS + SPACE\nSHIFT = HYPERSPACE");
    if (this.ship) {
      this.ship.setVisible(true);
      this.ship.setPosition(this.scale.width / 2, this.scale.height / 2 - 20);
    }
  }

  startGameplay(): void {
    this.isWaitingToStart = false;
    this.lifecycleState = "playing";
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.isInvulnerable = true;
    this.invulnTimer = 120;
  }

  pauseGameplay(): void {}

  resumeGameplay(): void {}

  resetGameplay(): void {
    this.scene.restart();
  }

  returnToHub(): void {
    SoundSynth.playTone(400, 0.1, "sine", 0.05);
    this.scene.start("HubScene");
  }

  handleArcadeInput(_frame: ArcadeInputFrame): void {}

  destroySceneResources(): void {
    this.stars = [];
  }

  private nextLevel() {
    this.level++;
    SoundSynth.playLevelUp();

    this.levelText.setText(`LVL ${this.level}`);
    this.spawnAsteroids(Math.min(3 + this.level, 10), true);

    // Floating Level Up Banner
    const banner = this.add.text(this.scale.width / 2, 100, `LEVEL ${this.level} INCOMING`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: banner,
      y: banner.y + 40,
      alpha: 0,
      delay: 1000,
      duration: 1000,
      onComplete: () => banner.destroy()
    });
  }

  private gameOver() {
    this.isGameOver = true;
    this.lifecycleState = "gameOver";
    this.ship.setVisible(false);
    
    // Save high score
    if (this.score > this.hiScore) {
      this.hiScore = this.score;
      writeStoredNumber('ast_hi', this.hiScore);
      this.hiText.setText(`HI: ${this.hiScore}`);
    }

    this.stateText.setText('💀 GAME OVER').setColor('#ff4444').setVisible(true);
    this.hintText.setText('TAP OR ENTER TO PLAY AGAIN').setVisible(true);
  }

  public getGameplayStateForQA() {
    const body = this.ship?.body as Phaser.Physics.Arcade.Body | undefined;
    return {
      sceneKey: this.scene.key,
      lifecycle: (this.lifecycleState === "start"
        ? "start"
        : this.isGameOver
          ? "gameOver"
          : "playing") as any,
      orientation: (this.scale.height >= this.scale.width ? 'portrait' : 'landscape') as "portrait" | "landscape",
      player: {
        x: this.ship?.x ?? undefined,
        y: this.ship?.y ?? undefined,
        vx: body?.velocity.x ?? undefined,
        vy: body?.velocity.y ?? undefined,
        angle: this.ship?.angle ?? undefined,
        speed: body?.speed ?? undefined,
        alive: Boolean(this.ship?.visible)
      },
      score: this.score,
      lives: this.lives,
      primaryActionCount: this.shotsFired,
      shotsFired: this.shotsFired,
      asteroidsSplit: this.asteroidsSplit,
      asteroidsDestroyed: this.asteroidsDestroyed,
      thrustHeldFrames: this.thrustHeldFrames,
      safeGestureLifeLosses: this.safeGestureLifeLosses,
      enemyOrHazardCount: (this.asteroids?.countActive?.(true) ?? 0) + (this.saucers?.countActive?.(true) ?? 0),
      objectiveProgress: this.score,
      messages: []
    };
  }

  public destroyAsteroidForQA() {
    if (this.isWaitingToStart || this.isGameOver) return false;
    const asteroid = this.asteroids.getChildren().find((child) => child.active) as Phaser.Physics.Arcade.Sprite | undefined;
    if (!asteroid) return false;
    const bullet = this.bullets.get(asteroid.x, asteroid.y, 'ast-bullet') as Phaser.Physics.Arcade.Image;
    bullet.setActive(true).setVisible(true);
    this.hitAsteroid(bullet, asteroid);
    return true;
  }
}
