-- Drop indexes
DROP INDEX IF EXISTS "PendingInvite_groupId_idx";
DROP INDEX IF EXISTS "PendingInvite_inviteCode_idx";
DROP INDEX IF EXISTS "PendingInvite_phoneHash_idx";
DROP INDEX IF EXISTS "PendingInvite_inviteCode_key";
DROP INDEX IF EXISTS "PendingInvite_groupId_position_key";

-- Drop table
DROP TABLE IF EXISTS "PendingInvite" CASCADE;