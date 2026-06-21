import { ArcadeInputFrame, ActionState, emptyFrame, InputRuntimeHandle } from './ArcadeInputFrame';

const TAP_MAX_MS = 350;
const TAP_MAX_DIST = 15;
const HOLD_MIN_MS = 200;
const SWIPE_MIN_DIST = 40;
const SWIPE_MAX_MS = 500;
const DRAG_MIN_DIST = 15;
const MOTION_DEADZONE = 0.02;
const LIFECYCLE_TAP_DELAY_MS = 700;

interface TouchPoint {
  id: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  startTime: number;
  justStarted: boolean;
  justEnded: boolean;
  active: boolean;
}

/**
 * InputRuntime — produces an ArcadeInputFrame every animation frame.
 * Handles touch, mouse, keyboard, and motion normalization.
 */
export class InputRuntime implements InputRuntimeHandle {
  private touches = new Map<number, TouchPoint>();
  private keys = new Set<string>();
  private lastKeys = new Set<string>();
  private hasTouchSupport = false;
  private tiltX = 0;
  private tiltY = 0;
  private motionPermission: 'unknown' | 'granted' | 'denied' | 'unsupported' = 'unknown';
  private hubInputBlockedUntil = 0;
  private lastTouchStartTime = 0;
  private previousTouchStartTime = 0;
  private primaryTouchId: number | null = null;
  private currentFrame: ArcadeInputFrame;
  private rafId: number | null = null;

