#!/bin/sh
set -e

echo "Starting Better Smokeping (Development Mode)..."

# Ensure data directory exists and has correct permissions
mkdir -p /app/data
touch /app/data/smokeping.db 2>/dev/null || true

# Initialize database
echo "Initializing database..."
npx prisma db push --accept-data-loss || echo "Database already initialized"

# Sync configuration to database
echo "Syncing configuration..."
node scripts/sync-config.js || echo "Config sync completed"

# Start monitoring service in background
echo "Starting monitoring service..."
node scripts/monitor-with-mtr.js &

# Start Next.js development server
echo "Starting Next.js dev server on port 3000..."
exec npm run dev -- -H 0.0.0.0
