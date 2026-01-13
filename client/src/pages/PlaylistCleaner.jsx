import { useState, useEffect } from 'react';
import QuickAddModal from '../components/QuickAddModal';
import API_URL from '../config';

export default function PlaylistCleaner() {
  const [connected, setConnected] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState('');
  const [filters, setFilters] = useState({
    popularityMin: 2,
    popularityMax: 40,
    maxYearsSinceRelease: 2,
    requireInstagram: true
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [addedArtists, setAddedArtists] = useState(new Set());

  useEffect(() => {
    checkSpotifyStatus();
  }, []);

  async function checkSpotifyStatus() {
    try {
      const response = await fetch(`${API_URL}/spotify/status`);
      const data = await response.json();
      setConnected(data.connected);

      if (data.connected) {
        loadPlaylists();
      }
    } catch (error) {
      console.error('Error checking Spotify status:', error);
    }
  }

  async function handleConnect() {
    try {
      const response = await fetch(`${API_URL}/spotify/auth`);
      const data = await response.json();

      const authWindow = window.open(data.authURL, 'Spotify Auth', 'width=600,height=800');

      const checkAuth = setInterval(async () => {
        if (authWindow.closed) {
          clearInterval(checkAuth);
          await checkSpotifyStatus();
        }
      }, 1000);
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
      alert('Failed to connect to Spotify');
    }
  }

  async function loadPlaylists() {
    try {
      const response = await fetch(`${API_URL}/spotify/playlists`);
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error('Error loading playlists:', error);
      alert('Failed to load playlists');
    }
  }

  async function handleAnalyze() {
    if (!selectedPlaylist) {
      alert('Please select a playlist');
      return;
    }

    setAnalyzing(true);
    setResults(null);
    setProgress(null);

    try {
      const response = await fetch(`${API_URL}/spotify/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: selectedPlaylist,
          filters
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'progress') {
              setProgress(data.data);
            } else if (data.type === 'complete') {
              setResults(data.data);
              setShowConfirmation(true);
              setProgress(null);
            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error analyzing playlist:', error);
      alert('Failed to analyze playlist');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleClean() {
    if (!results || results.removed.length === 0) {
      return;
    }

    setCleaning(true);

    try {
      const response = await fetch(`${API_URL}/spotify/clean`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: selectedPlaylist,
          artistsToRemove: results.removed
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Successfully removed ${data.removed} tracks from playlist!`);
        setShowConfirmation(false);
        setResults(null);
        setSelectedPlaylist('');
      }
    } catch (error) {
      console.error('Error cleaning playlist:', error);
      alert('Failed to clean playlist');
    } finally {
      setCleaning(false);
    }
  }

  async function handleQuickAdd(artistId, formData) {
    try {
      // Create band in Airtable
      const createResponse = await fetch(`${API_URL}/bands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandName: formData.bandName,
          song: formData.song,
          instagram: formData.instagram,
          members: formData.members,
          notes: formData.notes,
          status: 'not_messaged'
        })
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create band in CRM');
      }

      const bandData = await createResponse.json();

      // Generate message for the band
      const messageResponse = await fetch(`${API_URL}/generate-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bandName: formData.bandName,
          members: formData.members,
          song: formData.song,
          notes: formData.notes
        })
      });

      if (messageResponse.ok) {
        const messageData = await messageResponse.json();

        // Update band with generated message
        await fetch(`${API_URL}/bands/${bandData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...bandData,
            generatedMessage: messageData.message
          })
        });
      }

      // Mark artist as added
      setAddedArtists(prev => new Set(prev).add(artistId));

      alert(`Successfully added ${formData.bandName} to CRM!`);
    } catch (error) {
      console.error('Error adding artist to CRM:', error);
      throw error;
    }
  }

  const selectedPlaylistData = playlists.find(p => p.id === selectedPlaylist);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Playlist Cleaner</h1>

      {!connected ? (
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h2 className="text-xl font-semibold mb-4">Connect to Spotify</h2>
          <p className="text-gray-600 mb-6">
            Connect your Spotify account to analyze and clean your playlists
          </p>
          <button
            onClick={handleConnect}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            Connect Spotify
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Select Playlist</h2>
            <select
              value={selectedPlaylist}
              onChange={(e) => setSelectedPlaylist(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg"
            >
              <option value="">-- Select a playlist --</option>
              {playlists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name} ({playlist.trackCount} tracks)
                </option>
              ))}
            </select>
          </div>

          {selectedPlaylist && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Filter Settings</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Popularity Min
                  </label>
                  <input
                    type="number"
                    value={filters.popularityMin}
                    onChange={(e) => setFilters({ ...filters, popularityMin: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Popularity Max
                  </label>
                  <input
                    type="number"
                    value={filters.popularityMax}
                    onChange={(e) => setFilters({ ...filters, popularityMax: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Years Since Release
                  </label>
                  <input
                    type="number"
                    value={filters.maxYearsSinceRelease}
                    onChange={(e) => setFilters({ ...filters, maxYearsSinceRelease: parseInt(e.target.value) })}
                    className="w-full p-2 border border-gray-300 rounded"
                    min="0"
                    max="10"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.requireInstagram}
                      onChange={(e) => setFilters({ ...filters, requireInstagram: e.target.checked })}
                      className="mr-2 h-5 w-5"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Require Instagram Presence
                    </span>
                  </label>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
              >
                {analyzing ? 'Analyzing...' : 'Analyze Playlist'}
              </button>
            </div>
          )}

          {analyzing && progress && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Analysis Progress</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {progress.phase === 'fetching_artists' && 'Fetching Artist Data'}
                    {progress.phase === 'scraping_instagram' && 'Checking Instagram Presence'}
                    {progress.phase === 'evaluating' && 'Evaluating Results'}
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    {progress.current} / {progress.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  ></div>
                </div>
                {progress.artist && (
                  <p className="text-sm text-gray-600">
                    Currently processing: <span className="font-medium">{progress.artist}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {showConfirmation && results && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>

              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-lg mb-2">Summary</h3>
                <p className="text-gray-700">
                  Playlist: <strong>{selectedPlaylistData?.name}</strong>
                </p>
                <p className="text-gray-700">
                  Total Tracks: <strong>{results.totalTracks}</strong>
                </p>
                <p className="text-gray-700">
                  Total Artists: <strong>{results.totalArtists}</strong>
                </p>
                <p className="text-green-600 font-semibold">
                  Artists to Keep: <strong>{results.summary.keptCount}</strong>
                </p>
                <p className="text-red-600 font-semibold">
                  Artists to Remove: <strong>{results.summary.removedCount}</strong> ({results.summary.tracksToRemove} tracks)
                </p>
                {results.summary.uncheckedCount > 0 && (
                  <p className="text-yellow-600 font-semibold">
                    Unchecked Artists: <strong>{results.summary.uncheckedCount}</strong>
                  </p>
                )}
              </div>

              {results.removed.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2 text-red-600">
                    Artists to be Removed ({results.removed.length})
                  </h3>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                    {results.removed.map(artist => (
                      <div key={artist.id} className="mb-2 pb-2 border-b border-gray-100 last:border-0">
                        <p className="font-medium">{artist.name}</p>
                        <p className="text-sm text-gray-600">
                          {artist.failureReason}: {artist.popularityCheck?.details || artist.releaseCheck?.details || artist.instagramCheck?.details}
                        </p>
                        <p className="text-xs text-gray-500">
                          {artist.tracks.length} track{artist.tracks.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.kept.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2 text-green-600">
                    Artists Kept ({results.kept.filter(a => !addedArtists.has(a.id)).length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {results.kept.filter(artist => !addedArtists.has(artist.id)).map(artist => (
                      <div key={artist.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <p className="font-medium mb-2">{artist.name}</p>
                        <p className="text-sm text-gray-600">
                          Popularity: {artist.spotifyData?.popularity}
                        </p>
                        <p className="text-sm text-gray-600 mb-3">
                          {artist.instagramCheck?.instagram?.handle || 'No Instagram'}
                        </p>
                        <button
                          onClick={() => setSelectedArtist(artist)}
                          className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
                        >
                          Quick Add to CRM
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.unchecked.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-2 text-yellow-600">
                    Unchecked Artists ({results.unchecked.length})
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    These artists could not be verified (rate limiting or errors). They will NOT be removed.
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                    {results.unchecked.map(artist => (
                      <div key={artist.id} className="mb-2">
                        <p className="font-medium">{artist.name}</p>
                        <p className="text-xs text-gray-600">{artist.failureReason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={handleClean}
                  disabled={cleaning || results.removed.length === 0}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50"
                >
                  {cleaning ? 'Cleaning...' : `Confirm & Clean Playlist (Remove ${results.summary.tracksToRemove} tracks)`}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    setResults(null);
                  }}
                  className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Add Modal */}
      {selectedArtist && (
        <QuickAddModal
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
          onAdd={handleQuickAdd}
        />
      )}
    </div>
  );
}
