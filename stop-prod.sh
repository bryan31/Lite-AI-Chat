#!/bin/bash
echo "Stopping Production Server..."
pkill -f "node server.js"
echo "Server stopped."