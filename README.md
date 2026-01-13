# Band Outreach CRM

A localhost CRM application for managing band outreach via Instagram. Track bands, generate AI-powered outreach messages with Claude, and manage contacts through a Kanban-style workflow.

## Features

- **Add Band Form**: Quickly add bands with details like name, members, song, Instagram handle, and notes
- **AI-Powered Messages**: Automatically generate personalized outreach messages using Claude AI
- **Kanban Board**: Drag-and-drop interface with 5 workflow stages (Not Messaged, Messaged, Talking To, Closed, Won)
- **Daily Message Counter**: Safety feature to prevent Instagram shadowbans (tracks messages sent per day)
- **System Prompt Editor**: Customize how Claude generates your outreach messages
- **Search & Filter**: Find bands quickly by name, members, or song
- **Edit & Manage**: Full CRUD operations - edit band details, add follow-up notes, delete entries
- **Copy to Clipboard**: One-click copy of generated messages
- **Open in Instagram**: Direct links to band profiles
- **File-Based Storage**: All data stored in `crm-data.json` for easy backup and portability

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Vite
- **Styling**: Tailwind CSS
- **Drag & Drop**: @hello-pangea/dnd
- **AI**: Anthropic Claude API (Sonnet 4)
- **Data Storage**: JSON file (server-side)

## Setup Instructions

### 1. Prerequisites

- Node.js (v18 or higher)
- Anthropic API key ([get one here](https://console.anthropic.com/))

### 2. Installation

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
ANTHROPIC_API_KEY=your_api_key_here
PORT=3000

# Airtable Configuration
AIRTABLE_ACCESS_TOKEN=your_airtable_token_here
AIRTABLE_BASE_ID=your_base_id_here

# Spotify Configuration
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=https://your-ngrok-url.ngrok-free.app/api/spotify/callback
```

**Important**:
- Replace `your_api_key_here` with your actual Anthropic API key
- Configure Airtable credentials if using Airtable integration
- See "Spotify OAuth Setup" section below for Spotify configuration

### 4. Spotify OAuth Setup

Spotify requires HTTPS redirect URIs for OAuth callbacks.

**🚀 Quick Start with Ngrok**: See [QUICK_START.md](QUICK_START.md) for the fastest way to get started!

You have two options:

#### Option A: Deploy to Railway (Recommended for Production Use)

**Best for**: Sharing with others, permanent setup, avoiding ngrok hassles

Deploy your app to Railway for a permanent HTTPS URL. See **[RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)** for complete setup instructions.

**Benefits**:
- ✅ Permanent HTTPS URL (configure Spotify OAuth once, forget about it)
- ✅ Share with friends - they just visit your URL
- ✅ $5/month free credit (sufficient for personal use)
- ✅ No more changing redirect URIs

#### Option B: Local Development with Automatic Ngrok

**Best for**: Active development when you need to test Spotify features locally

**New!** Ngrok now starts automatically and displays the URL in the app's Settings page!

1. Get your ngrok authtoken from https://dashboard.ngrok.com/get-started/your-authtoken
2. Add `NGROK_AUTHTOKEN=your_token` to your `.env` file
3. Start the server: `npm run dev`
4. Go to **Settings** page in the app
5. Copy the Spotify Redirect URI and add it to Spotify Dashboard

See **[NGROK_SETUP.md](NGROK_SETUP.md)** for detailed instructions.

**Note**: The ngrok URL changes each session (free tier), but you only need to update the Spotify Dashboard (not `.env`).

### 5. Run the Application

```bash
# Run both backend and frontend concurrently
npm run dev
```

Or run them separately:

```bash
# Terminal 1 - Backend server
npm run server

# Terminal 2 - Frontend client
npm run client
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Usage

### 1. Set Up Your System Prompt

1. Navigate to "System Prompt" in the navigation
2. Customize the prompt to define your outreach style
3. Save your changes

### 2. Add Bands

1. Fill out the "Add New Band" form with:
   - Band name
   - Members (comma-separated)
   - Song you liked
   - Instagram handle
   - Your listening notes and observations
2. Click "Add Band"
3. The system will automatically generate an outreach message

### 3. Manage Your Workflow

- **Drag & Drop**: Move cards between columns as you progress through outreach
- **Expand Card**: Click on any card to see full details
- **Edit**: Update band information, add follow-up notes
- **Copy Message**: Click "Copy to Clipboard" to copy the generated message
- **Open Instagram**: Direct link to the band's profile
- **Regenerate**: Create a new message if you want a different version
- **Delete**: Remove bands you no longer want to track

### 4. Track Your Daily Limit

- Monitor the counter at the top of the dashboard
- Yellow warning at 15+ messages
- Red warning at 18+ messages
- Recommended limit: 20 messages/day to avoid Instagram restrictions

## Data Storage

All your data is stored in `crm-data.json` in the project root directory. This file contains:
- All band entries
- Your system prompt
- Daily message counter

**Backup**: Simply copy `crm-data.json` to backup your data.

## Project Structure

```
music-outreach/
├── client/                  # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   │   ├── AddBandForm.jsx
│   │   │   ├── BandCard.jsx
│   │   │   ├── DailyCounter.jsx
│   │   │   ├── KanbanBoard.jsx
│   │   │   └── SearchBar.jsx
│   │   ├── pages/          # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   └── SystemPrompt.jsx
│   │   └── App.jsx
│   └── package.json
├── server/
│   └── server.js           # Express API server
├── .env                     # Environment variables (API key)
├── crm-data.json           # Data storage (auto-generated)
└── package.json

```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/generate-message` | POST | Generate outreach message via Claude |
| `/api/bands` | GET | Fetch all bands |
| `/api/bands` | POST | Create new band entry |
| `/api/bands/:id` | PATCH | Update band details or status |
| `/api/bands/:id` | DELETE | Remove band |
| `/api/daily-count` | GET | Get message count for today |
| `/api/system-prompt` | GET | Fetch system prompt |
| `/api/system-prompt` | POST | Update system prompt |

## Safety Features

- **Daily Limit Tracking**: Prevents sending too many messages in one day
- **Visual Warnings**: Color-coded counter (green → yellow → red)
- **No Automated Sending**: You manually copy and send messages (prevents bans)
- **Data Preservation**: Forms don't clear until backend confirms save

## Tips

1. **System Prompt**: Spend time crafting a good system prompt - it affects all your messages
2. **Notes Quality**: More detailed notes = better AI-generated messages
3. **Daily Limit**: Stick to 15-20 messages/day to stay safe on Instagram
4. **Follow-ups**: Use the follow-up notes section to track conversation history
5. **Search**: Use search when you have 20+ bands to quickly find who you're looking for

## Troubleshooting

### Backend won't start
- Check that `.env` file exists with valid `ANTHROPIC_API_KEY`
- Ensure port 3000 is not already in use

### Frontend shows errors
- Make sure backend is running on port 3000
- Check browser console for specific error messages

### Messages not generating
- Verify your Anthropic API key is valid
- Check server logs for API errors
- Ensure you have API credits remaining

### Data not persisting
- Check that `crm-data.json` is being created in the root directory
- Verify write permissions in the project folder

## Future Enhancements

- Export to CSV functionality
- Multiple system prompt templates
- Response tracking and analytics
- Conversation timeline view
- Bulk operations
- Automated follow-up reminders

## License

ISC

## Support

For issues or questions, please open an issue on the GitHub repository.
