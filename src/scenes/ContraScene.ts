import Phaser from 'phaser';
import { TouchControls } from '../objects/TouchControls';
import { SoundSynth } from '../utils/SoundSynth';

interface EnemySpawn {
  tx: number;
  type: 'sol' | 'fly' | 'tur' | 'hev';
  offX: number;
  triggered: boolean;
}

export class ContraScene extends Phaser.Scene {
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

  // Controllers
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private jumpKey!: Phaser.Input.Keyboard.Key;
  private touchControls?: TouchControls;

  // Game state
  private lives = 3;
  private score = 0;
  private weapon = 'rifle';
  private fireCooldown = 0;
  private invulnerabilityFrames = 0;
  private isGameOver = false;
  private isVictory = false;
  private isWaitingToStart = true;
  private faceDirection = 1; // 1 = right, -1 = left

  // UI Elements
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private bossWarningText?: Phaser.GameObjects.Text;

  // Starfield/Scenery
  private starfield!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; alpha: number }> = [];

  // Spawns
  private spawns: EnemySpawn[] = [];

  private readonly levelWidth = 4500;
  private readonly groundY = 530;

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
    this.isWaitingToStart = true;
    this.faceDirection = 1;
    this.bossActive = false;
    this.bossDefeated = false;
    this.bossHp = 35;

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

    // 6. Controllers
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.fireKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    }

    if (this.sys.game.device.input.touch) {
      this.touchControls = new TouchControls(this, 'dpad-ab');
    }

    // 7. Dynamic Static capsule items
    const capsulePoints = [900, 1900, 2900, 3700];
    capsulePoints.forEach(x => {
      const cap = this.capsules.create(x, this.groundY - 140, 'capsule') as Phaser.Physics.Arcade.Image;
      if (!this.textures.exists('capsule')) {
        const g = this.add.graphics();
        g.fillStyle(0xff2222, 1);
        g.fillRect(0, 0, 16, 16);
        g.fillStyle(0xffffff, 1);
        g.fillRect(4, 4, 8, 8);
        g.generateTexture('capsule', 16, 16);
        g.destroy();
      }
      cap.setTexture('capsule');
      cap.setCollideWorldBounds(true);
      if (cap.body) (cap.body as Phaser.Physics.Arcade.Body).setGravityY(100);
      cap.setData('type', 'spread');
    });

    // 8. HUD Text overlays
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', { fontSize: '16px', fontFamily: 'monospace', color: '#ffffff' }).setScrollFactor(0);
    this.livesText = this.add.text(width / 2, 20, 'LIVES: ♥ ♥ ♥', { fontSize: '16px', fontFamily: 'monospace', color: '#ff3333' }).setOrigin(0.5, 0).setScrollFactor(0);
    this.weaponText = this.add.text(20, 45, 'WPN: RIFLE', { fontSize: '11px', fontFamily: 'monospace', color: '#ffaa00' }).setScrollFactor(0);

    // Overlay Game States
    this.stateText = this.add.text(width / 2, height / 2 - 40, 'CONTRA MISSION', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ff2222',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.stateText.setShadow(0, 0, '#ff2222', 8, true, true);

    this.hintText = this.add.text(width / 2, height / 2 + 25, 'D-PAD OR ARROWS to Move\n[A] or [X] to Jump | [B] or [SPACE] to Fire\n\nTAP TO START', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    // Back button floating UI
    const backBtn = this.add.text(width - 20, height - 35, '← BACK TO HUB', {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(1, 0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => {
      SoundSynth.playTone(400, 0.1, 'sine', 0.05);
      this.scene.start('HubScene');
    });

    this.input.on('pointerdown', () => {
      if (this.isWaitingToStart) this.startGame();
      else if (this.isGameOver || this.isVictory) this.scene.restart();
    });
  }

  update(time: number) {
    const { width } = this.scale;

    // Background Stars movement
    this.starfield.clear();
    const scrollOffset = this.cameras.main.scrollX * 0.05;
    this.stars.forEach(star => {
      const sx = (star.x - scrollOffset) % width;
      this.starfield.fillStyle(0xffffff, star.alpha);
      this.starfield.fillRect(sx < 0 ? sx + width : sx, star.y, 1.5, 1.5);
    });

    if (this.isWaitingToStart || this.isGameOver || this.isVictory) {
      this.player.setVelocityX(0);
      return;
    }

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
    this.bullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      if (b.x < this.cameras.main.scrollX || b.x > this.cameras.main.scrollX + width) {
        b.destroy();
      }
    });

    this.enemyBullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      if (b.x < this.cameras.main.scrollX - 40 || b.x > this.cameras.main.scrollX + width + 40) {
        b.destroy();
      }
    });

    // --- PLAYER CONTROLS ---
    let vx = 0;
    const isGnd = this.player.body!.blocked.down || this.player.body!.touching.down;

    // Left/Right
    if (this.cursors.left.isDown || this.touchControls?.leftPressed) {
      vx = -180;
      this.faceDirection = -1;
      this.player.setFlipX(true);
      if (isGnd) this.player.play('run', true);
    } else if (this.cursors.right.isDown || this.touchControls?.rightPressed) {
      vx = 180;
      this.faceDirection = 1;
      this.player.setFlipX(false);
      if (isGnd) this.player.play('run', true);
    } else {
      this.player.stop();
      if (isGnd) this.player.setTexture('player-stand');
    }

    this.player.setVelocityX(vx);

    // Jump
    const justJump = Phaser.Input.Keyboard.JustDown(this.jumpKey) || this.touchControls?.aPressed;
    if (justJump && isGnd) {
      this.player.setVelocityY(-350);
      this.player.setTexture('player-jump');
      SoundSynth.playTone(350, 0.08, 'sine', 0.03);
    }

    if (!isGnd) {
      this.player.setTexture('player-jump');
    }

    // Aim calculations
    let aim = 0; // 0 = straight, -1 = diagonal up, -2 = straight up
    if (this.cursors.up.isDown || this.touchControls?.upPressed) {
      aim = (vx !== 0) ? -1 : -2;
    }

    // Shoot
    if (this.fireCooldown > 0) this.fireCooldown--;

    const isFiring = this.fireKey.isDown || this.touchControls?.bPressed || (this.touchControls?.autoToggled && time % 12 < 4);
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
  }

  private createScenery() {
    const { width, height } = this.scale;
    this.starfield = this.add.graphics();

    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * (height - 200),
        speed: 0.1 + Math.random() * 0.3,
        alpha: 0.3 + Math.random() * 0.5
      });
    }

    // Render retro hills graphics
    const scenery = this.add.graphics();
    scenery.fillStyle(0x0a0a20, 1);
    scenery.beginPath();
    scenery.moveTo(0, height);
    for (let x = 0; x <= this.levelWidth; x += 30) {
      const y = this.groundY - 110 - Math.sin(x * 0.005) * 50 - Math.cos(x * 0.002) * 30;
      scenery.lineTo(x, y);
    }
    scenery.lineTo(this.levelWidth, height);
    scenery.closePath();
    scenery.fill();

    // Render tree clusters
    scenery.fillStyle(0x061406, 0.4);
    for (let i = 0; i < 20; i++) {
      const tx = 300 + i * 200 + Math.random() * 100;
      scenery.fillCircle(tx, this.groundY - 30, 20 + Math.random() * 10);
      scenery.fillRect(tx - 3, this.groundY - 30, 6, 30);
    }
  }

  private createPlatforms() {
    // Ground
    this.platforms.create(this.levelWidth / 2, this.groundY + 40, 'ground-block');
    // Generate Ground Texture dynamically
    if (!this.textures.exists('ground-block')) {
      const g = this.add.graphics();
      g.fillStyle(0x2a1a0a, 1);
      g.fillRect(0, 0, this.levelWidth, 80);
      g.fillStyle(0x3a2a1a, 1);
      g.fillRect(0, 0, this.levelWidth, 4); // Greenish brown grass line
      g.generateTexture('ground-block', this.levelWidth, 80);
      g.destroy();
    }

    // Thin floating structures
    if (!this.textures.exists('thin-platform')) {
      const g = this.add.graphics();
      g.fillStyle(0x3a2a1a, 1);
      g.fillRect(0, 0, 180, 8);
      g.fillStyle(0x4a3a2a, 1);
      g.fillRect(0, 0, 180, 2);
      g.generateTexture('thin-platform', 180, 8);
      g.destroy();
    }

    // List of platforms
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

  private startGame() {
    this.isWaitingToStart = false;
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
  }

  private fireWeapon(aim: number) {
    this.fireCooldown = 10;
    SoundSynth.playShoot();

    const bx = this.player.x + this.faceDirection * 15;
    let by = this.player.y - 2;

    if (aim === -2) by = this.player.y - 25; // Aim straight up coordinates

    if (this.weapon === 'rifle') {
      let vx = this.faceDirection * 350;
      let vy = 0;

      if (aim === -1) {
        vx = this.faceDirection * 250;
        vy = -250;
      } else if (aim === -2) {
        vx = 0;
        vy = -350;
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
      fontFamily: 'monospace',
      color: '#ff2222',
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
    } else {
      // Explode
      SoundSynth.playHit();
      this.createExplosionParticles(enemy.x, enemy.y, 0xffaa00, 10);
      
      const pts = type === 'hev' ? 200 : type === 'tur' ? 150 : 100;
      this.score += pts;
      this.scoreText.setText(`SCORE: ${this.score}`);

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
      fontFamily: 'monospace',
      color: '#ff5555',
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
    this.player.setVisible(false);
    this.stateText.setText('MISSION FAILED').setColor('#ff3333').setVisible(true);
    this.hintText.setText('TAP TO RETRY').setVisible(true);

    if (this.bossHpBar) this.bossHpBar.clear();
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

      if (this.bossHp <= 0) {
        this.victory();
      }
    }
  }

  private victory() {
    this.bossDefeated = true;
    this.bossActive = false;
    this.isVictory = true;

    // Clear hp elements
    this.bossHpBar.clear();
    this.bossBody.destroy();
    this.bossHead.destroy();

    // Spawn massive particles
    this.createExplosionParticles(4350, this.groundY - 100, 0xffaa00, 40);
    this.createExplosionParticles(4350, this.groundY - 50, 0xff5555, 30);

    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 120, () => SoundSynth.playExplosion());
    }

    this.score += 2000;
    this.scoreText.setText(`SCORE: ${this.score}`);

    this.stateText.setText('🎉 VICTORY! 🎉').setColor('#55ff55').setVisible(true);
    this.hintText.setText('Mission Complete!\n\nTAP TO REPLAY').setVisible(true);
  }

  // Extend physics check update loops
  // In update, custom check player bullets vs boss
  updateEnemiesCustom() {
    this.bullets.getChildren().forEach(bullet => {
      const b = bullet as Phaser.Physics.Arcade.Image;
      this.checkBossCollision(b);
    });
  }
}

// Inline override hack to bind custom updates
const contraSceneUpdate = ContraScene.prototype.update;
ContraScene.prototype.update = function(time: number) {
  contraSceneUpdate.call(this, time);
  this.updateEnemiesCustom();
};
