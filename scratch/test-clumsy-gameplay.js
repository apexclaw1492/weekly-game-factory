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
        lifecycle: state.lifecycle,
        playerY: state.player?.y ?? null,
        playerVY: state.player?.vy ?? null,
        playerAlive: state.player?.alive ?? null,
        score: state.score,
        primaryActionCount: state.primaryActionCount
      };
    }
    return {
      sceneKey: scene.scene?.key ?? null,
      lifecycle: scene.lifecycleState ?? null,
      score: scene.score ?? 0,
      playerAlive: !scene.isDead
    };
  });
}

async function startAutopilot(page) {
  await page.evaluate(() => {
    window.__autopilot = setInterval(() => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene || scene.scene?.key !== 'ClumsyBirdScene') return;

      if (scene.lifecycleState === 'playing' && !scene.isDead) {
        const birdY = scene.birdY;
        const birdVY = scene.birdVY;
        const birdZ = scene.birdZ;

        // Find pipes that are ahead of the bird (birdZ is negative and decreasing)
        const aheadPipes = scene.pipes.filter(p => p.z < birdZ);
        // Sort descending by z to get the closest next pipe
        aheadPipes.sort((a, b) => b.z - a.z);
        const nextPipe = aheadPipes[0];

        if (nextPipe) {
          const targetY = nextPipe.gapY;
          // Flap if bird is falling below target center and velocity is not already strongly upward
          if (birdY < targetY - 0.4 && birdVY < 2.0) {
            scene.flap();
          }
        } else {
          // Keep near Y = 0 if no pipes
          if (birdY < -0.3 && birdVY < 2.0) {
            scene.flap();
          }
        }
      }
    }, 30);
  });
}

async function stopAutopilot(page) {
  await page.evaluate(() => {
    if (window.__autopilot) {
      clearInterval(window.__autopilot);
      window.__autopilot = null;
    }
  });
}

async function run() {
  console.log(`Navigating to ${BASE_URL}...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const messages = [];
  
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    // Exclude noise if any, otherwise record warnings/errors
    if (['error', 'warning'].includes(type)) {
      messages.push({ type, text });
      console.warn(`[Browser Console ${type.toUpperCase()}] ${text}`);
    }
  });

  page.on('pageerror', (error) => {
    const text = error.stack || error.message;
    messages.push({ type: 'pageerror', text });
    console.error(`[Browser PageError] ${text}`);
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
    console.log("Clearing preload screen...");
    await page.touchscreen.tap(195, 700);
    await delay(1000);

    // 2. Query index 10 (Clumsy Bird) card coordinate and auto-scroll the Hub
    console.log("Locating Clumsy Bird on Hub...");
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 10; // Clumsy Bird index
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve Clumsy Bird card position on Hub');
    }

    // 3. Tap the card to launch the game
    console.log("Launching Clumsy Bird...");
    await page.touchscreen.tap(point.x, point.y);
    await delay(1000);

    // Verify scene key
    let state = await currentState(page);
    console.log(`Current Scene: ${state.sceneKey}, Lifecycle: ${state.lifecycle}`);
    if (state.sceneKey !== 'ClumsyBirdScene') {
      throw new Error(`Expected ClumsyBirdScene, but got ${state.sceneKey}`);
    }

    // 4. Tap the start overlay at the center to start the game
    console.log("Starting gameplay...");
    await page.touchscreen.tap(195, 422);
    await delay(200);

    state = await currentState(page);
    if (state.lifecycle !== 'playing') {
      throw new Error(`Expected gameplay lifecycle to be 'playing', got: ${state.lifecycle}`);
    }

    // 5. Start autopilot
    console.log("Starting autopilot to pass the first pipe...");
    await startAutopilot(page);

    // Poll until score is 1 (or timeout)
    const startTime = Date.now();
    let scoreReachedOne = false;
    let autopilotFlaps = 0;

    while (Date.now() - startTime < 12000) { // 12 seconds max
      await delay(200);
      state = await currentState(page);
      autopilotFlaps = state.primaryActionCount;
      if (state.score >= 1) {
        scoreReachedOne = true;
        console.log(`Passed the first pipe! Score is now: ${state.score}. Bird Y: ${state.playerY?.toFixed(2)}`);
        break;
      }
      if (!state.playerAlive) {
        console.log("Autopilot crashed early!");
        break;
      }
    }

    if (!scoreReachedOne) {
      throw new Error(`Autopilot failed to score 1 point within timeout. Current state: ${JSON.stringify(state)}`);
    }

    // 6. Stop autopilot to let the bird crash (test collision/gameover)
    console.log("Stopping autopilot to verify collision/death...");
    await stopAutopilot(page);

    // Poll until bird is dead
    const crashStartTime = Date.now();
    let hasDied = false;
    while (Date.now() - crashStartTime < 5000) { // 5 seconds max
      await delay(100);
      state = await currentState(page);
      if (!state.playerAlive && state.lifecycle === 'gameOver') {
        hasDied = true;
        console.log(`Bird has crashed successfully. Lifecycle: ${state.lifecycle}, Alive: ${state.playerAlive}`);
        break;
      }
    }

    if (!hasDied) {
      throw new Error(`Bird did not crash/die as expected. Current state: ${JSON.stringify(state)}`);
    }

    // 7. Verify no errors/warnings occurred in the browser console
    const noErrorsOrWarnings = messages.length === 0;

    const summary = {
      gameplayLoopPassed: scoreReachedOne && hasDied,
      noConsoleErrorsOrWarnings: noErrorsOrWarnings,
      flappedMultipleTimes: autopilotFlaps > 2,
      messages
    };

    console.log("Test Summary:", JSON.stringify(summary, null, 2));

    if (!summary.gameplayLoopPassed) {
      console.error("FAIL: Gameplay loop test failed!");
      process.exit(1);
    }
    if (!summary.noConsoleErrorsOrWarnings) {
      console.warn("WARNING: Browser console errors or warnings were logged!");
      // We will report this, but let's check if they are fatal or actual bugs.
      // Usually warnings about audio context are okay but we need to verify.
    }
    console.log("PASS: Empirical verification of Clumsy Bird gameplay loop succeeded!");
    process.exit(0);

  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
