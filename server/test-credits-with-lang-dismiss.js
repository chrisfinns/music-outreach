const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsWithLangDismiss() {
  const sessionCookie = settingsService.getSpotifySessionCookie();

  if (!sessionCookie) {
    console.log('❌ No session cookie configured');
    return;
  }

  const browser = await chromium.launch({ headless: true });
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
  let found = false;
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
        await page.waitForTimeout(2000);

        // Check if there's a language modal
        const modalContent = await page.textContent('[role="dialog"]');
        if (modalContent && modalContent.includes('Choose a language')) {
          console.log('Language selection modal appeared, dismissing...');
          // Try to close it by clicking outside or finding a close button
          try {
            const closeBtn = await page.$('[aria-label="Close"]');
            if (closeBtn) {
              await closeBtn.click();
              await page.waitForTimeout(1000);
            } else {
              // Press Escape to close
              await page.keyboard.press('Escape');
              await page.waitForTimeout(1000);
            }
          } catch (e) {
            console.log('Could not dismiss language modal');
          }
        }

        // Now wait for credits modal
        await page.waitForTimeout(2000);

        // Try to find credits content
        const modals = await page.$$('[role="dialog"]');
        console.log(`Found ${modals.length} modal(s)`);

        for (let i = 0; i < modals.length; i++) {
          const content = await modals[i].textContent();
          if (content && !content.includes('Choose a language') && content.length < 2000) {
            console.log(`\n=== Modal ${i + 1} Content ===`);
            console.log(content);
          }
        }
      }
      found = true;
      break;
    }
  }

  if (!found) {
    console.log('❌ Could not find "More options" button');
  }

  await browser.close();
}

testCreditsWithLangDismiss();
