# Milestone 4 Plan: Pac-Man 3D Maze Instancing, Disposal & Controls

## 1. Executive Summary
This report analyzes `src/scenes/PacManScene.ts` and the legacy code in `public-safe/games/pac-man/` to plan Milestone 4 (Pac-Man 3D Maze Instancing & Disposal). We identify key performance bottlenecks, two critical bugs (one breaking WebGL rendering upon eating dots, and one breaking touch controls), and outline a detailed technical roadmap to optimize rendering with `THREE.InstancedMesh`, fix controls using normalized drag thresholds, ensure leak-free disposal, and maintain QA reporting compliance.

---

## 2. Technical Findings & Analysis

### A. Optimization: `THREE.InstancedMesh` for Maze Elements
Currently, `PacManScene.ts` instantiates a unique `THREE.Mesh` for every wall, dot, and power pellet in the 3D maze.
- **Current Rendering Profile**:
  - **Walls**: 104 walls in `MAZE_GRID` = 104 draw calls.
  - **Dots**: ~116 dots in `MAZE_GRID` = 116 draw calls.
  - **Power Pellets**: 4 pellets = 4 draw calls.
  - Total static elements = 224 meshes resulting in 224 draw calls. This represents unnecessary rendering overhead for mobile browsers and low-spec systems.
- **Proposed Optimization via `InstancedMesh`**:
  - Introduce exactly **three** `THREE.InstancedMesh` structures:
    1. `wallsInstancedMesh` (`THREE.BoxGeometry`, count = 104)
    2. `dotsInstancedMesh` (`THREE.SphereGeometry`, count = 116)
    3. `pelletsInstancedMesh` (`THREE.SphereGeometry`, count = 4)
  - This collapses the draw call count from **224 to 3** for the static board.
- **Pulsating Animation for Pellets**:
  - Power pellets pulsate based on time: `p.mesh.scale.set(pulse, pulse, pulse)`.
  - With an instanced mesh, we can update individual matrix scales in the `update` loop:
    ```typescript
    const pulse = 1.0 + 0.2 * Math.sin(time * 0.008);
    const dummy = new THREE.Object3D();
    this.pellets.forEach((p) => {
      if (p.active) {
        dummy.position.set((p.gridX - 7) * CELL_WIDTH, 0.15, (p.gridZ - 7) * CELL_WIDTH);
        dummy.scale.set(pulse, pulse, pulse);
      } else {
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
      }
      dummy.updateMatrix();
      this.pelletsInstancedMesh.setMatrixAt(p.instanceIndex, dummy.matrix);
    });
    this.pelletsInstancedMesh.instanceMatrix.needsUpdate = true;
    ```

---

### B. Tracking Eating States & Fixing WebGL Disposal Bug
1. **Critical WebGL Bug in Legacy Code**:
   In `checkEating()`, when a dot or pellet is eaten, the scene performs the following logic:
   ```typescript
   this.threeScene.remove(dot.mesh);
   dot.mesh.geometry.dispose();
   (dot.mesh.material as THREE.Material).dispose();
   ```
   Because all dots share the **same** geometry (`dotGeo`) and material (`dotMat`), calling `.dispose()` on the first eaten dot's geometry/material **destroys the GPU buffers for all remaining dots**. Consequently, when subsequent dots are rendered, they point to a disposed geometry, leading to rendering errors or empty spaces.
2. **Instanced Mesh State Management**:
   Under instancing, elements cannot be individual scene nodes. To hide eaten dots/pellets:
   - Mark the entity's logical status: `active = false`.
   - Update its index in the `InstancedMesh` to **scale `(0, 0, 0)` and position it out of bounds (`y = -100`)**.
   - Set the instance matrix update flag: `instancedMesh.instanceMatrix.needsUpdate = true`.
   This bypasses GPU buffer disposal during gameplay, resolving the WebGL crash and avoiding runtime garbage collection pauses.

---

### C. WebGL Resource Disposal & Reset Optimization
- **The Issue with Scene Resets**:
  Currently, `resetGameplay()` destroys all meshes, disposes of all geometries/materials, and calls `buildMaze3D()` to recreate them. Re-allocating GPU buffers on every death or retry causes stuttering.
