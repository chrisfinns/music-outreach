const { scrapeTrackCredits } = require('./scrapers/spotify-playwright');
const settingsService = require('./settings-service');

async function testCreditsWithCookie() {
  try {
    // Get the session cookie from settings
    const sessionCookie = settingsService.getSpotifySessionCookie();

    if (!sessionCookie) {
      console.log('❌ No session cookie configured in settings.json');
      console.log('Please add your sp_dc cookie in Settings first.');
      process.exit(1);
    }

    console.log('✓ Session cookie found in settings');
    console.log(`Cookie preview: ${sessionCookie.substring(0, 20)}...`);
    console.log('\nTesting track credits scraping...\n');

    // Test with a known track
    const trackId = '3n3Ppam7vgaVa1iaRUc9Lp'; // Replace with any track ID
    console.log(`Scraping credits for track: ${trackId}`);

    const result = await scrapeTrackCredits(trackId, sessionCookie);

    console.log('\n=== RESULT ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.found && result.credits && result.credits.length > 0) {
      console.log('\n✓ Successfully scraped credits:');
      result.credits.forEach((credit, i) => {
        console.log(`  ${i + 1}. ${credit}`);
      });
    } else {
      console.log('\n✗ Failed to scrape credits');
      console.log(`Error: ${result.error}`);
      if (result.details) {
        console.log(`Details: ${result.details}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testCreditsWithCookie();
