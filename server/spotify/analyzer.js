const spotifyApi = require('./api');
const { scrapeInstagramHandlesWithDelay } = require('../scrapers/spotify-playwright');
const airtableService = require('../airtable-service');

const DEFAULT_FILTERS = {
  popularityMin: 2,
  popularityMax: 40,
  maxYearsSinceRelease: 2,
  requireInstagram: true,
  skipCrmArtists: true
};

function evaluatePopularity(artist, filters) {
  if (artist.popularity < filters.popularityMin) {
    return {
      passed: false,
      reason: 'popularity_too_low',
      details: `Popularity ${artist.popularity} is below minimum ${filters.popularityMin}`
    };
  }

  if (artist.popularity > filters.popularityMax) {
    return {
      passed: false,
      reason: 'popularity_too_high',
      details: `Popularity ${artist.popularity} is above maximum ${filters.popularityMax}`
    };
  }

  return { passed: true };
}

function evaluateReleaseDate(latestRelease, filters) {
  if (!latestRelease) {
    return {
      passed: false,
      reason: 'no_releases',
      details: 'No albums or singles found for this artist'
    };
  }

  const releaseDate = new Date(latestRelease.releaseDate);
  const now = new Date();
  const yearsSinceRelease = (now - releaseDate) / (1000 * 60 * 60 * 24 * 365);

  if (yearsSinceRelease > filters.maxYearsSinceRelease) {
    return {
      passed: false,
      reason: 'no_recent_release',
      details: `Last release was ${Math.floor(yearsSinceRelease * 10) / 10} years ago (max: ${filters.maxYearsSinceRelease})`
    };
  }

  return {
    passed: true,
    yearsSinceRelease: Math.floor(yearsSinceRelease * 10) / 10
  };
}

function evaluateInstagram(instagramResult, filters) {
  if (!filters.requireInstagram) {
    return { passed: true, status: 'not_required' };
  }

  if (instagramResult.error === 'rate_limit_exceeded') {
    return {
      passed: 'unchecked',
      status: 'rate_limit_exceeded',
      reason: 'Rate limit reached, could not verify Instagram',
      instagram: null
    };
  }

  if (instagramResult.error && instagramResult.error !== 'fetch_failed') {
    return {
      passed: 'unchecked',
      status: 'unreachable',
      reason: 'Could not scrape Instagram data',
      instagram: null
    };
  }

  if (!instagramResult.found || !instagramResult.handle) {
    return {
      passed: false,
      status: 'not_found',
      reason: 'no_instagram',
      details: 'No Instagram handle found on Spotify page',
      instagram: null
    };
  }

  return {
    passed: true,
    status: 'found',
    instagram: {
      handle: instagramResult.handle,
      url: instagramResult.url
    }
  };
}

