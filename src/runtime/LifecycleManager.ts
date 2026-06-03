import type { GameLifecycle, LifecycleState } from './GameLifecycle';
import type { InputRuntime } from './InputRuntime';

/**
 * LifecycleManager — reads InputRuntime frames and orchestrates
 * lifecycle transitions on a GameLifecycle scene.
 *
 * Usage:
 *   const lifecycle = new LifecycleManager(this, runtime);
 *   // In scene update():
 *   lifecycle.update(time);
 *
 * The scene owns its lifecycle state flags. The manager reads
 * lifecycleState and lifecycleIntent to decide transitions, then
 * calls the appropriate scene method.
 */
export class LifecycleManager {
  /** Suppress lifecycle intents during scene entrance transitions */
  private sceneEnteredAt: number;

  constructor(
    private scene: GameLifecycle,
    private runtime: InputRuntime,
  ) {
    this.sceneEnteredAt = performance.now();
  }

  /**
   * Call once per frame from the scene's update() method.
   * @param time Current time (from Phaser.Scene.update or performance.now())
   */
  update(_time: number): LifecycleState {
    const frame = this.runtime.readFrame();
    const state = this.scene.lifecycleState;

    // Skip lifecycle intents for first 200ms after scene enter
    // (prevents accidental preload-tap bleed-through)
    const guardActive = performance.now() - this.sceneEnteredAt < 200;

    // --- Lifecycle intent routing ---
    if (!guardActive) {
      // Back intent always returns to hub from any state
      if (frame.lifecycleIntent.back) {
        this.scene.returnToHub();
        return state;
      }

      // Retry intent resets from gameOver state
      if (frame.lifecycleIntent.retry && state === 'gameOver') {
        this.scene.resetGameplay();
        return state;
      }

      // Lifecycle-specific intents
      switch (state) {
        case 'start':
          if (frame.lifecycleIntent.start || frame.gestures.tap) {
            this.scene.startGameplay();
          }
          break;

        case 'playing':
          if (frame.lifecycleIntent.pause) {
            this.scene.pauseGameplay();
          }
          break;

        case 'paused':
          if (frame.lifecycleIntent.start || frame.gestures.tap) {
            this.scene.resumeGameplay();
          }
          break;

        case 'levelComplete':
          if (frame.lifecycleIntent.start || frame.gestures.tap) {
            this.scene.startGameplay();
          }
          break;

        case 'gameOver':
          if (frame.gestures.tap || frame.lifecycleIntent.start) {
            this.scene.resetGameplay();
          }
          break;
      }
    }

    // Route gameplay frame to scene during active play
    if (state === 'playing') {
      this.scene.handleArcadeInput(frame);
    }

    return this.scene.lifecycleState;
  }

  /**
   * Mark that a new scene is entered (resets entrance guard).
   * Called automatically by the manager but can be called manually
   * if the scene re-enters via Phaser's scene restart.
   */
  resetEntranceGuard(): void {
    this.sceneEnteredAt = performance.now();
  }
}