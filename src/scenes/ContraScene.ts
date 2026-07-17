import Phaser from 'phaser';
import { SoundSynth } from '../utils/SoundSynth';
import { GameLifecycle, LifecycleState } from "../runtime/GameLifecycle";
import { LifecycleManager } from "../runtime/LifecycleManager";
import { ArcadeInputFrame, GameplayQAState } from "../runtime/ArcadeInputFrame";
import { InputRuntime } from "../runtime/InputRuntime";
import { StandardOverlays } from '../utils/StandardOverlays';


interface EnemySpawn {
  tx: number;
  type: 'sol' | 'fly' | 'tur' | 'hev';
  offX: number;
  triggered: boolean;
}

export class ContraScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = "ContraScene";
  private lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = "start";

  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private capsules!: Phaser.Physics.Arcade.Group;

  // Boss
  private bossActive = false;
  private bossDefeated = false;
  private bossHp = 35;
  private bossMaxHp = 35;
  private bossBody!: Phaser.GameObjects.Rectangle;
  private bossHead!: Phaser.GameObjects.Rectangle;
  private bossHpBar!: Phaser.GameObjects.Graphics;
  private bossShootTime = 0;
  private bossMoveTime = 0;
  private bossDir = -1;
  private bossFlashFrames = 0;

  // Game state
  private lives = 3;
  private score = 0;
  private weapon = 'rifle';
  private fireCooldown = 0;
  private invulnerabilityFrames = 0;
  private isGameOver = false;
  private isVictory = false;
  private faceDirection = 1; // 1 = right, -1 = left
  private shotsFired = 0;
  private jumpsTriggered = 0;
  private enemiesDamaged = 0;
  private comboCount = 1;
  private comboTimer = 0;

  // UI Elements
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private bossWarningText?: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private backHitZone!: Phaser.GameObjects.Zone;
  private overlays!: StandardOverlays;

  // Virtual controls
  private isMobile = false;
  private joystickOuter?: Phaser.GameObjects.Arc;
  private joystickKnob?: Phaser.GameObjects.Arc;
  private jumpBtn?: Phaser.GameObjects.Arc;
  private fireBtn?: Phaser.GameObjects.Arc;
  private jumpText?: Phaser.GameObjects.Text;
  private fireText?: Phaser.GameObjects.Text;

  private virtualLeft = false;
  private virtualRight = false;
  private virtualUp = false;
  private virtualDown = false;
  private virtualJump = false;
  private virtualFire = false;
  private virtualJumpPrev = false;

  // Starfield/Scenery
  private starfield!: Phaser.GameObjects.Graphics;

  // Spawns
  private spawns: EnemySpawn[] = [];

  private readonly levelWidth = 4500;
  private groundY = 530;

  private getComputedGroundY(height?: number): number {
    const h = height ?? this.scale.height;
    // groundY adapts to viewport height:
    // - Tall portrait (844px): groundY ~530 (current default)
    // - Short landscape (390px): groundY ~280
    // - Everything else interpolated
    const minH = 380;
    const maxH = 900;
    const clamped = Phaser.Math.Clamp(h, minH, maxH);
    const t = (clamped - minH) / (maxH - minH);
    return Math.round(280 + t * 270); // 280 at minH, 550 at maxH
  }

  constructor() {
    super('ContraScene');
  }

  init() {
    this.lives = 3;
    this.score = 0;
    this.weapon = 'rifle';
    this.fireCooldown = 0;
    this.invulnerabilityFrames = 0;
    this.isGameOver = false;
    this.isVictory = false;
    this.faceDirection = 1;
    this.shotsFired = 0;
    this.jumpsTriggered = 0;
    this.enemiesDamaged = 0;
    this.comboCount = 1;
    this.comboTimer = 0;
    this.bossActive = false;
    this.bossDefeated = false;
    this.bossHp = 35;
    this.lifecycleState = "start";

    this.virtualLeft = false;
    this.virtualRight = false;
    this.virtualUp = false;
    this.virtualDown = false;
    this.virtualJump = false;
    this.virtualFire = false;
    this.virtualJumpPrev = false;
    this.isMobile = false;

    this.joystickOuter = undefined;
    this.joystickKnob = undefined;
    this.jumpBtn = undefined;
    this.fireBtn = undefined;
    this.jumpText = undefined;
    this.fireText = undefined;

    // Compute groundY from viewport height
    this.groundY = this.getComputedGroundY(this.scale?.height);

    // Set spawn coordinates (multiply original scale triggers by 1.25 for Phaser scale)
    const rawWaves = [
      { tx: 200, type: 'sol', offX: 10 }, { tx: 350, type: 'sol', offX: 15 }, { tx: 450, type: 'fly', offX: 5 },
      { tx: 600, type: 'tur', offX: 20 }, { tx: 700, type: 'sol', offX: 10 }, { tx: 750, type: 'sol', offX: 15 },
      { tx: 850, type: 'fly', offX: 5 }, { tx: 950, type: 'hev', offX: 25 }, { tx: 1000, type: 'sol', offX: 10 },
      { tx: 1100, type: 'sol', offX: 15 }, { tx: 1200, type: 'fly', offX: 5 }, { tx: 1300, type: 'tur', offX: 20 },
      { tx: 1400, type: 'sol', offX: 10 }, { tx: 1500, type: 'hev', offX: 25 }, { tx: 1600, type: 'sol', offX: 10 },
      { tx: 1700, type: 'fly', offX: 5 }, { tx: 1800, type: 'sol', offX: 15 }, { tx: 1900, type: 'sol', offX: 10 },
      { tx: 2000, type: 'tur', offX: 20 }, { tx: 2100, type: 'sol', offX: 10 }, { tx: 2200, type: 'fly', offX: 5 },
      { tx: 2300, type: 'hev', offX: 25 }, { tx: 2400, type: 'sol', offX: 10 }, { tx: 2500, type: 'sol', offX: 15 },
      { tx: 2600, type: 'fly', offX: 5 }, { tx: 2700, type: 'tur', offX: 20 }, { tx: 2800, type: 'sol', offX: 10 },
      { tx: 2900, type: 'hev', offX: 25 }, { tx: 3000, type: 'sol', offX: 10 }, { tx: 3100, type: 'fly', offX: 5 },
    ] as const;

    this.spawns = rawWaves.map(w => ({
      tx: w.tx * 1.3,
      type: w.type,
      offX: w.offX,
      triggered: false
    }));
  }

  create() {
    const { width, height } = this.scale;

    // Create Animations
    if (!this.anims.exists('run')) {
      this.anims.create({
        key: 'run',
        frames: [
          { key: 'player-run1' },
          { key: 'player-run2' }
        ],
        frameRate: 10,
        repeat: -1
      });
    }

    // 1. Scene backdrop scenery (stars & mountains)
    this.createScenery();

    // 2. Physics Groups
    this.platforms = this.physics.add.staticGroup();
    this.bullets = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.capsules = this.physics.add.group();

    // 3. Build platforms (standard tiles)
    this.createPlatforms();

    // 4. Create Player
    this.player = this.physics.add.sprite(80, this.groundY - 60, 'player-stand');
    this.player.setCollideWorldBounds(true);
    this.player.setOrigin(0.5);
    this.player.body?.setSize(20, 32);
    if (this.player.body) {
      (this.player.body as Phaser.Physics.Arcade.Body).setGravityY(800);
    }

    // Collide player and enemies with platforms
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.enemies, this.platforms);
    this.physics.add.collider(this.capsules, this.platforms);

    // Dynamic Collisions
    this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, undefined, this);
    this.physics.add.overlap(this.bullets, this.capsules, this.hitCapsule, undefined, this);
    this.physics.add.overlap(this.enemyBullets, this.player, this.hitPlayer, undefined, this);
    this.physics.add.overlap(this.enemies, this.player, this.collideWithEnemy, undefined, this);

    // 5. Camera follow setup
    this.cameras.main.setBounds(0, 0, this.levelWidth, height);
    this.physics.world.setBounds(0, 0, this.levelWidth, height);
    this.cameras.main.startFollow(this.player, true, 0.1, 0, -100, 60);
    this.applyCameraLayout();

    // 7. Dynamic Static capsule items
    // Generate capsule texture first
    if (!this.textures.exists('capsule')) {
      const g = this.add.graphics();
      g.fillStyle(0xff2222, 1);
      g.fillRect(0, 0, 16, 16);
      g.fillStyle(0xffffff, 1);
      g.fillRect(4, 4, 8, 8);
      g.generateTexture('capsule', 16, 16);
      g.destroy();
    }

    const capsulePoints = [900, 1900, 2900, 3700];
    capsulePoints.forEach(x => {
      const cap = this.capsules.create(x, this.groundY - 140, 'capsule') as Phaser.Physics.Arcade.Image;
      cap.setCollideWorldBounds(true);
      if (cap.body) (cap.body as Phaser.Physics.Arcade.Body).setGravityY(100);
      cap.setData('type', 'spread');
    });

    // 8. HUD Text overlays
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', { fontSize: '16px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#ffffff' }).setScrollFactor(0);
    this.livesText = this.add.text(width / 2, 20, 'LIVES: ♥ ♥ ♥', { fontSize: '16px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#00c805' }).setOrigin(0.5, 0).setScrollFactor(0);
    this.weaponText = this.add.text(20, 45, 'WPN: RIFLE', { fontSize: '11px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#00c805' }).setScrollFactor(0);
    this.comboText = this.add.text(20, 60, '', { fontSize: '12px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#00c805', fontStyle: 'bold' }).setScrollFactor(0);

    // Overlay Game States
    this.stateText = this.add.text(width / 2, height / 2 - 40, 'CONTRA MISSION', {
      fontSize: '32px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.stateText.setShadow(0, 0, '#00c805', 8, true, true);

    this.hintText = this.add.text(width / 2, height / 2 + 25, 'PHONE: DRAG TO RUN/AIM, SWIPE UP TO JUMP\nAUTO-FIRE ON HOLD, TILT TO MOVE HANDS-FREE\nDESKTOP: ARROWS + X + SPACE\n\nTAP TO START', {
      fontSize: '12px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    // Back button floating UI
    this.backBtn = this.add.text(20, 20, '← BACK TO HUB', {
      fontSize: '13px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0);

    this.backHitZone = this.add.zone(20 + 46, 20, 184, 58)
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1001);

    this.overlays = new StandardOverlays(this);
    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    if (runtime) runtime.blockHubInputUntil(performance.now() + 100);
    this.lifecycleManager = new LifecycleManager(this, runtime);
    this.backBtn.setInteractive({ useHandCursor: true });
    this.backBtn.on("pointerdown", () => { SoundSynth.playTone(400, 0.1, "sine", 0.05); this.scene.start("HubScene"); });
    this.backHitZone.setInteractive({ useHandCursor: true });
    this.backHitZone.on("pointerdown", () => { SoundSynth.playTone(400, 0.1, "sine", 0.05); this.scene.start("HubScene"); });
    this.input.on('pointerdown', this.handleDirectBackPointer, this);

    this.isMobile = !this.sys.game.device.os.desktop || this.sys.game.device.input.touch;
    if (this.isMobile) {
      if ((this.input.manager as any).pointers.length < 3) {
        this.input.addPointer(2);
      }
      this.setupMobileControls();
    }

    this.showStart();

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

    // Recalculate groundY for new viewport height
    this.groundY = this.getComputedGroundY(height);

    // Reposition HUD
    this.applyCameraLayout();
    this.livesText.setPosition(width / 2, 20);
    this.stateText.setPosition(width / 2, height / 2 - 40);
    this.hintText.setPosition(width / 2, height / 2 + 25);
    this.backBtn.setPosition(20, 20);
    this.backHitZone.setPosition(20 + 46, 20);
    if (this.bossWarningText) {
      this.bossWarningText.setPosition(width / 2, 100);
    }

    this.positionMobileControls();

    // Update starfield
    this.starfield.clear();
  }

  private setupMobileControls() {
    if (!this.isMobile) return;

    this.joystickOuter = this.add.arc(0, 0, 50, 0, 360, false, 0xffffff, 0.15)
      .setStrokeStyle(3, 0xffffff, 0.4)
      .setScrollFactor(0)
      .setDepth(1000);

    this.joystickKnob = this.add.arc(0, 0, 20, 0, 360, false, 0xffffff, 0.3)
      .setStrokeStyle(2, 0xffffff, 0.6)
      .setScrollFactor(0)
      .setDepth(1000);

    this.jumpBtn = this.add.arc(0, 0, 32, 0, 360, false, 0x00c805, 0.25)
      .setStrokeStyle(3, 0x00c805, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);
    this.jumpText = this.add.text(0, 0, 'JUMP', { fontSize: '12px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.fireBtn = this.add.arc(0, 0, 32, 0, 360, false, 0xff2222, 0.25)
      .setStrokeStyle(3, 0xff2222, 0.5)
      .setScrollFactor(0)
      .setDepth(1000);
    this.fireText = this.add.text(0, 0, 'FIRE', { fontSize: '12px', fontFamily: "'Outfit', system-ui, sans-serif", color: '#ffffff', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1000);

    this.positionMobileControls();
  }

  private positionMobileControls() {
    if (!this.isMobile) return;

    const { width, height } = this.scale;

    const joyX = 85;
    const joyY = height - 85;
    if (this.joystickOuter) this.joystickOuter.setPosition(joyX, joyY);
    if (this.joystickKnob) this.joystickKnob.setPosition(joyX, joyY);

    const fireX = width - 60;
    const fireY = height - 85;
    if (this.fireBtn) this.fireBtn.setPosition(fireX, fireY);
    if (this.fireText) this.fireText.setPosition(fireX, fireY);

    const jumpX = width - 145;
    const jumpY = height - 85;
    if (this.jumpBtn) this.jumpBtn.setPosition(jumpX, jumpY);
    if (this.jumpText) this.jumpText.setPosition(jumpX, jumpY);
  }

  update(time: number) {
    const { width, height } = this.scale;
    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    if (!runtime) return;

    this.lifecycleManager.update(time);

    // Background Stars movement (disabled for Robinhood theme)
    this.starfield.clear();

    if (this.lifecycleState !== 'playing') {
      this.player.setVelocityX(0);
      return;
    }

    if (Date.now() - this.comboTimer > 2000 && this.comboCount > 1) {
      this.comboCount = 1;
      this.comboText.setText('');
    }

    const frame = runtime.readFrame();

    // Decay invulnerability frames
    if (this.invulnerabilityFrames > 0) {
      this.invulnerabilityFrames--;
      this.player.setVisible(Math.floor(this.invulnerabilityFrames / 4) % 2 === 0);
    } else {
      this.player.setVisible(true);
    }

    // --- CHECK BOSS TRIGGER (Scroll lock) ---
    if (this.player.x >= 4000 && !this.bossActive && !this.bossDefeated) {
      this.triggerBossFight();
    }

    // Platform drops cleaner
    this.bullets.getChildren().filter(b => {
      const bullet = b as Phaser.Physics.Arcade.Image;
      return bullet.x < this.cameras.main.scrollX - 40 ||
        bullet.x > this.cameras.main.scrollX + width + 40 ||
        bullet.y < -50 ||
        bullet.y > height + 50;
    }).forEach(b => b.destroy());

    this.enemyBullets.getChildren().filter(b => {
      const bullet = b as Phaser.Physics.Arcade.Image;
      return bullet.x < this.cameras.main.scrollX - 40 ||
        bullet.x > this.cameras.main.scrollX + width + 40 ||
        bullet.y < -50 ||
        bullet.y > height + 50;
    }).forEach(b => b.destroy());

    // --- PLAYER CONTROLS ---
    this.virtualLeft = false;
    this.virtualRight = false;
    this.virtualUp = false;
    this.virtualDown = false;
    this.virtualJump = false;
    this.virtualFire = false;

    if (this.isMobile) {
      const joyX = this.joystickOuter!.x;
      const joyY = this.joystickOuter!.y;
      const jumpX = this.jumpBtn!.x;
      const jumpY = this.jumpBtn!.y;
      const fireX = this.fireBtn!.x;
      const fireY = this.fireBtn!.y;

      let joystickTouched = false;
      this.jumpBtn!.setAlpha(0.25);
      this.fireBtn!.setAlpha(0.25);

      const pointers = [
        this.input.pointer1,
        this.input.pointer2,
        this.input.pointer3,
        this.input.mousePointer
      ].filter(p => p && p.isDown);

      pointers.forEach(p => {
        const dJoy = Phaser.Math.Distance.Between(p.x, p.y, joyX, joyY);
        if (dJoy < 85) {
          joystickTouched = true;
          const dx = p.x - joyX;
          const dy = p.y - joyY;
          if (dJoy > 10) {
            if (dx < -12) this.virtualLeft = true;
            if (dx > 12) this.virtualRight = true;
            if (dy < -12) this.virtualUp = true;
            if (dy > 12) this.virtualDown = true;
          }
          const clampD = Math.min(dJoy, 35);
          const angle = Math.atan2(dy, dx);
          this.joystickKnob!.setPosition(joyX + Math.cos(angle) * clampD, joyY + Math.sin(angle) * clampD);
        }

        const dJump = Phaser.Math.Distance.Between(p.x, p.y, jumpX, jumpY);
        if (dJump < 40) {
          this.virtualJump = true;
          this.jumpBtn!.setAlpha(0.5);
        }

        const dFire = Phaser.Math.Distance.Between(p.x, p.y, fireX, fireY);
        if (dFire < 40) {
          this.virtualFire = true;
          this.fireBtn!.setAlpha(0.5);
        }
      });

      if (!joystickTouched) {
        this.joystickKnob!.setPosition(joyX, joyY);
      }
    }

    const keyLeft = frame.actions.left.held || this.virtualLeft;
    const keyRight = frame.actions.right.held || this.virtualRight;
    const keyUp = frame.actions.up.held || this.virtualUp;
    const keyDown = frame.actions.down.held || this.virtualDown;
    const keyFire = frame.actions.fire.held || this.virtualFire;
    const virtualJumpJustPressed = this.virtualJump && !this.virtualJumpPrev;
    this.virtualJumpPrev = this.virtualJump;

    let vx = this.player.body!.velocity.x;
    const isGnd = this.player.body!.blocked.down || this.player.body!.touching.down;
    const aimingDown = keyDown || (frame.gestures.dragVectorY > 0.2);

    if (isGnd) {
      if (aimingDown) {
        vx = 0;
        this.player.stop();
        this.player.setTexture('player-stand');
      } else if (keyLeft) {
        vx = -180;
        this.faceDirection = -1;
        this.player.setFlipX(true);
        this.player.play('run', true);
      } else if (keyRight) {
        vx = 180;
        this.faceDirection = 1;
        this.player.setFlipX(false);
        this.player.play('run', true);
      } else {
        vx = 0;
        this.player.stop();
        this.player.setTexture('player-stand');
      }
    } else {
      if (keyLeft) {
        vx = Phaser.Math.Linear(vx, -180, 0.15);
        this.faceDirection = -1;
        this.player.setFlipX(true);
      } else if (keyRight) {
        vx = Phaser.Math.Linear(vx, 180, 0.15);
        this.faceDirection = 1;
        this.player.setFlipX(false);
      } else {
        vx = vx * 0.92;
        if (Math.abs(vx) < 5) {
          vx = 0;
        }
      }
      this.player.setTexture('player-jump');
    }

    this.player.setVelocityX(vx);

    // Jump
    const justJump = frame.actions.jump.justPressed || frame.gestures.swipeUp || virtualJumpJustPressed;
    if (justJump && isGnd) {
      this.player.setVelocityY(-350);
      this.player.setTexture('player-jump');
      SoundSynth.playTone(350, 0.08, 'sine', 0.03);
      this.jumpsTriggered++;
    }

    if (!isGnd) {
      this.player.setTexture('player-jump');
    }

    // Aim calculations
    let aim = 0; // 0 = straight, -1 = diagonal up, -2 = up, 1 = diagonal down, 2 = down
    const aimingUp = keyUp || (frame.gestures.dragVectorY < -0.2);
    if (aimingUp) {
      aim = (vx !== 0) ? -1 : -2;
    } else if (aimingDown) {
      aim = (!isGnd && vx !== 0) ? 1 : !isGnd ? 2 : 0;
    }

    // Shoot
    if (this.fireCooldown > 0) this.fireCooldown--;

    const isFiring = keyFire;
    if (isFiring && this.fireCooldown === 0) {
      this.fireWeapon(aim);
    }

    // --- WAVES SPAWNING SYSTEM ---
    this.spawns.forEach(s => {
      if (!s.triggered && this.player.x >= s.tx) {
        s.triggered = true;
        this.spawnEnemy(s.type);
      }
    });

    // Update floating Boss UI
    if (this.bossActive) {
      this.updateBoss(time);
    }

    // Update active enemies AI
    this.updateEnemies(time);

    // Custom check player bullets vs boss
    this.updateEnemiesCustom();
  }

  private createScenery() {
    const { height } = this.scale;
    this.starfield = this.add.graphics();

    // Render retro hills graphics (solid black/dark minimalist silhouette)
    const scenery = this.add.graphics();
    scenery.fillStyle(0x000000, 1);
    scenery.beginPath();
    scenery.moveTo(0, height);
    for (let x = 0; x <= this.levelWidth; x += 30) {
      const y = this.groundY - 110 - Math.sin(x * 0.005) * 50 - Math.cos(x * 0.002) * 30;
      scenery.lineTo(x, y);
    }
    scenery.lineTo(this.levelWidth, height);
    scenery.closePath();
    scenery.fill();

    // Render tree clusters (dark grey silhouette)
    scenery.fillStyle(0x050505, 0.4);
    for (let i = 0; i < 20; i++) {
      const tx = 300 + i * 200 + Math.random() * 100;
      scenery.fillCircle(tx, this.groundY - 30, 20 + Math.random() * 10);
      scenery.fillRect(tx - 3, this.groundY - 30, 6, 30);
    }
  }

  private createPlatforms() {
    // 1. Generate Textures first so Static Bodies get the right size
    if (!this.textures.exists('ground-block')) {
      const g = this.add.graphics();
      g.fillStyle(0x2a1a0a, 1);
      g.fillRect(0, 0, this.levelWidth, 80);
      g.fillStyle(0x3a2a1a, 1);
      g.fillRect(0, 0, this.levelWidth, 4); // Greenish brown grass line
      g.generateTexture('ground-block', this.levelWidth, 80);
      g.destroy();
    }

    if (!this.textures.exists('thin-platform')) {
      const g = this.add.graphics();
      g.fillStyle(0x3a2a1a, 1);
      g.fillRect(0, 0, 180, 8);
      g.fillStyle(0x4a3a2a, 1);
      g.fillRect(0, 0, 180, 2);
      g.generateTexture('thin-platform', 180, 8);
      g.destroy();
    }

    // 2. Now create platforms
    // Ground
    this.platforms.create(this.levelWidth / 2, this.groundY + 40, 'ground-block');

    // List of thin platforms
    const points = [
      { x: 300, y: this.groundY - 70 },
      { x: 550, y: this.groundY - 120 },
      { x: 800, y: this.groundY - 60 },
      { x: 1100, y: this.groundY - 130 },
      { x: 1350, y: this.groundY - 70 },
      { x: 1600, y: this.groundY - 110 },
      { x: 1950, y: this.groundY - 60 },
      { x: 2200, y: this.groundY - 120 },
      { x: 2500, y: this.groundY - 65 },
      { x: 2800, y: this.groundY - 130 },
      { x: 3100, y: this.groundY - 70 },
      { x: 3400, y: this.groundY - 120 },
      { x: 3700, y: this.groundY - 60 }
    ];

    points.forEach(p => {
      this.platforms.create(p.x, p.y, 'thin-platform');
    });
  }

  showStart(): void {
    this.lifecycleState = "start";
    this.stateText.setText('CONTRA MISSION').setVisible(true);
    this.hintText.setVisible(true);
    this.overlays.clear();
  }

  startGameplay(): void {
    this.lifecycleState = "playing";
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.overlays.clear();
  }

  pauseGameplay(): void {
    this.lifecycleState = "paused";
    this.physics.pause();
    this.overlays.showPause(
      () => this.resumeGameplay(),
      () => this.returnToHub()
    );
  }

  resumeGameplay(): void {
    this.lifecycleState = "playing";
    this.physics.resume();
    this.overlays.clear();
  }

  resetGameplay(): void {
    this.overlays.clear();
    this.scene.restart();
  }

  returnToHub(): void {
    SoundSynth.playTone(400, 0.1, "sine", 0.05);
    this.scene.start("HubScene");
  }

  private applyCameraLayout() {
    const { height } = this.scale;
    const zoom = Math.min(1, Math.max(0.62, height / 600));
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(0, 0, this.levelWidth, Math.max(height / zoom, 600));
    this.physics.world.setBounds(0, 0, this.levelWidth, Math.max(height / zoom, 600));
  }

  private fireWeapon(aim: number) {
    this.fireCooldown = 10;
    SoundSynth.playShoot();

    const bx = this.player.x + this.faceDirection * 15;
    let by = this.player.y - 2;

    if (aim === -2) by = this.player.y - 25; // Aim straight up coordinates
    if (aim === 2) by = this.player.y + 18; // Aim straight down coordinates

    if (this.weapon === 'rifle') {
      let vx = this.faceDirection * 350;
      let vy = 0;

      if (aim === -1) {
        vx = this.faceDirection * 250;
        vy = -250;
      } else if (aim === -2) {
        vx = 0;
        vy = -350;
      } else if (aim === 1) {
        vx = this.faceDirection * 250;
        vy = 250;
      } else if (aim === 2) {
        vx = 0;
        vy = 350;
      }

      this.spawnBullet(bx, by, vx, vy, 0xffff00);
    } else if (this.weapon === 'spread') {
      // 5 bullet spread fan
      const baseSpeed = 350;
      let angles = [-0.3, -0.15, 0, 0.15, 0.3]; // Spread angles in radians
      
      if (aim === -1) {
        // Diagonal up
        const baseAng = -Math.PI / 4;
        angles.forEach(offset => {
          const ang = baseAng + offset;
          this.spawnBullet(bx, by, Math.cos(ang) * baseSpeed * this.faceDirection, Math.sin(ang) * baseSpeed, 0xff5555);
        });
      } else if (aim === -2) {
        // Straight up
        const baseAng = -Math.PI / 2;
        angles.forEach(offset => {
          const ang = baseAng + offset;
          this.spawnBullet(bx, by, Math.cos(ang) * baseSpeed, Math.sin(ang) * baseSpeed, 0xff5555);
        });
      } else if (aim === 1) {
        // Diagonal down
        const baseAng = Math.PI / 4;
        angles.forEach(offset => {
          const ang = baseAng + offset;
          this.spawnBullet(bx, by, Math.cos(ang) * baseSpeed * this.faceDirection, Math.sin(ang) * baseSpeed, 0xff5555);
        });
      } else if (aim === 2) {
        // Straight down
        const baseAng = Math.PI / 2;
        angles.forEach(offset => {
          const ang = baseAng + offset;
          this.spawnBullet(bx, by, Math.cos(ang) * baseSpeed, Math.sin(ang) * baseSpeed, 0xff5555);
        });
      } else {
        // Horizontal
        angles.forEach(offset => {
          this.spawnBullet(bx, by, Math.cos(offset) * baseSpeed * this.faceDirection, Math.sin(offset) * baseSpeed, 0xff5555);
        });
      }
    }
  }

  private spawnBullet(x: number, y: number, vx: number, vy: number, color: number) {
    const key = `bullet-${color}`;
    if (!this.textures.exists(key)) {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillRect(0, 0, 5, 5);
      g.generateTexture(key, 5, 5);
      g.destroy();
    }

    const b = this.bullets.create(x, y, key) as Phaser.Physics.Arcade.Image;
    b.setVelocity(vx, vy);
    if (b.body) (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    this.shotsFired++;
  }

  private spawnEnemy(type: 'sol' | 'fly' | 'tur' | 'hev') {
    const { width } = this.scale;
    const sx = this.cameras.main.scrollX + width + 50;

    let enemy: Phaser.Physics.Arcade.Sprite;

    if (type === 'sol') {
      enemy = this.enemies.create(sx, this.groundY - 30, 'enemy-sol');
      enemy.setVelocityX(-65);
      enemy.setData('type', 'sol');
      enemy.setData('hp', 1);
      enemy.setData('fireTime', this.time.now + 800 + Math.random() * 800);
    } else if (type === 'fly') {
      enemy = this.enemies.create(sx, this.groundY - 140, 'enemy-fly');
      if (enemy.body) (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      enemy.setData('type', 'fly');
      enemy.setData('hp', 1);
      enemy.setData('baseY', this.groundY - 140);
      enemy.setData('fireTime', this.time.now + 400 + Math.random() * 600);
    } else if (type === 'tur') {
      enemy = this.enemies.create(sx - 150, this.groundY - 20, 'enemy-tur');
      if (enemy.body) (enemy.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      enemy.setData('type', 'tur');
      enemy.setData('hp', 3);
      enemy.setData('fireTime', this.time.now + 500);
    } else {
      // Heavy soldier
      enemy = this.enemies.create(sx, this.groundY - 30, 'enemy-sol');
      enemy.setTint(0xff5555);
      enemy.setVelocityX(-40);
      enemy.setData('type', 'hev');
      enemy.setData('hp', 5);
      enemy.setData('fireTime', this.time.now + 600);
    }
  }

  private updateEnemies(time: number) {
    this.enemies.getChildren().forEach(child => {
      const enemy = child as Phaser.Physics.Arcade.Sprite;
      const type = enemy.getData('type') as string;

      // Clean offscreen
      if (enemy.x < this.cameras.main.scrollX - 100) {
        enemy.destroy();
        return;
      }

      if (type === 'fly') {
        // Sine wave flying motion
        const baseY = enemy.getData('baseY') as number;
        enemy.y = baseY + Math.sin(enemy.x * 0.02) * 30;
        enemy.setVelocityX(-100);
      }

      // Shooting AI
      const fireTime = enemy.getData('fireTime') as number;
      if (time > fireTime) {
        this.enemyFire(enemy);
        enemy.setData('fireTime', time + 1800 + Math.random() * 1000);
      }
    });
  }

  private enemyFire(enemy: Phaser.Physics.Arcade.Sprite) {
    const type = enemy.getData('type') as string;
    const bulletSpeed = 150;
    
    // Target vector calculation
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const angle = Math.atan2(dy, dx);

    const bx = enemy.x;
    const by = enemy.y;

    if (!this.textures.exists('e-bullet-red')) {
      const g = this.add.graphics();
      g.fillStyle(0xff4444, 1);
      g.fillCircle(4, 4, 4);
      g.generateTexture('e-bullet-red', 8, 8);
      g.destroy();
    }

    const b = this.enemyBullets.create(bx, by, 'e-bullet-red') as Phaser.Physics.Arcade.Image;
    if (b.body) (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    if (type === 'tur' || type === 'fly') {
      b.setVelocity(Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed);
    } else {
      // Soldiers shoot straight ahead
      const dir = (dx < 0) ? -1 : 1;
      b.setVelocity(dir * bulletSpeed, 0);
    }
  }

  private triggerBossFight() {
    this.bossActive = true;
    
    // Set scrolling limits
    this.cameras.main.setBounds(4000, 0, 500, this.scale.height);
    this.physics.world.setBounds(4000, 0, 500, this.scale.height);

    // Build Alien Mech Graphics
    const bx = 4350;
    const by = this.groundY - 100;
    
    this.bossBody = this.add.rectangle(bx, by + 30, 60, 100, 0x444444);
    this.bossHead = this.add.rectangle(bx, by - 30, 40, 40, 0x222222);
    
    this.physics.add.existing(this.bossBody);
    (this.bossBody.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.bossBody.body as Phaser.Physics.Arcade.Body).setImmovable(true);

    this.bossHpBar = this.add.graphics();

    // Alert Text overlay
    this.bossWarningText = this.add.text(this.scale.width / 2, 100, '⚠️ WARNING: ALIEN MECH APPROACHING ⚠️', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.tweens.add({
      targets: this.bossWarningText,
      alpha: 0.2,
      yoyo: true,
      repeat: 3,
      duration: 300,
      onComplete: () => {
        this.bossWarningText?.destroy();
      }
    });

    SoundSynth.playLevelUp();
  }

  private updateBoss(time: number) {
    if (!this.bossActive || this.bossDefeated) return;

    // Movement Y range
    if (time > this.bossMoveTime) {
      this.bossDir *= -1;
      this.bossMoveTime = time + 1200;
    }
    
    const vy = this.bossDir * 60;
    (this.bossBody.body as Phaser.Physics.Arcade.Body).setVelocityY(vy);
    this.bossHead.y = this.bossBody.y - 45;

    // Firing cycle
    if (time > this.bossShootTime) {
      this.bossFire();
      
      const phase = this.bossHp > 22 ? 1 : this.bossHp > 10 ? 2 : 3;
      this.bossShootTime = time + (phase === 1 ? 1600 : phase === 2 ? 1100 : 700);
    }

    // Flash frames handling
    if (this.bossFlashFrames > 0) {
      this.bossFlashFrames--;
      if (this.bossFlashFrames === 0) {
        this.bossBody.setFillStyle(0x444444);
        this.bossHead.setFillStyle(0x222222);
      }
    }

    // Redraw health bar
    this.drawBossHpBar();
  }

  private bossFire() {
    SoundSynth.playShoot();
    
    const bx = this.bossBody.x - 30;
    const by = this.bossBody.y;

    const phase = this.bossHp > 22 ? 1 : this.bossHp > 10 ? 2 : 3;
    const numBullets = phase === 1 ? 3 : phase === 2 ? 5 : 7;
    const speed = 160;

    for (let i = 0; i < numBullets; i++) {
      const angle = Math.PI + (i - (numBullets - 1) / 2) * 0.16;
      
      if (!this.textures.exists('e-bullet-red')) {
        const g = this.add.graphics();
        g.fillStyle(0xff4444, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('e-bullet-red', 8, 8);
        g.destroy();
      }

      const b = this.enemyBullets.create(bx, by, 'e-bullet-red') as Phaser.Physics.Arcade.Image;
      if (b.body) (b.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
      b.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    }
  }

  private drawBossHpBar() {
    this.bossHpBar.clear();
    
    const bx = this.bossBody.x - 30;
    const by = this.bossBody.y - 80;

    // Background block
    this.bossHpBar.fillStyle(0x333333, 1);
    this.bossHpBar.fillRect(bx, by, 60, 4);

    // Green fill
    const pct = this.bossHp / this.bossMaxHp;
    const color = pct > 0.5 ? 0x55ff55 : pct > 0.25 ? 0xffaa00 : 0xff4444;
    this.bossHpBar.fillStyle(color, 1);
    this.bossHpBar.fillRect(bx, by, 60 * pct, 4);
  }

  private hitEnemy(bulletObj: any, enemyObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;

    bullet.destroy();

    const hp = enemy.getData('hp') as number;
    const type = enemy.getData('type') as string;

    if (hp > 1) {
      enemy.setData('hp', hp - 1);
      enemy.setTint(0xffffff);
      this.time.delayedCall(50, () => enemy.clearTint());
      this.enemiesDamaged++;
    } else {
      // Explode
      SoundSynth.playHit();
      this.createExplosionParticles(enemy.x, enemy.y, 0xffaa00, 10);
      this.cameras.main.shake(50, 0.005);
      
      const timeNow = Date.now();
      if (timeNow - this.comboTimer < 2000) {
        this.comboCount++;
      } else {
        this.comboCount = 1;
      }
      this.comboTimer = timeNow;

      const basePts = type === 'hev' ? 200 : type === 'tur' ? 150 : 100;
      const pts = basePts * this.comboCount;
      this.score += pts;
      this.scoreText.setText(`SCORE: ${this.score}`);
      this.comboText.setText(`COMBO x${this.comboCount} (+${pts})`);
      this.enemiesDamaged++;

      enemy.destroy();
    }
  }

  private hitCapsule(bulletObj: any, capObj: any) {
    const bullet = bulletObj as Phaser.Physics.Arcade.Image;
    const cap = capObj as Phaser.Physics.Arcade.Image;

    bullet.destroy();
    cap.destroy();

    SoundSynth.playPowerUp();
    this.weapon = 'spread';
    this.weaponText.setText('WPN: SPREAD');

    // Float text Up
    const text = this.add.text(cap.x, cap.y - 10, 'SPREAD S!', {
      fontSize: '11px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy()
    });
  }

  private hitPlayer() {
    if (this.invulnerabilityFrames > 0 || this.isGameOver) return;
    this.killPlayer();
  }

  private collideWithEnemy() {
    if (this.invulnerabilityFrames > 0 || this.isGameOver) return;
    this.killPlayer();
  }

  private killPlayer() {
    SoundSynth.playDeath();
    this.cameras.main.shake(200, 0.02);

    this.createExplosionParticles(this.player.x, this.player.y, 0xff0000, 20);

    this.lives--;
    this.weapon = 'rifle';
    this.weaponText.setText('WPN: RIFLE');

    // Rebuild lives text
    let hearts = '';
    for (let i = 0; i < this.lives; i++) hearts += '♥ ';
    this.livesText.setText(`LIVES: ${hearts}`);

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      // Respawn player
      this.player.setPosition(this.cameras.main.scrollX + 60, this.groundY - 60);
      this.player.setVelocity(0, 0);
      this.invulnerabilityFrames = 100;
    }
  }

  private createExplosionParticles(x: number, y: number, color: number, count: number) {
    const particles = this.add.particles(0, 0, 'ground-block', {
      x,
      y,
      speed: { min: 40, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      lifespan: 500,
      maxParticles: count
    });
    this.time.delayedCall(600, () => particles.destroy());
  }

  private gameOver() {
    this.isGameOver = true;
    this.lifecycleState = "gameOver";
    this.player.setVisible(false);
    if (this.bossHpBar) this.bossHpBar.clear();

    this.overlays.showGameOver(
      this.score,
      () => this.resetGameplay(),
      () => this.returnToHub()
    );
  }

  private checkBossCollision(bullet: Phaser.Physics.Arcade.Image) {
    if (!this.bossActive || this.bossDefeated) return;

    // Check overlap coordinates
    if (bullet.x >= this.bossBody.x - 30 && bullet.x <= this.bossBody.x + 30 &&
        bullet.y >= this.bossBody.y - 70 && bullet.y <= this.bossBody.y + 50) {
      
      bullet.destroy();
      this.bossHp--;

      // Visual hit feedback
      this.bossBody.setFillStyle(0xffffff);
      this.bossHead.setFillStyle(0xffffff);
      this.bossFlashFrames = 3;
      this.cameras.main.shake(30, 0.003);

      if (this.bossHp <= 0) {
        this.victory();
      }
    }
  }

  private victory() {
    this.bossDefeated = true;
    this.bossActive = false;
    this.isVictory = true;
    this.lifecycleState = "levelComplete";

    // Clear hp elements
    this.bossHpBar.clear();
    this.bossBody.destroy();
    this.bossHead.destroy();

    // Spawn massive particles
    this.createExplosionParticles(4350, this.groundY - 100, 0xffaa00, 40);
    this.createExplosionParticles(4350, this.groundY - 50, 0xff5555, 30);
    this.cameras.main.shake(1000, 0.03);

    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 120, () => SoundSynth.playExplosion());
    }

    this.score += 2000;
    this.scoreText.setText(`SCORE: ${this.score}`);

    this.overlays.showVictory(
      '🎉 VICTORY! 🎉',
      `Mission Complete!\nScore: ${this.score}`,
      () => this.resetGameplay(),
      () => this.returnToHub()
    );
  }

  // Extend physics check update loops
  // In update, custom check player bullets vs boss
  updateEnemiesCustom() {
    this.bullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      this.checkBossCollision(b);
    });
  }

  public getGameplayStateForQA(): GameplayQAState {
    const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
    return {
      sceneKey: this.scene.key,
      lifecycle: this.lifecycleState === 'start'
        ? 'start'
        : this.isGameOver
          ? 'gameOver'
          : this.isVictory
            ? 'levelComplete'
            : 'playing',
      orientation: this.scale.height >= this.scale.width ? 'portrait' : 'landscape',
      player: {
        x: this.player?.x ?? 0,
        y: this.player?.y ?? 0,
        vx: body?.velocity.x ?? 0,
        vy: body?.velocity.y ?? 0,
        alive: Boolean(this.player?.visible),
      },
      score: this.score,
      lives: this.lives,
      primaryActionCount: this.shotsFired,
      // The test script expects these specific names:
      shotsFired: this.shotsFired,
      jumpsTriggered: this.jumpsTriggered,
      enemiesDamaged: this.enemiesDamaged,
      enemyOrHazardCount: this.enemies?.countActive?.(true) ?? 0,
      objectiveProgress: Math.min(1, this.player ? this.player.x / this.levelWidth : 0),
      messages: []
    } as any;
  }

  public damageEnemyForQA() {
    if (this.lifecycleState !== 'playing') return false;
    const enemy = this.enemies.create(this.player.x + 120, this.player.y, 'enemy-sol') as Phaser.Physics.Arcade.Sprite;
    enemy.setData('type', 'sol');
    enemy.setData('hp', 1);
    const bullet = this.bullets.create(enemy.x - 6, enemy.y, 'bullet-16776960') as Phaser.Physics.Arcade.Image;
    this.hitEnemy(bullet, enemy);
    return true;
  }

  handleArcadeInput(_frame: ArcadeInputFrame): void {
    // Already handled in update via window runtime
  }

  destroySceneResources(): void {
  }
}
