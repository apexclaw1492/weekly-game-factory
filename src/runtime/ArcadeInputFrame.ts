/**
 * ArcadeInputFrame — normalized input contract
 *
 * Every animation frame, the InputRuntime produces one frame.
 * All game scenes consume frames; no scene reads raw DOM events.
 *
 * The lifecycleIntent group is reserved for the runtime to
 * separate "start/back/retry" taps from gameplay gestures.
 */

export interface ActionState {
  held: boolean;
  justPressed: boolean;
  justReleased: boolean;
  source: 'none' | 'touch' | 'motion' | 'keyboard' | 'mouse';
}

export interface ArcadeInputFrame {
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
  /** Wall-clock timestamp of this frame (performance.now()) */
  timestamp: number;
  /** InputRuntime that produced this frame */
  runtime: InputRuntimeHandle;
}

export interface InputRuntimeHandle {
  /** Keyboard-only mode (desktop dev) */
  isKeyboardOnly: boolean;
  /** Whether device orientation is currently providing tilt data */
  isMotionActive: boolean;
  /** Destroy the runtime, remove all listeners */
  destroy(): void;
  /** Request device-motion permission (must be called from a user gesture) */
  requestMotionPermission(): Promise<void>;
}

/**
 * Empty/default frame — useful as initial state before first input.
 */
export function emptyFrame(runtime: InputRuntimeHandle): ArcadeInputFrame {
  const idle = (): ActionState => ({
    held: false, justPressed: false, justReleased: false, source: 'none',
  });
  return {
    lifecycleIntent: { start: false, back: false, pause: false, retry: false },
    touch: {
      active: false, primaryId: null, x: 0, y: 0,
      startX: 0, startY: 0, dx: 0, dy: 0, heldMs: 0,
      justStarted: false, justEnded: false,
    },
    gestures: {
      tap: false, hold: false,
      swipeUp: false, swipeDown: false, swipeLeft: false, swipeRight: false,
      dragVectorX: 0, dragVectorY: 0,
    },
    motion: {
      available: false, permission: 'unknown', tiltX: 0, tiltY: 0,
    },
    actions: {
      left: idle(), right: idle(), up: idle(), down: idle(),
      fire: idle(), jump: idle(), boost: idle(), thrust: idle(),
      hyperspace: idle(),
    },
    timestamp: 0,
    runtime,
  };
}

/**
 * Shared QA state contract — every game must expose one.
 */
export interface GameplayQAState {
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
}
