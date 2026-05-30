import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  create() {
    const { width, height } = this.scale;

    // Renders a beautiful retro style boot loader
    this.add.text(width / 2, height / 2 - 60, 'WEEKLY GAME FACTORY', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: '#00ccff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const statusText = this.add.text(width / 2, height / 2 + 10, 'INITIALIZING OS...', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#8888a0'
    }).setOrigin(0.5);

    // Progress bar
    const progressBg = this.add.rectangle(width / 2, height / 2 + 40, 240, 8, 0x111122);
    progressBg.setStrokeStyle(1, 0x333366);
    const progressBar = this.add.rectangle(width / 2 - 120, height / 2 + 40, 0, 8, 0x00ccff).setOrigin(0, 0.5);

    const steps = [
      { progress: 0.15, status: 'BOOTING WEEKLY GAME FACTORY...' },
      { progress: 0.35, status: 'GENERATING DYNAMIC RETRO TEXTURES...' },
      { progress: 0.55, status: 'CALIBRATING PHYSICAL CONSTANTS...' },
      { progress: 0.75, status: 'LOADING PORTABLE GAME COMPILATION...' },
      { progress: 0.90, status: 'UNSHACKLING SOUND HARMONICS...' },
      { progress: 1.00, status: 'SYSTEM READY. PRESS START.' }
    ];

    let currentStepIndex = 0;

    const runNextStep = () => {
      if (currentStepIndex >= steps.length) {
        this.time.delayedCall(400, () => {
          this.scene.start('HubScene');
        });
        return;
      }

      const step = steps[currentStepIndex];
      statusText.setText(step.status);
      
      this.tweens.add({
        targets: progressBar,
        width: 240 * step.progress,
        duration: 250 + Math.random() * 200,
        onComplete: () => {
          currentStepIndex++;
          this.time.delayedCall(100, runNextStep);
        }
      });
    };

    runNextStep();
  }
}
