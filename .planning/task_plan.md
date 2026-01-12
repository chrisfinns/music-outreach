# Spotify Playlist Cleaner - Implementation Plan

## Overview
Build a new "Playlist Cleaner" tab in the music outreach CRM that connects to Spotify, analyzes playlists against quality/activity filters, and provides a streamlined workflow to add qualifying artists to the Airtable CRM.

## Goals
1. Enable Spotify OAuth authentication with token persistence
2. Fetch and analyze user's Spotify playlists against configurable filters
3. Scrape Instagram presence data without rate limiting issues
4. Provide safe, confirmed playlist cleaning with preview
5. Enable quick-add workflow to CRM with pre-filled artist data
6. Track check status to avoid re-analyzing same artists
7. Hide already-contacted artists from the playlist view

## User Flow
1. Navigate to new "Playlist Cleaner" tab
2. Configure Spotify API credentials in settings (one-time)
3. Authenticate with Spotify (OAuth, one-time)
4. Select playlist from dropdown
5. View/adjust filter settings (simple number inputs)
6. Click "Analyze Playlist"
7. Review results with confirmation screen showing:
   - Artists to be removed (with reasons)
   - Artists that passed (kept)
   - Artists unchecked (Instagram unreachable)
8. Confirm and execute playlist cleaning
9. Browse kept artists, click to:
   - Play Spotify preview
   - View artist details + Instagram link
   - Quick Add to CRM with pre-filled form
10. System remembers checked artists and hides already-contacted ones

## Strategy

### Phase 1: Backend Infrastructure
- Add Spotify OAuth flow (auth + callback endpoints)
- Create Spotify service wrapper using `spotify-web-api-node`
- Implement Instagram scraper with rate limit protection
- Build artist analysis engine with filter logic
- Add settings endpoint for Spotify credentials storage

### Phase 2: Data Management
- Create artist check tracking system (localStorage or new JSON structure)
- Integrate with existing Airtable service to check for contacted artists
- Store Spotify tokens in new settings storage mechanism

### Phase 3: Frontend UI
- Create PlaylistCleaner page with existing design language
- Build settings panel for Spotify credentials (hidden/protected)
- Implement playlist selection dropdown
- Create filter configuration UI (simple inputs)
- Build results view with confirmation screen
- Create artist card component with Spotify player embed
- Build Quick Add modal with pre-filled form

### Phase 4: Safety & Polish
- Add rate limiting protection for Instagram scraping
- Implement confirmation flow before destructive actions
- Add loading states and progress indicators
- Handle error cases gracefully
- Add artist check status tracking to prevent re-analysis

## Technical Architecture

### New Dependencies
```json
{
  "spotify-web-api-node": "^5.0.2",
  "cheerio": "^1.0.0"
}
```

### New Backend Files
```
server/
├── spotify/
│   ├── auth.js          # OAuth flow handlers
│   ├── api.js           # Spotify API wrapper service
│   └── analyzer.js      # Artist analysis engine with filters
├── scrapers/
│   ├── spotify.js       # Scrape Spotify pages for Instagram
│   └── instagram.js     # Scrape Instagram for presence check
└── settings-service.js  # Settings storage (Spotify creds + tokens)
```

### New Frontend Files
```
client/src/
├── pages/
│   ├── PlaylistCleaner.jsx   # Main playlist cleaner page
│   └── Settings.jsx           # Settings page for API credentials
├── components/
│   ├── SpotifyAuth.jsx        # OAuth connection component
│   ├── PlaylistSelector.jsx  # Dropdown for playlist selection
│   ├── FilterConfig.jsx       # Simple filter inputs
│   ├── AnalysisResults.jsx   # Results with confirmation screen
│   ├── ArtistCard.jsx         # Artist card with Spotify player
│   └── QuickAddModal.jsx      # Modal for adding to CRM
└── utils/
    └── artistCheckCache.js    # Track analyzed artists
```

