# Handoff Report — Hextris Memory Leak and Collapse Crash Fixes

## 1. Observation

### WebGL Memory Leak
* **File Path**: `src/scenes/HextrisScene.ts`
* **Definition**: `destroySceneResources()` is defined on line 1198.
* **Grep Result**: A global grep search for `destroySceneResources` returned only one reference:
  ```json
  {"File":"/Users/apexclaw/Projects/weekly-game-factory/src/scenes/HextrisScene.ts","LineNumber":1198,"LineContent":"  public destroySceneResources() {"}
  ```
  This confirmed the Forensic Auditor's finding that `destroySceneResources()` was never registered to Phaser's scene shutdown/destroy events, nor called anywhere else in the code, causing WebGL resources to leak when exiting Hextris.

### Collapse Logic Crash
* **File Path**: `src/scenes/HextrisScene.ts`
* **Line Number**: ~793-796
* **Buggy Code**:
  ```typescript
  this.mainHex.blocks[side].splice(j, 1);
  j--;
  if (j < lowestDeletedIndex) lowestDeletedIndex = j;
  ```
* **Crash Context**: When `j = 0` was spliced, decrementing it resulted in `j = -1`, setting `lowestDeletedIndex` to `-1`. When the collapse loop ran:
  ```typescript
  for (let j = lowestDeletedIndex; j < this.mainHex.blocks[side].length; j++) {
    this.mainHex.blocks[side][j].settled = false;
  }
  ```
  It attempted to read `this.mainHex.blocks[side][-1]`, which is undefined, and set `settled = false`, resulting in a runtime crash: `TypeError: Cannot set properties of undefined (setting 'settled')`.

---

## 2. Logic Chain

1. **Memory Leak Fix**:
   - Because `destroySceneResources()` was never invoked, we needed to register it to Phaser scene transition/exit events.
   - Phaser 3 uses `Phaser.Scenes.Events.SHUTDOWN` (scene stopped) and `Phaser.Scenes.Events.DESTROY` (scene destroyed) to manage cleanup.
   - We registered both listeners inside `create()` using `this.events.once(...)` to align with the standard patterns seen in other games (e.g. `TwoZeroFourEightScene.ts`).
   - Because `SHUTDOWN` and `DESTROY` can both trigger cleanup in succession, calling `destroySceneResources()` twice would trigger duplicate `.dispose()` calls on already disposed Three.js materials/geometries, which is unsafe.
   - To make it idempotent, we introduced a `resourcesDestroyed` flag property on `HextrisScene`.
   - `destroySceneResources()` checks `resourcesDestroyed`, returns early if true, sets it to true, and nulls out references to disposed objects.
   - `init()` resets `resourcesDestroyed = false` upon scene entry/restart so new runs are cleanly managed.

2. **Crash Fix**:
   - We moved the `lowestDeletedIndex` tracking to execute before decrementing `j` (and before/after splicing, ensuring it references the correct element index in the collapse loop).
   - This prevents `lowestDeletedIndex` from ever becoming `-1` when the first element of a lane is deleted, ensuring the gravity-collapse loop only iterates over valid indices (>= 0).

---

## 3. Caveats

* **Timing Issues in Other Games**: The Puppeteer touch tests for 2048 (`npm run touch:2048`) occasionally report failure because `midDragState.animState` is `'idle'` instead of `'sliding'`. This flakiness is due to Puppeteer timing in a headless local CPU environment and is unrelated to Hextris changes.

---

## 4. Conclusion

* The WebGL resource memory leak in Hextris has been successfully fixed by registering `destroySceneResources()` to Phaser's lifecycle events (`SHUTDOWN` and `DESTROY`).
* Idempotency protection prevents double-disposal runtime warnings or errors.
* The collapse gravity logic crash in Hextris has been resolved, enabling matching and stacking tests to execute to completion.

---

## 5. Verification Method

To verify these fixes:
1. **Compilation**:
   Run the TypeScript build to verify zero type or compiler errors:
   ```bash
   npm run build
   ```
   *Result*: Built successfully in 7.54s.
2. **Hextris Verification Tests**:
   Run the Hextris gesture and playtests:
   ```bash
   npm run touch:hextris
   ```
   *Result*: Successfully passed including matching, stacking, and returning to hub checks:
   ```json
   "gameplayVerification": {
     "stackingSuccess": true,
     "matchingSuccess": true,
     "scoreAfterMatch": 18,
     "finalBlocksCount": 0
   },
   "checks": {
     "correctScene": true,
     "startedGameplay": true,
     "rotatedLeft": true,
     "rotatedRight": true,
     "noPageErrors": true,
     "returnedToHub": true,
     "stackingSuccess": true,
     "matchingSuccess": true
   }
   ```
