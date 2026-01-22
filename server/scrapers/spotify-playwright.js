const { chromium } = require('playwright');
const { SELECTORS, TIMEOUTS, RATE_LIMITS } = require('./spotify-selectors');

/**
 * Instagram Scraper using Playwright
 *
 * WHY PLAYWRIGHT IS REQUIRED:
 * - Spotify artist pages use lazy-rendered React UI
 * - Instagram links do NOT exist in initial page HTML
 * - Links are injected into DOM only after clicking "About" button
 * - This triggers React logic that fetches and renders a modal
 * - The modal contains the Instagram link
 *
 * WHY SIMPLE FETCH/CHEERIO FAILS:
 * - fetch() + cheerio only sees server HTML
 * - Server HTML doesn't include modal content
 * - Modal is client-side rendered via JavaScript
 * - No JavaScript execution = no link available
 *
 * ROOT CAUSE:
 * This is a UI architecture mismatch, not a bug.
 * Spotify moved Instagram links from static page to click-triggered modal.
 */

let browser = null;
let context = null;

/**
 * Initialize browser and context (reused across requests)
 */
async function initBrowser() {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-web-security',
      ]
    });

    context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
  }
  return context;
}

/**
 * Close browser (call when done with batch)
 */
async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    context = null;
  }
}

/**
 * Try multiple selectors, return first match
 */
async function trySelectors(page, selectors, timeout) {
  for (const selector of selectors) {
    try {
      const element = await page.waitForSelector(selector, { timeout: timeout / selectors.length });
      if (element) return element;
    } catch (e) {
      // Continue to next selector
    }
  }
  return null;
}

/**
 * Scrape Instagram handle for a single artist using Playwright
 *
 * PROCESS:
 * 1. Navigate to artist page
 * 2. Wait for About button
 * 3. Click About button
 * 4. Wait for modal to open
 * 5. Extract Instagram link from modal
 *
 * @param {string} artistId - Spotify artist ID
 * @returns {Object} { found: boolean, handle: string, url: string, error: string }
 */
async function scrapeInstagramHandle(artistId) {
  let page = null;

  try {
    const ctx = await initBrowser();
    page = await ctx.newPage();

    const artistPageUrl = `https://open.spotify.com/artist/${artistId}`;

    // Navigate to artist page
    await page.goto(artistPageUrl, {
      waitUntil: 'domcontentloaded',
      timeout: TIMEOUTS.pageLoad,
    });

    // Wait a moment for initial render
    await page.waitForTimeout(1000);

    // Try to dismiss cookie banner if present
    try {
      const cookieButton = await trySelectors(
        page,
        SELECTORS.cookieBanner,
        2000  // Only wait 2 seconds for cookie banner
      );
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Cookie banner not present or already dismissed, continue
    }

    // Try to find and click the About button (artist profile card)
    const aboutButton = await trySelectors(
      page,
      SELECTORS.aboutButton,
      TIMEOUTS.aboutButton
    );

    if (!aboutButton) {
      console.log(`No About button found for artist ${artistId}`);
      return { found: false, handle: null, error: 'no_about_button' };
    }

    // Click the About button to open modal
    // Use force: true to bypass any intercepting elements
    await aboutButton.click({ force: true });

    // Wait for modal to open
    await page.waitForTimeout(1500);

    // Try to find Instagram link in the modal
    try {
      await page.waitForSelector(SELECTORS.instagramLink, {
        timeout: TIMEOUTS.instagramLink,
      });
    } catch (e) {
      console.log(`No Instagram link found for artist ${artistId}`);
      return { found: false, handle: null, error: null };
    }

    // Extract Instagram link
    const instagramLink = await page.getAttribute(SELECTORS.instagramLink, 'href');

    if (!instagramLink) {
      return { found: false, handle: null, error: null };
    }

    // Parse handle from URL
    const handleMatch = instagramLink.match(/instagram\.com\/([^/?]+)/);
    if (!handleMatch || !handleMatch[1]) {
      return { found: false, handle: null, error: 'parse_failed' };
    }

    const handle = handleMatch[1];

    await page.close();

    return {
      found: true,
      handle: `@${handle}`,
      url: instagramLink,
    };

  } catch (error) {
    console.error(`Error scraping Instagram for artist ${artistId}:`, error.message);

    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    return {
      found: false,
      handle: null,
      error: 'exception',
      details: error.message,
    };
  }
}

/**
 * Scrape Instagram handles for multiple artists with rate limiting
 *
 * WHY WE CACHE NULL RESULTS:
 * "Not found" is a valid result. If we don't cache nulls:
 * - Same artist gets scraped repeatedly
 * - Spotify sees repeated visits from same IP
 * - Risk of blocking increases
 * - Worker load explodes
 *
 * Caching null = rate-limit by design
 *
 * WHY THIS IS "BEST EFFORT":
 * - This worker provides enrichment, not truth
 * - Null is acceptable
 * - Crashes are not acceptable
 * - We don't retry endlessly
 * - We don't block the UI
 * - We don't assume success
 *
 * @param {string[]} artistIds - Array of Spotify artist IDs
 * @param {Function} onProgress - Progress callback
 * @returns {Map} Map of artistId -> result
 */
