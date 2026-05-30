import Phaser from 'phaser';

export class TextureGenerator {
  /**
   * Generates a Phaser texture from a 2D grid of characters representing colors.
   */
  static generatePixelTexture(
    scene: Phaser.Scene,
    key: string,
    pixelData: string[],
    palette: Record<string, string>,
    pixelSize: number = 2
  ): void {
    if (scene.textures.exists(key)) return;

    const height = pixelData.length;
    const width = pixelData[0].length;

    const canvasTexture = scene.textures.createCanvas(key, width * pixelSize, height * pixelSize);
    if (!canvasTexture) return;

    const canvas = canvasTexture.getSourceImage() as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.clearRect(0, 0, width * pixelSize, height * pixelSize);
      for (let r = 0; r < height; r++) {
        const row = pixelData[r];
        for (let c = 0; c < width; c++) {
          const char = row[c];
          if (char && char !== '.' && palette[char]) {
            ctx.fillStyle = palette[char];
            ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
          }
        }
      }
    }

    // Refresh texture cache
    canvasTexture.refresh();
  }
}
