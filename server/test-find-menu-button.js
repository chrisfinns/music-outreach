const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function findMenuButton() {
  let browser = null;

  try {
    const sessionCookie = settingsService.getSpotifySessionCookie();

    if (!sessionCookie) {
      console.log('❌ No session cookie configured');
      process.exit(1);
    }

    console.log('✓ Launching visible browser...\n');

    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();

    await context.addCookies([{
      name: 'sp_dc',
      value: sessionCookie,
      domain: '.spotify.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    }]);

    const page = await context.newPage();
    const trackUrl = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp';

    console.log(`Navigating to: ${trackUrl}`);
    await page.goto(trackUrl, { waitUntil: 'networkidle', timeout: 15000 });

    console.log('✓ Page loaded, waiting...');
    await page.waitForTimeout(3000);

    // Scroll
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(500);

    // Try cookie banner
    try {
      const btn = await page.waitForSelector('button:has-text("Accept")', { timeout: 2000 });
      if (btn) await btn.click();
    } catch (e) {}

    // Get ALL buttons on the page
    console.log('\n=== All buttons near the top ===');
    const buttons = await page.$$('button');

    for (let i = 0; i < Math.min(buttons.length, 30); i++) {
      const btn = buttons[i];
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      const dataTestId = await btn.getAttribute('data-testid');
      const className = await btn.getAttribute('class');

      if (ariaLabel || text || dataTestId) {
        console.log(`\nButton ${i + 1}:`);
        if (text && text.trim()) console.log(`  Text: "${text.trim().substring(0, 50)}"`);
        if (ariaLabel) console.log(`  aria-label: "${ariaLabel}"`);
        if (dataTestId) console.log(`  data-testid: "${dataTestId}"`);
      }
    }

    console.log('\n\nBrowser will stay open for 60 seconds...');
    console.log('Look for the 3-dot menu button and note its properties!');
    await page.waitForTimeout(60000);
    await browser.close();

  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
  }
}

findMenuButton();
