#!/bin/bash
set -e

echo "🚀 Starting Carrom Arena deployment..."

# Make build script executable
chmod +x scripts/build.sh

# Run the build process
./scripts/build.sh

# Start the application
echo "🌟 Starting application..."
npm start