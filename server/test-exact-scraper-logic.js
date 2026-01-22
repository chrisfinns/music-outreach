const { chromium } = require('playwright');
const settingsService = require('./settings-service');
const { TIMEOUTS } = require('./scrapers/spotify-selectors');

async function testExactScraperLogic() {
  const trackId = '3n3Ppam7vgaVa1iaRUc9Lp';
  const sessionCookie = settingsService.getSpotifySessionCookie();

  if (!sessionCookie) {
    console.log('❌ No session cookie');
    return;
  }

  let localBrowser = null;
  let localContext = null;
  let page = null;

  try {
    // EXACT same browser launch as scraper
    localBrowser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
      ]
    });

    // EXACT same context creation as scraper
    localContext = await localBrowser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    // EXACT same cookie setting as scraper
    await localContext.addCookies([{
      name: 'sp_dc',
      value: sessionCookie,
      domain: '.spotify.com',
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'Lax'
    }]);

    page = await localContext.newPage();
    console.log('✓ Using session cookie');

    const trackPageUrl = `https://open.spotify.com/track/${trackId}`;

    // EXACT same navigation as scraper
    await page.goto(trackPageUrl, {
      waitUntil: 'networkidle',
      timeout: TIMEOUTS.pageLoad,
    });

    // EXACT same initial wait as scraper
    await page.waitForTimeout(3000);

    // EXACT same scroll as scraper
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });
    await page.waitForTimeout(500);

    // EXACT same cookie banner dismissal as scraper
    try {
      const cookieButton = await page.waitForSelector('button:has-text("Accept")', { timeout: 2000 });
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Cookie banner not present
    }

    // Count buttons
    const allButtons = await page.$$('button');
    console.log(`Found ${allButtons.length} buttons on page`);

    if (allButtons.length > 100) {
      console.log('✓ SUCCESS - Page loaded fully!');

      // Try to find More options button
      for (const btn of allButtons) {
        const ariaLabel = await btn.getAttribute('aria-label');
        if (ariaLabel && ariaLabel.includes('More options for')) {
          console.log(`✓ Found menu button: "${ariaLabel}"`);
          break;
        }
      }
    } else {
      console.log('❌ FAIL - Page did not load fully (only 18 buttons)');
      await page.screenshot({ path: 'failed-load.png' });
      console.log('Screenshot saved to failed-load.png');
    }

    await localBrowser.close();

  } catch (error) {
    console.error('Error:', error.message);
    if (localBrowser) await localBrowser.close();
  }
}

testExactScraperLogic();
