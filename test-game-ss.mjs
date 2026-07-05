import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto('http://localhost:3000/games/rise-of-the-elf-ruler/index.html', { waitUntil: 'networkidle0' });
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved.');
  } catch (e) {
    console.log('Navigation failed:', e);
  }
  await browser.close();
})();
