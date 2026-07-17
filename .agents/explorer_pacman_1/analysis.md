# Milestone 4 Analysis: Pac-Man 3D Maze Instancing & Disposal

## Executive Summary
This report analyzes `src/scenes/PacManScene.ts` and the legacy codebase to plan Milestone 4 (Pac-Man 3D Maze Instancing & Disposal).
The investigation revealed:
1. **Critical Memory Leak**: The current `resetGameplay()` method recreates all geometries/materials via `buildMaze3D()` and appends them to class-level disposal arrays without clearing or disposing the previous ones.
2. **Broken Touch Controls**: The touch-drag steering logic compares `frame.gestures.dragVectorX/Y` (normalized to `[-1.0, 1.0]`) against a pixel-based threshold of `18`, rendering drag steering completely non-functional.
3. **InstancedMesh Strategy**: By using `THREE.InstancedMesh`, we can consolidate the walls, dots, and pellets into three single draw calls. Dot eating can be handled by scaling matrices to zero, and pellet pulsation can be achieved by updating the instance matrices in the main update loop.
4. **Interface Integration**: The entity interfaces must be modified to track instance indices and logical "eaten" flags, ensuring the QA State Reporting functions correctly without referencing removed meshes.

---

## 1. THREE.InstancedMesh Optimization Strategy
Currently, every wall, dot, and pellet in `src/scenes/PacManScene.ts` is an individual `THREE.Mesh` added to the scene. For a typical layout, this creates hundreds of draw calls.

### Wall, Dot, and Pellet Consolidation
We will instantiate three `THREE.InstancedMesh` groups during initialization:
- **Walls**: `wallInstancedMesh = new THREE.InstancedMesh(wallGeo, wallMat, wallCount)`
- **Dots**: `dotInstancedMesh = new THREE.InstancedMesh(dotGeo, dotMat, dotCount)`
- **Pellets**: `pelletInstancedMesh = new THREE.InstancedMesh(pelletGeo, pelletMat, pelletCount)`

### Setup and Grid Parsing
To build the instanced meshes, we must first parse the grid to calculate the exact counts, then instantiate the `InstancedMesh` objects, and finally set the positions of the instances using `setMatrixAt()`.

#### Proposed Implementation Concept:
```typescript
private buildInstancedMaze() {
  let wallCount = 0;
  let dotCount = 0;
  let pelletCount = 0;

  // 1. First Pass: Count elements
  for (let row = 0; row < MAZE_GRID.length; row++) {
    const line = MAZE_GRID[row];
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      if (char === '#') wallCount++;
      else if (char === '.') dotCount++;
      else if (char === 'p') pelletCount++;
    }
  }

  // 2. Instantiate InstancedMesh objects using shared geometries/materials
  this.wallInstancedMesh = new THREE.InstancedMesh(this.wallGeo, this.wallMat, wallCount);
  this.dotInstancedMesh = new THREE.InstancedMesh(this.dotGeo, this.dotMat, dotCount);
  this.pelletInstancedMesh = new THREE.InstancedMesh(this.pelletGeo, this.pelletMat, pelletCount);

  this.threeScene.add(this.wallInstancedMesh);
  this.threeScene.add(this.dotInstancedMesh);
  this.threeScene.add(this.pelletInstancedMesh);

  // 3. Second Pass: Set instance positions
  let wallIdx = 0;
  let dotIdx = 0;
  let pelletIdx = 0;

  const tempMatrix = new THREE.Matrix4();
  const tempPosition = new THREE.Vector3();

  for (let row = 0; row < MAZE_GRID.length; row++) {
    const line = MAZE_GRID[row];
    for (let col = 0; col < line.length; col++) {
      const char = line[col];
      const x = (col - 7) * CELL_WIDTH;
      const z = (row - 7) * CELL_WIDTH;

      if (char === '#') {
        tempPosition.set(x, 0.3, z);
        tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z);
        this.wallInstancedMesh.setMatrixAt(wallIdx++, tempMatrix);
      } else if (char === '.') {
        tempPosition.set(x, 0.15, z);
        tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z);
        this.dotInstancedMesh.setMatrixAt(dotIdx, tempMatrix);
        
        this.dots.push({
          gridX: col,
          gridZ: row,
          instanceIndex: dotIdx++,
          eaten: false
        });
      } else if (char === 'p') {
        tempPosition.set(x, 0.15, z);
        tempMatrix.makeTranslation(tempPosition.x, tempPosition.y, tempPosition.z);
        this.pelletInstancedMesh.setMatrixAt(pelletIdx, tempMatrix);
        
        this.pellets.push({
          gridX: col,
          gridZ: row,
          instanceIndex: pelletIdx++,
          eaten: false
        });
      } else if (char === 'S') {
        // Initialize Pac-Man's normal Mesh...
      }
    }
  }

  // Mark matrices for upload
  this.wallInstancedMesh.instanceMatrix.needsUpdate = true;
  this.dotInstancedMesh.instanceMatrix.needsUpdate = true;
  this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;
}
```

