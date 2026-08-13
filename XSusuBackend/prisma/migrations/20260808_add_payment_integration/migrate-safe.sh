#!/bin/bash
# Safe Migration Script for XSusu
# Usage: ./scripts/migrate-safe.sh [staging|production]

set -e  # Exit on any error

ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "============================================"
echo "XSusu Safe Migration - $ENVIRONMENT"
echo "Started at: $(date)"
echo "============================================"

# Load environment
if [ "$ENVIRONMENT" = "production" ]; then
    source .env.production
    DATABASE_URL=$PRODUCTION_DATABASE_URL
elif [ "$ENVIRONMENT" = "staging" ]; then
    source .env.staging
    DATABASE_URL=$STAGING_DATABASE_URL
else
    echo "Invalid environment. Use: staging or production"
    exit 1
fi

# Step 1: Verify staging migration was successful
if [ "$ENVIRONMENT" = "production" ]; then
    echo "Checking staging migration status..."
    STAGING_STATUS=$(curl -s https://staging-api.xsusu.com/health/migration)
    if [ "$STAGING_STATUS" != "OK" ]; then
        echo "❌ Staging migration not verified. Aborting."
        exit 1
    fi
    echo "✅ Staging migration verified"
fi

# Step 2: Create backup
echo "Creating database backup..."
BACKUP_FILE="backups/${ENVIRONMENT}_${TIMESTAMP}.sql"
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"
echo "✅ Backup saved to $BACKUP_FILE"

# Step 3: Run migration
echo "Running migration..."
npx prisma migrate deploy

# Step 4: Verify migration
echo "Verifying migration..."
npx prisma db pull --force > /dev/null 2>&1
SCHEMA_STATUS=$?

if [ $SCHEMA_STATUS -eq 0 ]; then
    echo "✅ Migration successful"
    
    # Step 5: Run health checks
    echo "Running health checks..."
    HEALTH_CHECK=$(curl -s http://localhost:3000/health)
    if echo "$HEALTH_CHECK" | grep -q "OK"; then
        echo "✅ Health check passed"
    else
        echo "❌ Health check failed. Rolling back..."
        bash scripts/rollback.sh "$ENVIRONMENT" "$TIMESTAMP"
        exit 1
    fi
else
    echo "❌ Migration verification failed. Rolling back..."
    bash scripts/rollback.sh "$ENVIRONMENT" "$TIMESTAMP"
    exit 1
fi

echo "============================================"
echo "Migration completed successfully at: $(date)"
echo "============================================"