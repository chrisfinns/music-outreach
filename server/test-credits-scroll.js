const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsScroll() {
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

    // Scroll down to load more content
    console.log('\nScrolling down to load more content...');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);

    // Look for "More", "Show more", "..." buttons
    console.log('\n=== Looking for expandable sections ===');
    const expandButtons = await page.$$('button');
    for (const btn of expandButtons) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute('aria-label');
      if (text && (text.toLowerCase().includes('more') || text.includes('...'))) {
        console.log(`Found expandable button: "${text}" / "${ariaLabel}"`);
      }
    }

    // Search for common credit-related words
    console.log('\n=== Searching for credit-related content ===');
    const pageContent = await page.textContent('body');
    const keywords = ['credit', 'composer', 'writer', 'producer', 'performer', 'source'];
    keywords.forEach(keyword => {
      const found = pageContent.toLowerCase().includes(keyword);
      console.log(`  "${keyword}": ${found}`);
    });

    // Take screenshot
    await page.screenshot({ path: 'credits-page-full.png', fullPage: true });
    console.log('\n✓ Screenshot saved to credits-page-full.png');

    console.log('\n🔍 Manual inspection time - browser will stay open for 60 seconds');
    console.log('Try to manually find where credits are displayed!');
    await page.waitForTimeout(60000);

    await browser.close();

  } catch (error) {
    console.error('Error:', error);
    if (browser) await browser.close();
  }
}

testCreditsScroll();
