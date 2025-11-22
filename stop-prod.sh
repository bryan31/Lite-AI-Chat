#!/bin/bash
echo "Stopping Production Server..."
pkill -f "npm run start"
pkill -f "node server.js"
pkill -f "vite preview"
echo "Server stopped."