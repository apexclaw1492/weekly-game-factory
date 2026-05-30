import Phaser from 'phaser';
import { SoundSynth } from '../utils/SoundSynth';

export class HubScene extends Phaser.Scene {
  private starfield!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; alpha: number }> = [];
  private cards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('HubScene');
  }

  create() {
    const { width, height } = this.scale;

    // 1. Create starfield background
    this.starfield = this.add.graphics();
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.2 + Math.random() * 0.8,
        alpha: 0.2 + Math.random() * 0.8
      });
    }

    // 2. Draw modern backdrop gradient details
    const bgGrad = this.add.graphics();
    bgGrad.fillGradientStyle(0x020111, 0x020111, 0x0b092a, 0x0b092a, 1);
    bgGrad.fillRect(0, 0, width, height);
    bgGrad.setDepth(-1);

    // 3. Header Title (Glowing retro font)
    const title = this.add.text(width / 2, 60, 'WEEKLY GAME FACTORY', {
      fontSize: width < 450 ? '24px' : '36px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtle glow on title
    title.setShadow(0, 0, '#00ccff', 8, true, true);

    this.add.text(width / 2, 95, 'A new retro game every Friday. Fully optimized.', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#8888a0'
    }).setOrigin(0.5);

    // 4. Render Game Cards (Responsive Grid/List)
    this.renderGameCards();

    // 5. Render Stats Box at bottom
    this.renderStats();

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);
  }

  update() {
    const { width, height } = this.scale;
    
    // Draw animated scrolling starfield
    this.starfield.clear();
    this.stars.forEach(star => {
      star.y += star.speed;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      this.starfield.fillStyle(0xffffff, star.alpha);
      this.starfield.fillRect(star.x, star.y, 1.5, 1.5);
    });
  }

  private renderGameCards() {
    const { width, height } = this.scale;
    
    // Clean old cards
    this.cards.forEach(c => c.destroy());
    this.cards = [];

    const games = [
      {
        id: 'f1-space-invaders',
        title: 'F1 Space Invaders',
        week: 'Week 0',
        icon: '🏎️',
        scene: 'SpaceInvadersScene',
        color: 0x0600EF,
        desc: 'Red Bull space invaders! Dodge, blast, build combos.'
      },
      {
        id: 'cosmic-cargo',
        title: 'Cosmic Cargo',
        week: 'Week 1',
        icon: '🚀',
        scene: 'CosmicCargoScene',
        color: 0xff6b35,
        desc: 'Gravity-switching puzzle. Collect pods and escape.'
      },
      {
        id: 'contra-bonus',
        title: 'Contra Bonus',
        week: '🎁 Bonus',
        icon: '⚔️',
        scene: 'ContraScene',
        color: 0xee2222,
        desc: 'Run & gun retro action! Jump, shoot, defeat the boss.'
      },
      {
        id: 'asteroid-belt',
        title: 'Asteroid Belt',
        week: 'Week 2',
        icon: '☄️',
        scene: 'AsteroidsScene',
        color: 0x8899aa,
        desc: 'Asteroids shooter clone. Split space rocks and survive.'
      }
    ];

    const isPortrait = height > width;

    if (isPortrait) {
      // Stack cards vertically
      const startY = 145;
      const cardH = 75;
      const cardW = Math.min(width - 40, 360);

      games.forEach((game, idx) => {
        const cardX = width / 2;
        const cardY = startY + idx * (cardH + 12);
        const card = this.createGameCard(cardX, cardY, cardW, cardH, game);
        this.cards.push(card);
      });
    } else {
      // 2x2 Grid for Landscape
      const cardW = Math.min((width - 60) / 2, 360);
      const cardH = 120;

      const offsets = [
        { x: -cardW / 2 - 10, y: -cardH / 2 - 10 },
        { x: cardW / 2 + 10, y: -cardH / 2 - 10 },
        { x: -cardW / 2 - 10, y: cardH / 2 + 25 },
        { x: cardW / 2 + 10, y: cardH / 2 + 25 }
      ];

      games.forEach((game, idx) => {
        const offset = offsets[idx];
        const card = this.createGameCard(width / 2 + offset.x, height / 2 + offset.y + 15, cardW, cardH, game);
        this.cards.push(card);
      });
    }
  }

  private createGameCard(
    x: number,
    y: number,
    w: number,
    h: number,
    game: any
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, w, h, 0x111126);
    bg.setStrokeStyle(1.5, game.color, 0.4);
    container.add(bg);

    // Glowing left border
    const border = this.add.rectangle(-w / 2 + 2.5, 0, 5, h, game.color);
    container.add(border);

    // Text & graphics inside card
    const isSmall = h < 90;

    if (isSmall) {
      // Condensed Portrait Row
      const icon = this.add.text(-w / 2 + 25, 0, game.icon, { fontSize: '24px' }).setOrigin(0.5);
      const title = this.add.text(-w / 2 + 55, -14, game.title, {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: 'monospace',
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      const subtitle = this.add.text(-w / 2 + 55, 6, `${game.week} — PLAY NOW`, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#00ccff'
      }).setOrigin(0, 0.5);

      container.add([icon, title, subtitle]);
    } else {
      // Full Card layout for landscape
      const icon = this.add.text(-w / 2 + 35, -20, game.icon, { fontSize: '32px' }).setOrigin(0.5);
      const title = this.add.text(-w / 2 + 75, -28, game.title, {
        fontSize: '16px',
        fontStyle: 'bold',
        fontFamily: 'monospace',
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      const weekText = this.add.text(-w / 2 + 75, -10, game.week, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#00ccff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const descText = this.add.text(-w / 2 + 15, 20, game.desc, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#a0a0c0',
        wordWrap: { width: w - 30 }
      }).setOrigin(0, 0.5);

      container.add([icon, title, weekText, descText]);
    }

    // Set container input interactive
    bg.setInteractive({ useHandCursor: true });
    
    bg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 150
      });
      bg.setStrokeStyle(2, game.color, 0.9);
      SoundSynth.playTone(600, 0.05, 'sine', 0.02);
    });

    bg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150
      });
      bg.setStrokeStyle(1.5, game.color, 0.4);
    });

    bg.on('pointerdown', () => {
      SoundSynth.playTone(800, 0.1, 'sine', 0.05);
      
      // Flash card background before switching
      bg.setFillStyle(game.color, 0.2);
      this.time.delayedCall(100, () => {
        this.scale.off('resize', this.handleResize, this);
        this.scene.start(game.scene);
      });
    });

    return container;
  }

  private renderStats() {
    const { width, height } = this.scale;

    // Clear old stats if any
    const oldStats = this.children.getByName('stats-container');
    if (oldStats) oldStats.destroy();

    const statsContainer = this.add.container(width / 2, height - 35);
    statsContainer.setName('stats-container');

    const labelStyle = {
      fontSize: width < 450 ? '9px' : '11px',
      fontFamily: 'monospace',
      color: '#666688'
    };

    const valueStyle = {
      fontSize: width < 450 ? '11px' : '14px',
      fontFamily: 'monospace',
      color: '#ffd700',
      fontStyle: 'bold'
    };

    // Calculate gap spacing based on width
    const gap = width < 450 ? 80 : 130;

    // Render 4 stats items
    const stat1 = this.add.text(-gap * 1.5, -10, 'PUBLISHED: 4', valueStyle).setOrigin(0.5);
    const stat1L = this.add.text(-gap * 1.5, 10, 'Games Total', labelStyle).setOrigin(0.5);

    const stat2 = this.add.text(-gap * 0.5, -10, 'WEEKS: 3', valueStyle).setOrigin(0.5);
    const stat2L = this.add.text(-gap * 0.5, 10, 'Production', labelStyle).setOrigin(0.5);

    const stat3 = this.add.text(gap * 0.5, -10, 'BONUS: 1', valueStyle).setOrigin(0.5);
    const stat3L = this.add.text(gap * 0.5, 10, 'Secret Drops', labelStyle).setOrigin(0.5);

    const stat4 = this.add.text(gap * 1.5, -10, 'IDEAS: 88+', valueStyle).setOrigin(0.5);
    const stat4L = this.add.text(gap * 1.5, 10, 'Remaining', labelStyle).setOrigin(0.5);

    statsContainer.add([stat1, stat1L, stat2, stat2L, stat3, stat3L, stat4, stat4L]);
  }

  private handleResize() {
    const { width, height } = this.scale;

    // Reset background graphics limits
    this.starfield.clear();
    this.stars.forEach(star => {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    });

    // Re-draw cards and stats
    this.renderGameCards();
    this.renderStats();
  }
}
