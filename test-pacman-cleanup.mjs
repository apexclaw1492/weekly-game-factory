import puppeteer from 'puppeteer';

const BASE_URL = 'http://127.0.0.1:3000/?qa=1';
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
    console.log(`[PAGE LOG] [${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', (error) => {
    messages.push({ type: 'pageerror', text: error.stack || error.message });
    console.error(`[PAGE ERROR]: ${error.stack || error.message}`);
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

    // 1. Dismiss Hub preload screen
    console.log('Tapping preload screen...');
    await page.touchscreen.tap(195, 700);
    await delay(1000);

    // 2. Query index 12 (Pacman) card coordinate and scroll Hub
    const point = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      const s = game?.scene?.getScenes?.(true)?.[0];
      if (s && s.scene?.key === 'HubScene') {
        const index = 12; // Pac-Man index
        const cardH = 75;
        const startY = 145;
        const targetY = startY + index * (cardH + 12);
        s.scrollY = Math.max(-s.maxScroll, Math.min(0, 422 - targetY));
        return { x: 195, y: targetY + s.scrollY };
      }
      return null;
    });

    if (!point) {
      throw new Error('Could not resolve Pac-Man card position on Hub');
    }

    // 3. Tap Pac-Man card
    console.log(`Tapping Pac-Man card at x:${point.x}, y:${point.y}...`);
    await page.touchscreen.tap(point.x, point.y);
    await delay(1500);

    // 4. Verify Three.js Canvas overlay is present
    const canvasExistsBeforeStart = await page.evaluate(() => {
      return !!document.getElementById('three-pacman-canvas');
    });
    console.log(`Is #three-pacman-canvas present before starting game? ${canvasExistsBeforeStart}`);

    // 5. Tap start overlay on Pacman to start gameplay
    console.log('Tapping start overlay...');
    await page.touchscreen.tap(195, 422);
    await delay(1000);

    // Verify canvas display style
    const canvasDisplayPlaying = await page.evaluate(() => {
      const canvas = document.getElementById('three-pacman-canvas');
      return canvas ? window.getComputedStyle(canvas).display : null;
    });
    console.log(`Canvas style.display during gameplay: ${canvasDisplayPlaying}`);

    // 6. Click Back to Hub
    console.log('Tapping back button...');
    await page.touchscreen.tap(20, 16);
    await delay(1000);

    // 7. Verify canvas has been completely removed from DOM
    const canvasExistsAfterHub = await page.evaluate(() => {
      return !!document.getElementById('three-pacman-canvas');
    });
    console.log(`Is #three-pacman-canvas present after returning to Hub? ${canvasExistsAfterHub}`);

    // Check if we successfully returned to HubScene
    const activeScene = await page.evaluate(() => {
      const game = window.__WGF_GAME__;
      return game?.scene?.getScenes?.(true)?.[0]?.scene?.key ?? null;
    });
    console.log(`Active scene: ${activeScene}`);

    const hasErrors = messages.some(
      (m) => m.type === 'pageerror' || (m.type === 'error' && !m.text.includes('favicon'))
    );

    const success = canvasExistsBeforeStart && 
                    canvasDisplayPlaying === 'block' && 
                    !canvasExistsAfterHub && 
                    activeScene === 'HubScene' && 
                    !hasErrors;

    console.log('\n--- VERIFICATION RESULTS ---');
    console.log(`- Canvas created successfully: ${canvasExistsBeforeStart ? 'PASS' : 'FAIL'}`);
    console.log(`- Canvas display is block: ${canvasDisplayPlaying === 'block' ? 'PASS' : 'FAIL'}`);
    console.log(`- Canvas removed on hub exit: ${!canvasExistsAfterHub ? 'PASS' : 'FAIL'}`);
    console.log(`- Back to HubScene success: ${activeScene === 'HubScene' ? 'PASS' : 'FAIL'}`);
    console.log(`- No page or console errors: ${!hasErrors ? 'PASS' : 'FAIL'}`);
    console.log(`- Overall Result: ${success ? 'PASS' : 'FAIL'}\n`);

    if (!success) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
