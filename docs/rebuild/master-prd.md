# Master PRD: Mobile Arcade Rebuild

## Product

Weekly Game Factory is a browser-based mobile arcade hub. The target experience is a set of small, high-performance games that feel native on an iPhone while still working on desktop for development and keyboard play.

## Problem

The current implementation mixes Phaser pointer handlers, keyboard controls, DOM touch fallback, scene-level tap routing, and old virtual-button assumptions. This causes unreliable mobile play:

- Taps can launch the wrong game or do nothing.
- Games do not share a reliable start/play/retry/back flow.
- Touch behavior differs by scene and orientation.
- Some games render but do not provide actual gameplay.
- Existing smoke tests prove rendering better than playability.

## Product Goal

Create four operational mobile-first arcade games that can be played from the public GitHub Pages site in portrait and landscape without external instructions.

## Success Criteria

- The hub launches only certified playable games, or clearly labels uncertified games as rebuilding.
- Every certified game starts with a single intentional tap.
- Every certified game supports direct touch gameplay without visible labeled virtual buttons.
- Every certified game works in portrait and landscape.
- Every certified game exposes objective QA state so automated tests can prove gameplay happened.
- The deployed GitHub Pages build is tested after every release.

## Non-Goals

- Exact ROM-level recreations.
- Licensed art, names, or assets.
- Four simultaneous rewrites before one game is truly certified.
- Marketing pages or decorative screens that delay gameplay.
- Relying on screenshots alone as proof of playability.

## Audience

Primary audience:

- iPhone players using Safari or installed web-app mode.

Secondary audience:

- Desktop browser users using keyboard and mouse.
- Developers and QA agents using automated browser tests.

## Platform Requirements

- iPhone portrait: `390x844` and `430x932`.
- iPhone landscape: `844x390` and `932x430`.
- Small phone baseline: `320x568`.
- Tablet portrait: `768x1024`.
- Tablet landscape: `1024x768`.
- Desktop baseline: `800x600`.

## Release Policy

### Certified Playable

A game can be shown as fully playable when it passes:

- Local build.
- Local mobile touch test.
- Deployed GitHub Pages mobile touch test.
- Portrait and landscape QA state checks.
- No console or page errors.

### In Rebuild

A game must be shown as "in rebuild" or hidden when:

- It only passes render/screenshot smoke tests.
- Touch input does not produce core gameplay state changes.
- It works only in one orientation.
- Return-to-hub is unreliable.
- Start/preload routing can launch the wrong game.

## Shared Game Lifecycle Contract

Every playable scene must implement:

- `showStart()`
- `startGameplay()`
- `pauseGameplay()`
- `resumeGameplay()`
- `resetGameplay()`
- `returnToHub()`
- `handleArcadeInput(inputFrame)`
- `getGameplayStateForQA()`
- `destroySceneResources()`

Acceptance:

- A scene cannot read raw DOM touch events directly.
- A scene cannot make active gameplay decisions from global `pointerdown` without lifecycle guards.
- Restarting a scene must clear timers, tweens, input state, generated objects, and listeners.

## Shared QA State Contract

Every game must expose a plain JSON-compatible state object:

```ts
type GameplayQAState = {
  sceneKey: string;
  lifecycle: 'hub' | 'start' | 'playing' | 'paused' | 'levelComplete' | 'gameOver';
  orientation: 'portrait' | 'landscape';
  player: {
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    alive: boolean;
  };
  score: number;
  lives?: number;
  primaryActionCount: number;
  enemyOrHazardCount?: number;
  objectiveProgress?: number;
  messages: string[];
};
```

## Game Certification Requirements

### F1 Space Invaders

Certified mobile behavior:

- Drag finger left/right to move.
- Hold touch to fire.
- Enemy count decreases after touch play.
- Score increases after a hit.
- Player remains within playfield.

### Cosmic Cargo

Certified mobile behavior:

- Swipe or tilt changes gravity.
- Hold touch boosts and consumes fuel.
- Cargo collection changes objective progress.
- Portal unlocks after cargo collection.
- Fuel and gravity state are visible and testable.

### Contra Bonus

Certified mobile behavior:

- Drag controls movement and aim.
- Swipe up triggers one jump, not repeated auto-jump.
- Fire works while engaged.
- Enemy count or boss HP changes after touch play.
- Return-to-hub works in portrait and landscape.

### Asteroid Belt

Certified mobile behavior:

- Drag or tilt steers.
- Hold or swipe thrusts.
- Touch play fires or auto-fires according to mode.
- Asteroids split or disappear after shots.
- Lives do not drop during a basic controlled gesture unless collision is deliberate.

## Risks

- Safari device-motion permission can block tilt. Touch fallback is mandatory.
- Old scene-specific handlers can keep fighting the shared input layer unless removed.
- Phaser resize and scene restart leaks can make bugs appear only after repeated testing.
- Public GitHub Pages caching can hide whether the latest version is actually deployed.

## Milestone Strategy

1. Fix hub/preload routing and certification display.
2. Build shared mobile input and lifecycle runtime.
3. Certify F1 as the reference implementation.
4. Rebuild Cosmic Cargo against the shared runtime.
5. Rebuild Contra against the shared runtime.
6. Rebuild Asteroid Belt against the shared runtime.
7. Run full public-site certification before every publish.
