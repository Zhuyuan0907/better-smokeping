#!/bin/sh
set -e

echo "Starting Better Smokeping..."

# Ensure data directory exists and has correct permissions
mkdir -p /app/data
touch /app/data/smokeping.db 2>/dev/null || true

# Initialize database
echo "Initializing database..."
node_modules/.bin/prisma db push --accept-data-loss || echo "Database already initialized"

# Sync configuration to database
echo "Syncing configuration..."
node scripts/sync-config.js || echo "Config sync completed"

# Start monitoring service in background
echo "Starting monitoring service..."
node scripts/monitor.js &

# Start Next.js server
echo "Starting web server on port 3000..."
exec node server.js
