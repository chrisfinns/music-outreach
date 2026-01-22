const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsWithLocale() {
  const sessionCookie = settingsService.getSpotifySessionCookie();

  if (!sessionCookie) {
    console.log('❌ No session cookie configured');
    return;
  }

  const browser = await chromium.launch({ headless: true });
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
        await page.waitForTimeout(3000);

        // Get all modals
        const modals = await page.$$('[role="dialog"]');
        console.log(`Found ${modals.length} modal(s)`);

        for (let i = 0; i < modals.length; i++) {
          const content = await modals[i].textContent();
          // Skip language and cookie modals
          if (!content.includes('Choose a language') &&
              !content.includes('Cookie Policy') &&
              content.length > 10 && content.length < 2000) {
            console.log(`\n=== Credits Modal Content ===`);
            console.log(content);

            // Parse credits
            const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
            console.log(`\n=== Parsed Lines (${lines.length} lines) ===`);
            lines.forEach((line, idx) => {
              console.log(`${idx + 1}: ${line}`);
            });
          }
        }
      }
      break;
    }
  }

  await browser.close();
}

testCreditsWithLocale();
