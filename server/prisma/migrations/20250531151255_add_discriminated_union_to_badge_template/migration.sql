-- AlterTable - Add columns as nullable first
ALTER TABLE "BadgeTemplate" 
ADD COLUMN     "ownerId" TEXT,
ADD COLUMN     "ownerType" "EntityType";

-- Migrate existing data
UPDATE "BadgeTemplate" 
SET 
    "ownerType" = CASE 
        WHEN "ownedByUserId" IS NOT NULL THEN 'USER'::"EntityType"
        WHEN "ownedByGuildId" IS NOT NULL THEN 'GUILD'::"EntityType"
    END,
    "ownerId" = COALESCE("ownedByUserId", "ownedByGuildId");

-- Note: We're keeping the fields nullable because system templates have no owner
-- (both ownerType and ownerId will be NULL for system templates)

-- CreateIndex
CREATE INDEX "BadgeTemplate_ownerType_ownerId_idx" ON "BadgeTemplate"("ownerType", "ownerId");