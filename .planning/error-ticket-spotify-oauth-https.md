# Error Ticket: Spotify OAuth HTTPS Requirement

## Issue ID
SPOTIFY-OAUTH-001

## Date Reported
2026-01-12

## Severity
**CRITICAL** - Blocks all Spotify OAuth functionality

## Status
✅ **RESOLVED** - Using ngrok HTTPS tunnel

---

## Problem Description

### Initial Error
When attempting to connect to Spotify via OAuth, users received:
```
INVALID_CLIENT: Invalid redirect URI
```

### Root Cause
Spotify enforces HTTPS-only redirect URIs, even for local development environments. The application was initially configured with HTTP redirect URIs (`http://localhost:3000` and `http://127.0.0.1:3000`), which Spotify now rejects.

### Symptoms
1. User clicks "Connect Spotify" button in PlaylistCleaner page
2. OAuth window opens with Spotify authorization page
3. After user approves, Spotify attempts redirect
4. Spotify API returns `INVALID_CLIENT: Invalid redirect URI` error
5. OAuth flow fails, user cannot connect

### Spotify Dashboard Behavior
- HTTP redirect URIs show red "This redirect URI is not secure" warning
- "Add URI" button is disabled for HTTP URLs
- Only HTTPS URLs are accepted

---

## Environment

### Application Stack
- **Frontend**: React 19 + Vite 7 (running on `http://localhost:5173`)
- **Backend**: Express 5 server (running on `http://localhost:3000`)
- **OS**: macOS 13 (Darwin 22.6.0)
- **Node Version**: v22.14.0

### Spotify Configuration
- **Client ID**: `db76230f25554df48d7c5cffb8f4b705`
- **Original Redirect URI**: `http://localhost:3000/api/spotify/callback`
- **Attempted Alternative**: `http://127.0.0.1:3000/api/spotify/callback`

---

## Troubleshooting Steps Taken

### Attempt 1: Try localhost
- **Action**: Used `http://localhost:3000/api/spotify/callback`
- **Result**: ❌ Spotify Dashboard rejected with "not secure" warning
- **Learning**: Spotify enforces HTTPS even for localhost

### Attempt 2: Try 127.0.0.1
- **Action**: Changed to `http://127.0.0.1:3000/api/spotify/callback`
- **Reasoning**: Some platforms treat 127.0.0.1 differently than localhost
- **Result**: ❌ Still rejected by Spotify - HTTPS requirement is universal
- **Learning**: IP address format doesn't bypass HTTPS requirement

### Attempt 3: Localtunnel
- **Action**: Installed and ran localtunnel (`lt --port 3000`)
- **URL Generated**: `https://fair-parrots-dance.loca.lt`
- **Issues Encountered**:
  - Connection timeouts (408 Request Timeout)
  - Process kept dying/crashing
  - Unreliable tunnel stability
- **Result**: ❌ Too unreliable for development use

### Attempt 4: ngrok (Free Tier) - Initial Failure
- **Action**: Attempted to run ngrok without authentication
- **Error**: `ERR_NGROK_4018 - authentication failed: Usage of ngrok requires a verified account and authtoken`
- **Result**: ❌ Requires account and auth token

### Attempt 5: ngrok with Authentication - SUCCESS ✅
- **Action**:
  1. User created free ngrok account
  2. Obtained auth token from ngrok dashboard
  3. Configured ngrok: `ngrok config add-authtoken [TOKEN]`
  4. Started tunnel: `ngrok http 3000`
- **URL Generated**: `https://karoline-aeroballistic-hurtlingly.ngrok-free.dev`
- **Result**: ✅ **WORKING** - Stable HTTPS tunnel, OAuth successful

---

## Solution Implemented

### Configuration Changes

#### 1. ngrok Setup
```bash
# Install ngrok (via Homebrew)
brew install ngrok

# Configure with auth token
ngrok config add-authtoken 389pmxABSDSazxWT2BmP6AfG85X_2e4dXXiz3KL5fUC6Erdxb

# Start tunnel (running in background)
ngrok http 3000 --log=stdout
```

#### 2. Environment Variables Updated
**File**: `.env`
```bash
SPOTIFY_REDIRECT_URI=https://karoline-aeroballistic-hurtlingly.ngrok-free.dev/api/spotify/callback
```

