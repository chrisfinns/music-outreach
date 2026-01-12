/**
 * Centralized selector definitions for Spotify artist pages
 *
 * Why centralize selectors:
 * - Spotify frequently renames CSS classes and updates UI
 * - A/B tests mean selectors may vary
 * - Centralization allows quick fixes in one place
 * - Avoids rewriting scraper logic when UI changes
 */

const SELECTORS = {
  // Button that triggers the artist info modal
  // This is actually the artist profile card button with monthly listeners
  aboutButton: [
    'button:has-text("monthly listeners")',  // Most reliable - every artist has this
    'button[aria-label]',  // Fallback: button with artist name as aria-label
    '[data-testid="artist-about-button"]'
  ],

  // Cookie consent banner
  cookieBanner: [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    '#onetrust-accept-btn-handler',
    'button[id*="accept"]'
  ],

  // Instagram link inside the modal
  // The link only appears AFTER the About button is clicked
  instagramLink: 'a[href*="instagram.com"]',

  // Modal container (for waiting/verification)
  modal: '[role="dialog"]',

  // Alternative selectors for artist social links section
  socialLinksSection: '[data-testid="social-links"]',
};

/**
 * Timeout constants for scraping operations
 */
const TIMEOUTS = {
  // Max time to wait for page load
  pageLoad: 30000,

  // Max time to wait for About button to appear
  aboutButton: 10000,

  // Max time to wait for modal to open after click
  modalOpen: 5000,

  // Max time to wait for Instagram link in modal
  instagramLink: 5000,
};

/**
 * Rate limiting configuration
 */
const RATE_LIMITS = {
  // Minimum delay between requests (ms)
  minDelay: 700,

  // Maximum delay between requests (ms)
  maxDelay: 1300,

  // Maximum number of artists to check per session
  // This is "best effort" enrichment, not required data
  maxChecks: 50,
};

module.exports = {
  SELECTORS,
  TIMEOUTS,
  RATE_LIMITS,
};
