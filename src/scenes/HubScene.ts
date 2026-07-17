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
  private pendingCardTap: {
    startX: number;
    startY: number;
    game: GameDefinition;
    bg: Phaser.GameObjects.Rectangle;
    baseAlpha: number;
    certified: boolean;
    color: number;
  } | null = null;

  constructor() {
    super('HubScene');
  }

  create() {
    const { width, height } = this.scale;
    this.cardInputReadyAt = Math.max(
      performance.now() + 450,
      Number((window as any).__WGF_HUB_CARD_INPUT_BLOCKED_UNTIL) || 0
    );

    // 1. Create starfield background (empty for premium black minimalism)
    this.starfield = this.add.graphics();

    // 2. Draw modern backdrop details (deep black)
    this.bgGrad = this.add.graphics();
    this.bgGrad.fillStyle(0x000000, 1);
    this.bgGrad.fillRect(0, 0, width, height);
    this.bgGrad.setDepth(-1);

    // 3. Header Title (Glowing Robinhood green sans-serif)
    this.titleText = this.add.text(width / 2, 60, 'WEEKLY GAME FACTORY', {
      fontSize: width < 450 ? '24px' : '36px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Subtle glow on title
    this.titleText.setShadow(0, 0, '#00c805', 8, true, true);

    this.subtitleText = this.add.text(width / 2, 95, this.getSubtitleText(width), {
      fontSize: width < 450 ? '10px' : '12px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
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
      // Cancel pending card tap if dragged past threshold
      if (this.pendingCardTap) {
        const dx = pointer.x - this.pendingCardTap.startX;
        const dy = pointer.y - this.pendingCardTap.startY;
        if (Math.sqrt(dx * dx + dy * dy) > 10) {
          this.pendingCardTap.bg.setFillStyle(0x111126);
          this.pendingCardTap = null;
        }
      }
      if (!this.isDragging || this.maxScroll <= 0) return;
      const delta = pointer.y - this.dragStartY;
      this.scrollY = Phaser.Math.Clamp(this.dragStartScroll + delta, -this.maxScroll, 0);
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = false;
      // Execute pending card tap if within distance threshold
      if (this.pendingCardTap) {
        const dx = pointer.x - this.pendingCardTap.startX;
        const dy = pointer.y - this.pendingCardTap.startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const tap = this.pendingCardTap;
        this.pendingCardTap = null;
        if (dist <= 10) {
          // Was a real tap — navigate to game
          this.scale.off('resize', this.handleResize, this);
          if (tap.game.url) {
            this.openCatalogUrl(tap.game.url);
          } else if (tap.game.sceneKey) {
            this.scene.start(tap.game.sceneKey);
          }
        } else {
          // Was a drag — restore card appearance
          tap.bg.setFillStyle(0x111126);
        }
      }
    });

    this.scrollIndicator = this.add.text(width / 2, height - 65, '', {
      fontSize: '12px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805'
    }).setOrigin(0.5).setDepth(10).setAlpha(0.6);

    // Handle screen resizing
    this.scale.on('resize', this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.handleResize, this);
    });
  }

  update() {
    const { width, height } = this.scale;
    
    // Draw animated scrolling starfield (disabled for black minimalism)
    this.starfield.clear();

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
      // Responsive grid for landscape
      this.maxScroll = 0;
      this.scrollY = 0;
      const columns = GAME_DEFINITIONS.length > 4 && width >= 760 ? 3 : 2;
      const rows = Math.ceil(GAME_DEFINITIONS.length / columns);
      const cardW = Math.min((width - 30 - (columns - 1) * 20) / columns, 340);
      const cardH = rows > 2 ? 95 : 120;
      const gridW = columns * cardW + (columns - 1) * 20;
      const gridH = rows * cardH + (rows - 1) * 20;
      const startX = width / 2 - gridW / 2 + cardW / 2;
      const startY = height / 2 - gridH / 2 + cardH / 2 + 15;

      GAME_DEFINITIONS.forEach((game, idx) => {
        const col = idx % columns;
        const row = Math.floor(idx / columns);
        const card = this.createGameCard(startX + col * (cardW + 20), startY + row * (cardH + 20), cardW, cardH, game);
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

    const certified = game.certificationStatus === 'certified';

    // Card background (glassmorphic layout)
    const bg = this.add.rectangle(0, 0, w, h, certified ? 0x1a1a1a : 0x0e0e0e);
    bg.setFillStyle(certified ? 0x1a1a1a : 0x0e0e0e, certified ? 0.75 : 0.4);
    bg.setStrokeStyle(1.5, certified ? 0x00c805 : 0x333333, certified ? 0.2 : 0.08);
    container.add(bg);

    // Glowing left border (Robinhood neon green)
    const border = this.add.rectangle(-w / 2 + 2.5, 0, 5, h, certified ? 0x00c805 : 0x333333, certified ? 0.8 : 0.25);
    container.add(border);

    // Text & graphics inside card
    const isSmall = h < 90;

    if (isSmall) {
      // Condensed Portrait Row
      const icon = this.add.text(-w / 2 + 25, 0, game.icon, { fontSize: '24px' }).setOrigin(0.5);
      const title = this.add.text(-w / 2 + 55, -14, game.title, {
        fontSize: '14px',
        fontStyle: 'bold',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      const subtitle = this.add.text(-w / 2 + 55, 6, `${game.weekLabel} - TOUCH + MOTION`, {
        fontSize: '10px',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: '#00c805'
      }).setOrigin(0, 0.5);

      const status = this.add.text(w / 2 - 12, 18, game.certificationLabel || 'CERTIFIED', {
        fontSize: '8px',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: certified ? '#00c805' : '#8e8e93',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      container.add([icon, title, subtitle, status]);
    } else {
      // Full Card layout for landscape
      const icon = this.add.text(-w / 2 + 35, -20, game.icon, { fontSize: '32px' }).setOrigin(0.5);
      const title = this.add.text(-w / 2 + 75, -28, game.title, {
        fontSize: '16px',
        fontStyle: 'bold',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: '#ffffff'
      }).setOrigin(0, 0.5);

      const weekText = this.add.text(-w / 2 + 75, -10, game.weekLabel, {
        fontSize: '10px',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: '#00c805',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const descText = this.add.text(-w / 2 + 15, 20, game.description, {
        fontSize: '11px',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: '#8e8e93',
        wordWrap: { width: w - 30 }
      }).setOrigin(0, 0.5);

      const status = this.add.text(w / 2 - 15, -38, game.certificationLabel || 'CERTIFIED', {
        fontSize: '9px',
        fontFamily: "'Outfit', system-ui, sans-serif",
        color: certified ? '#00c805' : '#8e8e93',
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
      bg.setStrokeStyle(2, 0x00c805, 0.95);
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
      bg.setStrokeStyle(1.5, 0x00c805, 0.2);
    });

    bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (performance.now() < this.cardInputReadyAt) return;

      if (!certified) {
        SoundSynth.playTone(220, 0.08, 'square', 0.025);
        bg.setStrokeStyle(2, 0xff3b30, 0.7);
        this.time.delayedCall(180, () => {
          bg.setStrokeStyle(1.5, 0x333333, 0.08);
        });
        return;
      }

      SoundSynth.playTone(800, 0.1, 'sine', 0.05);

      // Flash card background immediately (visual feedback)
      bg.setFillStyle(0x00c805, 0.15);

      // Record pending tap — will execute on pointerup if not dragged
      this.pendingCardTap = {
        startX: pointer.x,
        startY: pointer.y,
        game,
        bg,
        baseAlpha: 0.2,
        certified,
        color: 0x00c805
      };
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
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93'
    };

    const valueStyle = {
      fontSize: width < 450 ? '11px' : '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
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

    // Reset background graphics limits (empty for black minimalism)
    this.starfield.clear();

    // Reposition backdrop (solid black)
    this.bgGrad.clear();
    this.bgGrad.fillStyle(0x000000, 1);
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

  private openCatalogUrl(rawUrl: string) {
    const resolvedUrl = this.resolveCatalogUrl(rawUrl);
    if (!resolvedUrl) {
      SoundSynth.playTone(180, 0.1, 'square', 0.03);
      return;
    }
    if (typeof (window as any).launchGameIframe === 'function') {
      (window as any).launchGameIframe(resolvedUrl);
    } else {
      window.location.assign(resolvedUrl);
    }
  }

  private resolveCatalogUrl(rawUrl: string): string | null {
    try {
      const resolved = new URL(rawUrl, window.location.href);
      const current = new URL(window.location.href);
      const basePath = current.pathname.replace(/\/(?:index\.html)?$/, '/');
      if (resolved.origin !== current.origin) return null;
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') return null;
      if (!resolved.pathname.startsWith(`${basePath}games/`)) return null;
      return `${resolved.pathname}${resolved.search}${resolved.hash}`;
    } catch {
      return null;
    }
  }
}