---

## 2. Eating States & Dynamic Updates
Because instanced meshes cannot have individual elements deleted from the Scene, we must hide eaten elements using matrix transformations.

### Hiding Eaten Elements
We recommend **scaling the instance matrix to `(0, 0, 0)`**. This is cleaner than moving elements out of bounds since it leaves no stray colliders or floating items in the rendering space.
Alternatively, setting position to a deep out-of-bounds y-coordinate (e.g. `y = -999.0`) is a bulletproof backup.

#### Dynamic Scale/Position Update Method:
```typescript
private hideInstance(instancedMesh: THREE.InstancedMesh, index: number) {
  const tempMatrix = new THREE.Matrix4();
  // Construct a zero-scale matrix
  tempMatrix.makeScale(0, 0, 0);
  instancedMesh.setMatrixAt(index, tempMatrix);
  instancedMesh.instanceMatrix.needsUpdate = true;
}
```

### Tracking Eating State
We redefine the interfaces to store the index mapping and state:
```typescript
interface DotEntity {
  gridX: number;
  gridZ: number;
  instanceIndex: number;
  eaten: boolean;
}

interface PelletEntity {
  gridX: number;
  gridZ: number;
  instanceIndex: number;
  eaten: boolean;
}
```
When Pac-Man intersects grid coordinate `(gridX, gridZ)`:
1. Search `this.dots` (or `this.pellets`) for a match where `!eaten`.
2. Set `dot.eaten = true`.
3. Call `this.hideInstance(this.dotInstancedMesh, dot.instanceIndex)`.
4. Add to score and play sounds.

### Dynamic Pellet Pulsation
In the scene's update loop, we can pulsate only the active (non-eaten) pellets by adjusting their scale:
```typescript
// Inside update()
if (this.threeRenderer && this.threeScene && this.threeCamera) {
  const pulse = 1.0 + 0.2 * Math.sin(time * 0.008);
  const tempMatrix = new THREE.Matrix4();
  const tempPosition = new THREE.Vector3();
  const tempRotation = new THREE.Quaternion();
  const tempScale = new THREE.Vector3();

  this.pellets.forEach((p) => {
    if (!p.eaten) {
      tempPosition.set((p.gridX - 7) * CELL_WIDTH, 0.15, (p.gridZ - 7) * CELL_WIDTH);
      tempScale.set(pulse, pulse, pulse);
      tempMatrix.compose(tempPosition, tempRotation, tempScale);
      this.pelletInstancedMesh.setMatrixAt(p.instanceIndex, tempMatrix);
    }
  });
  this.pelletInstancedMesh.instanceMatrix.needsUpdate = true;

  this.threeRenderer.render(this.threeScene, this.threeCamera);
}
```

---

## 3. WebGL Resource Disposal & Memory Leak Prevention
The current resource disposal logic in `PacManScene.ts` contains a major architecture flaw. 

### Current Leak Analysis
During `resetGameplay()`, the code clears arrays but creates a **brand new set** of geometries and materials by calling `buildMaze3D()`.
```typescript
// Inside resetGameplay()
this.buildMaze3D();
```
Inside `buildMaze3D()`:
```typescript
const wallGeo = new THREE.BoxGeometry(0.96, 0.6, 0.96);
this.geometriesToDispose.push(wallGeo);
// ... similarly for wallMat, dotGeo, dotMat, pelletGeo, pelletMat
```
These are appended to `this.geometriesToDispose` and `this.materialsToDispose`. However, the old geometries and materials from the previous round are never removed from the disposal lists or cleaned up on the GPU. Playing the game and restarting multiple times continuously leaks GPU memory.

### Solution: Shared Geometries and Materials
We must refactor geometries and materials to be created **exactly once** (in `create()`), cached in instance variables, and reused across game resets.

1. **Class-level Properties**:
   ```typescript
   private wallGeo!: THREE.BoxGeometry;
   private wallMat!: THREE.MeshStandardMaterial;
   private dotGeo!: THREE.SphereGeometry;
   private dotMat!: THREE.MeshStandardMaterial;
   private pelletGeo!: THREE.SphereGeometry;
   private pelletMat!: THREE.MeshStandardMaterial;
   private pacmanGeo!: THREE.SphereGeometry;
   private pacmanMat!: THREE.MeshStandardMaterial;
   // Shared materials/geometries for ghosts
   private ghostBodyGeom!: THREE.CylinderGeometry;
   private ghostDomeGeom!: THREE.SphereGeometry;
   private ghostEyeGeom!: THREE.SphereGeometry;
   private ghostPupilGeom!: THREE.SphereGeometry;
   private ghostEyeWhiteMat!: THREE.MeshBasicMaterial;
   private ghostPupilBlueMat!: THREE.MeshBasicMaterial;
   ```

2. **Creation (Once in `create()`)**:
   Instantiate all of the above once and push them to the `geometriesToDispose` and `materialsToDispose` arrays.

