-- Create PendingInvite table
CREATE TABLE IF NOT EXISTS "PendingInvite" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "name" TEXT,
    "position" INTEGER NOT NULL,
    "inviteCode" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "PendingInvite_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PendingInvite_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "SusuGroup"("id") ON DELETE CASCADE,
    CONSTRAINT "PendingInvite_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "PendingInvite_groupId_idx" ON "PendingInvite"("groupId");
CREATE INDEX IF NOT EXISTS "PendingInvite_inviteCode_idx" ON "PendingInvite"("inviteCode");
CREATE INDEX IF NOT EXISTS "PendingInvite_phoneHash_idx" ON "PendingInvite"("phoneHash");

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS "PendingInvite_inviteCode_key" ON "PendingInvite"("inviteCode");
CREATE UNIQUE INDEX IF NOT EXISTS "PendingInvite_groupId_position_key" ON "PendingInvite"("groupId", "position");