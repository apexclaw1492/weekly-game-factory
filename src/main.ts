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
    activePointers: 5
  },
  scene: [
    BootScene,
    PreloadScene,
    HubScene,
    ...GAME_DEFINITIONS.map((game) => game.sceneClass).filter((s): s is new () => Phaser.Scene => !!s)
  ]
};

const game = new Phaser.Game(config);
(window as any).__WGF_GAME__ = game;

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