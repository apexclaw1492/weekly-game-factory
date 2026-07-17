import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/?qa=1';
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

async function currentState(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    const scene = game?.scene?.getScenes?.(true)?.[0];
    if (!scene) return { sceneKey: null };

    if (typeof scene.getGameplayStateForQA === 'function') {
      const state = scene.getGameplayStateForQA();
      return {
        sceneKey: state.sceneKey,
        waiting: state.lifecycle === 'start',
        playerX: state.player?.x ?? null,
        playerY: state.player?.y ?? null,
        score: state.score,
        primaryActionCount: state.primaryActionCount, // dots remaining
        enemyCount: state.enemyOrHazardCount
      };
    }
    return {
      sceneKey: scene.scene?.key ?? null,
      waiting: scene.lifecycleState === 'start',
      score: scene.score ?? 0
    };
  });
}

async function touchStart(client, x, y) {
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, radiusX: 6, radiusY: 6, id: 1 }]
  });
}

async function touchMove(client, x, y) {
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x, y, radiusX: 6, radiusY: 6, id: 1 }]
  });
}

async function touchEnd(client) {
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
}

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
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

    // --- First Entrance ---
    console.log('\n=== First Entrance to Pac-Man ===');
    // Scroll to Pac-Man card (index 12)
    await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 12;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
      }
    });
    await delay(500);

    const cardPoint = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 12;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!cardPoint) throw new Error('Could not find Pac-Man card position');
    await page.touchscreen.tap(cardPoint.x, cardPoint.y);
    await delay(1500);

    let sceneKey = await getSceneKey(page);
    console.log(`Current Scene: ${sceneKey}`);
    if (sceneKey !== 'PacManScene') {
      throw new Error(`Expected PacManScene, found ${sceneKey}`);
    }

    let canvasCount = await getCanvasCount(page);
    console.log(`Canvases in Pac-Man (before play): ${canvasCount}`);
    if (canvasCount !== 2) {
      throw new Error(`Expected 2 canvases (Phaser + Three.js), found ${canvasCount}`);
    }

    // Start Gameplay (Tap center)
    console.log('Tapping to start gameplay...');
    await page.touchscreen.tap(195, 422);
    await delay(500);

    const stateStart = await currentState(page);
    console.log('Initial State:', stateStart);

    // Get Three.js memory info before playing
    const memoryBefore = await page.evaluate(() => {
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
    console.log('Three.js Memory before steering:', memoryBefore);
    if (!memoryBefore || memoryBefore.geometries === 0) {
      throw new Error('Three.js memory info indicates 0 geometries loaded (should be non-zero)');
    }

    // Test touch drag steering responsiveness & eating dots
    console.log('Performing drag gesture to steer Left...');
    await touchStart(client, 195, 500);
    await delay(100);
    await touchMove(client, 100, 500);
    await delay(200);
    await touchEnd(client);
    await delay(1000); // Wait for Pacman to travel and eat dots

    const stateAfterLeft = await currentState(page);
    console.log('State after steering Left:', stateAfterLeft);

    // Verify steering and eating
    if (stateAfterLeft.playerX >= stateStart.playerX) {
      throw new Error(`Pac-Man did not move left. Start X: ${stateStart.playerX}, End X: ${stateAfterLeft.playerX}`);
    }
    if (stateAfterLeft.score <= stateStart.score) {
      throw new Error(`Pac-Man score did not increase after eating dots. Start: ${stateStart.score}, End: ${stateAfterLeft.score}`);
    }
    if (stateAfterLeft.primaryActionCount >= stateStart.primaryActionCount) {
      throw new Error(`Remaining dots count did not decrease. Start: ${stateStart.primaryActionCount}, End: ${stateAfterLeft.primaryActionCount}`);
    }

    console.log('Steering & eating checks: PASS');

    // Check for console errors/warnings
    const webglErrors = messages.filter(m => m.text.toLowerCase().includes('webgl') || m.type === 'pageerror');
    console.log('WebGL or Page Errors logged:', webglErrors);
    if (webglErrors.length > 0) {
      throw new Error(`WebGL or page errors detected: ${JSON.stringify(webglErrors)}`);
    }

    // Tap Back button to return to Hub
    console.log('Tapping Back to Hub...');
    await page.touchscreen.tap(20, 16);
    await delay(1000);

    sceneKey = await getSceneKey(page);
    console.log(`Current Scene after returning to Hub: ${sceneKey}`);
    if (sceneKey !== 'HubScene') {
      throw new Error(`Expected HubScene, found ${sceneKey}`);
    }

    canvasCount = await getCanvasCount(page);
    console.log(`Canvas count after returning to Hub: ${canvasCount}`);
    if (canvasCount !== 1) {
      throw new Error(`Expected 1 canvas after returning to Hub (Three.js canvas should be removed), found ${canvasCount}`);
    }

    // --- Second Entrance to verify re-entrance and disposal safety ---
    console.log('\n=== Second Entrance to Pac-Man ===');
    // Scroll to Pac-Man card (index 12)
    await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 12;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
      }
    });
    await delay(500);

    await page.touchscreen.tap(cardPoint.x, cardPoint.y);
    await delay(1500);

    sceneKey = await getSceneKey(page);
    console.log(`Current Scene (2nd entrance): ${sceneKey}`);
    if (sceneKey !== 'PacManScene') {
      throw new Error(`Expected PacManScene on 2nd entrance, found ${sceneKey}`);
    }

    canvasCount = await getCanvasCount(page);
    console.log(`Canvases on 2nd entrance: ${canvasCount}`);
    if (canvasCount !== 2) {
      throw new Error(`Expected 2 canvases on 2nd entrance, found ${canvasCount}`);
    }

    // Start Gameplay (Tap center)
    console.log('Tapping to start gameplay (2nd entrance)...');
    await page.touchscreen.tap(195, 422);
    await delay(500);

    // Tap Back button to return to Hub
    console.log('Tapping Back to Hub (2nd entrance)...');
    await page.touchscreen.tap(20, 16);
    await delay(1000);

    sceneKey = await getSceneKey(page);
    console.log(`Current Scene after 2nd Hub return: ${sceneKey}`);
    if (sceneKey !== 'HubScene') {
      throw new Error(`Expected HubScene, found ${sceneKey}`);
    }

    canvasCount = await getCanvasCount(page);
    console.log(`Canvas count after 2nd Hub return: ${canvasCount}`);
    if (canvasCount !== 1) {
      throw new Error(`Expected 1 canvas, found ${canvasCount}`);
    }

    console.log('\nDISPOSAL & RE-ENTRANCE VERIFICATION PASSED');
    process.exit(0);
  } catch (err) {
    console.error('\nVerification failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
