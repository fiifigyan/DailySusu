#!/bin/bash
# Rollback Script for XSusu
# Usage: ./scripts/rollback.sh [staging|production] [timestamp]

set -e

ENVIRONMENT=${1:-staging}
TIMESTAMP=${2:-latest}

echo "============================================"
echo "XSusu Rollback - $ENVIRONMENT"
echo "Rolling back to: $TIMESTAMP"
echo "============================================"

# Load environment
if [ "$ENVIRONMENT" = "production" ]; then
    source .env.production
    DATABASE_URL=$PRODUCTION_DATABASE_URL
else
    source .env.staging
    DATABASE_URL=$STAGING_DATABASE_URL
fi

# Step 1: Run rollback SQL
echo "Running rollback SQL..."
psql "$DATABASE_URL" -f prisma/migrations/20260808_add_payment_integration/rollback.sql

# Step 2: Restore from backup if SQL rollback is insufficient
BACKUP_FILE="backups/${ENVIRONMENT}_${TIMESTAMP}.sql"
if [ -f "$BACKUP_FILE" ]; then
    echo "Restoring from backup: $BACKUP_FILE"
    psql "$DATABASE_URL" < "$BACKUP_FILE"
    echo "✅ Database restored from backup"
else
    echo "⚠️ Backup file not found: $BACKUP_FILE"
    echo "SQL rollback only was applied"
fi

# Step 3: Verify
echo "Running health checks..."
HEALTH_CHECK=$(curl -s http://localhost:3000/health)
echo "Health status: $HEALTH_CHECK"

echo "============================================"
echo "Rollback completed at: $(date)"
echo "============================================"