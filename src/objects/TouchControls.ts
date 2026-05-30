import Phaser from 'phaser';

export class TouchControls extends Phaser.GameObjects.Container {
  public leftPressed = false;
  public rightPressed = false;
  public upPressed = false;
  public downPressed = false;
  public aPressed = false;
  public bPressed = false;
  public autoToggled = true;

  constructor(scene: Phaser.Scene, type: 'dpad-ab' | 'lr-thrust' | 'lr-shoot') {
    super(scene);

    const { width, height } = scene.scale;

    // Setup values
    const buttonRadius = 28;
    const dpadRadius = 55;

    // Check configuration and build controls
    if (type === 'dpad-ab') {
      // Contra: D-Pad bottom-left, buttons bottom-right
      const dpadX = 90;
      const dpadY = height - 90;

      // Draw D-pad background disk
      const dpadBg = scene.add.circle(dpadX, dpadY, dpadRadius, 0xffffff, 0.05);
      dpadBg.setStrokeStyle(2, 0xffffff, 0.15);
      this.add(dpadBg);

      // Create directional buttons
      const btnSize = 18;
      const upBtn = this.createButton(scene, dpadX, dpadY - 32, btnSize, '▲', () => this.upPressed = true, () => this.upPressed = false);
      const downBtn = this.createButton(scene, dpadX, dpadY + 32, btnSize, '▼', () => this.downPressed = true, () => this.downPressed = false);
      const leftBtn = this.createButton(scene, dpadX - 32, dpadY, btnSize, '◀', () => this.leftPressed = true, () => this.leftPressed = false);
      const rightBtn = this.createButton(scene, dpadX + 32, dpadY, btnSize, '▶', () => this.rightPressed = true, () => this.rightPressed = false);

      this.add([upBtn, downBtn, leftBtn, rightBtn]);

      // Action buttons bottom-right
      const actionY = height - 80;
      const btnB = this.createButton(scene, width - 140, actionY, buttonRadius, 'B', () => this.bPressed = true, () => this.bPressed = false, 0xff5555);
      const btnA = this.createButton(scene, width - 70, actionY, buttonRadius, 'A', () => this.aPressed = true, () => this.aPressed = false, 0x55ff55);
      
      // Auto toggle above B button
      const btnAuto = this.createToggleButton(scene, width - 140, actionY - 70, 18, 'AUTO', (toggled) => this.autoToggled = toggled);

      this.add([btnB, btnA, btnAuto]);
    } else if (type === 'lr-thrust') {
      // Asteroids: Left/Right rotate bottom-left, Thrust bottom-right
      const btnY = height - 80;
      
      const btnLeft = this.createButton(scene, 70, btnY, buttonRadius, '◀', () => this.leftPressed = true, () => this.leftPressed = false, 0x00ccff);
      const btnRight = this.createButton(scene, 150, btnY, buttonRadius, '▶', () => this.rightPressed = true, () => this.rightPressed = false, 0x00ccff);
      
      const btnThrust = this.createButton(scene, width - 70, btnY, buttonRadius, 'THRUST', () => this.upPressed = true, () => this.upPressed = false, 0xffcc33);
      const btnAuto = this.createToggleButton(scene, width - 70, btnY - 70, 18, 'AUTO', (toggled) => this.autoToggled = toggled);

      this.add([btnLeft, btnRight, btnThrust, btnAuto]);
    } else if (type === 'lr-shoot') {
      // Space Invaders: Left/Right bottom-left, Shoot bottom-right
      const btnY = height - 80;

      const btnLeft = this.createButton(scene, 70, btnY, buttonRadius, '◀', () => this.leftPressed = true, () => this.leftPressed = false, 0x00ccff);
      const btnRight = this.createButton(scene, 150, btnY, buttonRadius, '▶', () => this.rightPressed = true, () => this.rightPressed = false, 0x00ccff);
      
      const btnShoot = this.createButton(scene, width - 70, btnY, buttonRadius, 'FIRE', () => this.aPressed = true, () => this.aPressed = false, 0xff5555);

      this.add([btnLeft, btnRight, btnShoot]);
    }

    scene.add.existing(this);
  }

  private createButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    label: string,
    onDown: () => void,
    onUp: () => void,
    color: number = 0xffffff
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    const circle = scene.add.circle(0, 0, radius, color, 0.15);
    circle.setStrokeStyle(2, color, 0.5);

    const text = scene.add.text(0, 0, label, {
      fontSize: radius > 22 ? '14px' : '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    });
    text.setOrigin(0.5);

    container.add([circle, text]);

    // Setup input
    circle.setInteractive();

    circle.on('pointerdown', () => {
      circle.setFillStyle(color, 0.4);
      onDown();
    });

    const release = () => {
      circle.setFillStyle(color, 0.15);
      onUp();
    };

    circle.on('pointerup', release);
    circle.on('pointerout', release);

    return container;
  }

  private createToggleButton(
    scene: Phaser.Scene,
    x: number,
    y: number,
    radius: number,
    label: string,
    onToggle: (toggled: boolean) => void
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(x, y);

    let toggled = true;
    const colorOn = 0x55ff55;
    const colorOff = 0xff5555;

    const circle = scene.add.circle(0, 0, radius, colorOn, 0.2);
    circle.setStrokeStyle(2, colorOn, 0.6);

    const text = scene.add.text(0, 0, label, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    container.add([circle, text]);
    circle.setInteractive();

    const updateVisuals = () => {
      if (toggled) {
        circle.setFillStyle(colorOn, 0.2);
        circle.setStrokeStyle(2, colorOn, 0.6);
        text.setText('AUTO');
      } else {
        circle.setFillStyle(colorOff, 0.2);
        circle.setStrokeStyle(2, colorOff, 0.6);
        text.setText('MAN');
      }
    };

    circle.on('pointerdown', () => {
      toggled = !toggled;
      updateVisuals();
      onToggle(toggled);
    });

    return container;
  }
}
