# Handoff Report — Clumsy Bird Retry Bugfixes

This report documents the resolution of the memory leak in `cleanupThree()` and the double-flapping bug in `handleArcadeInput()` in `src/scenes/ClumsyBirdScene.ts`.

## 1. Observation

### Issues Reported
1. **GridHelper Cleanup Memory Leak**:
   "The THREE.GridHelper created in the scene leaks its internal geometry and material because they are not disposed of during cleanupThree()."
2. **Double-Flapping Bug**:
   "A single touch input currently triggers two flaps (on down-press and up-release) due to parallel checks of gestures.tap and touch.justStarted in handleArcadeInput."

### Code Before Changes (in `src/scenes/ClumsyBirdScene.ts`)
- **Input Checking** (lines 679-682):
  ```typescript
  const jumpAction = frame.actions.jump.justPressed || frame.actions.fire.justPressed;
  const touchTap = frame.gestures.tap || frame.touch.justStarted;

  let shouldFlap = jumpAction || touchTap;
  ```
- **Cleanup** (lines 748-757):
  ```typescript
  if (this.pipeInstancedMesh) {
    this.threeScene.remove(this.pipeInstancedMesh);
    this.pipeInstancedMesh.dispose();
  }

  if (this.threeScene) {
    while (this.threeScene.children.length > 0) {
      this.threeScene.remove(this.threeScene.children[0]);
    }
  }
  ```

### Tool Commands and Test Results (Before Changes)
Running `npm run touch:clumsy` produced:
```json
{
  "started": {
    "sceneKey": "ClumsyBirdScene",
    "waiting": false,
    "playerY": -2.281618572,
    "score": 0,
    "primaryActionCount": 0
  },
  "afterFlap": {
    "sceneKey": "ClumsyBirdScene",
    "waiting": false,
    "playerY": -1.7005786919999997,
    "score": 0,
    "primaryActionCount": 2
  },
  "afterSecondFlap": {
    "sceneKey": "ClumsyBirdScene",
    "waiting": false,
    "playerY": -0.4807188119999989,
    "score": 0,
    "primaryActionCount": 4
  }
}
```
*Note that `primaryActionCount` incremented by 2 per tap gesture (from 0 to 2, and then 2 to 4), confirming the double-flapping bug.*

---

## 2. Logic Chain

1. **GridHelper Cleanup**:
   - The scene creates `this.gridHelper = new THREE.GridHelper(200, 100, 0x00c805, 0x00c805);` in `create()`.
   - `cleanupThree()` failed to dispose of `this.gridHelper`'s geometry and material, which is a known source of WebGL memory leaks.
   - Disposing of `this.gridHelper.geometry` and `this.gridHelper.material` (handling the potential array case) cleans up these resources.

2. **Double-Flapping Bug**:
   - In `InputRuntime.ts`, a tap gesture produces:
     - `frame.touch.justStarted = true` on the frame when touch down starts.
     - `frame.gestures.tap = true` on the frame when the touch is released (tap is recognized).
   - In `ClumsyBirdScene.ts`, `handleArcadeInput()` checked `frame.gestures.tap || frame.touch.justStarted`. Because these fire on separate frames, a single tap action triggered two flaps.
   - Aligning the check to only use `frame.touch.justStarted` ensures that exactly one flap is triggered immediately when the press begins, mirroring the responsive behavior of standard flappy bird games.

---

## 3. Caveats

- We noticed that the full test suite command `npm run touch:all` terminates at `touch:2048` because the 2048 game touch test has a pre-existing failure (`immediateSwipeOnDrag` returns `false`). This is not a regression of our changes, as verified by running all other game tests individually (`touch:f1`, `touch:cargo`, `touch:contra`, `touch:asteroids`, `touch:pong`, `touch:hextris`, `touch:pacman`), which all pass successfully.

---

## 4. Conclusion

- The memory leak has been resolved by properly removing and disposing of `this.gridHelper`'s internal geometry and material inside `cleanupThree()`.
- The double-flapping bug was fixed by updating `handleArcadeInput()` to only use `frame.touch.justStarted` for touch input, which is now verified to increment `primaryActionCount` by exactly 1 per tap.

---

## 5. Verification Method

### Execution Commands
1. **Build Verification**:
   ```bash
   npm run build
   ```
   *Expected result: Successful compilation with no TypeScript errors.*

2. **Clumsy Bird Specific Test**:
   ```bash
   npm run touch:clumsy
   ```
   *Expected output snippet:*
   ```json
   "afterFlap": {
     "sceneKey": "ClumsyBirdScene",
     "waiting": false,
     "playerY": -1.8398833679999984,
     "score": 0,
     "primaryActionCount": 1
   },
   "afterSecondFlap": {
     "sceneKey": "ClumsyBirdScene",
     "waiting": false,
     "playerY": -0.7257568179999981,
     "score": 0,
     "primaryActionCount": 2
   }
   ```
   *Note `primaryActionCount` increments by exactly 1 on each tap.*

### Files to Inspect
- `src/scenes/ClumsyBirdScene.ts` (specifically `handleArcadeInput()` and `cleanupThree()`).
