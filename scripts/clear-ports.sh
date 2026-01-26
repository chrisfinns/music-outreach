#!/bin/bash

# Kill processes on port 3000 (backend)
lsof -ti:3000 | xargs kill -9 2>/dev/null

# Kill processes on port 5173 (vite/frontend)
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Kill ngrok processes
pkill -f "ngrok" 2>/dev/null

echo "✅ Ports 3000 and 5173 cleared, ngrok processes killed"
