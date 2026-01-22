const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function findTrackButtons() {
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
      await page.waitForTimeout(500);
    } catch (e) {}

    // Look for main content area
    console.log('\n=== Looking for track header/main area ===');

    // Try to find the main play button for the track
    const mainPlayButton = await page.$('button[data-testid="play-button"][aria-label*="Mr. Brightside"]');
    if (mainPlayButton) {
      console.log('✓ Found main play button for track');

      // Get parent container
      const parent = await mainPlayButton.evaluateHandle(el => el.closest('[class*="entity"]') || el.parentElement.parentElement);

      // Find all buttons in that parent
      const buttons = await parent.$$('button');
      console.log(`\nFound ${buttons.length} buttons in track header area:\n`);

      for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const text = await btn.textContent();
        const ariaLabel = await btn.getAttribute('aria-label');
        const dataTestId = await btn.getAttribute('data-testid');

        console.log(`Button ${i + 1}:`);
        if (text && text.trim()) console.log(`  Text: "${text.trim()}"`);
        if (ariaLabel) console.log(`  aria-label: "${ariaLabel}"`);
        if (dataTestId) console.log(`  data-testid: "${dataTestId}"`);
        console.log('');
      }
    }

    // Also try looking for buttons with 3 dots
    console.log('\n=== Looking for buttons with 3 dots or ellipsis ===');
    const allButtons = await page.$$('button');
    for (const btn of allButtons) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');

      if ((text && (text.includes('...') || text.includes('•••') || text.includes('⋯'))) ||
          (ariaLabel && ariaLabel.toLowerCase().includes('more'))) {
        console.log('Found potential menu button:');
        if (text) console.log(`  Text: "${text}"`);
        if (ariaLabel) console.log(`  aria-label: "${ariaLabel}"`);
        console.log('');
      }
    }

    console.log('\n\nBrowser will stay open for 60 seconds...');
    console.log('Manually locate the 3-dot button and try clicking it!');
    await page.waitForTimeout(60000);
    await browser.close();

  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
  }
}

findTrackButtons();
