-- =====================================================
-- MIGRATION: Add Payment Integration (Zero-Downtime)
-- Date: 2026-08-08
-- Strategy: Add columns first, then backfill, then remove old
-- =====================================================

-- PHASE 1: Add new columns with defaults (safe - no data loss)
-- These operations are non-blocking in PostgreSQL

ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "paystackRecipientCode" TEXT,
ADD COLUMN IF NOT EXISTS "paystackAuthorizationCode" TEXT;

ALTER TABLE "Payout" 
ADD COLUMN IF NOT EXISTS "bulkTransferId" TEXT,
ADD COLUMN IF NOT EXISTS "processingStartedAt" TIMESTAMP(3);

ALTER TABLE "AppFee" 
ADD COLUMN IF NOT EXISTS "type" "FeeType" NOT NULL DEFAULT 'DAILY_SURPLUS',
ADD COLUMN IF NOT EXISTS "transactionRef" TEXT;

-- PHASE 2: Create new tables (safe - no existing data affected)
CREATE TABLE IF NOT EXISTS "FailedDisbursement" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "payoutId" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastRetryAt" TIMESTAMP(3),
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FailedDisbursement_pkey" PRIMARY KEY ("id")
);

-- PHASE 3: Add indexes (safe - can be created concurrently in production)
CREATE INDEX IF NOT EXISTS "FailedDisbursement_groupId_idx" ON "FailedDisbursement"("groupId");
CREATE INDEX IF NOT EXISTS "FailedDisbursement_resolved_idx" ON "FailedDisbursement"("resolved");
CREATE INDEX IF NOT EXISTS "AppFee_type_idx" ON "AppFee"("type");
CREATE INDEX IF NOT EXISTS "Payout_status_idx" ON "Payout"("status");

-- PHASE 4: Backfill existing data (safe - updates existing rows)
-- Set all existing AppFee records to DAILY_SURPLUS type
UPDATE "AppFee" SET "type" = 'DAILY_SURPLUS' WHERE "type" IS NULL;

-- PHASE 5: Add constraints (safe after data is consistent)
ALTER TABLE "AppFee" 
ALTER COLUMN "type" SET NOT NULL;

-- Migration complete - old columns can be removed in a future migration
-- after confirming no code references them anymore