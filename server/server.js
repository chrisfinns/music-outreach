const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const airtableService = require('./airtable-service');
const settingsService = require('./settings-service');
const spotifyAuth = require('./spotify/auth');
const spotifyApi = require('./spotify/api');
const spotifyAnalyzer = require('./spotify/analyzer');

const app = express();
app.use(express.json());
app.use(cors());

let anthropic;
try {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_api_key_here') {
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
} catch (error) {
  console.warn('Anthropic API not initialized. Add your API key to .env file.');
}

// Keep JSON file as backup/fallback for settings (system prompt, daily count)
const DB_FILE = path.join(__dirname, '..', 'crm-data.json');

// Helper to read/write settings data (not bands - those are in Airtable now)
const getSettings = () => {
  if (!fs.existsSync(DB_FILE)) {
    return {
      systemPrompt: "You are a friendly music enthusiast reaching out to bands on Instagram. Write a personalized, genuine message that shows you've actually listened to their music. Be concise (2-3 sentences), enthusiastic but not over-the-top, and mention specific details from the user's notes. End with a clear call-to-action or question about their music.",
      dailyCount: 0,
      lastReset: new Date().toDateString()
    };
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  return {
    systemPrompt: data.systemPrompt,
    dailyCount: data.dailyCount,
    lastReset: data.lastReset
  };
};

const saveSettings = (settings) => {
  let data = {};
  if (fs.existsSync(DB_FILE)) {
    data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  }
  data.systemPrompt = settings.systemPrompt;
  data.dailyCount = settings.dailyCount;
  data.lastReset = settings.lastReset;
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
};

// Endpoint to generate outreach message
app.post('/api/generate-message', async (req, res) => {
  try {
    const { bandName, members, song, notes, systemPrompt } = req.body;

    if (!anthropic) {
      return res.status(500).json({ error: 'Anthropic API not configured. Please add your API key to the .env file.' });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate an Instagram outreach message for this band:

Band Name: ${bandName}
Members: ${members}
Song I Liked: ${song}
My Notes: ${notes}

Please create a personalized, engaging outreach message.`
        }
      ],
    });

    const generatedMessage = message.content[0].text;
    res.json({ message: generatedMessage });

  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({ error: 'Failed to generate message' });
  }
});

// Create new band
app.post('/api/bands', async (req, res) => {
  try {
    const newBand = await airtableService.createBand({
      ...req.body,
      status: 'not_messaged',
      generatedMessage: '',
      followUpNotes: '',
      messageStatus: 'generating'
    });
    res.json(newBand);
  } catch (error) {
    console.error('Error creating band:', error);
    res.status(500).json({ error: 'Failed to create band' });
  }
});

// Update band (status change, edit info, add notes)
app.patch('/api/bands/:id', async (req, res) => {
  try {
    // Get the band before update to check status change
    const oldBand = await airtableService.getBandById(req.params.id);

    // Update the band
    const updatedBand = await airtableService.updateBand(req.params.id, req.body);

    // Increment daily counter if status changed to 'messaged'
    if (req.body.status === 'messaged' && oldBand.status !== 'messaged') {
      const settings = getSettings();
      const today = new Date().toDateString();
      if (settings.lastReset !== today) {
        settings.dailyCount = 0;
        settings.lastReset = today;
      }
      settings.dailyCount++;
      saveSettings(settings);
    }

    res.json(updatedBand);
  } catch (error) {
    console.error('Error updating band:', error);
    res.status(500).json({ error: 'Failed to update band' });
  }
});

// Delete band
app.delete('/api/bands/:id', async (req, res) => {
  try {
    await airtableService.deleteBand(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting band:', error);
    res.status(500).json({ error: 'Failed to delete band' });
  }
});

// Get all bands
app.get('/api/bands', async (req, res) => {
  try {
    const bands = await airtableService.getAllBands();
    res.json(bands);
  } catch (error) {
    console.error('Error fetching bands:', error);
    res.status(500).json({ error: 'Failed to fetch bands' });
  }
});

// Get daily count
app.get('/api/daily-count', (req, res) => {
  const settings = getSettings();
  const today = new Date().toDateString();
  if (settings.lastReset !== today) {
    settings.dailyCount = 0;
    settings.lastReset = today;
    saveSettings(settings);
  }
  res.json({ count: settings.dailyCount, limit: 20 });
});

// Update system prompt
app.post('/api/system-prompt', (req, res) => {
  const settings = getSettings();
  settings.systemPrompt = req.body.prompt;
  saveSettings(settings);
  res.json({ success: true });
});

// Get system prompt
app.get('/api/system-prompt', (req, res) => {
  const settings = getSettings();
  res.json({ prompt: settings.systemPrompt });
});

// ===== SPOTIFY ENDPOINTS =====

// Initiate Spotify OAuth flow
app.get('/api/spotify/auth', (req, res) => {
  try {
    const authURL = spotifyAuth.getAuthURL();
    res.json({ authURL });
  } catch (error) {
    console.error('Error generating Spotify auth URL:', error);
    res.status(500).json({ error: 'Failed to generate auth URL' });
  }
});

// Handle Spotify OAuth callback
app.get('/api/spotify/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.status(400).send('Authorization code missing');
    }

    const result = await spotifyAuth.handleCallback(code);

    res.send(`
      <html>
        <body>
          <h2>Spotify Connected Successfully!</h2>
          <p>You can close this window and return to the app.</p>
          <script>
            setTimeout(() => window.close(), 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error during Spotify callback:', error);
    res.status(500).send('Failed to authenticate with Spotify');
  }
});

// Get Spotify connection status
app.get('/api/spotify/status', (req, res) => {
  try {
    const connected = settingsService.isSpotifyConnected();
    const tokens = settingsService.getSpotifyTokens();
    res.json({
      connected,
      expiresAt: tokens.expiresAt
    });
  } catch (error) {
    console.error('Error checking Spotify status:', error);
    res.status(500).json({ error: 'Failed to check Spotify status' });
  }
});

// Disconnect Spotify
app.post('/api/spotify/disconnect', (req, res) => {
  try {
    settingsService.clearSpotifyTokens();
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Spotify:', error);
    res.status(500).json({ error: 'Failed to disconnect Spotify' });
  }
});

// Get user's playlists
app.get('/api/spotify/playlists', async (req, res) => {
  try {
    const playlists = await spotifyApi.getUserPlaylists();
    res.json(playlists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});

// Get artist details
app.get('/api/spotify/artist/:id', async (req, res) => {
  try {
    const artist = await spotifyApi.getArtist(req.params.id);
    const topTrack = await spotifyApi.getArtistTopTracks(req.params.id);
    res.json({ ...artist, topTrack });
  } catch (error) {
    console.error('Error fetching artist:', error);
    res.status(500).json({ error: 'Failed to fetch artist details' });
  }
});

// Analyze playlist
app.post('/api/spotify/analyze', async (req, res) => {
  try {
    const { playlistId, filters } = req.body;

    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }

    const results = await spotifyAnalyzer.analyzePlaylist(
      playlistId,
      filters || spotifyAnalyzer.DEFAULT_FILTERS
    );

    res.json(results);
  } catch (error) {
    console.error('Error analyzing playlist:', error);
    res.status(500).json({ error: 'Failed to analyze playlist' });
  }
});

// Clean playlist
app.post('/api/spotify/clean', async (req, res) => {
  try {
    const { playlistId, artistsToRemove } = req.body;

    if (!playlistId || !artistsToRemove) {
      return res.status(400).json({ error: 'Playlist ID and artists to remove are required' });
    }

    const result = await spotifyAnalyzer.cleanPlaylist(playlistId, artistsToRemove);
    res.json(result);
  } catch (error) {
    console.error('Error cleaning playlist:', error);
    res.status(500).json({ error: 'Failed to clean playlist' });
  }
});

// Quick add artist to CRM from playlist
app.post('/api/spotify/quick-add', async (req, res) => {
  try {
    const { artistId, playlistName } = req.body;

    const artist = await spotifyApi.getArtist(artistId);
    const topTrack = await spotifyApi.getArtistTopTracks(artistId);

    const bandData = {
      bandName: artist.name,
      song: topTrack ? topTrack.name : '',
      instagram: '',
      members: '',
      notes: `Found via Playlist Cleaner: ${playlistName}`,
      status: 'not_messaged',
      generatedMessage: '',
      followUpNotes: '',
      messageStatus: 'pending'
    };

    res.json({
      artist,
      topTrack,
      prefillData: bandData
    });
  } catch (error) {
    console.error('Error preparing quick add:', error);
    res.status(500).json({ error: 'Failed to prepare quick add data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
