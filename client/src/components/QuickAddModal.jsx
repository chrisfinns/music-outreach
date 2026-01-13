import { useState, useEffect } from 'react';

export default function QuickAddModal({ artist, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    bandName: artist.name,
    song: '',
    instagram: artist.instagramCheck?.instagram?.handle || '',
    members: '',
    notes: `Found via Playlist Cleaner`
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Auto-prepend @ to Instagram if it doesn't have one
      const submissionData = {
        ...formData,
        instagram: formData.instagram.startsWith('@') ? formData.instagram : `@${formData.instagram}`
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
              <h4 className="font-semibold text-gray-900 mb-3">Spotify Preview</h4>
              <iframe
                src={`https://open.spotify.com/embed/artist/${artist.id}?utm_source=generator`}
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
                Open in Spotify (Check Members)
              </button>

              {/* Artist Info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Popularity:</span> {artist.spotifyData?.popularity}
                </p>
                {artist.releaseCheck?.latestRelease && (
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold">Latest Release:</span> {artist.releaseCheck.latestRelease.year}
                  </p>
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
                    placeholder="Enter a song title or listen in Spotify player"
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
                    placeholder="Check Spotify page and enter member names"
                  />
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
