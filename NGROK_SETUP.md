# Ngrok Integration Setup

Your app now has built-in ngrok support that makes Spotify OAuth setup much easier!

## What's New

- ✅ Ngrok starts automatically when you run the server
- ✅ Ngrok URL displayed in the app (Settings page)
- ✅ Copy buttons for easy pasting into Spotify Dashboard
- ✅ Step-by-step instructions shown in the UI
- ✅ No need to look at the terminal!

## One-Time Setup

### 1. Get Your Ngrok Authtoken

1. Go to https://dashboard.ngrok.com/signup (create free account)
2. Once logged in, go to https://dashboard.ngrok.com/get-started/your-authtoken
3. Copy your authtoken

### 2. Add Authtoken to .env

Open your `.env` file and add:

```env
NGROK_AUTHTOKEN=your_actual_authtoken_here
```

(Replace `your_actual_authtoken_here` with the token you copied)

### 3. That's it!

Ngrok will now start automatically every time you run the server.

## Using the App

### 1. Start Your Server

```bash
npm run dev
```

You'll see in the terminal:
```
Server running on http://localhost:3000
🚇 Starting ngrok tunnel...
✅ Ngrok tunnel established!
🌐 Public URL: https://abc123.ngrok-free.app
📋 Spotify Redirect URI: https://abc123.ngrok-free.app/api/spotify/callback
```

### 2. Open the Settings Page

1. Navigate to http://localhost:5173 in your browser
2. Click **"Settings"** in the navigation
3. You'll see your ngrok URL with copy buttons

### 3. Configure Spotify

1. Click the **Copy** button next to "Spotify Redirect URI"
2. Go to https://developer.spotify.com/dashboard
3. Open your Spotify app settings
4. Under "Redirect URIs", paste and click "Add"
5. Click "Save"

### 4. Use Spotify Features

Now you can use the Playlist Cleaner with your Spotify account!

## Important Notes

### URL Changes Every Session

On the free ngrok tier, your URL changes each time you restart the server. This means:

- ✅ **You do NOT need to** update your `.env` file
- ❌ **You DO need to** update the Spotify Dashboard each time

### Quick Workflow

1. Start server → ngrok starts automatically
2. Go to Settings page → copy new redirect URI
3. Update Spotify Dashboard → add new URI (you can have multiple)
4. Use Spotify features!

### Avoid Manual Updates

The old `SPOTIFY_REDIRECT_URI` in `.env` is no longer needed. The app now handles ngrok URLs dynamically.

## Troubleshooting

### "Tunnel Inactive" shown in Settings

**Solution**: Add your `NGROK_AUTHTOKEN` to the `.env` file and restart the server.

### Spotify OAuth fails with redirect URI mismatch

**Solution**:
1. Check the Settings page for your current redirect URI
2. Make sure it's added to Spotify Dashboard
3. Make sure there are no typos

### Ngrok says "authtoken required"

**Solution**: You need to add `NGROK_AUTHTOKEN` to your `.env` file.

## Want a Permanent URL?

If you're tired of updating Spotify Dashboard every session:

### Option 1: Paid Ngrok ($8/month)
- Reserved domain that never changes
- One-time Spotify setup
- Good for active development

### Option 2: Deploy to Railway (Free tier available)
- Permanent HTTPS URL
- See `RAILWAY_DEPLOYMENT.md` for instructions
- Good for sharing with others

## Questions?

- Ngrok Docs: https://ngrok.com/docs
- Ngrok Dashboard: https://dashboard.ngrok.com
