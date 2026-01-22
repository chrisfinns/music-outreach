const { chromium } = require('playwright');
const settingsService = require('./settings-service');

async function testCreditsContainers() {
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

  await page.waitForTimeout(3000);

  // Dismiss cookie banner
  try {
    const btn = await page.waitForSelector('button:has-text("Accept")', { timeout: 2000 });
    if (btn) {
      await btn.click();
      await page.waitForTimeout(500);
    }
  } catch (e) {}

  // Find and click menu button
  const allButtons = await page.$$('button');
  for (const btn of allButtons) {
    const ariaLabel = await btn.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.includes('More options for')) {
      await btn.click();
      await page.waitForTimeout(1000);

      const creditsBtn = await page.waitForSelector('button:has-text("View credits")', { timeout: 3000 });
      if (creditsBtn) {
        await creditsBtn.click();
        await page.waitForTimeout(4000);

        console.log('=== Searching for "Performed by" in various containers ===\n');

        // Try different container types
        const containerSelectors = [
          '[role="dialog"]',
          '[role="region"]',
          '[role="complementary"]',
          '[aria-modal="true"]',
          'aside',
          '[class*="modal"]',
          '[class*="Modal"]',
          '[class*="credits"]',
          '[class*="Credits"]',
          '[class*="panel"]',
          '[class*="Panel"]',
          'div[class*="Popover"]',
          'div[data-testid*="credits"]'
        ];

        for (const selector of containerSelectors) {
          try {
            const elements = await page.$$(selector);
            for (let i = 0; i < elements.length; i++) {
              const content = await elements[i].textContent();
              if (content && content.includes('Performed by')) {
                console.log(`✓ Found in ${selector} #${i + 1}`);
                console.log('Content preview:');
                console.log(content.substring(0, 300));
                console.log('...\n');
              }
            }
          } catch (e) {}
        }

        // Also try finding the text directly and getting its parent
        console.log('=== Finding "Performed by" element directly ===');
        const performedByEl = await page.$('text=Performed by');
        if (performedByEl) {
          console.log('✓ Found "Performed by" element');

          // Get parent containers
          const parent1 = await performedByEl.evaluateHandle(el => el.parentElement);
          const parent2 = await performedByEl.evaluateHandle(el => el.parentElement?.parentElement);
          const parent3 = await performedByEl.evaluateHandle(el => el.parentElement?.parentElement?.parentElement);

          const p1Content = await parent1.textContent();
          const p2Content = await parent2.textContent();
          const p3Content = await parent3.textContent();

          console.log('\nParent 1 content length:', p1Content.length);
          console.log('Parent 2 content length:', p2Content.length);
          console.log('Parent 3 content length:', p3Content.length);

          if (p3Content.length < 2000 && p3Content.includes('Performed by')) {
            console.log('\n=== Parent 3 seems to be the credits container ===');
            console.log(p3Content);
          }
        }
      }
      break;
    }
  }

  await browser.close();
}

testCreditsContainers();
