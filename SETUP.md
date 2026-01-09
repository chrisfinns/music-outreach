# Quick Setup Guide

## Before You Start

You need an **Anthropic API key** to use this application. Get one here: https://console.anthropic.com/

## Setup Steps

### 1. Configure Your API Key

Open the `.env` file in the root directory and replace `your_api_key_here` with your actual Anthropic API key:

```env
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
PORT=3000
```

### 2. Install Dependencies

```bash
# Install backend dependencies (from root directory)
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 3. Start the Application

```bash
# Run both backend and frontend together
npm run dev
```

The app will open at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

## First Time Usage

1. **Set Your System Prompt**
   - Click "System Prompt" in the navigation
   - The default prompt is already there, but you can customize it
   - Click "Save Prompt"

2. **Add Your First Band**
   - Go back to "Dashboard"
   - Fill out the "Add New Band" form
   - Click "Add Band"
   - Wait a few seconds for the AI to generate a message

3. **Start Managing Your Outreach**
   - Expand the card to see the generated message
   - Copy the message and send it on Instagram
   - Drag the card to "Messaged" column
   - Track responses and move through the workflow

## Important Notes

- **Daily Limit**: The app tracks how many messages you've sent. Stay under 20/day to avoid Instagram restrictions.
- **Data Storage**: All your data is in `crm-data.json` - back this up regularly!
- **API Costs**: Each message generation costs a few cents. Monitor your Anthropic usage.
- **No Auto-Send**: You must manually copy and send messages on Instagram (this keeps you safe from bans).

## Troubleshooting

**"Server running on http://localhost:3000" but frontend shows errors:**
- The backend is working, but frontend might not have started
- Try running `npm run client` in a separate terminal

**"Failed to generate message":**
- Check your API key in `.env`
- Verify you have credits in your Anthropic account
- Check server logs for specific error messages

**Can't drag cards:**
- Make sure both backend and frontend are running
- Try refreshing the page

**Data not saving:**
- Check file permissions in the project directory
- Look for `crm-data.json` - it should be created automatically

## Next Steps

1. Customize your system prompt to match your style
2. Add a few test bands
3. Experiment with different notes to see how it affects the AI output
4. Set up a backup routine for `crm-data.json`

Enjoy your Band Outreach CRM!
