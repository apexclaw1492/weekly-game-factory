import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:3000/?qa=1';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function getSceneState(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    const scene = game?.scene?.getScenes?.(true)?.[0];
    if (!scene) return null;
    return {
      sceneKey: scene.scene?.key ?? null,
      lifecycleState: scene.lifecycleState,
      animState: scene.animState,
      queuedDirection: scene.queuedDirection,
      score: scene.board?.score ?? 0,
      tilesCount: scene.board?.cells ? scene.board.cells.flat().filter(Boolean).length : 0
    };
  });
}

async function run() {
  console.log('Launching browser for challenger test...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const client = await page.target().createCDPSession();
  
  const consoleErrors = [];
  const consoleWarnings = [];
  
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      consoleErrors.push(text);
    } else if (type === 'warning' || type === 'warn') {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', (error) => {
    consoleErrors.push(error.stack || error.message);
  });

  try {
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    let targetUrl = BASE_URL;
    try {
      console.log(`Trying port 3000: ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (err) {
      targetUrl = 'http://127.0.0.1:3003/?qa=1';
      console.log(`Port 3000 failed or timed out. Trying port 3003: ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    }
    await delay(1000);

    // 1. Clear preload / hub screen
    console.log('Clearing hub screen...');
    await page.touchscreen.tap(195, 700);
    await delay(1000);

    // Scroll to 2048 and launch it
    console.log('Launching 2048 scene...');
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 9; // 2048 card index
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Failed to locate 2048 on Hub scene');
    }

    await page.touchscreen.tap(point.x, point.y);
    await delay(1500);

    // Tap start gameplay overlay
    console.log('Starting gameplay...');
    await page.touchscreen.tap(195, 422);
    await delay(800);

    let state = await getSceneState(page);
    console.log('Initial playing state:', state);
    if (!state || state.sceneKey !== 'TwoZeroFourEightScene' || state.lifecycleState !== 'playing') {
      throw new Error('Not in 2048 playing scene');
    }

    // --- CHECK 1: Immediate Swipe During Drag (Without Waiting For Release) ---
    console.log('\n--- CHECK 1: Swipe during drag (immediate execution) ---');
    // Start touch
    await touchStart(client, 195, 500);
    await delay(50);
    // Drag left by 120px (exceeds SWIPE_MIN_DIST = 40)
    await touchMove(client, 75, 500);
    await delay(50);
    
    // Read state immediately *before* touchEnd
    const midDragState = await getSceneState(page);
    console.log('Mid-drag state:', midDragState);
    
    const dragExecutedSwipe = midDragState && midDragState.animState === 'sliding';
    console.log('Swipe triggered during drag (before touchEnd)?', dragExecutedSwipe ? 'YES' : 'NO');

    // End touch
    await touchEnd(client);
    await delay(600); // Wait for sliding & popping animation to complete

    // --- CHECK 2: Rapid Swiping/Queueing (Does not drop inputs) ---
    console.log('\n--- CHECK 2: Rapid swipe queueing test ---');
    // Swipe Down to initiate first animation
    console.log('Swiping down...');
    await touchStart(client, 195, 400);
    await delay(50);
    await touchMove(client, 195, 550);
    await touchEnd(client);
    
    // Immediately after touchEnd, when it is sliding/animating:
    let animatingState = await getSceneState(page);
    console.log('Animating state:', animatingState);
    
    // Now trigger a second swipe immediately (e.g. Left) while the first is animating
    console.log('Rapidly swiping left while first swipe is animating...');
    await touchStart(client, 250, 500);
    await delay(50);
    await touchMove(client, 100, 500);
    await touchEnd(client);

    // Read state to check if queuedDirection is registered
    const queuedState = await getSceneState(page);
    console.log('State with queued direction:', queuedState);
    
    const queuedDirectionCorrect = queuedState && queuedState.queuedDirection !== null;
    console.log('Is a direction queued?', queuedDirectionCorrect ? `YES (direction: ${queuedState.queuedDirection})` : 'NO');

    // Wait for the animations to complete
    await delay(1200);
    
    // Check final state
    const finalState = await getSceneState(page);
    console.log('Final state after animations completed:', finalState);
    const finalQueuedExecuted = finalState && finalState.queuedDirection === null && finalState.animState === 'idle';
    console.log('Queue processed and reset to idle?', finalQueuedExecuted ? 'YES' : 'NO');

    // --- CHECK 3: Console Errors and Warnings ---
    console.log('\n--- CHECK 3: Console errors and warnings ---');
    console.log('Console Errors found:', consoleErrors);
    console.log('Console Warnings found:', consoleWarnings);

    const check1Passed = dragExecutedSwipe;
    const check2Passed = queuedDirectionCorrect && finalQueuedExecuted;
    const check3Passed = consoleErrors.length === 0 && consoleWarnings.length === 0;

    console.log('\n--- Summary ---');
    console.log(`Check 1 (Immediate Swipe on Drag): ${check1Passed ? 'PASS' : 'FAIL'}`);
    console.log(`Check 2 (Input Queueing): ${check2Passed ? 'PASS' : 'FAIL'}`);
    console.log(`Check 3 (No Console Errors/Warnings): ${check3Passed ? 'PASS' : 'FAIL'}`);

    if (check1Passed && check2Passed && check3Passed) {
      console.log('ALL PROGRAMMATIC CHECKS PASSED!');
      process.exit(0);
    } else {
      console.error('SOME CHECKS FAILED!');
      process.exit(1);
    }

  } catch (err) {
    console.error('Error occurred during test run:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
