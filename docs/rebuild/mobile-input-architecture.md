# Mobile Input Architecture

## Principle

All games consume one normalized input model. No game should independently interpret raw DOM touch events, hidden hub taps, scene-level pointer hacks, or virtual button labels.

## Hardware-First Inputs

Supported input sources:

- Touch tap.
- Touch hold.
- Touch drag.
- Touch swipe.
- Multi-touch.
- Device motion, when permission is granted.
- Keyboard and mouse for desktop development.

Required fallback:

- Every tilt-based feature must have a touch gesture fallback.

## Input Frame

Each animation frame, the runtime produces an `ArcadeInputFrame`.

```ts
type ArcadeInputFrame = {
  lifecycleIntent: {
    start: boolean;
    back: boolean;
    pause: boolean;
    retry: boolean;
  };
  touch: {
    active: boolean;
    primaryId: number | null;
    x: number;
    y: number;
    startX: number;
    startY: number;
    dx: number;
    dy: number;
    heldMs: number;
    justStarted: boolean;
    justEnded: boolean;
  };
  gestures: {
    tap: boolean;
    hold: boolean;
    swipeUp: boolean;
    swipeDown: boolean;
    swipeLeft: boolean;
    swipeRight: boolean;
    dragVectorX: number;
    dragVectorY: number;
  };
  motion: {
    available: boolean;
    permission: 'unknown' | 'granted' | 'denied' | 'unsupported';
    tiltX: number;
    tiltY: number;
  };
  actions: {
    left: ActionState;
    right: ActionState;
    up: ActionState;
    down: ActionState;
    fire: ActionState;
    jump: ActionState;
    boost: ActionState;
    thrust: ActionState;
    hyperspace: ActionState;
  };
};

type ActionState = {
  held: boolean;
  justPressed: boolean;
  justReleased: boolean;
  source: 'none' | 'touch' | 'motion' | 'keyboard' | 'mouse';
};
```

## Runtime Responsibilities

The shared input runtime must:

- Own all raw touch listeners.
- Cancel browser scroll, zoom, and selection during gameplay.
- Normalize coordinates using the current canvas and safe-area bounds.
- Clear held input on release, scene transition, resize, visibility change, and orientation change.
- Separate lifecycle taps from active gameplay touches.
- Support both portrait and landscape without remapping by hardcoded card coordinates.

## Scene Responsibilities

Each scene must:

- Read only `ArcadeInputFrame`.
- Define its own action mapping from the normalized frame.
- Reject lifecycle actions while actively playing unless pause/back is intended.
- Return objective QA state with `getGameplayStateForQA()`.

Each scene must not:

- Add raw `window` or `document` touch listeners.
- Use visible button text as the primary mobile control.
- Depend on old D-pad or A/B labels.
- Interpret the preload tap as a hub card selection.

## Game Mappings

### F1 Space Invaders

- `dragVectorX` or touch `x`: move player laterally.
- `hold`: fire.
- `tap` in start state: start gameplay.
- `back`: return to hub.

### Cosmic Cargo

- `swipeLeft/right/up/down`: gravity direction fallback.
- `motion.tiltX/tiltY`: gravity direction when permission is granted.
- `hold`: boost.
- `tap` in start state: start gameplay.

### Contra Bonus

- `dragVectorX`: run and aim horizontally.
- `dragVectorY`: aim vertically.
- `swipeUp`: jump `justPressed`.
- `hold`: fire while engaged.

### Asteroid Belt

- `dragVectorX` or `motion.tiltX`: steer.
- `hold` or `swipeUp`: thrust.
- `hold` or touch-active mode: fire/autofire depending on rules.
- Multi-touch: optional burst fire or hyperspace.

## Acceptance Tests

The input runtime is accepted when automated tests can prove:

- One tap on preload never launches a hidden hub card in the same gesture.
- One tap on a hub card launches exactly one game.
- Touch start during active gameplay never triggers retry, next level, or back.
- Held touch clears after release.
- Held touch clears after orientation change.
- All four game mappings produce at least one core gameplay state change in portrait and landscape.
