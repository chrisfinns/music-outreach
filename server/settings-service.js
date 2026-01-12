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
          connected: false
        }
      };
      fs.writeFileSync(this.settingsPath, JSON.stringify(defaultSettings, null, 2));
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
}

module.exports = new SettingsService();
