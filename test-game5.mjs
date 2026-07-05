import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto('http://localhost:3000/games/rise-of-the-elf-ruler/index.html', { waitUntil: 'networkidle0' });
    
    const aubreyPos = await page.evaluate(() => {
      // We need to find aubrey. We didn't expose it, but we can search the scene.
      // Scene is not exposed either!
      return "not exposed";
    });
    console.log(aubreyPos);
  } catch (e) {
    console.log('Navigation failed:', e);
  }
  await browser.close();
})();
