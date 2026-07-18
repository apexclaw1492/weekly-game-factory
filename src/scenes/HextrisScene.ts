import Phaser from 'phaser';
import * as THREE from 'three';
import { GameLifecycle, LifecycleState } from '../runtime/GameLifecycle';
import { LifecycleManager } from '../runtime/LifecycleManager';
import { ArcadeInputFrame } from '../runtime/ArcadeInputFrame';
import { SoundSynth } from '../utils/SoundSynth';
import { StandardOverlays } from '../utils/StandardOverlays';

interface GameSettings {
  hexWidth: number;
  blockHeight: number;
  rows: number;
  speedModifier: number;
  creationSpeedModifier: number;
  comboTime: number;
  startDist: number;
  scale: number;
  angularVelocityConst: number;
}

class LogicalBlock {
  public settled = false;
  public fallingLane: number;
  public color: string;
  public iter: number;
  public distFromHex: number;
  public height: number;
  public attachedLane = 0;
  public checked = 0;
  public deleted = 0; // 0 = active, 1 = fading out, 2 = fully removed
  public opacity = 1.0;
  public mesh: THREE.Mesh | null = null;

  constructor(fallingLane: number, color: string, iter: number, distFromHex: number, height: number) {
    this.fallingLane = fallingLane;
    this.color = color;
    this.iter = iter;
    this.distFromHex = distFromHex;
    this.height = height;
  }
}

class LogicalHex {
  public sides = 6;
  public angle = 30; // Starts rotated to have a flat top
  public targetAngle = 30;
  public position = 0; // side facing lane index
  public blocks: LogicalBlock[][] = [[], [], [], [], [], []];
  public lastCombo = 0;
  public comboMultiplier = 1;
  public lastColorScored = '#00c805';
  public ct = 0; // logical game ticks
  public mesh!: THREE.Mesh;
}

class WaveGen {
  public lastGen = 0;
  public nextGen = 2700;
  public ct = 0;
  public difficulty = 1;
  public last = 0;
  public currentFunction: () => void;

  constructor(private scene: HextrisScene) {
    this.currentFunction = this.randomGeneration;
  }

  public init() {
    this.lastGen = 0;
    this.nextGen = 2700;
    this.ct = 0;
    this.difficulty = 1;
    this.last = 0;
    this.currentFunction = this.randomGeneration;
  }

  public update(_dt: number, ct: number) {
    const elapsedMs = ct * 16.6667;
    const speedModifier = this.scene.settings.speedModifier;
    const creationSpeedModifier = this.scene.settings.creationSpeedModifier;

    // Difficulty scaling
    if (this.difficulty < 35) {
      let increment = 0;
      const diffTime = elapsedMs - this.last;
      if (this.difficulty < 8) {
        increment = diffTime / 5166667 * speedModifier;
      } else if (this.difficulty < 15) {
        increment = diffTime / 72333333 * speedModifier;
      } else {
        increment = diffTime / 90000000 * speedModifier;
      }
      this.difficulty += increment * 0.5;
    }
    this.last = elapsedMs;

    // Gen threshold
    if ((elapsedMs - this.lastGen) * creationSpeedModifier > this.nextGen) {
      this.currentFunction();
      if (this.nextGen > 600) {
        this.nextGen -= 11 * (this.nextGen / 1300) * creationSpeedModifier;
      }
    }
  }

  public blockDestroyed() {
    const creationSpeedModifier = this.scene.settings.creationSpeedModifier;
    if (this.nextGen > 1350) {
      this.nextGen -= 30 * creationSpeedModifier;
    } else if (this.nextGen > 600) {
      this.nextGen -= 8 * creationSpeedModifier;
    } else {
      this.nextGen = 600;
    }

    if (this.difficulty < 35) {
      this.difficulty += 0.085 * this.scene.settings.speedModifier;
    } else {
      this.difficulty = 35;
    }
  }

  private randomGeneration = () => {
    const elapsedMs = this.scene.mainHex.ct * 16.6667;
    this.ct++;
    this.lastGen = elapsedMs;
    const lane = Math.floor(Math.random() * 6);
    const color = this.scene.getRandomColor();
    const speed = 1.6 + (this.difficulty / 15) * 3;
    this.scene.addNewBlock(lane, color, speed);

    if (this.ct > 5) {
      const nextPattern = Math.floor(Math.random() * 24);
      if (nextPattern > 15) {
        this.ct = 0;
        this.currentFunction = this.doubleGeneration;
      } else if (nextPattern > 10) {
        this.ct = 0;
        this.currentFunction = this.crosswiseGeneration;
      } else if (nextPattern > 7) {
        this.ct = 0;
        this.currentFunction = this.spiralGeneration;
      } else if (nextPattern > 4) {
        this.ct = 0;
        this.currentFunction = this.circleGeneration;
      } else if (nextPattern > 1) {
        this.ct = 0;
        this.currentFunction = this.halfCircleGeneration;
      }
    }
  };

  private doubleGeneration = () => {
    const elapsedMs = this.scene.mainHex.ct * 16.6667;
    const i = Math.floor(Math.random() * 6);
    const color1 = this.scene.getRandomColor();
    const color2 = this.scene.getRandomColor();
    const speed = 1.5 + (this.difficulty / 15) * 3;
    this.scene.addNewBlock(i, color1, speed);
    this.scene.addNewBlock((i + 1) % 6, color2, speed);
    this.ct += 2;
    this.lastGen = elapsedMs;
    this.shouldChangePattern();
  };

  private crosswiseGeneration = () => {
    const elapsedMs = this.scene.mainHex.ct * 16.6667;
    const color = this.scene.getRandomColor();
    const i = Math.floor(Math.random() * 6);
    const speed = 0.6 + (this.difficulty / 15) * 3;
    this.scene.addNewBlock(i, color, speed);
    this.scene.addNewBlock((i + 3) % 6, color, speed);
    this.ct += 1.5;
    this.lastGen = elapsedMs;
    this.shouldChangePattern();
  };

