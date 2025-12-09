#!/bin/sh
set -e

echo "Starting Better Smokeping..."

# Initialize database
echo "Initializing database..."
npx prisma db push --accept-data-loss || echo "Database already initialized"

# Start monitoring service in background
echo "Starting monitoring service..."
node scripts/monitor.js &

# Start Next.js server
echo "Starting web server on port 3000..."
exec node server.js
