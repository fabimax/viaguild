-- CreateEnum
CREATE TYPE "GuildInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'REVOKED', 'CONSUMED');

-- CreateEnum
CREATE TYPE "InvitationPlatform" AS ENUM ('VIAGUILD', 'TWITTER', 'BLUESKY', 'TWITCH', 'DISCORD');

-- CreateEnum
CREATE TYPE "GuildJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClusterDirectInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ClusterJoinRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "allowJoinRequests" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "GuildDirectInvitation" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "targetUserId" TEXT,
    "targetUserHandle" TEXT NOT NULL,
    "platform" "InvitationPlatform" NOT NULL,
    "status" "GuildInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "GuildDirectInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildInvitationLink" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "maxUses" INTEGER,
    "currentUses" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildInvitationLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildJoinRequest" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "status" "GuildJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterDirectInvitation" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "invitedByUserId" TEXT NOT NULL,
    "targetGuildId" TEXT NOT NULL,
    "status" "ClusterDirectInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ClusterDirectInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterJoinRequest" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "requestingGuildId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "message" TEXT,
    "status" "ClusterJoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClusterJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildDirectInvitation_guildId_idx" ON "GuildDirectInvitation"("guildId");

-- CreateIndex
CREATE INDEX "GuildDirectInvitation_invitedByUserId_idx" ON "GuildDirectInvitation"("invitedByUserId");

-- CreateIndex
CREATE INDEX "GuildDirectInvitation_targetUserId_idx" ON "GuildDirectInvitation"("targetUserId");

-- CreateIndex
CREATE INDEX "GuildDirectInvitation_targetUserHandle_platform_idx" ON "GuildDirectInvitation"("targetUserHandle", "platform");

-- CreateIndex
CREATE INDEX "GuildDirectInvitation_status_idx" ON "GuildDirectInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GuildDirectInvitation_guildId_targetUserHandle_platform_key" ON "GuildDirectInvitation"("guildId", "targetUserHandle", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "GuildInvitationLink_code_key" ON "GuildInvitationLink"("code");

-- CreateIndex
CREATE INDEX "GuildInvitationLink_guildId_idx" ON "GuildInvitationLink"("guildId");

-- CreateIndex
CREATE INDEX "GuildInvitationLink_createdByUserId_idx" ON "GuildInvitationLink"("createdByUserId");

-- CreateIndex
CREATE INDEX "GuildInvitationLink_code_idx" ON "GuildInvitationLink"("code");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_guildId_idx" ON "GuildJoinRequest"("guildId");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_userId_idx" ON "GuildJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_status_idx" ON "GuildJoinRequest"("status");

-- CreateIndex
CREATE INDEX "GuildJoinRequest_reviewedByUserId_idx" ON "GuildJoinRequest"("reviewedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildJoinRequest_guildId_userId_key" ON "GuildJoinRequest"("guildId", "userId");

-- CreateIndex
CREATE INDEX "ClusterDirectInvitation_clusterId_idx" ON "ClusterDirectInvitation"("clusterId");

-- CreateIndex
CREATE INDEX "ClusterDirectInvitation_invitedByUserId_idx" ON "ClusterDirectInvitation"("invitedByUserId");

-- CreateIndex
CREATE INDEX "ClusterDirectInvitation_targetGuildId_idx" ON "ClusterDirectInvitation"("targetGuildId");

-- CreateIndex
CREATE INDEX "ClusterDirectInvitation_status_idx" ON "ClusterDirectInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterDirectInvitation_clusterId_targetGuildId_key" ON "ClusterDirectInvitation"("clusterId", "targetGuildId");

-- CreateIndex
CREATE INDEX "ClusterJoinRequest_clusterId_idx" ON "ClusterJoinRequest"("clusterId");

-- CreateIndex
CREATE INDEX "ClusterJoinRequest_requestingGuildId_idx" ON "ClusterJoinRequest"("requestingGuildId");

-- CreateIndex
CREATE INDEX "ClusterJoinRequest_requestedByUserId_idx" ON "ClusterJoinRequest"("requestedByUserId");

-- CreateIndex
CREATE INDEX "ClusterJoinRequest_status_idx" ON "ClusterJoinRequest"("status");

-- CreateIndex
CREATE INDEX "ClusterJoinRequest_reviewedByUserId_idx" ON "ClusterJoinRequest"("reviewedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterJoinRequest_clusterId_requestingGuildId_key" ON "ClusterJoinRequest"("clusterId", "requestingGuildId");

-- AddForeignKey
ALTER TABLE "GuildDirectInvitation" ADD CONSTRAINT "GuildDirectInvitation_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDirectInvitation" ADD CONSTRAINT "GuildDirectInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildDirectInvitation" ADD CONSTRAINT "GuildDirectInvitation_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitationLink" ADD CONSTRAINT "GuildInvitationLink_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildInvitationLink" ADD CONSTRAINT "GuildInvitationLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildJoinRequest" ADD CONSTRAINT "GuildJoinRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterDirectInvitation" ADD CONSTRAINT "ClusterDirectInvitation_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterDirectInvitation" ADD CONSTRAINT "ClusterDirectInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterDirectInvitation" ADD CONSTRAINT "ClusterDirectInvitation_targetGuildId_fkey" FOREIGN KEY ("targetGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterJoinRequest" ADD CONSTRAINT "ClusterJoinRequest_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterJoinRequest" ADD CONSTRAINT "ClusterJoinRequest_requestingGuildId_fkey" FOREIGN KEY ("requestingGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterJoinRequest" ADD CONSTRAINT "ClusterJoinRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterJoinRequest" ADD CONSTRAINT "ClusterJoinRequest_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
