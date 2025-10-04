#!/bin/bash

# Stop local PostgreSQL database
# This script stops the PostgreSQL container but preserves the data

set -e

echo "🛑 Stopping local PostgreSQL database and pgAdmin..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running."
    exit 1
fi

# Check if docker-compose.yml exists
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: docker-compose.yml not found in current directory"
    exit 1
fi

# Stop the database and pgAdmin
docker compose stop postgres pgadmin

echo "✅ PostgreSQL and pgAdmin stopped successfully"
echo ""
echo "💡 The database data is preserved in ./docker/postgres-data"
echo "   To start the database again, run: pnpm db:local:up"
echo "   To completely remove the database and data, run: pnpm db:local:reset"
