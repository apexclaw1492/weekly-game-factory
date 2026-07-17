import puppeteer from 'puppeteer';

const BASE_URL = withQaMode(process.env.BASE_URL || 'http://127.0.0.1:3000/');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withQaMode(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set('qa', '1');
  return url.toString();
}

async function run() {
  console.log("Starting Empirical Challenger verification for Hextris scene...");
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

    // 2. Resolve Hextris card position on Hub
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

    // 3. Tap card to launch Hextris
    await page.touchscreen.tap(point.x, point.y);
    await delay(1200);

    // 4. Tap the start overlay to start gameplay
    await page.touchscreen.tap(195, 422);
    await delay(500);

    // Verify HextrisScene started
    const initialPlayState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return {
        sceneKey: scene?.sceneKey,
        lifecycleState: scene?.lifecycleState,
        score: scene?.score,
        fallingBlocksCount: scene?.fallingBlocks?.length,
        settledBlocksCount: scene?.mainHex?.blocks?.reduce((acc, b) => acc + b.length, 0)
      };
    });

    console.log("Initial Play State:", initialPlayState);
    if (initialPlayState.sceneKey !== 'HextrisScene' || initialPlayState.lifecycleState !== 'playing') {
      throw new Error("Game failed to start playing.");
    }

    // --- TEST 1: Block Injection, Matching, Clearing, and Scoring ---
    console.log("\n--- TEST 1: Block Matching & Scoring ---");
    const test1Setup = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene || scene.sceneKey !== 'HextrisScene') return null;

      const inradius = scene.settings.hexWidth * Math.sqrt(3) / 2;
      const height = scene.settings.blockHeight;
      const color = '#e74c3c'; // red

      // Inject 3 red blocks adjacent to each other on lanes 0, 1, 2
      const createBlock = (lane) => ({
        settled: true,
        fallingLane: lane,
        color: color,
        iter: 1.0,
        distFromHex: inradius,
        height: height,
        attachedLane: lane,
        checked: 1,
        deleted: 0,
        opacity: 1.0,
        mesh: null
      });

      scene.mainHex.blocks[0].push(createBlock(0));
      scene.mainHex.blocks[1].push(createBlock(1));
      scene.mainHex.blocks[2].push(createBlock(2));

      return {
        beforeScore: scene.score,
        blockCount: scene.mainHex.blocks.reduce((acc, b) => acc + b.length, 0)
      };
    });
    console.log("Injected 3 blocks. Blocks count:", test1Setup?.blockCount);

    // Wait a frame/tick to let the update loop run match checks
    await delay(100);

    const test1MatchResult = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene || scene.sceneKey !== 'HextrisScene') return null;

      return {
        score: scene.score,
        blocksDeletedState: [
          scene.mainHex.blocks[0][0]?.deleted,
          scene.mainHex.blocks[1][0]?.deleted,
          scene.mainHex.blocks[2][0]?.deleted
        ]
      };
    });
    console.log("State after match execution:", test1MatchResult);

    // After 100ms, the match should have registered, score increased by 9, and deleted set to 1 (fading)
    const matchSuccess = (test1MatchResult.score === 9 && test1MatchResult.blocksDeletedState.every(s => s === 1));
    console.log(`Block matching: ${matchSuccess ? 'PASS' : 'FAIL'}`);

    // Wait for fadeout animation to complete (opacity drops by 0.075 per tick, should take ~13 ticks / 220ms)
    await delay(500);

    const test1ClearResult = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene || scene.sceneKey !== 'HextrisScene') return null;

      return {
        blocksRemaining: scene.mainHex.blocks.reduce((acc, b) => acc + b.length, 0)
      };
    });
    console.log("Blocks remaining after clear:", test1ClearResult?.blocksRemaining);
    const clearSuccess = (test1ClearResult?.blocksRemaining === 0);
    console.log(`Block clearing: ${clearSuccess ? 'PASS' : 'FAIL'}`);


    // --- TEST 2: Normal Falling & Stacking ---
    console.log("\n--- TEST 2: Normal Falling & Stacking ---");
    // We let the game run for 4 seconds to observe normal block spawning, falling and settling.
    await delay(4000);

    const afterFallingState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene || scene.sceneKey !== 'HextrisScene') return null;

      return {
        score: scene.score,
        fallingBlocksCount: scene.fallingBlocks.length,
        settledBlocksCount: scene.mainHex.blocks.reduce((acc, b) => acc + b.length, 0)
      };
    });
    console.log("State after 4 seconds of play:", afterFallingState);
    // Block falling and stacking is successful if some blocks have settled.
    const fallingStackingSuccess = (afterFallingState?.settledBlocksCount > 0);
    console.log(`Block falling/stacking: ${fallingStackingSuccess ? 'PASS' : 'FAIL'}`);


    // --- TEST 3: Rotation Tap checks ---
    console.log("\n--- TEST 3: Rotation ---");
    const angleBeforeTap = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return scene?.mainHex?.targetAngle;
    });

    // Tap left side of screen
    await page.touchscreen.tap(100, 500);
    await delay(200);

    const angleAfterLeftTap = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return scene?.mainHex?.targetAngle;
    });

    // Tap right side of screen
    await page.touchscreen.tap(300, 500);
    await delay(200);

    const angleAfterRightTap = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return scene?.mainHex?.targetAngle;
    });

    console.log("Angles: before =", angleBeforeTap, ", after left tap =", angleAfterLeftTap, ", after right tap =", angleAfterRightTap);
    const rotationSuccess = (angleAfterLeftTap !== angleBeforeTap && angleAfterRightTap !== angleAfterLeftTap);
    console.log(`Hexagon rotation: ${rotationSuccess ? 'PASS' : 'FAIL'}`);


    // --- TEST 4: Game Over Condition ---
    console.log("\n--- TEST 4: Game Over Detection ---");
    const gameOverState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene || scene.sceneKey !== 'HextrisScene') return null;

      const inradius = scene.settings.hexWidth * Math.sqrt(3) / 2;
      const height = scene.settings.blockHeight;
      const color = '#3498db'; // blue

      const createBlock = () => ({
        settled: true,
        fallingLane: 0,
        color: color,
        iter: 1.0,
        distFromHex: inradius,
        height: height,
        attachedLane: 0,
        checked: 0,
        deleted: 0,
        opacity: 1.0,
        mesh: null
      });

      // Rows setting is 8. Inject 9 blocks in Lane 0 to trigger infringement
      for (let i = 0; i < 9; i++) {
        const b = createBlock();
        b.distFromHex = inradius + i * height;
        scene.mainHex.blocks[0].push(b);
      }
      return {
        blocksCount: scene.mainHex.blocks[0].length
      };
    });
    console.log("Lane 0 block height set to:", gameOverState?.blocksCount);

    await delay(200);

    const finalLifecycle = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return scene?.lifecycleState;
    });
    console.log("Lifecycle state after infringement:", finalLifecycle);
    const gameOverSuccess = (finalLifecycle === 'gameOver');
    console.log(`Game Over detection: ${gameOverSuccess ? 'PASS' : 'FAIL'}`);


    // --- TEST 5: Console Errors/Warnings ---
    console.log("\n--- TEST 5: Browser Console Check ---");
    const noErrors = messages.length === 0;
    console.log(`Console messages count: ${messages.length}`);
    if (!noErrors) {
      console.log("Detected console errors/warnings:", JSON.stringify(messages, null, 2));
    } else {
      console.log("Console errors/warnings: PASS");
    }

    const pass = matchSuccess && clearSuccess && fallingStackingSuccess && rotationSuccess && gameOverSuccess && noErrors;
    console.log(`\nOVERALL VERDICT: ${pass ? 'PASS' : 'FAIL'}`);

    if (!pass) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
