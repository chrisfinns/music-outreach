# Findings - Spotify Playlist Cleaner

## Codebase Analysis Results

### Current Architecture (Analyzed 2026-01-12)

#### Technology Stack
- **Backend**: Node.js with Express 5.2.1
- **Frontend**: React 19.2.0 + Vite 7.2.4
- **Styling**: Tailwind CSS 3.4.19
- **Database**: Airtable (cloud) + local JSON fallback
- **AI**: Anthropic Claude API (Sonnet 4)
- **Drag-Drop**: @hello-pangea/dnd 18.0.1

#### Existing Data Flow Patterns
1. Client makes fetch request to Express API
2. Server interacts with Airtable via service layer
3. Server returns JSON response
4. Client updates UI optimistically, then confirms with server
5. Settings stored in `crm-data.json` (system prompt, daily counter)
6. Band data stored in Airtable Outreach table

#### Authentication Patterns
- API keys via environment variables (.env file)
- No user authentication (single-user localhost app)
- Airtable uses personal access token
- Anthropic uses API key
- **Insight**: Spotify OAuth will be first OAuth flow in app

#### Current File Structure
```
music-outreach/
├── server/
│   ├── server.js (190 lines)
│   ├── airtable-service.js (208 lines)
│   └── [migration/test scripts]
├── client/src/
│   ├── App.jsx (routing + nav)
│   ├── pages/
│   │   ├── Dashboard.jsx (main CRM)
│   │   └── SystemPrompt.jsx (AI config)
│   └── components/
│       ├── AddBandForm.jsx
│       ├── BandCard.jsx
│       ├── KanbanBoard.jsx
│       ├── DailyCounter.jsx
│       └── SearchBar.jsx
└── crm-data.json
```

### Airtable Schema Discovery

#### Outreach Table Fields
- Artist Name (single line text)
- Song (single line text)
- Assignee/Instagram (single line text, with @ prefix)
- Original Notes (long text)
- Status (single select): Not Messed Yet, Messaged, Talking To, Won, Abandoned
- Generated Message (long text)
- Members (single line text)
- Follow-up Notes (long text)
- Date Added (date)
- Last Updated (date)

#### Status Mapping (App → Airtable)
```javascript
not_messaged → "Not Messed Yet"
messaged → "Messaged"
talking → "Talking To"
won → "Won"
closed → "Abandoned"
```

**Insight**: When adding artists from Playlist Cleaner, default to `not_messaged` status.

### Existing UI Component Patterns

#### Modal Pattern (from BandCard.jsx)
- Click card → Full-screen modal overlay
- Semi-transparent dark background
- White card with padding
- Edit/view toggle
- Close button top-right
- Action buttons at bottom

#### Form Pattern (from AddBandForm.jsx)
- Controlled inputs with useState
- Validation on submit (required fields)
- Auto-clear only after successful API response
- Instagram handle auto-formatting (prepend @)
- Error feedback via console + UI state

#### Card Layout (from BandCard.jsx)
- Rounded borders (`rounded-lg`)
- Shadow (`shadow-md`)
- Padding (`p-4`)
- Status-based color coding
- Hover effects for interactivity
- Collapsible sections

#### Color Scheme
- Status colors:
  - Red: not_messaged, closed
  - Yellow: messaged, talking
  - Green: won