### New API Endpoints
```
GET  /api/spotify/auth              # Initiate OAuth flow
GET  /api/spotify/callback          # Handle OAuth callback
GET  /api/spotify/playlists         # Fetch user's playlists
POST /api/spotify/analyze           # Analyze playlist against filters
POST /api/spotify/clean             # Remove tracks from playlist
GET  /api/spotify/artist/:id        # Get full artist details
POST /api/spotify/quick-add         # Add artist to CRM via Airtable

GET  /api/settings                  # Get all settings
POST /api/settings                  # Update settings (Spotify creds)
```

### Environment Variables
```bash
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/spotify/callback
```

## Filter Logic (Artist-Level Evaluation)

### Default Filter Values
- Popularity Min: `2`
- Popularity Max: `40`
- Max Years Since Release: `2`
- Require Instagram Presence: `ON`
- Max Weeks Since IG Post: `DISABLED` (v1 - presence only)

### Artist Evaluation Flow
```
For each artist in playlist:
  1. Check if already analyzed (skip if yes, unless forced refresh)
  2. Check if already in CRM with status messaged/talking/won (hide if yes)
  3. Fetch Spotify data (popularity, latest release)
  4. Apply popularity filter (min/max range)
  5. Apply latest release filter (within X years)
  6. Scrape Spotify artist page for Instagram handle
  7. If Instagram required and not found → REMOVE
  8. If Instagram found → Mark as KEPT
  9. If Instagram scraping failed → Mark as UNCHECKED (rate limit)
  10. Store check result in cache
```

### Artist Status States
- `kept` - Passed all filters
- `removed` - Failed one or more filters
- `unchecked` - Instagram data unreachable (rate limit/error)

### Removal Reasons
- `popularity_too_low` - Below minimum popularity threshold
- `popularity_too_high` - Above maximum popularity threshold
- `no_recent_release` - No release within X years
- `no_instagram` - Instagram handle not found on Spotify page
- `instagram_unreachable` - Could not verify Instagram (technical error)

## Safety Features

### Rate Limit Protection
```javascript
// Instagram scraping delays
const INSTAGRAM_DELAY_MS = 700 + Math.random() * 600; // 700-1300ms
const MAX_INSTAGRAM_CHECKS_PER_RUN = 50;

// Automatic backoff on 429/403
if (response.status === 429 || response.status === 403) {
  // Mark all remaining artists as "unchecked"
  // Don't retry in same run
}
```

### Confirmation Screen
Before removing any tracks, show:
- Playlist name and total tracks
- List of artists to be removed (with reasons)
- Number of tracks to be removed
- List of artists kept (with quick-add buttons)
- List of unchecked artists (for manual review)
- Require explicit "Confirm & Clean Playlist" button click

### Artist Check Caching
```javascript
// Store in localStorage or settings
{
  "artistChecks": {
    "spotify_artist_id": {
      "status": "kept|removed|unchecked",
      "lastChecked": "2026-01-12T10:30:00Z",
      "reason": "popularity_too_high",
      "instagram": "@handle",
      "addedToCRM": false
    }
  }
}
```

## Quick Add Integration

### Pre-filled Form Data
When user clicks artist card to quick-add:
```javascript
{
  bandName: "Artist Name",           // From Spotify
  song: "Top Track Name",            // From Spotify top tracks
  instagram: "@handle",              // From scraped data
  members: "",                       // Empty - user adds via Spotify link
  notes: "Found via Playlist Cleaner: [Playlist Name]", // Auto-generated
  generatedMessage: null,            // Will generate after submit
  status: "not_messaged"             // Default status
}
```

### Modal Features
- Embedded Spotify artist player (iframe)
- Link to Spotify artist page (to check member names)
- Pre-filled form fields (editable)
- "Add to CRM" button → Creates in Airtable + generates message
- On success: Mark artist as `addedToCRM: true` in cache

## UI/UX Specifications

### Match Existing Design Language
- Tailwind CSS utility classes
- Card-based layout (like BandCard.jsx)
- Modal pattern (like BandCard modal)
- Status color coding:
  - Kept: Green
  - Removed: Red
  - Unchecked: Yellow/Orange
