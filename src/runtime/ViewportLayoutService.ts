/**
 * ViewportLayout — responsive layout dimensions for the arcade runtime.
 *
 * Provides safe-area-aware canvas dimensions, orientation detection,
 * and change notifications. Framework-agnostic (no Phaser dependency).
 */

export interface ViewportLayout {
  /** Current canvas logical width */
  width: number;
  /** Current canvas logical height */
  height: number;
  /** Whether height > width */
  isPortrait: boolean;
  /** Whether the smaller dimension is < 430px (compact phone) */
  isCompact: boolean;
  /** Ratio of current canvas width to base width */
  scaleX: number;
  /** Ratio of current canvas height to base height */
  scaleY: number;
  /** Reference (design) dimensions */
  baseWidth: number;
  baseHeight: number;
  /** Canvas CSS pixel bounds (from getBoundingClientRect) */
  cssWidth: number;
  cssHeight: number;
  /** Safe-area insets from CSS env(safe-area-inset-*) */
  safeArea: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export type ViewportChangeCallback = (layout: ViewportLayout) => void;

/**
 * ViewportLayoutService — observes resize and orientation changes,
 * computes normalized layout values, and notifies subscribers.
 *
 * Usage:
 *   const viewport = new ViewportLayoutService(canvas);
 *   const layout = viewport.getLayout();
 *   viewport.onChange((l) => { /* reposition UI * / });
 *   viewport.destroy();
 */
export class ViewportLayoutService {
  private currentLayout: ViewportLayout;
  private subscribers: Set<ViewportChangeCallback> = new Set();
  private resizeObserver: ResizeObserver | null = null;
  private hasOrientationChangeListener = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private readonly baseWidth: number,
    private readonly baseHeight: number,
  ) {
    this.currentLayout = this.computeLayout();
    this.observeResize();
  }

  /** Get the current layout */
  getLayout(): ViewportLayout {
    return this.currentLayout;
  }

  /** Subscribe to layout changes */
  onChange(cb: ViewportChangeCallback): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  /** Unsubscribe a callback */
  offChange(cb: ViewportChangeCallback): void {
    this.subscribers.delete(cb);
  }

  /** Clean up all observers */
  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.hasOrientationChangeListener) {
      window.removeEventListener('orientationchange', this.onOrientationChange);
    }
    this.subscribers.clear();
  }

  /** Convert a canvas-relative pixel value to a CSS pixel value */
  cssPixels(canvasPixels: number, axis: 'x' | 'y'): number {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return canvasPixels;
    const scale = axis === 'x'
      ? rect.width / this.canvas.width
      : rect.height / this.canvas.height;
    return canvasPixels * scale;
  }

  /** Convert CSS clientX/clientY to canvas-relative coordinates */
  canvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  // ---- Private ----

  private observeResize(): void {
    try {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.canvas);
    } catch {
      // Fallback: listen to window resize
      window.addEventListener('resize', this.onResize);
    }

    // Orientation change — also triggers resize but we want explicit detection
    window.addEventListener('orientationchange', this.onOrientationChange);
    this.hasOrientationChangeListener = true;
  }

  private onResize = (): void => {
    this.recalc();
  };

  private onOrientationChange = (): void => {
    // Delay recalc until orientation change completes
    requestAnimationFrame(() => this.recalc());
  };

  private recalc(): void {
    const layout = this.computeLayout();
    const prev = this.currentLayout;
    this.currentLayout = layout;

    // Only notify if something actually changed
    if (
      layout.width !== prev.width ||
      layout.height !== prev.height ||
      layout.isPortrait !== prev.isPortrait
    ) {
      this.subscribers.forEach((cb) => {
        try { cb(layout); } catch { /* swallow subscriber errors */ }
      });
    }
  }

  private computeLayout(): ViewportLayout {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect?.width ?? 0;
    const cssH = rect?.height ?? 0;

    const width = this.canvas.width;
    const height = this.canvas.height;
    const isPortrait = height > width;
    const isCompact = Math.min(width, height) < 430;

    // Parse CSS safe-area env variables (may be '0px' or undefined on desktop)
    const parseSafe = (key: string): number => {
      const val = getComputedStyle(document.documentElement).getPropertyValue(key).trim();
      const match = val.match(/^(\d+)px/);
      return match ? parseInt(match[1], 10) : 0;
    };

    return {
      width,
      height,
      isPortrait,
      isCompact,
      scaleX: cssW > 0 ? width / cssW : 1,
      scaleY: cssH > 0 ? height / cssH : 1,
      baseWidth: this.baseWidth,
      baseHeight: this.baseHeight,
      cssWidth: cssW,
      cssHeight: cssH,
      safeArea: {
        top: parseSafe('safe-area-inset-top'),
        right: parseSafe('safe-area-inset-right'),
        bottom: parseSafe('safe-area-inset-bottom'),
        left: parseSafe('safe-area-inset-left'),
      },
    };
  }
}