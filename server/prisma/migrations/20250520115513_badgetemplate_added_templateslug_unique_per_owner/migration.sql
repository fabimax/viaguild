/*
  Warnings:

  - A unique constraint covering the columns `[ownedByUserId,templateSlug]` on the table `BadgeTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownedByGuildId,templateSlug]` on the table `BadgeTemplate` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `templateSlug` to the `BadgeTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "BadgeTemplate" ADD COLUMN     "templateSlug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTemplate_ownedByUserId_templateSlug_key" ON "BadgeTemplate"("ownedByUserId", "templateSlug");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTemplate_ownedByGuildId_templateSlug_key" ON "BadgeTemplate"("ownedByGuildId", "templateSlug");
