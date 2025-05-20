-- CreateEnum
CREATE TYPE "BadgeAwardStatus" AS ENUM ('PENDING_ACCEPTANCE', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "BadgeInstance" ADD COLUMN     "apiVisible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "awardStatus" "BadgeAwardStatus" NOT NULL DEFAULT 'PENDING_ACCEPTANCE';

-- AlterTable
ALTER TABLE "Role" ADD COLUMN     "api_visible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "display_color" TEXT DEFAULT '##20C3D5';

-- CreateTable
CREATE TABLE "guild_role_display_preferences" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "displayPriority" INTEGER NOT NULL,

    CONSTRAINT "guild_role_display_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guild_role_display_preferences_guildId_displayPriority_idx" ON "guild_role_display_preferences"("guildId", "displayPriority");

-- CreateIndex
CREATE INDEX "guild_role_display_preferences_roleId_idx" ON "guild_role_display_preferences"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "guild_role_display_preferences_guildId_roleId_key" ON "guild_role_display_preferences"("guildId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "guild_role_display_preferences_guildId_displayPriority_key" ON "guild_role_display_preferences"("guildId", "displayPriority");

-- CreateIndex
CREATE INDEX "BadgeInstance_awardStatus_idx" ON "BadgeInstance"("awardStatus");

-- CreateIndex
CREATE INDEX "BadgeInstance_apiVisible_idx" ON "BadgeInstance"("apiVisible");

-- CreateIndex
CREATE INDEX "Role_api_visible_idx" ON "Role"("api_visible");

-- AddForeignKey
ALTER TABLE "guild_role_display_preferences" ADD CONSTRAINT "guild_role_display_preferences_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_role_display_preferences" ADD CONSTRAINT "guild_role_display_preferences_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
