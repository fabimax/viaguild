/*
  Warnings:

  - The values [CLUSTER] on the enum `RelationshipType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `AppRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RelationshipType_new" AS ENUM ('PARENT', 'CHILD', 'PARTNER', 'RIVAL');
ALTER TABLE "GuildRelationship" ALTER COLUMN "type" TYPE "RelationshipType_new" USING ("type"::text::"RelationshipType_new");
ALTER TYPE "RelationshipType" RENAME TO "RelationshipType_old";
ALTER TYPE "RelationshipType_new" RENAME TO "RelationshipType";
DROP TYPE "RelationshipType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "AppRole" DROP CONSTRAINT "AppRole_guildId_fkey";

-- DropForeignKey
ALTER TABLE "GuildMembership" DROP CONSTRAINT "GuildMembership_roleId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserSystemRole" DROP CONSTRAINT "UserSystemRole_roleId_fkey";

-- AlterTable
ALTER TABLE "GuildMembership" ADD COLUMN     "primarySetAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "AppRole";

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "guildId" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildBan" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "bannedUserId" TEXT NOT NULL,
    "bannedByUserId" TEXT NOT NULL,
    "reason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildBan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Role_guildId_idx" ON "Role"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_guildId_key" ON "Role"("name", "guildId");

-- CreateIndex
CREATE INDEX "GuildBan_guildId_idx" ON "GuildBan"("guildId");

-- CreateIndex
CREATE INDEX "GuildBan_bannedUserId_idx" ON "GuildBan"("bannedUserId");

-- CreateIndex
CREATE INDEX "GuildBan_bannedByUserId_idx" ON "GuildBan"("bannedByUserId");

-- CreateIndex
CREATE INDEX "GuildBan_isActive_idx" ON "GuildBan"("isActive");

-- CreateIndex
CREATE INDEX "GuildBan_expiresAt_idx" ON "GuildBan"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "GuildBan_guildId_bannedUserId_key" ON "GuildBan"("guildId", "bannedUserId");

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSystemRole" ADD CONSTRAINT "UserSystemRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMembership" ADD CONSTRAINT "GuildMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBan" ADD CONSTRAINT "GuildBan_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBan" ADD CONSTRAINT "GuildBan_bannedUserId_fkey" FOREIGN KEY ("bannedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildBan" ADD CONSTRAINT "GuildBan_bannedByUserId_fkey" FOREIGN KEY ("bannedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
