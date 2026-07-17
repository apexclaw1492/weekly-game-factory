import puppeteer from 'puppeteer';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/?qa=1';
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  const messages = [];

  page.on('console', (msg) => {
    messages.push({ type: msg.type(), text: msg.text() });
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

    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await delay(1000);

    // 1. Clear preload screen
    console.log('Tapping preload screen...');
    await page.touchscreen.tap(195, 700);
    await delay(1500);

    // 2. Launch Hextris Scene
    console.log('Scrolling and launching Hextris...');
    await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 11; // Hextris index
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
      }
    });
    await delay(500);

    // Tap Hextris card (approx 195, scroll adjusted y)
    const cardPoint = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 11;
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!cardPoint) throw new Error('Could not find Hextris card position');
    await page.touchscreen.tap(cardPoint.x, cardPoint.y);
    await delay(1500);

    // 3. Start Gameplay
    console.log('Tapping start overlay...');
    await page.touchscreen.tap(195, 422);
    await delay(1000);

    // Check that we are indeed in HextrisScene
    const initialSceneKey = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
    });
    console.log(`Current Scene: ${initialSceneKey}`);
    if (initialSceneKey !== 'HextrisScene') {
      throw new Error('Not in HextrisScene');
    }

    // 4. Verify falling and stacking mechanics
    console.log('Verifying stacking...');
    const stackResult = await page.evaluate(async () => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene) return { success: false, reason: 'Scene not found' };

      // Clear any falling blocks that spawned naturally
      scene.fallingBlocks.forEach(b => {
        if (b.mesh) scene.threeScene.remove(b.mesh);
      });
      scene.fallingBlocks = [];

      // Add a block to lane 0 (Red '#e74c3c') and make it settle immediately
      scene.addNewBlock(0, '#e74c3c', 1.0);
      const b1 = scene.fallingBlocks[0];
      const inradius = scene.settings.hexWidth * Math.sqrt(3) / 2;
      b1.distFromHex = inradius; // Force collision

      // Wait a frame for collision to process in next update
      await new Promise(r => setTimeout(r, 50));

      const settledCountL0_step1 = scene.mainHex.blocks[0].length;

      // Add a second block of a different color (Yellow '#f1c40f') to lane 0, force it to settle
      scene.addNewBlock(0, '#f1c40f', 1.0);
      const b2 = scene.fallingBlocks[0];
      b2.distFromHex = inradius + scene.settings.blockHeight; // Stack on top

      await new Promise(r => setTimeout(r, 50));

      const settledCountL0_step2 = scene.mainHex.blocks[0].length;

      return {
        success: settledCountL0_step1 === 1 && settledCountL0_step2 === 2,
        settledCountL0_step1,
        settledCountL0_step2,
        b1_settled: b1.settled,
        b2_settled: b2.settled
      };
    });

    console.log('Stacking Result:', stackResult);
    if (!stackResult.success) {
      throw new Error('Stacking verification failed');
    }

    // 5. Verify matching, clearing and scoring
    console.log('Verifying matching, clearing, and scoring...');
    const matchResult = await page.evaluate(async () => {
      const game = window.__WGF_GAME__;
      const scene = game?.scene?.getScenes?.(true)?.[0];
      if (!scene) return { success: false, reason: 'Scene not found' };

      // Clear existing blocks for clean test
      for (let side = 0; side < 6; side++) {
        scene.mainHex.blocks[side] = [];
      }
      scene.fallingBlocks = [];
      scene.score = 0;

      // Add 3 Red blocks stacked in lane 0
      const inradius = scene.settings.hexWidth * Math.sqrt(3) / 2;
      const h = scene.settings.blockHeight;

      // We add them one by one to let the update logic process settlement
      scene.addNewBlock(0, '#e74c3c', 1.0);
      scene.fallingBlocks[0].distFromHex = inradius;
      await new Promise(r => setTimeout(r, 50));

      scene.addNewBlock(0, '#e74c3c', 1.0);
      scene.fallingBlocks[0].distFromHex = inradius + h;
      await new Promise(r => setTimeout(r, 50));

      scene.addNewBlock(0, '#e74c3c', 1.0);
      scene.fallingBlocks[0].distFromHex = inradius + h * 2;
      await new Promise(r => setTimeout(r, 50));

      const scoreBeforeMatch = scene.score;
      const blocksCountBeforeMatch = scene.mainHex.blocks[0].length;

      // Wait for matching logic to complete (it runs floodfill, sets deleted = 1, then deletes)
      await new Promise(r => setTimeout(r, 100));

      const scoreAfterMatch = scene.score;
      const blocksCountAfterMatch = scene.mainHex.blocks[0].length;

      // Wait a bit more for fade out animation (deleted = 2) to completely remove them from array
      await new Promise(r => setTimeout(r, 500));

      const finalBlocksCount = scene.mainHex.blocks[0].length;

      return {
        blocksCountBeforeMatch,
        scoreBeforeMatch,
        scoreAfterMatch,
        blocksCountAfterMatch,
        finalBlocksCount,
        success: scoreAfterMatch > 0 && finalBlocksCount === 0
      };
    });

    console.log('Match and Clear Result:', matchResult);
    if (!matchResult.success) {
      throw new Error('Matching & clearing verification failed');
    }

    // 6. Check for page/console errors
    const errors = messages.filter(m => m.type === 'pageerror' || m.type === 'error');
    console.log(`Console Errors/Warnings list:`, messages);
    console.log(`Number of critical errors: ${errors.length}`);

    if (errors.length > 0) {
      throw new Error('Console errors detected during gameplay test');
    }

    console.log('ALL EMPIRICAL MECHANICS CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test run failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
