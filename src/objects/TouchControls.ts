import Phaser from 'phaser';

export class TouchControls extends Phaser.GameObjects.Container {
  public leftPressed = false;
  public rightPressed = false;
  public upPressed = false;
  public downPressed = false;
  public aPressed = false;
  public bPressed = false;
  public autoToggled = true;

  private controlType: 'dpad-ab' | 'lr-thrust' | 'lr-shoot';
  private controls: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, controlType: 'dpad-ab' | 'lr-thrust' | 'lr-shoot', autoToggled = true) {
    super(scene);
    this.controlType = controlType;
    this.autoToggled = autoToggled;
    this.setScrollFactor(0);
    this.setDepth(1000);
    this.resize();
    scene.add.existing(this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.resetPressed, this);
  }

  public resize() {
    const { width, height } = this.scene.scale;
    this.resetPressed();
    
    // Clear existing controls
    this.removeAll(true);
    this.controls = [];

    const buttonRadius = Math.max(22, Math.floor(Math.min(width, height) * 0.045));
    const dpadRadius = buttonRadius * 2;

    if (this.controlType === 'dpad-ab') {
      // Contra: D-Pad bottom-left, buttons bottom-right
      const dpadX = 90;
      const dpadY = height - 90;

      const dpadBg = this.scene.add.circle(dpadX, dpadY, dpadRadius, 0xffffff, 0.05);
      dpadBg.setStrokeStyle(2, 0xffffff, 0.15);
      this.add(dpadBg);
      this.controls.push(dpadBg);

      const btnOffset = buttonRadius + 4;
      const upBtn = this.createButton(dpadX, dpadY - btnOffset, buttonRadius * 0.7, '▲', () => this.upPressed = true, () => this.upPressed = false);
      const downBtn = this.createButton(dpadX, dpadY + btnOffset, buttonRadius * 0.7, '▼', () => this.downPressed = true, () => this.downPressed = false);
      const leftBtn = this.createButton(dpadX - btnOffset, dpadY, buttonRadius * 0.7, '◀', () => this.leftPressed = true, () => this.leftPressed = false);
      const rightBtn = this.createButton(dpadX + btnOffset, dpadY, buttonRadius * 0.7, '▶', () => this.rightPressed = true, () => this.rightPressed = false);

      const actionX = width - 80;
      const actionY = height - 80;
      const btnB = this.createButton(actionX - (buttonRadius * 2.5), actionY, buttonRadius, 'B', () => this.bPressed = true, () => this.bPressed = false, 0xff5555);
      const btnA = this.createButton(actionX, actionY, buttonRadius, 'A', () => this.aPressed = true, () => this.aPressed = false, 0x55ff55);
      const btnAuto = this.createToggleButton(actionX - (buttonRadius * 2.5), actionY - (buttonRadius * 2.5), buttonRadius * 0.65, (toggled) => this.autoToggled = toggled);

      this.add([upBtn, downBtn, leftBtn, rightBtn, btnB, btnA, btnAuto]);
      this.controls.push(upBtn, downBtn, leftBtn, rightBtn, btnB, btnA, btnAuto);
    } else if (this.controlType === 'lr-thrust') {
      // Asteroids: Left/Right rotate bottom-left, Thrust bottom-right
      const btnY = height - 80;
      const leftX = 70;
      const rightX = leftX + (buttonRadius * 2.5);

      const btnLeft = this.createButton(leftX, btnY, buttonRadius, '◀', () => this.leftPressed = true, () => this.leftPressed = false, 0x00ccff);
      const btnRight = this.createButton(rightX, btnY, buttonRadius, '▶', () => this.rightPressed = true, () => this.rightPressed = false, 0x00ccff);
      
      const actionX = width - 80;
      const btnThrust = this.createButton(actionX, btnY, buttonRadius, 'THRUST', () => this.upPressed = true, () => this.upPressed = false, 0xffcc33);
      const btnFire = this.createButton(actionX - (buttonRadius * 2.5), btnY, buttonRadius, 'FIRE', () => this.bPressed = true, () => this.bPressed = false, 0xff5555);
      const btnAuto = this.createToggleButton(actionX, btnY - (buttonRadius * 2.5), buttonRadius * 0.65, (toggled) => this.autoToggled = toggled);

      this.add([btnLeft, btnRight, btnFire, btnThrust, btnAuto]);
      this.controls.push(btnLeft, btnRight, btnFire, btnThrust, btnAuto);
    } else if (this.controlType === 'lr-shoot') {
      // Space Invaders: Left/Right bottom-left, Shoot bottom-right
      const btnY = height - 80;
      const leftX = 70;
      const rightX = leftX + (buttonRadius * 2.5);

      const btnLeft = this.createButton(leftX, btnY, buttonRadius, '◀', () => this.leftPressed = true, () => this.leftPressed = false, 0x00ccff);
      const btnRight = this.createButton(rightX, btnY, buttonRadius, '▶', () => this.rightPressed = true, () => this.rightPressed = false, 0x00ccff);
      
      const actionX = width - 80;
      const btnShoot = this.createButton(actionX, btnY, buttonRadius, 'FIRE', () => this.aPressed = true, () => this.aPressed = false, 0xff5555);

      this.add([btnLeft, btnRight, btnShoot]);
      this.controls.push(btnLeft, btnRight, btnShoot);
    }
  }

  public resetPressed() {
    this.leftPressed = false;
    this.rightPressed = false;
    this.upPressed = false;
    this.downPressed = false;
    this.aPressed = false;
    this.bPressed = false;
  }

  public isInControlZone(pointer: Phaser.Input.Pointer) {
    const { width, height } = this.scene.scale;
    const controlBand = Math.max(110, Math.floor(Math.min(width, height) * 0.22));
    return pointer.y >= height - controlBand;
  }

  private createButton(
    x: number,
    y: number,
    radius: number,
    label: string,
    onDown: () => void,
    onUp: () => void,
    color: number = 0xffffff
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(1000);

    const circle = this.scene.add.circle(0, 0, radius, color, 0.15);
    circle.setStrokeStyle(2, color, 0.5);

    // Hit area 1.5x larger than visual
    const hitArea = new Phaser.Geom.Circle(0, 0, radius * 1.5);
    circle.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

    const text = this.scene.add.text(0, 0, label, {
      fontSize: radius > 22 ? '14px' : '10px',
      fontFamily: 'monospace',
      color: '#ffffff',
      align: 'center'
    });
    text.setOrigin(0.5);

    container.add([circle, text]);

    circle.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      circle.setFillStyle(color, 0.4);
      onDown();
      event.stopPropagation();
    });

    const release = () => {
      circle.setFillStyle(color, 0.15);
      onUp();
    };

    circle.on('pointerup', release);
    circle.on('pointerupoutside', release);
    circle.on('pointerout', release);

    return container;
  }

  private createToggleButton(
    x: number,
    y: number,
    radius: number,
    onToggle: (toggled: boolean) => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setScrollFactor(0);
    container.setDepth(1000);

    let toggled = this.autoToggled;
    const colorOn = 0x55ff55;
    const colorOff = 0xff5555;

    const circle = this.scene.add.circle(0, 0, radius, toggled ? colorOn : colorOff, 0.2);
    circle.setStrokeStyle(2, toggled ? colorOn : colorOff, 0.6);

    // Hit area 1.5x larger than visual
    const hitArea = new Phaser.Geom.Circle(0, 0, radius * 1.5);
    circle.setInteractive(hitArea, Phaser.Geom.Circle.Contains);

    const text = this.scene.add.text(0, 0, toggled ? 'AUTO' : 'MAN', {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#ffffff'
    });
    text.setOrigin(0.5);

    container.add([circle, text]);

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

    circle.on('pointerdown', (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      toggled = !toggled;
      this.autoToggled = toggled;
      updateVisuals();
      onToggle(toggled);
      event.stopPropagation();
    });

    return container;
  }
}
