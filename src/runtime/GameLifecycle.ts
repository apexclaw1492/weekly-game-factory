import type { ArcadeInputFrame, GameplayQAState } from './ArcadeInputFrame';

/**
 * Lifecycle states for game scenes.
 * Maps to the QA state contract's lifecycle field.
 */
export type LifecycleState = 'start' | 'playing' | 'paused' | 'levelComplete' | 'gameOver';

/**
 * GameLifecycle — contract every playable scene implements.
 *
 * A scene implementing this interface owns its internal state flags
 * (isWaitingToStart, isGameOver, etc.) and exposes them through
 * lifecycleState. It MUST NOT read raw DOM touch events directly.
 */
export interface GameLifecycle {
  /** Unique scene key (matches Phaser.Scene.scene.key) */
  readonly sceneKey: string;

  /** Current lifecycle state */
  lifecycleState: LifecycleState;

  /** Called every frame during active gameplay */
  handleArcadeInput(frame: ArcadeInputFrame): void;

  /** Show the start overlay (called when scene is entered) */
  showStart(): void;

  /** Begin gameplay (transition from start → playing) */
  startGameplay(): void;

  /** Pause gameplay (playing → paused) */
  pauseGameplay(): void;

  /** Resume from pause (paused → playing) */
  resumeGameplay(): void;

  /** Reset all game state (gameOver → start) */
  resetGameplay(): void;

  /** Clean transition back to the hub scene */
  returnToHub(): void;

  /** Return current QA-observable state */
  getGameplayStateForQA(): GameplayQAState;

  /** Full cleanup: timers, tweens, listeners, objects */
  destroySceneResources(): void;
}

/**
 * Default stub implementations for lifecycle methods.
 * Scenes can override these or use them as-is.
 */
export const defaultLifecycleStubs: Pick<
  GameLifecycle,
  'pauseGameplay' | 'resumeGameplay' | 'destroySceneResources'
> = {
  pauseGameplay() {
    // Override in scene for pause-specific behaviour
  },
  resumeGameplay() {
    // Override in scene for resume-specific behaviour
  },
  destroySceneResources() {
    // Override in scene for cleanup
  },
};