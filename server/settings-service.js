const fs = require('fs');
const path = require('path');

class SettingsService {
  constructor() {
    this.settingsPath = path.join(__dirname, '..', 'settings.json');
    this.initializeSettings();
  }

  initializeSettings() {
    if (!fs.existsSync(this.settingsPath)) {
      const defaultSettings = {
        spotify: {
          accessToken: null,
          refreshToken: null,
          expiresAt: null,
          connected: false,
          sessionCookie: null
        },
        apiKeys: {
          anthropic: null,
          airtable: null,
          spotifyClientId: null,
          spotifyClientSecret: null,
          ngrok: null
        }
      };
      fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
    }

    // Sync API keys from .env if they exist and aren't already in settings
    this.syncApiKeysFromEnv();
  }

  syncApiKeysFromEnv() {
    const settings = this.getSettings();

    // Initialize apiKeys if it doesn't exist
    if (!settings.apiKeys) {
      settings.apiKeys = {
        anthropic: null,
        airtable: null,
        spotifyClientId: null,
        spotifyClientSecret: null,
        ngrok: null
      };
    }

    let updated = false;

    // Sync from .env if key is not already set in settings
    if (!settings.apiKeys.anthropic && process.env.ANTHROPIC_API_KEY) {
      settings.apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
      updated = true;
    }

    if (!settings.apiKeys.airtable && process.env.AIRTABLE_ACCESS_TOKEN) {
      settings.apiKeys.airtable = process.env.AIRTABLE_ACCESS_TOKEN;
      updated = true;
    }

    if (!settings.apiKeys.spotifyClientId && process.env.SPOTIFY_CLIENT_ID) {
      settings.apiKeys.spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
      updated = true;
    }

    if (!settings.apiKeys.spotifyClientSecret && process.env.SPOTIFY_CLIENT_SECRET) {
      settings.apiKeys.spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
      updated = true;
    }

    if (!settings.apiKeys.ngrok && process.env.NGROK_AUTHTOKEN) {
      settings.apiKeys.ngrok = process.env.NGROK_AUTHTOKEN;
      updated = true;
    }

    if (updated) {
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
    }
  }

  getSettings() {
    const data = fs.readFileSync(this.settingsPath, 'utf8');
    return JSON.parse(data);
  }

  updateSettings(updates) {
    const settings = this.getSettings();
    const updatedSettings = {
      ...settings,
      ...updates
    };
    fs.writeFileSync(this.settingsPath, JSON.stringify(updatedSettings, null, 2));
    return updatedSettings;
  }

  getSpotifyTokens() {
    const settings = this.getSettings();
    return settings.spotify;
  }

  saveSpotifyTokens(tokens) {
    const settings = this.getSettings();
    settings.spotify = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in * 1000),
      connected: true
    };
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
    return settings.spotify;
  }

  clearSpotifyTokens() {
    const settings = this.getSettings();
    settings.spotify = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      connected: false
    };
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
  }

  isSpotifyConnected() {
    const tokens = this.getSpotifyTokens();
    if (!tokens.accessToken || !tokens.expiresAt) {
      return false;
    }
    return Date.now() < tokens.expiresAt;
  }

  getApiKeys() {
    const settings = this.getSettings();
    return settings.apiKeys || {
      anthropic: null,
      airtable: null,
      spotifyClientId: null,
      spotifyClientSecret: null,
      ngrok: null
    };
  }

  updateApiKey(keyName, value) {
    const settings = this.getSettings();
    if (!settings.apiKeys) {
      settings.apiKeys = {
        anthropic: null,
        airtable: null,
        spotifyClientId: null,
        spotifyClientSecret: null,
        ngrok: null
      };
    }
    settings.apiKeys[keyName] = value;
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
    return settings.apiKeys;
  }

  deleteApiKey(keyName) {
    const settings = this.getSettings();
    if (settings.apiKeys && settings.apiKeys[keyName] !== undefined) {
      settings.apiKeys[keyName] = null;
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
    }
    return settings.apiKeys;
  }

  getSpotifySessionCookie() {
    const settings = this.getSettings();
    if (!settings.spotify) {
      return null;
    }
    return settings.spotify.sessionCookie;
  }

  saveSpotifySessionCookie(cookie) {
    const settings = this.getSettings();
    if (!settings.spotify) {
      settings.spotify = {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        connected: false,
        sessionCookie: null
      };
    }
    settings.spotify.sessionCookie = cookie;
    fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
    return cookie;
  }

  clearSpotifySessionCookie() {
    const settings = this.getSettings();
    if (settings.spotify) {
      settings.spotify.sessionCookie = null;
      fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2));
    }
  }
}

module.exports = new SettingsService();
