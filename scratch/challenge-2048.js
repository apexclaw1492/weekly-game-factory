import puppeteer from 'puppeteer';

const BASE_URL = withQaMode(process.env.BASE_URL || 'http://127.0.0.1:3000/');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withQaMode(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set('qa', '1');
  return url.toString();
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
  console.log("Starting Empirical Challenger stress tests for 2048 game...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  
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

    // 2. Resolve 2048 position on Hub
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 9; // 2048 index
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve 2048 card position on Hub');
    }

    // 3. Tap card to launch 2048
    await page.touchscreen.tap(point.x, point.y);
    await delay(1000);

    // 4. Tap the start overlay
    await page.touchscreen.tap(195, 422);
    await delay(500);

    // Verify we are playing
    const initialPlayState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return {
        sceneKey: scene?.scene?.key,
        lifecycleState: scene?.lifecycleState,
        animState: scene?.animState
      };
    });
    console.log("Initial Play State:", initialPlayState);
    if (initialPlayState.sceneKey !== 'TwoZeroFourEightScene' || initialPlayState.lifecycleState !== 'playing') {
      throw new Error("Game failed to start playing.");
    }

    // --- TEST 1: Immediate Swipe during Finger Drag (No touchEnd) ---
    console.log("\n--- TEST 1: Immediate Swipe during Finger Drag (No touchEnd) ---");
    // Start swipe left: touch down, then drag left beyond threshold (e.g. 195 to 100)
    await touchStart(client, 195, 500);
    await delay(50);
    await touchMove(client, 100, 500);
    // Wait a brief moment to let game process the touchmove input and start animation, BUT DO NOT send touchEnd!
    await delay(100);

    const dragProgressState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return {
        animState: scene?.animState,
        queuedDirection: scene?.queuedDirection
      };
    });
    console.log("State during finger drag (before touchEnd):", dragProgressState);

    // Verify it started sliding immediately
    const immediateSwipeSuccess = (dragProgressState.animState === 'sliding');
    console.log(`Immediate swipe execution: ${immediateSwipeSuccess ? 'PASS' : 'FAIL'} (animState should be 'sliding', is '${dragProgressState.animState}')`);

    // Clean up touch
    await touchEnd(client);
    await delay(500); // Wait for sliding & popping to end completely and return to idle

    const afterTest1State = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return {
        animState: scene?.animState
      };
    });
    console.log("State after Test 1 completion:", afterTest1State);

    // --- TEST 2: Input Queueing / Rapid Swiping ---
    console.log("\n--- TEST 2: Input Queueing / Rapid Swiping ---");
    // We send a swipe Down (starts at 195, 400; moves to 195, 500; ends)
    // This starts a downward move.
    await touchStart(client, 195, 400);
    await delay(50);
    await touchMove(client, 195, 500);
    await delay(50);
    await touchEnd(client);

    // Immediately (within 50ms, while first move animation is running), we send a swipe Right (moves 195 to 300)
    await delay(40);
    const midAnimState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return { animState: scene?.animState };
    });
    console.log("State during first swipe animation:", midAnimState);
    if (midAnimState.animState === 'idle') {
      console.warn("WARNING: Game animation already finished or didn't start. Queueing test timing might be off.");
    }

    // Now send the rapid second swipe (Right: 1 = Right)
    await touchStart(client, 195, 500);
    await delay(50);
    await touchMove(client, 300, 500);
    await delay(50);
    
    // Check if the second swipe was queued in TwoZeroFourEightScene
    const queuedStateBeforeEnd = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return {
        animState: scene?.animState,
        queuedDirection: scene?.queuedDirection
      };
    });
    console.log("State during second swipe drag:", queuedStateBeforeEnd);

    await touchEnd(client);
    await delay(50);

    const queuedStateAfterEnd = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return {
        animState: scene?.animState,
        queuedDirection: scene?.queuedDirection
      };
    });
    console.log("State after second swipe touchEnd:", queuedStateAfterEnd);

    // Either during drag or immediately after end, queuedDirection should have been set to 1 (Right)
    const queueingSuccess = (queuedStateBeforeEnd.queuedDirection === 1 || queuedStateAfterEnd.queuedDirection === 1);
    console.log(`Input queueing (queuedDirection is 1): ${queueingSuccess ? 'PASS' : 'FAIL'}`);

    // Wait for the animations to finish completely
    await delay(800);

    const finalState = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      return {
        animState: scene?.animState,
        queuedDirection: scene?.queuedDirection
      };
    });
    console.log("Final State (should be idle & null queue):", finalState);

    // --- TEST 3: Console errors and warnings check ---
    console.log("\n--- TEST 3: Console errors/warnings ---");
    const noErrors = messages.length === 0;
    console.log(`Console messages count: ${messages.length}`);
    if (!noErrors) {
      console.log("Detected console errors/warnings:", JSON.stringify(messages, null, 2));
    } else {
      console.log("Console errors/warnings: PASS");
    }

    const pass = immediateSwipeSuccess && queueingSuccess && noErrors;
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