  private spiralGeneration = () => {
    const elapsedMs = this.scene.mainHex.ct * 16.6667;
    const dir = Math.floor(Math.random() * 2);
    const color = this.scene.getRandomColor();
    const speed = 1.5 + (this.difficulty / 15) * 1.5;
    const lane = dir ? (5 - (Math.floor(this.ct) % 6)) : (Math.floor(this.ct) % 6);
    this.scene.addNewBlock(lane, color, speed);
    this.ct += 1;
    this.lastGen = elapsedMs;
    this.shouldChangePattern();
  };

  private circleGeneration = () => {
    const elapsedMs = this.scene.mainHex.ct * 16.6667;
    const numColors = Math.floor(Math.random() * 3) + 1; // 1, 2, 3
    const colorList: string[] = [];
    const colors = this.scene.colors;
    for (let i = 0; i < numColors; i++) {
      let c = colors[Math.floor(Math.random() * colors.length)];
      while (colorList.includes(c)) {
        c = colors[Math.floor(Math.random() * colors.length)];
      }
      colorList.push(c);
    }
    const speed = 1.5 + (this.difficulty / 15) * 3;
    for (let i = 0; i < 6; i++) {
      this.scene.addNewBlock(i, colorList[i % colorList.length], speed);
    }
    this.ct += 15;
    this.lastGen = elapsedMs;
    this.shouldChangePattern(true);
  };

  private halfCircleGeneration = () => {
    const elapsedMs = this.scene.mainHex.ct * 16.6667;
    const numColors = Math.floor(Math.random() * 2) + 1;
    const c = this.scene.getRandomColor();
    let colorList = [c, c, c];
    if (numColors === 2) {
      colorList = [c, this.scene.getRandomColor(), c];
    }
    const d = Math.floor(Math.random() * 6);
    const speed = 1.5 + (this.difficulty / 15) * 3;
    for (let i = 0; i < 3; i++) {
      this.scene.addNewBlock((d + i) % 6, colorList[i], speed);
    }
    this.ct += 8;
    this.lastGen = elapsedMs;
    this.shouldChangePattern();
  };

  private shouldChangePattern(x?: boolean) {
    if (x) {
      const q = Math.floor(Math.random() * 3);
      this.ct = 0;
      switch (q) {
        case 0:
          this.currentFunction = this.doubleGeneration;
          break;
        case 1:
          this.currentFunction = this.spiralGeneration;
          break;
        case 2:
          this.currentFunction = this.crosswiseGeneration;
          break;
      }
    } else if (this.ct > 8) {
      if (Math.random() < 0.5) {
        this.ct = 0;
        this.currentFunction = this.randomGeneration;
      }
    }
  }
}