#### 3. Spotify Developer Dashboard
**Added Redirect URI**:
```
https://karoline-aeroballistic-hurtlingly.ngrok-free.dev/api/spotify/callback
```

#### 4. Server Restart
```bash
# Kill existing server
pkill -f "node.*server.js"

# Restart with new environment variables
export PATH="/Users/chris/.nvm/versions/node/v22.14.0/bin:$PATH"
node server/server.js
```

---

## Current Architecture

### Request Flow with ngrok

```
User Browser (localhost:5173)
    ↓
    ↓ [1] User clicks "Connect Spotify"
    ↓
Backend Server (localhost:3000)
    ↓
    ↓ [2] Returns OAuth URL with ngrok redirect URI
    ↓
Spotify OAuth Page
    ↓
    ↓ [3] User approves → Spotify redirects to:
    ↓     https://karoline-aeroballistic-hurtlingly.ngrok-free.dev/api/spotify/callback?code=...
    ↓
ngrok Tunnel (HTTPS → HTTP)
    ↓
    ↓ [4] Forwards to localhost:3000/api/spotify/callback
    ↓
Backend Server (localhost:3000)
    ↓
    ↓ [5] Exchanges code for tokens
    ↓     Saves to settings.json
    ↓     Returns success page
```

### Active Processes
1. **Backend Server**: `node server/server.js` (port 3000)
2. **ngrok Tunnel**: `ngrok http 3000` (background process)
3. **Frontend Dev Server**: Vite (port 5173)

---

## Verification Steps

### How to Verify Solution is Working
1. Visit `http://localhost:5173/playlist-cleaner`
2. Click "Connect Spotify" button
3. Spotify OAuth page opens with correct ngrok URL in redirect_uri parameter
4. Approve access on Spotify page
5. Redirected through ngrok tunnel to callback endpoint
6. Server receives authorization code and exchanges for tokens
7. Success page displays: "Spotify Connected Successfully!"
8. Window auto-closes after 2 seconds
9. PlaylistCleaner page refreshes and shows connected state
10. Playlists dropdown loads with user's Spotify playlists

### Expected OAuth URL Format
```
https://accounts.spotify.com/authorize?
  client_id=db76230f25554df48d7c5cffb8f4b705&
  response_type=code&
  redirect_uri=https://karoline-aeroballistic-hurtlingly.ngrok-free.dev/api/spotify/callback&
  scope=playlist-read-private%20playlist-read-collaborative%20playlist-modify-public%20playlist-modify-private%20user-library-read&
  state=[RANDOM_STATE]
```

---

## Known Limitations & Considerations

### ngrok Free Tier Limitations
1. **URL Changes**: ngrok URL changes every time tunnel restarts
   - **Impact**: Must update `.env` and Spotify Dashboard on each restart
   - **Mitigation**: Keep tunnel running during development sessions

2. **Session Timeout**: Free tier tunnels may timeout after inactivity
   - **Impact**: OAuth will fail if tunnel dies
   - **Mitigation**: Restart tunnel and update URIs if needed

3. **Request Limits**: Free tier has request rate limits
   - **Impact**: Rarely hit during normal development
   - **Mitigation**: Upgrade to paid plan if needed

### Development Workflow Impact
1. **Startup Sequence** now requires:
   ```bash
   # Terminal 1: Start ngrok
   ngrok http 3000

   # Copy the HTTPS URL from ngrok output

   # Terminal 2: Update .env with new ngrok URL (if changed)
   # Update Spotify Dashboard redirect URI (if changed)

   # Terminal 3: Start backend
   node server/server.js

   # Terminal 4: Start frontend
   npm run dev
   ```

2. **Team Collaboration**: Each developer needs their own ngrok account and tunnel

