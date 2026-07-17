import puppeteer from 'puppeteer';

const BASE_URL = withQaMode(process.env.BASE_URL || 'http://127.0.0.1:3000/');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withQaMode(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set('qa', '1');
  return url.toString();
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
        score: state.score,
        angle: scene.mainHex?.targetAngle ?? null,
        canvasCount: document.querySelectorAll('canvas').length
      };
    }
    return {
      sceneKey: scene.scene?.key ?? null,
      waiting: scene.lifecycleState === 'start',
      score: scene.score ?? 0,
      canvasCount: document.querySelectorAll('canvas').length
    };
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
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await delay(500);

    // 1. Clear preload screen
    await page.touchscreen.tap(195, 700);
    await delay(1000);

    // 2. Query index 11 (Hextris) card coordinate and auto-scroll the Hub
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 11; // Hextris index
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve Hextris card position on Hub');
    }

    // 3. Tap the card to launch the game
    await page.touchscreen.tap(point.x, point.y);
    await delay(1000);

    // 4. Tap the start overlay at the center to start the game
    await page.touchscreen.tap(195, 422);
    await delay(500);

    const started = await currentState(page);

    // 5. Tap left side of screen to rotate left
    await page.touchscreen.tap(100, 500);
    await delay(500);

    const afterTapLeft = await currentState(page);

    // 6. Tap right side of screen to rotate right
    await page.touchscreen.tap(300, 500);
    await delay(500);

    const afterTapRight = await currentState(page);

    // 6.5 Verify stacking, matching, clearing, and scoring
    const gameplayVerification = await page.evaluate(async () => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene) return { success: false, reason: 'Scene not found' };

      // Clear any falling blocks that spawned naturally
      scene.fallingBlocks.forEach(b => {
        if (b.mesh) scene.threeScene.remove(b.mesh);
      });
      scene.fallingBlocks = [];
      // Clear any settled blocks that spawned naturally
      for (let side = 0; side < 6; side++) {
        scene.mainHex.blocks[side] = [];
      }

      // Add a block to lane 0 (Red '#e74c3c') and make it settle immediately
      scene.addNewBlock(0, '#e74c3c', 1.0);
      const b1 = scene.fallingBlocks.find(b => b.color === '#e74c3c');
      const inradius = scene.settings.hexWidth * Math.sqrt(3) / 2;
      if (b1) b1.distFromHex = inradius; // Force collision

      // Wait a frame for collision to process in next update
      await new Promise(r => setTimeout(r, 50));

      const settledCountL0_step1 = scene.mainHex.blocks[0].length;

      // Add a second block of a different color (Yellow '#f1c40f') to lane 0, force it to settle
      scene.addNewBlock(0, '#f1c40f', 1.0);
      const b2 = scene.fallingBlocks.find(b => b.color === '#f1c40f');
      if (b2) b2.distFromHex = inradius + scene.settings.blockHeight; // Stack on top

      await new Promise(r => setTimeout(r, 50));

      const settledCountL0_step2 = scene.mainHex.blocks[0].length;
      const stackingSuccess = settledCountL0_step1 === 1 && settledCountL0_step2 === 2;

      // Now clear blocks and test matching/clearing
      for (let side = 0; side < 6; side++) {
        scene.mainHex.blocks[side] = [];
      }
      scene.fallingBlocks = [];
      scene.score = 0;

      const h = scene.settings.blockHeight;

      // Add 3 Red blocks stacked in lane 0
      scene.addNewBlock(0, '#e74c3c', 1.0);
      const m1 = scene.fallingBlocks.find(b => b.color === '#e74c3c');
      if (m1) m1.distFromHex = inradius;
      await new Promise(r => setTimeout(r, 50));

      scene.addNewBlock(0, '#e74c3c', 1.0);
      // find the one that is not settled
      const m2 = scene.fallingBlocks.find(b => b.color === '#e74c3c' && !b.settled);
      if (m2) m2.distFromHex = inradius + h;
      await new Promise(r => setTimeout(r, 50));

      scene.addNewBlock(0, '#e74c3c', 1.0);
      const m3 = scene.fallingBlocks.find(b => b.color === '#e74c3c' && !b.settled);
      if (m3) m3.distFromHex = inradius + h * 2;
      await new Promise(r => setTimeout(r, 50));

      const scoreBeforeMatch = scene.score;
      const blocksCountBeforeMatch = scene.mainHex.blocks[0].length;

      // Wait for matching logic to complete
      await new Promise(r => setTimeout(r, 100));

      const scoreAfterMatch = scene.score;
      const blocksCountAfterMatch = scene.mainHex.blocks[0].length;

      // Wait for fade out animation
      await new Promise(r => setTimeout(r, 500));

      const finalBlocksCount = scene.mainHex.blocks[0].length;
      const matchingSuccess = scoreAfterMatch > 0 && finalBlocksCount === 0;

      return {
        stackingSuccess,
        matchingSuccess,
        scoreAfterMatch,
        finalBlocksCount,
        settledCountL0_step1,
        settledCountL0_step2
      };
    });

    // 7. Click back to hub (top-right for Hextris)
    await page.touchscreen.tap(340, 25);
    await delay(500);

    const hubState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      return {
        sceneKey: game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null,
        canvasCount: document.querySelectorAll('canvas').length
      };
    });

    const result = {
      started,
      afterTapLeft,
      afterTapRight,
      hubState,
      gameplayVerification,
      checks: {
        correctScene: started.sceneKey === 'HextrisScene',
        startedGameplay: started.waiting === false,
        rotatedLeft: typeof started.angle === 'number' && typeof afterTapLeft.angle === 'number' && afterTapLeft.angle !== started.angle,
        rotatedRight: typeof afterTapLeft.angle === 'number' && typeof afterTapRight.angle === 'number' && afterTapRight.angle !== afterTapLeft.angle,
        noPageErrors: messages.every((message) => message.type !== 'pageerror' && message.type !== 'error'),
        returnedToHub: hubState.sceneKey === 'HubScene',
        stackingSuccess: gameplayVerification.stackingSuccess,
        matchingSuccess: gameplayVerification.matchingSuccess,
        canvasCleanupSuccess: started.canvasCount === 2 && hubState.canvasCount === 1
      },
      messages
    };

    console.log(JSON.stringify(result, null, 2));

    const failed = Object.values(result.checks).some((value) => !value);
    if (failed) {
      process.exit(1);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
