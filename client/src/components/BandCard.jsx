import { useState } from 'react';

function BandCard({ band, onUpdate, onDelete, onRegenerateMessage }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    bandName: band.bandName,
    members: band.members,
    song: band.song,
    instagram: band.instagram,
    notes: band.notes,
    followUpNotes: band.followUpNotes || '',
  });

  const handleSave = () => {
    onUpdate(band.id, editData);
    setIsEditing(false);
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(band.generatedMessage);
      alert('Message copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleOpenInstagram = () => {
    const handle = band.instagram.replace('@', '');
    window.open(`https://instagram.com/${handle}`, '_blank');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Collapsed View */}
      <div
        className="p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">{band.bandName}</h4>
            <p className="text-xs text-gray-600 mt-1">{band.song}</p>
            {band.dateAdded && (
              <p className="text-xs text-gray-400 mt-1">{formatDate(band.dateAdded)}</p>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Message Status Indicator */}
        {band.messageStatus === 'generating' && (
          <div className="mt-2 text-xs text-blue-600 font-medium">Generating...</div>
        )}
        {band.messageStatus === 'failed' && (
          <div className="mt-2 text-xs text-red-600 font-medium">Generation Failed</div>
        )}
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {!isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Band Name</label>
                <p className="text-sm text-gray-900">{band.bandName}</p>
              </div>

              {band.members && (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Members</label>
                  <p className="text-sm text-gray-900">{band.members}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-700">Song</label>
                <p className="text-sm text-gray-900">{band.song}</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Instagram</label>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-900">{band.instagram}</p>
                  <button
                    onClick={handleOpenInstagram}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Open
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Original Notes</label>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{band.notes}</p>
              </div>

              {band.generatedMessage && (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Generated Message</label>
                  <div className="mt-1 p-3 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{band.generatedMessage}</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={handleCopyMessage}
                      className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Copy to Clipboard
                    </button>
                    <button
                      onClick={() => onRegenerateMessage(band)}
                      className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                      disabled={band.messageStatus === 'generating'}
                    >
                      Regenerate
                    </button>
                  </div>
                </div>
              )}

              {band.messageStatus === 'failed' && (
                <button
                  onClick={() => onRegenerateMessage(band)}
                  className="w-full text-sm px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Retry Generation
                </button>
              )}

              {band.followUpNotes && (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Follow-up Notes</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{band.followUpNotes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 text-xs px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this band?')) {
                      onDelete(band.id);
                    }
                  }}
                  className="flex-1 text-xs px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Band Name</label>
                <input
                  type="text"
                  value={editData.bandName}
                  onChange={(e) => setEditData({ ...editData, bandName: e.target.value })}
                  className="mt-1 w-full text-sm px-2 py-1 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Members</label>
                <input
                  type="text"
                  value={editData.members}
                  onChange={(e) => setEditData({ ...editData, members: e.target.value })}
                  className="mt-1 w-full text-sm px-2 py-1 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Song</label>
                <input
                  type="text"
                  value={editData.song}
                  onChange={(e) => setEditData({ ...editData, song: e.target.value })}
                  className="mt-1 w-full text-sm px-2 py-1 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Instagram</label>
                <input
                  type="text"
                  value={editData.instagram}
                  onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                  className="mt-1 w-full text-sm px-2 py-1 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Original Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full text-sm px-2 py-1 border border-gray-300 rounded"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Follow-up Notes</label>
                <textarea
                  value={editData.followUpNotes}
                  onChange={(e) => setEditData({ ...editData, followUpNotes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full text-sm px-2 py-1 border border-gray-300 rounded"
                  placeholder="Add conversation updates..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSave}
                  className="flex-1 text-xs px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditData({
                      bandName: band.bandName,
                      members: band.members,
                      song: band.song,
                      instagram: band.instagram,
                      notes: band.notes,
                      followUpNotes: band.followUpNotes || '',
                    });
                    setIsEditing(false);
                  }}
                  className="flex-1 text-xs px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default BandCard;
