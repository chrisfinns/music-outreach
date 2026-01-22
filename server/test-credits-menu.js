const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsMenu() {
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
    const menuSelectors = [
      'button[aria-label*="more options" i]',
      'button[aria-label*="More options for" i]',
      '[data-testid="more-button"]',
      'button[aria-haspopup="menu"]'
    ];

    let menuButton = null;
    for (const selector of menuSelectors) {
      try {
        menuButton = await page.waitForSelector(selector, { timeout: 2000 });
        if (menuButton) {
          const ariaLabel = await menuButton.getAttribute('aria-label');
          console.log(`✓ Found menu button: "${ariaLabel}" with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`  ✗ Selector failed: ${selector}`);
      }
    }

    if (!menuButton) {
      console.log('❌ No menu button found');
      await browser.close();
      return;
    }

    // Click menu button
    console.log('\n=== Clicking menu button ===');
    await menuButton.click({ force: true });
    await page.waitForTimeout(1000);

    // Look for "View credits" menu item
    console.log('\n=== Looking for "View credits" menu item ===');
    const creditsMenuSelectors = [
      'button:has-text("View credits")',
      '[role="menuitem"]:has-text("View credits")',
      'li:has-text("View credits")',
      'a:has-text("View credits")'
    ];

    let creditsMenuItem = null;
    for (const selector of creditsMenuSelectors) {
      try {
        creditsMenuItem = await page.waitForSelector(selector, { timeout: 2000 });
        if (creditsMenuItem) {
          const text = await creditsMenuItem.textContent();
          console.log(`✓ Found "View credits": "${text}" with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`  ✗ Selector failed: ${selector}`);
      }
    }

    if (!creditsMenuItem) {
      console.log('❌ No "View credits" menu item found');
      await page.screenshot({ path: 'menu-open.png' });
      console.log('Screenshot saved to menu-open.png');
      await page.waitForTimeout(10000);
      await browser.close();
      return;
    }

    // Click "View credits"
    console.log('\n=== Clicking "View credits" ===');
    await creditsMenuItem.click({ force: true });
    await page.waitForTimeout(2000);

    // Look for credits modal
    console.log('\n=== Looking for credits modal ===');
    try {
      const modal = await page.waitForSelector('[role="dialog"]', { timeout: 3000 });
      if (modal) {
        console.log('✓ Credits modal opened');

        const modalContent = await page.textContent('[role="dialog"]');
        console.log('\n=== Modal Content ===');
        console.log(modalContent);

        const lines = modalContent.split('\n').map(line => line.trim()).filter(Boolean);
        console.log('\n=== Parsed Lines ===');
        lines.forEach((line, i) => {
          console.log(`${i + 1}: ${line}`);
        });
      }
    } catch (e) {
      console.log('❌ No modal found');
    }

    console.log('\nBrowser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    await browser.close();

  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
  }
}

testCreditsMenu();
