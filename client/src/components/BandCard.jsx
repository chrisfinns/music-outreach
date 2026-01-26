import { useState, useEffect } from 'react';

function BandCard({ band, onUpdate, onDelete, onRegenerateMessage }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [editData, setEditData] = useState({
    bandName: band.bandName,
    members: band.members,
    song: band.song,
    instagram: band.instagram,
    notes: band.notes,
    followUpNotes: band.followUpNotes || '',
    generatedMessage: band.generatedMessage || '',
  });

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsEditing(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSave = () => {
    // Auto-prepend @ to Instagram if it doesn't have one
    const updatedData = {
      ...editData,
      instagram: editData.instagram.startsWith('@') ? editData.instagram : `@${editData.instagram}`
    };
    onUpdate(band.id, updatedData);
    setIsEditing(false);
  };

  // Reset edit data when band changes or modal opens
  useEffect(() => {
    setEditData({
      bandName: band.bandName,
      members: band.members,
      song: band.song,
      instagram: band.instagram,
      notes: band.notes,
      followUpNotes: band.followUpNotes || '',
      generatedMessage: band.generatedMessage || '',
    });
  }, [band, isOpen]);

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(editData.generatedMessage);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleOpenInstagram = () => {
    let url = band.instagram;

    // If it's already a full URL, use it directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
    } else {
      // Otherwise, treat it as a handle and build the URL
      const handle = url.replace('@', '');
      window.open(`https://instagram.com/${handle}`, '_blank');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const hasGeneratedMessage = band.generatedMessage && band.generatedMessage.trim() !== '';

  return (
    <>
      {/* Card View */}
      <div
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 text-sm">{band.bandName}</h4>
              {/* Flair icon if no AI-generated message */}
              {!hasGeneratedMessage && band.messageStatus !== 'generating' && (
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-1">{band.song}</p>
            {band.dateAdded && (
              <p className="text-xs text-gray-400 mt-1">{formatDate(band.dateAdded)}</p>
            )}
          </div>
        </div>

        {/* Message Status Indicator */}
        {band.messageStatus === 'generating' && (
          <div className="mt-2 text-xs text-blue-600 font-medium">Generating...</div>
        )}
        {band.messageStatus === 'failed' && (
          <div className="mt-2 text-xs text-red-600 font-medium">Generation Failed</div>
        )}
      </div>

      {/* Modal Lightbox */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setIsOpen(false);
            setIsEditing(false);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{band.bandName}</h3>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsEditing(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {!isEditing ? (
                <div className="space-y-4">
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
                <label className="text-xs font-semibold text-gray-700 block text-center">Instagram</label>
                <div className="flex items-center justify-center gap-2">
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
                  <textarea
                    value={editData.generatedMessage}
                    onChange={(e) => setEditData({ ...editData, generatedMessage: e.target.value })}
                    rows={10}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <div className="mt-2 flex gap-2 items-center flex-wrap">
                    <button
                      onClick={() => {
                        onUpdate(band.id, { generatedMessage: editData.generatedMessage });
                      }}
                      className="text-xs px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Save Message
                    </button>
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
                    {copySuccess && (
                      <span className="text-xs text-green-600 font-medium">Copied!</span>
                    )}
                  </div>
                </div>
              )}

              {band.messageStatus === 'generating' && !band.generatedMessage && (
                <div className="text-center">
                  <p className="text-sm text-blue-600 mb-2">Generating message...</p>
                  <button
                    onClick={() => onRegenerateMessage(band)}
                    className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Stuck? Click to Retry
                  </button>
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

              {!band.generatedMessage && band.messageStatus !== 'generating' && band.messageStatus !== 'failed' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800 mb-2">No message generated yet</p>
                  <button
                    onClick={() => onRegenerateMessage(band)}
                    className="w-full text-sm px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Generate Message
                  </button>
                </div>
              )}

              {band.followUpNotes && (
                <div>
                  <label className="text-xs font-semibold text-gray-700">Follow-up Notes</label>
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{band.followUpNotes}</p>
                </div>
              )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this band?')) {
                          onDelete(band.id);
                          setIsOpen(false);
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700">Band Name</label>
                    <input
                      type="text"
                      value={editData.bandName}
                      onChange={(e) => setEditData({ ...editData, bandName: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Members</label>
                    <input
                      type="text"
                      value={editData.members}
                      onChange={(e) => setEditData({ ...editData, members: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Song</label>
                    <input
                      type="text"
                      value={editData.song}
                      onChange={(e) => setEditData({ ...editData, song: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Instagram</label>
                    <input
                      type="text"
                      value={editData.instagram}
                      onChange={(e) => setEditData({ ...editData, instagram: e.target.value })}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="@username"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Original Notes</label>
                    <textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={4}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700">Follow-up Notes</label>
                    <textarea
                      value={editData.followUpNotes}
                      onChange={(e) => setEditData({ ...editData, followUpNotes: e.target.value })}
                      rows={4}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded"
                      placeholder="Add conversation updates..."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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
                          generatedMessage: band.generatedMessage || '',
                        });
                        setIsEditing(false);
                      }}
                      className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default BandCard;
