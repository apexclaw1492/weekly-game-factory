import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HubScene } from './scenes/HubScene';
import { GAME_DEFINITIONS } from './data/gameCatalog';

type GlobalTapPoint = { x: number; y: number };
type ExternalTouchControl = {
  beginExternalPointer?: (id: number, x: number, y: number) => void;
  moveExternalPointer?: (id: number, x: number, y: number) => void;
  endExternalPointer?: (id: number) => void;
};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#03020b',
  pixelArt: false,
  antialias: true,
  roundPixels: false,
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: false
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  input: {
    activePointers: 5 // Multi-touch gestures plus keyboard fallback.
  },
  scene: [
    BootScene,
    PreloadScene,
    HubScene,
    ...GAME_DEFINITIONS.map((game) => game.sceneClass)
  ]
};

const game = new Phaser.Game(config);

function activeScene(): Phaser.Scene | undefined {
  return game.scene.getScenes(true)[0];
}

function launchHubCard(scene: Phaser.Scene, point: GlobalTapPoint) {
  const { width, height } = scene.scale;
  const isPortrait = height > width;

  if (isPortrait) {
    const cardH = 75;
    const cardW = Math.min(width - 40, 360);
    const startY = 145;
    const cardX = width / 2;

    for (let index = 0; index < GAME_DEFINITIONS.length; index++) {
      const cardY = startY + index * (cardH + 12);
      const insideX = point.x >= cardX - cardW / 2 && point.x <= cardX + cardW / 2;
      const insideY = point.y >= cardY - cardH / 2 && point.y <= cardY + cardH / 2;
      if (insideX && insideY) {
        scene.scene.start(GAME_DEFINITIONS[index].sceneKey);
        return true;
      }
    }
    return false;
  }

  const cardW = Math.min((width - 60) / 2, 360);
  const cardH = 120;
  const offsets = [
    { x: -cardW / 2 - 10, y: -cardH / 2 - 10 },
    { x: cardW / 2 + 10, y: -cardH / 2 - 10 },
    { x: -cardW / 2 - 10, y: cardH / 2 + 25 },
    { x: cardW / 2 + 10, y: cardH / 2 + 25 }
  ];

  for (let index = 0; index < GAME_DEFINITIONS.length; index++) {
    const offset = offsets[index];
    const cardX = width / 2 + offset.x;
    const cardY = height / 2 + offset.y + 15;
    const insideX = point.x >= cardX - cardW / 2 && point.x <= cardX + cardW / 2;
    const insideY = point.y >= cardY - cardH / 2 && point.y <= cardY + cardH / 2;
    if (insideX && insideY) {
      scene.scene.start(GAME_DEFINITIONS[index].sceneKey);
      return true;
    }
  }

  return false;
}

function bridgeTap(point: GlobalTapPoint) {
  const scene = activeScene();
  if (!scene) return;

  const key = scene.scene.key;
  if (key === 'BootScene' || key === 'PreloadScene') {
    scene.scene.start('HubScene');
    return;
  }

  if (key === 'HubScene') {
    launchHubCard(scene, point);
    return;
  }

  const sceneAny = scene as any;
  if (sceneAny.isWaitingToStart && typeof sceneAny.startGame === 'function') {
    sceneAny.startGame();
  } else if (sceneAny.isGameOver && typeof sceneAny.scene?.restart === 'function') {
    sceneAny.scene.restart();
  } else if (sceneAny.isLevelComplete && typeof sceneAny.nextLevel === 'function') {
    sceneAny.nextLevel();
  }
}

let lastBridgeTapAt = 0;
let touchStartedAt = 0;
const touchStarts = new Map<number, GlobalTapPoint & { time: number }>();

function handleBridgeTap(point: GlobalTapPoint) {
  const now = performance.now();
  if (now - lastBridgeTapAt < 180) return;
  lastBridgeTapAt = now;
  bridgeTap(point);
}

function activeTouchControls(): ExternalTouchControl | undefined {
  return (activeScene() as any)?.touchControls as ExternalTouchControl | undefined;
}

function handleGameTouchStart(id: number, point: GlobalTapPoint) {
  const scene = activeScene();
  if (!scene) return;
  const sceneAny = scene as any;

  activeTouchControls()?.beginExternalPointer?.(id, point.x, point.y);

  if (scene.scene.key === 'CosmicCargoScene' && !sceneAny.isWaitingToStart && !sceneAny.isGameOver && !sceneAny.isLevelComplete) {
    sceneAny.boostHeld = true;
    sceneAny.useBoost?.();
  }
}

function handleGameTouchMove(id: number, point: GlobalTapPoint) {
  activeTouchControls()?.moveExternalPointer?.(id, point.x, point.y);
}

function handleGameTouchEnd(id: number, point: GlobalTapPoint) {
  const scene = activeScene();
  const sceneAny = scene as any;
  const start = touchStarts.get(id);

  activeTouchControls()?.endExternalPointer?.(id);

  if (scene?.scene.key === 'CosmicCargoScene') {
    sceneAny.boostHeld = false;
    if (start && !sceneAny.isWaitingToStart && !sceneAny.isGameOver && !sceneAny.isLevelComplete) {
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      const dt = performance.now() - start.time;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 30 && dt < 450 && typeof sceneAny.updateGravity === 'function') {
        if (Math.abs(dx) > Math.abs(dy)) {
          sceneAny.updateGravity(dx > 0 ? 3 : 2);
        } else {
          sceneAny.updateGravity(dy > 0 ? 1 : 0);
        }
      }
    }
  }
}

window.addEventListener('touchstart', (event) => {
  touchStartedAt = performance.now();
  for (const touch of Array.from(event.changedTouches)) {
    const point = { x: touch.clientX, y: touch.clientY };
    touchStarts.set(touch.identifier, { ...point, time: touchStartedAt });
    handleGameTouchStart(touch.identifier, point);
  }
}, { passive: true, capture: true });

window.addEventListener('touchmove', (event) => {
  for (const touch of Array.from(event.changedTouches)) {
    handleGameTouchMove(touch.identifier, { x: touch.clientX, y: touch.clientY });
  }
}, { passive: true, capture: true });

window.addEventListener('touchend', (event) => {
  const touch = event.changedTouches[0];
  if (!touch) return;
  const point = { x: touch.clientX, y: touch.clientY };
  handleGameTouchEnd(touch.identifier, point);
  touchStarts.delete(touch.identifier);
  handleBridgeTap(point);
}, { passive: true, capture: true });

window.addEventListener('touchcancel', (event) => {
  for (const touch of Array.from(event.changedTouches)) {
    handleGameTouchEnd(touch.identifier, { x: touch.clientX, y: touch.clientY });
    touchStarts.delete(touch.identifier);
  }
}, { passive: true, capture: true });

window.addEventListener('click', (event) => {
  if (performance.now() - touchStartedAt < 700) return;
  handleBridgeTap({ x: event.clientX, y: event.clientY });
}, { passive: true, capture: true });
