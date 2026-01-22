const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsNavigation() {
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

    // Try cookie banner
    try {
      const btn = await page.waitForSelector('button:has-text("Accept")', { timeout: 2000 });
      if (btn) await btn.click();
    } catch (e) {}

    // Look for 3-dot menu button
    console.log('\n=== Looking for 3-dot menu button ===');
    const menuButton = await page.waitForSelector('button[aria-label*="more options" i]', { timeout: 5000 });
    console.log('✓ Found menu button');

    // Click menu button
    console.log('\n=== Clicking menu button ===');
    await menuButton.click({ force: true });
    await page.waitForTimeout(1000);

    // Look for "View credits" menu item
    console.log('\n=== Looking for "View credits" menu item ===');
    const creditsMenuItem = await page.waitForSelector('button:has-text("View credits")', { timeout: 3000 });
    console.log('✓ Found "View credits" menu item');

    // Get current URL before clicking
    const urlBefore = page.url();
    console.log(`URL before click: ${urlBefore}`);

    // Click "View credits"
    console.log('\n=== Clicking "View credits" ===');
    await creditsMenuItem.click({ force: true });

    // Wait a bit to see what happens
    await page.waitForTimeout(3000);

    // Check URL after clicking
    const urlAfter = page.url();
    console.log(`URL after click: ${urlAfter}`);

    // Check if URL changed (navigation)
    if (urlBefore !== urlAfter) {
      console.log('\n✓ Navigation occurred - credits may be on new page');

      // Extract credits from new page
      const pageContent = await page.textContent('body');
      console.log('\n=== Page content preview ===');
      console.log(pageContent.substring(0, 1000));
    } else {
      console.log('\n✓ No navigation - checking for modal or panel');

      // Check for various container types
      const containerSelectors = [
        '[role="dialog"]',
        '[role="region"]',
        '[aria-modal="true"]',
        '.credits-panel',
        '[class*="credits"]'
      ];

      for (const selector of containerSelectors) {
        try {
          const container = await page.$(selector);
          if (container) {
            console.log(`Found container: ${selector}`);
            const content = await container.textContent();
            console.log('Content preview:', content.substring(0, 500));
          }
        } catch (e) {}
      }
    }

    // Take screenshot
    await page.screenshot({ path: 'credits-after-click.png', fullPage: true });
    console.log('\nScreenshot saved to credits-after-click.png');

    console.log('\nBrowser will stay open for 60 seconds for inspection...');
    await page.waitForTimeout(60000);
    await browser.close();

  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
  }
}

testCreditsNavigation();
