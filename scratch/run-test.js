import puppeteer from 'puppeteer';
import path from 'path';

(async () => {
  console.log('Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  
  // Track console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER CONSOLE ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('BROWSER CRASH/EXCEPTION:', error.stack || error.message);
  });

  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0' });
  
  console.log('Waiting for HubScene...');
  await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 seconds to ensure PreloadScene finishes

  console.log('Taking screenshot of Hub...');
  await page.screenshot({ path: 'scratch/hub.png' });
  console.log('Saved scratch/hub.png');

  // Click on Cosmic Cargo card coordinates (x: 590, y: 245)
  console.log('Clicking on Cosmic Cargo card coordinates (x: 590, y: 245)...');
  await page.mouse.click(590, 245);
  
  console.log('Waiting to see if scene launches...');
  await new Promise(resolve => setTimeout(resolve, 4000));

  console.log('Taking screenshot after click...');
  await page.screenshot({ path: 'scratch/after_click.png' });
  console.log('Saved scratch/after_click.png');

  console.log('Done.');
  await browser.close();
  process.exit(0);
})().catch(err => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});

