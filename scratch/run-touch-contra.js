import puppeteer from 'puppeteer';

const BASE_URL = withQaMode(process.env.BASE_URL || 'http://127.0.0.1:3000/');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withQaMode(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set('qa', '1');
  return url.toString();
}

function cardPoint(viewport, index) {
  if (viewport.height > viewport.width) {
    return {
      x: viewport.width / 2,
      y: 145 + index * 87
    };
  }

  const gameCount = 9;
  const columns = gameCount > 4 && viewport.width >= 760 ? 3 : 2;
  const rows = Math.ceil(gameCount / columns);
  const cardW = Math.min((viewport.width - 30 - (columns - 1) * 20) / columns, 340);
  const cardH = rows > 2 ? 95 : 120;
  const gridW = columns * cardW + (columns - 1) * 20;
  const gridH = rows * cardH + (rows - 1) * 20;
  const startX = viewport.width / 2 - gridW / 2 + cardW / 2;
  const startY = viewport.height / 2 - gridH / 2 + cardH / 2 + 15;
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: startX + col * (cardW + 20),
    y: startY + row * (cardH + 20)
  };
}

async function currentState(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    const scene = game?.scene?.getScenes?.(true)?.[0];
    if (!scene) return { sceneKey: null };
    if (typeof scene.getGameplayStateForQA === 'function') return scene.getGameplayStateForQA();
    return { sceneKey: scene.scene?.key ?? null };
  });
}

async function sceneKey(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
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

async function runScenario(viewport) {
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
      width: viewport.width,
      height: viewport.height,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await delay(350);
    await page.touchscreen.tap(viewport.width / 2, viewport.height - 140);
    await delay(850);
    const launchPoint = cardPoint(viewport, 2);
    await page.touchscreen.tap(launchPoint.x, launchPoint.y);
    await delay(900);
    await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);
    await delay(450);

    const started = await currentState(page);

    await touchStart(client, viewport.width * 0.25, viewport.height * 0.68);
    await delay(180);
    await touchMove(client, viewport.width * 0.72, viewport.height * 0.68);
    await delay(760);
    const movedAndFired = await currentState(page);
    await touchEnd(client);
    await delay(120);

    await touchStart(client, viewport.width * 0.5, viewport.height * 0.70);
    await delay(80);
    await touchMove(client, viewport.width * 0.5, viewport.height * 0.40);
    await delay(80);
    await touchEnd(client);
    await delay(420);
    const jumped = await currentState(page);

    await page.evaluate(() => {
      const scene = window.__WGF_GAME__?.scene?.getScenes?.(true)?.[0];
      scene?.damageEnemyForQA?.();
    });
    await delay(160);
    const damaged = await currentState(page);

    await page.touchscreen.tap(82, 35);
    await delay(550);
    const returnedScene = await sceneKey(page);

    const result = {
      viewport: viewport.name,
      started,
      movedAndFired,
      jumped,
      damaged,
      returnedScene,
      checks: {
        correctScene: started.sceneKey === 'ContraScene',
        startedGameplay: started.lifecycle === 'playing',
        movedRight: typeof started.player?.x === 'number' && typeof movedAndFired.player?.x === 'number' && movedAndFired.player.x - started.player.x > 20,
        fired: (movedAndFired.shotsFired ?? 0) > (started.shotsFired ?? 0),
        jumped: (jumped.jumpsTriggered ?? 0) > (started.jumpsTriggered ?? 0),
        damagedEnemy: (damaged.enemiesDamaged ?? 0) > (jumped.enemiesDamaged ?? 0) && damaged.score > jumped.score,
        returnedToHub: returnedScene === 'HubScene',
        noPageErrors: messages.every((message) => message.type !== 'pageerror' && message.type !== 'error')
      },
      messages
    };

    return result;
  } finally {
    await browser.close();
  }
}

async function run() {
  const results = [];
  results.push(await runScenario({ name: 'phone-portrait', width: 390, height: 844 }));
  results.push(await runScenario({ name: 'phone-landscape', width: 844, height: 390 }));

  console.log(JSON.stringify(results, null, 2));

  const failed = results.some((result) => Object.values(result.checks).some((value) => !value));
  if (failed) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
