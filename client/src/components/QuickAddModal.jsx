import { useState, useEffect } from 'react';
import API_URL from '../config';

export default function QuickAddModal({ artist, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    bandName: artist.name,
    song: artist.tracks?.[0]?.name || '',
    instagram: artist.instagramCheck?.instagram?.handle || '',
    members: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTopTracks, setShowTopTracks] = useState(false);
  const [credits, setCredits] = useState(null);
  const [loadingCredits, setLoadingCredits] = useState(false);

  // Fetch track credits when modal opens
  useEffect(() => {
    async function fetchCredits() {
      if (!artist.tracks?.[0]?.id) return;

      setLoadingCredits(true);
      try {
        const response = await fetch(`${API_URL}/spotify/track/${artist.tracks[0].id}/credits`);
        const data = await response.json();

        if (data.found && data.credits && data.credits.length > 0) {
          setCredits(data.credits);
        }
      } catch (error) {
        console.error('Error fetching credits:', error);
      } finally {
        setLoadingCredits(false);
      }
    }
    fetchCredits();
  }, [artist]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.bandName || !formData.song || !formData.instagram) {
      alert('Please fill in Band Name, Song, and Instagram');
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert Instagram handle to full URL for Airtable
      let instagramUrl = formData.instagram.trim();

      // Remove @ if present
      instagramUrl = instagramUrl.replace(/^@/, '');

      // If not already a URL, convert to URL
      if (!instagramUrl.includes('instagram.com')) {
        instagramUrl = `https://instagram.com/${instagramUrl}`;
      }

      const submissionData = {
        ...formData,
        instagram: instagramUrl
      };

      await onAdd(artist.id, submissionData);
      onClose();
    } catch (error) {
      console.error('Error adding artist to CRM:', error);
      alert('Failed to add artist to CRM. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenSpotify = () => {
    window.open(`https://open.spotify.com/artist/${artist.id}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Quick Add to CRM</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Spotify Player */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">Spotify Preview</h4>
                <button
                  onClick={() => setShowTopTracks(!showTopTracks)}
                  className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                >
                  {showTopTracks ? 'Show Playlist Track' : 'Show Top Tracks'}
                </button>
              </div>
              <iframe
                src={showTopTracks
                  ? `https://open.spotify.com/embed/artist/${artist.id}?utm_source=generator`
                  : `https://open.spotify.com/embed/track/${artist.tracks?.[0]?.id}?utm_source=generator`
                }
                width="100%"
                height="380"
                frameBorder="0"
                allowFullScreen=""
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
                className="rounded-lg"
              ></iframe>
              <button
                onClick={handleOpenSpotify}
                className="mt-3 w-full text-sm px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Open in Spotify
              </button>

              {/* Artist Info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Popularity:</span> {artist.spotifyData?.popularity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold">Monthly Listeners:</span> {artist.spotifyData?.followers?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                </div>
                {artist.releaseCheck?.latestRelease && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Latest Release:</span> {artist.releaseCheck.latestRelease.year}
                  </p>
                )}

                {/* Track Credits */}
                <div className="pt-2 border-t border-gray-200">
                  {loadingCredits && (
                    <p className="text-sm text-gray-500 italic">
                      Loading credits...
                    </p>
                  )}
                  {!loadingCredits && credits && credits.length > 0 && (
                    <>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Credits:</span>
                      </p>
                      <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                        {credits.map((credit, index) => (
                          <p key={index}>{credit}</p>
                        ))}
                      </div>
                    </>
                  )}
                  {!loadingCredits && !credits && (
                    <div className="bg-blue-50 border border-blue-200 rounded p-2">
                      <p className="text-xs text-blue-800">
                        <span className="font-semibold">Credits unavailable</span> - Spotify requires login to view track credits.
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Add your session cookie in <a href="/settings" className="underline font-semibold">Settings</a> to enable automatic credits display.
                      </p>
                    </div>
                  )}
                </div>

                {artist.instagramCheck?.instagram?.url && (
                  <div className="pt-2 border-t border-gray-200">
                    <a
                      href={artist.instagramCheck.instagram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      Instagram: {artist.instagramCheck.instagram.handle}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <p className="text-xs text-gray-500 mt-1">
                      Check their recent posts to gauge activity and engagement
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Form */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Artist Details</h4>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Band Name *
                  </label>
                  <input
                    type="text"
                    value={formData.bandName}
                    onChange={(e) => setFormData({ ...formData, bandName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Song *
                  </label>
                  <input
                    type="text"
                    value={formData.song}
                    onChange={(e) => setFormData({ ...formData, song: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Song from playlist or choose from Spotify player"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Instagram *
                  </label>
                  <input
                    type="text"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="@username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Members
                  </label>
                  <input
                    type="text"
                    value={formData.members}
                    onChange={(e) => setFormData({ ...formData, members: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter member names (check credits above or Spotify page)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Tip: Check the Credits section above for composer/performer info
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add listening notes or observations..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                  >
                    {isSubmitting ? 'Adding...' : 'Add to CRM'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
