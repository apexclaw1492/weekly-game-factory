import Phaser from 'phaser';
import * as THREE from 'three';
import { GameLifecycle, LifecycleState } from '../runtime/GameLifecycle';
import { LifecycleManager } from '../runtime/LifecycleManager';
import { ArcadeInputFrame, GameplayQAState } from '../runtime/ArcadeInputFrame';
import { SoundSynth } from '../utils/SoundSynth';
import { StandardOverlays } from '../utils/StandardOverlays';
import { readStoredNumber, writeStoredNumber } from '../utils/SafeStorage';

// --- Game Configurations ---
const CELL_WIDTH = 1.0;
const MAZE_GRID = [
  "###############",
  "#p...........p#",
  "#.###.#.#.###.#",
  "#.#...#.#...#.#",
  "#.###.#.#.###.#",
  "#.............#",
  "#.###.###.###.#",
  "#.#....S....#.#",
  "#.###.###.###.#",
  "#.............#",
  "#.###.#.#.###.#",
  "#.#...#.#...#.#",
  "#.###.#.#.###.#",
  "#p...........p#",
  "###############"
];

interface PacmanEntity {
  gridX: number;
  gridZ: number;
  targetX: number;
  targetZ: number;
  progress: number;
  dirX: number;
  dirZ: number;
  speed: number;
  mesh: THREE.Mesh;
}

interface GhostEntity {
  name: string;
  color: number;
  spawnGridX: number;
  spawnGridZ: number;
  gridX: number;
  gridZ: number;
  targetX: number;
  targetZ: number;
  progress: number;
  dirX: number;
  dirZ: number;
  speed: number;
  mesh: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
}

interface DotInstance {
  gridX: number;
  gridZ: number;
  instanceId: number;
  eaten: boolean;
}

interface PelletInstance {
  gridX: number;
  gridZ: number;
  instanceId: number;
  eaten: boolean;
}