- Loading states with spinners
- Optimistic UI updates

### Playlist Cleaner Page Layout
```
┌─────────────────────────────────────────┐
│ Playlist Cleaner                         │
│                                          │
│ [Spotify Auth Button] (if not connected)│
│                                          │
│ Select Playlist: [Dropdown ▼]           │
│                                          │
│ Filter Settings                          │
│ ┌──────────────────────────────────────┐│
│ │ Popularity Min: [2    ]              ││
│ │ Popularity Max: [40   ]              ││
│ │ Max Years Since Release: [2    ]     ││
│ │ Require Instagram: [✓] ON            ││
│ └──────────────────────────────────────┘│
│                                          │
│ [Analyze Playlist] button                │
│                                          │
│ Results (after analysis):                │
│ ┌──────────────────────────────────────┐│
│ │ Kept Artists (23)                    ││
│ │ [Artist Card] [Artist Card] ...      ││
│ │                                      ││
│ │ To Be Removed (41)                   ││
│ │ [Collapsed list with reasons]        ││
│ │                                      ││
│ │ Unchecked (5)                        ││
│ │ [Artists needing manual review]      ││
│ └──────────────────────────────────────┘│
│                                          │
│ [Confirm & Clean Playlist] button        │
└─────────────────────────────────────────┘
```

### Artist Card (Kept Artists)
```
┌───────────────────────────────┐
│ 🎵 Artist Name                │
│ @instagram_handle              │
│ Popularity: 35 | Last: 2025   │
│                               │
│ [▶ Play Preview] [Quick Add]  │
└───────────────────────────────┘
```

### Settings Page (New)
```
┌─────────────────────────────────────────┐
│ Settings                                 │
│                                          │
│ Spotify API Configuration                │
│ ┌──────────────────────────────────────┐│
│ │ Client ID:     [••••••••••••]        ││
│ │ Client Secret: [••••••••••••]        ││
│ │                                      ││
│ │ [Save Settings]                      ││
│ └──────────────────────────────────────┘│
│                                          │
│ Connection Status:                       │
│ ✓ Spotify Connected (Expires: 1/12/26)  │
│ [Reconnect]                              │
└─────────────────────────────────────────┘
```

## Steps (Implementation Order)

### Step 1: Backend Foundation
1. Install dependencies (`spotify-web-api-node`, `cheerio`)
2. Create settings service for storing Spotify creds + tokens
3. Set up Spotify OAuth flow (auth.js)
4. Create Spotify API wrapper service (api.js)
5. Add settings API endpoints
6. Test OAuth flow with Postman

### Step 2: Scraping & Analysis
7. Implement Spotify artist page scraper (scrapers/spotify.js)
8. Add rate-limited Instagram presence checker (scrapers/instagram.js)
9. Build artist analysis engine with filter logic (analyzer.js)
10. Test scraping with sample artists

### Step 3: Playlist Analysis Backend
11. Add `/api/spotify/playlists` endpoint
12. Add `/api/spotify/analyze` endpoint with full analysis flow
13. Add `/api/spotify/clean` endpoint for removing tracks
14. Add `/api/spotify/artist/:id` endpoint for detailed artist data
15. Test full analysis flow with test playlist

### Step 4: Frontend Settings
16. Create Settings page component
17. Add settings route to App.jsx
18. Build Spotify credentials input form
19. Add connection status display
20. Test settings save/load

### Step 5: Frontend Playlist Cleaner
21. Create PlaylistCleaner page component
22. Add playlist cleaner route to App.jsx with nav link
23. Build SpotifyAuth connection component
24. Build PlaylistSelector dropdown component
25. Build FilterConfig component with simple inputs
26. Add analyze button with loading state

### Step 6: Results & Confirmation
27. Build AnalysisResults component with three sections (kept/removed/unchecked)
28. Create ArtistCard component with Spotify preview embed
29. Add confirmation screen before cleaning
30. Implement playlist cleaning action
31. Add success/error handling

