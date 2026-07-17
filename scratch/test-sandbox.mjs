import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

console.log('Building the project to ensure no compiler errors...');
const buildProcess = spawn('npm', ['run', 'build'], { shell: true, stdio: 'inherit' });

buildProcess.on('close', async (code) => {
  if (code !== 0) {
    console.error('Build failed with code', code);
    process.exit(1);
  }

  console.log('Starting preview server...');
  const previewProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true });

  // Give the server a moment to boot
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('Launching browser to test Voxel Sandbox...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });

  try {
    console.log('Navigating to Voxel Sandbox...');
    await page.goto('http://localhost:4173/games/voxel-sandbox/index.html', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Simulate clicking in the center of the viewport to place blocks
    console.log('Simulating block placements...');
    await page.mouse.click(400, 300);
    await new Promise(r => setTimeout(r, 200));
    await page.mouse.click(430, 320);
    await new Promise(r => setTimeout(r, 200));
    await page.mouse.click(370, 280);
    await new Promise(r => setTimeout(r, 200));

    // Read the placed blocks counter from DOM
    const blocksCount = await page.evaluate(() => {
      return document.getElementById('blocks-count').innerText;
    });

    console.log(`Blocks successfully placed: ${blocksCount}`);

    // Take screenshot of the sandbox
    const screenshotPath = '/Users/apexclaw/.gemini/antigravity/brain/2e731e9e-dc75-4791-8843-d91409e3d69f/proof-sandbox.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to ${screenshotPath}`);

    // Verify
    if (parseInt(blocksCount) > 0) {
      console.log('Test PASSED: Voxel Sandbox placements and DOM count validated!');
    } else {
      console.error('Test FAILED: Placed blocks did not increment the count.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
    previewProcess.kill();
    process.exit(0);
  }
});
