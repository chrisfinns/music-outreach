const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsFindModal() {
  const sessionCookie = settingsService.getSpotifySessionCookie();

  if (!sessionCookie) {
    console.log('❌ No session cookie configured');
    return;
  }

  const browser = await chromium.launch({ headless: false }); // Visible to see what's happening
  const context = await browser.newContext({
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

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
  const trackId = '3n3Ppam7vgaVa1iaRUc9Lp';

  await page.goto(`https://open.spotify.com/track/${trackId}`, {
    waitUntil: 'networkidle',
    timeout: 15000
  });

  console.log('Waiting for page to load...');
  await page.waitForTimeout(3000);

  // Dismiss cookie banner
  try {
    const btn = await page.waitForSelector('button:has-text("Accept")', { timeout: 2000 });
    if (btn) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}

  // Count buttons
  const allButtons = await page.$$('button');
  console.log(`Found ${allButtons.length} buttons`);

  // Look for "More options for" button
  for (const btn of allButtons) {
    const ariaLabel = await btn.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.includes('More options for')) {
      console.log(`✓ Found: "${ariaLabel}"`);

      // Click it
      await btn.click();
      await page.waitForTimeout(1000);

      // Look for "View credits"
      const creditsBtn = await page.waitForSelector('button:has-text("View credits")', { timeout: 3000 });
      if (creditsBtn) {
        console.log('✓ Found "View credits" menu item, clicking...');
        await creditsBtn.click();

        // Wait longer for modal to load
        await page.waitForTimeout(5000);

        // Look for content containing credit-related keywords
        console.log('\n=== Searching for credits content ===');
        const pageContent = await page.textContent('body');

        const keywords = ['Performed by', 'Written by', 'Produced by', 'Credits', 'Composer', 'Vocalist'];
        for (const keyword of keywords) {
          const found = pageContent.includes(keyword);
          console.log(`  "${keyword}": ${found}`);
        }

        // Try to find modal with specific credit content
        const modals = await page.$$('[role="dialog"]');
        console.log(`\nFound ${modals.length} modal(s)`);

        for (let i = 0; i < modals.length; i++) {
          const content = await modals[i].textContent();
          if (content.includes('Performed by') || content.includes('Written by') || content.includes('Produced by')) {
            console.log(`\n✓ Found credits in modal ${i + 1}!`);
            console.log('=== Credits Content ===');
            console.log(content.substring(0, 500));
          }
        }

        console.log('\n\nBrowser will stay open for 30 seconds - check what modal appeared!');
        await page.waitForTimeout(30000);
      }
      break;
    }
  }

  await browser.close();
}

testCreditsFindModal();
