import Phaser from 'phaser';
import * as THREE from 'three';
import { GameLifecycle, LifecycleState } from '../runtime/GameLifecycle';
import { LifecycleManager } from '../runtime/LifecycleManager';
import { ArcadeInputFrame, GameplayQAState } from '../runtime/ArcadeInputFrame';
import { SoundSynth } from '../utils/SoundSynth';
import { StandardOverlays } from '../utils/StandardOverlays';
import { readStoredNumber, writeStoredNumber } from '../utils/SafeStorage';

// --- Game Logic Types ---
interface LogicTile {
  id: number;
  value: number;
  x: number;
  y: number;
  fromX?: number;
  fromY?: number;
  mergedIntoId?: number;
}

class GameBoard {
  size = 4;
  cells: (LogicTile | null)[][] = [];
  score = 0;
  won = false;
  over = false;
  keepPlaying = false;
  tileIdCounter = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.cells = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
    this.score = 0;
    this.won = false;
    this.over = false;
    this.keepPlaying = false;
    this.tileIdCounter = 0;
    
    this.addRandomTile();
    this.addRandomTile();
  }

  addRandomTile() {
    const emptyCells: { x: number; y: number }[] = [];
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (!this.cells[x][y]) {
          emptyCells.push({ x, y });
        }
      }
    }
    if (emptyCells.length > 0) {
      const { x, y } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      const value = Math.random() < 0.9 ? 2 : 4;
      this.cells[x][y] = {
        id: this.tileIdCounter++,
        value,
        x,
        y
      };
    }
  }

  movesAvailable(): boolean {
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        if (!this.cells[x][y]) return true;
      }
    }
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const tile = this.cells[x][y];
        if (tile) {
          if (x < this.size - 1) {
            const next = this.cells[x + 1][y];
            if (next && next.value === tile.value) return true;
          }
          if (y < this.size - 1) {
            const next = this.cells[x][y + 1];
            if (next && next.value === tile.value) return true;
          }
        }
      }
    }
    return false;
  }

  getVector(direction: number) {
    const map: { [key: number]: { x: number; y: number } } = {
      0: { x: 0, y: -1 }, // Up
      1: { x: 1, y: 0 },  // Right
      2: { x: 0, y: 1 },  // Down
      3: { x: -1, y: 0 }  // Left
    };
    return map[direction];
  }

  buildTraversals(vector: { x: number; y: number }) {
    const traversals: { x: number[]; y: number[] } = { x: [], y: [] };
    for (let pos = 0; pos < this.size; pos++) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }
    if (vector.x === 1) traversals.x.reverse();
    if (vector.y === 1) traversals.y.reverse();
    return traversals;
  }

  findFarthestPosition(cell: { x: number; y: number }, vector: { x: number; y: number }) {
    let previous;
    do {
      previous = cell;
      cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.withinBounds(cell) && !this.cells[cell.x][cell.y]);

    return {
      farthest: previous,
      next: cell
    };
  }

  withinBounds(cell: { x: number; y: number }): boolean {
    return cell.x >= 0 && cell.x < this.size && cell.y >= 0 && cell.y < this.size;
  }

  move(direction: number): {
    moved: boolean;
    transitions: {
      id: number;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      value: number;
      mergedIntoId?: number;
    }[];
    spawned?: {
      id: number;
      x: number;
      y: number;
      value: number;
    };
  } {
    if (this.over || (this.won && !this.keepPlaying)) {
      return { moved: false, transitions: [] };
    }

    const vector = this.getVector(direction);
    const traversals = this.buildTraversals(vector);
    let moved = false;
    const transitions: any[] = [];

    // Reset temporary fields
    for (let x = 0; x < this.size; x++) {
      for (let y = 0; y < this.size; y++) {
        const t = this.cells[x][y];
        if (t) {
          delete t.mergedIntoId;
          t.fromX = t.x;
          t.fromY = t.y;
        }
      }
    }

    const mergedIds = new Set<number>();

    traversals.x.forEach((x) => {
      traversals.y.forEach((y) => {
        const tile = this.cells[x][y];
        if (tile) {
          const positions = this.findFarthestPosition({ x, y }, vector);
          const nextCell = positions.next;
          const nextTile = this.withinBounds(nextCell) ? this.cells[nextCell.x][nextCell.y] : null;

          if (nextTile && nextTile.value === tile.value && !mergedIds.has(nextTile.id) && !nextTile.mergedIntoId) {
            const newValue = tile.value * 2;
            const newTile: LogicTile = {
              id: this.tileIdCounter++,
              value: newValue,
              x: nextCell.x,
              y: nextCell.y,
              fromX: nextCell.x,
              fromY: nextCell.y
            };

            this.cells[tile.x][tile.y] = null;
            this.cells[nextCell.x][nextCell.y] = newTile;

            transitions.push({
              id: tile.id,
              fromX: tile.fromX!,
              fromY: tile.fromY!,
              toX: nextCell.x,
              toY: nextCell.y,
              value: tile.value,
              mergedIntoId: newTile.id
            });
            transitions.push({
              id: nextTile.id,
              fromX: nextTile.fromX!,
              fromY: nextTile.fromY!,
              toX: nextCell.x,
              toY: nextCell.y,
              value: nextTile.value,
              mergedIntoId: newTile.id
            });

            tile.mergedIntoId = newTile.id;
            nextTile.mergedIntoId = newTile.id;
            mergedIds.add(newTile.id);

            this.score += newValue;
            if (newValue === 2048) {
              this.won = true;
            }
            moved = true;
          } else {
            const farthest = positions.farthest;
            if (farthest.x !== x || farthest.y !== y) {
              this.cells[tile.x][tile.y] = null;
              tile.x = farthest.x;
              tile.y = farthest.y;
              this.cells[farthest.x][farthest.y] = tile;
              moved = true;
            }

            transitions.push({
              id: tile.id,
              fromX: tile.fromX!,
              fromY: tile.fromY!,
              toX: tile.x,
              toY: tile.y,
              value: tile.value
            });
          }
        }
      });
    });

    let spawned: any = undefined;
    if (moved) {
      this.addRandomTile();
      for (let x = 0; x < this.size; x++) {
        for (let y = 0; y < this.size; y++) {
          const t = this.cells[x][y];
          if (t && t.fromX === undefined) {
            spawned = {
              id: t.id,
              x: t.x,
              y: t.y,
              value: t.value
            };
          }
        }
      }

      if (!this.movesAvailable()) {
        this.over = true;
      }
    }

    return { moved, transitions, spawned };
  }
}

