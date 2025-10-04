#!/bin/bash

# Start local PostgreSQL database with Docker Compose
# This script starts the PostgreSQL container with pgVector extension

set -e

echo "🚀 Starting local PostgreSQL database with pgVector and pgAdmin..."

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

# Start the database and pgAdmin
docker compose up -d postgres pgadmin

# Wait for database to be healthy
echo "⏳ Waiting for database to be ready..."
timeout=30
counter=0

while [ $counter -lt $timeout ]; do
    if docker compose exec -T postgres pg_isready -U postgres -d ai_chatbot_dev > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        echo ""

        # Wait a bit for pgAdmin to be ready
        echo "⏳ Starting pgAdmin..."
        sleep 3

        echo "✅ Services are running!"
        echo ""
        echo "📊 Database Connection Info:"
        echo "   Host: localhost"
        echo "   Port: 5432"
        echo "   Database: ai_chatbot_dev"
        echo "   User: postgres"
        echo "   Password: postgres"
        echo ""
        echo "🔗 Connection String:"
        echo "   postgresql://postgres:postgres@localhost:5432/ai_chatbot_dev"
        echo ""
        echo "🎨 pgAdmin Web UI:"
        echo "   URL: http://localhost:5050"
        echo "   Email: admin@local.dev"
        echo "   Password: admin"
        echo "   (Database server is pre-configured)"
        echo ""
        echo "💡 Next steps:"
        echo "   1. Make sure .env.local has the correct POSTGRES_URL"
        echo "   2. Run migrations: pnpm db:migrate"
        echo "   3. Start dev server: pnpm dev"
        echo "   4. Open pgAdmin at http://localhost:5050 to browse the database"
        exit 0
    fi
    sleep 1
    counter=$((counter + 1))
done

echo "❌ Error: Database failed to start within ${timeout} seconds"
echo "Run 'docker compose logs postgres' to see the logs"
exit 1
