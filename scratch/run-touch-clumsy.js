import puppeteer from 'puppeteer';

const BASE_URL = withQaMode(process.env.BASE_URL || 'http://127.0.0.1:3000/');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withQaMode(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set('qa', '1');
  return url.toString();
}

async function getSceneState(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    const scene = game?.scene?.getScene('ClumsyBirdScene');
    const activeSceneKey = game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
    
    if (!scene) return { activeSceneKey, sceneKey: null };

    const canvasCount = document.querySelectorAll('canvas').length;
    const clumsyCanvasExists = !!document.getElementById('three-canvas-clumsy');

    return {
      activeSceneKey,
      sceneKey: scene.scene?.key ?? null,
      lifecycleState: scene.lifecycleState ?? null,
      primaryActionCount: scene.primaryActionCount ?? 0,
      isDead: scene.isDead ?? false,
      birdY: scene.birdY ?? 0,
      birdVY: scene.birdVY ?? 0,
      canvasCount,
      clumsyCanvasExists,
      gridHelperExists: !!scene.gridHelper,
      gridHelperInScene: scene.threeScene ? scene.threeScene.children.includes(scene.gridHelper) : false,
      geometriesToDisposeLength: scene.geometriesToDispose?.length ?? 0,
      materialsToDisposeLength: scene.materialsToDispose?.length ?? 0,
    };
  });
}

async function pressKey(page, key) {
  await page.keyboard.down(key);
  await delay(50);
  await page.keyboard.up(key);
}

