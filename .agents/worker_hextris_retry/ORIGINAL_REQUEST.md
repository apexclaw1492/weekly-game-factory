## 2026-07-12T07:58:06Z

You are a Worker. The previous implementation for Hextris (Milestone 3) failed the Forensic Audit with an INTEGRITY VIOLATION due to a WebGL resource memory leak on scene exit/shutdown.

Your task is to fix this issue in `src/scenes/HextrisScene.ts`:

1. **Phaser Lifecycle Listener Hooks**:
   - The Forensic Auditor reported the following integrity violation:
     "destroySceneResources() is fully defined but is never registered to Phaser's scene shutdown/destroy events, nor is it called anywhere else in the code. Consequently, when returning to the hub or restarting, all Three.js WebGL objects (geometries, materials, renderer, instanced meshes) and the DOM canvas element are leaked."
   - Register `destroySceneResources()` to Phaser's scene `SHUTDOWN` and `DESTROY` events inside `create()` of `HextrisScene.ts`.
     For example:
     ```typescript
     this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
       this.destroySceneResources();
     });
     this.events.once(Phaser.Scenes.Events.DESTROY, () => {
       this.destroySceneResources();
     });
     ```
   - Ensure that the listener is only registered once, and that it cleanly handles multiple shutdowns or restarts if they occur.

After implementing these fixes, run the following verification checks:
- Run `npm run build` to ensure there are no compilation errors.
- Run `npm run touch:hextris` to verify that Hextris playtest and gesture tests pass.
- Run `npm run touch:all` to ensure no regression in other games.

Write a detailed handoff.md in your working directory (.agents/worker_hextris_retry) documenting your changes, verification results, and any details needed by the reviewer.

> DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## 2026-07-12T08:00:24Z

**Context**: HextrisScene Bug/Performance Verification (Milestone 3 retry)
**Content**: Challenger 1 identified a critical runtime crash in `src/scenes/HextrisScene.ts` during matching/clearing. Accessing index `-1` on `this.mainHex.blocks[side]` causes a `TypeError: Cannot set properties of undefined (setting 'settled')` at line ~802.
The bug occurs in `updateGameLogic` because `lowestDeletedIndex` is assigned to `j` *after* `j--` is called (which makes it `-1` when `j = 0` is spliced).
Please fix this bug in `src/scenes/HextrisScene.ts` alongside your lifecycle cleanup hooks. Assign `lowestDeletedIndex = j` (or update it) before decrementing `j`.
**Action**: Implement the fix for the collapse logic crash, run `npm run build` and `npm run touch:hextris` to verify both the leak fix and crash fix are successful, and report back.
