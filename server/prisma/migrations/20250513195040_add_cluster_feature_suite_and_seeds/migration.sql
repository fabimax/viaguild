/*
  Warnings:

  - A unique constraint covering the columns `[primaryClusterId]` on the table `Guild` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[badgeInstanceId]` on the table `UserBadgeItem` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "BadgeInstance" ADD COLUMN     "clusterReceiverId" TEXT;

-- AlterTable
ALTER TABLE "Guild" ADD COLUMN     "primaryClusterId" TEXT;

-- CreateTable
CREATE TABLE "Cluster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "avatar" TEXT,
    "isOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cluster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterMembership" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClusterMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterRole" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clusterId" TEXT,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClusterRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserClusterRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "clusterRoleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserClusterRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterBadgeCase" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "featuredBadgeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClusterBadgeCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterBadgeItem" (
    "id" TEXT NOT NULL,
    "badgeCaseId" TEXT NOT NULL,
    "badgeInstanceId" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClusterBadgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterContact" (
    "id" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "label" TEXT,
    "value" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClusterContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClusterRolePermission" (
    "id" TEXT NOT NULL,
    "clusterRoleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClusterRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_name_key" ON "Cluster"("name");

-- CreateIndex
CREATE INDEX "Cluster_name_idx" ON "Cluster"("name");

-- CreateIndex
CREATE INDEX "ClusterMembership_guildId_idx" ON "ClusterMembership"("guildId");

-- CreateIndex
CREATE INDEX "ClusterMembership_clusterId_idx" ON "ClusterMembership"("clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterMembership_guildId_clusterId_key" ON "ClusterMembership"("guildId", "clusterId");

-- CreateIndex
CREATE INDEX "ClusterRole_clusterId_idx" ON "ClusterRole"("clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterRole_name_clusterId_key" ON "ClusterRole"("name", "clusterId");

-- CreateIndex
CREATE INDEX "UserClusterRole_userId_idx" ON "UserClusterRole"("userId");

-- CreateIndex
CREATE INDEX "UserClusterRole_clusterId_idx" ON "UserClusterRole"("clusterId");

-- CreateIndex
CREATE INDEX "UserClusterRole_clusterRoleId_idx" ON "UserClusterRole"("clusterRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserClusterRole_userId_clusterId_clusterRoleId_key" ON "UserClusterRole"("userId", "clusterId", "clusterRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterBadgeCase_clusterId_key" ON "ClusterBadgeCase"("clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterBadgeCase_featuredBadgeId_key" ON "ClusterBadgeCase"("featuredBadgeId");

-- CreateIndex
CREATE INDEX "ClusterBadgeItem_badgeCaseId_displayOrder_idx" ON "ClusterBadgeItem"("badgeCaseId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterBadgeItem_badgeCaseId_badgeInstanceId_key" ON "ClusterBadgeItem"("badgeCaseId", "badgeInstanceId");

-- CreateIndex
CREATE INDEX "ClusterContact_clusterId_displayOrder_idx" ON "ClusterContact"("clusterId", "displayOrder");

-- CreateIndex
CREATE INDEX "ClusterRolePermission_clusterRoleId_idx" ON "ClusterRolePermission"("clusterRoleId");

-- CreateIndex
CREATE INDEX "ClusterRolePermission_permissionId_idx" ON "ClusterRolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterRolePermission_clusterRoleId_permissionId_key" ON "ClusterRolePermission"("clusterRoleId", "permissionId");

-- CreateIndex
CREATE INDEX "BadgeInstance_clusterReceiverId_idx" ON "BadgeInstance"("clusterReceiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_primaryClusterId_key" ON "Guild"("primaryClusterId");

-- CreateIndex
CREATE INDEX "Guild_primaryClusterId_idx" ON "Guild"("primaryClusterId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBadgeItem_badgeInstanceId_key" ON "UserBadgeItem"("badgeInstanceId");

-- AddForeignKey
ALTER TABLE "Guild" ADD CONSTRAINT "Guild_primaryClusterId_fkey" FOREIGN KEY ("primaryClusterId") REFERENCES "Cluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeInstance" ADD CONSTRAINT "BadgeInstance_clusterReceiverId_fkey" FOREIGN KEY ("clusterReceiverId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cluster" ADD CONSTRAINT "Cluster_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterMembership" ADD CONSTRAINT "ClusterMembership_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterMembership" ADD CONSTRAINT "ClusterMembership_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterRole" ADD CONSTRAINT "ClusterRole_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClusterRole" ADD CONSTRAINT "UserClusterRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClusterRole" ADD CONSTRAINT "UserClusterRole_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserClusterRole" ADD CONSTRAINT "UserClusterRole_clusterRoleId_fkey" FOREIGN KEY ("clusterRoleId") REFERENCES "ClusterRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterBadgeCase" ADD CONSTRAINT "ClusterBadgeCase_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterBadgeCase" ADD CONSTRAINT "ClusterBadgeCase_featuredBadgeId_fkey" FOREIGN KEY ("featuredBadgeId") REFERENCES "ClusterBadgeItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterBadgeItem" ADD CONSTRAINT "ClusterBadgeItem_badgeCaseId_fkey" FOREIGN KEY ("badgeCaseId") REFERENCES "ClusterBadgeCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterBadgeItem" ADD CONSTRAINT "ClusterBadgeItem_badgeInstanceId_fkey" FOREIGN KEY ("badgeInstanceId") REFERENCES "BadgeInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterContact" ADD CONSTRAINT "ClusterContact_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "Cluster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterRolePermission" ADD CONSTRAINT "ClusterRolePermission_clusterRoleId_fkey" FOREIGN KEY ("clusterRoleId") REFERENCES "ClusterRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClusterRolePermission" ADD CONSTRAINT "ClusterRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
