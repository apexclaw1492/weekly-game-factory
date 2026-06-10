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
        playerVelocityX: state.player?.vx ?? null,
        score: state.score
      };
    }

    return {
      sceneKey: scene.scene?.key ?? null,
      waiting: scene.lifecycleState === 'start',
      playerX: scene.bottomPaddle?.x ?? null,
      playerVelocityX: scene.bottomPaddle?.body?.velocity?.x ?? null,
      score: scene.scorePlayer ?? null
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
    
    // Tap to pass boot/preload if needed
    await page.touchscreen.tap(195, 700);
    await delay(1000);
    
    // Tap the Pong card in the Hub. It is the fifth native card.
    await page.touchscreen.tap(195, 493);
    await delay(1000);
    
    // Tap to start the game from 'start' state
    await page.touchscreen.tap(195, 422);
    await delay(500);

    const started = await currentState(page);

    // Simulate drag movement on bottom half to move paddle
    await touchStart(client, 195, 700);
    await delay(200);
    await touchMove(client, 100, 700); // Move left
    await delay(500);
    const movingLeft = await currentState(page);

    await touchMove(client, 300, 700); // Move right
    await delay(500);
    const movingRight = await currentState(page);

    await touchEnd(client);
    await delay(300);
    const released = await currentState(page);

    const result = {
      started,
      movingLeft,
      movingRight,
      released,
      checks: {
        correctScene: started.sceneKey === 'PongScene',
        startedGameplay: started.waiting === false,
        movedLeft: typeof started.playerX === 'number' && typeof movingLeft.playerX === 'number' && movingLeft.playerX < started.playerX - 40,
        movedRight: typeof movingLeft.playerX === 'number' && typeof movingRight.playerX === 'number' && movingRight.playerX > movingLeft.playerX + 120,
        noPageErrors: messages.every((message) => message.type !== 'pageerror' && message.type !== 'error')
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