async function scrapeInstagramHandlesWithDelay(artistIds, onProgress) {
  const results = new Map();

  // Limit to MAX_CHECKS to avoid rate limits
  const artistsToCheck = artistIds.slice(0, RATE_LIMITS.maxChecks);

  for (let i = 0; i < artistsToCheck.length; i++) {
    const artistId = artistsToCheck[i];

    // Add random delay between requests (except first)
    if (i > 0) {
      const delay = RATE_LIMITS.minDelay +
        Math.random() * (RATE_LIMITS.maxDelay - RATE_LIMITS.minDelay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const result = await scrapeInstagramHandle(artistId);
    results.set(artistId, result);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: artistsToCheck.length,
        artistId,
        result,
      });
    }
  }

  // Mark remaining artists as rate-limited
  if (artistIds.length > RATE_LIMITS.maxChecks) {
    const remaining = artistIds.slice(RATE_LIMITS.maxChecks);
    remaining.forEach(artistId => {
      results.set(artistId, {
        found: false,
        handle: null,
        error: 'rate_limit_exceeded',
      });
    });
  }

  // Close browser after batch
  await closeBrowser();

  return results;
}

/**
 * Scrape track credits (band members) from Spotify track page
 * Credits are on the TRACK page, not the artist page!
 *
 * @param {string} trackId - Spotify track ID
 * @param {string} sessionCookie - Optional Spotify session cookie (sp_dc) for enhanced access
 * @returns {Object} { found: boolean, credits: string[], error: string }
 */
