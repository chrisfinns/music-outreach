# Task Plan: Fix Message Generation Issue

## Overview
The band card message generation is stuck in "generating" status and never completes. The API works when called directly via curl, but the React frontend state doesn't update properly after the message is generated.

## Goals
- Identify why the React state isn't updating after message generation
- Fix the state update mechanism so messages appear in the UI
- Ensure the "generating" → "ready" transition works correctly
- Test with a real band entry to confirm the fix

## Current Problem
1. When clicking "Retry Generation", the status changes to "generating"
2. The API call succeeds (confirmed via curl test)
3. The backend updates the database with the generated message
4. BUT the frontend never shows the updated message - stays stuck at "generating"

## Strategy
1. Review the complete flow: BandCard → Dashboard → API → Database → State Update
2. Check if the issue is in `handleRegenerateMessage` function
3. Verify the API response is being received
4. Check if `handleUpdateBand` is properly updating React state
5. Add logging/debugging to trace where the flow breaks
6. Test the fix with the stuck Stellus band entry

## Steps
1. ✅ Fixed state update bugs in `handleUpdateBand` (line 106) and `handleDeleteBand` (line 117)
2. ✅ Changed from closure-based to functional state updates (`prevBands`)
3. ❌ Issue persists - need deeper investigation
4. Next: Add debugging to trace the exact flow
5. Check if the problem is async timing or state not triggering re-render
