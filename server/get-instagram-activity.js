/**
 * Get latest Instagram post timestamp for an artist
 *
 * Strategy:
 * 1. Load profile page
 * 2. Get first 4 post links
 * 3. Check 4th post (guaranteed unpinned, since max pins = 3)
 * 4. Extract timestamp from post page
 *
 * This is the most reliable method:
 * - Only 2 page loads (profile + 1 post)
 * - No complex pin detection needed
 * - Works regardless of Instagram's UI changes
 */

const { chromium } = require('playwright');

/**
 * Extract Instagram username from URL or handle
 * @param {string} input - Instagram URL or username
 * @returns {string} - Clean Instagram username
 */
function extractInstagramUsername(input) {
  if (!input) return '';

  let cleaned = input.trim();

  // Remove @ symbol if present
  cleaned = cleaned.replace(/^@/, '');

  // If it's a URL, extract username
  if (cleaned.includes('instagram.com')) {
    // Handle formats like:
    // https://www.instagram.com/username/
    // https://instagram.com/username
    // www.instagram.com/username/
    const match = cleaned.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1]) {
      cleaned = match[1];
    }
  }

  // Remove trailing slash if present
  cleaned = cleaned.replace(/\/$/, '');

  return cleaned;
}

async function getInstagramActivity(usernameOrUrl) {
  // Extract username from URL if needed
  const username = extractInstagramUsername(usernameOrUrl);

  if (!username) {
    return {
      success: false,
      error: 'Invalid Instagram username or URL',
      lastActivityDate: null
    };
  }

  const browser = await chromium.launch({
    headless: false // Instagram shows login wall in headless mode
  });

  try {
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      locale: 'en-US',
      timezoneId: 'America/New_York'
    });

    const page = await context.newPage();

    // Add stealth scripts to avoid bot detection
    await page.addInitScript(() => {
      // Override the navigator.webdriver property
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Add chrome object
      window.chrome = {
        runtime: {}
      };

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });
    });

    // Load profile
    await page.goto(`https://www.instagram.com/${username}/`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(3000);

    // Check for and close login modal if present
    try {
      // Look for the close button (X icon in top right of modal)
      const closeButton = await page.$('button svg[aria-label="Close"]');
      if (closeButton) {
        const button = await closeButton.evaluateHandle(el => el.closest('button'));
        if (button) {
          await button.asElement().click();
          await page.waitForTimeout(1500);
        }
      }
    } catch (e) {
      // Modal might not be present, continue
    }

    // Get post links and detect which are pinned
    const postAnalysis = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]'));

      return allLinks.map((link, index) => {
        const href = link.getAttribute('href');

        // Find the container for this post
        const container = link.closest('article') || link.closest('div[class]');

        // Look for the pin icon SVG with specific aria-label
        const pinIcon = container?.querySelector('svg[aria-label="Pinned post icon"]');

        // Check if pin icon exists AND is actually visible
        let isPinned = false;
        if (pinIcon) {
          const style = window.getComputedStyle(pinIcon);
          const parentStyle = window.getComputedStyle(pinIcon.parentElement);

          // Check visibility of icon and its parent
          const isVisible =
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            parseFloat(style.opacity) > 0 &&
            parentStyle.display !== 'none' &&
            parentStyle.visibility !== 'hidden';

          isPinned = isVisible;
        }

        return {
          href,
          isPinned,
          index
        };
      });
    });

    if (postAnalysis.length === 0) {
      await browser.close();
      return {
        success: false,
        error: 'No posts found',
        lastActivityDate: null
      };
    }

    // Find first unpinned post
    const firstUnpinned = postAnalysis.find(post => !post.isPinned);

    if (!firstUnpinned) {
      // Fallback: if all appear pinned (shouldn't happen), use 4th post
      const postIndex = postAnalysis.length >= 4 ? 3 : 0;
      var postHref = postAnalysis[postIndex].href;
      var postUrl = `https://www.instagram.com${postHref}`;
    } else {
      var postHref = firstUnpinned.href;
      var postUrl = `https://www.instagram.com${postHref}`;
    }

    const pinnedCount = postAnalysis.filter(p => p.isPinned).length;

    // Navigate to post
    await page.goto(postUrl, {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    await page.waitForTimeout(1500);

    // Extract timestamp
    const timeElement = await page.$('time');
    if (!timeElement) {
      await browser.close();
      return {
        success: false,
        error: 'No timestamp found on post',
        lastActivityDate: null
      };
    }

    const datetime = await timeElement.getAttribute('datetime');
    if (!datetime) {
      await browser.close();
      return {
        success: false,
        error: 'Time element has no datetime attribute',
        lastActivityDate: null
      };
    }

    const date = new Date(datetime);

    await browser.close();

    return {
      success: true,
      lastActivityDate: date.toISOString(),
      postUrl: postUrl,
      totalPosts: postAnalysis.length,
      pinnedPostsSkipped: pinnedCount,
      checkedPostPosition: firstUnpinned ? firstUnpinned.index + 1 : (postAnalysis.length >= 4 ? 4 : 1)
    };

  } catch (error) {
    await browser.close();
    return {
      success: false,
      error: error.message,
      lastActivityDate: null
    };
  }
}

// Export for use in main app
module.exports = { getInstagramActivity };

// Test when run directly
if (require.main === module) {
  async function test() {
    console.log('\n=== Testing Instagram Activity Scraper ===\n');

    const test1 = await getInstagramActivity('officialstellus');
    console.log('officialstellus:', JSON.stringify(test1, null, 2));

    console.log('\n');

    const test2 = await getInstagramActivity('radiohead');
    console.log('radiohead:', JSON.stringify(test2, null, 2));
  }

  test();
}
