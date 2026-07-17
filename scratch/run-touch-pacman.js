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

    // 2. Query index 12 (Pacman) card coordinate and auto-scroll the Hub
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 12; // Pac-Man index
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve Pac-Man card position on Hub');
    }

    // 3. Tap the card to launch the game
    await page.touchscreen.tap(point.x, point.y);
    await delay(1000);

    // 4. Tap the start overlay at the center to start the game
    await page.touchscreen.tap(195, 422);
    await delay(500);

    const started = await currentState(page);

    // 5. Drag/Swipe left to steer Pacman left
    await touchStart(client, 195, 500);
    await delay(100);
    await touchMove(client, 100, 500);
    await delay(200);
    await touchEnd(client);
    await delay(450); // Wait for Pacman to travel

    const afterSteer = await currentState(page);

    // 6. Click back to hub
    await page.touchscreen.tap(20, 16);
    await delay(500);

    const backToHub = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
    });

    const result = {
      started,
      afterSteer,
      backToHub,
      checks: {
        correctScene: started.sceneKey === 'PacManScene',
        startedGameplay: started.waiting === false,
        movedLeft: typeof started.playerX === 'number' && typeof afterSteer.playerX === 'number' && afterSteer.playerX < started.playerX,
        noPageErrors: messages.every((message) => message.type !== 'pageerror' && message.type !== 'error'),
        returnedToHub: backToHub === 'HubScene'
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
