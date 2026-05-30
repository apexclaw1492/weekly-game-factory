import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HubScene } from './scenes/HubScene';
import { SpaceInvadersScene } from './scenes/SpaceInvadersScene';
import { CosmicCargoScene } from './scenes/CosmicCargoScene';
import { ContraScene } from './scenes/ContraScene';
import { AsteroidsScene } from './scenes/AsteroidsScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  backgroundColor: '#03020b',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  input: {
    activePointers: 3 // Enable multi-touch up to 3 pointers (perfect for D-pad + action buttons on mobile)
  },
  scene: [
    BootScene,
    PreloadScene,
    HubScene,
    SpaceInvadersScene,
    CosmicCargoScene,
    ContraScene,
    AsteroidsScene
  ]
};

new Phaser.Game(config);