- Background: Light gray (#f9fafb)
- Text: Gray-900 (dark)
- Borders: Gray-300
- Accent: Blue for links/buttons

### External API Research

#### Spotify Web API Capabilities

**Authentication**:
- OAuth 2.0 Authorization Code Flow (recommended)
- Scopes needed:
  - `playlist-read-private` - Access user's private playlists
  - `playlist-modify-public` - Modify public playlists
  - `playlist-modify-private` - Modify private playlists
  - `user-library-read` - Access saved tracks/albums

**Relevant Endpoints**:
```
GET /v1/me/playlists                 # User's playlists
GET /v1/playlists/{id}               # Playlist details
GET /v1/playlists/{id}/tracks        # Playlist tracks (paginated)
GET /v1/artists/{id}                 # Artist details (popularity)
GET /v1/artists/{id}/albums          # Artist albums/singles
DELETE /v1/playlists/{id}/tracks     # Remove tracks
```

**Artist Object Fields**:
- `id` - Spotify artist ID
- `name` - Artist name
- `popularity` - 0-100 scale
- `external_urls.spotify` - Artist page URL
- `images` - Array of artist images

**Pagination**:
- Default limit: 20 items
- Max limit: 50 items
- Use `offset` for pagination
- **Insight**: Need to handle paginated responses for large playlists

**Rate Limits**:
- Not publicly documented
- Generally permissive for user-scoped operations
- Implement exponential backoff on 429 responses

#### spotify-web-api-node Library
- npm package: `spotify-web-api-node` (v5.0.2)
- Handles OAuth flow
- Auto token refresh
- Convenient wrapper methods
- **Decision**: Use this library to avoid implementing OAuth from scratch

### Instagram Scraping Challenges

#### What We Can't Get from Spotify API
- Instagram handles
- Social media links
- Bio/description text
- External links of any kind

#### What We Can Scrape
Spotify artist page (e.g., `https://open.spotify.com/artist/{id}`):
- Instagram link in "Find [Artist] on" section
- Format: `<a href="https://www.instagram.com/{handle}">Instagram</a>`

**Scraping Strategy**:
```javascript
// Target: a[href*="instagram.com"]
// Extract: href attribute
// Parse: username from URL
```

#### Rate Limiting Concerns
**Instagram Profile Pages**:
- No API access without authentication
- Public profile scraping is fragile
- Rate limits are aggressive and undocumented
- Can trigger IP bans

**Mitigation Strategies**:
1. Only scrape Spotify artist pages (less aggressive limits)
2. Delay requests: 700-1300ms random delays
3. Limit per run: Max 50 Instagram checks
4. Graceful degradation: Mark as "unchecked" on failure
5. Cache results: Never re-check same artist

**v1 Decision**:
- Scrape Spotify pages for Instagram handles (low risk)
- Verify handle exists (presence check)
- Skip Instagram activity checking (high risk)
- Mark unreachable as "unchecked" for manual review

### Cheerio for HTML Parsing

**Library**: `cheerio` (v1.0.0)
- jQuery-like API for HTML parsing
- No browser needed (fast)
- Works with raw HTML strings

**Usage Pattern**:
```javascript
const cheerio = require('cheerio');
const $ = cheerio.load(html);
const instagramLink = $('a[href*="instagram.com"]').attr('href');
```

**Advantages over Puppeteer**:
- Much faster (no browser overhead)
- Lower resource usage
- Simpler error handling
- Sufficient for static content scraping

### Token Storage Options Analysis

#### Option A: crm-data.json
- **Pros**: Already exists, simple read/write
- **Cons**: Being phased out, not future-proof
- **Verdict**: Not recommended

#### Option B: New spotify-config.json
- **Pros**: Separation of concerns, clear purpose
- **Cons**: Another file to manage
- **Verdict**: Good for v1

#### Option C: Airtable Settings Table
- **Pros**: Future-proof, cloud-synced
- **Cons**: Adds complexity, requires schema changes
- **Verdict**: Better for v2

#### Option D: Environment Variables
- **Pros**: Standard for credentials, gitignored
- **Cons**: Requires restart to update, no UI management
- **Verdict**: Use for client ID/secret only

**Final Decision**:
- Client ID/Secret in `.env` (credentials)
- Access/Refresh tokens in `spotify-config.json` (user session)
- Settings UI stores Client ID/Secret in new settings file

### Artist Check Caching Strategy

**Requirements**:
1. Remember which artists have been analyzed
2. Skip re-checking same artists
3. Track whether artist was added to CRM
4. Persist across page refreshes
5. Allow manual refresh if desired

**Storage Options**:

#### localStorage
- **Pros**: Browser-native, persists across sessions, no backend needed
- **Cons**: Not synced across devices, limited to 5-10MB
- **Verdict**: Perfect for v1 (single-user, single-device app)

#### spotify-config.json
- **Pros**: Syncs if user moves files, unlimited size
- **Cons**: Requires backend read/write, more complex
- **Verdict**: Overkill for v1

**Schema Design**:
```javascript
{
  "artistChecks": {
    "spotify_artist_id_1": {
      "name": "Artist Name",
      "status": "kept",          // kept | removed | unchecked
      "lastChecked": "2026-01-12T10:30:00Z",
      "reason": null,            // null if kept, reason if removed
      "instagram": "@handle",    // null if not found
      "addedToCRM": false,       // true after quick-add
      "airtableId": null         // Airtable record ID after add
    }
  }
}
```

**Cache Management**:
- Check cache before analyzing artist
- Update cache after analysis
- Mark `addedToCRM: true` after successful quick-add
- Provide "Clear Cache" button in settings for debugging

### Integration with Existing CRM

#### Query for Already-Contacted Artists
When loading playlist results, query Airtable:
```javascript
// Check if artist already in Outreach table
const existingBands = await airtableService.getAllBands();
const contactedArtists = existingBands
  .filter(band => band.status !== 'not_messaged')
  .map(band => band.bandName.toLowerCase());

// Filter out from playlist results UI
const visibleArtists = keptArtists.filter(artist =>
  !contactedArtists.includes(artist.name.toLowerCase())
);
```

**UI Behavior**:
- Don't show already-contacted artists in "Kept Artists" section
- Still remove them from Spotify playlist if they fail filters
- Add "Show All" toggle to reveal hidden artists

#### Quick Add Flow
1. User clicks "Quick Add" on artist card
2. Modal opens with:
   - Spotify artist embed (player)
   - Link to Spotify artist page (to check members)
   - Pre-filled form: bandName, song (top track), instagram, notes
   - Empty fields: members (user adds via Spotify link)
3. User edits/confirms data
4. User clicks "Add to CRM"
5. System:
   - Creates record in Airtable via existing `airtableService.createBand()`
   - Generates message via existing `/api/generate-message` endpoint
   - Updates band record with generated message
   - Updates artist check cache: `addedToCRM: true`
   - Closes modal and removes artist from visible list

### Spotify Artist Player Embed

**Embed Code**:
```html
<iframe
  src="https://open.spotify.com/embed/artist/{artist_id}"
  width="300"
  height="380"
  frameborder="0"
  allowtransparency="true"
  allow="encrypted-media">
</iframe>
```

**Features**:
- Shows artist image
- Top tracks playable
- Follow button
- No authentication needed (public embed)

**Responsive Sizing**:
```css
/* Tailwind classes */
<iframe className="w-full h-96 rounded-lg" ... />
```

### Message Generation Integration

**Existing Endpoint**: `POST /api/generate-message`

**Request**:
```javascript
{
  bandName: "Artist Name",
  members: "John, Sarah",
  song: "Song Title",
  notes: "Listening observations",
  systemPrompt: "..." // From settings
}
```

**Response**:
```javascript
{
  message: "Generated DM text"
}
```

**Integration Strategy**:
1. After user submits Quick Add form, create band in Airtable
2. Immediately call `/api/generate-message` with band data
3. Update band record with `generatedMessage` field
4. Show success message with option to view in Dashboard

## User Decisions from Q&A Session

### Decision Summary (2026-01-12)

1. **CRM Integration**: Full integration with Quick Add modal
   - User can click artist → play song → pre-filled form
   - Include Spotify link to check member names
   - Auto-generate message after adding to CRM

2. **Instagram Activity**: Presence check only (no activity date checking)
   - Scrape for Instagram handle on Spotify page
   - Verify handle exists
   - Don't check last post date (too risky for v1)

3. **Token Storage**: Settings page in app
   - Hidden/protected input fields for Client ID/Secret
   - Store in new settings file (not crm-data.json)
   - OAuth tokens stored separately

4. **Confirmation Screen**: Full preview before cleaning
   - Show what will be removed
   - Require explicit confirmation
   - No silent destructive actions

5. **Filter UI**: Simple inputs with default values
   - Number inputs for min/max values
   - Toggle for Instagram requirement
   - No complex sliders or presets

6. **Playlist Selection**: Dropdown from Spotify API
   - Fetch user's playlists after OAuth
   - Display as dropdown selector
   - No URL paste input

7. **Error Handling**: Mark as unchecked, keep at bottom
   - Artists with scraping errors → "unchecked" status
   - Place unchecked artists at bottom of results
   - Don't re-check already-analyzed artists
   - Hide artists already messaged/contacted in CRM
   - Don't remove from Spotify playlist (keep for manual review)

8. **Scope Confirmation**: All v1 exclusions confirmed
   - No Instagram login
   - No headless browsers
   - No scheduled runs
   - No undo feature

9. **Dependencies**: Use libraries where available
   - `spotify-web-api-node` for Spotify API
   - `cheerio` for HTML scraping
   - Leverage existing Express/React patterns

10. **UI Design**: Match existing Dashboard aesthetic
    - Card-based layout
    - Modal pattern for details
    - Tailwind CSS styling
    - Status color coding

## Technical Discoveries

### Spotify OAuth Flow Details

**Step 1: Authorization Request**
```
GET https://accounts.spotify.com/authorize
  ?client_id={CLIENT_ID}
  &response_type=code
  &redirect_uri={REDIRECT_URI}
  &scope=playlist-read-private playlist-modify-public playlist-modify-private
```

**Step 2: User Grants Permission**
- Redirected to Spotify login page
- User authorizes app
- Spotify redirects back to `redirect_uri` with `code` parameter

**Step 3: Token Exchange**
```
POST https://accounts.spotify.com/api/token
  grant_type=authorization_code
  &code={CODE}
  &redirect_uri={REDIRECT_URI}
  &client_id={CLIENT_ID}
  &client_secret={CLIENT_SECRET}
```

**Response**:
```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "scope": "..."
}
```

**Step 4: Token Refresh** (when expired)
```
POST https://accounts.spotify.com/api/token
  grant_type=refresh_token
  &refresh_token={REFRESH_TOKEN}
  &client_id={CLIENT_ID}
  &client_secret={CLIENT_SECRET}
```

**Implementation with spotify-web-api-node**:
```javascript
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI
});

// Generate auth URL
const authURL = spotifyApi.createAuthorizeURL(scopes, state);

// Exchange code for token
const data = await spotifyApi.authorizationCodeGrant(code);
spotifyApi.setAccessToken(data.body.access_token);
spotifyApi.setRefreshToken(data.body.refresh_token);

// Auto-refresh when expired
spotifyApi.setRefreshToken(refreshToken);
const data = await spotifyApi.refreshAccessToken();
spotifyApi.setAccessToken(data.body.access_token);
```

### Latest Release Detection Logic

**Goal**: Determine if artist has released music within X years

**Endpoint**: `GET /v1/artists/{id}/albums`

**Parameters**:
- `include_groups=album,single` (exclude compilations, appears_on)
- `limit=50` (fetch enough to find latest)
- `market=US` (optional, filters by availability)

**Response**:
```json
{
  "items": [
    {
      "id": "album_id",
      "name": "Album Name",
      "release_date": "2025-03-15",
      "release_date_precision": "day",
      "album_type": "album"
    }
  ]
}
```

**Release Date Formats**:
- `day`: "YYYY-MM-DD"
- `month`: "YYYY-MM"
- `year`: "YYYY"

**Logic**:
```javascript
const releases = await spotifyApi.getArtistAlbums(artistId, {
  include_groups: 'album,single',
  limit: 50
});

// Find most recent release date
const latestRelease = releases.body.items.reduce((latest, item) => {
  const releaseDate = new Date(item.release_date);
  return releaseDate > latest ? releaseDate : latest;
}, new Date(0));

// Check if within threshold
const yearsSinceRelease = (Date.now() - latestRelease) / (1000 * 60 * 60 * 24 * 365);
if (yearsSinceRelease > maxYearsSinceRelease) {
  return { status: 'removed', reason: 'no_recent_release' };
}
```

**Edge Cases**:
- Artist with no releases → Remove (no data = inactive)
- Release date precision "year" only → Use Jan 1 of that year
- Multiple releases on same date → Doesn't matter, we only need latest

### Playlist Track Removal API

**Endpoint**: `DELETE /v1/playlists/{playlist_id}/tracks`

**Request Body**:
```json
{
  "tracks": [
    { "uri": "spotify:track:track_id_1" },
    { "uri": "spotify:track:track_id_2" }
  ]
}
```

**Spotify URI Format**:
- Track: `spotify:track:{id}`
- Artist: `spotify:artist:{id}`
- Playlist: `spotify:playlist:{id}`

**Batch Removal**:
- Max 100 tracks per request
- Need to batch if removing > 100 tracks
- Returns snapshot_id for playlist version tracking

**Implementation**:
```javascript
const tracksToRemove = removedArtistTracks.map(track => ({
  uri: track.uri
}));

// Batch into groups of 100
for (let i = 0; i < tracksToRemove.length; i += 100) {
  const batch = tracksToRemove.slice(i, i + 100);
  await spotifyApi.removeTracksFromPlaylist(playlistId, batch);
}
```

### Primary Artist vs Featured Artist

**Problem**: Tracks can have multiple artists (primary + featured)

**Example**:
```json
{
  "track": {
    "name": "Song Title (feat. Artist B)",
    "artists": [
      { "id": "artist_a_id", "name": "Artist A" },
      { "id": "artist_b_id", "name": "Artist B" }
    ]
  }
}
```

**Decision**: Only evaluate primary artist (first in array)
- `track.artists[0]` is the primary artist
- Ignore featured artists for filtering
- If primary artist fails → remove track
- If featured artist fails but primary passes → keep track

**Rationale**:
- Filters are about finding artists to contact
- Primary artist is the main act
- Featured artists are bonus, not main target
- Avoids over-filtering

### Spotify Artist Top Tracks

**Endpoint**: `GET /v1/artists/{id}/top-tracks`

**Purpose**: Get most popular song for Quick Add pre-fill

**Response**:
```json
{
  "tracks": [
    {
      "id": "track_id",
      "name": "Top Track Name",
      "popularity": 85,
      "preview_url": "https://..."
    }
  ]
}
```

**Usage**:
```javascript
const topTracks = await spotifyApi.getArtistTopTracks(artistId, 'US');
const topTrack = topTracks.body.tracks[0]; // Most popular
```

**Pre-fill Strategy**:
- Use `topTrack.name` for "Song" field
- Fallback to track from playlist if API fails
- Link to full artist page for user to browse all songs

## Open Questions

1. **Settings Storage Format**: Should Client ID/Secret be encrypted at rest?
   - Decision: No for v1 (localhost app, .env already gitignored)
   - Consider for v2 if app becomes multi-user

2. **Cache Expiration**: How long should artist check cache be valid?
   - Options: Never expire (manual clear only), 30 days, 90 days
   - Decision pending: Recommend manual clear only for v1 simplicity

3. **Unchecked Artist Workflow**: Should unchecked artists be removable manually?
   - Current plan: Keep at bottom, manual review
   - Alternative: Add "Force Check" button to retry scraping
   - Decision pending: Keep simple for v1, no retry

4. **Multiple Playlists**: Should user be able to select multiple playlists at once?
   - Out of scope for v1
   - Add in v2 if requested

5. **Filter Presets**: Should there be named filter presets (Strict, Moderate, Lenient)?
   - Out of scope for v1
   - Users can adjust numbers manually

## Resources

### Documentation Links
- [Spotify Web API Reference](https://developer.spotify.com/documentation/web-api)
- [spotify-web-api-node GitHub](https://github.com/thelinmichael/spotify-web-api-node)
- [Cheerio Documentation](https://cheerio.js.org/)
- [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)

### Code Examples
- Existing Airtable integration: `/server/airtable-service.js`
- Existing modal pattern: `/client/src/components/BandCard.jsx`
- Existing form pattern: `/client/src/components/AddBandForm.jsx`
- Existing OAuth example: (none - will be first implementation)

### Testing Resources
- Spotify Developer Dashboard: https://developer.spotify.com/dashboard
- Test playlist: Create small playlist with mix of popular/obscure artists
- Instagram scraping test: Sample artist pages with/without Instagram links
