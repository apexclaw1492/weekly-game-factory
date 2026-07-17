import puppeteer from 'puppeteer';

const BASE_URL = withQaMode(process.env.BASE_URL || 'http://127.0.0.1:3000/');
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withQaMode(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set('qa', '1');
  return url.toString();
}

const CERTIFIED_CARDS = [
  { name: 'F1 Space Invaders', sceneKey: 'SpaceInvadersScene', index: 3 },
  { name: 'Cosmic Cargo', sceneKey: 'CosmicCargoScene', index: 4 },
  { name: 'Contra Bonus', sceneKey: 'ContraScene', index: 5 },
  { name: 'Asteroid Belt', sceneKey: 'AsteroidsScene', index: 6 },
  { name: 'Red Bull Pong', sceneKey: 'PongScene', index: 7 }
];
const CATALOG_GAME_COUNT = 13;

function cardPoint(viewport, index) {
  if (viewport.height > viewport.width) {
    return {
      x: viewport.width / 2,
      y: 145 + index * 87
    };
  }

  const gameCount = CATALOG_GAME_COUNT;
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

async function sceneKey(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
  });
}

async function enterHub(page, viewport) {
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await delay(250);
  await page.touchscreen.tap(viewport.width / 2, viewport.height - 140);
  await delay(800);
  return sceneKey(page);
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

  const messages = [];

  try {
    const page = await browser.newPage();
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) {
        messages.push({ type: msg.type(), text: msg.text() });
      }
    });
    page.on('pageerror', (error) => {
      messages.push({ type: 'pageerror', text: error.stack || error.message });
    });

    const portrait = { width: 390, height: 844 };
    await page.setViewport({ ...portrait, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

    const preloadTapRows = [145, 232, 319, 406, 700];
    const preloadResults = [];
    for (const y of preloadTapRows) {
      preloadResults.push({ y, sceneKey: await tapPreloadAndRead(page, 195, y) });
    }

    const launchResults = [];
    for (const card of CERTIFIED_CARDS) {
      await enterHub(page, portrait);
      const point = cardPoint(portrait, card.index);
      await page.touchscreen.tap(point.x, point.y);
      await delay(800);
      launchResults.push({ viewport: 'phone-portrait', game: card.name, sceneKey: await sceneKey(page), expected: card.sceneKey });
    }

    const landscape = { width: 844, height: 390 };
    await page.setViewport({ ...landscape, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    for (const card of CERTIFIED_CARDS) {
      await enterHub(page, landscape);
      const point = cardPoint(landscape, card.index);
      await page.touchscreen.tap(point.x, point.y);
      await delay(800);
      launchResults.push({ viewport: 'phone-landscape', game: card.name, sceneKey: await sceneKey(page), expected: card.sceneKey });
    }

    const result = {
      preloadResults,
      launchResults,
      checks: {
        preloadOnlyEntersHub: preloadResults.every((item) => item.sceneKey === 'HubScene'),
        allCertifiedCardsLaunch: launchResults.every((item) => item.sceneKey === item.expected),
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
