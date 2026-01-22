const { scrapeTrackCredits } = require('./scrapers/spotify-playwright');
const settingsService = require('./settings-service');

async function testCreditsFinal() {
  try {
    console.log('Testing complete scrapeTrackCredits function...\n');

    const trackId = '3n3Ppam7vgaVa1iaRUc9Lp';
    const sessionCookie = settingsService.getSpotifySessionCookie();

    if (!sessionCookie) {
      console.log('❌ No session cookie configured');
      process.exit(1);
    }

    console.log('✓ Session cookie found');
    console.log(`Testing track ID: ${trackId}\n`);

    const result = await scrapeTrackCredits(trackId, sessionCookie);

    console.log('=== Result ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.found) {
      console.log('\n✓ Success! Found credits:');
      result.credits.forEach((credit, i) => {
        console.log(`  ${i + 1}. ${credit}`);
      });
    } else {
      console.log('\n❌ Failed to get credits');
      console.log(`Error: ${result.error}`);
      if (result.details) {
        console.log(`Details: ${result.details}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testCreditsFinal();
