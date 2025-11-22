#!/bin/bash
echo "Building for Production..."
npm run build

echo "Starting Production Server..."
export NODE_ENV=production

# Stop existing instance if running
if pgrep -f "node server.js" > /dev/null; then
    echo "Stopping existing instance..."
    pkill -f "node server.js"
fi

# Start in background
nohup node server.js > server.log 2>&1 &

echo "Server started in background. Logs are being written to server.log"
echo "App available at http://localhost:3001"