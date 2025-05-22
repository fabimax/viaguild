/*
  Warnings:

  - You are about to drop the column `roleId` on the `UserGuildRole` table. All the data in the column will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RolePermission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserSystemRole` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `guild_role_display_preferences` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[guildMembershipId,guildRoleId]` on the table `UserGuildRole` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `guildRoleId` to the `UserGuildRole` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_guildId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_assignedById_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserGuildRole" DROP CONSTRAINT "UserGuildRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserSystemRole" DROP CONSTRAINT "UserSystemRole_assignedById_fkey";

-- DropForeignKey
ALTER TABLE "UserSystemRole" DROP CONSTRAINT "UserSystemRole_roleId_fkey";

-- DropForeignKey
ALTER TABLE "UserSystemRole" DROP CONSTRAINT "UserSystemRole_userId_fkey";

-- DropForeignKey
ALTER TABLE "guild_role_display_preferences" DROP CONSTRAINT "guild_role_display_preferences_guildId_fkey";

-- DropForeignKey
ALTER TABLE "guild_role_display_preferences" DROP CONSTRAINT "guild_role_display_preferences_roleId_fkey";

-- DropIndex
DROP INDEX "UserGuildRole_guildMembershipId_roleId_key";

-- DropIndex
DROP INDEX "UserGuildRole_roleId_idx";

-- AlterTable
ALTER TABLE "ClusterRolePermission" ADD COLUMN     "assignedById" TEXT;

-- AlterTable
ALTER TABLE "UserGuildRole" DROP COLUMN "roleId",
ADD COLUMN     "guildRoleId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "RolePermission";

-- DropTable
DROP TABLE "UserSystemRole";

-- DropTable
DROP TABLE "guild_role_display_preferences";

-- CreateTable
CREATE TABLE "PlatformRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ci" TEXT NOT NULL,
    "description" TEXT,
    "isSystemDefined" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlatformRoleAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformRoleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    CONSTRAINT "UserPlatformRoleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformRolePermission" (
    "id" TEXT NOT NULL,
    "platformRoleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    CONSTRAINT "PlatformRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ci" TEXT NOT NULL,
    "description" TEXT,
    "guildId" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "isDefaultRole" BOOLEAN NOT NULL DEFAULT false,
    "display_color" TEXT DEFAULT '#07AABC',
    "api_visible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GuildRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildRolePermission" (
    "id" TEXT NOT NULL,
    "guildRoleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    CONSTRAINT "GuildRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildRoleSetting" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "guildRoleId" TEXT NOT NULL,
    "hierarchyOrder" INTEGER NOT NULL,
    "displaySequence" INTEGER,
    "overrideRoleName" TEXT,
    "overrideDisplayColor" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "assignedById" TEXT,

    CONSTRAINT "GuildRoleSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterRoleSetting" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "clusterRoleId" TEXT NOT NULL,
    "hierarchyOrder" INTEGER NOT NULL,
    "displaySequence" INTEGER,
    "overrideRoleName" TEXT,
    "overrideDisplayColor" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "assignedById" TEXT,

    CONSTRAINT "ClusterRoleSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_name_key" ON "PlatformRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRole_name_ci_key" ON "PlatformRole"("name_ci");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlatformRoleAssignment_userId_platformRoleId_key" ON "UserPlatformRoleAssignment"("userId", "platformRoleId");

-- CreateIndex
CREATE INDEX "PlatformRolePermission_platformRoleId_idx" ON "PlatformRolePermission"("platformRoleId");

-- CreateIndex
CREATE INDEX "PlatformRolePermission_permissionId_idx" ON "PlatformRolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformRolePermission_platformRoleId_permissionId_key" ON "PlatformRolePermission"("platformRoleId", "permissionId");

-- CreateIndex
CREATE INDEX "GuildRole_guildId_idx" ON "GuildRole"("guildId");

-- CreateIndex
CREATE INDEX "GuildRole_api_visible_idx" ON "GuildRole"("api_visible");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRole_guildId_name_ci_key" ON "GuildRole"("guildId", "name_ci");

-- CreateIndex
CREATE INDEX "GuildRolePermission_guildRoleId_idx" ON "GuildRolePermission"("guildRoleId");

-- CreateIndex
CREATE INDEX "GuildRolePermission_permissionId_idx" ON "GuildRolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRolePermission_guildRoleId_permissionId_key" ON "GuildRolePermission"("guildRoleId", "permissionId");

-- CreateIndex
CREATE INDEX "GuildRoleSetting_guildId_hierarchyOrder_idx" ON "GuildRoleSetting"("guildId", "hierarchyOrder");

-- CreateIndex
CREATE INDEX "GuildRoleSetting_guildId_displaySequence_idx" ON "GuildRoleSetting"("guildId", "displaySequence");

-- CreateIndex
CREATE INDEX "GuildRoleSetting_guildRoleId_idx" ON "GuildRoleSetting"("guildRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "GuildRoleSetting_guildId_guildRoleId_key" ON "GuildRoleSetting"("guildId", "guildRoleId");

-- CreateIndex
CREATE INDEX "ClusterRoleSetting_clusterId_hierarchyOrder_idx" ON "ClusterRoleSetting"("clusterId", "hierarchyOrder");

-- CreateIndex
CREATE INDEX "ClusterRoleSetting_clusterId_displaySequence_idx" ON "ClusterRoleSetting"("clusterId", "displaySequence");

-- CreateIndex
CREATE INDEX "ClusterRoleSetting_clusterRoleId_idx" ON "ClusterRoleSetting"("clusterRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterRoleSetting_clusterId_clusterRoleId_key" ON "ClusterRoleSetting"("clusterId", "clusterRoleId");

-- CreateIndex
CREATE INDEX "UserGuildRole_guildRoleId_idx" ON "UserGuildRole"("guildRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserGuildRole_guildMembershipId_guildRoleId_key" ON "UserGuildRole"("guildMembershipId", "guildRoleId");

-- AddForeignKey
ALTER TABLE "UserPlatformRoleAssignment" ADD CONSTRAINT "UserPlatformRoleAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformRoleAssignment" ADD CONSTRAINT "UserPlatformRoleAssignment_platformRoleId_fkey" FOREIGN KEY ("platformRoleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlatformRoleAssignment" ADD CONSTRAINT "UserPlatformRoleAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_platformRoleId_fkey" FOREIGN KEY ("platformRoleId") REFERENCES "PlatformRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformRolePermission" ADD CONSTRAINT "PlatformRolePermission_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRole" ADD CONSTRAINT "GuildRole_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRolePermission" ADD CONSTRAINT "GuildRolePermission_guildRoleId_fkey" FOREIGN KEY ("guildRoleId") REFERENCES "GuildRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRolePermission" ADD CONSTRAINT "GuildRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRolePermission" ADD CONSTRAINT "GuildRolePermission_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGuildRole" ADD CONSTRAINT "UserGuildRole_guildRoleId_fkey" FOREIGN KEY ("guildRoleId") REFERENCES "GuildRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRoleSetting" ADD CONSTRAINT "GuildRoleSetting_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRoleSetting" ADD CONSTRAINT "GuildRoleSetting_guildRoleId_fkey" FOREIGN KEY ("guildRoleId") REFERENCES "GuildRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildRoleSetting" ADD CONSTRAINT "GuildRoleSetting_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterRolePermission" ADD CONSTRAINT "ClusterRolePermission_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterRoleSetting" ADD CONSTRAINT "ClusterRoleSetting_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterRoleSetting" ADD CONSTRAINT "ClusterRoleSetting_clusterRoleId_fkey" FOREIGN KEY ("clusterRoleId") REFERENCES "ClusterRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterRoleSetting" ADD CONSTRAINT "ClusterRoleSetting_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
