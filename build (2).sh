#!/bin/bash
set -e

echo "🚀 Starting Carrom Arena deployment build..."

# Remove old lockfile if it exists
if [ -f "pnpm-lock.yaml" ]; then
  echo "🗑️ Removing outdated lockfile..."
  rm -f pnpm-lock.yaml
fi

# Remove node_modules to ensure clean install
if [ -d "node_modules" ]; then
  echo "🗑️ Cleaning node_modules..."
  rm -rf node_modules
fi

# Install dependencies without frozen lockfile
echo "📦 Installing dependencies..."
pnpm install --no-frozen-lockfile --prefer-offline

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"