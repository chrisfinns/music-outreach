import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import SystemPrompt from './pages/SystemPrompt';
import PlaylistCleaner from './pages/PlaylistCleaner';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-gray-700"
                >
                  Dashboard
                </Link>
                <Link
                  to="/playlist-cleaner"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  Playlist Cleaner
                </Link>
                <Link
                  to="/system-prompt"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700"
                >
                  System Prompt
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/playlist-cleaner" element={<PlaylistCleaner />} />
            <Route path="/system-prompt" element={<SystemPrompt />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
