import puppeteer from 'puppeteer';

const BASE_URL = withQaMode(process.env.BASE_URL || 'http://127.0.0.1:3000/');

const VIEWPORTS = [
  { name: 'desktop', width: 800, height: 600 },
  { name: 'phone-portrait', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 }
];

function withQaMode(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set('qa', '1');
  return url.toString();
}

const GAMES = [
  { id: 'f1', name: 'F1 Space Invaders', index: 0, sceneKey: 'SpaceInvadersScene', certified: true, keys: ['Space', 'ArrowLeft', 'ArrowRight', 'Space'] },
  { id: 'cargo', name: 'Cosmic Cargo', index: 1, sceneKey: 'CosmicCargoScene', certified: true, keys: ['ArrowUp', 'ArrowLeft', 'Space'] },
  { id: 'contra', name: 'Contra Bonus', index: 2, sceneKey: 'ContraScene', certified: true, keys: ['ArrowRight', 'Space', 'KeyX'] },
  { id: 'asteroids', name: 'Asteroid Belt', index: 3, sceneKey: 'AsteroidsScene', certified: true, keys: ['ArrowUp', 'ArrowLeft', 'Space'] },
  { id: 'pong', name: 'Red Bull Pong', index: 4, sceneKey: 'PongScene', certified: true, keys: ['ArrowLeft', 'ArrowRight'] }
];
const CATALOG_GAME_COUNT = 9;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function fingerprint(buffer) {
  let hash = 2166136261;
  const step = Math.max(1, Math.floor(buffer.length / 4096));
  for (let i = 0; i < buffer.length; i += step) {
    hash ^= buffer[i];
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return `${buffer.length}:${hash}`;
}

function cardPoint(viewport, index) {
  const { width, height } = viewport;
  const isPortrait = height > width;

  if (isPortrait) {
    return {
      x: width / 2,
      y: 145 + index * (75 + 12)
    };
  }

  const gameCount = CATALOG_GAME_COUNT;
  const columns = gameCount > 4 && width >= 760 ? 3 : 2;
  const rows = Math.ceil(gameCount / columns);
  const cardW = Math.min((width - 30 - (columns - 1) * 20) / columns, 340);
  const cardH = rows > 2 ? 95 : 120;
  const gridW = columns * cardW + (columns - 1) * 20;
  const gridH = rows * cardH + (rows - 1) * 20;
  const startX = width / 2 - gridW / 2 + cardW / 2;
  const startY = height / 2 - gridH / 2 + cardH / 2 + 15;
  const col = index % columns;
  const row = Math.floor(index / columns);

  return {
    x: startX + col * (cardW + 20),
    y: startY + row * (cardH + 20)
  };
}

async function canvasInfo(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    return canvas
      ? {
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight
        }
      : null;
  });
}

async function activeSceneKey(page) {
  return page.evaluate(() => {
    const game = window.__WGF_GAME__;
    return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
  });
}

async function waitForScene(page, sceneKey) {
  await page.waitForFunction((expectedSceneKey) => {
    const game = window.__WGF_GAME__;
    return game?.scene?.getScenes?.(true)?.[0]?.scene?.key === expectedSceneKey;
  }, { timeout: 6000 }, sceneKey);
}

async function runSmoke() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  try {
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

    for (const viewport of VIEWPORTS) {
      await page.setViewport({ width: viewport.width, height: viewport.height });

      for (const game of GAMES) {
        messages.length = 0;

        console.error(`smoke ${viewport.name}: ${game.name}`);

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await waitForScene(page, 'HubScene');
        await delay(650);
        const hubFingerprint = fingerprint(await page.screenshot());

        const point = cardPoint(viewport, game.index);
        await page.mouse.click(point.x, point.y);
        await delay(game.certified ? 1200 : 450);
        const sceneAfterLaunch = await activeSceneKey(page);
        const launchFingerprint = fingerprint(await page.screenshot({
          path: `scratch/live-smoke-${viewport.name}-${game.id}-launch.png`
        }));

        let playFingerprint = launchFingerprint;
        let sceneAfterPlay = sceneAfterLaunch;

        if (game.certified) {
          await page.mouse.click(viewport.width / 2, viewport.height / 2);
          for (const key of game.keys) {
            await page.keyboard.press(key);
            await delay(120);
          }
          await delay(1800);
          sceneAfterPlay = await activeSceneKey(page);
          playFingerprint = fingerprint(await page.screenshot({
            path: `scratch/live-smoke-${viewport.name}-${game.id}-play.png`
          }));
        }

        results.push({
          viewport: viewport.name,
          game: game.name,
          certified: game.certified,
          sceneAfterLaunch,
          sceneAfterPlay,
          launched: game.certified ? sceneAfterLaunch === game.sceneKey : sceneAfterLaunch === 'HubScene',
          respondedAfterStart: game.certified ? playFingerprint !== launchFingerprint : true,
          canvas: await canvasInfo(page),
          messages: [...messages]
        });
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}

runSmoke()
  .then((results) => {
    console.log(JSON.stringify(results, null, 2));

    const failures = results.filter((result) => (
      !result.launched ||
      !result.respondedAfterStart ||
      !result.canvas ||
      result.messages.length > 0
    ));

    if (failures.length > 0) {
      console.error(`Smoke test failed: ${failures.length} failing checks.`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
