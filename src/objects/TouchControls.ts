import Phaser from 'phaser';
import { getTiltIntent, pulseHaptic, requestMotionAccess } from '../utils/MobileHardware';

type ControlType = 'dpad-ab' | 'lr-thrust' | 'lr-shoot';

interface PointerState {
  startX: number;
  startY: number;
  x: number;
  y: number;
  startTime: number;
}

export class TouchControls extends Phaser.GameObjects.Container {
  public leftPressed = false;
  public rightPressed = false;
  public upPressed = false;
  public downPressed = false;
  public aPressed = false;
  public bPressed = false;
  public autoToggled = true;

  private controlType: ControlType;
  private pointerStates = new Map<number, PointerState>();
  private pointerLeft = false;
  private pointerRight = false;
  private pointerUp = false;
  private pointerDown = false;
  private pointerA = false;
  private pointerB = false;
  private pulsedA = false;
  private lastJumpPulseAt = 0;

  constructor(scene: Phaser.Scene, controlType: ControlType, autoToggled = true) {
    super(scene);
    this.controlType = controlType;
    this.autoToggled = autoToggled;
    this.setScrollFactor(0);
    this.setDepth(1000);
    this.setVisible(false);
    scene.add.existing(this);

    scene.input.on('pointerdown', this.handlePointerDown, this);
    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerup', this.handlePointerUp, this);
    scene.input.on('pointerupoutside', this.handlePointerUp, this);
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.refreshHardwareState, this);

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', this.handlePointerDown, this);
      scene.input.off('pointermove', this.handlePointerMove, this);
      scene.input.off('pointerup', this.handlePointerUp, this);
      scene.input.off('pointerupoutside', this.handlePointerUp, this);
      scene.events.off(Phaser.Scenes.Events.UPDATE, this.refreshHardwareState, this);
      this.resetPressed();
    });
  }

  public resize() {
    this.refreshHardwareState();
  }

  public resetPressed() {
    this.pointerStates.clear();
    this.pointerLeft = false;
    this.pointerRight = false;
    this.pointerUp = false;
    this.pointerDown = false;
    this.pointerA = false;
    this.pointerB = false;
    this.pulsedA = false;
    this.leftPressed = false;
    this.rightPressed = false;
    this.upPressed = false;
    this.downPressed = false;
    this.aPressed = false;
    this.bPressed = false;
  }

  public isInControlZone(_pointer: Phaser.Input.Pointer) {
    return false;
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    void requestMotionAccess();
    pulseHaptic(8);
    this.pointerStates.set(pointer.id, {
      startX: pointer.x,
      startY: pointer.y,
      x: pointer.x,
      y: pointer.y,
      startTime: this.scene.time.now
    });
    this.applyPointerIntent();
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    const state = this.pointerStates.get(pointer.id);
    if (!state) return;
    state.x = pointer.x;
    state.y = pointer.y;
    this.applyPointerIntent();
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    const state = this.pointerStates.get(pointer.id);
    if (state) {
      this.captureReleaseGesture(state);
    }
    this.pointerStates.delete(pointer.id);
    this.applyPointerIntent();
  }

  private captureReleaseGesture(state: PointerState) {
    if (this.controlType !== 'dpad-ab') return;

    const dy = state.y - state.startY;
    const dt = this.scene.time.now - state.startTime;
    if (dy < -42 && dt < 420) {
      this.pulseJump();
    }
  }

  private applyPointerIntent() {
    this.pointerLeft = false;
    this.pointerRight = false;
    this.pointerUp = false;
    this.pointerDown = false;
    this.pointerA = false;
    this.pointerB = false;

    const primary = this.pointerStates.values().next().value as PointerState | undefined;
    if (!primary) {
      this.refreshHardwareState();
      return;
    }

    const { width, height } = this.scene.scale;
    const dx = primary.x - primary.startX;
    const dy = primary.y - primary.startY;
    const horizontalDeadZone = Math.max(16, width * 0.035);
    const verticalDeadZone = Math.max(18, height * 0.035);
    const pointerCount = this.pointerStates.size;

    if (this.controlType === 'lr-shoot') {
      this.pointerA = true;
      this.pointerLeft = dx < -horizontalDeadZone || primary.x < width * 0.42;
      this.pointerRight = dx > horizontalDeadZone || primary.x > width * 0.58;
    } else if (this.controlType === 'lr-thrust') {
      this.pointerLeft = dx < -horizontalDeadZone;
      this.pointerRight = dx > horizontalDeadZone;
      this.pointerUp = dy < -verticalDeadZone || primary.y < height * 0.46;
      this.pointerB = pointerCount > 1;
    } else {
      this.pointerLeft = dx < -horizontalDeadZone;
      this.pointerRight = dx > horizontalDeadZone;
      this.pointerUp = dy < -verticalDeadZone;
      this.pointerDown = dy > verticalDeadZone;
      this.pointerB = pointerCount > 0;

      if (this.pointerUp && this.scene.time.now - this.lastJumpPulseAt > 360) {
        this.pulseJump();
      }
    }

    this.refreshHardwareState();
  }

  private refreshHardwareState() {
    const tilt = getTiltIntent(10);
    const tiltCanSteer = tilt.active && this.pointerStates.size === 0;

    this.leftPressed = this.pointerLeft || (tiltCanSteer && tilt.left);
    this.rightPressed = this.pointerRight || (tiltCanSteer && tilt.right);
    this.upPressed = this.pointerUp || (tiltCanSteer && tilt.up);
    this.downPressed = this.pointerDown || (tiltCanSteer && tilt.down);
    this.aPressed = this.pointerA || this.pulsedA;
    this.bPressed = this.pointerB;
  }

  private pulseJump() {
    this.lastJumpPulseAt = this.scene.time.now;
    this.pulsedA = true;
    this.aPressed = true;
    pulseHaptic(10);
    this.scene.time.delayedCall(110, () => {
      this.pulsedA = false;
      this.aPressed = false;
    });
  }
}
