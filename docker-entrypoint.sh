#!/bin/sh
set -e

echo "Starting Better Smokeping..."

# Initialize database
echo "Initializing database..."
npx prisma db push --skip-generate

# Start monitoring service in background
echo "Starting monitoring service..."
node scripts/monitor.js &

# Start Next.js server
echo "Starting web server..."
exec node server.js
