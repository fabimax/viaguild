/*
  Warnings:

  - The values [CHILD] on the enum `RelationshipType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `createdById` on the `GuildRelationship` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RelationshipProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED', 'SUPERSEDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'GUILD_RELATIONSHIP_PROPOSAL_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_RELATIONSHIP_PROPOSAL_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_RELATIONSHIP_PROPOSAL_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_RELATIONSHIP_PROPOSAL_REVOKED';
ALTER TYPE "NotificationType" ADD VALUE 'GUILD_RELATIONSHIP_PROPOSAL_EXPIRED';

-- CreateTable
CREATE TABLE "GuildRelationshipProposal" (
    "id" TEXT NOT NULL,
    "proposingGuildId" TEXT NOT NULL,
    "targetGuildId" TEXT NOT NULL,
    "proposedType" "RelationshipType" NOT NULL, -- This will initially use the old RelationshipType with CHILD
    "status" "RelationshipProposalStatus" NOT NULL DEFAULT 'PENDING',
    "messageFromProposer" TEXT,
    "messageFromResponder" TEXT,
    "proposedByUserId" TEXT NOT NULL,
    "resolvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GuildRelationshipProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildRelationshipProposal_proposingGuildId_idx" ON "GuildRelationshipProposal"("proposingGuildId");

-- CreateIndex
CREATE INDEX "GuildRelationshipProposal_targetGuildId_idx" ON "GuildRelationshipProposal"("targetGuildId");

-- CreateIndex
CREATE INDEX "GuildRelationshipProposal_status_idx" ON "GuildRelationshipProposal"("status");

-- CreateIndex
CREATE INDEX "GuildRelationshipProposal_proposedByUserId_idx" ON "GuildRelationshipProposal"("proposedByUserId");

-- CreateIndex
CREATE INDEX "GuildRelationshipProposal_resolvedByUserId_idx" ON "GuildRelationshipProposal"("resolvedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRelationshipProposal_proposingGuildId_targetGuildId_pr_key" ON "GuildRelationshipProposal"("proposingGuildId", "targetGuildId", "proposedType", "status");

-- AddForeignKey
ALTER TABLE "GuildRelationshipProposal" ADD CONSTRAINT "GuildRelationshipProposal_proposingGuildId_fkey" FOREIGN KEY ("proposingGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRelationshipProposal" ADD CONSTRAINT "GuildRelationshipProposal_targetGuildId_fkey" FOREIGN KEY ("targetGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRelationshipProposal" ADD CONSTRAINT "GuildRelationshipProposal_proposedByUserId_fkey" FOREIGN KEY ("proposedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRelationshipProposal" ADD CONSTRAINT "GuildRelationshipProposal_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterEnum
BEGIN;
CREATE TYPE "RelationshipType_new" AS ENUM ('PARENT', 'PARTNER', 'RIVAL');
ALTER TABLE "GuildRelationship" ALTER COLUMN "type" TYPE "RelationshipType_new" USING ("type"::text::"RelationshipType_new");
ALTER TABLE "GuildRelationshipProposal" ALTER COLUMN "proposedType" TYPE "RelationshipType_new" USING ("proposedType"::text::"RelationshipType_new"); -- Now this table exists
ALTER TYPE "RelationshipType" RENAME TO "RelationshipType_old";
ALTER TYPE "RelationshipType_new" RENAME TO "RelationshipType";
DROP TYPE "RelationshipType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "GuildRelationship" DROP CONSTRAINT "GuildRelationship_createdById_fkey";

-- AlterTable
ALTER TABLE "GuildRelationship" DROP COLUMN "createdById",
ADD COLUMN     "accepterUserId" TEXT,
ADD COLUMN     "proposerUserId" TEXT;

-- AddForeignKey
ALTER TABLE "GuildRelationship" ADD CONSTRAINT "GuildRelationship_proposerUserId_fkey" FOREIGN KEY ("proposerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRelationship" ADD CONSTRAINT "GuildRelationship_accepterUserId_fkey" FOREIGN KEY ("accepterUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
