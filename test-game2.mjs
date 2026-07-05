import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => { console.log('PAGE ERROR:', error.message); console.log(error.stack); });
  try {
    await page.goto('http://localhost:3000/games/rise-of-the-elf-ruler/index.html', { waitUntil: 'networkidle0' });
    console.log('Page loaded');
  } catch (e) {
    console.log('Navigation failed:', e);
  }
  await browser.close();
})();