- **Proposed Reset Logic**:
  Keep geometries, materials, and `InstancedMesh` instances alive for the lifetime of the scene. During `resetGameplay()`, do NOT dispose of geometries or materials. Instead:
  1. Re-initialize the active state of all dots and pellets.
  2. Restore original transformation matrices for all dot/pellet instances.
  3. Reset Pac-Man and Ghost entities back to their start coordinates.
  4. Flag the instanced mesh attributes as needing update.
- **Clean Scene Shutdown**:
  When Phaser triggers `SHUTDOWN` or `DESTROY` events, perform a thorough cleanup in `destroySceneResources()`:
  - Remove window/Phaser resize event handlers.
  - Remove the overlaid `threeCanvas` element from the DOM.
  - Call `.dispose()` on all geometries, materials, and the WebGL renderer.
  - Nullify scene, camera, and renderer references to allow garbage collection.

---

### D. Touch Control & Steering Fix
1. **The Silent Drag-Steer Bug**:
   In `handleArcadeInput()`, touch dragging is processed as follows:
   ```typescript
   if (frame.touch.active) {
     const threshold = 18;
     if (Math.abs(frame.gestures.dragVectorX) > Math.abs(frame.gestures.dragVectorY)) {
       if (frame.gestures.dragVectorX > threshold) { ... }
   ```
   However, `ArcadeInputFrame.ts` defines `dragVectorX` and `dragVectorY` as values **normalized between `-1.0` and `1.0`** (calculated as `dx / (canvasWidth / 2)`).
   Since `dragVectorX` will never exceed `1.0`, it can **never** satisfy the `> 18` condition. Touch dragging is completely dead in the current code.
2. **Resolution**:
   Update the steering threshold to a normalized ratio, e.g., `0.15` (meaning the user has dragged at least 15% of the screen half-width/height). This makes controls responsive and functional on touch devices.

---

### E. Interface Contracts & QA State Reporting
- **Interface compliance**: `PacManScene.ts` implements `GameLifecycle`.
- **QA State Compliance**:
  - `getGameplayStateForQA()` exposes `primaryActionCount` (dots remaining) and `objectiveProgress` (percentage eaten).
  - If dots are not removed from the array but marked inactive, simply returning `this.dots.length` will report a constant, static count, breaking automated QA validation.
  - **Correction**: Update `getGameplayStateForQA()` to calculate active dots dynamically:
    ```typescript
    const activeDotsCount = this.dots.filter(d => d.active).length;
    // ...
    primaryActionCount: activeDotsCount,
    objectiveProgress: this.totalDots > 0 ? (this.totalDots - activeDotsCount) / this.totalDots : 1.0,
    ```

---

## 3. Implementation Proposal (Design Sketch)

Here is the blueprint for the refactored `PacManScene.ts`:

### Data Structures
```typescript
interface DotEntity {
  gridX: number;
  gridZ: number;
  instanceIndex: number;
  active: boolean;
}

interface PelletEntity {
  gridX: number;
  gridZ: number;
  instanceIndex: number;
  active: boolean;
}
```

