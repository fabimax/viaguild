/*
  Warnings:

  - You are about to drop the column `givenAt` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `giverId` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `receiverId` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `creatorId` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `guildId` on the `BadgeTemplate` table. All the data in the column will be lost.
  - The `role` column on the `GuildMembership` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "GuildMemberRank" AS ENUM ('S', 'A', 'B', 'C', 'D', 'E');

-- -- Phase 0 Migration Edit (from PrismaSchemaMigrationPlan.md):
-- -- Comment out Role_temp_old creation.
-- -- REASON: We are preserving the existing GuildMembership.role column and its original Role enum for this Phase 0 migration.
-- -- This enum was a temporary measure in the schema.prisma (to help initial `prisma generate` pass validation)
-- -- but is not needed for this specific SQL migration script's execution in Phase 0 as we are not altering GuildMembership.role to use it here.
-- -- The transition of GuildMembership.role to the new AppRole model (via roleId) will be handled in Phase 1.
-- CREATE TYPE "Role_temp_old" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ROLE_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'RANK_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'CATEGORY_PRIMARY_SET';

-- DropForeignKey
ALTER TABLE "BadgeInstance" DROP CONSTRAINT "BadgeInstance_giverId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeInstance" DROP CONSTRAINT "BadgeInstance_receiverId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeTemplate" DROP CONSTRAINT "BadgeTemplate_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeTemplate" DROP CONSTRAINT "BadgeTemplate_guildId_fkey";

-- DropForeignKey
ALTER TABLE "SocialAccount" DROP CONSTRAINT "SocialAccount_userId_fkey";

-- DropIndex
DROP INDEX "BadgeInstance_giverId_idx";

-- DropIndex
DROP INDEX "BadgeInstance_receiverId_idx";

-- DropIndex
DROP INDEX "BadgeTemplate_creatorId_idx";

-- DropIndex
DROP INDEX "BadgeTemplate_guildId_idx";

-- DropIndex
DROP INDEX "GuildContact_guildId_idx";

-- DropIndex
DROP INDEX "Notification_userId_idx";

-- AlterTable
ALTER TABLE "BadgeInstance" DROP COLUMN "givenAt",
DROP COLUMN "giverId",
DROP COLUMN "receiverId",
ADD COLUMN     "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "guildGiverId" TEXT,
ADD COLUMN     "guildReceiverId" TEXT,
ADD COLUMN     "userGiverId" TEXT,
ADD COLUMN     "userReceiverId" TEXT;

-- AlterTable
ALTER TABLE "BadgeTemplate" DROP COLUMN "creatorId",
DROP COLUMN "guildId",
ADD COLUMN     "creatorUserId" TEXT,
ADD COLUMN     "ownedByGuildId" TEXT;

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "displayName" TEXT;

-- AlterTable
ALTER TABLE "GuildMembership" ADD COLUMN     "rank" "GuildMemberRank" NOT NULL DEFAULT 'E';
-- -- Phase 0 Migration Edit (from PrismaSchemaMigrationPlan.md):
-- -- Do NOT drop or re-add the "role" column in GuildMembership in this Phase 0 migration.
-- -- REASON: This would cause data loss of existing roles. We want to preserve the existing "role" column and its data for now.
-- -- The transition of this column to use the new AppRole model (via a new roleId field) and the migration of data
-- -- will be handled in a separate migration script as part of Phase 1 of the migration plan.
-- DROP COLUMN "role",
-- ADD COLUMN     "role" "Role_temp_old" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT;

-- -- Phase 0 Migration Edit (from PrismaSchemaMigrationPlan.md):
-- -- Comment out DROP TYPE "Role";
-- -- REASON: The existing GuildMembership.role column still uses this original "Role" enum.
-- -- We will handle the deprecation and removal of this original enum in Phase 1, after migrating
-- -- the data from GuildMembership.role to a new roleId foreign key pointing to the AppRole table.
-- DROP TYPE "Role";

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "permissionGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "guildId" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSystemRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSystemRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildAssignmentDetails" (
    "id" TEXT NOT NULL,
    "badgeInstanceId" TEXT NOT NULL,
    "assignmentMethod" TEXT,
    "voteRecordId" TEXT,
    "approvalChain" JSONB,
    "notes" TEXT,
    "assignedByUserId" TEXT,

    CONSTRAINT "GuildAssignmentDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystemCategory" BOOLEAN NOT NULL DEFAULT false,
    "allowsGuildPrimary" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildCategory" (
    "guildId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuildCategory_pkey" PRIMARY KEY ("guildId","categoryId")
);

-- CreateTable
CREATE TABLE "UserCategoryPrimaryGuild" (
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserCategoryPrimaryGuild_pkey" PRIMARY KEY ("userId","categoryId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_key_idx" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "AppRole_guildId_idx" ON "AppRole"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "AppRole_name_guildId_key" ON "AppRole"("name", "guildId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "UserSystemRole_userId_idx" ON "UserSystemRole"("userId");

-- CreateIndex
CREATE INDEX "UserSystemRole_roleId_idx" ON "UserSystemRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSystemRole_userId_roleId_key" ON "UserSystemRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildAssignmentDetails_badgeInstanceId_key" ON "GuildAssignmentDetails"("badgeInstanceId");

-- CreateIndex
CREATE INDEX "GuildAssignmentDetails_badgeInstanceId_idx" ON "GuildAssignmentDetails"("badgeInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "GuildCategory_guildId_idx" ON "GuildCategory"("guildId");

-- CreateIndex
CREATE INDEX "GuildCategory_categoryId_idx" ON "GuildCategory"("categoryId");

-- CreateIndex
CREATE INDEX "UserCategoryPrimaryGuild_userId_idx" ON "UserCategoryPrimaryGuild"("userId");

-- CreateIndex
CREATE INDEX "UserCategoryPrimaryGuild_categoryId_idx" ON "UserCategoryPrimaryGuild"("categoryId");

-- CreateIndex
CREATE INDEX "UserCategoryPrimaryGuild_guildId_idx" ON "UserCategoryPrimaryGuild"("guildId");

-- CreateIndex
CREATE INDEX "BadgeInstance_userGiverId_idx" ON "BadgeInstance"("userGiverId");

-- CreateIndex
CREATE INDEX "BadgeInstance_guildGiverId_idx" ON "BadgeInstance"("guildGiverId");

-- CreateIndex
CREATE INDEX "BadgeInstance_userReceiverId_idx" ON "BadgeInstance"("userReceiverId");

-- CreateIndex
CREATE INDEX "BadgeInstance_guildReceiverId_idx" ON "BadgeInstance"("guildReceiverId");

-- CreateIndex
CREATE INDEX "BadgeTemplate_creatorUserId_idx" ON "BadgeTemplate"("creatorUserId");

-- CreateIndex
CREATE INDEX "BadgeTemplate_ownedByGuildId_idx" ON "BadgeTemplate"("ownedByGuildId");

-- CreateIndex
CREATE INDEX "GuildContact_guildId_displayOrder_idx" ON "GuildContact"("guildId", "displayOrder");

-- CreateIndex
CREATE INDEX "SocialAccount_userId_idx" ON "SocialAccount"("userId");

-- AddForeignKey
ALTER TABLE "SocialAccount" ADD CONSTRAINT "SocialAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppRole" ADD CONSTRAINT "AppRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AppRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSystemRole" ADD CONSTRAINT "UserSystemRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSystemRole" ADD CONSTRAINT "UserSystemRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AppRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_ownedByGuildId_fkey" FOREIGN KEY ("ownedByGuildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_userGiverId_fkey" FOREIGN KEY ("userGiverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_guildGiverId_fkey" FOREIGN KEY ("guildGiverId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_userReceiverId_fkey" FOREIGN KEY ("userReceiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_guildReceiverId_fkey" FOREIGN KEY ("guildReceiverId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildAssignmentDetails" ADD CONSTRAINT "GuildAssignmentDetails_badgeInstanceId_fkey" FOREIGN KEY ("badgeInstanceId") REFERENCES "BadgeInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildCategory" ADD CONSTRAINT "GuildCategory_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildCategory" ADD CONSTRAINT "GuildCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryPrimaryGuild" ADD CONSTRAINT "UserCategoryPrimaryGuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryPrimaryGuild" ADD CONSTRAINT "UserCategoryPrimaryGuild_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCategoryPrimaryGuild" ADD CONSTRAINT "UserCategoryPrimaryGuild_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;