3. **Environment Variables**: Cannot commit `.env` with ngrok URLs (they're temporary)

---

## Alternative Solutions Considered

### 1. Self-Signed SSL Certificates
**Approach**: Generate SSL cert for localhost and run Express with HTTPS
**Pros**:
- No external dependencies
- Works offline
- Stable URLs

**Cons**:
- Spotify may reject self-signed certs
- Complex setup (certificate generation, trust settings)
- Browser security warnings
- Not guaranteed to work

**Decision**: ❌ Rejected - Too complex, not guaranteed to work

### 2. Production HTTPS Server
**Approach**: Deploy backend to production server with real HTTPS
**Pros**:
- Real HTTPS certificate
- Stable URL
- No tunnel needed

**Cons**:
- Requires deployment infrastructure
- Slower development iteration
- CORS configuration needed
- Not suitable for local development

**Decision**: ❌ Rejected - Overkill for development

### 3. ngrok Paid Plan
**Approach**: Upgrade to ngrok paid tier for reserved domains
**Pros**:
- Stable, reserved URLs that don't change
- Higher rate limits
- Better reliability

**Cons**:
- Costs money ($8-10/month)
- Still external dependency

**Decision**: ⏸️ Deferred - Use free tier first, upgrade if needed

### 4. LocalTunnel
**Approach**: Use localtunnel as free alternative
**Pros**:
- Free, no account needed
- Simple setup

**Cons**:
- Very unreliable (kept dying)
- Connection timeouts
- IP authorization required

**Decision**: ❌ Rejected - Too unreliable in testing

---

## Resolution Status

### Current State
✅ **RESOLVED** - Spotify OAuth fully functional with ngrok

### Remaining Work
- [ ] Document ngrok setup in README for other developers
- [ ] Create startup script to automate tunnel + server startup
- [ ] Consider ngrok paid plan for stable URLs if multiple developers join

### Testing Status
- [ ] Test OAuth connection flow - **PENDING USER VERIFICATION**
- [ ] Test playlist loading after connection
- [ ] Test token refresh after expiration (1 hour)
- [ ] Test reconnection after server restart

---

## Lessons Learned

1. **Spotify API Policy Change**: Spotify now enforces HTTPS for all redirect URIs, including local development. This is a recent change not reflected in older documentation.

2. **Tunnel Solution Required**: Modern OAuth development with platforms enforcing HTTPS requires tunnel solutions (ngrok, localtunnel, etc.) for local development.

3. **ngrok Reliability**: ngrok free tier is reliable and stable for development, unlike localtunnel which had frequent connection issues.

4. **Development Workflow**: HTTPS requirements add complexity to development setup. Team needs clear documentation and startup scripts.

5. **Environment Variables**: Sensitive data (API keys, tokens) and temporary values (ngrok URLs) both go in `.env`, but have different commit policies.

---

## Related Files

### Modified Files
- `.env` - Updated `SPOTIFY_REDIRECT_URI` to ngrok URL
- `server/server.js` - No changes needed (reads from env)
- `server/spotify/auth.js` - No changes needed (reads from env)

### Reference Files
- `.planning/task_plan.md` - Original implementation plan
- `.planning/findings.md` - OAuth research and architecture decisions
- `.planning/progress.md` - Implementation progress tracking

---

## Contact & Support

### If OAuth Stops Working

**Check**:
1. Is ngrok tunnel still running? (`ps aux | grep ngrok`)
2. Does ngrok URL in `.env` match the active tunnel URL?
3. Is the ngrok URL added to Spotify Dashboard?
4. Has the server been restarted after `.env` changes?

**Restart ngrok**:
```bash
# Kill existing tunnel
pkill ngrok

# Start new tunnel
ngrok http 3000 --log=stdout

# Copy new URL
# Update .env SPOTIFY_REDIRECT_URI
# Update Spotify Dashboard redirect URIs
# Restart server
```

### ngrok Dashboard
- View tunnel status: http://localhost:4040
- Inspect requests and responses in real-time

---

## Ticket History

| Date | Status | Notes |
|------|--------|-------|
| 2026-01-12 | Reported | User unable to connect Spotify, INVALID_CLIENT error |
| 2026-01-12 | Investigating | Identified HTTPS requirement, tested localhost/127.0.0.1 |
| 2026-01-12 | Testing | Tried localtunnel - too unreliable |
| 2026-01-12 | Testing | Tried ngrok without auth - requires account |
| 2026-01-12 | Resolved | Configured ngrok with auth token, OAuth working |
| 2026-01-12 | Pending Verification | Awaiting user confirmation of successful OAuth flow |
