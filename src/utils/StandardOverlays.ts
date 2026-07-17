import Phaser from 'phaser';

export class StandardOverlays {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Shows the Pause overlay.
   * @param onResume Callback when resume is clicked/tapped.
   * @param onQuit Callback when quit is clicked/tapped.
   */
  public showPause(onResume: () => void, onQuit: () => void): void {
    this.clear();
    const { width, height } = this.scene.scale;

    // Overlay container
    this.container = this.scene.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(2000);

    // Glassmorphic background panel
    const w = Math.min(width - 40, 360);
    const h = 220;
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x1a1a1a);
    bg.setFillStyle(0x1a1a1a, 0.85);
    bg.setStrokeStyle(2, 0x00c805, 0.6);
    this.container.add(bg);

    // Glowing left indicator line (sleek neon green)
    const indicator = this.scene.add.rectangle(-w / 2 + 3, 0, 6, h, 0x00c805, 1);
    this.container.add(indicator);

    // Title
    const title = this.scene.add.text(0, -60, 'GAME PAUSED', {
      fontSize: '28px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#00c805', 6, true, true);
    this.container.add(title);

    // Resume button/hint
    const resumeBtn = this.scene.add.text(0, 5, 'RESUME GAME', {
      fontSize: '16px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#00c805',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    
    resumeBtn.on('pointerdown', () => {
      this.clear();
      onResume();
    });
    this.container.add(resumeBtn);

    // Quit to Hub button
    const quitBtn = this.scene.add.text(0, 55, 'QUIT TO HUB', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    quitBtn.on('pointerdown', () => {
      this.clear();
      onQuit();
    });
    this.container.add(quitBtn);
  }

  /**
   * Shows the Game Over overlay.
   */
  public showGameOver(score: number, onRestart: () => void, onQuit: () => void): void {
    this.clear();
    const { width, height } = this.scene.scale;

    this.container = this.scene.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(2000);

    const w = Math.min(width - 40, 360);
    const h = 240;
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x1a1a1a);
    bg.setFillStyle(0x1a1a1a, 0.85);
    bg.setStrokeStyle(2, 0x00c805, 0.6);
    this.container.add(bg);

    const indicator = this.scene.add.rectangle(-w / 2 + 3, 0, 6, h, 0xff3b30, 1); // Red accent for Game Over
    this.container.add(indicator);

    const title = this.scene.add.text(0, -65, 'GAME OVER', {
      fontSize: '32px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ff3b30',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(title);

    const scoreText = this.scene.add.text(0, -15, `FINAL SCORE: ${score}`, {
      fontSize: '18px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.container.add(scoreText);

    const restartBtn = this.scene.add.text(0, 35, 'PLAY AGAIN', {
      fontSize: '16px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#00c805',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => {
      this.clear();
      onRestart();
    });
    this.container.add(restartBtn);

    const quitBtn = this.scene.add.text(0, 80, 'RETURN TO HUB', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    quitBtn.on('pointerdown', () => {
      this.clear();
      onQuit();
    });
    this.container.add(quitBtn);
  }

  /**
   * Shows the Victory / Level Complete overlay.
   */
  public showVictory(titleStr: string, details: string, onNext: () => void, onQuit: () => void): void {
    this.clear();
    const { width, height } = this.scene.scale;

    this.container = this.scene.add.container(width / 2, height / 2).setScrollFactor(0).setDepth(2000);

    const w = Math.min(width - 40, 360);
    const h = 240;
    const bg = this.scene.add.rectangle(0, 0, w, h, 0x1a1a1a);
    bg.setFillStyle(0x1a1a1a, 0.85);
    bg.setStrokeStyle(2, 0x00c805, 0.6);
    this.container.add(bg);

    const indicator = this.scene.add.rectangle(-w / 2 + 3, 0, 6, h, 0x00c805, 1);
    this.container.add(indicator);

    const title = this.scene.add.text(0, -65, titleStr, {
      fontSize: '28px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#00c805',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    title.setShadow(0, 0, '#00c805', 6, true, true);
    this.container.add(title);

    const detailsText = this.scene.add.text(0, -15, details, {
      fontSize: '16px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: w - 40 }
    }).setOrigin(0.5);
    this.container.add(detailsText);

    const nextBtn = this.scene.add.text(0, 35, 'CONTINUE', {
      fontSize: '16px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#ffffff',
      fontStyle: 'bold',
      backgroundColor: '#00c805',
      padding: { x: 16, y: 8 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    nextBtn.on('pointerdown', () => {
      this.clear();
      onNext();
    });
    this.container.add(nextBtn);

    const quitBtn = this.scene.add.text(0, 80, 'RETURN TO HUB', {
      fontSize: '14px',
      fontFamily: "'Outfit', system-ui, sans-serif",
      color: '#8e8e93',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    quitBtn.on('pointerdown', () => {
      this.clear();
      onQuit();
    });
    this.container.add(quitBtn);
  }

  /**
   * Clears the overlay.
   */
  public clear(): void {
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
  }

  /**
   * Check if an overlay is currently visible.
   */
  public isVisible(): boolean {
    return this.container !== null;
  }
}
