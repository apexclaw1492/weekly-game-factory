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
  results.push(await runScenario({ name: 'phone-portrait', width: 390, height: 844, cargoCardX: 195, cargoCardY: 232 }));
  results.push(await runScenario({ name: 'phone-landscape', width: 844, height: 390, cargoCardX: 612, cargoCardY: 140 }));

  console.log(JSON.stringify(results, null, 2));

  const failed = results.some((result) => Object.values(result.checks).some((value) => !value));
  if (failed) process.exit(1);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
