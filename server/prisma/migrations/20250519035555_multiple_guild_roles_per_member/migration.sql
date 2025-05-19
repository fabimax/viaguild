/*
  Warnings:

  - You are about to drop the column `roleId` on the `GuildMembership` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "GuildMembership" DROP CONSTRAINT "GuildMembership_roleId_fkey";

-- DropIndex
DROP INDEX "GuildMembership_roleId_idx";

-- AlterTable
ALTER TABLE "GuildMembership" DROP COLUMN "roleId";

-- CreateTable
CREATE TABLE "UserGuildRole" (
    "id" TEXT NOT NULL,
    "guildMembershipId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGuildRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserGuildRole_guildMembershipId_idx" ON "UserGuildRole"("guildMembershipId");

-- CreateIndex
CREATE INDEX "UserGuildRole_roleId_idx" ON "UserGuildRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGuildRole_guildMembershipId_roleId_key" ON "UserGuildRole"("guildMembershipId", "roleId");

-- AddForeignKey
ALTER TABLE "UserGuildRole" ADD CONSTRAINT "UserGuildRole_guildMembershipId_fkey" FOREIGN KEY ("guildMembershipId") REFERENCES "GuildMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuildRole" ADD CONSTRAINT "UserGuildRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
