import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HubScene } from './scenes/HubScene';
import { GAME_DEFINITIONS } from './data/gameCatalog';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  transparent: true,
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
    activePointers: 5
  },
  scene: [
    BootScene,
    PreloadScene,
    HubScene,
    ...GAME_DEFINITIONS.map((game) => game.sceneClass).filter((s): s is new () => Phaser.Scene => !!s)
  ]
};

// Patch Phaser Scene manager to automatically submit scores on returning to Hub
const originalStart = (Phaser.Scenes.ScenePlugin.prototype as any).start;
(Phaser.Scenes.ScenePlugin.prototype as any).start = function(key: string, data?: any) {
  if (key === 'HubScene') {
    const activeScene = this.scene;
    const sceneKey = activeScene.sys.settings.key;
    const sceneToGameId: Record<string, string> = {
      'SpaceInvadersScene': 'f1-space-invaders',
      'CosmicCargoScene': 'cosmic-cargo',
      'ContraScene': 'contra-bonus',
      'AsteroidsScene': 'asteroid-belt',
      'PongScene': 'red-bull-pong'
    };
    const catalogId = sceneToGameId[sceneKey];
    if (catalogId) {
      const score = activeScene.score !== undefined ? activeScene.score : (activeScene.scorePlayer !== undefined ? activeScene.scorePlayer : 0);
      window.postMessage({ type: 'WGF_SCORE', gameId: catalogId, score }, '*');
    }
  }
  return originalStart.call(this, key, data);
};

const game = new Phaser.Game(config);
const isDevBuild = Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
if (isDevBuild || new URLSearchParams(window.location.search).has('qa')) {
  (window as any).__WGF_GAME__ = game;
}

// Create shared input runtime
(async () => {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;
  const { InputRuntime } = await import('./runtime/InputRuntime');
  const runtime = new InputRuntime(canvas);
  (window as any).__WGF_INPUT_RUNTIME = runtime;

  const enableMotion = () => {
    runtime.requestMotionPermission().catch(() => {});
    document.removeEventListener('pointerdown', enableMotion);
    document.removeEventListener('touchstart', enableMotion);
  };
  document.addEventListener('pointerdown', enableMotion);
  document.addEventListener('touchstart', enableMotion);
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered!', reg);
    }).catch(err => {
      console.error('SW registration failed:', err);
    });
  });
}