export class PacManScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = 'PacManScene';
  public lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = 'start';

  // --- Phaser UI GameObjects ---
  private titleText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private overlays!: StandardOverlays;

  // --- Three.js Objects ---
  private threeCanvas!: HTMLCanvasElement;
  private threeRenderer!: THREE.WebGLRenderer;
  private threeScene!: THREE.Scene;
  private threeCamera!: THREE.PerspectiveCamera;

  // --- InstancedMeshes ---
  private wallInstancedMesh!: THREE.InstancedMesh;
  private dotInstancedMesh!: THREE.InstancedMesh;
  private pelletInstancedMesh!: THREE.InstancedMesh;

  // --- Reusable Geometries ---
  private wallGeo!: THREE.BoxGeometry;
  private dotGeo!: THREE.SphereGeometry;
  private pelletGeo!: THREE.SphereGeometry;
  private pacmanGeo!: THREE.SphereGeometry;
  private ghostBodyGeo!: THREE.CylinderGeometry;
  private ghostDomeGeo!: THREE.SphereGeometry;
  private ghostEyeGeo!: THREE.SphereGeometry;
  private ghostPupilGeo!: THREE.SphereGeometry;

  // --- Reusable Materials ---
  private wallMat!: THREE.MeshStandardMaterial;
  private dotMat!: THREE.MeshStandardMaterial;
  private pelletMat!: THREE.MeshStandardMaterial;
  private pacmanMat!: THREE.MeshStandardMaterial;
  private ghostEyeMat!: THREE.MeshBasicMaterial;
  private ghostPupilMat!: THREE.MeshBasicMaterial;

  // --- Geometries & Materials disposal cache ---
  private geometriesToDispose: THREE.BufferGeometry[] = [];
  private materialsToDispose: THREE.Material[] = [];

  // --- Game State ---
  private score = 0;
  private highScore = 0;
  private lives = 3;
  private totalDots = 0;
  private frightenedTime = 0; // seconds remaining

  // --- Entities ---
  private pacman!: PacmanEntity;
  private ghosts: GhostEntity[] = [];
  private dots: DotInstance[] = [];
  private pellets: PelletInstance[] = [];

  // Input direction queue
  private nextDirX = 0;
  private nextDirZ = 0;

  // Static Matrix Reuse to prevent Garbage Collection overhead
  private tempMatrix = new THREE.Matrix4();
  private tempPosition = new THREE.Vector3();
  private tempRotation = new THREE.Quaternion();
  private tempScale = new THREE.Vector3();

  constructor() {
    super('PacManScene');
  }

  init() {
    this.lifecycleState = 'start';
    this.score = 0;
    this.lives = 3;
    this.frightenedTime = 0;
    this.highScore = readStoredNumber('wgf_pacman_high_score', 0);
    this.nextDirX = 0;
    this.nextDirZ = 0;
    this.ghosts = [];
    this.dots = [];
    this.pellets = [];
    this.geometriesToDispose = [];
    this.materialsToDispose = [];
  }

  create() {
    const { width, height } = this.scale;

    // 1. Phaser Background (Solid Black)
    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x000000, 1);
    bgGraphics.fillRect(0, 0, width, height);
    bgGraphics.setScrollFactor(0);

    // 2. HUD Texts (Outfit Font, Robinhood theme colors)
    this.titleText = this.add.text(width / 2, 40, 'PAC-MAN 3D', {
      fontSize: '36px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.titleText.setShadow(0, 0, '#00c805', 8, true, true);

    this.scoreText = this.add.text(width / 2 - 110, 90, 'SCORE: 0', {
      fontSize: '18px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.livesText = this.add.text(width / 2, 90, 'LIVES: 3', {
      fontSize: '18px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.highScoreText = this.add.text(width / 2 + 110, 90, `BEST: ${this.highScore}`, {
      fontSize: '18px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.hintText = this.add.text(width / 2, height - 55, 'SWIPE OR ARROWS TO STEER PAC-MAN', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      align: 'center'
    }).setOrigin(0.5).setScrollFactor(0);

    this.backBtn = this.add.text(20, 16, '<- BACK TO HUB', {
      fontSize: '16px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });

    this.backBtn.on('pointerdown', () => this.returnToHub());

    // 3. Setup Three.js Canvas Overlay
    const parentElement = this.sys.game.canvas.parentElement;
    if (!parentElement) throw new Error('Parent container element not found for Three.js overlay');

    this.threeCanvas = document.createElement('canvas');
    this.threeCanvas.id = 'three-pacman-canvas';
    this.threeCanvas.style.position = 'absolute';
    this.threeCanvas.style.top = '0';
    this.threeCanvas.style.left = '0';
    this.threeCanvas.style.width = '100%';
    this.threeCanvas.style.height = '100%';
    this.threeCanvas.style.pointerEvents = 'none'; // pass events to Phaser
    this.threeCanvas.style.zIndex = '10'; // render on top of Phaser
    parentElement.appendChild(this.threeCanvas);

    // Initialize Three.js Renderer
    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      alpha: true,
      antialias: true
    });
    this.threeRenderer.setSize(width, height);
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.threeScene = new THREE.Scene();

    // 3D Perspective Camera tilted looking down at the board
    this.threeCamera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.threeCamera.position.set(0, 11, 8.5);
    this.threeCamera.lookAt(0, -0.5, 0.5);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 12, 4);
    this.threeScene.add(dirLight);

    const neonLight = new THREE.PointLight(0x00ff00, 1.2, 25);
    neonLight.position.set(0, 5, 0);
    this.threeScene.add(neonLight);

    // 4. Create Reusable Geometries and Materials (Created once and cached)
    this.createGeometriesAndMaterials();

    // 5. Build Maze elements
    this.buildMaze3D();

    // 6. Overlays and Lifecycle
    this.overlays = new StandardOverlays(this);
    const runtime = (window as any).__WGF_INPUT_RUNTIME;
    this.lifecycleManager = new LifecycleManager(this, runtime);

    this.showStart();

    // Window Resizing
    this.scale.on('resize', this.handleResize, this);

    // Setup Phaser event cleanups
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroySceneResources();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.destroySceneResources();
    });
  }

  // --- Create Geometries & Materials once ---
  private createGeometriesAndMaterials() {
    // Geometries
    this.wallGeo = new THREE.BoxGeometry(0.96, 0.6, 0.96);
    this.geometriesToDispose.push(this.wallGeo);

    this.dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
    this.geometriesToDispose.push(this.dotGeo);

    this.pelletGeo = new THREE.SphereGeometry(0.2, 8, 8);
    this.geometriesToDispose.push(this.pelletGeo);

    this.pacmanGeo = new THREE.SphereGeometry(0.32, 16, 16);
    this.geometriesToDispose.push(this.pacmanGeo);

    // Ghost Geometries (Re-used for all ghost instances)
    this.ghostBodyGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.35, 8);
    this.geometriesToDispose.push(this.ghostBodyGeo);

    this.ghostDomeGeo = new THREE.SphereGeometry(0.28, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    this.geometriesToDispose.push(this.ghostDomeGeo);

    this.ghostEyeGeo = new THREE.SphereGeometry(0.07, 6, 6);
    this.geometriesToDispose.push(this.ghostEyeGeo);

    this.ghostPupilGeo = new THREE.SphereGeometry(0.035, 4, 4);
    this.geometriesToDispose.push(this.ghostPupilGeo);

    // Materials (Flat shaded for retro vibe)
    this.wallMat = new THREE.MeshStandardMaterial({
      color: 0x00c805, // Robinhood neon green
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x002200,
      flatShading: true
    });
    this.materialsToDispose.push(this.wallMat);

    this.dotMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      flatShading: true
    });
    this.materialsToDispose.push(this.dotMat);

    this.pelletMat = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      roughness: 0.2,
      metalness: 0.8,
      flatShading: true
    });
    this.materialsToDispose.push(this.pelletMat);

    this.pacmanMat = new THREE.MeshStandardMaterial({
      color: 0xffdd00,
      roughness: 0.2,
      metalness: 0.6,
      flatShading: true
    });
    this.materialsToDispose.push(this.pacmanMat);

    this.ghostEyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.materialsToDispose.push(this.ghostEyeMat);

    this.ghostPupilMat = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    this.materialsToDispose.push(this.ghostPupilMat);
  }

  // --- Built 3D Board elements ---
  private buildMaze3D() {
    // 1. Calculate InstancedMesh counts dynamically from MAZE_GRID
    let wallCount = 0;
    let dotCount = 0;
    let pelletCount = 0;

    for (let r = 0; r < MAZE_GRID.length; r++) {
      const line = MAZE_GRID[r];
      for (let c = 0; c < line.length; c++) {
        if (line[c] === '#') wallCount++;
        else if (line[c] === '.') dotCount++;
        else if (line[c] === 'p') pelletCount++;
      }
    }

    // 2. Initialize InstancedMeshes
    this.wallInstancedMesh = new THREE.InstancedMesh(this.wallGeo, this.wallMat, wallCount);
    this.threeScene.add(this.wallInstancedMesh);

    this.dotInstancedMesh = new THREE.InstancedMesh(this.dotGeo, this.dotMat, dotCount);
    this.threeScene.add(this.dotInstancedMesh);

    this.pelletInstancedMesh = new THREE.InstancedMesh(this.pelletGeo, this.pelletMat, pelletCount);
    this.threeScene.add(this.pelletInstancedMesh);

    // 3. Populate matrices and entities lists
    let wallIndex = 0;
    let dotIndex = 0;
    let pelletIndex = 0;

    for (let row = 0; row < MAZE_GRID.length; row++) {
      const line = MAZE_GRID[row];
      for (let col = 0; col < line.length; col++) {
        const char = line[col];
        const x = (col - 7) * CELL_WIDTH;
        const z = (row - 7) * CELL_WIDTH;

        if (char === '#') {
          this.tempMatrix.setPosition(x, 0.3, z);
          this.wallInstancedMesh.setMatrixAt(wallIndex++, this.tempMatrix);
        } else if (char === '.') {
          this.tempMatrix.setPosition(x, 0.15, z);
          this.dotInstancedMesh.setMatrixAt(dotIndex, this.tempMatrix);
          this.dots.push({ gridX: col, gridZ: row, instanceId: dotIndex++, eaten: false });
        } else if (char === 'p') {
          this.tempMatrix.setPosition(x, 0.15, z);
          this.pelletInstancedMesh.setMatrixAt(pelletIndex, this.tempMatrix);
          this.pellets.push({ gridX: col, gridZ: row, instanceId: pelletIndex++, eaten: false });
        } else if (char === 'S') {
          // Initialize Pacman
          const pacMesh = new THREE.Mesh(this.pacmanGeo, this.pacmanMat);
          pacMesh.position.set(x, 0.22, z);
          this.threeScene.add(pacMesh);

          this.pacman = {
            gridX: col,
            gridZ: row,
            targetX: col,
            targetZ: row,
            progress: 0,
            dirX: 0,
            dirZ: 0,
            speed: 4.8,
            mesh: pacMesh
          };
        }
      }
    }

    // Flag instanced matrix updates
    this.wallInstancedMesh.instanceMatrix.needsUpdate = true;
    this.dotInstancedMesh.instanceMatrix.needsUpdate = true;
    this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;

    this.totalDots = this.dots.length;

    // Spawn 3 Ghosts
    const ghostColors = [
      { name: 'Blinky', color: 0xff0000, startX: 1, startZ: 1 },
      { name: 'Pinky', color: 0xffb8ff, startX: 13, startZ: 1 },
      { name: 'Inky', color: 0x00ffff, startX: 7, startZ: 1 }
    ];

    ghostColors.forEach((gc) => {
      const gGroup = this.createGhostMesh(gc.color);
      gGroup.position.set((gc.startX - 7) * CELL_WIDTH, 0.2, (gc.startZ - 7) * CELL_WIDTH);
      this.threeScene.add(gGroup);

      this.ghosts.push({
        name: gc.name,
        color: gc.color,
        spawnGridX: gc.startX,
        spawnGridZ: gc.startZ,
        gridX: gc.startX,
        gridZ: gc.startZ,
        targetX: gc.startX,
        targetZ: gc.startZ,
        progress: 0,
        dirX: 0,
        dirZ: 0,
        speed: 3.2,
        mesh: gGroup,
        bodyMat: gGroup.userData.bodyMat
      });
    });
  }

  // --- Programmatic Low-Poly Ghost Generator ---
  private createGhostMesh(colorHex: number): THREE.Group {
    const group = new THREE.Group();

    // Body material (unique to each ghost, flat-shaded)
    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.3,
      metalness: 0.6,
      flatShading: true
    });
    this.materialsToDispose.push(bodyMat);

    // Head / body cylinder
    const bodyMesh = new THREE.Mesh(this.ghostBodyGeo, bodyMat);
    bodyMesh.position.y = 0.175;
    group.add(bodyMesh);

    // Dome head
    const domeMesh = new THREE.Mesh(this.ghostDomeGeo, bodyMat);
    domeMesh.position.y = 0.35;
    group.add(domeMesh);

    // White eyes
    const leftEye = new THREE.Mesh(this.ghostEyeGeo, this.ghostEyeMat);
    leftEye.position.set(-0.1, 0.26, 0.22);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(this.ghostEyeGeo, this.ghostEyeMat);
    rightEye.position.set(0.1, 0.26, 0.22);
    group.add(rightEye);

    // Blue pupils
    const leftPupil = new THREE.Mesh(this.ghostPupilGeo, this.ghostPupilMat);
    leftPupil.position.set(-0.1, 0.26, 0.28);
    group.add(leftPupil);

    const rightPupil = new THREE.Mesh(this.ghostPupilGeo, this.ghostPupilMat);
    rightPupil.position.set(0.1, 0.26, 0.28);
    group.add(rightPupil);

    // Store material reference for color flashing in frightened state
    group.userData = { bodyMat };

    return group;
  }

  // --- Window Resize ---
  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    if (this.threeRenderer) {
      this.threeRenderer.setSize(width, height);
    }
    if (this.threeCamera) {
      this.threeCamera.aspect = width / height;
      this.threeCamera.updateProjectionMatrix();
    }
  }

  update(time: number, delta: number) {
    const deltaSeconds = delta / 1000;

    // Run manager
    const state = this.lifecycleManager.update(time);

    if (state === 'playing') {
      this.updateGameplay(deltaSeconds);
    }

    // Render Three.js overlay
    if (this.threeRenderer && this.threeScene && this.threeCamera) {
      // Pulsate remaining power pellets via InstancedMesh scale matrix update
      const pulse = 1.0 + 0.2 * Math.sin(time * 0.008);
      this.pellets.forEach((p) => {
        if (p.eaten) {
          this.tempMatrix.makeScale(0, 0, 0); // Hide eaten pellet
        } else {
          this.tempPosition.set((p.gridX - 7) * CELL_WIDTH, 0.15, (p.gridZ - 7) * CELL_WIDTH);
          this.tempScale.set(pulse, pulse, pulse);
          this.tempMatrix.compose(this.tempPosition, this.tempRotation, this.tempScale);
        }
        this.pelletInstancedMesh.setMatrixAt(p.instanceId, this.tempMatrix);
      });
      this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;

      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  // --- Main Gameplay Loop ---
  private updateGameplay(dt: number) {
    // 1. Decelerate Frightened State
    if (this.frightenedTime > 0) {
      this.frightenedTime -= dt;
      if (this.frightenedTime <= 0) {
        this.frightenedTime = 0;
        // Restore ghost normal colors
        this.ghosts.forEach(g => g.bodyMat.color.setHex(g.color));
      } else {
        // Flash ghosts blue and white if frightened timer is ending (< 2.0s left)
        this.ghosts.forEach((g) => {
          if (this.frightenedTime < 2.0 && Math.floor(this.frightenedTime * 4) % 2 === 0) {
            g.bodyMat.color.setHex(0xffffff);
          } else {
            g.bodyMat.color.setHex(0x1e90ff); // Dodger Blue
          }
        });
      }
    }

    // 2. Pacman Movement and Turn Grid Alignment
    this.updatePacmanMovement(dt);

    // 3. Ghosts Pathfinding and Movement
    this.updateGhostsMovement(dt);

    // 4. Collision Check: Pacman vs Ghosts
    this.checkEntityCollisions();
  }

  private isWall(gridX: number, gridZ: number): boolean {
    if (gridZ < 0 || gridZ >= MAZE_GRID.length) return true;
    const rowStr = MAZE_GRID[gridZ];
    if (gridX < 0 || gridX >= rowStr.length) return true;
    return rowStr[gridX] === '#';
  }

  private updatePacmanMovement(dt: number) {
    const p = this.pacman;

    // Check immediate opposite direction reverse
    if (this.nextDirX === -p.dirX && this.nextDirZ === -p.dirZ && (p.dirX !== 0 || p.dirZ !== 0)) {
      const tempX = p.gridX;
      const tempZ = p.gridZ;
      p.gridX = p.targetX;
      p.gridZ = p.targetZ;
      p.targetX = tempX;
      p.targetZ = tempZ;
      p.dirX = this.nextDirX;
      p.dirZ = this.nextDirZ;
      p.progress = 1.0 - p.progress;
    }

    if (p.progress >= 1.0 || (p.dirX === 0 && p.dirZ === 0)) {
      // Snap to target
      p.gridX = p.targetX;
      p.gridZ = p.targetZ;
      p.progress = 0;

      // Check eating Dots/Pellets
      this.checkEating(p.gridX, p.gridZ);

      // Determine next movement direction from queue or current
      if ((this.nextDirX !== 0 || this.nextDirZ !== 0) && !this.isWall(p.gridX + this.nextDirX, p.gridZ + this.nextDirZ)) {
        p.dirX = this.nextDirX;
        p.dirZ = this.nextDirZ;
      } else if (p.dirX !== 0 || p.dirZ !== 0) {
        // Can we continue current path?
        if (this.isWall(p.gridX + p.dirX, p.gridZ + p.dirZ)) {
          p.dirX = 0;
          p.dirZ = 0;
        }
      }

      p.targetX = p.gridX + p.dirX;
      p.targetZ = p.gridZ + p.dirZ;
    }

    // Apply movement
    if (p.dirX !== 0 || p.dirZ !== 0) {
      p.progress += p.speed * dt;
      if (p.progress > 1.0) p.progress = 1.0;
    }

    const visX = (1 - p.progress) * p.gridX + p.progress * p.targetX;
    const visZ = (1 - p.progress) * p.gridZ + p.progress * p.targetZ;
    p.mesh.position.set((visX - 7) * CELL_WIDTH, 0.22, (visZ - 7) * CELL_WIDTH);

    // Rotate Pacman towards movement direction
    if (p.dirX !== 0 || p.dirZ !== 0) {
      p.mesh.rotation.y = Math.atan2(-p.dirX, -p.dirZ);
    }
  }

  private checkEating(gridX: number, gridZ: number) {
    // 1. Check dot
    const dotIdx = this.dots.findIndex((d) => !d.eaten && d.gridX === gridX && d.gridZ === gridZ);
    if (dotIdx !== -1) {
      const dot = this.dots[dotIdx];
      dot.eaten = true;

      // Translate eaten dot offscreen (safe clean disposal from viewport)
      this.tempMatrix.makeScale(0, 0, 0);
      this.dotInstancedMesh.setMatrixAt(dot.instanceId, this.tempMatrix);
      this.dotInstancedMesh.instanceMatrix.needsUpdate = true;

      this.score += 10;
      this.scoreText.setText(`SCORE: ${this.score}`);
      SoundSynth.playTone(450, 0.05, 'sine', 0.05);

      // Check Victory
      this.checkVictoryCondition();
      return;
    }

    // 2. Check power pellet
    const pelletIdx = this.pellets.findIndex((pellet) => !pellet.eaten && pellet.gridX === gridX && pellet.gridZ === gridZ);
    if (pelletIdx !== -1) {
      const pellet = this.pellets[pelletIdx];
      pellet.eaten = true;

      // Translate eaten pellet offscreen
      this.tempMatrix.makeScale(0, 0, 0);
      this.pelletInstancedMesh.setMatrixAt(pellet.instanceId, this.tempMatrix);
      this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;

      this.score += 50;
      this.scoreText.setText(`SCORE: ${this.score}`);
      SoundSynth.playTone(600, 0.15, 'triangle', 0.08);
      SoundSynth.playTone(800, 0.15, 'triangle', 0.08);

      // Trigger frightened mode
      this.frightenedTime = 7.0; // 7 seconds
      this.ghosts.forEach((g) => {
        g.bodyMat.color.setHex(0x1e90ff);
        // Slowly move ghosts when frightened
        g.speed = 1.8;
      });

      // Check Victory
      this.checkVictoryCondition();
    }
  }

  private checkVictoryCondition() {
    const dotsRemaining = this.dots.filter(d => !d.eaten).length;
    const pelletsRemaining = this.pellets.filter(p => !p.eaten).length;
    if (dotsRemaining === 0 && pelletsRemaining === 0) {
      this.handleVictory();
    }
  }

  private updateGhostsMovement(dt: number) {
    this.ghosts.forEach((g) => {
      if (g.progress >= 1.0 || (g.dirX === 0 && g.dirZ === 0)) {
        g.gridX = g.targetX;
        g.gridZ = g.targetZ;
        g.progress = 0;

        // Pathfinding: decide next direction
        // A Ghost cannot reverse unless forced to
        const oppX = -g.dirX;
        const oppZ = -g.dirZ;

        const options: { dx: number; dz: number }[] = [];
        const dirs = [
          { dx: 0, dz: -1 }, // Up
          { dx: 0, dz: 1 },  // Down
          { dx: -1, dz: 0 }, // Left
          { dx: 1, dz: 0 }   // Right
        ];

        dirs.forEach((d) => {
          // Cannot reverse directly
          if (d.dx === oppX && d.dz === oppZ && (g.dirX !== 0 || g.dirZ !== 0)) {
            return;
          }
          if (!this.isWall(g.gridX + d.dx, g.gridZ + d.dz)) {
            options.push(d);
          }
        });

        // If no options, reverse is allowed
        if (options.length === 0) {
          if (!this.isWall(g.gridX + oppX, g.gridZ + oppZ)) {
            options.push({ dx: oppX, dz: oppZ });
          }
        }

        if (options.length > 0) {
          let chosenDir = options[0];

          if (this.frightenedTime > 0) {
            // Random direction in frightened mode
            chosenDir = options[Math.floor(Math.random() * options.length)];
          } else {
            // Target pathfinding
            let tx = this.pacman.gridX;
            let tz = this.pacman.gridZ;

            if (g.name === 'Pinky') {
              tx += this.pacman.dirX * 2;
              tz += this.pacman.dirZ * 2;
            }

            // Find option closest to target
            let minDistance = Infinity;
            options.forEach((opt) => {
              const nx = g.gridX + opt.dx;
              const nz = g.gridZ + opt.dz;
              const distSq = (nx - tx) * (nx - tx) + (nz - tz) * (nz - tz);
              if (distSq < minDistance) {
                minDistance = distSq;
                chosenDir = opt;
              }
            });
          }

          g.dirX = chosenDir.dx;
          g.dirZ = chosenDir.dz;
        } else {
          g.dirX = 0;
          g.dirZ = 0;
        }

        g.targetX = g.gridX + g.dirX;
        g.targetZ = g.gridZ + g.dirZ;
      }

      // Update speed based on frightened timer
      g.speed = this.frightenedTime > 0 ? 1.8 : 3.2;

      if (g.dirX !== 0 || g.dirZ !== 0) {
        g.progress += g.speed * dt;
        if (g.progress > 1.0) g.progress = 1.0;
      }

      const visX = (1 - g.progress) * g.gridX + g.progress * g.targetX;
      const visZ = (1 - g.progress) * g.gridZ + g.progress * g.targetZ;
      g.mesh.position.set((visX - 7) * CELL_WIDTH, 0.2, (visZ - 7) * CELL_WIDTH);
    });
  }

  private checkEntityCollisions() {
    const pPos = this.pacman.mesh.position;

    for (let i = 0; i < this.ghosts.length; i++) {
      const g = this.ghosts[i];
      const gPos = g.mesh.position;

      const dist = pPos.distanceTo(gPos);
      if (dist < 0.58) {
        if (this.frightenedTime > 0) {
          // Eat Ghost
          SoundSynth.playTone(900, 0.2, 'sawtooth', 0.1);
          this.score += 200;
          this.scoreText.setText(`SCORE: ${this.score}`);

          // Reset ghost back to spawn
          g.gridX = g.spawnGridX;
          g.gridZ = g.spawnGridZ;
          g.targetX = g.spawnGridX;
          g.targetZ = g.spawnGridZ;
          g.progress = 0;
          g.dirX = 0;
          g.dirZ = 0;
          g.mesh.position.set((g.spawnGridX - 7) * CELL_WIDTH, 0.2, (g.spawnGridZ - 7) * CELL_WIDTH);
          g.bodyMat.color.setHex(g.color);
        } else {
          // Pacman hit normal ghost -> lose a life
          this.handleLoseLife();
          break;
        }
      }
    }
  }

  private handleLoseLife() {
    this.lives--;
    this.livesText.setText(`LIVES: ${this.lives}`);
    SoundSynth.playTone(300, 0.3, 'sawtooth', 0.12);
    SoundSynth.playTone(200, 0.3, 'sawtooth', 0.12);

    if (this.lives <= 0) {
      // Game Over
      this.lifecycleState = 'gameOver';
      if (this.threeCanvas) this.threeCanvas.style.display = 'none';
      if (this.score > this.highScore) {
        this.highScore = this.score;
        writeStoredNumber('wgf_pacman_high_score', this.highScore);
        this.highScoreText.setText(`BEST: ${this.highScore}`);
      }

      this.overlays.showGameOver(
        this.score,
        () => this.resetGameplay(),
        () => this.returnToHub()
      );
    } else {
      // Reset Pacman and ghosts to spawn points
      const p = this.pacman;
      p.gridX = 7;
      p.gridZ = 7;
      p.targetX = 7;
      p.targetZ = 7;
      p.progress = 0;
      p.dirX = 0;
      p.dirZ = 0;
      p.mesh.position.set(0, 0.22, 0);
      this.nextDirX = 0;
      this.nextDirZ = 0;

      this.ghosts.forEach((g) => {
        g.gridX = g.spawnGridX;
        g.gridZ = g.spawnGridZ;
        g.targetX = g.spawnGridX;
        g.targetZ = g.spawnGridZ;
        g.progress = 0;
        g.dirX = 0;
        g.dirZ = 0;
        g.mesh.position.set((g.spawnGridX - 7) * CELL_WIDTH, 0.2, (g.spawnGridZ - 7) * CELL_WIDTH);
        g.bodyMat.color.setHex(g.color);
      });
    }
  }

  private handleVictory() {
    this.lifecycleState = 'levelComplete';
    if (this.threeCanvas) this.threeCanvas.style.display = 'none';
    
    if (this.score > this.highScore) {
      this.highScore = this.score;
      writeStoredNumber('wgf_pacman_high_score', this.highScore);
      this.highScoreText.setText(`BEST: ${this.highScore}`);
    }

    SoundSynth.playTone(523.25, 0.15, 'sine', 0.1); // C5
    SoundSynth.playTone(659.25, 0.15, 'sine', 0.1); // E5
    SoundSynth.playTone(783.99, 0.15, 'sine', 0.1); // G5
    SoundSynth.playTone(1046.50, 0.3, 'sine', 0.1); // C6

    this.overlays.showVictory(
      'VICTORY!',
      'YOU ATE ALL THE DOTS IN THE MAZE AND CLEANED THE NEON WORLD!',
      () => this.resetGameplay(),
      () => this.returnToHub()
    );
  }

  // --- GameLifecycle Interface Implementations ---
  public showStart(): void {
    this.lifecycleState = 'start';
    this.titleText.setVisible(true).setText('PAC-MAN 3D').setColor('#00c805');
    this.scoreText.setVisible(false);
    this.livesText.setVisible(false);
    this.highScoreText.setVisible(false);
    this.hintText.setVisible(true).setText('TAP SCREEN OR SPACE TO START\n\nSWIPE OR DRAG VECTOR ON SCREEN TO STEER');
    if (this.threeCanvas) this.threeCanvas.style.display = 'none';
    this.overlays.clear();
  }

  public startGameplay(): void {
    this.lifecycleState = 'playing';
    this.titleText.setVisible(true);
    this.scoreText.setVisible(true).setText(`SCORE: ${this.score}`);
    this.livesText.setVisible(true).setText(`LIVES: ${this.lives}`);
    this.highScoreText.setVisible(true).setText(`BEST: ${this.highScore}`);
    this.hintText.setVisible(true).setText('STEER TO AVOID GHOSTS');
    if (this.threeCanvas) this.threeCanvas.style.display = 'block';
    this.overlays.clear();
  }

  public pauseGameplay(): void {
    this.lifecycleState = 'paused';
    if (this.threeCanvas) this.threeCanvas.style.display = 'none';
    this.overlays.showPause(
      () => this.resumeGameplay(),
      () => this.returnToHub()
    );
  }

  public resumeGameplay(): void {
    this.lifecycleState = 'playing';
    if (this.threeCanvas) this.threeCanvas.style.display = 'block';
    this.overlays.clear();
  }

  public resetGameplay(): void {
    this.overlays.clear();
    
    this.score = 0;
    this.lives = 3;
    this.frightenedTime = 0;
    this.nextDirX = 0;
    this.nextDirZ = 0;

    // Reset dots in InstancedMesh by mapping original position (avoid memory allocation)
    this.dots.forEach((d) => {
      d.eaten = false;
      const x = (d.gridX - 7) * CELL_WIDTH;
      const z = (d.gridZ - 7) * CELL_WIDTH;
      this.tempMatrix.setPosition(x, 0.15, z);
      this.dotInstancedMesh.setMatrixAt(d.instanceId, this.tempMatrix);
    });
    this.dotInstancedMesh.instanceMatrix.needsUpdate = true;

    // Reset pellets in InstancedMesh
    this.pellets.forEach((p) => {
      p.eaten = false;
      const x = (p.gridX - 7) * CELL_WIDTH;
      const z = (p.gridZ - 7) * CELL_WIDTH;
      this.tempMatrix.setPosition(x, 0.15, z);
      this.pelletInstancedMesh.setMatrixAt(p.instanceId, this.tempMatrix);
    });
    this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;

    // Reset Pac-Man entity pos and scale
    if (this.pacman) {
      const p = this.pacman;
      p.gridX = 7;
      p.gridZ = 7;
      p.targetX = 7;
      p.targetZ = 7;
      p.progress = 0;
      p.dirX = 0;
      p.dirZ = 0;
      p.mesh.position.set(0, 0.22, 0);
      p.mesh.rotation.y = 0;
    }

    // Reset Ghosts
    this.ghosts.forEach((g) => {
      g.gridX = g.spawnGridX;
      g.gridZ = g.spawnGridZ;
      g.targetX = g.spawnGridX;
      g.targetZ = g.spawnGridZ;
      g.progress = 0;
      g.dirX = 0;
      g.dirZ = 0;
      g.mesh.position.set((g.spawnGridX - 7) * CELL_WIDTH, 0.2, (g.spawnGridZ - 7) * CELL_WIDTH);
      g.bodyMat.color.setHex(g.color);
    });

    this.showStart();
  }

  public returnToHub(): void {
    SoundSynth.playTone(400, 0.1, 'sine', 0.05);
    this.scene.start('HubScene');
  }

  public handleArcadeInput(frame: ArcadeInputFrame): void {
    if (this.lifecycleState !== 'playing') return;

    // Detect direction queue inputs
    const upAction = frame.actions.up.held || frame.actions.up.justPressed || frame.gestures.swipeUp;
    const downAction = frame.actions.down.held || frame.actions.down.justPressed || frame.gestures.swipeDown;
    const leftAction = frame.actions.left.held || frame.actions.left.justPressed || frame.gestures.swipeLeft;
    const rightAction = frame.actions.right.held || frame.actions.right.justPressed || frame.gestures.swipeRight;

    if (upAction) {
      this.nextDirX = 0;
      this.nextDirZ = -1;
    } else if (downAction) {
      this.nextDirX = 0;
      this.nextDirZ = 1;
    } else if (leftAction) {
      this.nextDirX = -1;
      this.nextDirZ = 0;
    } else if (rightAction) {
      this.nextDirX = 1;
      this.nextDirZ = 0;
    }

    // Touch dragging
    if (frame.touch.active) {
      const threshold = 18;
      if (Math.abs(frame.gestures.dragVectorX) > Math.abs(frame.gestures.dragVectorY)) {
        if (frame.gestures.dragVectorX > threshold) {
          this.nextDirX = 1;
          this.nextDirZ = 0;
        } else if (frame.gestures.dragVectorX < -threshold) {
          this.nextDirX = -1;
          this.nextDirZ = 0;
        }
      } else {
        if (frame.gestures.dragVectorY > threshold) {
          this.nextDirX = 0;
          this.nextDirZ = 1;
        } else if (frame.gestures.dragVectorY < -threshold) {
          this.nextDirX = 0;
          this.nextDirZ = -1;
        }
      }
    }
  }

  public getGameplayStateForQA(): GameplayQAState {
    const activeDots = this.dots.filter(d => !d.eaten).length;
    return {
      sceneKey: this.sceneKey,
      lifecycle: this.lifecycleState,
      orientation: this.scale.height >= this.scale.width ? 'portrait' : 'landscape',
      player: {
        x: this.pacman ? this.pacman.gridX : 7,
        y: this.pacman ? this.pacman.gridZ : 13,
        alive: this.lives > 0
      },
      score: this.score,
      lives: this.lives,
      primaryActionCount: activeDots, // dots remaining
      enemyOrHazardCount: this.ghosts.length,
      objectiveProgress: this.totalDots > 0 ? (this.totalDots - activeDots) / this.totalDots : 1.0,
      messages: [
        `Score: ${this.score}`,
        `Lives: ${this.lives}`,
        `Dots remaining: ${activeDots}`,
        `Frightened mode: ${this.frightenedTime > 0 ? 'ACTIVE' : 'INACTIVE'}`
      ]
    };
  }

  // --- Complete Cleanup to Prevent Memory Leaks ---
  public destroySceneResources(): void {
    // 1. Remove resize handler
    this.scale.off('resize', this.handleResize, this);

    // 2. Remove Three.js canvas overlay from DOM
    if (this.threeCanvas && this.threeCanvas.parentElement) {
      this.threeCanvas.parentElement.removeChild(this.threeCanvas);
    }

    // 3. Clear all children from Three.js scene
    if (this.threeScene) {
      while (this.threeScene.children.length > 0) {
        const obj = this.threeScene.children[0];
        this.threeScene.remove(obj);
      }
    }

    // 4. Dispose all unique tracked geometries
    this.geometriesToDispose.forEach((g) => g.dispose());
    this.geometriesToDispose = [];

    // 5. Dispose all unique tracked materials
    this.materialsToDispose.forEach((m) => m.dispose());
    this.materialsToDispose = [];

    // 6. Dispose WebGL Renderer
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
    }
  }
}
