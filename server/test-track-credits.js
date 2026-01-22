const spotifyApi = require('./spotify/api');

async function testTrackCredits() {
  try {
    // Test with a Stellus track - let's find one first
    // Using a known track ID for testing
    const trackId = '3n3Ppam7vgaVa1iaRUc9Lp'; // You can replace this with any Stellus track ID

    console.log('Fetching track data...');
    const trackData = await spotifyApi.getTrack(trackId);

    console.log('\n=== TRACK DATA ===');
    console.log(JSON.stringify(trackData, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

testTrackCredits();
