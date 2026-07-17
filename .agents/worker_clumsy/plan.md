# Clumsy Bird Optimizations Plan

## 1. Class-level Properties
We will add class-level properties in `ClumsyBirdScene` to cache the pipe geometry and material:
```typescript
  private pipeInstancedMesh!: THREE.InstancedMesh;
  private pipeGeometry!: THREE.BoxGeometry;
  private pipeMaterial!: THREE.MeshPhongMaterial;
```

And update the `pipes` property to not hold references to individual meshes:
```typescript
  private pipes: Array<{
    z: number;
    gapY: number;
    passed: boolean;
  }> = [];
```

## 2. Geometry and Material Initialization
In `create()`, we will initialize the cached geometry and material once:
```typescript
    // Initialize cached pipe geometry & material
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
```

## 3. Pipe Instancing
In `initPipes()`, we will:
1. Clear the `pipes` array: `this.pipes = [];`
2. Create/reset `this.pipeInstancedMesh`:
   - If `this.pipeInstancedMesh` already exists, remove it from the scene and dispose of it:
     ```typescript
     if (this.pipeInstancedMesh) {
       this.threeScene.remove(this.pipeInstancedMesh);
       this.pipeInstancedMesh.dispose();
     }
     ```
   - Create a new `THREE.InstancedMesh(this.pipeGeometry, this.pipeMaterial, 10)`.
   - Set shadows:
     ```typescript
     this.pipeInstancedMesh.castShadow = true;
     this.pipeInstancedMesh.receiveShadow = true;
     ```
   - Add it to `this.threeScene`.
3. Spawn 5 pipes (which map to 10 instances: index `2*i` is top segment, `2*i + 1` is bottom segment).
4. Set initial logical states in `this.pipes` array.
5. Set initial instance matrices using a dummy `THREE.Object3D`:
   - Position them in 3D.
   - Call `this.pipeInstancedMesh.setMatrixAt(index, dummy.matrix)`.
6. Call `this.updatePipePositions()`.

## 4. Positions Update
In `updatePipePositions()`, we will:
- Define `pipeHeight = 10` and `pipeGapSize = 3.2`.
- Loop over the 5 pipes:
  - For each pipe `i`:
    - Calculate `topY` and `bottomY`.
    - Position `dummy.position.set(0, topY, pipe.z)` for top segment. Call `dummy.updateMatrix()` and `this.pipeInstancedMesh.setMatrixAt(2 * i, dummy.matrix)`.
    - Position `dummy.position.set(0, bottomY, pipe.z)` for bottom segment. Call `dummy.updateMatrix()` and `this.pipeInstancedMesh.setMatrixAt(2 * i + 1, dummy.matrix)`.
- Set `this.pipeInstancedMesh.instanceMatrix.needsUpdate = true`.

## 5. Collision Check
In `update()`, the loop over `this.pipes` handles bounds and score updates. The collision logic itself uses `pipe.gapY` and `pipe.z` and does not query mesh properties. So:
- The bounds check `this.birdZ - this.birdRadius <= pipe.z + pipeHalfW && this.birdZ + this.birdRadius >= pipe.z - pipeHalfW` will continue to work perfectly using `pipe.z`.
- The `topLowerY` and `bottomUpperY` checks will work using `pipe.gapY`.
- The score update checks will work using `pipe.passed` and `pipe.z`.
Thus, the gameplay loop remains fully intact, only reference-free.

## 6. Disposal & Cleanup
In `cleanupThree()`:
- Ensure `this.pipeInstancedMesh` is removed from the scene and disposed:
  ```typescript
  if (this.pipeInstancedMesh) {
    this.threeScene.remove(this.pipeInstancedMesh);
    this.pipeInstancedMesh.dispose();
  }
  ```
- Geometries and materials: Since they are pushed to `geometriesToDispose` and `materialsToDispose` once in `create()`, the existing disposal loop in `cleanupThree()` will dispose of them.
