const { ensureValidToken } = require('./auth');

async function getUserPlaylists() {
  try {
    const spotifyApi = await ensureValidToken();
    const data = await spotifyApi.getUserPlaylists();

    return data.body.items.map(playlist => ({
      id: playlist.id,
      name: playlist.name,
      trackCount: playlist.tracks.total,
      image: playlist.images && playlist.images.length > 0 ? playlist.images[0].url : null,
      owner: playlist.owner.display_name,
      public: playlist.public
    }));
  } catch (error) {
    console.error('Error fetching user playlists:', error);
    throw new Error('Failed to fetch playlists');
  }
}

async function getPlaylistTracks(playlistId) {
  try {
    const spotifyApi = await ensureValidToken();
    let allTracks = [];
    let offset = 0;
    const limit = 50;
    let hasMore = true;

    while (hasMore) {
      const data = await spotifyApi.getPlaylistTracks(playlistId, {
        offset,
        limit,
        fields: 'items(track(id,name,uri,artists(id,name),album(name,images)))'
      });

      allTracks = allTracks.concat(data.body.items);
      hasMore = data.body.items.length === limit;
      offset += limit;
    }

    return allTracks
      .filter(item => item.track && item.track.id)
      .map(item => ({
        id: item.track.id,
        name: item.track.name,
        uri: item.track.uri,
        album: item.track.album.name,
        albumImage: item.track.album.images && item.track.album.images.length > 0
          ? item.track.album.images[0].url
          : null,
        artists: item.track.artists.map(artist => ({
          id: artist.id,
          name: artist.name
        })),
        primaryArtist: item.track.artists[0]
      }));
  } catch (error) {
    console.error('Error fetching playlist tracks:', error);
    throw new Error('Failed to fetch playlist tracks');
  }
}

async function getArtist(artistId) {
  try {
    const spotifyApi = await ensureValidToken();
    const data = await spotifyApi.getArtist(artistId);

    return {
      id: data.body.id,
      name: data.body.name,
      popularity: data.body.popularity,
      genres: data.body.genres,
      followers: data.body.followers.total,
      images: data.body.images,
      externalUrls: data.body.external_urls
    };
  } catch (error) {
    console.error('Error fetching artist:', error);
    throw new Error('Failed to fetch artist details');
  }
}

async function getArtistAlbums(artistId) {
  try {
    const spotifyApi = await ensureValidToken();
    const data = await spotifyApi.getArtistAlbums(artistId, {
      include_groups: 'album,single',
      limit: 50
    });

    const releases = data.body.items.map(album => ({
      id: album.id,
      name: album.name,
      releaseDate: album.release_date,
      releaseDatePrecision: album.release_date_precision,
      albumType: album.album_type
    }));

    if (releases.length === 0) {
      return null;
    }

    const latestRelease = releases.reduce((latest, current) => {
      const currentDate = new Date(current.releaseDate);
      const latestDate = new Date(latest.releaseDate);
      return currentDate > latestDate ? current : latest;
    });

    return latestRelease;
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    throw new Error('Failed to fetch artist releases');
  }
}

async function getArtistTopTracks(artistId) {
  try {
    const spotifyApi = await ensureValidToken();
    const data = await spotifyApi.getArtistTopTracks(artistId, 'US');

    if (data.body.tracks.length === 0) {
      return null;
    }

    const topTrack = data.body.tracks[0];
    return {
      id: topTrack.id,
      name: topTrack.name,
      popularity: topTrack.popularity,
      previewUrl: topTrack.preview_url,
      uri: topTrack.uri
    };
  } catch (error) {
    console.error('Error fetching artist top tracks:', error);
    return null;
  }
}

async function removeTracksFromPlaylist(playlistId, trackUris) {
  try {
    const spotifyApi = await ensureValidToken();

    const tracks = trackUris.map(uri => ({ uri }));

    const batchSize = 100;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      await spotifyApi.removeTracksFromPlaylist(playlistId, batch);
    }

    return { success: true, removed: trackUris.length };
  } catch (error) {
    console.error('Error removing tracks from playlist:', error);
    throw new Error('Failed to remove tracks from playlist');
  }
}

module.exports = {
  getUserPlaylists,
  getPlaylistTracks,
  getArtist,
  getArtistAlbums,
  getArtistTopTracks,
  removeTracksFromPlaylist
};
