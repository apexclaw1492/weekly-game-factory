import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sceneKey(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
  });
}

async function tapPreloadAndRead(page, x, y) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await delay(250);
  await page.touchscreen.tap(x, y);
  await delay(650);
  return sceneKey(page);
}

async function run() {
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

    const preloadTapRows = [145, 232, 319, 406, 700];
    const preloadResults = [];
    for (const y of preloadTapRows) {
      preloadResults.push({ y, sceneKey: await tapPreloadAndRead(page, 195, y) });
    }

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await delay(250);
    await page.touchscreen.tap(195, 700);
    await delay(800);

    const hubAfterPreload = await sceneKey(page);

    await page.touchscreen.tap(195, 232);
    await delay(500);
    const afterRebuildCard = await sceneKey(page);

    await page.touchscreen.tap(195, 145);
    await delay(800);
    const afterCertifiedCard = await sceneKey(page);

    const result = {
      preloadResults,
      hubAfterPreload,
      afterRebuildCard,
      afterCertifiedCard,
      checks: {
        preloadOnlyEntersHub: preloadResults.every((item) => item.sceneKey === 'HubScene'),
        hubReached: hubAfterPreload === 'HubScene',
        rebuildCardDoesNotLaunch: afterRebuildCard === 'HubScene',
        certifiedCardLaunches: afterCertifiedCard === 'SpaceInvadersScene',
        noPageErrors: messages.every((message) => message.type !== 'pageerror' && message.type !== 'error')
      },
      messages
    };

    console.log(JSON.stringify(result, null, 2));

    if (Object.values(result.checks).some((value) => !value)) {
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
