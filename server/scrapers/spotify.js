const cheerio = require('cheerio');

async function scrapeInstagramHandle(artistId) {
  try {
    const artistPageUrl = `https://open.spotify.com/artist/${artistId}`;

    const response = await fetch(artistPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch Spotify artist page for ${artistId}: ${response.status}`);
      return { found: false, handle: null, error: 'fetch_failed' };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const instagramLink = $('a[href*="instagram.com"]').attr('href');

    if (!instagramLink) {
      return { found: false, handle: null, error: null };
    }

    const handleMatch = instagramLink.match(/instagram\.com\/([^/?]+)/);
    if (!handleMatch || !handleMatch[1]) {
      return { found: false, handle: null, error: 'parse_failed' };
    }

    const handle = handleMatch[1];

    return {
      found: true,
      handle: `@${handle}`,
      url: instagramLink
    };

  } catch (error) {
    console.error(`Error scraping Instagram handle for artist ${artistId}:`, error.message);
    return { found: false, handle: null, error: 'exception' };
  }
}

async function scrapeInstagramHandlesWithDelay(artistIds, onProgress) {
  const results = new Map();
  const MIN_DELAY = 700;
  const MAX_DELAY = 1300;
  const MAX_CHECKS = 50;

  const artistsToCheck = artistIds.slice(0, MAX_CHECKS);

  for (let i = 0; i < artistsToCheck.length; i++) {
    const artistId = artistsToCheck[i];

    if (i > 0) {
      const delay = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const result = await scrapeInstagramHandle(artistId);
    results.set(artistId, result);

    if (onProgress) {
      onProgress({
        current: i + 1,
        total: artistsToCheck.length,
        artistId,
        result
      });
    }
  }

  if (artistIds.length > MAX_CHECKS) {
    const remaining = artistIds.slice(MAX_CHECKS);
    remaining.forEach(artistId => {
      results.set(artistId, {
        found: false,
        handle: null,
        error: 'rate_limit_exceeded'
      });
    });
  }

  return results;
}

module.exports = {
  scrapeInstagramHandle,
  scrapeInstagramHandlesWithDelay
};
