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

  const gameCount = 13;
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

    await page.touchscreen.tap(viewport.cargoCardX, viewport.cargoCardY);
    await delay(900);
    await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);
    await delay(500);
    let started = await currentState(page);
    if (started.lifecycle === 'start') {
      await page.touchscreen.tap(viewport.width / 2, viewport.height / 2);
      await delay(500);
      started = await currentState(page);
    }

    await touchStart(client, viewport.width / 2, viewport.height * 0.72);
    await delay(620);
    await touchEnd(client);
    await delay(120);
    const boosted = await currentState(page);

    await touchStart(client, viewport.width * 0.34, viewport.height * 0.48);
    await delay(80);
    await touchMove(client, viewport.width * 0.66, viewport.height * 0.48);
    await delay(80);
    await touchEnd(client);
    await delay(350);
    const swiped = await currentState(page);

    await page.evaluate(() => {
      const scene = window.__WGF_GAME__?.scene?.getScenes?.(true)?.[0];
      scene?.collectNextCargoForQA?.();
    });
    await delay(120);
    const afterCargo = await currentState(page);

    await page.evaluate(() => {
      const scene = window.__WGF_GAME__?.scene?.getScenes?.(true)?.[0];
      scene?.completeCargoForQA?.();
      scene?.enterPortalForQA?.();
    });
    await delay(240);
    const afterPortal = await currentState(page);

    await page.touchscreen.tap(82, 20);
    await delay(550);
    const returnedScene = await sceneKey(page);

    const result = {
      viewport: viewport.name,
      started,
      boosted,
      swiped,
      afterCargo,
      afterPortal,
      returnedScene,
      checks: {
        correctScene: started.sceneKey === 'CosmicCargoScene',
        startedGameplay: started.lifecycle === 'playing',
        boostChangedFuel: typeof boosted.fuel === 'number' && typeof started.fuel === 'number' && boosted.fuel < started.fuel,
        boostCounted: (boosted.boostCount ?? 0) > (started.boostCount ?? 0),
        gravityChanged: swiped.gravity === 'RIGHT',
        cargoProgressed: (afterCargo.cargoCollected ?? 0) > (started.cargoCollected ?? 0),
        portalCompleted: afterPortal.lifecycle === 'levelComplete' && afterPortal.portalOpen === true,
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
  const portraitVp = { name: 'phone-portrait', width: 390, height: 844 };
  const portraitPt = cardPoint(portraitVp, 4);
  results.push(await runScenario({ ...portraitVp, cargoCardX: portraitPt.x, cargoCardY: portraitPt.y }));

  const landscapeVp = { name: 'phone-landscape', width: 844, height: 390 };
  const landscapePt = cardPoint(landscapeVp, 4);
  results.push(await runScenario({ ...landscapeVp, cargoCardX: landscapePt.x, cargoCardY: landscapePt.y }));

  console.log(JSON.stringify(results, null, 2));

  const failed = results.some((result) => Object.values(result.checks).some((value) => !value));
  if (failed) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
