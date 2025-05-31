/*
  Warnings:

  - You are about to drop the column `ownedByGuildId` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `ownedByUserId` on the `BadgeTemplate` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BadgeTemplate" DROP CONSTRAINT "BadgeTemplate_ownedByGuildId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeTemplate" DROP CONSTRAINT "BadgeTemplate_ownedByUserId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "BadgeTemplate_ownedByGuildId_idx";

-- DropIndex
DROP INDEX IF EXISTS "BadgeTemplate_ownedByUserId_idx";

-- DropIndex
DROP INDEX IF EXISTS "unique_guild_template_slug_ci";

-- DropIndex
DROP INDEX IF EXISTS "unique_user_template_slug_ci";

-- AlterTable
ALTER TABLE "BadgeTemplate" DROP COLUMN "ownedByGuildId",
DROP COLUMN "ownedByUserId";