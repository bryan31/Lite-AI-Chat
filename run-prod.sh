#!/bin/bash
echo "Building for Production..."
npm run build

echo "Starting Production Server..."
export NODE_ENV=production

# Stop existing instance if running
if pgrep -f "npm run start" > /dev/null; then
    echo "Stopping existing instance..."
    pkill -f "npm run start"
    pkill -f "node server.js"
    pkill -f "vite preview"
fi

# Start in background
nohup npm run start > server.log 2>&1 &

echo "Server started in background. Logs are being written to server.log"
echo "App available at http://localhost:3001"