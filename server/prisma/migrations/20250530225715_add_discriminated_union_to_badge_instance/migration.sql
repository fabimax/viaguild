/*
  Warnings:

  - You are about to drop the column `clusterReceiverId` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `guildGiverId` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `guildReceiverId` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `userGiverId` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `userReceiverId` on the `BadgeInstance` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "BadgeInstance" DROP CONSTRAINT "BadgeInstance_clusterReceiverId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeInstance" DROP CONSTRAINT "BadgeInstance_guildGiverId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeInstance" DROP CONSTRAINT "BadgeInstance_guildReceiverId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeInstance" DROP CONSTRAINT "BadgeInstance_userGiverId_fkey";

-- DropForeignKey
ALTER TABLE "BadgeInstance" DROP CONSTRAINT "BadgeInstance_userReceiverId_fkey";

-- DropIndex
DROP INDEX "BadgeInstance_clusterReceiverId_idx";

-- DropIndex
DROP INDEX "BadgeInstance_guildGiverId_idx";

-- DropIndex
DROP INDEX "BadgeInstance_guildReceiverId_idx";

-- DropIndex
DROP INDEX "BadgeInstance_userGiverId_idx";

-- DropIndex
DROP INDEX "BadgeInstance_userReceiverId_idx";

-- AlterTable
ALTER TABLE "BadgeInstance" DROP COLUMN "clusterReceiverId",
DROP COLUMN "guildGiverId",
DROP COLUMN "guildReceiverId",
DROP COLUMN "userGiverId",
DROP COLUMN "userReceiverId";
