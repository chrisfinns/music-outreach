import { useState, useEffect } from 'react';
import API_URL from '../config';

function SystemPrompt() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSystemPrompt();
  }, []);

  const fetchSystemPrompt = async () => {
    try {
      const response = await fetch(`${API_URL}/system-prompt`);
      const data = await response.json();
      setPrompt(data.prompt);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching system prompt:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`${API_URL}/system-prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving system prompt:', error);
      alert('Failed to save system prompt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">System Prompt</h1>
        <p className="text-sm text-gray-600 mb-6">
          This prompt guides how Claude generates outreach messages. Customize it to match your style and tone.
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Master Prompt for Message Generation
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            placeholder="Enter your system prompt here..."
          />
          <p className="text-xs text-gray-500 mt-2">
            This prompt will be used every time you generate a new outreach message.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Tips for a good system prompt:</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Specify the tone (friendly, professional, enthusiastic, etc.)</li>
            <li>Set message length guidelines (2-3 sentences recommended)</li>
            <li>Include instructions to reference specific details from notes</li>
            <li>Add a call-to-action guideline</li>
            <li>Mention any topics to avoid or emphasize</li>
          </ul>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Prompt'}
          </button>

          {saved && (
            <span className="text-sm text-green-600 font-medium">
              Saved successfully!
            </span>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Default Prompt Example:</h3>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto text-gray-700">
            {`You are a friendly music enthusiast reaching out to bands on Instagram.
Write a personalized, genuine message that shows you've actually listened to their music.
Be concise (2-3 sentences), enthusiastic but not over-the-top, and mention specific
details from the user's notes. End with a clear call-to-action or question about their music.`}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default SystemPrompt;