  // Gestures and intents that are "queued" until the next update()
  private pendingTap = false;
  private pendingStartIntent = false;
  private pendingSwipe: 'up' | 'down' | 'left' | 'right' | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.currentFrame = emptyFrame(this);
    this.setupListeners();
    this.startLoop();
  }

  public readFrame(): ArcadeInputFrame {
    return this.currentFrame;
  }

  public destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
    this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    
    window.removeEventListener('deviceorientation', this.onDeviceOrientation);
    window.removeEventListener('resize', this.clearState);
    window.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('orientationchange', this.clearState);
  }

  public async requestMotionPermission(): Promise<void> {
    const devOri = window.DeviceOrientationEvent as any;
    if (devOri && typeof devOri.requestPermission === 'function') {
      try {
        const permission = await devOri.requestPermission();
        this.motionPermission = permission;
      } catch (err) {
        this.motionPermission = 'denied';
      }
    } else if (window.DeviceOrientationEvent) {
      this.motionPermission = 'granted';
    } else {
      this.motionPermission = 'unsupported';
    }
  }

  public get isKeyboardOnly(): boolean {
    return !this.hasTouchSupport && this.motionPermission === 'unsupported';
  }

  public get isMotionActive(): boolean {
    return this.motionPermission === 'granted' && (Math.abs(this.tiltX) > 0 || Math.abs(this.tiltY) > 0);
  }

  public blockHubInputUntil(time: number): void {
    this.hubInputBlockedUntil = time;
  }

  public get isHubInputBlocked(): boolean {
    return performance.now() < this.hubInputBlockedUntil;
  }

  private setupListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', this.onTouchEnd, { passive: false });

    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    window.addEventListener('deviceorientation', this.onDeviceOrientation);
    window.addEventListener('resize', this.clearState);
    window.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('orientationchange', this.clearState);
  }

  private startLoop() {
    const loop = (time: number) => {
      this.update(time);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onTouchStart = (e: TouchEvent) => {
    this.hasTouchSupport = true;
    if (e.touches.length >= 2) e.preventDefault();
    
    const now = performance.now();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const coords = this.getCanvasCoords(t.clientX, t.clientY);
      this.touches.set(t.identifier, {
        id: t.identifier,
        startX: coords.x,
        startY: coords.y,
        x: coords.x,
        y: coords.y,
        startTime: now,
        justStarted: true,
        justEnded: false,
        active: true
      });

      if (this.primaryTouchId === null) {
        this.primaryTouchId = t.identifier;
      }
      this.previousTouchStartTime = this.lastTouchStartTime;
      this.lastTouchStartTime = now;
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (e.touches.length >= 2) e.preventDefault();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const touch = this.touches.get(t.identifier);
      if (touch) {
        const coords = this.getCanvasCoords(t.clientX, t.clientY);
        touch.x = coords.x;
        touch.y = coords.y;
      }
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    const now = performance.now();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const touch = this.touches.get(t.identifier);
      if (touch) {
        const coords = this.getCanvasCoords(t.clientX, t.clientY);
        touch.x = coords.x;
        touch.y = coords.y;
        touch.active = false;
        touch.justEnded = true;
        this.detectGesturesOnEnd(touch, now);
      }
    }
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.hasTouchSupport) return;
    const now = performance.now();
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.touches.set(-1, {
      id: -1,
      startX: coords.x,
      startY: coords.y,
      x: coords.x,
      y: coords.y,
      startTime: now,
      justStarted: true,
      justEnded: false,
      active: true
    });
    this.primaryTouchId = -1;
    this.previousTouchStartTime = this.lastTouchStartTime;
    this.lastTouchStartTime = now;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.hasTouchSupport) return;
    const touch = this.touches.get(-1);
    if (touch && touch.active) {
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      touch.x = coords.x;
      touch.y = coords.y;
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (this.hasTouchSupport) return;
    const touch = this.touches.get(-1);
    if (touch && touch.active) {
      const now = performance.now();
      const coords = this.getCanvasCoords(e.clientX, e.clientY);
      touch.x = coords.x;
      touch.y = coords.y;
      touch.active = false;
      touch.justEnded = true;
      this.detectGesturesOnEnd(touch, now);
    }
  };

  private onDeviceOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta === null || e.gamma === null) return;
    
    // Normalize to -1 to 1 based on common range
    const range = 45;
    let b = e.beta / range;
    let g = e.gamma / range;
    
    b = Math.max(-1, Math.min(1, b));
    g = Math.max(-1, Math.min(1, g));
    
    if (Math.abs(b) < MOTION_DEADZONE) b = 0;
    if (Math.abs(g) < MOTION_DEADZONE) g = 0;
    
    this.tiltX = g;
    this.tiltY = b;
    if (this.motionPermission === 'unknown') this.motionPermission = 'granted';
  };

  private onVisibilityChange = () => {
    if (document.hidden) this.clearState();
  };

  private clearState = () => {
    this.touches.clear();
    this.keys.clear();
    this.lastKeys.clear();
    this.primaryTouchId = null;
    this.pendingTap = false;
    this.pendingStartIntent = false;
    this.pendingSwipe = null;
  };

  private getCanvasCoords(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    const x = ((clientX - rect.left) / rect.width) * this.canvas.width;
    const y = ((clientY - rect.top) / rect.height) * this.canvas.height;
    return { x, y };
  }

  private detectGesturesOnEnd(touch: TouchPoint, now: number) {
    const duration = now - touch.startTime;
    const dx = touch.x - touch.startX;
    const dy = touch.y - touch.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (duration < TAP_MAX_MS && dist < TAP_MAX_DIST) {
      this.pendingTap = true;
      if (!this.isHubInputBlocked && (touch.startTime - this.previousTouchStartTime >= LIFECYCLE_TAP_DELAY_MS)) {
        this.pendingStartIntent = true;
      }
    } else if (duration < SWIPE_MAX_MS && dist > SWIPE_MIN_DIST) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.pendingSwipe = dx > 0 ? 'right' : 'left';
      } else {
        this.pendingSwipe = dy > 0 ? 'down' : 'up';
      }
    }
  }

  private update(time: number) {
    const nextFrame = emptyFrame(this);
    nextFrame.timestamp = time;

    nextFrame.motion = {
      available: this.motionPermission !== 'unsupported',
      permission: this.motionPermission,
      tiltX: this.tiltX,
      tiltY: this.tiltY,
    };

    const primary = this.primaryTouchId !== null ? this.touches.get(this.primaryTouchId) : null;
    if (primary) {
      const dx = primary.x - primary.startX;
      const dy = primary.y - primary.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const heldMs = time - primary.startTime;

      nextFrame.touch = {
        active: primary.active,
        primaryId: primary.id,
        x: primary.x,
        y: primary.y,
        startX: primary.startX,
        startY: primary.startY,
        dx,
        dy,
        heldMs,
        justStarted: primary.justStarted,
        justEnded: primary.justEnded,
      };

      if (primary.active && heldMs > HOLD_MIN_MS) {
        nextFrame.gestures.hold = true;
      }

      if (dist > DRAG_MIN_DIST) {
        nextFrame.gestures.dragVectorX = Math.max(-1, Math.min(1, dx / (this.canvas.width / 2)));
        nextFrame.gestures.dragVectorY = Math.max(-1, Math.min(1, dy / (this.canvas.height / 2)));
      }
    }

    if (this.pendingTap) {
      nextFrame.gestures.tap = true;
      this.pendingTap = false;
    }
    if (this.pendingSwipe) {
      if (this.pendingSwipe === 'up') nextFrame.gestures.swipeUp = true;
      else if (this.pendingSwipe === 'down') nextFrame.gestures.swipeDown = true;
      else if (this.pendingSwipe === 'left') nextFrame.gestures.swipeLeft = true;
      else if (this.pendingSwipe === 'right') nextFrame.gestures.swipeRight = true;
      this.pendingSwipe = null;
    }

    // Lifecycle Intent
    if (!this.isHubInputBlocked) {
      if (this.pendingStartIntent) {
        nextFrame.lifecycleIntent.start = true;
        this.pendingStartIntent = false;
      }
    } else {
      this.pendingStartIntent = false;
    }

    this.mapActions(nextFrame);
    this.currentFrame = nextFrame;

    // Cleanup "just" states for internal tracking
    for (const [id, t] of this.touches) {
      t.justStarted = false;
      if (t.justEnded) {
        this.touches.delete(id);
        if (this.primaryTouchId === id) this.primaryTouchId = null;
      }
    }
    this.lastKeys = new Set(this.keys);
  }

  private mapActions(frame: ArcadeInputFrame) {
    const isDown = (codes: string[]) => codes.some(c => this.keys.has(c));
    const wasDown = (codes: string[]) => codes.some(c => this.lastKeys.has(c));

    const setAction = (name: keyof ArcadeInputFrame['actions'], held: boolean, prevHeld: boolean, source: ActionState['source']) => {
      frame.actions[name] = {
        held,
        justPressed: held && !prevHeld,
        justReleased: !held && prevHeld,
        source: held ? source : 'none'
      };
    };

    // Keyboard Base
    setAction('left', isDown(['ArrowLeft', 'KeyA']), wasDown(['ArrowLeft', 'KeyA']), 'keyboard');
    setAction('right', isDown(['ArrowRight', 'KeyD']), wasDown(['ArrowRight', 'KeyD']), 'keyboard');
    setAction('up', isDown(['ArrowUp', 'KeyW']), wasDown(['ArrowUp', 'KeyW']), 'keyboard');
    setAction('down', isDown(['ArrowDown', 'KeyS']), wasDown(['ArrowDown', 'KeyS']), 'keyboard');
    setAction('fire', isDown(['Space', 'KeyX']), wasDown(['Space', 'KeyX']), 'keyboard');
    setAction('boost', isDown(['ShiftLeft', 'ShiftRight']), wasDown(['ShiftLeft', 'ShiftRight']), 'keyboard');
    setAction('jump', isDown(['KeyW', 'ArrowUp']), wasDown(['KeyW', 'ArrowUp']), 'keyboard');
    setAction('thrust', isDown(['KeyW', 'ArrowUp']), wasDown(['KeyW', 'ArrowUp']), 'keyboard');
    setAction('hyperspace', isDown(['ShiftLeft', 'ShiftRight']), wasDown(['ShiftLeft', 'ShiftRight']), 'keyboard');

    // Touch Overrides
    if (frame.gestures.dragVectorX < -0.3) {
      if (!frame.actions.left.held) setAction('left', true, false, 'touch');
    } else if (frame.gestures.dragVectorX > 0.3) {
      if (!frame.actions.right.held) setAction('right', true, false, 'touch');
    }
    
    if (frame.gestures.hold) {
      if (!frame.actions.fire.held) setAction('fire', true, false, 'touch');
    }

    if (frame.gestures.swipeUp) {
      if (!frame.actions.jump.held) setAction('jump', true, false, 'touch');
    }

    // Motion Overrides
    if (this.isMotionActive) {
      if (this.tiltX < -0.2) setAction('left', true, frame.actions.left.held, 'motion');
      if (this.tiltX > 0.2) setAction('right', true, frame.actions.right.held, 'motion');
    }
  }
}
