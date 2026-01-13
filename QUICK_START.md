# Quick Start Guide

## Get Your Ngrok Authtoken

1. **If you already have ngrok installed locally**, run:
   ```bash
   cat ~/.ngrok2/ngrok.yml
   ```
   Look for the `authtoken` line and copy the token.

2. **If you need to get your authtoken**:
   - Go to https://dashboard.ngrok.com/login
   - Login or sign up for free
   - Go to https://dashboard.ngrok.com/get-started/your-authtoken
   - Copy your authtoken

## Add Authtoken to .env

Edit your `.env` file and replace this line:
```
NGROK_AUTHTOKEN=your_ngrok_authtoken_here
```

With your actual token:
```
NGROK_AUTHTOKEN=2kX...your_actual_token...abc123
```

## Start the Server

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:3000
🚇 Starting ngrok tunnel...
✅ Ngrok tunnel established!
🌐 Public URL: https://something-random.ngrok-free.app
```

## Open the App

1. Open your browser to http://localhost:5173
2. Click **"Settings"** in the navigation bar
3. You'll see your ngrok URL with copy buttons!

## Configure Spotify

1. In the Settings page, click **Copy** next to "Spotify Redirect URI"
2. Go to https://developer.spotify.com/dashboard
3. Click on your Spotify app
4. Click **"Settings"**
5. Under "Redirect URIs", paste the URI and click **"Add"**
6. Click **"Save"** at the bottom

## You're Done!

Now you can use the Playlist Cleaner to:
- Connect your Spotify account
- View your playlists
- Analyze and clean them
- Quick-add artists to your CRM

## Next Time You Start

The ngrok URL will be different, so you need to:
1. Start the server
2. Go to Settings page
3. Copy the new redirect URI
4. Update Spotify Dashboard

**That's it!** No need to touch the `.env` file again.
