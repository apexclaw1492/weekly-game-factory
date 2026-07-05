import Phaser from 'phaser';
import { SoundSynth } from '../utils/SoundSynth';
import { readStoredNumber, writeStoredNumber } from '../utils/SafeStorage';
import { GameLifecycle, LifecycleState } from "../runtime/GameLifecycle";
import { LifecycleManager } from "../runtime/LifecycleManager";
import { ArcadeInputFrame } from "../runtime/ArcadeInputFrame";
import { InputRuntime } from "../runtime/InputRuntime";

enum GravityDir {
  UP = 0,
  DOWN = 1,
  LEFT = 2,
  RIGHT = 3
}

export class CosmicCargoScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = "CosmicCargoScene";
  private ship!: Phaser.Physics.Arcade.Sprite;
  private asteroids!: Phaser.Physics.Arcade.Group;
  private cargoPods!: Phaser.Physics.Arcade.StaticGroup;
  private portal!: Phaser.Physics.Arcade.Image;

  // Controllers
  lifecycleManager!: LifecycleManager;
  lifecycleState: LifecycleState = "start";

  // Game state
  private level = 1;
  private score = 0;
  private comboCount = 0;
  private comboTimer = 0;
  private fuel = 100;
  private activeGravity = GravityDir.DOWN;
  private nearMissFlash = 0;

  // UI elements
  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private fuelBar!: Phaser.GameObjects.Graphics;
  private cargoText!: Phaser.GameObjects.Text;
  private gravityText!: Phaser.GameObjects.Text;
  private portalText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private hiScoreText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;

  private starfield!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; alpha: number }> = [];

  private isGameOver = false;
  private isLevelComplete = false;
  private lastBoostTime = 0;
  private lastTiltGravityTime = 0;
  private cargoCollected = 0;
  private cargoTotal = 0;
  private boostCount = 0;
  private hazardGraceUntil = 0;
  private directPointerDown = false;
  private directPointerStartX = 0;
  private directPointerStartY = 0;
  private directPointerLastBoostAt = 0;
  private directSwipeConsumed = false;

  // Demo & Visual Cues
  private demoTimer = 0;
  private demoPhase = 0;       // 0..3 cycling
  private demoArrow!: Phaser.GameObjects.Graphics;
  private demoCalloutText!: Phaser.GameObjects.Text;
  private gravityArrow!: Phaser.GameObjects.Graphics;
  private gravityArrowAngle = Math.PI / 2;

  // Physics constants
  private readonly gravityForce = 180;
  private readonly maxSpeed = 300;
  private readonly boostForce = 150;

  constructor() {
    super('CosmicCargoScene');
  }

  init() {
    this.stars = [];
    this.level = 1;
    this.score = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.fuel = 100;
    this.activeGravity = GravityDir.DOWN;
    this.nearMissFlash = 0;
    this.lastBoostTime = 0;
    this.lastTiltGravityTime = 0;
    this.cargoCollected = 0;
    this.cargoTotal = 0;
    this.boostCount = 0;
    this.hazardGraceUntil = 0;
    this.directPointerDown = false;
    this.directPointerStartX = 0;
    this.directPointerStartY = 0;
    this.directPointerLastBoostAt = 0;
    this.directSwipeConsumed = false;
    this.isGameOver = false;
    this.isLevelComplete = false;
    this.lifecycleState = "start";
  }

  create() {
    const { width, height } = this.scale;

    // 1. Create starfield background
    this.starfield = this.add.graphics();
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.3 + Math.random() * 0.8,
        alpha: 0.2 + Math.random() * 0.8
      });
    }

    // 2. Generate textures programmatically
    this.createGameTextures();

    // 3. Create physics groups
    this.asteroids = this.physics.add.group({
      bounceX: 1,
      bounceY: 1,
      collideWorldBounds: true
    });

    this.cargoPods = this.physics.add.staticGroup();

    // 4. Create Portal
    this.portal = this.physics.add.image(width - 70, height - 70, 'exit-portal');
    this.portal.setOrigin(0.5);

    // 5. Create player ship
    this.ship = this.physics.add.sprite(width / 2, 70, 'cosmic-ship');
    this.ship.setCollideWorldBounds(true);
    this.ship.setBounce(0.5, 0.5);
    this.ship.setMaxVelocity(this.maxSpeed, this.maxSpeed);

    // 7. Physics Colliders
    this.physics.add.overlap(this.ship, this.cargoPods, this.collectCargo, undefined, this);
    this.physics.add.overlap(this.ship, this.portal, this.checkExit, undefined, this);

    // Keep asteroids colliding with each other and ship
    this.physics.add.collider(this.asteroids, this.asteroids);
    this.physics.add.collider(this.ship, this.asteroids, this.hitAsteroid, undefined, this);

    // 9. UI setup
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', { fontSize: '16px', fontFamily: 'monospace', color: '#ffffff' });
    this.levelText = this.add.text(width - 20, 20, 'LEVEL 1', { fontSize: '16px', fontFamily: 'monospace', color: '#8888a0' }).setOrigin(1, 0);
    this.cargoText = this.add.text(20, 45, 'CARGO: 0/3', { fontSize: '12px', fontFamily: 'monospace', color: '#ffd700' });
    this.gravityText = this.add.text(width / 2, 20, 'GRAVITY: DOWN', { fontSize: '12px', fontFamily: 'monospace', color: '#00ccff' }).setOrigin(0.5, 0);
    this.portalText = this.add.text(width / 2, 42, 'PORTAL: LOCKED', { fontSize: '11px', fontFamily: 'monospace', color: '#ff8844' }).setOrigin(0.5, 0);
    
    // Fuel Bar
    this.add.text(20, 70, 'FUEL:', { fontSize: '11px', fontFamily: 'monospace', color: '#888888' });
    this.fuelBar = this.add.graphics();

    // Tutorial Demo & Gameplay Visuals
    this.demoArrow = this.add.graphics();
    this.gravityArrow = this.add.graphics();
    this.demoCalloutText = this.add.text(width / 2, height / 2 + 60, "", {
      fontSize: "14px",
      fontFamily: "monospace",
      color: "#00ccff",
      align: "center",
      fontStyle: "bold"
    }).setOrigin(0.5).setAlpha(0);

    // 6. Setup level layout
    this.generateLevel();

    // Main overlays
    this.stateText = this.add.text(width / 2, height / 2 - 50, 'COSMIC CARGO', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ff6b35',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.stateText.setShadow(0, 0, '#ff6b35', 10, true, true);

    this.hintText = this.add.text(width / 2, height / 2 + 20, 'PHONE: TILT OR SWIPE TO FLIP GRAVITY\nHOLD TO BOOST, RELEASE TO DRIFT\nDESKTOP: ARROWS + SPACE\n\nTAP TO START', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    // High Score
    const bestScore = readStoredNumber('cosmic_cargo_high');
    this.hiScoreText = this.add.text(width / 2, height / 2 + 100, `🏆 BEST SCORE: ${bestScore}`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffd700'
    }).setOrigin(0.5);

    // Exit Button
    this.backBtn = this.add.text(20, 20, '← BACK TO HUB', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

    this.backBtn.on('pointerdown', () => {
      SoundSynth.playTone(400, 0.1, 'sine', 0.05);
      this.scene.start('HubScene');
    });

    this.input.on('pointerdown', this.handleDirectPointerDown, this);
    this.input.on('pointermove', this.handleDirectPointerMove, this);
    this.input.on('pointerup', this.handleDirectPointerUp, this);

    // Shared Runtime Initialization
    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    if (runtime) runtime.blockHubInputUntil(performance.now() + 100);
    this.lifecycleManager = new LifecycleManager(this, runtime);

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
      this.input.off('pointerdown', this.handleDirectPointerDown, this);
      this.input.off('pointermove', this.handleDirectPointerMove, this);
      this.input.off('pointerup', this.handleDirectPointerUp, this);
    });

    // Set initial gravity configuration
    this.updateGravity(GravityDir.DOWN);
    this.showStart();
  }

  private handleResize() {
    const { width, height } = this.scale;

    // Reposition UI
    this.levelText.setPosition(width - 20, 20);
    this.gravityText.setPosition(width / 2, 20);
    this.portalText.setPosition(width / 2, 42);
    this.stateText.setPosition(width / 2, height / 2 - 50);
    this.hintText.setPosition(width / 2, height / 2 + 20);
    this.hiScoreText.setPosition(width / 2, height / 2 + 100);
    this.backBtn.setPosition(20, 20);

    // Update starfield
    this.starfield.clear();
    this.stars.forEach(star => {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    });

    // Reposition Portal
    if (this.portal) {
      this.portal.setPosition(width - 70, height - 70);
    }
  }

  update() {
    const { width, height } = this.scale;

    // Scroll Background Stars
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

    // Render Fuel Bar
    this.drawFuelBar();

    if (this.lifecycleState === "start") {
      this.updateDemo();
      this.lifecycleManager.update(performance.now());
      return;
    }

    this.lifecycleManager.update(performance.now());

    if (this.lifecycleState !== "playing") {
      this.ship.setVelocity(0, 0);
      this.gravityArrow.clear();
      return;
    }

    // After gameplay logic, draw gravity arrow
    this.gravityArrow.clear();
    const arrowLen = 15;
    const arrowEndX = this.ship.x + Math.sin(this.gravityArrowAngle) * arrowLen;
    const arrowEndY = this.ship.y + Math.cos(this.gravityArrowAngle) * arrowLen;
    this.gravityArrow.lineStyle(2, 0x00ccff, 0.5);
    this.gravityArrow.beginPath();
    this.gravityArrow.moveTo(this.ship.x, this.ship.y + 12);
    this.gravityArrow.lineTo(arrowEndX, arrowEndY + 12);
    this.gravityArrow.strokePath();

    // Slow fuel regen
    this.fuel = Math.min(100, this.fuel + 0.03);

    // Portal visual rotating glow
    this.portal.setAngle(this.portal.angle + 1);

    // Near miss proximity detector
    this.checkNearMisses();

    // Screen Flash decay
    if (this.nearMissFlash > 0) {
      this.nearMissFlash--;
      if (this.nearMissFlash === 0) {
        this.cameras.main.setBackgroundColor(0x020111);
      }
    }

    if (this.directPointerDown && this.time.now - this.directPointerLastBoostAt > 160) {
      this.useBoost();
      this.directPointerLastBoostAt = this.time.now;
    }
  }

  showStart() {
    this.lifecycleState = "start";
    this.stateText.setVisible(true);
    this.stateText.setText("COSMIC CARGO").setColor("#ff6b35");
    this.hintText.setVisible(true);
    this.hintText.setText("TAP TO START");
    this.demoPhase = 0;
    this.demoTimer = 0;
  }

  startGameplay() {
    if (this.isLevelComplete) {
      this.nextLevel();
      this.lifecycleState = "playing";
      return;
    }
    this.lifecycleState = "playing";
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.demoCalloutText.setVisible(false);
    this.demoArrow.clear();
    this.hazardGraceUntil = this.time.now + 2600;
  }

  pauseGameplay() {
    this.lifecycleState = "paused";
    this.physics.pause();
  }

  resumeGameplay() {
    this.lifecycleState = "playing";
    this.physics.resume();
  }

  resetGameplay() {
    this.scene.restart();
  }

  returnToHub() {
    SoundSynth.playTone(400, 0.1, "sine", 0.05);
    this.scene.start("HubScene");
  }

  handleArcadeInput(frame: ArcadeInputFrame) {
    if (this.lifecycleState !== "playing") return;

    // --- GRAVITY FLIPS ---
    // Keyboard/D-pad
    if (frame.actions.down.held) this.updateGravity(GravityDir.DOWN);
    else if (frame.actions.up.held) this.updateGravity(GravityDir.UP);
    else if (frame.actions.left.held) this.updateGravity(GravityDir.LEFT);
    else if (frame.actions.right.held) this.updateGravity(GravityDir.RIGHT);

    // Swipes
    if (frame.gestures.swipeDown) this.updateGravity(GravityDir.DOWN);
    else if (frame.gestures.swipeUp) this.updateGravity(GravityDir.UP);
    else if (frame.gestures.swipeLeft) this.updateGravity(GravityDir.LEFT);
    else if (frame.gestures.swipeRight) this.updateGravity(GravityDir.RIGHT);

    // Tilt
    if (this.time.now - this.lastTiltGravityTime > 260) {
      if (frame.motion.tiltY > 0.3) {
        this.updateGravity(GravityDir.DOWN);
        this.lastTiltGravityTime = this.time.now;
      } else if (frame.motion.tiltY < -0.3) {
        this.updateGravity(GravityDir.UP);
        this.lastTiltGravityTime = this.time.now;
      } else if (frame.motion.tiltX < -0.3) {
        this.updateGravity(GravityDir.LEFT);
        this.lastTiltGravityTime = this.time.now;
      } else if (frame.motion.tiltX > 0.3) {
        this.updateGravity(GravityDir.RIGHT);
        this.lastTiltGravityTime = this.time.now;
      }
    }

    // --- BOOST ---
    if (frame.actions.boost.justPressed) {
      this.useBoost();
    }
    if (frame.actions.boost.held && this.time.now - this.lastBoostTime > 160) {
      this.useBoost();
    }
  }

  private handleDirectPointerDown(pointer: Phaser.Input.Pointer) {
    if (pointer.x < 140 && pointer.y < 70) return;

    if (this.lifecycleState === "start" || this.lifecycleState === "levelComplete") {
      this.startGameplay();
      return;
    }

    if (this.lifecycleState === "gameOver") {
      this.resetGameplay();
      return;
    }

    if (this.lifecycleState !== "playing") return;

    this.directPointerDown = true;
    this.directPointerStartX = pointer.x;
    this.directPointerStartY = pointer.y;
    this.directPointerLastBoostAt = this.time.now;
    this.directSwipeConsumed = false;
    this.useBoost();
  }

  private handleDirectPointerMove(pointer: Phaser.Input.Pointer) {
    if (!this.directPointerDown || this.directSwipeConsumed || this.lifecycleState !== "playing") return;

    const dx = pointer.x - this.directPointerStartX;
    const dy = pointer.y - this.directPointerStartY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (Math.max(absX, absY) < 42) return;

    if (absX > absY) {
      this.updateGravity(dx > 0 ? GravityDir.RIGHT : GravityDir.LEFT);
    } else {
      this.updateGravity(dy > 0 ? GravityDir.DOWN : GravityDir.UP);
    }
    this.directSwipeConsumed = true;
  }

  private handleDirectPointerUp() {
    this.directPointerDown = false;
  }

  destroySceneResources() {
    // Cleanup if needed
  }

  private createGameTextures() {
    // Spaceship texture
    if (!this.textures.exists('cosmic-ship')) {
      const g = this.add.graphics();
      g.fillStyle(0x0088cc, 1);
      g.beginPath();
      g.moveTo(20, 8);
      g.lineTo(0, 16);
      g.lineTo(4, 8);
      g.lineTo(0, 0);
      g.closePath();
      g.fill();

      // Cockpit
      g.fillStyle(0x00d4ff, 1);
      g.fillCircle(12, 8, 3);
      g.generateTexture('cosmic-ship', 20, 16);
      g.destroy();
    }

    // Exit Portal ring
    if (!this.textures.exists('exit-portal')) {
      const g = this.add.graphics();
      g.lineStyle(3, 0x00ff88, 1);
      g.strokeCircle(20, 20, 16);
      g.lineStyle(1.5, 0x00ff88, 0.4);
      g.strokeCircle(20, 20, 10);
      g.generateTexture('exit-portal', 40, 40);
      g.destroy();
    }

    // Cargo Diamond Pod
    if (!this.textures.exists('cargo-pod')) {
      const g = this.add.graphics();
      g.fillStyle(0xffd700, 1);
      g.beginPath();
      g.moveTo(7, 0);
      g.lineTo(14, 7);
      g.lineTo(7, 14);
      g.lineTo(0, 7);
      g.closePath();
      g.fill();
      g.generateTexture('cargo-pod', 14, 14);
      g.destroy();
    }

    // Dynamic Asteroid shapes
    for (let size = 1; size <= 3; size++) {
      const r = size === 3 ? 24 : size === 2 ? 14 : 7;
      const key = `ast-${size}`;
      if (!this.textures.exists(key)) {
        const g = this.add.graphics();
        g.lineStyle(2, 0x8899aa, 1);
        g.fillStyle(0x2a2a44, 1);

        const pts = size === 3 ? 10 : size === 2 ? 8 : 6;
        g.beginPath();
        for (let i = 0; i < pts; i++) {
          const angle = (i / pts) * Math.PI * 2;
          const rad = r * (0.8 + Math.random() * 0.2);
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
  }

  private updateGravity(dir: GravityDir) {
    if (this.activeGravity === dir && this.lifecycleState !== "start") return;
    this.activeGravity = dir;

    if (this.lifecycleState !== "start") {
      SoundSynth.playFlip();
      this.createBoostParticles(this.ship.x, this.ship.y, 0x00ccff, 6);
      this.hazardGraceUntil = Math.max(this.hazardGraceUntil, this.time.now + 700);
    }

    // Set Arcade Physics gravity vector
    switch (dir) {
      case GravityDir.UP:
        this.physics.world.gravity.set(0, -this.gravityForce);
        this.ship.setAngle(-90);
        this.gravityText.setText('GRAVITY: UP');
        break;
      case GravityDir.DOWN:
        this.physics.world.gravity.set(0, this.gravityForce);
        this.ship.setAngle(90);
        this.gravityText.setText('GRAVITY: DOWN');
        break;
      case GravityDir.LEFT:
        this.physics.world.gravity.set(-this.gravityForce, 0);
        this.ship.setAngle(180);
        this.gravityText.setText('GRAVITY: LEFT');
        break;
      case GravityDir.RIGHT:
        this.physics.world.gravity.set(this.gravityForce, 0);
        this.ship.setAngle(0);
        this.gravityText.setText('GRAVITY: RIGHT');
        break;
    }

    // Store gravity arrow angle for drawing in update()
    switch (dir) {
      case GravityDir.UP: this.gravityArrowAngle = -Math.PI / 2; break;
      case GravityDir.DOWN: this.gravityArrowAngle = Math.PI / 2; break;
      case GravityDir.LEFT: this.gravityArrowAngle = Math.PI; break;
      case GravityDir.RIGHT: this.gravityArrowAngle = 0; break;
    }
  }

  private useBoost() {
    if (this.fuel < 5) return;
    if (this.time.now - this.lastBoostTime < 90) return;
    this.lastBoostTime = this.time.now;
    this.fuel = Math.max(0, this.fuel - 5);
    this.boostCount++;
    
    SoundSynth.playBoost();

    // Apply thrust velocity
    let vx = 0;
    let vy = 0;

    switch (this.activeGravity) {
      case GravityDir.UP: vy = -this.boostForce; break;
      case GravityDir.DOWN: vy = this.boostForce; break;
      case GravityDir.LEFT: vx = -this.boostForce; break;
      case GravityDir.RIGHT: vx = this.boostForce; break;
    }

    this.ship.setVelocity(this.ship.body!.velocity.x + vx, this.ship.body!.velocity.y + vy);
    this.createBoostParticles(this.ship.x, this.ship.y, 0xff6b35, 8);
  }

  private generateLevel() {
    const { width } = this.scale;
    const playTop = 100;
    const playBottom = this.scale.height - 100;

    this.asteroids.clear(true, true);
    this.cargoPods.clear(true, true);
    this.portalText.setText('PORTAL: LOCKED').setColor('#ff8844');
    this.portal.setTint(0x666666);

    const numAsteroids = 6 + this.level * 2;
    const numCargo = 3 + Math.min(this.level, 7);
    this.cargoCollected = 0;
    this.cargoTotal = numCargo;
    const placed: Array<{ x: number; y: number; radius: number }> = [
      { x: this.ship.x, y: this.ship.y, radius: 100 },
      { x: this.portal.x, y: this.portal.y, radius: 80 }
    ];

    // Spawns cargo pods
    for (let i = 0; i < numCargo; i++) {
      let x = 0, y = 0, safe = false;
      let attempts = 0;
      while (!safe && attempts < 100) {
        attempts++;
        x = 60 + Math.random() * (width - 120);
        y = playTop + Math.random() * Math.max(1, playBottom - playTop);
        safe = this.isSafeSpawn(x, y, 24, placed);
      }
      this.cargoPods.create(x, y, 'cargo-pod');
      placed.push({ x, y, radius: 34 });
    }

    // Add pulsing effect to all cargo pods
    this.cargoPods.getChildren().forEach((pod) => {
      this.tweens.add({
        targets: pod,
        scale: { from: 1.0, to: 1.15 },
        yoyo: true,
        repeat: -1,
        duration: 800,
        ease: "Sine.easeInOut"
      });
    });

    this.cargoText.setText(`CARGO: 0/${numCargo}`);

    // Spawns floating asteroids
    for (let i = 0; i < numAsteroids; i++) {
      let x = 0, y = 0, safe = false;
      let attempts = 0;
      while (!safe && attempts < 100) {
        attempts++;
        x = 50 + Math.random() * (width - 100);
        y = playTop + Math.random() * Math.max(1, playBottom - playTop);
        safe = this.isSafeSpawn(x, y, 36, placed);
      }
      
      const size = Phaser.Math.Between(1, 3);
      const r = size === 3 ? 24 : size === 2 ? 14 : 7;
      const asteroid = this.asteroids.create(x, y, `ast-${size}`) as Phaser.Physics.Arcade.Sprite;
      
      asteroid.body?.setCircle(r);
      
      const speed = 30 + this.level * 8 + Math.random() * 30;
      const ang = Math.random() * Math.PI * 2;
      asteroid.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
      asteroid.setData('size', size);
      placed.push({ x, y, radius: r + 26 });
    }
  }

  private isSafeSpawn(x: number, y: number, radius: number, placed: Array<{ x: number; y: number; radius: number }>) {
    const playTop = 100;
    const playBottom = this.scale.height - 100;
    if (x < 35 || x > this.scale.width - 35 || y < playTop || y > playBottom) return false;

    return placed.every(item => Phaser.Math.Distance.Between(x, y, item.x, item.y) > radius + item.radius);
  }

  private collectCargo(_shipObj: any, podObj: any) {
    const pod = podObj as Phaser.Physics.Arcade.Image;
    pod.destroy();

    SoundSynth.playCollect();
    this.cargoCollected++;

    // Multiplier combo
    const timeNow = Date.now();
    if (timeNow - this.comboTimer < 3000) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.comboTimer = timeNow;

    const reward = 100 * this.comboCount;
    this.score += reward;
    this.scoreText.setText(`SCORE: ${this.score}`);
    this.cameras.main.shake(50, 0.005);

    // Popup text floating
    const text = this.add.text(pod.x, pod.y - 15, `+${reward} (x${this.comboCount})`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: text,
      y: text.y - 25,
      alpha: 0,
      duration: 700,
      onComplete: () => text.destroy()
    });

    const collected = this.cargoPods.countActive();
    const total = this.cargoTotal;
    this.cargoText.setText(`CARGO: ${total - collected}/${total}`);

    // Portal glowing effect
    if (collected === 0) {
      this.portalText.setText('PORTAL: OPEN').setColor('#55ff88');
      this.portal.clearTint();
      this.tweens.add({
        targets: this.portal,
        scale: 1.3,
        yoyo: true,
        repeat: -1,
        duration: 500
      });
    }
  }

  private checkNearMisses() {
    this.asteroids.getChildren().forEach(ast => {
      const asteroid = ast as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(this.ship.x, this.ship.y, asteroid.x, asteroid.y);
      const minSafeDist = asteroid.body!.width / 2 + 15;

      // Close but not colliding
      if (dist < minSafeDist && dist > minSafeDist - 3 && !asteroid.getData('missed')) {
        asteroid.setData('missed', true);
        
        // Award Near Miss points
        this.score += 50;
        this.scoreText.setText(`SCORE: ${this.score}`);
        SoundSynth.playNearMiss();

        this.cameras.main.flash(100, 255, 160, 50);
        this.cameras.main.shake(80, 0.003);

        const floatText = this.add.text(this.ship.x, this.ship.y - 25, 'NEAR MISS +50', {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#ffcc00',
          fontStyle: 'bold'
        }).setOrigin(0.5);

        this.tweens.add({
          targets: floatText,
          y: floatText.y - 30,
          alpha: 0,
          duration: 600,
          onComplete: () => floatText.destroy()
        });
      }

      // Reset near miss state when far away
      if (dist > minSafeDist + 10) {
        asteroid.setData('missed', false);
      }
    });
  }

  private checkExit(_shipObj: any, _portalObj: any) {
    if (this.cargoPods.countActive() > 0) return; // Need all cargo collected

    this.levelComplete();
  }

  private hitAsteroid() {
    if (this.time.now < this.hazardGraceUntil) return;
    this.gameOver();
  }

  private drawFuelBar() {
    this.fuelBar.clear();
    // Border
    this.fuelBar.lineStyle(1, 0x555555, 1);
    this.fuelBar.strokeRect(60, 72, 100, 10);
    // Fill
    const color = this.fuel > 30 ? 0x00ccff : 0xff4444;
    this.fuelBar.fillStyle(color, 1);
    this.fuelBar.fillRect(61, 73, Math.max(0, this.fuel - 2), 8);
  }

  private createBoostParticles(x: number, y: number, color: number, count: number) {
    const particles = this.add.particles(0, 0, 'cargo-pod', {
      x,
      y,
      speed: { min: 20, max: 100 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 500,
      maxParticles: count
    });
    this.time.delayedCall(600, () => particles.destroy());
  }

  public getGameplayStateForQA() {
    return {
      sceneKey: this.scene.key,
      lifecycle: this.lifecycleState,
      orientation: (this.scale.height >= this.scale.width ? 'portrait' : 'landscape') as "portrait" | "landscape",
      player: {
        x: this.ship?.x ?? 0,
        y: this.ship?.y ?? 0,
        vx: this.ship?.body?.velocity?.x ?? undefined,
        vy: this.ship?.body?.velocity?.y ?? undefined,
        alive: Boolean(this.ship?.visible)
      },
      score: this.score,
      fuel: this.fuel,
      gravity: GravityDir[this.activeGravity],
      primaryActionCount: this.cargoCollected,
      boostCount: this.boostCount,
      objectiveProgress: this.cargoTotal > 0 ? this.cargoCollected / this.cargoTotal : 0,
      cargoCollected: this.cargoCollected,
      cargoTotal: this.cargoTotal,
      cargoRemaining: this.cargoPods?.countActive?.() ?? 0,
      portalOpen: (this.cargoPods?.countActive?.() ?? 1) === 0,
      enemyOrHazardCount: this.asteroids?.countActive?.(true) ?? 0,
      messages: []
    };
  }

  public collectNextCargoForQA() {
    const pod = this.cargoPods.getChildren().find((child) => child.active) as Phaser.Physics.Arcade.Image | undefined;
    if (!pod || this.lifecycleState !== "playing") return false;
    this.collectCargo(this.ship, pod);
    return true;
  }

  public completeCargoForQA() {
    let collectedAny = false;
    while (this.collectNextCargoForQA()) {
      collectedAny = true;
    }
    return collectedAny;
  }

  public enterPortalForQA() {
    if ((this.cargoPods?.countActive?.() ?? 1) > 0 || this.lifecycleState !== "playing") return false;
    this.levelComplete();
    return true;
  }

  private levelComplete() {
    if (this.isLevelComplete) return;
    this.isLevelComplete = true;
    this.lifecycleState = "levelComplete";

    // Fuel bonus points
    const bonus = Math.floor(this.fuel) * 10;
    this.score += bonus;
    this.scoreText.setText(`SCORE: ${this.score}`);

    SoundSynth.playLevelUp();

    this.stateText.setText('LEVEL COMPLETE').setColor('#55ff55').setVisible(true);
    this.hintText.setText(`FUEL BONUS: +${bonus}\n\nTAP TO CONTINUE`).setVisible(true);

    this.asteroids.clear(true, true);
    this.cargoPods.clear(true, true);
    this.tweens.killTweensOf(this.portal);
    this.portal.setScale(1);
  }

  private nextLevel() {
    this.level++;
    this.isLevelComplete = false;
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);

    this.fuel = 100;
    this.levelText.setText(`LEVEL ${this.level}`);
    this.ship.setPosition(this.scale.width / 2, 70);
    this.ship.setVelocity(0, 0);

    this.generateLevel();
    this.updateGravity(GravityDir.DOWN);
  }

  private gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.lifecycleState = "gameOver";

    SoundSynth.playDeath();
    this.createBoostParticles(this.ship.x, this.ship.y, 0xff4444, 40);
    this.cameras.main.shake(300, 0.02);
    this.ship.setVisible(false);

    // Save High Score
    const currentHigh = readStoredNumber('cosmic_cargo_high');
    if (this.score > currentHigh) {
      writeStoredNumber('cosmic_cargo_high', this.score);
    }

    this.stateText.setText('MISSION FAILED').setColor('#ff4444').setVisible(true);
    this.hintText.setText('TAP TO RETRY').setVisible(true);
  }

  private updateDemo() {
    this.demoTimer += 16; // ~60fps increment
    const phaseDuration = [3000, 2500, 2500, 2500];
    
    if (this.demoTimer > phaseDuration[this.demoPhase]) {
      this.demoTimer = 0;
      this.demoPhase = (this.demoPhase + 1) % 4;
    }
    
    const progress = this.demoTimer / phaseDuration[this.demoPhase];
    
    // Clear and redraw demo arrow
    this.demoArrow.clear();
    
    switch (this.demoPhase) {
      case 0: // Gravity demo
        const angle = progress * Math.PI * 2; // Full rotation
        this.drawDemoArrow(angle);
        // Simulate ship drift in gravity direction
        const driftX = Math.sin(angle) * 30;
        const driftY = Math.cos(angle) * 30;
        this.ship.setPosition(this.scale.width / 2 + driftX, this.scale.height / 2 + driftY);
        break;
      case 1: // Boost demo
        this.drawDemoArrow(0); // Point down (gravity = DOWN)
        this.ship.setPosition(this.scale.width / 2, this.scale.height / 2 + (1 - progress) * 60);
        // Visual boost particles every 300ms
        if (Math.floor(progress * 8) % 2 === 0) {
          this.createBoostParticles(this.ship.x, this.ship.y + 10, 0xff6b35, 5);
        }
        break;
      case 2: // Cargo demo
        this.drawDemoArrow(Math.PI / 2); // Point right
        // Ship drifts toward cargo area
        this.ship.setPosition(
          this.scale.width / 2 + Math.sin(progress * Math.PI) * 80,
          this.scale.height / 2 + 30
        );
        break;
      case 3: // Portal demo
        this.drawDemoArrow(-Math.PI / 2); // Point up
        this.portal.setPosition(this.scale.width - 70, this.scale.height - 70);
        this.portal.clearTint();
        this.portal.setScale(1.0 + Math.sin(progress * Math.PI * 2) * 0.15);
        this.ship.setPosition(
          this.scale.width - 70 - (1 - progress) * 100,
          this.scale.height - 70
        );
        break;
    }

    const callouts = [
      "↕ TILT or SWIPE to flip gravity direction",
      "✋ HOLD anywhere to BOOST the ship",
      "💎 Collect ALL cargo pods to unlock exit",
      "🚪 Reach the portal to complete the level"
    ];
    this.demoCalloutText.setText(callouts[this.demoPhase]);
    this.demoCalloutText.setAlpha(0.5 + Math.sin(progress * Math.PI) * 0.5);
    this.demoCalloutText.setVisible(true);
  }

  private drawDemoArrow(angle: number) {
    const cx = this.ship.x;
    const cy = this.ship.y - 30;
    const len = 20;
    const headLen = 8;
    const endX = cx + Math.sin(angle) * len;
    const endY = cy + Math.cos(angle) * len;
    
    this.demoArrow.lineStyle(2, 0x00ccff, 0.8);
    this.demoArrow.beginPath();
    this.demoArrow.moveTo(cx, cy);
    this.demoArrow.lineTo(endX, endY);
    this.demoArrow.strokePath();
    
    // Arrowhead
    this.demoArrow.fillStyle(0x00ccff, 0.9);
    this.demoArrow.beginPath();
    this.demoArrow.moveTo(endX, endY);
    this.demoArrow.lineTo(endX - Math.sin(angle - 0.4) * headLen, endY - Math.cos(angle - 0.4) * headLen);
    this.demoArrow.lineTo(endX - Math.sin(angle + 0.4) * headLen, endY - Math.cos(angle + 0.4) * headLen);
    this.demoArrow.closePath();
    this.demoArrow.fill();
  }
}
