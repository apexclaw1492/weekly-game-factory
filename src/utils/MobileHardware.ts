export interface TiltState {
  beta: number;
  gamma: number;
  supported: boolean;
  permissionGranted: boolean;
  updatedAt: number;
}

export interface TiltIntent {
  active: boolean;
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  dominant?: 'left' | 'right' | 'up' | 'down';
}

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const tiltState: TiltState = {
  beta: 0,
  gamma: 0,
  supported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
  permissionGranted: false,
  updatedAt: 0
};

let listening = false;
let permissionRequested = false;

function handleOrientation(event: DeviceOrientationEvent) {
  tiltState.beta = event.beta ?? 0;
  tiltState.gamma = event.gamma ?? 0;
  tiltState.permissionGranted = true;
  tiltState.updatedAt = performance.now();
}

function startListening() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('deviceorientation', handleOrientation, true);
  listening = true;
}

export async function requestMotionAccess() {
  if (typeof window === 'undefined' || !tiltState.supported) return false;
  if (permissionRequested) return tiltState.permissionGranted;

  permissionRequested = true;
  const orientationEvent = window.DeviceOrientationEvent as DeviceOrientationEventWithPermission;

  try {
    if (typeof orientationEvent.requestPermission === 'function') {
      const result = await orientationEvent.requestPermission();
      tiltState.permissionGranted = result === 'granted';
      if (tiltState.permissionGranted) startListening();
      return tiltState.permissionGranted;
    }

    tiltState.permissionGranted = true;
    startListening();
    return true;
  } catch {
    tiltState.permissionGranted = false;
    return false;
  }
}

export function getTiltState() {
  return tiltState;
}

export function getTiltIntent(threshold = 9): TiltIntent {
  if (!tiltState.permissionGranted || performance.now() - tiltState.updatedAt > 750) {
    return { active: false, left: false, right: false, up: false, down: false };
  }

  const horizontal = tiltState.gamma;
  const vertical = tiltState.beta;
  const left = horizontal < -threshold;
  const right = horizontal > threshold;
  const up = vertical < -threshold;
  const down = vertical > threshold;
  const active = left || right || up || down;

  let dominant: TiltIntent['dominant'];
  if (active) {
    dominant = Math.abs(horizontal) >= Math.abs(vertical)
      ? (horizontal < 0 ? 'left' : 'right')
      : (vertical < 0 ? 'up' : 'down');
  }

  return { active, left, right, up, down, dominant };
}

export function pulseHaptic(pattern: number | number[] = 12) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  navigator.vibrate(pattern);
}
