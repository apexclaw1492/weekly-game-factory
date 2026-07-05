import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => { console.log('PAGE ERROR:', error.message); console.log(error.stack); });
  try {
    await page.goto('http://localhost:3000/games/rise-of-the-elf-ruler/index.html', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
    
    await page.evaluate(() => {
      document.getElementById('modal').classList.remove('active');
    });
    
    // Click on canvas
    const canvasContainer = await page.$('canvas');
    const box = await canvasContainer.boundingBox();
    console.log(`Clicking at ${box.x + box.width / 2}, ${box.y + box.height / 2}`);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await new Promise(r => setTimeout(r, 1000));
    
    const status = await page.evaluate(() => {
      return {
        blueprints: window.DEBUG_BLUEPRINTS.length,
        buildings: window.DEBUG_BUILDINGS.length,
        navWalking: window.DEBUG_NAV.walking,
        aubreyPos: window.DEBUG_AUBREY.position,
        aubreyScale: window.DEBUG_AUBREY.scale
      };
    });
    console.log('Status:', JSON.stringify(status, null, 2));
    
  } catch (e) {
    console.log('Test failed:', e);
  }
  await browser.close();
})();
