import { useState, useEffect } from 'react';
import API_URL from '../config';

export default function Settings() {
  const [ngrokStatus, setNgrokStatus] = useState(null);
  const [copied, setCopied] = useState(false);
  const [apiKeys, setApiKeys] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [keyValue, setKeyValue] = useState('');
  const [saving, setSaving] = useState(false);

  const API_KEY_LABELS = {
    anthropic: 'Anthropic API Key',
    airtable: 'Airtable Access Token',
    spotifyClientId: 'Spotify Client ID',
    spotifyClientSecret: 'Spotify Client Secret',
    ngrok: 'Ngrok Auth Token'
  };

  useEffect(() => {
    checkNgrokStatus();
    fetchApiKeys();
    // Poll for ngrok status every 5 seconds
    const interval = setInterval(checkNgrokStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  async function checkNgrokStatus() {
    try {
      const response = await fetch(`${API_URL}/ngrok/status`);
      const data = await response.json();
      setNgrokStatus(data);
    } catch (error) {
      console.error('Error checking ngrok status:', error);
    }
  }

  async function fetchApiKeys() {
    try {
      const response = await fetch(`${API_URL}/settings/api-keys`);
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    }
  }

  async function saveApiKey(keyName) {
    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/settings/api-keys/${keyName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: keyValue })
      });
      const data = await response.json();
      setApiKeys(data);
      setEditingKey(null);
      setKeyValue('');
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Failed to save API key');
    } finally {
      setSaving(false);
    }
  }

  async function deleteApiKey(keyName) {
    if (!confirm(`Are you sure you want to delete the ${API_KEY_LABELS[keyName]}?`)) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/settings/api-keys/${keyName}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      setApiKeys(data);
    } catch (error) {
      console.error('Error deleting API key:', error);
      alert('Failed to delete API key');
    }
  }

  function startEditing(keyName) {
    setEditingKey(keyName);
    setKeyValue('');
  }

  function cancelEditing() {
    setEditingKey(null);
    setKeyValue('');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Ngrok Status Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Ngrok Tunnel Status
        </h2>

        {ngrokStatus?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">
                Tunnel Active
              </span>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Your Public URL:
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-300 text-sm font-mono text-blue-600">
                  {ngrokStatus.url}
                </code>
                <button
                  onClick={() => copyToClipboard(ngrokStatus.url)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Spotify Redirect URI:
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border border-gray-300 text-sm font-mono text-yellow-700 break-all">
                  {ngrokStatus.redirectUri}
                </code>
                <button
                  onClick={() => copyToClipboard(ngrokStatus.redirectUri)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm font-medium whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Setup Instructions:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>
                  Copy the <strong>Spotify Redirect URI</strong> above
                </li>
                <li>
                  Go to{' '}
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Spotify Developer Dashboard
                  </a>
                </li>
                <li>Open your app and click "Settings"</li>
                <li>
                  Under "Redirect URIs", paste the URI and click "Add"
                </li>
                <li>Click "Save" at the bottom</li>
                <li>You're ready to use Spotify features!</li>
              </ol>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Note:</strong> This ngrok URL changes every time you
                restart the server. You'll need to update the Redirect URI in
                Spotify Dashboard each time.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-sm font-medium text-gray-500">
                Tunnel Inactive
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 mb-3">
                To enable ngrok tunnel for Spotify OAuth:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                <li>
                  Sign up for a free account at{' '}
                  <a
                    href="https://ngrok.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    ngrok.com
                  </a>
                </li>
                <li>Get your authtoken from the ngrok dashboard</li>
                <li>
                  Add <code className="bg-white px-1 py-0.5 rounded text-xs">
                    NGROK_AUTHTOKEN=your_token
                  </code>{' '}
                  to your <code className="bg-white px-1 py-0.5 rounded text-xs">.env</code> file
                </li>
                <li>Restart the server</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* API Keys Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          API Configuration
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Manage your API keys and tokens. Keys are stored securely and masked for security.
        </p>

        <div className="space-y-4">
          {Object.keys(API_KEY_LABELS).map((keyName) => (
            <div key={keyName} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {API_KEY_LABELS[keyName]}
                  </h3>
                  {apiKeys[keyName] ? (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      Configured
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      Not Set
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  {apiKeys[keyName] && !editingKey && (
                    <button
                      onClick={() => deleteApiKey(keyName)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition"
                    >
                      Remove
                    </button>
                  )}
                  {!editingKey && (
                    <button
                      onClick={() => startEditing(keyName)}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    >
                      {apiKeys[keyName] ? 'Update' : 'Add'}
                    </button>
                  )}
                </div>
              </div>

              {editingKey === keyName ? (
                <div className="mt-3 space-y-3">
                  <input
                    type="password"
                    value={keyValue}
                    onChange={(e) => setKeyValue(e.target.value)}
                    placeholder={`Enter ${API_KEY_LABELS[keyName]}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={() => saveApiKey(keyName)}
                      disabled={saving || !keyValue}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={saving}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                apiKeys[keyName] && (
                  <div className="mt-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {apiKeys[keyName]}
                    </code>
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Where to get these keys:
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>Anthropic API Key:</strong>{' '}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                console.anthropic.com
              </a>
            </li>
            <li>
              <strong>Airtable Access Token:</strong>{' '}
              <a
                href="https://airtable.com/create/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                airtable.com/create/tokens
              </a>
            </li>
            <li>
              <strong>Spotify Client ID & Secret:</strong>{' '}
              <a
                href="https://developer.spotify.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                developer.spotify.com/dashboard
              </a>
            </li>
            <li>
              <strong>Ngrok Auth Token:</strong>{' '}
              <a
                href="https://dashboard.ngrok.com/get-started/your-authtoken"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                dashboard.ngrok.com
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
