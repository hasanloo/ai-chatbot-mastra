# Local Development Setup

This guide explains how to set up and use a local PostgreSQL database with pgVector extension for development.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [pgAdmin Web Interface](#pgadmin-web-interface)
- [Database Scripts](#database-scripts)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Switching Between Local and Cloud](#switching-between-local-and-cloud)

## Prerequisites

- Docker Desktop installed and running
- pnpm package manager
- Basic understanding of PostgreSQL

## Quick Start

### 1. Set Up Environment Variables

Copy the local environment template:

```bash
cp .env.local.example .env.local
```

Update the following values in `.env.local`:
- `AUTH_SECRET`: Generate using `openssl rand -base64 32`
- `GOOGLE_GENERATIVE_AI_API_KEY`: Your Google AI API key
- `POSTGRES_URL`: Keep the default local connection string (already configured)

### 2. Start the Local Database

```bash
pnpm db:local:up
```

This will:
- Start PostgreSQL 16 with pgVector extension in a Docker container
- Start pgAdmin web interface for database management
- Initialize the database with the vector extension
- Display connection information

### 3. Run Database Migrations

```bash
pnpm db:migrate
```

This applies all Drizzle ORM migrations to set up the schema.

### 4. Start the Development Server

```bash
pnpm dev
```

Or use the combined command:

```bash
pnpm dev:local
```

This will start the database (if not running) and then start the dev server.

## pgAdmin Web Interface

The local setup includes **pgAdmin 4**, a powerful web-based database management tool.

### Accessing pgAdmin

After starting the database with `pnpm db:local:up`, open your browser and navigate to:

```
http://localhost:5050
```

**Login Credentials:**
- **Email**: `admin@local.dev`
- **Password**: `admin`

### Features

pgAdmin provides a full-featured GUI for:
- **Browsing Tables**: View all database tables, columns, and relationships
- **Running Queries**: Execute SQL queries with syntax highlighting
- **Visual Query Builder**: Create queries visually
- **Data Editor**: View and edit table data directly
- **Schema Designer**: Visualize database structure
- **Performance Tools**: Monitor queries and database performance
- **Import/Export**: Bulk data operations

### Pre-configured Connection

The PostgreSQL server is automatically configured in pgAdmin as:
- **Name**: AI Chatbot Local
- **Group**: Development
- **Host**: postgres (via Docker network)
- **Database**: ai_chatbot_dev

Simply expand "Servers" → "Development" → "AI Chatbot Local" in the left sidebar to start browsing.

### First-Time Setup

When you first connect to the server, pgAdmin will ask for the database password. Enter:

```
postgres
```

You can check "Save Password" to avoid entering it again.

### Common Tasks

**Running a Query:**
1. Expand the server tree to your database
2. Right-click on the database → "Query Tool"
3. Write your SQL query
4. Click "Execute" (⚡ icon) or press F5

**Viewing Table Data:**
1. Navigate to: Servers → Development → AI Chatbot Local → Databases → ai_chatbot_dev → Schemas → public → Tables
2. Right-click on a table → "View/Edit Data" → "All Rows"

**Exporting Data:**
1. Right-click on a table → "Import/Export"
2. Choose format (CSV, etc.) and options
3. Click "OK"

### Persistent Settings

pgAdmin settings and server configurations are stored in `./docker/pgadmin-data` and persist across restarts.

### Troubleshooting pgAdmin

**Can't access http://localhost:5050:**
- Ensure services are running: `docker ps | grep pgadmin`
- Check logs: `docker compose logs pgadmin`
- Port conflict: Change `5050:80` to another port in `docker-compose.yml`

**"Failed to connect to server":**
- Ensure PostgreSQL is running: `docker ps | grep postgres`
- The server configuration uses Docker network name `postgres`, not `localhost`

## Database Scripts

### Start Database

```bash
pnpm db:local:up
```

Starts the PostgreSQL container with pgVector. Data is persisted in `./docker/postgres-data`.

### Stop Database

```bash
pnpm db:local:down
```

Stops the database container but preserves all data.

### Reset Database

```bash
pnpm db:local:reset
```

**⚠️ WARNING:** This will:
- Stop the container
- Delete ALL local database data
- Start a fresh database
- Require running migrations again

You'll be prompted to confirm before proceeding.

## Configuration

### Local Database Connection

The local PostgreSQL database runs with these settings:

| Setting  | Value              |
|----------|-------------------|
| Host     | localhost         |
| Port     | 5432              |
| Database | ai_chatbot_dev    |
| Username | postgres          |
| Password | postgres          |

**Connection String:**
```
postgresql://postgres:postgres@localhost:5432/ai_chatbot_dev
```

### Docker Compose Configuration

The setup includes two services configured in `docker-compose.yml`:

**PostgreSQL:**
- **Image**: `pgvector/pgvector:pg16` (PostgreSQL 16 with pgVector)
- **Container Name**: `ai-chatbot-postgres`
- **Port**: `5432:5432`
- **Data Volume**: `./docker/postgres-data`
- **Init Script**: `./docker/init-db.sql`
- **Network**: `ai-chatbot-network`

**pgAdmin:**
- **Image**: `dpage/pgadmin4:latest`
- **Container Name**: `ai-chatbot-pgadmin`
- **Port**: `5050:80`
- **Data Volume**: `./docker/pgadmin-data`
- **Server Config**: `./docker/pgadmin-servers.json`
- **Network**: `ai-chatbot-network`

### Mastra Integration

The application uses `@mastra/pg` package which requires:
- PostgreSQL database
- pgVector extension enabled

The `docker/init-db.sql` script automatically enables pgVector during initialization.

Mastra components using the database:
- **PostgresStore**: Main storage for Mastra framework
- **PgVector**: Vector storage for semantic memory/embeddings
- **Memory**: AI agent memory with semantic recall

## Troubleshooting

### Database Won't Start

**Issue**: Docker is not running
```
❌ Error: Docker is not running
```

**Solution**: Start Docker Desktop and try again.

---

**Issue**: Port 5432 already in use
```
Error: port is already allocated
```

**Solution**: Another PostgreSQL instance is using port 5432. Either:
1. Stop the other PostgreSQL service
2. Change the port in `docker-compose.yml`

---

**Issue**: Database initialization failed
```
❌ Error: Database failed to start within 30 seconds
```

**Solution**:
1. Check Docker logs: `docker compose logs postgres`
2. Ensure Docker has sufficient resources (CPU/Memory)
3. Try resetting: `pnpm db:local:reset`

### Connection Issues

**Issue**: Can't connect to database

**Solution**: Verify:
1. Database is running: `docker ps | grep ai-chatbot-postgres`
2. `.env.local` has correct `POSTGRES_URL`
3. Port 5432 is accessible: `nc -zv localhost 5432`

### Migration Errors

**Issue**: Migrations fail to run

**Solution**:
1. Ensure database is running: `pnpm db:local:up`
2. Check database connection: `psql postgresql://postgres:postgres@localhost:5432/ai_chatbot_dev`
3. Reset and try again: `pnpm db:local:reset && pnpm db:migrate`

### pgVector Extension Missing

**Issue**: Error about missing vector extension

**Solution**:
1. The extension should be auto-installed via `docker/init-db.sql`
2. Manually enable it:
   ```bash
   docker compose exec postgres psql -U postgres -d ai_chatbot_dev -c "CREATE EXTENSION IF NOT EXISTS vector;"
   ```
3. If still failing, reset the database: `pnpm db:local:reset`

## Switching Between Local and Cloud

### Switch to Local Development

1. Update `.env.local`:
   ```bash
   POSTGRES_URL=postgresql://postgres:postgres@localhost:5432/ai_chatbot_dev
   ```

2. Start local database:
   ```bash
   pnpm db:local:up
   ```

3. Run migrations:
   ```bash
   pnpm db:migrate
   ```

### Switch to Cloud Database

1. Update `.env.local` with your cloud database URL:
   ```bash
   POSTGRES_URL=postgresql://user:password@cloud-host:5432/database
   ```

2. Ensure cloud database has pgVector extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

3. Run migrations:
   ```bash
   pnpm db:migrate
   ```

### Using Both Environments

You can maintain separate environment files:

- `.env.local` - Local development
- `.env.production.local` - Cloud/production

Switch by copying the appropriate file to `.env.local`.

## Data Management

### Viewing Database Data

Using Drizzle Studio:
```bash
pnpm db:studio
```

Using psql:
```bash
docker compose exec postgres psql -U postgres -d ai_chatbot_dev
```

### Backing Up Local Data

```bash
docker compose exec postgres pg_dump -U postgres ai_chatbot_dev > backup.sql
```

### Restoring From Backup

```bash
cat backup.sql | docker compose exec -T postgres psql -U postgres -d ai_chatbot_dev
```

### Clearing Specific Tables

```bash
# Clear chat data
docker compose exec postgres psql -U postgres -d ai_chatbot_dev -c "TRUNCATE TABLE \"Chat\" CASCADE;"

# Clear memory data (Mastra)
docker compose exec postgres psql -U postgres -d ai_chatbot_dev -c "TRUNCATE TABLE mastra_memory CASCADE;"
```

## Development Workflow

### Recommended Daily Workflow

1. **Morning**: Start database
   ```bash
   pnpm db:local:up
   ```

2. **Development**: Make changes and test locally

3. **Schema Changes**:
   ```bash
   pnpm db:generate  # Generate migration
   pnpm db:migrate   # Apply migration
   ```

4. **Evening**: Stop database (or leave running)
   ```bash
   pnpm db:local:down
   ```

### Testing Migrations

Before deploying:

1. Reset local database:
   ```bash
   pnpm db:local:reset
   ```

2. Run all migrations from scratch:
   ```bash
   pnpm db:migrate
   ```

3. Verify schema:
   ```bash
   pnpm db:studio
   ```

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgVector Documentation](https://github.com/pgvector/pgvector)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Mastra Documentation](https://mastra.ai/docs)

## Need Help?

If you encounter issues not covered here:

1. Check Docker logs: `docker compose logs postgres`
2. Check application logs
3. Try resetting: `pnpm db:local:reset`
4. Create an issue in the project repository