// --- Visual Tile representation in Three.js ---
interface VisualTile {
  id: number;
  value: number;
  mesh: THREE.Mesh;
  gridX: number;
  gridY: number;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  scale: number;
  isSpawning: boolean;
  isMerging: boolean;
  mergedIntoId?: number;
}

export class TwoZeroFourEightScene extends Phaser.Scene implements GameLifecycle {
  readonly sceneKey = 'TwoZeroFourEightScene';
  public lifecycleManager!: LifecycleManager;
  public lifecycleState: LifecycleState = 'start';

  // --- Phaser UI GameObjects ---
  private titleText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private bestText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private backBtn!: Phaser.GameObjects.Text;
  private overlays!: StandardOverlays;

  // --- Three.js Properties ---
  private threeCanvas!: HTMLCanvasElement;
  private threeRenderer!: THREE.WebGLRenderer;
  private threeScene!: THREE.Scene;
  private threeCamera!: THREE.OrthographicCamera;
  private textureCache: { [key: number]: THREE.Texture } = {};
  private sharedTileGeometry: THREE.BoxGeometry | null = null;
  private sharedSideMaterial: THREE.MeshPhongMaterial | null = null;
  private queuedDirection: number | null = null;
  
  // --- Game State ---
  private board: GameBoard = new GameBoard();
  private bestScore = 0;
  private visualTiles: VisualTile[] = [];