3. **Gameplay Reset (`resetGameplay()`)**:
   Instead of recreating geometries and materials, simply remove the instanced meshes and entities from the scene:
   ```typescript
   if (this.wallInstancedMesh) this.threeScene.remove(this.wallInstancedMesh);
   if (this.dotInstancedMesh) this.threeScene.remove(this.dotInstancedMesh);
   if (this.pelletInstancedMesh) this.threeScene.remove(this.pelletInstancedMesh);
   
   this.dots = [];
   this.pellets = [];
   
   // Clean up ghosts and Pac-Man mesh (but reuse their materials/geometries)
   this.ghosts.forEach(g => this.threeScene.remove(g.mesh));
   this.ghosts = [];
   if (this.pacman) this.threeScene.remove(this.pacman.mesh);
   ```
   Then call `buildInstancedMaze()` which uses the pre-created class-level geometries and materials.

4. **Scene Shutdown / Destruction (`destroySceneResources()`)**:
   Clean up everything safely.
   ```typescript
   public destroySceneResources(): void {
     // 1. Remove listeners
     this.scale.off('resize', this.handleResize, this);

     // 2. Remove DOM Canvas
     if (this.threeCanvas && this.threeCanvas.parentElement) {
       this.threeCanvas.parentElement.removeChild(this.threeCanvas);
     }

     // 3. Clean up scene tree
     if (this.threeScene) {
       this.threeScene.traverse((object) => {
         if (object instanceof THREE.Mesh) {
           this.threeScene.remove(object);
         }
       });
     }

     // 4. Dispose all shared geometries and materials
     this.geometriesToDispose.forEach((g) => g.dispose());
     this.geometriesToDispose = [];

     this.materialsToDispose.forEach((m) => m.dispose());
     this.materialsToDispose = [];

     // 5. Dispose Renderer
     if (this.threeRenderer) {
       this.threeRenderer.dispose();
     }
   }
   ```

---

## 4. Touch Controls & Steering Fixing
The touch controls in `PacManScene.ts` are completely broken due to a threshold scaling bug.

### Diagnostic Analysis
At line 917 of `PacManScene.ts`:
```typescript
if (frame.touch.active) {
  const threshold = 18;
  if (Math.abs(frame.gestures.dragVectorX) > Math.abs(frame.gestures.dragVectorY)) {
    if (frame.gestures.dragVectorX > threshold) {
      this.nextDirX = 1;
...
```
However, in `InputRuntime.ts` (lines 375-376), the drag vectors are normalized relative to half the canvas dimensions:
```typescript
nextFrame.gestures.dragVectorX = Math.max(-1, Math.min(1, dx / (this.canvas.width / 2)));
nextFrame.gestures.dragVectorY = Math.max(-1, Math.min(1, dy / (this.canvas.height / 2)));
```
Because the drag vectors are bounded between `-1.0` and `1.0`, they can **never** exceed the threshold of `18`. 

### The Solution
Instead of checking `frame.gestures.dragVectorX/Y`, we should check `frame.touch.dx` and `frame.touch.dy`, which are the actual raw pixel offset values since the touch gesture started:
```typescript
// Proposed correction:
if (frame.touch.active) {
  const threshold = 18; // 18 pixels
  const dx = frame.touch.dx;
  const dy = frame.touch.dy;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > threshold) {
      this.nextDirX = 1;
      this.nextDirZ = 0;
    } else if (dx < -threshold) {
      this.nextDirX = -1;
      this.nextDirZ = 0;
    }
  } else {
    if (dy > threshold) {
      this.nextDirX = 0;
      this.nextDirZ = 1;
    } else if (dy < -threshold) {
      this.nextDirX = 0;
      this.nextDirZ = -1;
    }
  }
}
```
This restores the developer's original intent perfectly and enables intuitive drag steering on mobile devices.

---

## 5. Interface Contracts & QA State Reporting
We reviewed `src/runtime/GameLifecycle.ts` and `src/runtime/ArcadeInputFrame.ts`. The interface contract implementation in `PacManScene` is clean, but the QA state must be updated to account for instanced dots.

### Updating `getGameplayStateForQA()`
With instanced meshes, `this.dots` will not be spliced. Instead, we must filter by `eaten` state:
```typescript
public getGameplayStateForQA(): GameplayQAState {
  const dotsRemaining = this.dots.filter(d => !d.eaten).length;
  
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
    primaryActionCount: dotsRemaining, // Active dots count
    enemyOrHazardCount: this.ghosts.length,
    objectiveProgress: this.totalDots > 0 ? (this.totalDots - dotsRemaining) / this.totalDots : 1.0,
    messages: [
      `Score: ${this.score}`,
      `Lives: ${this.lives}`,
      `Dots remaining: ${dotsRemaining}`,
      `Frightened mode: ${this.frightenedTime > 0 ? 'ACTIVE' : 'INACTIVE'}`
    ]
  };
}
```
This is fully compliant with the `GameplayQAState` interface.
