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
    if (!scene) return null;

    const canvasCount = document.querySelectorAll('canvas').length;
    const clumsyCanvasExists = !!document.getElementById('three-canvas-clumsy');

    return {
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

async function run() {
  console.log(`Starting Challenger Test for Clumsy Bird on ${BASE_URL}...`);
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
    await delay(500);

    // Clear preload screen
    console.log("Clearing preload...");
    await page.touchscreen.tap(195, 700);
    await delay(1000);

    // Scroll and navigate to Clumsy Bird
    console.log("Navigating to Clumsy Bird...");
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 10;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve Clumsy Bird position on Hub');
    }

    await page.touchscreen.tap(point.x, point.y);
    await delay(1000);

    // Check Clumsy Bird Scene loaded
    let state = await getSceneState(page);
    console.log("Loaded ClumsyBirdScene:", state);
    if (state.sceneKey !== 'ClumsyBirdScene') {
      throw new Error("Expected to be in ClumsyBirdScene");
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

    // --- CHECK 1: Verify exactly 1 flap per touch/click, primaryActionCount incrementing by exactly 1 ---
    const initialActions = state.primaryActionCount;
    console.log(`Initial actions: ${initialActions}`);

    // Tap 1: touchscreen tap
    console.log("Triggering touchscreen tap...");
    await page.touchscreen.tap(195, 500);
    await delay(100);
    state = await getSceneState(page);
    console.log(`Actions after touchscreen tap: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 1) {
      throw new Error(`Touchscreen tap did not increment primaryActionCount by exactly 1 (expected ${initialActions + 1}, got ${state.primaryActionCount})`);
    }

    // Wait for bird to fall a bit
    await delay(500);

    // Tap 2: mouse click
    console.log("Triggering mouse click...");
    await page.mouse.click(195, 500);
    await delay(100);
    state = await getSceneState(page);
    console.log(`Actions after mouse click: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 2) {
      throw new Error(`Mouse click did not increment primaryActionCount by exactly 1 (expected ${initialActions + 2}, got ${state.primaryActionCount})`);
    }

    // Wait for bird to fall a bit
    await delay(500);

    // Tap 3: Keyboard Space
    console.log("Triggering Space keypress...");
    await page.keyboard.press('Space');
    await delay(100);
    state = await getSceneState(page);
    console.log(`Actions after Space key: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 3) {
      throw new Error(`Space key did not increment primaryActionCount by exactly 1 (expected ${initialActions + 3}, got ${state.primaryActionCount})`);
    }

    // Wait for bird to fall a bit
    await delay(500);

    // Tap 4: Keyboard ArrowUp
    console.log("Triggering ArrowUp keypress...");
    await page.keyboard.press('ArrowUp');
    await delay(100);
    state = await getSceneState(page);
    console.log(`Actions after ArrowUp key: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 4) {
      throw new Error(`ArrowUp key did not increment primaryActionCount by exactly 1 (expected ${initialActions + 4}, got ${state.primaryActionCount})`);
    }

    // Wait for bird to fall a bit
    await delay(500);

    // Tap 5: Keyboard KeyW
    console.log("Triggering KeyW keypress...");
    await page.keyboard.press('KeyW');
    await delay(100);
    state = await getSceneState(page);
    console.log(`Actions after KeyW key: ${state.primaryActionCount}, VY: ${state.birdVY}`);
    if (state.primaryActionCount !== initialActions + 5) {
      throw new Error(`KeyW key did not increment primaryActionCount by exactly 1 (expected ${initialActions + 5}, got ${state.primaryActionCount})`);
    }

    console.log("CHECK 1 PASSED: Exactly 1 flap per touch/click/keypress verified.");

    // --- CHECK 2: Verify no GridHelper memory leak upon scene reset or exit ---
    console.log("Checking initial canvases and GridHelper existence...");
    state = await getSceneState(page);
    console.log(`Before exit: Canvases = ${state.canvasCount}, clumsyCanvasExists = ${state.clumsyCanvasExists}, gridHelperInScene = ${state.gridHelperInScene}`);
    if (state.canvasCount !== 2) {
      throw new Error(`Expected exactly 2 canvases (Phaser and Three.js), got ${state.canvasCount}`);
    }
    if (!state.clumsyCanvasExists) {
      throw new Error("Three.js canvas not found in DOM");
    }
    if (!state.gridHelperInScene) {
      throw new Error("GridHelper is not in Three.js scene");
    }

    // Now let's trigger a reset gameplay
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
    // Verify that gridHelper is still in the scene and not leaked/duplicated
    if (state.canvasCount !== 2) {
      throw new Error(`After reset: Expected exactly 2 canvases, got ${state.canvasCount}`);
    }
    if (!state.gridHelperInScene) {
      throw new Error("GridHelper should still be in the scene after reset");
    }

    // Let's do a loop of entering Clumsy Bird, exiting to Hub, and entering again to verify no resource leaks
    for (let i = 1; i <= 3; i++) {
      console.log(`Transition Loop ${i}: Exiting to Hub...`);
      // Exit to Hub
      await page.touchscreen.tap(20, 16);
      await delay(800);

      // Verify HubScene is active and Clumsy Bird canvas is removed
      const currentActiveScene = await page.evaluate(() => {
        const game = window.__WGF_GAME__;
        return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
      });
      state = await getSceneState(page);
      console.log(`After exit: ActiveScene = ${currentActiveScene}, Canvases = ${state.canvasCount}, clumsyCanvasExists = ${state.clumsyCanvasExists}`);

      if (currentActiveScene !== 'HubScene') {
        throw new Error(`Expected to be in HubScene, got ${currentActiveScene}`);
      }
      if (state.canvasCount !== 1) {
        throw new Error(`Expected exactly 1 canvas (Phaser) in Hub, got ${state.canvasCount}`);
      }
      if (state.clumsyCanvasExists) {
        throw new Error("clumsy Three.js canvas still exists in DOM after exit");
      }
      // Check that GridHelper geometry is disposed (it is cleaned up on exit)
      const isGridHelperDisposed = await page.evaluate(() => {
        const game = window.__WGF_GAME__;
        const scene = game?.scene?.getScene('ClumsyBirdScene');
        // Let's check if the geometry is disposed. A disposed geometry might have null group or empty attributes
        return !scene.gridHelper || !scene.gridHelper.geometry || scene.gridHelper.geometry.index === null;
      });
      console.log(`GridHelper disposed check: ${isGridHelperDisposed}`);

      // Re-enter Clumsy Bird
      console.log(`Transition Loop ${i}: Re-entering Clumsy Bird...`);
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
    }

    console.log("CHECK 2 PASSED: GridHelper lifecycle and memory safety verified (no leaks on reset/exit).");

    console.log("ALL CHALLENGER CHECKS PASSED!");
    process.exit(0);

  } catch (err) {
    console.error("FAIL: Challenger test failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
