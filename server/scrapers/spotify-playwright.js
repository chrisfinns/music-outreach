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

module.exports = {
  scrapeInstagramHandle,
  scrapeInstagramHandlesWithDelay,
  closeBrowser,
};
