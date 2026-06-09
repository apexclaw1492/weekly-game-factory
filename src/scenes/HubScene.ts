import Phaser from 'phaser';
import {
  BONUS_GAME_COUNT,
  GAME_BACKLOG_IDEA_COUNT,
  GAME_DEFINITIONS,
  CERTIFIED_GAME_COUNT,
  PUBLISHED_WEEK_COUNT,
  type GameDefinition
} from '../data/gameCatalog';
import { SoundSynth } from '../utils/SoundSynth';

export class HubScene extends Phaser.Scene {
  private starfield!: Phaser.GameObjects.Graphics;
  private stars: Array<{ x: number; y: number; speed: number; alpha: number }> = [];
  private cards: Phaser.GameObjects.Container[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private bgGrad!: Phaser.GameObjects.Graphics;
  private cardInputReadyAt = 0;
  private scrollY = 0;
  private maxScroll = 0;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private isDragging = false;
  private scrollIndicator: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('HubScene');
  }

  create() {
    const { width, height } = this.scale;
    this.stars = [];
    this.cardInputReadyAt = Math.max(
      performance.now() + 450,
      Number((window as any).__WGF_HUB_CARD_INPUT_BLOCKED_UNTIL) || 0
    );

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
    this.bgGrad = this.add.graphics();
    this.bgGrad.fillGradientStyle(0x020111, 0x020111, 0x0b092a, 0x0b092a, 1);
    this.bgGrad.fillRect(0, 0, width, height);
    this.bgGrad.setDepth(-1);

    // 3. Header Title (Glowing retro font)
    this.titleText = this.add.text(width / 2, 60, 'WEEKLY GAME FACTORY', {
      fontSize: width < 450 ? '24px' : '36px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtle glow on title
    this.titleText.setShadow(0, 0, '#00ccff', 8, true, true);

    this.subtitleText = this.add.text(width / 2, 95, this.getSubtitleText(width), {
      fontSize: width < 450 ? '10px' : '12px',
      fontFamily: 'monospace',
      color: '#8888a0',
      align: 'center',
      wordWrap: { width: Math.max(240, width - 32) }
    }).setOrigin(0.5);

    // 4. Render Game Cards (Responsive Grid/List)
    this.renderGameCards();

    // 5. Render Stats Box at bottom
    this.renderStats();

    // 6. Setup scroll handling for portrait mode
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const { width, height } = this.scale;
      if (height <= width || this.maxScroll <= 0) return;
      this.isDragging = true;
      this.dragStartY = pointer.y;
      this.dragStartScroll = this.scrollY;
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging || this.maxScroll <= 0) return;
      const delta = pointer.y - this.dragStartY;
      this.scrollY = Phaser.Math.Clamp(this.dragStartScroll + delta, -this.maxScroll, 0);
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    this.scrollIndicator = this.add.text(width / 2, height - 65, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff'
    }).setOrigin(0.5).setDepth(10).setAlpha(0.6);

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
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

    // Handle portrait scrolling
    const isPortrait = height > width;
    if (isPortrait) {
      // Update card positions with scrollY offset
      const startY = 145;
      const cardH = 75;
      this.cards.forEach((card, idx) => {
        card.y = startY + idx * (cardH + 12) + this.scrollY;
      });

      // Update scroll indicator
      if (this.scrollIndicator) {
        if (this.maxScroll > 0 && this.scrollY > -this.maxScroll) {
          this.scrollIndicator.setText('▼ scroll ▼');
          this.scrollIndicator.setPosition(width / 2, height - 65);
          this.scrollIndicator.setVisible(true);
        } else if (this.maxScroll > 0 && this.scrollY < 0) {
          this.scrollIndicator.setText('▲');
          this.scrollIndicator.setPosition(width / 2, 130);
          this.scrollIndicator.setVisible(true);
        } else {
          this.scrollIndicator.setVisible(false);
        }
      }
    } else {
      if (this.scrollIndicator) this.scrollIndicator.setVisible(false);
    }
  }