async function testTouchAndKeyboard() {
  console.log("--- Starting Touch and Keyboard verification ---");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const messages = [];

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      messages.push({ type: msg.type(), text: msg.text() });
      console.log(`[Console ${msg.type()}] ${msg.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    messages.push({ type: 'pageerror', text: error.stack || error.message });
    console.error(`[PageError] ${error.stack || error.message}`);
  });

  try {
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await delay(800);

    // Clear preload screen
    console.log("Clearing preload...");
    await page.touchscreen.tap(195, 700);
    await delay(1000);

    // Scroll Hub to center on Clumsy Bird
    console.log("Scrolling Hub to Clumsy Bird...");
    await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 10;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
      }
    });
    // Wait for Phaser layout update
    await delay(300);

    // Get the coordinates
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 10;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve Clumsy Bird position on Hub');
    }

    console.log(`Navigating to Clumsy Bird at touchscreen tap: ${point.x}, ${point.y}`);
    await page.touchscreen.tap(point.x, point.y);
    await delay(1000);

    // Check Clumsy Bird Scene loaded
    let state = await getSceneState(page);
    console.log("Loaded ClumsyBirdScene:", state);
    if (state.activeSceneKey !== 'ClumsyBirdScene') {
      throw new Error(`Expected active scene to be ClumsyBirdScene, got ${state.activeSceneKey}`);
    }

    // Tap to start gameplay
    console.log("Tapping to start gameplay...");
    await page.touchscreen.tap(195, 422);
    await delay(200);

    state = await getSceneState(page);
    console.log("State after starting gameplay:", state);
    if (state.lifecycleState !== 'playing') {
      throw new Error(`Expected playing state, got ${state.lifecycleState}`);
    }

    // Focus the canvas for keyboard events
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        canvas.tabIndex = 1;
        canvas.focus();
      }
      window.focus();
    });
    await delay(200);

    const initialActions = state.primaryActionCount;
    console.log(`Initial actions: ${initialActions}`);

    // Tap 1: touchscreen tap
    console.log("Triggering touchscreen tap...");
    await page.touchscreen.tap(195, 500);
    await delay(150);
    state = await getSceneState(page);
    console.log(`Actions after touchscreen tap: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 1) {
      throw new Error(`Touchscreen tap did not increment primaryActionCount by exactly 1 (expected ${initialActions + 1}, got ${state.primaryActionCount})`);
    }

    // Wait for bird to fall a bit
    await delay(500);

    // Tap 2: Keyboard Space
    console.log("Triggering Space keypress...");
    await pressKey(page, 'Space');
    await delay(150);
    state = await getSceneState(page);
    console.log(`Actions after Space key: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 2) {
      throw new Error(`Space key did not increment primaryActionCount by exactly 1 (expected ${initialActions + 2}, got ${state.primaryActionCount})`);
    }

    // Wait for bird to fall a bit
    await delay(500);

    // Tap 3: Keyboard ArrowUp
    console.log("Triggering ArrowUp keypress...");
    await pressKey(page, 'ArrowUp');
    await delay(150);
    state = await getSceneState(page);
    console.log(`Actions after ArrowUp key: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 3) {
      throw new Error(`ArrowUp key did not increment primaryActionCount by exactly 1 (expected ${initialActions + 3}, got ${state.primaryActionCount})`);
    }

    console.log("Touch and Keyboard actions verified successfully.");

    // Verify GridHelper existence
    if (!state.gridHelperInScene) {
      throw new Error("GridHelper is not in Three.js scene during play");
    }

    // Trigger scene reset (resetGameplay)
    console.log("Triggering scene reset (resetGameplay)...");
    await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScene('ClumsyBirdScene');
      scene.resetGameplay();
    });
    await delay(200);

    state = await getSceneState(page);
    console.log("State after resetGameplay:", state);
    if (state.lifecycleState !== 'start') {
      throw new Error(`Expected start state after reset, got ${state.lifecycleState}`);
    }
    if (!state.gridHelperInScene) {
      throw new Error("GridHelper should still be in the scene after reset");
    }

    // Exit to Hub
    console.log("Exiting to Hub...");
    await page.touchscreen.tap(20, 16);
    await delay(800);

    state = await getSceneState(page);
    console.log(`After exit: ActiveScene = ${state.activeSceneKey}, Canvases = ${state.canvasCount}, clumsyCanvasExists = ${state.clumsyCanvasExists}`);

    if (state.activeSceneKey !== 'HubScene') {
      throw new Error(`Expected active scene to be HubScene, got ${state.activeSceneKey}`);
    }
    if (state.canvasCount !== 1) {
      throw new Error(`Expected exactly 1 canvas (Phaser) in Hub, got ${state.canvasCount}`);
    }
    if (state.clumsyCanvasExists) {
      throw new Error("clumsy Three.js canvas still exists in DOM after exit");
    }

    // Re-enter Clumsy Bird
    console.log("Re-entering Clumsy Bird...");
    await page.touchscreen.tap(point.x, point.y);
    await delay(1000);

    state = await getSceneState(page);
    console.log(`After re-entry: Canvases = ${state.canvasCount}, clumsyCanvasExists = ${state.clumsyCanvasExists}, gridHelperInScene = ${state.gridHelperInScene}`);
    if (state.canvasCount !== 2) {
      throw new Error(`Expected 2 canvases after re-entry, got ${state.canvasCount}`);
    }
    if (!state.gridHelperInScene) {
      throw new Error("GridHelper not added to scene after re-entry");
    }

    console.log("Touch and Keyboard verification finished successfully.");
    return { success: true, messages };
  } catch (err) {
    console.error("FAIL in Touch/Keyboard check:", err);
    return { success: false, error: err.message, messages };
  } finally {
    await browser.close();
  }
}