export class HextrisScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = 'HextrisScene';
  public lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = 'start';
  private resourcesDestroyed = false;

  // Game configuration
  public readonly colors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71']; // Red, Yellow, Blue, Green
  public readonly settings: GameSettings = {
    hexWidth: 65,
    blockHeight: 15,
    rows: 8,
    speedModifier: 0.65,
    creationSpeedModifier: 0.65,
    comboTime: 310,
    startDist: 340,
    scale: 1,
    angularVelocityConst: 4
  };

  // State properties
  public score = 0;
  public mainHex!: LogicalHex;
  public fallingBlocks: LogicalBlock[] = [];
  public waveGen!: WaveGen;
  private rush = 1;
  private dragStartX: number | null = null;
  private lastRotateTime = 0;

  // Phaser UI GameObjects
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private stateText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private backHitZone!: Phaser.GameObjects.Zone;
  private overlays!: StandardOverlays;

  // Three.js properties
  private threeScene!: THREE.Scene;
  private threeCamera!: THREE.OrthographicCamera;
  private threeRenderer!: THREE.WebGLRenderer;
  private comboRing!: THREE.LineSegments;

  // Caching & Instancing properties
  private rowGeometries: THREE.ExtrudeGeometry[] = [];
  private fallingGeometries: THREE.ExtrudeGeometry[] = [];
  private settledRowInstancedMeshes: THREE.InstancedMesh[] = [];
  private settledBlockMaterial!: THREE.MeshStandardMaterial;

  // Static objects references for disposal
  private hexGeom!: THREE.CylinderGeometry;
  private hexMat!: THREE.MeshStandardMaterial;
  private hexEdgesGeom!: THREE.EdgesGeometry;
  private hexEdgesMat!: THREE.LineBasicMaterial;
  private hexEdgesLine!: THREE.LineSegments;
  private comboRingCylinderGeom!: THREE.CylinderGeometry;
  private comboRingEdgesGeom!: THREE.EdgesGeometry;
  private comboRingMat!: THREE.LineBasicMaterial;

  constructor() {
    super('HextrisScene');
  }

  public init() {
    this.resourcesDestroyed = false;
    this.score = 0;
    this.rush = 1;
    this.dragStartX = null;
    this.lastRotateTime = 0;
    this.lifecycleState = 'start';
    this.fallingBlocks = [];

    const oldMesh = this.mainHex ? this.mainHex.mesh : null;
    this.mainHex = new LogicalHex();
    if (oldMesh) {
      this.mainHex.mesh = oldMesh;
    }
    this.waveGen = new WaveGen(this);
    this.settings.comboTime = 310;
  }

  public create() {
    const { width, height } = this.scale;

    // Solid black background (Robinhood theme)
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 1);
    bg.fillRect(0, 0, width, height);
    bg.setScrollFactor(0);

    // Initialize standard overlays
    this.overlays = new StandardOverlays(this);

    // Initialize lifecycle manager
    const runtime = (window as any).__WGF_INPUT_RUNTIME;
    if (runtime) {
      runtime.blockHubInputUntil(performance.now() + 100);
    }
    this.lifecycleManager = new LifecycleManager(this, runtime);

    // Setup HUD/texts
    this.scoreText = this.add.text(20, 20, 'SCORE: 0', {
      fontSize: '20px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setDepth(10);

    this.comboText = this.add.text(width / 2, 20, '', {
      fontSize: '20px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5, 0).setDepth(10);

    // State text
    this.stateText = this.add.text(width / 2, height / 2 - 120, 'HEXTRIS', {
      fontSize: '48px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);
    this.stateText.setShadow(0, 0, '#00c805', 8, true, true);

    this.hintText = this.add.text(width / 2, height / 2 + 130, 'TAP TO PLAY\n\nTAP LEFT/RIGHT OR SWIPE TO ROTATE\nHOLD DOWN ARROW TO SPEED UP', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      align: 'center',
      lineSpacing: 8
    }).setOrigin(0.5).setDepth(10);

    // Back to Hub Button
    this.backBtn = this.add.text(width - 20, 20, '← BACK TO HUB', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(1, 0).setDepth(1010).setInteractive({ useHandCursor: true });

    this.backHitZone = this.add.zone(width - 70, 25, 140, 50)
      .setOrigin(0.5)
      .setDepth(1011)
      .setInteractive({ useHandCursor: true });

    this.backBtn.on('pointerdown', () => this.returnToHub());
    this.backHitZone.on('pointerdown', () => this.returnToHub());

    // Initialize Three.js
    this.initThree();

    // Scale listener
    this.scale.on('resize', this.handleResize, this);

    // Auto cleanup listeners on shutdown/destroy
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroySceneResources();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.destroySceneResources();
    });

    // Initial overlay setup
    this.showStart();
  }

  public update(time: number, delta: number) {
    // Run lifecycle manager state updates
    const state = this.lifecycleManager.update(time);

    if (state === 'playing') {
      this.updateGameLogic(delta);
    } else if (state === 'start') {
      // Rotate the hexagon slowly on the start screen for visual effect
      const dt = delta / 16.6667;
      this.mainHex.angle += 0.2 * dt;
      this.mainHex.mesh.rotation.z = -this.mainHex.angle * Math.PI / 180;
    }

    this.updateInstancedMeshes();
    this.renderThree();
  }

  // --- Three.js Setup & Resizing ---
  private initThree() {
    const { width, height } = this.scale;

    // Scene
    this.threeScene = new THREE.Scene();

    // Camera (Orthographic)
    const aspect = width / height;
    const frustumSize = 600;
    this.threeCamera = new THREE.OrthographicCamera(
      -frustumSize * aspect / 2,
      frustumSize * aspect / 2,
      frustumSize / 2,
      -frustumSize / 2,
      1,
      1000
    );
    this.threeCamera.position.set(0, 0, 500);
    this.threeCamera.lookAt(0, 0, 0);

    // WebGL Renderer
    this.threeRenderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true
    });
    this.threeRenderer.setClearColor(0x000000, 0); // Transparent background
    this.threeRenderer.setSize(width, height);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio || 1);

    // Append to container
    const container = this.game.canvas.parentElement;
    if (container) {
      container.appendChild(this.threeRenderer.domElement);
      const style = this.threeRenderer.domElement.style;
      style.position = 'absolute';
      style.left = '0';
      style.top = '0';
      style.width = '100%';
      style.height = '100%';
      style.pointerEvents = 'none'; // Phaser gets clicks
      style.zIndex = '5';
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight.position.set(100, 150, 200);
    this.threeScene.add(dirLight);

    // Central Hexagon Mesh (Flat-shaded 3D cylinder)
    this.hexGeom = new THREE.CylinderGeometry(this.settings.hexWidth, this.settings.hexWidth, 20, 6);
    this.hexMat = new THREE.MeshStandardMaterial({
      color: 0x181818,
      flatShading: true,
      roughness: 0.6,
      metalness: 0.2
    });
    this.mainHex.mesh = new THREE.Mesh(this.hexGeom, this.hexMat);
    // Rotate to face camera flat and align flat edge on top
    this.mainHex.mesh.rotation.x = Math.PI / 2;
    this.mainHex.mesh.rotation.z = -this.mainHex.angle * Math.PI / 180;
    this.threeScene.add(this.mainHex.mesh);

    // Neon-green edge highlight for Hexagon
    this.hexEdgesGeom = new THREE.EdgesGeometry(this.hexGeom);
    this.hexEdgesMat = new THREE.LineBasicMaterial({ color: 0x00c805, linewidth: 2 });
    this.hexEdgesLine = new THREE.LineSegments(this.hexEdgesGeom, this.hexEdgesMat);
    this.mainHex.mesh.add(this.hexEdgesLine);

    // Combo Ring (outer boundary hexagon outline)
    const outerRadius = (this.settings.rows * this.settings.blockHeight) * (2 / Math.sqrt(3)) + this.settings.hexWidth;
    this.comboRingCylinderGeom = new THREE.CylinderGeometry(outerRadius, outerRadius, 2, 6, 1, true);
    this.comboRingEdgesGeom = new THREE.EdgesGeometry(this.comboRingCylinderGeom);
    this.comboRingMat = new THREE.LineBasicMaterial({
      color: 0x00c805,
      transparent: true,
      opacity: 0
    });
    this.comboRing = new THREE.LineSegments(this.comboRingEdgesGeom, this.comboRingMat);
    this.comboRing.rotation.x = Math.PI / 2;
    this.comboRing.rotation.z = Math.PI / 6; // align flat top
    this.threeScene.add(this.comboRing);

    // 1. Pre-generate and cache geometries for settled blocks rows (MAX_ROWS = 12)
    const MAX_ROWS = 12;
    this.rowGeometries = [];
    this.settledRowInstancedMeshes = [];

    // Create a shared material for all settled blocks
    this.settledBlockMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff, // base color must be white for setColorAt to work perfectly
      flatShading: true,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 1.0
    });

    const inradius = this.settings.hexWidth * Math.sqrt(3) / 2;
    const blockHeight = this.settings.blockHeight;

    for (let r = 0; r < MAX_ROWS; r++) {
      const distFromHex = inradius + r * blockHeight;
      const width = 2 * distFromHex / Math.sqrt(3);
      const widthWide = 2 * (distFromHex + blockHeight) / Math.sqrt(3);
      const geom = this.createBlockGeometry(width, widthWide, blockHeight);
      this.rowGeometries.push(geom);

      const instancedMesh = new THREE.InstancedMesh(geom, this.settledBlockMaterial, 6);
      const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
      for (let i = 0; i < 6; i++) {
        instancedMesh.setMatrixAt(i, zeroMatrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;
      this.settledRowInstancedMeshes.push(instancedMesh);
      this.mainHex.mesh.add(instancedMesh);
    }

    // 2. Pre-generate and cache 50 discrete geometries for falling blocks (from startDist to inradius)
    this.fallingGeometries = [];
    const numSteps = 50;
    const startDist = this.settings.startDist * this.settings.scale;
    for (let i = 0; i < numSteps; i++) {
      const t = i / (numSteps - 1);
      const dist = startDist - t * (startDist - inradius);
      const width = 2 * dist / Math.sqrt(3);
      const widthWide = 2 * (dist + blockHeight) / Math.sqrt(3);
      const geom = this.createBlockGeometry(width, widthWide, blockHeight);
      this.fallingGeometries.push(geom);
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize;
    const aspect = width / height;
    const frustumSize = 600;

    if (this.threeCamera) {
      this.threeCamera.left = -frustumSize * aspect / 2;
      this.threeCamera.right = frustumSize * aspect / 2;
      this.threeCamera.top = frustumSize / 2;
      this.threeCamera.bottom = -frustumSize / 2;
      this.threeCamera.updateProjectionMatrix();
    }

    if (this.threeRenderer) {
      this.threeRenderer.setSize(width, height);
    }
  }

  private renderThree() {
    if (this.threeRenderer && this.threeScene && this.threeCamera) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  // --- Game Mechanics / Spawning ---
  public getRandomColor(): string {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  public addNewBlock(fallingLane: number, color: string, speed: number) {
    const startDist = this.settings.startDist * this.settings.scale;
    const block = new LogicalBlock(fallingLane, color, speed * this.settings.speedModifier, startDist, this.settings.blockHeight);

    // Create block mesh
    block.mesh = this.createBlockMesh(block);
    this.threeScene.add(block.mesh);

    this.fallingBlocks.push(block);
  }

  private createBlockMesh(block: LogicalBlock): THREE.Mesh {
    const geom = this.fallingGeometries[0];
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(block.color),
      flatShading: true,
      roughness: 0.4,
      metalness: 0.1,
      transparent: true,
      opacity: 1.0
    });

    const mesh = new THREE.Mesh(geom, mat);

    // Initial position & rotation
    const angleRad = (90 - (30 + 60 * block.fallingLane)) * Math.PI / 180;
    mesh.position.set(
      Math.sin(angleRad) * (block.distFromHex + block.height / 2),
      Math.cos(angleRad) * (block.distFromHex + block.height / 2),
      0
    );
    mesh.rotation.z = -angleRad;

    return mesh;
  }

  private createBlockGeometry(width: number, widthWide: number, height: number): THREE.ExtrudeGeometry {
    const shape = new THREE.Shape();
    // Centered trapezoid outline
    shape.moveTo(-width / 2, -height / 2);
    shape.lineTo(width / 2, -height / 2);
    shape.lineTo(widthWide / 2, height / 2);
    shape.lineTo(-widthWide / 2, height / 2);
    shape.closePath();

    const extrudeSettings = {
      depth: 14,
      bevelEnabled: true,
      bevelThickness: 1.5,
      bevelSize: 0.6,
      bevelSegments: 1
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.center(); // center geometry so its centroid aligns with mesh translation
    return geom;
  }

  // --- Input Management ---
  public rotateHex(steps: number) {
    if (this.lifecycleState !== 'playing') return;

    const now = this.time.now;
    if (now - this.lastRotateTime < 75) return; // Debounce fast rotations

    this.mainHex.position += steps;
    while (this.mainHex.position < 0) {
      this.mainHex.position += 6;
    }
    this.mainHex.position = this.mainHex.position % 6;

    this.mainHex.targetAngle = this.mainHex.targetAngle - steps * 60;
    this.lastRotateTime = now;

    // Play rotation sound
    SoundSynth.playFlip();
  }

  public handleArcadeInput(frame: ArcadeInputFrame) {
    // 1. Keyboard lateral keys
    if (frame.actions.left.justPressed) {
      this.rotateHex(1);
    } else if (frame.actions.right.justPressed) {
      this.rotateHex(-1);
    }

    // Keyboard speedup
    if (frame.actions.down.held) {
      this.rush = 4;
    } else {
      this.rush = 1;
    }

    // 2. Touch Gestures (Swipes)
    if (frame.gestures.swipeLeft) {
      this.rotateHex(1);
    } else if (frame.gestures.swipeRight) {
      this.rotateHex(-1);
    }

    // 3. Lateral Taps
    if (frame.gestures.tap) {
      const { width } = this.scale;
      if (frame.touch.x < width / 2) {
        this.rotateHex(1);
      } else {
        this.rotateHex(-1);
      }
    }

    // 4. Drag Gestures
    if (frame.touch.active) {
      if (this.dragStartX === null) {
        this.dragStartX = frame.touch.x;
      } else {
        const dx = frame.touch.x - this.dragStartX;
        const dragThreshold = 40; // Pixels required to trigger rotate
        if (dx > dragThreshold) {
          this.rotateHex(-1);
          this.dragStartX = frame.touch.x;
        } else if (dx < -dragThreshold) {
          this.rotateHex(1);
          this.dragStartX = frame.touch.x;
        }
      }
    } else {
      this.dragStartX = null;
    }
  }

  // --- Game Loop Update Logic ---
  private updateGameLogic(delta: number) {
    const dt = (delta / 16.6667) * this.rush;
    this.mainHex.ct += dt;

    // Update Wave Generation
    this.waveGen.update(dt, this.mainHex.ct);

    // Update Falling Blocks
    for (let i = 0; i < this.fallingBlocks.length; i++) {
      const block = this.fallingBlocks[i];
      if (block.settled) continue;

      block.distFromHex -= block.iter * dt * this.settings.scale;
      this.checkFallingBlockCollision(block);

      if (block.settled) {
        this.fallingBlocks.splice(i, 1);
        i--;
      }
    }

    // Check matches for settled blocks
    for (let side = 0; side < 6; side++) {
      for (let j = 0; j < this.mainHex.blocks[side].length; j++) {
        if (this.mainHex.blocks[side][j].checked === 1) {
          this.consolidateBlocks(side, j);
          if (this.mainHex.blocks[side][j]) {
            this.mainHex.blocks[side][j].checked = 0;
          }
        }
      }
    }

    // Process blocks fading / removals
    for (let side = 0; side < 6; side++) {
      let lowestDeletedIndex = 99;
      for (let j = 0; j < this.mainHex.blocks[side].length; j++) {
        const block = this.mainHex.blocks[side][j];
        if (block.deleted === 1) {
          block.opacity -= 0.075 * dt;
          if (block.opacity <= 0) {
            block.opacity = 0;
            block.deleted = 2;
          } else if (block.mesh && block.mesh.material) {
            (block.mesh.material as THREE.MeshStandardMaterial).opacity = block.opacity;
          }
        }

        if (block.deleted === 2) {
          // Dispose resources
          if (block.mesh) {
            this.mainHex.mesh.remove(block.mesh);
            // Do NOT dispose geometry since it belongs to the rowGeometries cache!
            if (block.mesh.material) {
              if (Array.isArray(block.mesh.material)) {
                block.mesh.material.forEach(m => m.dispose());
              } else {
                block.mesh.material.dispose();
              }
            }
          }
          if (j < lowestDeletedIndex) lowestDeletedIndex = j;
          this.mainHex.blocks[side].splice(j, 1);
          j--;
        }
      }

      // If blocks below were deleted, collapse stack
      if (lowestDeletedIndex < this.mainHex.blocks[side].length) {
        for (let j = lowestDeletedIndex; j < this.mainHex.blocks[side].length; j++) {
          this.mainHex.blocks[side][j].settled = false;
        }
      }
    }

    // Collapse stacked blocks (Gravity)
    for (let side = 0; side < 6; side++) {
      for (let j = 0; j < this.mainHex.blocks[side].length; j++) {
        const block = this.mainHex.blocks[side][j];
        if (!block.settled) {
          block.distFromHex -= block.iter * dt * this.settings.scale;
          this.checkStackBlockCollision(block, j, side);
        }
      }
    }

    // Interpolate Hexagon Rotation
    const angleDiff = this.mainHex.targetAngle - this.mainHex.angle;
    if (Math.abs(angleDiff) > 0.01) {
      const step = Math.sign(angleDiff) * this.settings.angularVelocityConst * dt;
      if (Math.abs(step) >= Math.abs(angleDiff)) {
        this.mainHex.angle = this.mainHex.targetAngle;
      } else {
        this.mainHex.angle += step;
      }
    }
    this.mainHex.mesh.rotation.z = -this.mainHex.angle * Math.PI / 180;

    // Update Three.js positions for falling blocks
    const startDist = this.settings.startDist * this.settings.scale;
    const inradius = this.settings.hexWidth * Math.sqrt(3) / 2;
    for (const block of this.fallingBlocks) {
      if (block.mesh) {
        const angleRad = (90 - (30 + 60 * block.fallingLane)) * Math.PI / 180;
        block.mesh.position.set(
          Math.sin(angleRad) * (block.distFromHex + block.height / 2),
          Math.cos(angleRad) * (block.distFromHex + block.height / 2),
          0
        );
        block.mesh.rotation.z = -angleRad;

        // Update block geometry using closest cached falling geometry
        const t = (startDist - block.distFromHex) / (startDist - inradius);
        const stepIdx = Math.max(0, Math.min(49, Math.round(t * 49)));
        block.mesh.geometry = this.fallingGeometries[stepIdx];
      }
    }

    // Update Three.js positions for collapsing settled blocks (local cylinder space)
    for (let side = 0; side < 6; side++) {
      for (let j = 0; j < this.mainHex.blocks[side].length; j++) {
        const block = this.mainHex.blocks[side][j];
        if (!block.settled) {
          // Spawn temporary mesh if not already present
          if (!block.mesh) {
            const mat = new THREE.MeshStandardMaterial({
              color: new THREE.Color(block.color),
              flatShading: true,
              roughness: 0.4,
              metalness: 0.1,
              transparent: true,
              opacity: 1.0
            });
            const t = (startDist - block.distFromHex) / (startDist - inradius);
            const stepIdx = Math.max(0, Math.min(49, Math.round(t * 49)));
            const geom = this.fallingGeometries[stepIdx];

            block.mesh = new THREE.Mesh(geom, mat);
            this.mainHex.mesh.add(block.mesh);
          }

          const localAngleRad = (90 - (30 + 60 * side)) * Math.PI / 180;
          block.mesh.position.set(
            Math.sin(localAngleRad) * (block.distFromHex + block.height / 2),
            Math.cos(localAngleRad) * (block.distFromHex + block.height / 2),
            0
          );
          block.mesh.rotation.set(0, 0, -localAngleRad);

          // Update geometry to closest cached geometry
          const t = (startDist - block.distFromHex) / (startDist - inradius);
          const stepIdx = Math.max(0, Math.min(49, Math.round(t * 49)));
          block.mesh.geometry = this.fallingGeometries[stepIdx];
        }
      }
    }

    // Update Combo Ring Visuals
    const elapsedCombo = this.mainHex.ct - this.mainHex.lastCombo;
    if (elapsedCombo < this.settings.comboTime) {
      const opacity = 1 - (elapsedCombo / this.settings.comboTime);
      if (this.comboRing && this.comboRing.material) {
        const mat = this.comboRing.material as THREE.LineBasicMaterial;
        mat.color.setHex(parseInt(this.mainHex.lastColorScored.replace('#', '0x')));
        mat.opacity = opacity;
      }
    } else {
      if (this.comboRing && this.comboRing.material) {
        (this.comboRing.material as THREE.LineBasicMaterial).opacity = 0;
      }
    }

    // Check Game-Over detection
    if (this.isInfringing()) {
      this.gameOver();
    }
  }

  private checkFallingBlockCollision(block: LogicalBlock) {
    const nextDist = block.distFromHex; // Already adjusted by speed in update
    const inradius = this.settings.hexWidth * Math.sqrt(3) / 2;
    const lane = (6 - block.fallingLane + this.mainHex.position) % 6;
    const arr = this.mainHex.blocks[lane];

    let targetDist = inradius;
    if (arr.length > 0) {
      const topBlock = arr[arr.length - 1];
      targetDist = topBlock.distFromHex + topBlock.height;
    }

    if (nextDist <= targetDist) {
      block.distFromHex = targetDist;
      this.addBlockToHex(block, lane);
    }
  }

  private checkStackBlockCollision(block: LogicalBlock, index: number, lane: number) {
    const nextDist = block.distFromHex;
    const inradius = this.settings.hexWidth * Math.sqrt(3) / 2;
    const arr = this.mainHex.blocks[lane];

    let targetDist = inradius;
    let shouldSettle = false;

    if (index === 0) {
      if (nextDist <= inradius) {
        targetDist = inradius;
        shouldSettle = true;
      }
    } else {
      const prevBlock = arr[index - 1];
      if (prevBlock.settled && nextDist <= (prevBlock.distFromHex + prevBlock.height)) {
        targetDist = prevBlock.distFromHex + prevBlock.height;
        shouldSettle = true;
      }
    }

    if (shouldSettle) {
      block.distFromHex = targetDist;
      block.settled = true;
      block.checked = 1;
      if (block.mesh) {
        this.mainHex.mesh.remove(block.mesh);
        if (block.mesh.material) {
          if (Array.isArray(block.mesh.material)) {
            block.mesh.material.forEach(m => m.dispose());
          } else {
            block.mesh.material.dispose();
          }
        }
        block.mesh = null;
      }
    }
  }

  private addBlockToHex(block: LogicalBlock, lane: number) {
    block.settled = true;
    block.attachedLane = lane;
    block.checked = 1;

    if (block.mesh) {
      this.threeScene.remove(block.mesh);
      if (block.mesh.material) {
        if (Array.isArray(block.mesh.material)) {
          block.mesh.material.forEach(m => m.dispose());
        } else {
          block.mesh.material.dispose();
        }
      }
      block.mesh = null;
    }

    this.mainHex.blocks[lane].push(block);

    // Sound effect
    SoundSynth.playHit();
  }

  private floodFill(side: number, index: number, deleting: [number, number][]) {
    const color = this.mainHex.blocks[side]?.[index]?.color;
    if (!color) return;

    const dirs = [
      [-1, 0], [1, 0], // adjacent lanes
      [0, -1], [0, 1]  // stack neighbors
    ];

    for (const [dx, dy] of dirs) {
      const curSide = (side + dx + 6) % 6;
      const curIndex = index + dy;

      if (this.mainHex.blocks[curSide]?.[curIndex] !== undefined) {
        const neighbor = this.mainHex.blocks[curSide][curIndex];
        if (
          neighbor.color === color &&
          neighbor.deleted === 0 &&
          !deleting.some(([s, idx]) => s === curSide && idx === curIndex)
        ) {
          deleting.push([curSide, curIndex]);
          this.floodFill(curSide, curIndex, deleting);
        }
      }
    }
  }

  private consolidateBlocks(side: number, index: number) {
    const deleting: [number, number][] = [[side, index]];
    this.floodFill(side, index, deleting);

    if (deleting.length < 3) return;

    const now = this.mainHex.ct;
    const comboTime = this.settings.comboTime;

    if (now - this.mainHex.lastCombo < comboTime) {
      this.mainHex.comboMultiplier += 1;
      // Recalculate combo window based on current speed
      this.settings.comboTime = (1 / this.settings.creationSpeedModifier) * (this.waveGen.nextGen / 16.6667) * 3;
      this.mainHex.lastCombo = now;
    } else {
      this.settings.comboTime = 240;
      this.mainHex.comboMultiplier = 1;
      this.mainHex.lastCombo = now;
    }

    const basePoints = deleting.length * deleting.length;
    const points = basePoints * this.mainHex.comboMultiplier;
    this.score += points;

    const scoredColor = this.mainHex.blocks[side][index].color;
    this.mainHex.lastColorScored = scoredColor;

    for (const [s, idx] of deleting) {
      const block = this.mainHex.blocks[s][idx];
      block.deleted = 1;

      // Spawn temporary individual mesh with its own material copy
      const fadeMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.6,
        flatShading: true,
        roughness: 0.4,
        metalness: 0.1,
        transparent: true,
        opacity: 1.0
      });

      const geom = this.rowGeometries[idx];
      const tempMesh = new THREE.Mesh(geom, fadeMat);

      const localAngleRad = (90 - (30 + 60 * s)) * Math.PI / 180;
      tempMesh.position.set(
        Math.sin(localAngleRad) * (block.distFromHex + block.height / 2),
        Math.cos(localAngleRad) * (block.distFromHex + block.height / 2),
        0
      );
      tempMesh.rotation.set(0, 0, -localAngleRad);

      this.mainHex.mesh.add(tempMesh);
      block.mesh = tempMesh;
    }

    SoundSynth.playCollect();
    this.waveGen.blockDestroyed();
  }

  private isInfringing(): boolean {
    for (let i = 0; i < 6; i++) {
      let subTotal = 0;
      for (let j = 0; j < this.mainHex.blocks[i].length; j++) {
        if (this.mainHex.blocks[i][j].deleted > 0) {
          subTotal += 1;
        }
      }
      if (this.mainHex.blocks[i].length - subTotal > this.settings.rows) {
        return true;
      }
    }
    return false;
  }

  // --- GameLifecycle Implementation ---
  public showStart() {
    this.lifecycleState = 'start';
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.scoreText.setVisible(false);
    this.comboText.setVisible(false);
    
    this.overlays.showInstructions(
      'Hextris',
      '• Rotate Hexagon: Press A/D or Left/Right Arrow keys (or tap left/right screen edges).\n• Goal: Match 3 or more blocks of the same color in a row to clear them. Keep blocks from touching the grey grid boundary!',
      () => {
        this.startGameplay();
      }
    );

    if (this.threeRenderer) {
      this.threeRenderer.domElement.style.opacity = '1.0';
    }

    this.clearThreeScene();
  }

  public startGameplay() {
    this.lifecycleState = 'playing';
    this.stateText.setVisible(false);
    this.hintText.setVisible(false);
    this.scoreText.setVisible(true).setText('SCORE: 0');
    this.comboText.setVisible(false);
    this.overlays.clear();

    if (this.threeRenderer) {
      this.threeRenderer.domElement.style.opacity = '1.0';
    }

    this.clearThreeScene();
    this.waveGen.init();
    SoundSynth.playLevelUp();
  }

  public pauseGameplay() {
    this.lifecycleState = 'paused';
    if (this.threeRenderer) {
      this.threeRenderer.domElement.style.opacity = '0.2'; // Dim 3D scene
    }
    this.overlays.showPause(
      () => this.resumeGameplay(),
      () => this.returnToHub()
    );
  }

  public resumeGameplay() {
    this.lifecycleState = 'playing';
    if (this.threeRenderer) {
      this.threeRenderer.domElement.style.opacity = '1.0';
    }
    this.overlays.clear();
  }

  public resetGameplay() {
    this.init();
    this.showStart();
  }

  public returnToHub() {
    SoundSynth.playTone(400, 0.1, 'sine', 0.05);
    this.scene.start('HubScene');
  }

  private updateInstancedMeshes() {
    if (!this.settledRowInstancedMeshes) return;

    const dummyObject = new THREE.Object3D();

    for (let r = 0; r < 12; r++) {
      const instancedMesh = this.settledRowInstancedMeshes[r];
      let needsUpdateMatrix = false;
      let needsUpdateColor = false;

      for (let side = 0; side < 6; side++) {
        const blocksInLane = this.mainHex.blocks[side];
        const block = blocksInLane && r < blocksInLane.length ? blocksInLane[r] : null;

        // If block is present, settled, and NOT fading/deleted
        if (block && block.settled && block.deleted === 0) {
          const localAngleRad = (90 - (30 + 60 * side)) * Math.PI / 180;
          dummyObject.position.set(
            Math.sin(localAngleRad) * (block.distFromHex + block.height / 2),
            Math.cos(localAngleRad) * (block.distFromHex + block.height / 2),
            0
          );
          dummyObject.rotation.set(0, 0, -localAngleRad);
          dummyObject.scale.set(1, 1, 1);
          dummyObject.updateMatrix();

          instancedMesh.setMatrixAt(side, dummyObject.matrix);
          instancedMesh.setColorAt(side, new THREE.Color(block.color));

          needsUpdateMatrix = true;
          needsUpdateColor = true;
        } else {
          // Hide it
          dummyObject.position.set(0, 0, 0);
          dummyObject.rotation.set(0, 0, 0);
          dummyObject.scale.set(0, 0, 0);
          dummyObject.updateMatrix();

          instancedMesh.setMatrixAt(side, dummyObject.matrix);
          needsUpdateMatrix = true;
        }
      }

      if (needsUpdateMatrix) {
        instancedMesh.instanceMatrix.needsUpdate = true;
      }
      if (needsUpdateColor && instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
    }
  }

  public destroySceneResources() {
    if (this.resourcesDestroyed) {
      return;
    }
    this.resourcesDestroyed = true;

    // Unsubscribe scale event
    this.scale.off('resize', this.handleResize, this);

    this.clearThreeScene();

    // Dispose of instanced meshes
    if (this.settledRowInstancedMeshes) {
      for (const instancedMesh of this.settledRowInstancedMeshes) {
        if (this.mainHex && this.mainHex.mesh) {
          this.mainHex.mesh.remove(instancedMesh);
        }
        instancedMesh.dispose();
      }
      this.settledRowInstancedMeshes = [];
    }

    // Dispose of row geometries
    if (this.rowGeometries) {
      for (const geom of this.rowGeometries) {
        geom.dispose();
      }
      this.rowGeometries = [];
    }

    // Dispose of falling geometries
    if (this.fallingGeometries) {
      for (const geom of this.fallingGeometries) {
        geom.dispose();
      }
      this.fallingGeometries = [];
    }

    // Dispose of shared material
    if (this.settledBlockMaterial) {
      this.settledBlockMaterial.dispose();
      this.settledBlockMaterial = null as any;
    }

    // Dispose of central hexagon
    if (this.mainHex && this.mainHex.mesh) {
      this.threeScene.remove(this.mainHex.mesh);
      if (this.mainHex.mesh.geometry) {
        this.mainHex.mesh.geometry.dispose();
      }
      if (this.mainHex.mesh.material) {
        if (Array.isArray(this.mainHex.mesh.material)) {
          this.mainHex.mesh.material.forEach(m => m.dispose());
        } else {
          this.mainHex.mesh.material.dispose();
        }
      }
      this.mainHex.mesh = null as any;
    }
    this.mainHex = null as any;

    if (this.hexGeom) {
      this.hexGeom.dispose();
      this.hexGeom = null as any;
    }
    if (this.hexMat) {
      this.hexMat.dispose();
      this.hexMat = null as any;
    }

    // Dispose of hexagon edges highlight
    if (this.hexEdgesLine) {
      if (this.hexEdgesLine.geometry) {
        this.hexEdgesLine.geometry.dispose();
      }
      if (this.hexEdgesLine.material) {
        if (Array.isArray(this.hexEdgesLine.material)) {
          this.hexEdgesLine.material.forEach(m => m.dispose());
        } else {
          this.hexEdgesLine.material.dispose();
        }
      }
      this.hexEdgesLine = null as any;
    }

    if (this.hexEdgesGeom) {
      this.hexEdgesGeom.dispose();
      this.hexEdgesGeom = null as any;
    }
    if (this.hexEdgesMat) {
      this.hexEdgesMat.dispose();
      this.hexEdgesMat = null as any;
    }

    // Dispose of combo ring
    if (this.comboRing) {
      this.threeScene.remove(this.comboRing);
      if (this.comboRing.geometry) {
        this.comboRing.geometry.dispose();
      }
      if (this.comboRing.material) {
        if (Array.isArray(this.comboRing.material)) {
          this.comboRing.material.forEach(m => m.dispose());
        } else {
          this.comboRing.material.dispose();
        }
      }
      this.comboRing = null as any;
    }

    if (this.comboRingCylinderGeom) {
      this.comboRingCylinderGeom.dispose();
      this.comboRingCylinderGeom = null as any;
    }
    if (this.comboRingEdgesGeom) {
      this.comboRingEdgesGeom.dispose();
      this.comboRingEdgesGeom = null as any;
    }
    if (this.comboRingMat) {
      this.comboRingMat.dispose();
      this.comboRingMat = null as any;
    }

    if (this.threeRenderer) {
      if (this.threeRenderer.domElement && this.threeRenderer.domElement.parentElement) {
        this.threeRenderer.domElement.parentElement.removeChild(this.threeRenderer.domElement);
      }
      this.threeRenderer.dispose();
      this.threeRenderer = null as any;
    }
  }

  private clearThreeScene() {
    // Remove all blocks
    for (const block of this.fallingBlocks) {
      if (block.mesh) {
        this.threeScene.remove(block.mesh);
        if (block.mesh.material) {
          if (Array.isArray(block.mesh.material)) {
            block.mesh.material.forEach(m => m.dispose());
          } else {
            block.mesh.material.dispose();
          }
        }
      }
    }
    this.fallingBlocks = [];

    if (this.mainHex) {
      for (let side = 0; side < 6; side++) {
        for (const block of this.mainHex.blocks[side]) {
          if (block.mesh) {
            this.mainHex.mesh.remove(block.mesh);
            if (block.mesh.material) {
              if (Array.isArray(block.mesh.material)) {
                block.mesh.material.forEach(m => m.dispose());
              } else {
                block.mesh.material.dispose();
              }
            }
          }
        }
        this.mainHex.blocks[side] = [];
      }
    }

    // Reset instanced meshes to scale 0 (hidden)
    if (this.settledRowInstancedMeshes) {
      const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
      for (const instancedMesh of this.settledRowInstancedMeshes) {
        for (let i = 0; i < 6; i++) {
          instancedMesh.setMatrixAt(i, zeroMatrix);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  private gameOver() {
    this.lifecycleState = 'gameOver';
    if (this.threeRenderer) {
      this.threeRenderer.domElement.style.opacity = '0.2';
    }
    SoundSynth.playDeath();
    this.overlays.showGameOver(
      this.score,
      () => this.resetGameplay(),
      () => this.returnToHub()
    );
  }

  public getGameplayStateForQA() {
    const hazardCount = this.mainHex
      ? this.mainHex.blocks.reduce((acc, lane) => acc + lane.filter(b => b.deleted === 0).length, 0)
      : 0;

    return {
      sceneKey: this.sceneKey,
      lifecycle: this.lifecycleState,
      orientation: (this.scale.height >= this.scale.width ? 'portrait' : 'landscape') as 'portrait' | 'landscape',
      player: {
        x: 0,
        y: 0,
        alive: this.lifecycleState !== 'gameOver'
      },
      score: this.score,
      primaryActionCount: this.fallingBlocks.length, // falling blocks
      enemyOrHazardCount: hazardCount, // settled blocks
      messages: []
    };
  }
}
