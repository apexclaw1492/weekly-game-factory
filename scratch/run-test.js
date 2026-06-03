import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/';

const VIEWPORTS = [
  { name: 'desktop', width: 800, height: 600 },
  { name: 'phone-portrait', width: 390, height: 844 },
  { name: 'phone-landscape', width: 844, height: 390 }
];

const GAMES = [
  { id: 'f1', name: 'F1 Space Invaders', index: 0, sceneKey: 'SpaceInvadersScene', certified: true, keys: ['Space', 'ArrowLeft', 'ArrowRight', 'Space'] },
  { id: 'cargo', name: 'Cosmic Cargo', index: 1, sceneKey: 'CosmicCargoScene', certified: true, keys: ['ArrowUp', 'ArrowLeft', 'Space'] },
  { id: 'contra', name: 'Contra Bonus', index: 2, sceneKey: 'ContraScene', certified: true, keys: ['ArrowRight', 'Space', 'KeyX'] },
  { id: 'asteroids', name: 'Asteroid Belt', index: 3, sceneKey: 'AsteroidsScene', certified: true, keys: ['ArrowUp', 'ArrowLeft', 'Space'] }
];

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

  const cardW = Math.min((width - 60) / 2, 360);
  const cardH = 120;
  const xOffsets = [-cardW / 2 - 10, cardW / 2 + 10, -cardW / 2 - 10, cardW / 2 + 10];
  const yOffsets = [-cardH / 2 - 10, -cardH / 2 - 10, cardH / 2 + 25, cardH / 2 + 25];

  return {
    x: width / 2 + xOffsets[index],
    y: height / 2 + yOffsets[index] + 15
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
        await delay(250);
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
