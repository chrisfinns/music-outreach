# Railway Deployment Guide

This guide will help you deploy your Music Outreach CRM to Railway with a permanent HTTPS URL for Spotify OAuth.

## Why Railway?

- ✅ Permanent HTTPS URL (no more changing ngrok URLs)
- ✅ $5/month free credit (sufficient for personal use)
- ✅ Users just visit your URL - no setup needed on their end
- ✅ One-time Spotify OAuth configuration

## Prerequisites

1. GitHub account
2. Railway account (sign up at https://railway.app)
3. Credit card (for Railway - won't charge unless you exceed $5/month)
4. Your API keys ready (Anthropic, Airtable, Spotify)

## Step 1: Prepare Your Repository

1. **Commit your changes** (if not already committed):
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push
   ```

2. **Make sure `.env` is in `.gitignore`** (already done!)

## Step 2: Create Railway Project

1. Go to https://railway.app and sign in with GitHub
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `music-outreach` repository
5. Railway will automatically detect it's a Node.js app

## Step 3: Configure Environment Variables

In your Railway project dashboard:

1. Click on your service
2. Go to **"Variables"** tab
3. Add these environment variables:

```
ANTHROPIC_API_KEY=your_actual_api_key
AIRTABLE_ACCESS_TOKEN=your_actual_token
AIRTABLE_BASE_ID=your_actual_base_id
SPOTIFY_CLIENT_ID=your_actual_client_id
SPOTIFY_CLIENT_SECRET=your_actual_client_secret
NODE_ENV=production
```

**Don't add `SPOTIFY_REDIRECT_URI` yet** - we need your Railway URL first!

## Step 4: Get Your Railway URL

1. Wait for the initial deployment to complete (~3-5 minutes)
2. In your Railway dashboard, click **"Settings"** tab
3. Under **"Networking"**, click **"Generate Domain"**
4. You'll get a URL like: `https://your-app-name.up.railway.app`
5. **Copy this URL** - this is your permanent app URL!

## Step 5: Configure Spotify Redirect URI

1. **Update Railway environment variable**:
   - Go back to **"Variables"** tab in Railway
   - Add: `SPOTIFY_REDIRECT_URI=https://your-app-name.up.railway.app/api/spotify/callback`
   - Replace `your-app-name.up.railway.app` with your actual Railway domain

2. **Update Spotify Developer Dashboard**:
   - Go to https://developer.spotify.com/dashboard
   - Open your Spotify app
   - Click **"Settings"**
   - Under **"Redirect URIs"**, add:
     ```
     https://your-app-name.up.railway.app/api/spotify/callback
     ```
   - Click **"Add"**, then **"Save"**

3. **Redeploy** (Railway may auto-redeploy when you add the variable, or manually click "Deploy")

## Step 6: Test Your Deployment

1. Visit your Railway URL: `https://your-app-name.up.railway.app`
2. Navigate to the Playlist Cleaner page
3. Click **"Connect to Spotify"**
4. You should be redirected to Spotify OAuth - no more ngrok!
5. After authorizing, you should be redirected back to your app

## Step 7: Share Your App

Simply share your Railway URL with friends:
- `https://your-app-name.up.railway.app`

They can use it directly - no setup, no ngrok, no configuration!

## Monitoring Usage & Costs

1. In Railway dashboard, click **"Usage"**
2. Monitor your monthly spend
3. For light personal use (Spotify API requests), expect **$1-3/month**
4. You have **$5/month free credit**

## Updating Your App

Whenever you push changes to GitHub:

```bash
git add .
git commit -m "Your update message"
git push
```

Railway will **automatically redeploy** your app!

## Troubleshooting

### App shows 502/503 error
- Check Railway logs (click "Deployments" → latest deployment → "View Logs")
- Verify all environment variables are set correctly
- Make sure `NODE_ENV=production` is set

### Spotify OAuth fails
- Double-check `SPOTIFY_REDIRECT_URI` matches exactly in both:
  - Railway environment variables
  - Spotify Developer Dashboard
- Ensure no trailing slash in the URL

### App works locally but not on Railway
- Check that `NODE_ENV=production` is set in Railway
- Verify the build completed successfully in Railway logs
- Make sure `client/dist` folder is being generated during build

### Need to see backend logs
- Railway dashboard → Your service → "Deployments" → Click latest → "View Logs"

## Cost Optimization Tips

If you want to stay within the free $5/month:

1. **Don't keep the app open 24/7** - Railway bills by compute time
2. **Use it when needed** - open for Spotify cleaning, then close
3. **Monitor usage** - check Railway usage dashboard weekly
4. **Expected usage**: 1-2 hours/month of active use = ~$0.05-0.10

With 600 API requests/month of casual use, you'll likely use **less than $1/month**.

## Local Development

Continue developing locally with:

```bash
npm run dev
```

Local development still uses `http://localhost:5173` and `http://localhost:3000`.

The production environment (Railway) serves everything from the Railway URL.

## Need Help?

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check Railway logs for specific error messages
