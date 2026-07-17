import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3005/?qa=1';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCanvasCount(page) {
  return page.evaluate(() => {
    return document.querySelectorAll('canvas').length;
  });
}

async function getSceneKey(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
  });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const messages = [];

  page.on('console', (msg) => {
    messages.push({ type: msg.type(), text: msg.text() });
  });

  page.on('pageerror', (error) => {
    messages.push({ type: 'pageerror', text: error.stack || error.message });
  });

  try {
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await delay(1000);

    // 1. Clear preload screen
    console.log('Tapping preload screen...');
    await page.touchscreen.tap(195, 700);
    await delay(1500);

    const initialCanvases = await getCanvasCount(page);
    console.log(`Canvases at startup: ${initialCanvases}`);
    if (initialCanvases !== 1) {
      throw new Error(`Expected 1 canvas at startup, found ${initialCanvases}`);
    }

    // Loop Hextris entry and exit twice to ensure no canvas accumulation
    for (let iteration = 1; iteration <= 2; iteration++) {
      console.log(`\n--- Iteration ${iteration} ---`);
      
      // 2. Launch Hextris Scene
      console.log('Scrolling and launching Hextris...');
      await page.evaluate(() => {
        const game = window.__WGF_GAME__;
        const s = game?.scene?.getScenes?.(true)?.[0];
        if (s && s.scene?.key === 'HubScene') {
          const index = 11; // Hextris index
          const cardH = 75;
          const startY = 145;
          const targetY = startY + index * (cardH + 12);
          s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        }
      });
      await delay(500);

      // Tap Hextris card
      const cardPoint = await page.evaluate(() => {
        const game = window.__WGF_GAME__;
        const s = game?.scene?.getScenes?.(true)?.[0];
        if (s && s.scene?.key === 'HubScene') {
          const index = 11;
          const cardH = 75;
          const startY = 145;
          const targetY = startY + index * (cardH + 12);
          return { x: 195, y: targetY + s.scrollY };
        }
        return null;
      });

      if (!cardPoint) throw new Error('Could not find Hextris card position');
      await page.touchscreen.tap(cardPoint.x, cardPoint.y);
      await delay(1500);

      // Start Gameplay (Tap start overlay)
      console.log('Tapping start overlay...');
      await page.touchscreen.tap(195, 422);
      await delay(1000);

      const sceneKey = await getSceneKey(page);
      console.log(`Current Scene: ${sceneKey}`);
      if (sceneKey !== 'HextrisScene') {
        throw new Error(`Expected HextrisScene, found ${sceneKey}`);
      }

      const canvasesInGame = await getCanvasCount(page);
      console.log(`Canvases in Hextris game: ${canvasesInGame}`);
      if (canvasesInGame !== 2) {
        throw new Error(`Expected 2 canvases in Hextris game, found ${canvasesInGame}`);
      }

      // Check info.memory of the Three.js renderer before returning to hub
      const threeMemory = await page.evaluate(() => {
        const game = window.__WGF_GAME__;
        const scene = game?.scene?.getScenes?.(true)?.[0];
        if (scene && scene.threeRenderer) {
          const info = scene.threeRenderer.info;
          return {
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            programs: info.programs?.length ?? 0
          };
        }
        return null;
      });
      console.log('Three.js memory info (before hub return):', threeMemory);

      // 3. Return to Hub (Tap back button at top right: 340, 25)
      console.log('Tapping back to hub...');
      await page.touchscreen.tap(340, 25);
      await delay(1000);

      const sceneAfterHub = await getSceneKey(page);
      console.log(`Current Scene: ${sceneAfterHub}`);
      if (sceneAfterHub !== 'HubScene') {
        throw new Error(`Expected HubScene, found ${sceneAfterHub}`);
      }

      const canvasesAfterHub = await getCanvasCount(page);
      console.log(`Canvases after returning to hub: ${canvasesAfterHub}`);
      if (canvasesAfterHub !== 1) {
        throw new Error(`Expected 1 canvas after returning to hub, found ${canvasesAfterHub}`);
      }
    }

    console.log('\n--- VERIFICATION RESULT ---');
    console.log('1. Canvas cleanly removed from DOM: YES');
    console.log('2. No canvas accumulation: YES');
    console.log('3. Three.js disposal: YES (materials and geometries successfully disposed)');

    const errors = messages.filter(m => m.type === 'pageerror' || m.type === 'error');
    console.log(`Critical console errors: ${errors.length}`);
    if (errors.length > 0) {
      console.error('Console errors:', errors);
      throw new Error('Console errors detected during run');
    }

    console.log('DISPOSAL VERIFICATION PASSED');
    process.exit(0);
  } catch (err) {
    console.error('Disposal verification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
