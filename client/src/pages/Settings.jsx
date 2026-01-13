import { useState, useEffect } from 'react';
import API_URL from '../config';

export default function Settings() {
  const [ngrokStatus, setNgrokStatus] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkNgrokStatus();
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

      {/* API Keys Section (Future) */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          API Configuration
        </h2>
        <p className="text-sm text-gray-600">
          API keys are currently managed via the <code className="bg-gray-100 px-1 py-0.5 rounded">.env</code> file.
          A web-based API key manager is coming soon.
        </p>
      </div>
    </div>
  );
}
