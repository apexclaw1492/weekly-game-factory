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
        bulletCount: state.primaryActionCount,
        enemyCount: state.enemyOrHazardCount,
        score: state.score
      };
    }

    return {
      sceneKey: scene.scene?.key ?? null,
      waiting: scene.isWaitingToStart,
      playerX: scene.player?.x ?? null,
      playerVelocityX: scene.player?.body?.velocity?.x ?? null,
      bulletCount: scene.bullets?.countActive?.(true) ?? null,
      enemyCount: scene.enemies?.countActive?.(true) ?? null,
      score: scene.score ?? null
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
    await delay(350);
    await page.touchscreen.tap(195, 700);
    await delay(900);
    await page.touchscreen.tap(195, 145);
    await delay(1000);
    await page.touchscreen.tap(195, 500);
    await delay(400);

    const started = await currentState(page);

    await touchStart(client, 60, 720);
    await delay(700);
    const left = await currentState(page);

    await touchMove(client, 330, 720);
    await delay(900);
    const right = await currentState(page);

    await touchEnd(client);
    await delay(300);
    const released = await currentState(page);

    const result = {
      started,
      left,
      right,
      released,
      checks: {
        correctScene: started.sceneKey === 'SpaceInvadersScene',
        startedGameplay: started.waiting === false,
        firedBullet: left.bulletCount > 0 || right.bulletCount > 0,
        movedRight: typeof left.playerX === 'number' && typeof right.playerX === 'number' && right.playerX - left.playerX > 35,
        destroyedEnemy: typeof started.enemyCount === 'number' && typeof released.enemyCount === 'number' && released.enemyCount < started.enemyCount,
        scoreFinite: Number.isFinite(released.score),
        noPageErrors: messages.every((message) => message.type !== 'pageerror' && message.type !== 'error')
      },
      messages
    };

    console.log(JSON.stringify(result, null, 2));

    const failed = Object.values(result.checks).some((value) => !value);
    if (failed) {
      process.exit(1);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
