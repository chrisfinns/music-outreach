# Railway Deployment Checklist

Use this checklist when deploying to Railway.

## Pre-Deployment

- [ ] All code changes committed to GitHub
- [ ] `.env` is in `.gitignore` (don't commit secrets!)
- [ ] You have all your API keys ready:
  - [ ] Anthropic API key
  - [ ] Airtable access token
  - [ ] Airtable base ID
  - [ ] Spotify client ID
  - [ ] Spotify client secret

## Railway Setup

- [ ] Created Railway account
- [ ] Connected GitHub to Railway
- [ ] Created new Railway project from your GitHub repo
- [ ] Generated a domain in Railway (Settings → Networking → Generate Domain)
- [ ] Noted your Railway URL: `https://______________.up.railway.app`

## Environment Variables

Add these in Railway dashboard (Variables tab):

- [ ] `ANTHROPIC_API_KEY`
- [ ] `AIRTABLE_ACCESS_TOKEN`
- [ ] `AIRTABLE_BASE_ID`
- [ ] `SPOTIFY_CLIENT_ID`
- [ ] `SPOTIFY_CLIENT_SECRET`
- [ ] `SPOTIFY_REDIRECT_URI` (use your Railway URL + `/api/spotify/callback`)
- [ ] `NODE_ENV=production`

## Spotify Configuration

- [ ] Logged into Spotify Developer Dashboard
- [ ] Opened your Spotify app settings
- [ ] Added redirect URI: `https://your-railway-url.up.railway.app/api/spotify/callback`
- [ ] Clicked "Save"

## Testing

- [ ] App deployed successfully (check Railway logs)
- [ ] Visited your Railway URL in browser
- [ ] App loads without errors
- [ ] Clicked "Connect to Spotify" in Playlist Cleaner
- [ ] Successfully authenticated with Spotify
- [ ] Can see your playlists

## Done!

Your app is now live at: `https://______________.up.railway.app`

Share this URL with anyone - they can use it directly!

## Remember

- Railway auto-deploys when you push to GitHub
- Monitor usage in Railway dashboard (Usage tab)
- Expected cost for personal use: $1-3/month (within $5 free credit)
- Local development still works with `npm run dev`