### Step 7: Quick Add Integration
32. Build QuickAddModal component
33. Fetch pre-fill data from Spotify API
34. Connect to existing Airtable service
35. Add "Add to CRM" submission flow
36. Update artist check cache on successful add
37. Test full flow from analysis → quick add → CRM

### Step 8: Check Caching & Filtering
38. Implement artist check cache in localStorage
39. Add logic to skip already-checked artists
40. Query Airtable to filter out already-contacted artists
41. Add "Refresh" option to re-check artists
42. Test caching behavior across sessions

### Step 9: Polish & Error Handling
43. Add loading states to all async operations
44. Implement error boundaries for graceful failures
45. Add user feedback messages (toasts/alerts)
46. Handle edge cases (empty playlists, all filtered, etc.)
47. Add rate limit warnings and recovery
48. Style components to match existing design

### Step 10: Testing & Documentation
49. Test full workflow end-to-end
50. Test with various playlist sizes
51. Test rate limiting behavior
52. Test error scenarios
53. Update README with setup instructions
54. Document environment variables needed

## Risk Mitigation

### Instagram Scraping Fragility
- Risk: Instagram blocks requests or changes page structure
- Mitigation:
  - Implement conservative rate limiting (700-1300ms delays)
  - Max 50 checks per run
  - Mark as "unchecked" rather than failing
  - Allow manual review of unchecked artists
  - Don't block entire analysis on scraping failures

### Spotify API Rate Limits
- Risk: Hit Spotify API rate limits with large playlists
- Mitigation:
  - Batch requests where possible
  - Cache artist data in check cache
  - Show progress indicators
  - Implement retry with exponential backoff

### Token Expiration
- Risk: Spotify access tokens expire during analysis
- Mitigation:
  - Implement automatic token refresh
  - Store refresh token securely
  - Handle 401 errors gracefully

### Accidental Playlist Destruction
- Risk: User accidentally removes wrong tracks
- Mitigation:
  - Required confirmation screen with full preview
  - No silent destructive actions
  - Clear labeling of what will be removed
  - Consider adding "Undo" feature in v2

### Performance with Large Playlists
- Risk: 500+ track playlists take too long to analyze
- Mitigation:
  - Show progress bar during analysis
  - Process in batches
  - Consider adding playlist size warning
  - Skip already-checked artists by default

## Success Criteria

### Functional Requirements
- [x] User can authenticate with Spotify via OAuth
- [x] User can select playlist from their library
- [x] System analyzes artists against configurable filters
- [x] System safely removes filtered artists after confirmation
- [x] User can quick-add qualified artists to CRM
- [x] System tracks analyzed artists to avoid duplicates
- [x] System hides already-contacted artists from view

### Non-Functional Requirements
- [x] Analysis completes in < 2 minutes for 100-track playlist
- [x] Instagram scraping doesn't trigger rate limits
- [x] UI matches existing design language
- [x] All destructive actions require confirmation
- [x] Errors handled gracefully without crashes
- [x] Settings persist across sessions

### User Experience
- [x] Clear feedback at every step
- [x] Loading states during async operations
- [x] Easy to understand why artists were removed
- [x] Quick workflow from analysis to CRM addition
- [x] No need to re-analyze same artists

## Out of Scope (v1)

- Instagram activity checking (last post date)
- Instagram login/authentication
- Headless browser scraping (Puppeteer/Playwright)
- Scheduled/automated playlist cleaning
- Undo/rollback of playlist changes
- Bulk operations across multiple playlists
- Export analysis results to CSV
- Integration with other streaming platforms
- Advanced filtering (genre, followers, etc.)
- Artist deduplication across playlists

## Future Enhancements (v2+)

- Instagram activity filtering (last post within X weeks)
- Scheduled daily/weekly playlist maintenance
- Playlist snapshot/version history with rollback
- Advanced filters (genre, follower count, region)
- Bulk playlist operations
- Analytics dashboard (filtered artists over time)
- Email notifications for new qualifying artists
- Integration with Apple Music, SoundCloud
- AI-powered artist recommendations
- Collaborative filtering (team settings)