async function scrapeTrackCredits(trackId, sessionCookie = null) {
  let page = null;
  let localBrowser = null;
  let localContext = null;

  try {
    // For credits, ALWAYS create a fresh browser instance
    // This ensures proper cookie handling and page loading
    // NOTE: Must use minimal launch args - Spotify blocks browsers with
    // certain flags (like --disable-blink-features) with DRM error
    localBrowser = await chromium.launch({
      headless: true
    });

    if (sessionCookie) {
      // Create a new context with the cookie pre-configured
      localContext = await localBrowser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
      });

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
      console.log('Using session cookie for enhanced credits access');
    } else {
      localContext = await localBrowser.newContext();
      page = await localContext.newPage();
    }

    const trackPageUrl = `https://open.spotify.com/track/${trackId}`;

    // Navigate to track page
    await page.goto(trackPageUrl, {
      waitUntil: 'networkidle',
      timeout: TIMEOUTS.pageLoad,
    });

    // Wait a moment for initial render
    await page.waitForTimeout(3000);

    // Scroll to ensure content is loaded
    await page.evaluate(() => {
      window.scrollTo(0, 300);
    });
    await page.waitForTimeout(500);

    // Try to dismiss cookie banner if present
    try {
      const cookieButton = await trySelectors(
        page,
        SELECTORS.cookieBanner,
        2000
      );
      if (cookieButton) {
        await cookieButton.click();
        await page.waitForTimeout(500);
      }
    } catch (e) {
      // Cookie banner not present, continue
    }

    // Look for the 3-dot menu button next to play button
    // IMPORTANT: Credits are in a dropdown menu that requires login
    // The button contains an SVG with 3 circles and has aria-label like "More options for {Track Name}"
    let menuButton = null;

    // Wait for the page to have the track content loaded
    await page.waitForSelector('button', { timeout: 5000 });
    await page.waitForTimeout(2000);

    // Try to find the button containing the 3-dot SVG icon
    // The SVG has 3 circle elements with specific positioning
    const svgSelector = 'svg path[d*="4.5 13.5a1.5 1.5"]';
    try {
      const svgElement = await page.waitForSelector(svgSelector, { timeout: 5000 });
      if (svgElement) {
        // Get the button that contains this SVG
        menuButton = await svgElement.evaluateHandle(svg => {
          let el = svg;
          while (el && el.tagName !== 'BUTTON') {
            el = el.parentElement;
          }
          return el;
        });
        console.log('Found menu button via SVG icon');
      }
    } catch (e) {
      console.log('SVG selector failed, trying aria-label fallback');

      // Fallback: search by aria-label
      const allButtons = await page.$$('button');
      console.log(`Found ${allButtons.length} total buttons on page`);

      for (const btn of allButtons) {
        try {
          const ariaLabel = await btn.getAttribute('aria-label');
          if (ariaLabel && ariaLabel.includes('More options for')) {
            menuButton = btn;
            console.log(`Found menu button with aria-label: "${ariaLabel}"`);
            break;
          }
        } catch (e) {
          // Button might have been removed from DOM, continue
        }
      }
    }

    if (!menuButton) {
      const errorMsg = sessionCookie
        ? 'no_menu_button_with_session'
        : 'requires_login';

      console.log(`No menu button found for track ${trackId}. ${sessionCookie ? 'Session cookie may be invalid.' : 'Login required - add session cookie in Settings.'}`);

      return {
        found: false,
        credits: [],
        error: errorMsg,
        details: sessionCookie
          ? 'Menu button not found. Your session cookie may have expired.'
          : 'Credits require login. Add your Spotify session cookie in Settings for full access.'
      };
    }

    // Click the 3-dot menu button to open dropdown
    await menuButton.click({ force: true });
    await page.waitForTimeout(500);

    // Now look for "View credits" in the dropdown menu
    let creditsMenuItem = null;
    const creditsMenuSelectors = [
      'button:has-text("View credits")',
      '[role="menuitem"]:has-text("View credits")',
      'li:has-text("View credits")',
      'a:has-text("View credits")'
    ];

    for (const selector of creditsMenuSelectors) {
      try {
        creditsMenuItem = await page.waitForSelector(selector, { timeout: 2000 });
        if (creditsMenuItem) {
          console.log(`Found "View credits" menu item with selector: ${selector}`);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (!creditsMenuItem) {
      console.log(`No "View credits" option found in menu for track ${trackId}`);
      return {
        found: false,
        credits: [],
        error: 'no_credits_menu_item',
        details: 'Menu opened but no "View credits" option found.'
      };
    }

    // Click the "View credits" menu item to open credits view
    await creditsMenuItem.click({ force: true });

    // Wait for credits content to load
    await page.waitForTimeout(4000);

    // Extract credits - they appear in a container, not necessarily a [role="dialog"] modal
    const credits = [];

    try {
      // Wait for credits-specific content to appear
      // Look for "Performed by" text which indicates credits are loaded
      await page.waitForSelector('text=Performed by', { timeout: 5000 });
      console.log('Credits content loaded');

      // Find the "Performed by" element and get its parent container
      const performedByEl = await page.$('text=Performed by');
      if (!performedByEl) {
        throw new Error('Could not find Performed by element');
      }

      // Get a parent container that has the full credits
      // We need to go up a few levels to get the full container
      const creditsContainer = await performedByEl.evaluateHandle(el => {
        let parent = el;
        // Go up until we find a container with reasonable size (credits should be 100-500 chars)
        for (let i = 0; i < 5; i++) {
          parent = parent.parentElement;
          if (parent && parent.textContent.length > 80 && parent.textContent.length < 600) {
            return parent;
          }
        }
        return parent; // Return whatever we have
      });

      // Get all text content from the credits container
      const modalContent = await creditsContainer.textContent();

      if (modalContent) {
        // Credits are formatted like: "Mr. BrightsidePerformed byThe KillersWritten byBrandon FlowersDave Keuning..."
        // We need to split by the role labels and extract names

        // Extract performers
        const performedMatch = modalContent.match(/Performed by(.+?)(?:Written by|Produced by|Source|$)/);
        if (performedMatch) {
          const performers = performedMatch[1].trim();
          if (performers) {
            credits.push(`Performed by: ${performers}`);
          }
        }

        // Extract writers
        const writtenMatch = modalContent.match(/Written by(.+?)(?:Produced by|Source|$)/);
        if (writtenMatch) {
          const writersText = writtenMatch[1].trim();
          if (writersText) {
            credits.push(`Written by: ${writersText}`);
          }
        }

        // Extract producers
        const producedMatch = modalContent.match(/Produced by(.+?)(?:Source|$)/);
        if (producedMatch) {
          const producers = producedMatch[1].trim();
          if (producers) {
            credits.push(`Produced by: ${producers}`);
          }
        }

        // Extract source
        const sourceMatch = modalContent.match(/Source:\s*(.+?)$/);
        if (sourceMatch) {
          const source = sourceMatch[1].trim();
          if (source) {
            credits.push(`Source: ${source}`);
          }
        }
      }
    } catch (e) {
      console.log(`Error extracting credits for track ${trackId}:`, e.message);
    }

    // Close the local browser
    if (localBrowser) {
      await localBrowser.close();
    }

    return {
      found: credits.length > 0,
      credits: credits.filter((credit, index) => credits.indexOf(credit) === index).slice(0, 10), // Remove duplicates and limit to 10
      error: null
    };

  } catch (error) {
    console.error(`Error scraping credits for track ${trackId}:`, error.message);

    // Close the local browser
    if (localBrowser) {
      try {
        await localBrowser.close();
      } catch (e) {
        // Ignore close errors
      }
    }

    return {
      found: false,
      credits: [],
      error: 'exception',
      details: error.message,
    };
  }
}

module.exports = {
  scrapeInstagramHandle,
  scrapeInstagramHandlesWithDelay,
  scrapeTrackCredits,
  closeBrowser,
};
