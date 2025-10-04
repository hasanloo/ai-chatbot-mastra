#!/bin/bash

# Reset local PostgreSQL database
# WARNING: This script stops the container, removes all data, and reinitializes the database

set -e

echo "⚠️  WARNING: This will delete ALL local database data!"
echo ""
read -p "Are you sure you want to continue? (yes/no): " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Reset cancelled"
    exit 0
fi

echo "🗑️  Resetting local PostgreSQL database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found in current directory"
    exit 1
fi

# Stop and remove the container
echo "🛑 Stopping and removing container..."
docker compose down -v postgres

# Remove the data directory
if [ -d "docker/postgres-data" ]; then
    echo "🗑️  Removing database data..."
    rm -rf docker/postgres-data
fi

# Start fresh database
echo "🚀 Starting fresh database..."
./scripts/db-local-start.sh

echo ""
echo "✅ Database reset complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Run migrations: pnpm db:migrate"
echo "   2. Start dev server: pnpm dev"