async function analyzePlaylist(playlistId, filters = DEFAULT_FILTERS, onProgress) {
  try {
    const tracks = await spotifyApi.getPlaylistTracks(playlistId);

    // Fetch all existing bands from CRM if filtering is enabled
    let crmArtistNames = new Set();
    if (filters.skipCrmArtists) {
      try {
        const crmBands = await airtableService.getAllBands();
        crmArtistNames = new Set(
          crmBands.map(band => band.bandName.toLowerCase().trim())
        );
        console.log(`Loaded ${crmArtistNames.size} artists from CRM for filtering`);
      } catch (error) {
        console.error('Error loading CRM artists:', error);
        // Continue without CRM filtering if there's an error
      }
    }

    const artistMap = new Map();
    tracks.forEach(track => {
      const primaryArtist = track.primaryArtist;
      if (!artistMap.has(primaryArtist.id)) {
        artistMap.set(primaryArtist.id, {
          id: primaryArtist.id,
          name: primaryArtist.name,
          tracks: []
        });
      }
      artistMap.get(primaryArtist.id).tracks.push({
        id: track.id,
        name: track.name,
        uri: track.uri,
        album: track.album,
        albumImage: track.albumImage
      });
    });

    const artistIds = Array.from(artistMap.keys());
    const results = [];

    if (onProgress) {
      onProgress({
        phase: 'fetching_artists',
        current: 0,
        total: artistIds.length
      });
    }

    for (let i = 0; i < artistIds.length; i++) {
      const artistId = artistIds[i];
      const artistData = artistMap.get(artistId);

      try {
        const [artist, latestRelease] = await Promise.all([
          spotifyApi.getArtist(artistId),
          spotifyApi.getArtistAlbums(artistId)
        ]);

        // Handle rate limiting or API failures gracefully
        if (!artist) {
          console.error(`Failed to fetch artist data for ${artistId} (rate limited or error)`);
          artistData.error = 'spotify_data_error';
        } else {
          const popularityCheck = evaluatePopularity(artist, filters);
          const releaseCheck = evaluateReleaseDate(latestRelease, filters);

          artistData.spotifyData = {
            popularity: artist.popularity,
            latestRelease: latestRelease ? latestRelease.releaseDate : null,
            genres: artist.genres,
            followers: artist.followers,
            images: artist.images,
            externalUrls: artist.externalUrls
          };

          artistData.popularityCheck = popularityCheck;
          artistData.releaseCheck = releaseCheck;
        }

        if (onProgress) {
          onProgress({
            phase: 'fetching_artists',
            current: i + 1,
            total: artistIds.length,
            artist: artistData.name
          });
        }
      } catch (error) {
        console.error(`Error fetching artist data for ${artistId}:`, error);
        artistData.error = 'spotify_data_error';
      }
    }

    if (onProgress) {
      onProgress({
        phase: 'scraping_instagram',
        current: 0,
        total: artistIds.length
      });
    }

    const instagramResults = await scrapeInstagramHandlesWithDelay(
      artistIds,
      (progress) => {
        if (onProgress) {
          onProgress({
            phase: 'scraping_instagram',
            current: progress.current,
            total: progress.total,
            artist: artistMap.get(progress.artistId).name
          });
        }
      }
    );

    if (onProgress) {
      onProgress({
        phase: 'evaluating',
        current: 0,
        total: artistIds.length
      });
    }

    artistIds.forEach((artistId, index) => {
      const artistData = artistMap.get(artistId);
      const instagramResult = instagramResults.get(artistId);

      const instagramCheck = evaluateInstagram(instagramResult, filters);
      artistData.instagramCheck = instagramCheck;

      let status = 'kept';
      let failureReason = null;
      let confidence = 'high';

      // Check if artist is already in CRM
      if (filters.skipCrmArtists && crmArtistNames.has(artistData.name.toLowerCase().trim())) {
        status = 'removed';
        failureReason = 'already_in_crm';
        artistData.crmCheck = {
          passed: false,
          reason: 'already_in_crm',
          details: 'Artist already exists in CRM'
        };
      } else if (artistData.error === 'spotify_data_error') {
        status = 'removed';
        failureReason = 'spotify_data_error';
        confidence = 'low';
      } else if (!artistData.popularityCheck.passed) {
        status = 'removed';
        failureReason = artistData.popularityCheck.reason;
      } else if (!artistData.releaseCheck.passed) {
        status = 'removed';
        failureReason = artistData.releaseCheck.reason;
      } else if (instagramCheck.passed === false) {
        status = 'removed';
        failureReason = instagramCheck.reason;
      } else if (instagramCheck.passed === 'unchecked') {
        status = 'unchecked';
        failureReason = instagramCheck.reason;
        confidence = 'low';
      }

      artistData.status = status;
      artistData.failureReason = failureReason;
      artistData.confidence = confidence;

      results.push(artistData);

      if (onProgress) {
        onProgress({
          phase: 'evaluating',
          current: index + 1,
          total: artistIds.length
        });
      }
    });

    const kept = results.filter(a => a.status === 'kept');
    const removed = results.filter(a => a.status === 'removed');
    const unchecked = results.filter(a => a.status === 'unchecked');

    return {
      totalTracks: tracks.length,
      totalArtists: results.length,
      kept: kept,
      removed: removed,
      unchecked: unchecked,
      summary: {
        keptCount: kept.length,
        removedCount: removed.length,
        uncheckedCount: unchecked.length,
        tracksToRemove: removed.reduce((sum, a) => sum + a.tracks.length, 0)
      }
    };

  } catch (error) {
    console.error('Error analyzing playlist:', error);
    throw new Error('Failed to analyze playlist');
  }
}

async function cleanPlaylist(playlistId, artistsToRemove) {
  try {
    const trackUris = artistsToRemove.flatMap(artist =>
      artist.tracks.map(track => track.uri)
    );

    if (trackUris.length === 0) {
      return { success: true, removed: 0 };
    }

    await spotifyApi.removeTracksFromPlaylist(playlistId, trackUris);

    return {
      success: true,
      removed: trackUris.length,
      artists: artistsToRemove.length
    };
  } catch (error) {
    console.error('Error cleaning playlist:', error);
    throw new Error('Failed to clean playlist');
  }
}

module.exports = {
  analyzePlaylist,
  cleanPlaylist,
  DEFAULT_FILTERS
};