  // --- Animation Config ---
  private animState: 'idle' | 'sliding' | 'popping' = 'idle';
  private animProgress = 0; // 0 to 1
  private slideDuration = 0.15; // seconds
  private popDuration = 0.12; // seconds

  constructor() {
    super('TwoZeroFourEightScene');
  }

  init() {
    this.lifecycleState = 'start';
    this.bestScore = readStoredNumber('wgf_2048_best_score', 0);
    this.board.reset();
    this.visualTiles = [];
    this.animState = 'idle';
    this.animProgress = 0;
    this.queuedDirection = null;
  }

  create() {
    const { width, height } = this.scale;

    // 1. Phaser Background (Solid Black)
    const bgGraphics = this.add.graphics();
    bgGraphics.fillStyle(0x000000, 1);
    bgGraphics.fillRect(0, 0, width, height);
    bgGraphics.setScrollFactor(0);

    // 2. HUD Texts (Outfit Font, Robinhood theme colors)
    this.titleText = this.add.text(width / 2, 40, '2048 3D', {
      fontSize: '36px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);
    this.titleText.setShadow(0, 0, '#00c805', 8, true, true);

    this.scoreText = this.add.text(width / 2 - 90, 90, 'SCORE: 0', {
      fontSize: '18px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.bestText = this.add.text(width / 2 + 90, 90, `BEST: ${this.bestScore}`, {
      fontSize: '18px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5).setScrollFactor(0);

    this.hintText = this.add.text(width / 2, height - 55, 'SWIPE OR ARROWS TO MERGE TILES', {
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

    // 3. Setup Three.js WebGL Renderer Overlay
    const parentElement = this.sys.game.canvas.parentElement;
    if (!parentElement) throw new Error('Parent container element not found for Three.js overlay');

    this.threeCanvas = document.createElement('canvas');
    this.threeCanvas.id = 'three-2048-canvas';
    this.threeCanvas.style.position = 'absolute';
    this.threeCanvas.style.top = '0';
    this.threeCanvas.style.left = '0';
    this.threeCanvas.style.width = '100%';
    this.threeCanvas.style.height = '100%';
    this.threeCanvas.style.pointerEvents = 'none'; // pass events to Phaser
    this.threeCanvas.style.zIndex = '10'; // render on top of Phaser
    parentElement.appendChild(this.threeCanvas);

    // Initialize Three.js objects
    this.threeRenderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      alpha: true,
      antialias: true
    });
    this.threeRenderer.setSize(width, height);
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.threeScene = new THREE.Scene();

    // Responsive Orthographic Camera Setup
    const d = 3.0;
    const aspect = width / height;
    let left = -d * aspect, right = d * aspect, top = d, bottom = -d;
    if (aspect < 1) {
      left = -d;
      right = d;
      top = d / aspect;
      bottom = -d / aspect;
    }
    this.threeCamera = new THREE.OrthographicCamera(left, right, top, bottom, 1, 1000);
    this.threeCamera.position.set(0, 5, 5);
    this.threeCamera.lookAt(0, -0.2, 0);

    // Setup lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.threeScene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight1.position.set(4, 10, 3);
    this.threeScene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00c805, 0.35); // Robinhood neon green highlight accent light
    dirLight2.position.set(-4, -1, -3);
    this.threeScene.add(dirLight2);

    // 4. Build 3D Board and slots
    this.build3DGridBoard();

    // 5. Build Initial Visual Tiles
    this.syncVisualTilesFromBoard();

    // 6. Overlays and Lifecycle
    this.overlays = new StandardOverlays(this);
    const runtime = (window as any).__WGF_INPUT_RUNTIME;
    this.lifecycleManager = new LifecycleManager(this, runtime);

    this.showStart();

    // Handle Window resizing
    this.scale.on('resize', this.handleResize, this);
    
    // Auto cleanup listeners on shutdown/destroy
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroySceneResources();
    });
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.destroySceneResources();
    });
  }

  // --- Grid and Cell Math ---
  private getCell3DPosition(col: number, row: number): { x: number; z: number } {
    const cellSize = 0.95;
    const gap = 0.08;
    const totalSize = 4 * cellSize + 3 * gap;
    const startX = -totalSize / 2 + cellSize / 2;
    const startZ = -totalSize / 2 + cellSize / 2;
    return {
      x: startX + col * (cellSize + gap),
      z: startZ + row * (cellSize + gap)
    };
  }

  private build3DGridBoard() {
    // Solid base board
    const boardGeo = new THREE.BoxGeometry(4.3, 0.2, 4.3);
    const boardMat = new THREE.MeshPhongMaterial({ color: 0x050505, flatShading: true, shininess: 5 });
    const boardMesh = new THREE.Mesh(boardGeo, boardMat);
    boardMesh.position.y = -0.1;
    this.threeScene.add(boardMesh);

    // Board Outline
    const boardEdges = new THREE.EdgesGeometry(boardGeo);
    const boardLine = new THREE.LineSegments(boardEdges, new THREE.LineBasicMaterial({ color: 0x00c805, linewidth: 2 }));
    boardLine.position.y = -0.1;
    this.threeScene.add(boardLine);

    // 16 slots using InstancedMesh
    const slotGeo = new THREE.BoxGeometry(0.92, 0.02, 0.92);
    const slotMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, flatShading: true });
    const slotInstancedMesh = new THREE.InstancedMesh(slotGeo, slotMat, 16);

    const outlineGeo = new THREE.BoxGeometry(0.92, 0.02, 0.92);
    const outlineMat = new THREE.MeshBasicMaterial({
      color: 0x00c805,
      wireframe: true,
      opacity: 0.18,
      transparent: true
    });
    const outlineInstancedMesh = new THREE.InstancedMesh(outlineGeo, outlineMat, 16);

    const dummy = new THREE.Object3D();
    let index = 0;
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        const pos = this.getCell3DPosition(col, row);
        
        dummy.position.set(pos.x, 0.01, pos.z);
        dummy.updateMatrix();
        slotInstancedMesh.setMatrixAt(index, dummy.matrix);
        outlineInstancedMesh.setMatrixAt(index, dummy.matrix);
        index++;
      }
    }

    this.threeScene.add(slotInstancedMesh);
    this.threeScene.add(outlineInstancedMesh);
  }

  private getTileTexture(value: number): THREE.Texture {
    if (this.textureCache[value]) {
      return this.textureCache[value];
    }

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, 128, 128);

    // Border
    ctx.strokeStyle = '#00c805';
    ctx.lineWidth = value >= 128 ? 10 : 6;
    ctx.strokeRect(5, 5, 118, 118);

    // Fill representing value level
    if (value >= 16) {
      const alpha = Math.min(0.45, 0.12 + Math.log2(value) * 0.03);
      ctx.fillStyle = `rgba(0, 200, 5, ${alpha})`;
      ctx.fillRect(5, 5, 118, 118);
    }

    // Number text
    ctx.fillStyle = value >= 128 ? '#00c805' : '#ffffff';
    ctx.font = `bold ${value >= 1024 ? 36 : value >= 128 ? 42 : 48}px 'Outfit', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value.toString(), 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    this.textureCache[value] = texture;
    return texture;
  }

  private create3DTileMesh(value: number): THREE.Mesh {
    if (!this.sharedTileGeometry) {
      this.sharedTileGeometry = new THREE.BoxGeometry(0.88, 0.5, 0.88);
    }
    if (!this.sharedSideMaterial) {
      this.sharedSideMaterial = new THREE.MeshPhongMaterial({ color: 0x111111, flatShading: true, shininess: 5 });
    }

    const topMat = new THREE.MeshPhongMaterial({ map: this.getTileTexture(value), flatShading: true, shininess: 5 });

    // Materials map to: right, left, top, bottom, front, back
    const mats = [
      this.sharedSideMaterial,
      this.sharedSideMaterial,
      topMat,
      this.sharedSideMaterial,
      this.sharedSideMaterial,
      this.sharedSideMaterial
    ];
    const mesh = new THREE.Mesh(this.sharedTileGeometry, mats);
    mesh.position.y = 0.25; // Sit on the board
    return mesh;
  }

  private syncVisualTilesFromBoard() {
    // Clear existing visual tiles and dispose of custom topMat to prevent memory leaks
    this.visualTiles.forEach(vt => {
      this.threeScene.remove(vt.mesh);
      if (Array.isArray(vt.mesh.material)) {
        const topMat = vt.mesh.material[2];
        if (topMat) topMat.dispose();
      } else if (vt.mesh.material) {
        vt.mesh.material.dispose();
      }
    });
    this.visualTiles = [];

    // Recreate matches
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        const tile = this.board.cells[x][y];
        if (tile) {
          const mesh = this.create3DTileMesh(tile.value);
          const pos = this.getCell3DPosition(x, y);
          mesh.position.set(pos.x, 0.25, pos.z);
          this.threeScene.add(mesh);

          this.visualTiles.push({
            id: tile.id,
            value: tile.value,
            mesh,
            gridX: x,
            gridY: y,
            startX: pos.x,
            startZ: pos.z,
            targetX: pos.x,
            targetZ: pos.z,
            scale: 1,
            isSpawning: false,
            isMerging: false
          });
        }
      }
    }
  }

  private executeMove(direction: number) {
    if (this.animState !== 'idle') return;

    const result = this.board.move(direction);
    if (!result.moved) return;

    // 1. Play Slide Sound
    SoundSynth.playTone(300, 0.08, 'triangle', 0.08);

    // 2. Map current visual tiles for tracking
    const vtMap = new Map<number, VisualTile>();
    this.visualTiles.forEach(vt => vtMap.set(vt.id, vt));

    const nextVisualTiles: VisualTile[] = [];

    // Apply translation targets to sliding tiles
    result.transitions.forEach((t) => {
      const vt = vtMap.get(t.id);
      if (vt) {
        vt.startX = vt.mesh.position.x;
        vt.startZ = vt.mesh.position.z;

        const targetPos = this.getCell3DPosition(t.toX, t.toY);
        vt.targetX = targetPos.x;
        vt.targetZ = targetPos.z;
        vt.gridX = t.toX;
        vt.gridY = t.toY;
        vt.mergedIntoId = t.mergedIntoId;

        nextVisualTiles.push(vt);
      }
    });

    // Spawned tile setup (starts at scale 0, only becomes visible after slide)
    if (result.spawned) {
      const sp = result.spawned;
      const mesh = this.create3DTileMesh(sp.value);
      const pos = this.getCell3DPosition(sp.x, sp.y);
      mesh.position.set(pos.x, 0.25, pos.z);
      mesh.scale.set(0.001, 0.001, 0.001); // invisible initially
      this.threeScene.add(mesh);

      const spawnVt: VisualTile = {
        id: sp.id,
        value: sp.value,
        mesh,
        gridX: sp.x,
        gridY: sp.y,
        startX: pos.x,
        startZ: pos.z,
        targetX: pos.x,
        targetZ: pos.z,
        scale: 0.001,
        isSpawning: true,
        isMerging: false
      };
      nextVisualTiles.push(spawnVt);
    }

    this.visualTiles = nextVisualTiles;
    this.animState = 'sliding';
    this.animProgress = 0;

    // Update HUD
    this.scoreText.setText(`SCORE: ${this.board.score}`);
    if (this.board.score > this.bestScore) {
      this.bestScore = this.board.score;
      writeStoredNumber('wgf_2048_best_score', this.bestScore);
      this.bestText.setText(`BEST: ${this.bestScore}`);
    }
  }

  // --- GameLifecycle Interface Implementations ---
  public showStart(): void {
    this.lifecycleState = 'start';
    this.titleText.setVisible(false);
    this.scoreText.setVisible(false);
    this.bestText.setVisible(false);
    this.hintText.setVisible(false);
    if (this.threeCanvas) this.threeCanvas.style.display = 'none';
    
    this.overlays.showInstructions(
      '2048',
      '• Slide Tiles: Press WASD / Arrow keys or swipe in any direction.\n• Goal: Merge identical tiles to double their value, and reach the 2048 tile!',
      () => {
        this.startGameplay();
      }
    );
  }

  public startGameplay(): void {
    this.lifecycleState = 'playing';
    this.titleText.setVisible(true);
    this.scoreText.setVisible(true).setText(`SCORE: ${this.board.score}`);
    this.bestText.setVisible(true).setText(`BEST: ${this.bestScore}`);
    this.hintText.setVisible(true).setText('SWIPE OR ARROWS TO SLIDE');
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
    this.board.reset();
    this.syncVisualTilesFromBoard();
    this.animState = 'idle';
    this.animProgress = 0;
    this.queuedDirection = null;
    this.showStart();
  }

  public returnToHub(): void {
    SoundSynth.playTone(400, 0.1, 'sine', 0.05);
    this.scene.start('HubScene');
  }

  public handleArcadeInput(frame: ArcadeInputFrame): void {
    if (this.lifecycleState !== 'playing') return;

    let direction = -1;
    if (frame.gestures.swipeUp || frame.actions.up.justPressed) {
      direction = 0; // Up
    } else if (frame.gestures.swipeRight || frame.actions.right.justPressed) {
      direction = 1; // Right
    } else if (frame.gestures.swipeDown || frame.actions.down.justPressed) {
      direction = 2; // Down
    } else if (frame.gestures.swipeLeft || frame.actions.left.justPressed) {
      direction = 3; // Left
    }

    if (direction !== -1) {
      if (this.animState === 'idle') {
        this.executeMove(direction);
      } else {
        this.queuedDirection = direction;
      }
    }
  }

  public getGameplayStateForQA(): GameplayQAState {
    // Extract grid cells value array for QA message tracking
    const gridSummary: number[] = [];
    let maxTile = 0;
    let tileCount = 0;
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        const t = this.board.cells[x][y];
        if (t) {
          gridSummary.push(t.value);
          tileCount++;
          if (t.value > maxTile) maxTile = t.value;
        } else {
          gridSummary.push(0);
        }
      }
    }

    return {
      sceneKey: this.sceneKey,
      lifecycle: this.lifecycleState,
      orientation: (this.scale.height >= this.scale.width ? 'portrait' : 'landscape'),
      player: {
        x: 0,
        y: 0,
        alive: !this.board.over
      },
      score: this.board.score,
      primaryActionCount: tileCount,
      enemyOrHazardCount: maxTile, // Use hazard count to communicate highest merged tile value to QAs
      objectiveProgress: this.board.won ? 1.0 : Math.min(0.99, maxTile / 2048),
      messages: [
        `Score: ${this.board.score}`,
        `MaxTile: ${maxTile}`,
        `TilesOnBoard: ${tileCount}`,
        `Grid: [${gridSummary.join(',')}]`
      ]
    };
  }

  // --- Window Resize & Responsive Three.js scaling ---
  private handleResize() {
    const { width, height } = this.scale;

    // Rescale HUD Text layout
    this.titleText.setPosition(width / 2, 40);
    this.scoreText.setPosition(width / 2 - 90, 90);
    this.bestText.setPosition(width / 2 + 90, 90);
    this.hintText.setPosition(width / 2, height - 55);
    this.backBtn.setPosition(20, 16);

    // Update Three.js Renderer and Camera aspect
    if (this.threeRenderer) {
      this.threeRenderer.setSize(width, height);
      this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    if (this.threeCamera) {
      const d = 3.0;
      const aspect = width / height;
      if (aspect >= 1) {
        this.threeCamera.left = -d * aspect;
        this.threeCamera.right = d * aspect;
        this.threeCamera.top = d;
        this.threeCamera.bottom = -d;
      } else {
        this.threeCamera.left = -d;
        this.threeCamera.right = d;
        this.threeCamera.top = d / aspect;
        this.threeCamera.bottom = -d / aspect;
      }
      this.threeCamera.updateProjectionMatrix();
    }
  }

  // --- Frame Loop and Animation ---
  update(time: number, delta: number) {
    // 1. Process Lifecycle inputs
    if (this.lifecycleManager) {
      const state = this.lifecycleManager.update(time);
      if (state !== 'playing') {
        return;
      }
    }

    const deltaSeconds = delta / 1000;

    // 2. Handle Three.js tile animations
    if (this.animState === 'sliding') {
      this.animProgress += deltaSeconds * (1 / this.slideDuration);
      if (this.animProgress < 1.0) {
        // Smooth Cubic Easing
        const t = this.easeInOutCubic(this.animProgress);
        this.visualTiles.forEach((vt) => {
          if (!vt.isSpawning) {
            vt.mesh.position.x = vt.startX + (vt.targetX - vt.startX) * t;
            vt.mesh.position.z = vt.startZ + (vt.targetZ - vt.startZ) * t;
          }
        });
      } else {
        // Animation Complete: resolve positions and clean up merged
        const remainingVisuals: VisualTile[] = [];

        this.visualTiles.forEach((vt) => {
          if (vt.mergedIntoId !== undefined) {
            // Remove merging tiles and dispose only custom topMat
            this.threeScene.remove(vt.mesh);
            if (Array.isArray(vt.mesh.material)) {
              const topMat = vt.mesh.material[2];
              if (topMat) topMat.dispose();
            } else if (vt.mesh.material) {
              vt.mesh.material.dispose();
            }
          } else {
            // Set exact position
            vt.mesh.position.x = vt.targetX;
            vt.mesh.position.z = vt.targetZ;
            vt.mesh.scale.set(1.0, 1.0, 1.0);
            vt.isSpawning = false;
            remainingVisuals.push(vt);
          }
        });

        this.visualTiles = remainingVisuals;

        // Create the newly merged tiles and play scale-pop animation
        let hadMerges = false;
        for (let x = 0; x < 4; x++) {
          for (let y = 0; y < 4; y++) {
            const tile = this.board.cells[x][y];
            if (tile) {
              // If the logic tile is not present in our remaining visuals, it was just created by a merge!
              const exists = this.visualTiles.some(vt => vt.id === tile.id);
              if (!exists) {
                const mesh = this.create3DTileMesh(tile.value);
                const pos = this.getCell3DPosition(x, y);
                mesh.position.set(pos.x, 0.25, pos.z);
                mesh.scale.set(0.8, 0.8, 0.8); // start slightly small
                this.threeScene.add(mesh);

                this.visualTiles.push({
                  id: tile.id,
                  value: tile.value,
                  mesh,
                  gridX: x,
                  gridY: y,
                  startX: pos.x,
                  startZ: pos.z,
                  targetX: pos.x,
                  targetZ: pos.z,
                  scale: 0.8,
                  isSpawning: false,
                  isMerging: true
                });
                hadMerges = true;
              }
            }
          }
        }

        // Trigger Pop Phase
        this.animState = 'popping';
        this.animProgress = 0;

        if (hadMerges) {
          SoundSynth.playTone(420, 0.12, 'sine', 0.12);
        }
      }
    } else if (this.animState === 'popping') {
      this.animProgress += deltaSeconds * (1 / this.popDuration);
      if (this.animProgress < 1.0) {
        const t = this.animProgress;
        this.visualTiles.forEach((vt) => {
          if (vt.isMerging) {
            // Bounce/Pop: scale goes from 0.8 -> 1.25 -> 1.0
            const scale = 1.0 + Math.sin(t * Math.PI) * 0.25;
            vt.mesh.scale.set(scale, scale, scale);
          } else if (vt.isSpawning) {
            // Spawn: scale goes from 0 -> 1.0
            vt.mesh.scale.set(t, t, t);
          }
        });
      } else {
        // Reset all scale and state to stable idle
        this.visualTiles.forEach((vt) => {
          vt.mesh.scale.set(1.0, 1.0, 1.0);
          vt.isMerging = false;
          vt.isSpawning = false;
        });

        this.animState = 'idle';

        // Check Victory & Game Over conditions only when animations stop
        if (this.board.won && !this.board.keepPlaying) {
          this.lifecycleState = 'levelComplete';
          if (this.threeCanvas) this.threeCanvas.style.display = 'none';
          SoundSynth.playTone(550, 0.3, 'sine', 0.15);
          this.overlays.showVictory(
            'VICTORY!',
            'YOU CREATED THE 2048 TILE! CONTINUING GAME IN SANDBOX MODE WILL ALLOW YOU TO MERGE EVEN HIGHER.',
            () => {
              this.board.keepPlaying = true;
              this.startGameplay();
            },
            () => this.returnToHub()
          );
        } else if (this.board.over) {
          this.lifecycleState = 'gameOver';
          if (this.threeCanvas) this.threeCanvas.style.display = 'none';
          SoundSynth.playTone(180, 0.4, 'sawtooth', 0.12);
          this.overlays.showGameOver(
            this.board.score,
            () => this.resetGameplay(),
            () => this.returnToHub()
          );
        } else if (this.queuedDirection !== null) {
          const dir = this.queuedDirection;
          this.queuedDirection = null;
          this.executeMove(dir);
        }
      }
    }

    // 3. Render Three.js scene
    if (this.threeRenderer && this.threeScene && this.threeCamera) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // --- Complete Cleanup to Prevent Memory Leaks ---
  public destroySceneResources(): void {
    // 1. Remove resize handler
    this.scale.off('resize', this.handleResize, this);

    // 2. Remove Three.js canvas overlay from DOM
    if (this.threeCanvas && this.threeCanvas.parentElement) {
      this.threeCanvas.parentElement.removeChild(this.threeCanvas);
    }

    // 3. Dispose dynamic canvas textures
    for (const key in this.textureCache) {
      if (Object.prototype.hasOwnProperty.call(this.textureCache, key)) {
        this.textureCache[key].dispose();
      }
    }
    this.textureCache = {};

    // 4. Dispose visual tiles custom topMat and clear array
    this.visualTiles.forEach((vt) => {
      this.threeScene.remove(vt.mesh);
      if (Array.isArray(vt.mesh.material)) {
        const topMat = vt.mesh.material[2];
        if (topMat) topMat.dispose();
      } else if (vt.mesh.material) {
        vt.mesh.material.dispose();
      }
    });
    this.visualTiles = [];

    // Explicitly dispose of shared/cached class-level tile geometry & materials
    if (this.sharedTileGeometry) {
      this.sharedTileGeometry.dispose();
      this.sharedTileGeometry = null;
    }
    if (this.sharedSideMaterial) {
      this.sharedSideMaterial.dispose();
      this.sharedSideMaterial = null;
    }

    // 5. Traverse scene to dispose board meshes
    if (this.threeScene) {
      this.threeScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        } else if (object instanceof THREE.LineSegments) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(m => m.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    }

    // 6. Dispose WebGLRenderer
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
    }
  }
}
