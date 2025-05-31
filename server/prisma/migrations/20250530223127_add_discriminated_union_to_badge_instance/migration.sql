/*
  Warnings:

  - Added the required column `giverId` to the `BadgeInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `giverType` to the `BadgeInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverId` to the `BadgeInstance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverType` to the `BadgeInstance` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('USER', 'GUILD', 'CLUSTER');

-- AlterTable - Add columns as nullable first
ALTER TABLE "BadgeInstance" 
ADD COLUMN     "giverId" TEXT,
ADD COLUMN     "giverType" "EntityType",
ADD COLUMN     "receiverId" TEXT,
ADD COLUMN     "receiverType" "EntityType";

-- Migrate existing data
UPDATE "BadgeInstance" 
SET 
    "giverType" = CASE 
        WHEN "userGiverId" IS NOT NULL THEN 'USER'::"EntityType"
        WHEN "guildGiverId" IS NOT NULL THEN 'GUILD'::"EntityType"
    END,
    "giverId" = COALESCE("userGiverId", "guildGiverId"),
    "receiverType" = CASE 
        WHEN "userReceiverId" IS NOT NULL THEN 'USER'::"EntityType"
        WHEN "guildReceiverId" IS NOT NULL THEN 'GUILD'::"EntityType"
        WHEN "clusterReceiverId" IS NOT NULL THEN 'CLUSTER'::"EntityType"
    END,
    "receiverId" = COALESCE("userReceiverId", "guildReceiverId", "clusterReceiverId");

-- Make columns required after data migration
ALTER TABLE "BadgeInstance" 
ALTER COLUMN "giverId" SET NOT NULL,
ALTER COLUMN "giverType" SET NOT NULL,
ALTER COLUMN "receiverId" SET NOT NULL,
ALTER COLUMN "receiverType" SET NOT NULL;

-- CreateIndex
CREATE INDEX "BadgeInstance_giverType_giverId_idx" ON "BadgeInstance"("giverType", "giverId");

-- CreateIndex
CREATE INDEX "BadgeInstance_receiverType_receiverId_idx" ON "BadgeInstance"("receiverType", "receiverId");