### Instanced Mesh Setup (`buildMaze3D`)
```typescript
// Geometries & Materials created once during scene create/init
private buildMaze3D() {
  // Pre-calculate sizes
  let wallCount = 0;
  let dotCount = 0;
  let pelletCount = 0;

  for (let r = 0; r < MAZE_GRID.length; r++) {
    for (let c = 0; c < MAZE_GRID[r].length; c++) {
      const char = MAZE_GRID[r][c];
      if (char === '#') wallCount++;
      else if (char === '.') dotCount++;
      else if (char === 'p') pelletCount++;
    }
  }

  // Create Instanced Meshes
  const wallGeo = new THREE.BoxGeometry(0.96, 0.6, 0.96);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x00c805, metalness: 0.9, roughness: 0.1 });
  this.wallsInstancedMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount);
  this.geometriesToDispose.push(wallGeo);
  this.materialsToDispose.push(wallMat);

  const dotGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const dotMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  this.dotsInstancedMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotCount);
  this.geometriesToDispose.push(dotGeo);
  this.materialsToDispose.push(dotMat);

  const pelletGeo = new THREE.SphereGeometry(0.2, 8, 8);
  const pelletMat = new THREE.MeshStandardMaterial({ color: 0xffff00, roughness: 0.2, metalness: 0.8 });
  this.pelletsInstancedMesh = new THREE.InstancedMesh(pelletGeo, pelletMat, pelletCount);
  this.geometriesToDispose.push(pelletGeo);
  this.materialsToDispose.push(pelletMat);

  const dummy = new THREE.Object3D();
  let wallIdx = 0, dotIdx = 0, pelletIdx = 0;

  for (let row = 0; row < MAZE_GRID.length; row++) {
    const line = MAZE_GRID[row];
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const x = (col - 7) * CELL_WIDTH;
      const z = (row - 7) * CELL_WIDTH;

      if (char === '#') {
        dummy.position.set(x, 0.3, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.wallsInstancedMesh.setMatrixAt(wallIdx++, dummy.matrix);
      } else if (char === '.') {
        dummy.position.set(x, 0.15, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.dotsInstancedMesh.setMatrixAt(dotIdx, dummy.matrix);
        this.dots.push({ gridX: col, gridZ: row, instanceIndex: dotIdx++, active: true });
      } else if (char === 'p') {
        dummy.position.set(x, 0.15, z);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        this.pelletsInstancedMesh.setMatrixAt(pelletIdx, dummy.matrix);
        this.pellets.push({ gridX: col, gridZ: row, instanceIndex: pelletIdx++, active: true });
      } else if (char === 'S') {
        // Setup Pac-Man Mesh as before...
      }
    }
  }

  this.wallsInstancedMesh.instanceMatrix.needsUpdate = true;
  this.dotsInstancedMesh.instanceMatrix.needsUpdate = true;
  this.pelletsInstancedMesh.instanceMatrix.needsUpdate = true;

  this.threeScene.add(this.wallsInstancedMesh);
  this.threeScene.add(this.dotsInstancedMesh);
  this.threeScene.add(this.pelletsInstancedMesh);
  
  this.totalDots = this.dots.length;
}
```

### Checking Eating Logic
```typescript
private checkEating(gridX: number, gridZ: number) {
  // Check Dot
  const dot = this.dots.find((d) => d.active && d.gridX === gridX && d.gridZ === gridZ);
  if (dot) {
    dot.active = false;
    
    // Scale matrix to 0 and shift out of bounds
    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, -100, 0);
    this.dotsInstancedMesh.setMatrixAt(dot.instanceIndex, zeroMatrix);
    this.dotsInstancedMesh.instanceMatrix.needsUpdate = true;

    this.score += 10;
    this.scoreText.setText(`SCORE: ${this.score}`);
    SoundSynth.playTone(450, 0.05, 'sine', 0.05);

    if (this.dots.every(d => !d.active) && this.pellets.every(p => !p.active)) {
      this.handleVictory();
    }
    return;
  }

  // Check Pellet
  const pellet = this.pellets.find((p) => p.active && p.gridX === gridX && p.gridZ === gridZ);
  if (pellet) {
    pellet.active = false;

    const zeroMatrix = new THREE.Matrix4().makeScale(0, 0, 0).setPosition(0, -100, 0);
    this.pelletsInstancedMesh.setMatrixAt(pellet.instanceIndex, zeroMatrix);
    this.pelletsInstancedMesh.instanceMatrix.needsUpdate = true;

    this.score += 50;
    this.scoreText.setText(`SCORE: ${this.score}`);
    SoundSynth.playTone(600, 0.15, 'triangle', 0.08);

    this.frightenedTime = 7.0;
    this.ghosts.forEach(g => {
      g.bodyMat.color.setHex(0x1e90ff);
      g.speed = 1.8;
    });

    if (this.dots.every(d => !d.active) && this.pellets.every(p => !p.active)) {
      this.handleVictory();
    }
  }
}
```

### Fixed Touch Controls (`handleArcadeInput`)
```typescript
public handleArcadeInput(frame: ArcadeInputFrame): void {
  if (this.lifecycleState !== 'playing') return;

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

  // Correct Touch Dragging using normalized threshold
  if (frame.touch.active) {
    const threshold = 0.15; // 15% of screen boundaries
    const dragX = frame.gestures.dragVectorX;
    const dragY = frame.gestures.dragVectorY;

    if (Math.abs(dragX) > Math.abs(dragY)) {
      if (dragX > threshold) {
        this.nextDirX = 1;
        this.nextDirZ = 0;
      } else if (dragX < -threshold) {
        this.nextDirX = -1;
        this.nextDirZ = 0;
      }
    } else {
      if (dragY > threshold) {
        this.nextDirX = 0;
        this.nextDirZ = 1;
      } else if (dragY < -threshold) {
        this.nextDirX = 0;
        this.nextDirZ = -1;
      }
    }
  }
}
```
