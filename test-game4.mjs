import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => { console.log('PAGE ERROR:', error.message); console.log(error.stack); });
  try {
    await page.goto('http://localhost:3000/games/rise-of-the-elf-ruler/index.html', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
    // Hide UI modal so we can click
    await page.evaluate(() => {
      document.getElementById('modal').classList.remove('active');
    });
    
    // Click a build button
    await page.evaluate(() => {
        const btn = document.querySelector('[data-t="townhouse"]');
        if (btn) btn.click();
    });
    // Click on canvas
    const canvasContainer = await page.$('canvas');
    const box = await canvasContainer.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    // wait a bit
    await new Promise(r => setTimeout(r, 1000));
    
    const count = await page.evaluate(() => window.blueprints ? window.blueprints.length : 'not exposed');
    console.log('Blueprints length:', count);
  } catch (e) {
    console.log('Navigation failed:', e);
  }
  await browser.close();
})();
