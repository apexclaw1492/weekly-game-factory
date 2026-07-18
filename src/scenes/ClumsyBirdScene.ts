import Phaser from 'phaser';
import * as THREE from 'three';
import { GameLifecycle, LifecycleState } from '../runtime/GameLifecycle';
import { LifecycleManager } from '../runtime/LifecycleManager';
import { ArcadeInputFrame, GameplayQAState } from '../runtime/ArcadeInputFrame';
import { InputRuntime } from '../runtime/InputRuntime';
import { SoundSynth } from '../utils/SoundSynth';
import { StandardOverlays } from '../utils/StandardOverlays';

export class ClumsyBirdScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = 'ClumsyBirdScene';
  public lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = 'start';

  // UI / Overlays
  private overlays!: StandardOverlays;
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;

  // Three.js core objects
  private threeCanvas!: HTMLCanvasElement;
  private threeRenderer!: THREE.WebGLRenderer;
  private threeScene!: THREE.Scene;
  private threeCamera!: THREE.PerspectiveCamera;

  // Three.js game elements
  private birdGroup!: THREE.Group;
  private leftWingMesh!: THREE.Mesh;
  private rightWingMesh!: THREE.Mesh;
  private groundMesh!: THREE.Mesh;
  private gridHelper!: THREE.GridHelper;
  private dirLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;

  // WebGL Performance instancing
  private treeInstancedMesh!: THREE.InstancedMesh;
  private cloudInstancedMesh!: THREE.InstancedMesh;
  private pipeInstancedMesh!: THREE.InstancedMesh;
  private pipeGeometry!: THREE.BoxGeometry;
  private pipeMaterial!: THREE.MeshPhongMaterial;

  // Gameplay state
  private score = 0;
  private highScore = 0;
  private primaryActionCount = 0;

  // 3D Physics variables
  private birdY = 0;
  private birdVY = 0;
  private birdZ = 0;
  private readonly birdRadius = 0.35;
  private readonly gravity = -20.0;
  private readonly jumpForce = 7.0;
  private readonly speed = 5.2;
  private isDead = false;

  // Obstacles / Pipes list
  private pipes: Array<{
    z: number;
    gapY: number;
    passed: boolean;
  }> = [];

  // Disposal trackers
  private geometriesToDispose: THREE.BufferGeometry[] = [];
  private materialsToDispose: THREE.Material[] = [];

  // Background positions
  private treePositions: Array<{ x: number; y: number; z: number; scale: number }> = [];
  private cloudPositions: Array<{ x: number; y: number; z: number; scale: number }> = [];

  // Animation helpers
  private isFlapping = false;
  private flapTime = 0;
  private lastFlapTime = 0;

  constructor() {
    super('ClumsyBirdScene');
  }

  init() {
    this.score = 0;
    this.isDead = false;
    this.birdY = 0;
    this.birdVY = 0;
    this.birdZ = 0;
    this.lifecycleState = 'start';
    this.isFlapping = false;
  }

  create() {
    const { width, height } = this.scale;

    // 1. Setup Three.js Canvas and Renderer
    this.threeCanvas = document.createElement('canvas');
    this.threeCanvas.id = 'three-canvas-clumsy';
    this.threeCanvas.style.position = 'absolute';
    this.threeCanvas.style.top = '0';
    this.threeCanvas.style.left = '0';
    this.threeCanvas.style.width = '100%';
    this.threeCanvas.style.height = '100%';
    this.threeCanvas.style.pointerEvents = 'none';
    this.threeCanvas.style.zIndex = '0';

    const container = this.game.canvas.parentElement;
    if (container) {
      container.insertBefore(this.threeCanvas, this.game.canvas);
    }

    // Ensure Phaser canvas is positioned absolutely on top of Three.js canvas
    this.game.canvas.style.position = 'absolute';
    this.game.canvas.style.zIndex = '1';
    this.game.canvas.style.pointerEvents = 'auto';

    // Initialize WebGL Renderer
    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      antialias: true,
      alpha: false
    });
    this.threeRenderer.setSize(width, height);
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.threeRenderer.shadowMap.enabled = true;
    this.threeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x000000);

    // Setup Camera
    this.threeCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    this.threeCamera.position.set(7.5, 1.0, 5.0);

    // Setup Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.threeScene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0x00c805, 1.45);
    this.dirLight.position.set(10, 15, 8);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.threeScene.add(this.dirLight);

    // 2. Build 3D Geometries & Materials
    // Ground
    const groundGeo = new THREE.BoxGeometry(40, 1, 300);
    this.geometriesToDispose.push(groundGeo);
    const groundMat = new THREE.MeshPhongMaterial({
      color: 0x050505,
      flatShading: true
    });
    this.materialsToDispose.push(groundMat);
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.position.set(0, -4.0, 0);
    this.groundMesh.receiveShadow = true;
    this.threeScene.add(this.groundMesh);

    // Grid Highlight on ground
    this.gridHelper = new THREE.GridHelper(200, 100, 0x00c805, 0x00c805);
    this.gridHelper.position.set(0, -3.48, 0);
    this.threeScene.add(this.gridHelper);

    // Bird Group
    this.birdGroup = new THREE.Group();
    const birdBodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
    this.geometriesToDispose.push(birdBodyGeo);
    const birdMat = new THREE.MeshPhongMaterial({
      color: 0x00c805,
      emissive: 0x003300,
      flatShading: true
    });
    this.materialsToDispose.push(birdMat);

    const bodyMesh = new THREE.Mesh(birdBodyGeo, birdMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    this.birdGroup.add(bodyMesh);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.12, 0.35, 4);
    beakGeo.rotateX(Math.PI / 2);
    beakGeo.translate(0, 0, -0.45);
    this.geometriesToDispose.push(beakGeo);
    const beakMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      flatShading: true
    });
    this.materialsToDispose.push(beakMat);
    const beakMesh = new THREE.Mesh(beakGeo, beakMat);
    this.birdGroup.add(beakMesh);

    // Wings
    const wingGeo = new THREE.BoxGeometry(0.4, 0.08, 0.3);
    this.geometriesToDispose.push(wingGeo);

    this.leftWingMesh = new THREE.Mesh(wingGeo, birdMat);
    this.leftWingMesh.position.set(-0.38, 0.05, 0);
    this.birdGroup.add(this.leftWingMesh);

    this.rightWingMesh = new THREE.Mesh(wingGeo, birdMat);
    this.rightWingMesh.position.set(0.38, 0.05, 0);
    this.birdGroup.add(this.rightWingMesh);

    this.threeScene.add(this.birdGroup);

    // 3. Environment Instanced Meshes
    // Trees
    const treeCount = 60;
    this.treePositions = [];
    for (let i = 0; i < treeCount; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = side * (4.2 + Math.random() * 2.5);
      const y = -3.5;
      const z = -Math.random() * 160;
      const scale = 0.6 + Math.random() * 0.9;
      this.treePositions.push({ x, y, z, scale });
    }

    const treeGeo = new THREE.ConeGeometry(0.65, 2.2, 5);
    treeGeo.translate(0, 1.1, 0);
    this.geometriesToDispose.push(treeGeo);
    const treeMat = new THREE.MeshPhongMaterial({
      color: 0x00c805,
      emissive: 0x001f00,
      flatShading: true
    });
    this.materialsToDispose.push(treeMat);

    this.treeInstancedMesh = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    this.treeInstancedMesh.castShadow = true;
    this.treeInstancedMesh.receiveShadow = true;
    this.threeScene.add(this.treeInstancedMesh);

    // Clouds
    const cloudCount = 20;
    this.cloudPositions = [];
    for (let i = 0; i < cloudCount; i++) {
      const x = (Math.random() - 0.5) * 14.0;
      const y = 3.2 + Math.random() * 2.0;
      const z = -Math.random() * 160;
      const scale = 0.5 + Math.random() * 1.1;
      this.cloudPositions.push({ x, y, z, scale });
    }

    const cloudGeo = new THREE.BoxGeometry(2.2, 0.45, 1.3);
    this.geometriesToDispose.push(cloudGeo);
    const cloudMat = new THREE.MeshPhongMaterial({
      color: 0x00c805,
      emissive: 0x002f00,
      flatShading: true,
      transparent: true,
      opacity: 0.4
    });
    this.materialsToDispose.push(cloudMat);

    this.cloudInstancedMesh = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
    this.threeScene.add(this.cloudInstancedMesh);

    // Initial positioning for instances
    this.updateInstancedMeshes();

    // 4. Setup Obstacles (Pipes)
    const pipeWidth = 1.5;
    const pipeHeight = 10;
    this.pipeGeometry = new THREE.BoxGeometry(pipeWidth, pipeHeight, pipeWidth);
    this.geometriesToDispose.push(this.pipeGeometry);

    this.pipeMaterial = new THREE.MeshPhongMaterial({
      color: 0x00c805,
      emissive: 0x002400,
      flatShading: true
    });
    this.materialsToDispose.push(this.pipeMaterial);

    this.initPipes();

    // 5. Setup UI and Hud
    this.scoreText = this.add.text(width / 2, 40, 'SCORE: 0', {
      fontSize: '28px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    this.highScoreText = this.add.text(width / 2, 80, 'BEST: 0', {
      fontSize: '18px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    this.stateText = this.add.text(width / 2, height / 2 - 40, 'CLUMSY BIRD 3D', {
      fontSize: '36px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);
    this.stateText.setShadow(0, 0, '#00c805', 8, true, true);

    this.hintText = this.add.text(width / 2, height / 2 + 40, 'TAP OR HOLD SCREEN TO FLAP\nDODGE NEON-GREEN PILES', {
      fontSize: '16px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1000);

    this.backBtn = this.add.text(20, 16, '<- BACK TO HUB', {
      fontSize: '16px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(1000).setInteractive({ useHandCursor: true });
    this.backBtn.on('pointerdown', () => this.returnToHub());

    // 6. Setup Overlays & Lifecycle
    this.overlays = new StandardOverlays(this);
    const runtime = (window as any).__WGF_INPUT_RUNTIME as InputRuntime;
    this.lifecycleManager = new LifecycleManager(this, runtime);

    this.showStart();

    // Scale / resize management
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupThree();
    });
  }

  private initPipes() {
    // Clear old pipes
    this.pipes = [];

    // Reset pipeInstancedMesh if it already exists
    if (this.pipeInstancedMesh) {
      this.threeScene.remove(this.pipeInstancedMesh);
      this.pipeInstancedMesh.dispose();
    }

    // Double check initialization of cached geometry & material
    if (!this.pipeGeometry) {
      const pipeWidth = 1.5;
      const pipeHeight = 10;
      this.pipeGeometry = new THREE.BoxGeometry(pipeWidth, pipeHeight, pipeWidth);
      this.geometriesToDispose.push(this.pipeGeometry);
    }
    if (!this.pipeMaterial) {
      this.pipeMaterial = new THREE.MeshPhongMaterial({
        color: 0x00c805,
        emissive: 0x002400,
        flatShading: true
      });
      this.materialsToDispose.push(this.pipeMaterial);
    }

    this.pipeInstancedMesh = new THREE.InstancedMesh(this.pipeGeometry, this.pipeMaterial, 10);
    this.pipeInstancedMesh.castShadow = true;
    this.pipeInstancedMesh.receiveShadow = true;
    this.threeScene.add(this.pipeInstancedMesh);

    // Spawn 5 pipes
    for (let i = 0; i < 5; i++) {
      const z = -14.0 - i * 14.0;
      const gapY = (Math.random() - 0.5) * 3.0;

      this.pipes.push({
        z,
        gapY,
        passed: false
      });
    }

    this.updatePipePositions();
  }

  private updatePipePositions() {
    const pipeHeight = 10;
    const pipeGapSize = 3.2;
    const dummy = new THREE.Object3D();

    for (let i = 0; i < this.pipes.length; i++) {
      const pipe = this.pipes[i];
      const topY = pipe.gapY + pipeGapSize / 2 + pipeHeight / 2;
      const bottomY = pipe.gapY - pipeGapSize / 2 - pipeHeight / 2;

      // Top pipe instance
      dummy.position.set(0, topY, pipe.z);
      dummy.updateMatrix();
      this.pipeInstancedMesh.setMatrixAt(2 * i, dummy.matrix);

      // Bottom pipe instance
      dummy.position.set(0, bottomY, pipe.z);
      dummy.updateMatrix();
      this.pipeInstancedMesh.setMatrixAt(2 * i + 1, dummy.matrix);
    }
    this.pipeInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  private updateInstancedMeshes() {
    const dummy = new THREE.Object3D();

    // Update Trees
    for (let i = 0; i < this.treePositions.length; i++) {
      const pos = this.treePositions[i];
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.scale.set(pos.scale, pos.scale, pos.scale);
      dummy.updateMatrix();
      this.treeInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.treeInstancedMesh.instanceMatrix.needsUpdate = true;

    // Update Clouds
    for (let i = 0; i < this.cloudPositions.length; i++) {
      const pos = this.cloudPositions[i];
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.scale.set(pos.scale, pos.scale, pos.scale);
      dummy.updateMatrix();
      this.cloudInstancedMesh.setMatrixAt(i, dummy.matrix);
    }
    this.cloudInstancedMesh.instanceMatrix.needsUpdate = true;
  }

  update(time: number, delta: number) {
    if (!this.lifecycleManager) return;

    const state = this.lifecycleManager.update(time);
    if (state !== 'playing' || this.isDead) {
      // Keep rendering static Three.js scene even when paused/waiting
      this.renderThree();
      return;
    }

    const dt = Math.min(delta / 1000, 0.1);

    // 1. Apply Physics
    this.birdVY += this.gravity * dt;
    this.birdY += this.birdVY * dt;
    this.birdZ -= this.speed * dt;

    // Synchronize 3D model
    this.birdGroup.position.set(0, this.birdY, this.birdZ);

    // Wing flapping animation
    const wingSpeed = this.isFlapping ? 32 : 6;
    const wingAngle = Math.sin(time * 0.02 * wingSpeed) * 0.42;
    this.leftWingMesh.rotation.z = -wingAngle;
    this.rightWingMesh.rotation.z = wingAngle;

    // End flap state check
    if (this.isFlapping && performance.now() - this.flapTime > 150) {
      this.isFlapping = false;
    }

    // Scroll light & grid helper along with the bird
    this.dirLight.position.set(10, 15, this.birdZ + 8);
    this.gridHelper.position.z = this.birdZ;

    // 2. Camera follow logic (side isometric scroll)
    this.threeCamera.position.set(7.5, this.birdY * 0.45 + 0.8, this.birdZ + 5.0);
    this.threeCamera.lookAt(0, this.birdY * 0.7, this.birdZ - 3.2);

    // 3. Collision Checking
    const groundLimitY = -3.5;
    const skyLimitY = 5.0;

    if (this.birdY - this.birdRadius <= groundLimitY) {
      this.die();
      return;
    }
    if (this.birdY + this.birdRadius >= skyLimitY) {
      this.die();
      return;
    }

    const pipeHalfW = 0.75;
    for (const pipe of this.pipes) {
      // Horizontal bounds check
      if (this.birdZ - this.birdRadius <= pipe.z + pipeHalfW && this.birdZ + this.birdRadius >= pipe.z - pipeHalfW) {
        const topLowerY = pipe.gapY + 1.6;
        const bottomUpperY = pipe.gapY - 1.6;

        if (this.birdY + this.birdRadius >= topLowerY || this.birdY - this.birdRadius <= bottomUpperY) {
          this.die();
          return;
        }
      }

      // Score check
      if (!pipe.passed && this.birdZ < pipe.z) {
        pipe.passed = true;
        this.score++;
        this.scoreText.setText(`SCORE: ${this.score}`);
        SoundSynth.playCollect();

        if (this.score > this.highScore) {
          this.highScore = this.score;
          this.highScoreText.setText(`BEST: ${this.highScore}`);
        }
      }
    }

    // 4. Recycling Objects
    this.recyclePipes();
    this.recycleEnvironment();

    // 5. Render WebGL scene
    this.renderThree();
  }

  private recyclePipes() {
    let pipesChanged = false;
    for (const pipe of this.pipes) {
      if (pipe.z > this.birdZ + 8) {
        let minZ = this.birdZ;
        for (const p of this.pipes) {
          if (p.z < minZ) {
            minZ = p.z;
          }
        }
        pipe.z = minZ - 14.0;
        pipe.gapY = (Math.random() - 0.5) * 3.0;
        pipe.passed = false;
        pipesChanged = true;
      }
    }
    if (pipesChanged) {
      this.updatePipePositions();
    }
  }

  private recycleEnvironment() {
    let envChanged = false;

    // Recycle Trees
    for (let i = 0; i < this.treePositions.length; i++) {
      const pos = this.treePositions[i];
      if (pos.z > this.birdZ + 10) {
        let minZ = this.birdZ;
        for (let j = 0; j < this.treePositions.length; j++) {
          if (this.treePositions[j].z < minZ) minZ = this.treePositions[j].z;
        }
        pos.z = minZ - (4.0 + Math.random() * 8.0);
        envChanged = true;
      }
    }

    // Recycle Clouds
    for (let i = 0; i < this.cloudPositions.length; i++) {
      const pos = this.cloudPositions[i];
      if (pos.z > this.birdZ + 10) {
        let minZ = this.birdZ;
        for (let j = 0; j < this.cloudPositions.length; j++) {
          if (this.cloudPositions[j].z < minZ) minZ = this.cloudPositions[j].z;
        }
        pos.z = minZ - (6.0 + Math.random() * 10.0);
        envChanged = true;
      }
    }

    if (envChanged) {
      this.updateInstancedMeshes();
    }
  }

  private renderThree() {
    if (this.threeRenderer && this.threeScene && this.threeCamera) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  private handleResize() {
    const { width, height } = this.scale;
    if (this.threeRenderer) {
      this.threeRenderer.setSize(width, height);
    }
    if (this.threeCamera) {
      this.threeCamera.aspect = width / height;
      this.threeCamera.updateProjectionMatrix();
    }

    this.scoreText.setPosition(width / 2, 40);
    this.highScoreText.setPosition(width / 2, 80);
    this.stateText.setPosition(width / 2, height / 2 - 40);
    this.hintText.setPosition(width / 2, height / 2 + 40);
  }

  private flap() {
    this.birdVY = this.jumpForce;
    this.isFlapping = true;
    this.flapTime = performance.now();
    this.lastFlapTime = performance.now();
    this.primaryActionCount++;
    SoundSynth.playShoot(); // Retro flap wing pitch
  }

  private die() {
    if (this.isDead) return;
    this.isDead = true;
    this.lifecycleState = 'gameOver';
    SoundSynth.playHit();
    SoundSynth.playDeath();

    this.overlays.showGameOver(
      this.score,
      () => this.resetGameplay(),
      () => this.returnToHub()
    );
  }

  // --- GameLifecycle interface contract ---
  public showStart(): void {
    this.lifecycleState = 'start';
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.scoreText.setVisible(false);
    this.highScoreText.setVisible(false);
    
    this.overlays.showInstructions(
      'Clumsy Bird',
      '• Flap: Press Spacebar, Up Arrow, W, or tap screen.\n• Goal: Guide the clumsy bird safely through the gaps in the green pipes!',
      () => {
        this.startGameplay();
      }
    );

    // Reset positions for preview in menu state
    this.birdY = 0;
    this.birdVY = 0;
    this.birdZ = 0;
    this.birdGroup.position.set(0, 0, 0);
    this.threeCamera.position.set(7.5, 1.0, 5.0);
    this.threeCamera.lookAt(0, 0, -3.2);

    this.initPipes();
    this.renderThree();
  }

  public startGameplay(): void {
    this.lifecycleState = 'playing';
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.scoreText.setVisible(true).setText('SCORE: 0');
    this.highScoreText.setVisible(true);
    this.score = 0;
    this.isDead = false;

    this.birdY = 0;
    this.birdVY = 0;
    this.birdZ = 0;
    this.birdGroup.position.set(0, 0, 0);

    this.initPipes();
    this.overlays.clear();
  }

  public pauseGameplay(): void {
    this.lifecycleState = 'paused';
    this.overlays.showPause(
      () => this.resumeGameplay(),
      () => this.returnToHub()
    );
  }

  public resumeGameplay(): void {
    this.lifecycleState = 'playing';
    this.overlays.clear();
  }

  public resetGameplay(): void {
    this.overlays.clear();
    this.init();
    this.showStart();
  }

  public returnToHub(): void {
    SoundSynth.playTone(360, 0.12, 'sine', 0.05);
    this.scene.start('HubScene');
  }

  public handleArcadeInput(frame: ArcadeInputFrame): void {
    if (this.isDead) return;

    const jumpAction = frame.actions.jump.justPressed || frame.actions.fire.justPressed;
    const touchTap = frame.touch.justStarted;

    let shouldFlap = jumpAction || touchTap;

    // Periodically flap when holding the pointer down
    if (frame.touch.active && frame.touch.heldMs > 0) {
      const now = performance.now();
      if (now - this.lastFlapTime > 240) {
        shouldFlap = true;
      }
    }

    if (shouldFlap) {
      this.flap();
    }
  }

  public getGameplayStateForQA(): GameplayQAState {
    return {
      sceneKey: this.sceneKey,
      lifecycle: this.lifecycleState as GameplayQAState['lifecycle'],
      orientation: (this.scale.height >= this.scale.width ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
      player: {
        x: 0,
        y: this.birdY,
        vx: 0,
        vy: this.birdVY,
        alive: !this.isDead
      },
      score: this.score,
      primaryActionCount: this.primaryActionCount,
      messages: []
    };
  }

  public destroySceneResources(): void {
    this.cleanupThree();
  }

  private cleanupThree(): void {
    this.scale.off('resize', this.handleResize, this);

    if (this.threeCanvas && this.threeCanvas.parentElement) {
      this.threeCanvas.parentElement.removeChild(this.threeCanvas);
    }

    for (const geo of this.geometriesToDispose) {
      geo.dispose();
    }
    this.geometriesToDispose = [];

    for (const mat of this.materialsToDispose) {
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else {
        mat.dispose();
      }
    }
    this.materialsToDispose = [];

    if (this.treeInstancedMesh) {
      this.threeScene.remove(this.treeInstancedMesh);
      this.treeInstancedMesh.dispose();
    }
    if (this.cloudInstancedMesh) {
      this.threeScene.remove(this.cloudInstancedMesh);
      this.cloudInstancedMesh.dispose();
    }
    if (this.pipeInstancedMesh) {
      this.threeScene.remove(this.pipeInstancedMesh);
      this.pipeInstancedMesh.dispose();
    }
    if (this.gridHelper) {
      this.threeScene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      if (Array.isArray(this.gridHelper.material)) {
        this.gridHelper.material.forEach((m) => m.dispose());
      } else {
        this.gridHelper.material.dispose();
      }
    }

    if (this.threeScene) {
      while (this.threeScene.children.length > 0) {
        this.threeScene.remove(this.threeScene.children[0]);
      }
    }

    if (this.threeRenderer) {
      this.threeRenderer.dispose();
    }
  }
}