  private renderGameCards() {
    const { width, height } = this.scale;
    
    // Clean old cards
    this.cards.forEach(c => c.destroy());
    this.cards = [];

    const isPortrait = height > width;

    if (isPortrait) {
      // Stack cards vertically
      const startY = 145;
      const cardH = 75;
      const cardW = Math.min(width - 40, 360);

      GAME_DEFINITIONS.forEach((game, idx) => {
        const cardX = width / 2;
        const cardY = startY + idx * (cardH + 12) + this.scrollY;
        const card = this.createGameCard(cardX, cardY, cardW, cardH, game);
        this.cards.push(card);
      });

      // Calculate maxScroll correctly: total cards area - visible height
      const totalHeight = startY + GAME_DEFINITIONS.length * (cardH + 12);
      this.maxScroll = Math.max(0, totalHeight + 20 - height);
    } else {
      // 2x2 Grid for Landscape
      this.maxScroll = 0;
      this.scrollY = 0;
      const cardW = Math.min((width - 60) / 2, 360);
      const cardH = 120;

      const offsets = [
        { x: -cardW / 2 - 10, y: -cardH / 2 - 10 },
        { x: cardW / 2 + 10, y: -cardH / 2 - 10 },
        { x: -cardW / 2 - 10, y: cardH / 2 + 25 },
        { x: cardW / 2 + 10, y: cardH / 2 + 25 }
      ];

      GAME_DEFINITIONS.forEach((game, idx) => {
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
    game: GameDefinition
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    // Card background
    const bg = this.add.rectangle(0, 0, w, h, 0x111126);
    const certified = game.certificationStatus === 'certified';
    const baseAlpha = certified ? 0.4 : 0.18;
    bg.setStrokeStyle(1.5, game.color, baseAlpha);
    if (!certified) bg.setAlpha(0.58);
    container.add(bg);

    // Glowing left border
    const border = this.add.rectangle(-w / 2 + 2.5, 0, 5, h, game.color, certified ? 1 : 0.35);
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

      const subtitle = this.add.text(-w / 2 + 55, 6, `${game.weekLabel} - TOUCH + MOTION`, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#00ccff'
      }).setOrigin(0, 0.5);

      const status = this.add.text(w / 2 - 12, 18, game.certificationLabel || 'CERTIFIED', {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: certified ? '#74ffb4' : '#ffcc66',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      container.add([icon, title, subtitle, status]);
    } else {
      // Full Card layout for landscape
      const icon = this.add.text(-w / 2 + 35, -20, game.icon, { fontSize: '32px' }).setOrigin(0.5);
      const title = this.add.text(-w / 2 + 75, -28, game.title, {
        fontSize: '16px',
        fontStyle: 'bold',
        fontFamily: 'monospace',
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      const weekText = this.add.text(-w / 2 + 75, -10, game.weekLabel, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#00ccff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const descText = this.add.text(-w / 2 + 15, 20, game.description, {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#a0a0c0',
        wordWrap: { width: w - 30 }
      }).setOrigin(0, 0.5);

      const status = this.add.text(w / 2 - 15, -38, game.certificationLabel || 'CERTIFIED', {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: certified ? '#74ffb4' : '#ffcc66',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      container.add([icon, title, weekText, descText, status]);
    }

    // Set container input interactive
    bg.setInteractive({ useHandCursor: true });
    
    bg.on('pointerover', () => {
      if (!certified) return;
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
      if (!certified) return;
      this.tweens.add({
        targets: container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 150
      });
      bg.setStrokeStyle(1.5, game.color, 0.4);
    });

    bg.on('pointerdown', () => {
      if (performance.now() < this.cardInputReadyAt) return;

      if (!certified) {
        SoundSynth.playTone(220, 0.08, 'square', 0.025);
        bg.setStrokeStyle(2, 0xffcc66, 0.7);
        this.time.delayedCall(180, () => {
          bg.setStrokeStyle(1.5, game.color, baseAlpha);
        });
        return;
      }

      SoundSynth.playTone(800, 0.1, 'sine', 0.05);
      
      // Flash card background before switching
      bg.setFillStyle(game.color, 0.2);
      this.time.delayedCall(100, () => {
        this.scale.off('resize', this.handleResize, this);
        if (game.url) {
          window.location.href = game.url;
        } else if (game.sceneKey) {
          this.scene.start(game.sceneKey);
        }
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
    const stat1 = this.add.text(-gap * 1.5, -10, `READY: ${CERTIFIED_GAME_COUNT}`, valueStyle).setOrigin(0.5);
    const stat1L = this.add.text(-gap * 1.5, 10, 'Certified', labelStyle).setOrigin(0.5);

    const stat2 = this.add.text(-gap * 0.5, -10, `WEEKS: ${PUBLISHED_WEEK_COUNT}`, valueStyle).setOrigin(0.5);
    const stat2L = this.add.text(-gap * 0.5, 10, 'Production', labelStyle).setOrigin(0.5);

    const stat3 = this.add.text(gap * 0.5, -10, `BONUS: ${BONUS_GAME_COUNT}`, valueStyle).setOrigin(0.5);
    const stat3L = this.add.text(gap * 0.5, 10, 'Secret Drops', labelStyle).setOrigin(0.5);

    const stat4 = this.add.text(gap * 1.5, -10, `IDEAS: ${GAME_BACKLOG_IDEA_COUNT}+`, valueStyle).setOrigin(0.5);
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

    // Reposition backdrop
    this.bgGrad.clear();
    this.bgGrad.fillGradientStyle(0x020111, 0x020111, 0x0b092a, 0x0b092a, 1);
    this.bgGrad.fillRect(0, 0, width, height);

    // Reposition title and subtitle
    this.titleText.setPosition(width / 2, 60);
    this.titleText.setFontSize(width < 450 ? '24px' : '36px');
    this.subtitleText.setPosition(width / 2, 95);
    this.subtitleText.setText(this.getSubtitleText(width));
    this.subtitleText.setFontSize(width < 450 ? '10px' : '12px');
    this.subtitleText.setWordWrapWidth(Math.max(240, width - 32));

    // Re-draw cards and stats
    this.renderGameCards();
    this.renderStats();

    // Re-clamp scrollY to new bounds
    this.scrollY = Phaser.Math.Clamp(this.scrollY, -this.maxScroll, 0);
  }

  private getSubtitleText(width: number) {
    return width < 420 ? 'A new retro game every Friday.' : 'A new retro game every Friday. Fully optimized.';
  }
}