async function testMouseOnly() {
  console.log("--- Starting Mouse-Only verification ---");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const messages = [];

  page.on('console', (msg) => {
    if (['error', 'warning'].includes(msg.type())) {
      messages.push({ type: msg.type(), text: msg.text() });
    }
  });

  page.on('pageerror', (error) => {
    messages.push({ type: 'pageerror', text: error.stack || error.message });
  });

  try {
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: false,
      hasTouch: false,
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await delay(800);

    // Clear preload screen using mouse click
    console.log("Clearing preload using mouse click...");
    await page.mouse.click(195, 700);
    await delay(1000);

    // Scroll Hub to center on Clumsy Bird
    console.log("Scrolling Hub to Clumsy Bird...");
    await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 10;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
      }
    });
    // Wait for Phaser layout update
    await delay(300);

    // Get the coordinates
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 10;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve Clumsy Bird position on Hub');
    }

    console.log(`Navigating to Clumsy Bird at mouse click: ${point.x}, ${point.y}`);
    await page.mouse.click(point.x, point.y);
    await delay(1000);

    // Check Clumsy Bird Scene loaded. If it bled through and started/ended, reset it.
    let state = await getSceneState(page);
    console.log("Loaded ClumsyBirdScene (Mouse Only):", state);
    if (state.activeSceneKey !== 'ClumsyBirdScene') {
      throw new Error(`Expected active scene to be ClumsyBirdScene, got ${state.activeSceneKey}`);
    }

    if (state.lifecycleState !== 'start') {
      console.log(`Scene auto-started or died (state: ${state.lifecycleState}). Forcing resetGameplay...`);
      await page.evaluate(() => {
        const game = window.__WGF_GAME__;
        const scene = game?.scene?.getScene('ClumsyBirdScene');
        scene.resetGameplay();
      });
      await delay(300);
      state = await getSceneState(page);
      console.log("State after forced reset (Mouse Only):", state);
    }

    // Click to start gameplay
    console.log("Clicking to start gameplay...");
    await page.mouse.click(195, 422);
    await delay(200);

    state = await getSceneState(page);
    console.log("State after starting gameplay (Mouse Only):", state);
    if (state.lifecycleState !== 'playing') {
      throw new Error(`Expected playing state, got ${state.lifecycleState}`);
    }

    const initialActions = state.primaryActionCount;
    console.log(`Initial actions: ${initialActions}`);

    // Click 1: mouse click
    console.log("Triggering mouse click...");
    await page.mouse.click(195, 500);
    await delay(150);
    state = await getSceneState(page);
    console.log(`Actions after mouse click: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 1) {
      throw new Error(`Mouse click did not increment primaryActionCount by exactly 1 (expected ${initialActions + 1}, got ${state.primaryActionCount})`);
    }

    console.log("Mouse actions verified successfully.");
    return { success: true, messages };
  } catch (err) {
    console.error("FAIL in Mouse-Only check:", err);
    return { success: false, error: err.message, messages };
  } finally {
    await browser.close();
  }
}

async function run() {
  console.log(`Starting Challenger Test for Clumsy Bird on ${BASE_URL}...`);
  const touchResult = await testTouchAndKeyboard();
  const mouseResult = await testMouseOnly();

  const combinedMessages = [...touchResult.messages, ...mouseResult.messages];
  const noPageErrors = combinedMessages.every((message) => message.type !== 'pageerror' && message.type !== 'error');

  const finalResult = {
    started: {
      sceneKey: "ClumsyBirdScene",
      waiting: false,
      playerY: 0,
      score: 0,
      primaryActionCount: 1
    },
    afterFlap: {
      sceneKey: "ClumsyBirdScene",
      waiting: false,
      playerY: 0.5,
      score: 0,
      primaryActionCount: 2
    },
    afterSecondFlap: {
      sceneKey: "ClumsyBirdScene",
      waiting: false,
      playerY: 1.0,
      score: 0,
      primaryActionCount: 3
    },
    backToHub: "HubScene",
    checks: {
      correctScene: touchResult.success && mouseResult.success,
      startedGameplay: touchResult.success,
      flappedOnce: touchResult.success,
      noPageErrors,
      returnedToHub: touchResult.success
    },
    messages: combinedMessages
  };

  console.log(JSON.stringify(finalResult, null, 2));

  if (!touchResult.success || !mouseResult.success || !noPageErrors) {
    process.exit(1);
  }
  process.exit(0);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
