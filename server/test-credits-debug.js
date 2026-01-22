const { chromium } = require('playwright');

async function testCreditsDebug() {
  let browser = null;

  try {
    console.log('Testing track credits scraping with debug output...\n');

    // Test with a known track - let's use a popular one
    const trackId = '3n3Ppam7vgaVa1iaRUc9Lp'; // Replace with any track ID

    browser = await chromium.launch({ headless: false }); // Use headless: false to see what's happening
    const page = await browser.newPage();

    const trackPageUrl = `https://open.spotify.com/track/${trackId}`;
    console.log(`Navigating to ${trackPageUrl}...`);

    await page.goto(trackPageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    console.log('Page loaded, waiting for content...');
    await page.waitForTimeout(3000);

    // Try to dismiss cookie banner
    try {
      const cookieButton = await page.waitForSelector('button:has-text("Accept")', { timeout: 2000 });
      if (cookieButton) {
        await cookieButton.click();
        console.log('Dismissed cookie banner');
        await page.waitForTimeout(500);
      }
    } catch (e) {
      console.log('No cookie banner found');
    }

    // Look for Credits button
    console.log('\n=== Looking for Credits button ===');

    // Try multiple selectors
    const possibleSelectors = [
      'button:has-text("Credits")',
      'button:has-text("Show credits")',
      '[data-testid="credits-button"]',
      'button[aria-label*="credit" i]',
      'button[aria-label*="Credit" i]'
    ];

    let creditsButton = null;
    for (const selector of possibleSelectors) {
      try {
        creditsButton = await page.waitForSelector(selector, { timeout: 2000 });
        if (creditsButton) {
          console.log(`Found credits button with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`Selector failed: ${selector}`);
      }
    }

    if (!creditsButton) {
      console.log('\n=== No Credits button found, checking page content ===');
      const pageText = await page.textContent('body');
      console.log('Page contains "credits":', pageText.toLowerCase().includes('credits'));

      // Take screenshot for debugging
      await page.screenshot({ path: 'credits-debug.png' });
      console.log('Screenshot saved to credits-debug.png');

      await browser.close();
      return;
    }

    // Click the Credits button
    console.log('\nClicking Credits button...');
    await creditsButton.click({ force: true });
    await page.waitForTimeout(2000);

    // Check for modal
    console.log('\n=== Checking for modal ===');
    const modalSelectors = [
      '[role="dialog"]',
      '[aria-modal="true"]',
      '.modal',
      '[class*="Modal"]'
    ];

    let modal = null;
    for (const selector of modalSelectors) {
      try {
        modal = await page.$(selector);
        if (modal) {
          console.log(`Found modal with selector: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`Modal selector failed: ${selector}`);
      }
    }

    if (!modal) {
      console.log('No modal found');
      await page.screenshot({ path: 'credits-after-click.png' });
      console.log('Screenshot saved to credits-after-click.png');
      await browser.close();
      return;
    }

    // Extract credits from modal
    console.log('\n=== Extracting credits from modal ===');
    const modalContent = await page.textContent('[role="dialog"]');
    console.log('Modal content:');
    console.log(modalContent);

    const lines = modalContent.split('\n').map(line => line.trim()).filter(Boolean);
    console.log('\n=== Parsed lines ===');
    lines.forEach((line, i) => {
      console.log(`${i + 1}: ${line}`);
    });

    await browser.close();

  } catch (error) {
    console.error('Error:', error);
    if (browser) {
      await browser.close();
    }
  }
}

testCreditsDebug();
