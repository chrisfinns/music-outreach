const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsVisual() {
  let browser = null;

  try {
    const sessionCookie = settingsService.getSpotifySessionCookie();

    if (!sessionCookie) {
      console.log('❌ No session cookie configured');
      process.exit(1);
    }

    console.log('✓ Session cookie found');
    console.log('Launching browser in non-headless mode so you can see what happens...\n');

    browser = await chromium.launch({
      headless: false, // Show browser so you can see
      slowMo: 1000 // Slow down by 1 second per action
    });

    const context = await browser.newContext();

    // Set the session cookie
    await context.addCookies([{
      name: 'sp_dc',
      value: sessionCookie,
      domain: '.spotify.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    }]);

    console.log('✓ Session cookie set');

    const page = await context.newPage();
    const trackId = '3n3Ppam7vgaVa1iaRUc9Lp';
    const trackUrl = `https://open.spotify.com/track/${trackId}`;

    console.log(`\nNavigating to: ${trackUrl}`);
    await page.goto(trackUrl, {
      waitUntil: 'networkidle',
      timeout: 15000,
    });

    console.log('✓ Page loaded, waiting 5 seconds for full render...');
    await page.waitForTimeout(5000);

    // Try to dismiss cookie banner
    try {
      const cookieBtn = await page.waitForSelector('button:has-text("Accept")', { timeout: 2000 });
      if (cookieBtn) {
        await cookieBtn.click();
        console.log('✓ Dismissed cookie banner');
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      console.log('ℹ No cookie banner found');
    }

    // Look for all buttons
    console.log('\n=== Looking for all buttons on the page ===');
    const allButtons = await page.$$('button');
    console.log(`Found ${allButtons.length} buttons total`);

    for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      console.log(`${i + 1}. Text: "${text}" | Aria-label: "${ariaLabel}"`);
    }

    // Search page for "credit" keyword
    console.log('\n=== Searching page content for "credit" ===');
    const pageText = await page.textContent('body');
    const hasCredit = pageText.toLowerCase().includes('credit');
    console.log(`Page contains "credit": ${hasCredit}`);

    if (hasCredit) {
      // Find elements containing "credit"
      const creditElements = await page.$$('*');
      for (const el of creditElements) {
        const text = await el.textContent().catch(() => '');
        if (text && text.toLowerCase().includes('credit') && text.length < 100) {
          console.log(`  Found: "${text}"`);
        }
      }
    }

    console.log('\n✓ Browser will stay open for 30 seconds so you can inspect manually...');
    console.log('Look for the Credits button/section yourself!');
    await page.waitForTimeout(30000);

    await browser.close();

  } catch (error) {
    console.error('Error:', error);
    if (browser) {
      await browser.close();
    }
  }
}

testCreditsVisual();
