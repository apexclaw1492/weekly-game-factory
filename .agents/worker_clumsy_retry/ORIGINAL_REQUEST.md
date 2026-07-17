## 2026-07-12T03:01:24Z

You are a Worker. The previous implementation for Clumsy Bird (Milestone 2) failed the Forensic Audit with an INTEGRITY VIOLATION due to a memory leak in cleanupThree(). Additionally, the reviewer noted a double-flapping bug.

Your task is to fix these issues in `src/scenes/ClumsyBirdScene.ts`:

1. **GridHelper Cleanup**:
   - The Forensic Auditor reported the following integrity violation:
     "The THREE.GridHelper created in the scene leaks its internal geometry and material because they are not disposed of during cleanupThree()."
   - To fix this, you must dispose of the `GridHelper` geometry and material in `cleanupThree()`.
     For example:
     ```typescript
     if (this.gridHelper) {
       this.threeScene.remove(this.gridHelper);
       this.gridHelper.geometry.dispose();
       if (Array.isArray(this.gridHelper.material)) {
         this.gridHelper.material.forEach((m) => m.dispose());
       } else {
         this.gridHelper.material.dispose();
       }
     }
     ```

2. **Double-Flapping Bug**:
   - Reviewer 2 reported:
     "A single touch input currently triggers two flaps (on down-press and up-release) due to parallel checks of gestures.tap and touch.justStarted in handleArcadeInput."
   - Review `handleArcadeInput()` in `src/scenes/ClumsyBirdScene.ts`. Align the tap/touch check so a single press only triggers exactly one flap (e.g. use only `frame.touch.justStarted` or ensure it does not double-count gestures/touches on a single frame).

After implementing these fixes, run the following verification checks:
- Run `npm run build` to ensure there are no compilation errors.
- Run `npm run touch:clumsy` to verify that Clumsy Bird playtest and gesture tests pass.
- Run `npm run touch:all` to ensure no regression in other games.

Write a detailed handoff.md in your working directory (.agents/worker_clumsy_retry) documenting your changes, verification results, and any details needed by the reviewer.

> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
