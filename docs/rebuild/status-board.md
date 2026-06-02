# Mobile Rebuild Status Board

Last updated: 2026-06-02, v1.3.6 implementation slice

## Certification Summary

| Game | Status | Reason |
| --- | --- | --- |
| F1 Space Invaders | Provisionally certified | Local touch test proves start, movement, firing, enemy hit, score update, and no page errors. Needs deployed v1.3.6 confirmation, shared runtime conversion, and full arcade fidelity before final certification. |
| Cosmic Cargo | Not certified | Browser-player agent found fuel unchanged, gravity unchanged, and scene returning to waiting state after touch gestures. |
| Contra Bonus | Not certified | Movement partially works, but shooting is inconsistent and landscape return-to-hub failed. |
| Asteroid Belt | Not certified | Movement happens, but action control is unclear and player can lose lives during a simple test gesture. |

## Current Known P0 Issues

- Shared input runtime is not implemented yet.
- Cosmic Cargo does not prove boost, gravity, or objective progress through touch.
- Contra landscape touch play and return-to-hub are unreliable.
- Asteroids touch action is not controlled enough for certification.
- The app lacks one shared input runtime and one shared lifecycle contract.

## Current Release Recommendation

- Keep F1 available as the only playable flagship.
- Mark Cosmic Cargo, Contra Bonus, and Asteroid Belt as "In rebuild" until their mobile certification tests pass.
- Do not claim all four games are playable until `touch:all` passes against GitHub Pages.

## v1.3.6 Local Evidence

- `npm run hub:routing`: passed. Preload taps at `y=145`, `232`, `319`, `406`, and `700` all stop at `HubScene`; in-rebuild card stays on hub; certified F1 card launches.
- `npm run smoke`: passed. F1 launches in desktop, phone portrait, and phone landscape; in-rebuild cards stay on hub; no page errors.
- `npm run touch:f1`: passed. F1 touch play moves, fires, destroys an enemy, and updates score.

## Evidence

F1 deployed test passed on 2026-06-02 against:

```sh
https://apexclaw1492.github.io/weekly-game-factory/?v=1.3.5
```

Verified state:

- Scene: `SpaceInvadersScene`
- Player moved from `x=64.4` to `x=325.7`
- Enemy count changed from `40` to `39`
- Score changed from `0` to `10`
- Page errors: none

Browser-player agent reported failures for the other games using:

```sh
node scratch/mobile-playtest.js
node scratch/probe-hub-taps.js
node scratch/mobile-state-playtest.js
```

## Next Milestones

1. Fix preload/hub routing.
2. Add certified/in-rebuild hub state.
3. Implement shared input runtime.
4. Convert F1 to shared runtime as reference.
5. Rebuild and certify Cosmic Cargo.
6. Rebuild and certify Contra Bonus.
7. Rebuild and certify Asteroid Belt.
8. Add `touch:all` and live-site regression gate.
