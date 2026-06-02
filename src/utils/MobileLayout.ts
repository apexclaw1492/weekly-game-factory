import Phaser from 'phaser';

export interface MobileLayout {
  width: number;
  height: number;
  isPortrait: boolean;
  isCompact: boolean;
  hudTop: number;
  playTop: number;
  playBottom: number;
  controlBand: number;
  controlCenterY: number;
  leftPad: number;
  rightPad: number;
  buttonSize: number;
}

export function getMobileLayout(scene: Phaser.Scene): MobileLayout {
  const { width, height } = scene.scale;
  const isPortrait = height >= width;
  const isCompact = Math.min(width, height) < 430;
  const controlBand = isPortrait
    ? Math.max(132, Math.floor(height * 0.18))
    : Math.max(92, Math.floor(height * 0.24));

  return {
    width,
    height,
    isPortrait,
    isCompact,
    hudTop: 16,
    playTop: isCompact ? 92 : 96,
    playBottom: height - controlBand - 10,
    controlBand,
    controlCenterY: height - controlBand / 2,
    leftPad: isCompact ? 24 : 32,
    rightPad: isCompact ? 24 : 32,
    buttonSize: isCompact ? 38 : 44
  };
}

export function isInBottomControlBand(scene: Phaser.Scene, pointer: Phaser.Input.Pointer) {
  const layout = getMobileLayout(scene);
  return pointer.y >= layout.height - layout.controlBand;
}
