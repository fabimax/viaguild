-- CreateEnum
CREATE TYPE "RelationshipType" AS ENUM ('PARENT', 'CHILD', 'PARTNER', 'CLUSTER', 'RIVAL');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('WEBSITE', 'EMAIL', 'DISCORD', 'TWITTER', 'BLUESKY', 'TWITCH', 'GITHUB', 'LINKEDIN', 'CUSTOM');

-- CreateEnum
CREATE TYPE "BadgeShape" AS ENUM ('CIRCLE', 'STAR', 'HEART', 'HEXAGON');

-- CreateEnum
CREATE TYPE "BadgeTier" AS ENUM ('GOLD', 'SILVER', 'BRONZE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GUILD_INVITE', 'BADGE_RECEIVED', 'GUILD_JOIN_REQUEST', 'RELATIONSHIP_REQUEST', 'GUILD_UPDATE', 'NEW_GUILD_MEMBER');

-- CreateTable
CREATE TABLE "GuildRelationship" (
    "id" TEXT NOT NULL,
    "sourceGuildId" TEXT NOT NULL,
    "targetGuildId" TEXT NOT NULL,
    "type" "RelationshipType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildContact" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "label" TEXT,
    "value" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "guildId" TEXT,
    "imageUrl" TEXT,
    "shapeType" "BadgeShape" NOT NULL DEFAULT 'CIRCLE',
    "borderColor" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tier" "BadgeTier",

    CONSTRAINT "BadgeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "giverId" TEXT NOT NULL,
    "givenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "message" TEXT,

    CONSTRAINT "BadgeInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadgeAllocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "BadgeTier" NOT NULL,
    "remaining" INTEGER NOT NULL DEFAULT 0,
    "lastReplenishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadgeAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadgeCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBadgeCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserBadgeItem" (
    "id" TEXT NOT NULL,
    "badgeCaseId" TEXT NOT NULL,
    "badgeInstanceId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBadgeCase" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "featuredBadgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildBadgeCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBadgeItem" (
    "id" TEXT NOT NULL,
    "badgeCaseId" TEXT NOT NULL,
    "badgeInstanceId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildBadgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceId" TEXT,
    "sourceType" TEXT,
    "actorId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GuildRelationship_sourceGuildId_idx" ON "GuildRelationship"("sourceGuildId");

-- CreateIndex
CREATE INDEX "GuildRelationship_targetGuildId_idx" ON "GuildRelationship"("targetGuildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRelationship_sourceGuildId_targetGuildId_key" ON "GuildRelationship"("sourceGuildId", "targetGuildId");

-- CreateIndex
CREATE INDEX "GuildContact_guildId_idx" ON "GuildContact"("guildId");

-- CreateIndex
CREATE INDEX "BadgeTemplate_creatorId_idx" ON "BadgeTemplate"("creatorId");

-- CreateIndex
CREATE INDEX "BadgeTemplate_guildId_idx" ON "BadgeTemplate"("guildId");

-- CreateIndex
CREATE INDEX "BadgeInstance_templateId_idx" ON "BadgeInstance"("templateId");

-- CreateIndex
CREATE INDEX "BadgeInstance_receiverId_idx" ON "BadgeInstance"("receiverId");

-- CreateIndex
CREATE INDEX "BadgeInstance_giverId_idx" ON "BadgeInstance"("giverId");

-- CreateIndex
CREATE INDEX "UserBadgeAllocation_userId_idx" ON "UserBadgeAllocation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadgeAllocation_userId_tier_key" ON "UserBadgeAllocation"("userId", "tier");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadgeCase_userId_key" ON "UserBadgeCase"("userId");

-- CreateIndex
CREATE INDEX "UserBadgeItem_badgeCaseId_displayOrder_idx" ON "UserBadgeItem"("badgeCaseId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadgeItem_badgeCaseId_badgeInstanceId_key" ON "UserBadgeItem"("badgeCaseId", "badgeInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildBadgeCase_guildId_key" ON "GuildBadgeCase"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildBadgeCase_featuredBadgeId_key" ON "GuildBadgeCase"("featuredBadgeId");

-- CreateIndex
CREATE INDEX "GuildBadgeItem_badgeCaseId_displayOrder_idx" ON "GuildBadgeItem"("badgeCaseId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "GuildBadgeItem_badgeCaseId_badgeInstanceId_key" ON "GuildBadgeItem"("badgeCaseId", "badgeInstanceId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "GuildRelationship" ADD CONSTRAINT "GuildRelationship_sourceGuildId_fkey" FOREIGN KEY ("sourceGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRelationship" ADD CONSTRAINT "GuildRelationship_targetGuildId_fkey" FOREIGN KEY ("targetGuildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRelationship" ADD CONSTRAINT "GuildRelationship_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildContact" ADD CONSTRAINT "GuildContact_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BadgeTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_giverId_fkey" FOREIGN KEY ("giverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeAllocation" ADD CONSTRAINT "UserBadgeAllocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeCase" ADD CONSTRAINT "UserBadgeCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeItem" ADD CONSTRAINT "UserBadgeItem_badgeCaseId_fkey" FOREIGN KEY ("badgeCaseId") REFERENCES "UserBadgeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadgeItem" ADD CONSTRAINT "UserBadgeItem_badgeInstanceId_fkey" FOREIGN KEY ("badgeInstanceId") REFERENCES "BadgeInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBadgeCase" ADD CONSTRAINT "GuildBadgeCase_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBadgeCase" ADD CONSTRAINT "GuildBadgeCase_featuredBadgeId_fkey" FOREIGN KEY ("featuredBadgeId") REFERENCES "GuildBadgeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBadgeItem" ADD CONSTRAINT "GuildBadgeItem_badgeCaseId_fkey" FOREIGN KEY ("badgeCaseId") REFERENCES "GuildBadgeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBadgeItem" ADD CONSTRAINT "GuildBadgeItem_badgeInstanceId_fkey" FOREIGN KEY ("badgeInstanceId") REFERENCES "BadgeInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
