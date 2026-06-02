import Phaser from 'phaser';
import { TextureGenerator } from '../utils/TextureGenerator';
import { SoundSynth } from '../utils/SoundSynth';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Basic settings to disable default mobile browser actions
    this.input.mouse?.disableContextMenu();
    
    // Generate all dynamic retro textures
    this.generateTextures();
  }

  create() {
    // Unlock Audio Context on first user click or touch (iOS Safari restriction)
    const unlockAudio = () => {
      SoundSynth.unlock();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    // Instantly transition to the preload scene for a progress bar
    this.scene.start('PreloadScene');
  }

  private generateTextures() {
    // ----------------------------------------------------
    // CONTRA PIXEL SPRITES & PALETTE
    // ----------------------------------------------------
    const contraPalette = {
      '.': 'transparent',
      'r': '#ee2222', // Red
      's': '#ddbb99', // Skin
      'b': '#3344aa', // Blue
      'd': '#6a4a2a', // Brown
      'k': '#222222', // Black/dark
      'g': '#558833', // Green
      'w': '#aaaaaa', // Gray
      'y': '#ffcc00', // Yellow
      'o': '#ff8800', // Orange
      'p': '#8844aa', // Purple
      'v': '#444444'  // Dark Gray
    };

    const SPR = {
      // Player Stand
      ps: [
        '..rrrr........',
        '.rssssr.......',
        '.rssssr.......',
        '.rssssr.......',
        'rrrrrrrr.......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '.bbrrrbb......',
        '.bbbrbbb......',
        '.bbddddbb.....',
        '..bbddbb......',
        '..dd..dd......',
        '..dd..dd......',
        '...............',
        '...............'
      ],
      // Player Run 1
      pr1: [
        '..rrrr........',
        '.rssssr.......',
        '.rssssr.......',
        '.rssssr.......',
        'rrrrrrrr.......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '.bbrrrbb......',
        '..brrrb.......',
        '.bbddbb.......',
        '..bdddb.......',
        '..dd..dd......',
        '..dd..dd......',
        '...............',
        '...............'
      ],
      // Player Run 2
      pr2: [
        '..rrrr........',
        '.rssssr.......',
        '.rssssr.......',
        '.rssssr.......',
        'rrrrrrrr.......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '.bbrrrbb......',
        '.bbrrrb.......',
        '..bbddbb......',
        '...bddb.......',
        '..dd..dd......',
        '..dd..dd......',
        '...............',
        '...............'
      ],
      // Player Jump
      pj: [
        '..rrrr........',
        '.rssssr.......',
        '.rssssr.......',
        '.rssssr.......',
        'rrrrrrrr.......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '.bbbbbbb......',
        '..bbrrrb.......',
        '..bbrrb.......',
        '..bbddbb......',
        '..bbddb.......',
        '..dd..dd.......',
        '..dd..dd......',
        '...............',
        '...............'
      ],
      // Enemy Soldier
      so: [
        '..kkkk........',
        '.kggggk.......',
        '.kggggk.......',
        '.kkkkkk.......',
        'kkkkkkk.......',
        '.kbkbbkk......',
        '..kkkk........',
        '..krkr........',
        '..kddk........',
        '.kkddkk.......',
        '.kddk.........',
        '.kddk.........',
        '..dd..dd......',
        '..dd..dd......',
        '...............',
        '...............'
      ],
      // Enemy Flyer
      fl: [
        '...............',
        '..pppp........',
        '.pppppp.......',
        '.pppppp.......',
        '.pppppp.......',
        'ppppppp.......',
        'ppppppp.......',
        '.pppppp.......',
        '.pppppp.......',
        '..pppp........',
        '..rrrr........',
        '..rrrr........',
        '.r..r.........',
        '...............',
        '...............',
        '...............'
      ],
      // Enemy Turret
      tu: [
        '..vvvv........',
        '.vooooov.......',
        '.vooooov.......',
        '.vvvvvv.......',
        '.vdddddv.......',
        '.vdddddv.......',
        '.vvvvvv.......',
        '.vooooov.......',
        '.vooooov.......',
        '.vvvvvv.......',
        '.vwwwwv.......',
        '.vwwwwv.......',
        '.vvvvvv.......',
        '...............',
        '...............',
        '...............'
      ]
    };

    // Generate Contra textures
    TextureGenerator.generatePixelTexture(this, 'player-stand', SPR.ps, contraPalette, 2);
    TextureGenerator.generatePixelTexture(this, 'player-run1', SPR.pr1, contraPalette, 2);
    TextureGenerator.generatePixelTexture(this, 'player-run2', SPR.pr2, contraPalette, 2);
    TextureGenerator.generatePixelTexture(this, 'player-jump', SPR.pj, contraPalette, 2);
    TextureGenerator.generatePixelTexture(this, 'enemy-sol', SPR.so, contraPalette, 2);
    TextureGenerator.generatePixelTexture(this, 'enemy-fly', SPR.fl, contraPalette, 2);
    TextureGenerator.generatePixelTexture(this, 'enemy-tur', SPR.tu, contraPalette, 2);

    // ----------------------------------------------------
    // F1 SPACE INVADER CARS
    // ----------------------------------------------------
    const f1Palette = {
      '.': 'transparent',
      'b': '#0600EF', // Red Bull blue
      'w': '#ffffff', // White details
      'y': '#FFFF00', // Yellow
      'r': '#FF0000', // Red detail/logo
      'k': '#111111', // Wheel color (dark)
      'c': '#000033', // Cockpit (very dark blue)
      's': '#333300', // Enemy cockpit
      'h': '#88aa00'  // Enemy visor
    };

    // F1 Player (Red Bull themed car, facing UP)
    // Width 25, Height 15
    const playerF1 = [
      '............w............',
      '...........www...........',
      '...........wcw...........',
      '...........wcw...........',
      '..........wcccw..........',
      '....kk...wcccccw...kk....',
      '....kk...wcccccw...kk....',
      '....kk..wccrrcww...kk....',
      '..bbbbbbbbbrrbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb...',
      '..bbbbbbbbbbbbbbbbbbbb...',
      '....kk.bbbbbbbbbbb.kk....',
      '....kk.bbbbbbbbbbb.kk....',
      '....kk.bbbbbbbbbbb.kk....',
      '.......bbbbwwbbbb........'
    ];

    // F1 Enemy Car (facing DOWN)
    const enemyF1 = [
      '.......yyyyhhyyyy........',
      '....kk.yyyyysyyyy.kk....',
      '....kk.yyyyysyyyy.kk....',
      '....kk.yyyyyyyyyy.kk....',
      '..yyyyyyyyyyyyyyyyyyyy...',
      '..yyyyyyyyyyyyyyyyyyyy...',
      '..yyyyyyyyyyyyyyyyyyyy...',
      '....kk..yyyyysyy...kk....',
      '....kk...yssssy....kk....',
      '....kk...yssssy....kk....',
      '..........yyyy..........',
      '...........yyy...........',
      '...........yyy...........',
      '...........yyy...........',
      '............y............'
    ];

    TextureGenerator.generatePixelTexture(this, 'player-f1', playerF1, f1Palette, 2);
    TextureGenerator.generatePixelTexture(this, 'enemy-f1', enemyF1, f1Palette, 2);
  }
}
