const SpotifyWebApi = require('spotify-web-api-node');
const settingsService = require('../settings-service');
const ngrokService = require('../ngrok-service');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

const scopes = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read'
];

function getAuthURL() {
  // Use ngrok URL if available, otherwise fall back to env
  const ngrokUrl = ngrokService.getNgrokUrl();
  if (ngrokUrl) {
    spotifyApi.setRedirectURI(`${ngrokUrl}/api/spotify/callback`);
  }

  const state = Math.random().toString(36).substring(7);
  return spotifyApi.createAuthorizeURL(scopes, state);
}

async function handleCallback(code) {
  try {
    // Ensure we're using the correct redirect URI for the callback
    const ngrokUrl = ngrokService.getNgrokUrl();
    if (ngrokUrl) {
      spotifyApi.setRedirectURI(`${ngrokUrl}/api/spotify/callback`);
    }

    const data = await spotifyApi.authorizationCodeGrant(code);

    const tokens = {
      access_token: data.body.access_token,
      refresh_token: data.body.refresh_token,
      expires_in: data.body.expires_in
    };

    settingsService.saveSpotifyTokens(tokens);

    spotifyApi.setAccessToken(tokens.access_token);
    spotifyApi.setRefreshToken(tokens.refresh_token);

    return {
      success: true,
      expiresAt: Date.now() + (tokens.expires_in * 1000)
    };
  } catch (error) {
    console.error('Error during Spotify callback:', error);
    throw new Error('Failed to authenticate with Spotify');
  }
}

async function refreshAccessToken() {
  try {
    const tokens = settingsService.getSpotifyTokens();

    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }

    spotifyApi.setRefreshToken(tokens.refreshToken);
    const data = await spotifyApi.refreshAccessToken();

    const newTokens = {
      access_token: data.body.access_token,
      refresh_token: tokens.refreshToken,
      expires_in: data.body.expires_in
    };

    settingsService.saveSpotifyTokens(newTokens);
    spotifyApi.setAccessToken(newTokens.access_token);

    return newTokens;
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    settingsService.clearSpotifyTokens();
    throw new Error('Failed to refresh Spotify token');
  }
}

function getSpotifyApi() {
  const tokens = settingsService.getSpotifyTokens();

  if (tokens.accessToken) {
    spotifyApi.setAccessToken(tokens.accessToken);
  }
  if (tokens.refreshToken) {
    spotifyApi.setRefreshToken(tokens.refreshToken);
  }

  return spotifyApi;
}

async function ensureValidToken() {
  const tokens = settingsService.getSpotifyTokens();

  if (!tokens.accessToken) {
    throw new Error('Not authenticated with Spotify');
  }

  if (Date.now() >= tokens.expiresAt - 60000) {
    await refreshAccessToken();
  }

  return getSpotifyApi();
}

module.exports = {
  getAuthURL,
  handleCallback,
  refreshAccessToken,
  getSpotifyApi,
  ensureValidToken
};
