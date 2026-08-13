-- =====================================================
-- ROLLBACK: Revert Payment Integration Changes
-- Date: 2026-08-08
-- Run this ONLY if migration causes issues
-- =====================================================

-- PHASE 1: Drop new table (reverse order of creation)
DROP TABLE IF EXISTS "FailedDisbursement" CASCADE;

-- PHASE 2: Remove new columns (safe - data loss only for new data)
ALTER TABLE "User" 
DROP COLUMN IF EXISTS "paystackRecipientCode",
DROP COLUMN IF EXISTS "paystackAuthorizationCode";

ALTER TABLE "Payout" 
DROP COLUMN IF EXISTS "bulkTransferId",
DROP COLUMN IF EXISTS "processingStartedAt";

ALTER TABLE "AppFee" 
DROP COLUMN IF EXISTS "type",
DROP COLUMN IF EXISTS "transactionRef";

-- PHASE 3: Drop indexes created during migration
DROP INDEX IF EXISTS "AppFee_type_idx";
DROP INDEX IF EXISTS "Payout_status_idx";

-- Rollback complete - database is back to previous state