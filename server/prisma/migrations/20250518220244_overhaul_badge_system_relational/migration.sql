/*
  Warnings:

  - You are about to drop the column `borderColor` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `creatorUserId` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `shapeType` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `tier` on the `BadgeTemplate` table. All the data in the column will be lost.
  - Added the required column `defaultBackgroundValue` to the `BadgeTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defaultBadgeName` to the `BadgeTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `defaultForegroundValue` to the `BadgeTemplate` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BackgroundContentType" AS ENUM ('SOLID_COLOR', 'HOSTED_IMAGE');

-- CreateEnum
CREATE TYPE "ForegroundContentType" AS ENUM ('TEXT', 'SYSTEM_ICON', 'UPLOADED_ICON');

-- AlterEnum
ALTER TYPE "BadgeShape" ADD VALUE 'SQUARE';

-- DropForeignKey
ALTER TABLE "BadgeTemplate" DROP CONSTRAINT "BadgeTemplate_creatorUserId_fkey";

-- DropIndex
DROP INDEX "BadgeTemplate_creatorUserId_idx";

-- AlterTable
ALTER TABLE "BadgeInstance" ADD COLUMN     "credentialValue" DOUBLE PRECISION,
ADD COLUMN     "overrideBackgroundType" "BackgroundContentType",
ADD COLUMN     "overrideBackgroundValue" TEXT,
ADD COLUMN     "overrideBadgeName" TEXT,
ADD COLUMN     "overrideBorderColor" TEXT,
ADD COLUMN     "overrideDisplayDescription" TEXT,
ADD COLUMN     "overrideForegroundColor" TEXT,
ADD COLUMN     "overrideForegroundType" "ForegroundContentType",
ADD COLUMN     "overrideForegroundValue" TEXT,
ADD COLUMN     "overrideOuterShape" "BadgeShape",
ADD COLUMN     "overrideSubtitle" TEXT,
ADD COLUMN     "overrideTextFont" TEXT,
ADD COLUMN     "overrideTextSize" INTEGER;

-- AlterTable
ALTER TABLE "BadgeTemplate" DROP COLUMN "borderColor",
DROP COLUMN "creatorUserId",
DROP COLUMN "description",
DROP COLUMN "imageUrl",
DROP COLUMN "name",
DROP COLUMN "shapeType",
DROP COLUMN "tier",
ADD COLUMN     "allowsPushedInstanceUpdates" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "authoredByUserId" TEXT,
ADD COLUMN     "credentialBest" DOUBLE PRECISION,
ADD COLUMN     "credentialIsNormalizable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "credentialLabel" TEXT,
ADD COLUMN     "credentialNotes" TEXT,
ADD COLUMN     "credentialWorst" DOUBLE PRECISION,
ADD COLUMN     "defaultBackgroundType" "BackgroundContentType" NOT NULL DEFAULT 'SOLID_COLOR',
ADD COLUMN     "defaultBackgroundValue" TEXT NOT NULL,
ADD COLUMN     "defaultBadgeName" TEXT NOT NULL,
ADD COLUMN     "defaultBorderColor" TEXT NOT NULL DEFAULT '#000000',
ADD COLUMN     "defaultDisplayDescription" TEXT,
ADD COLUMN     "defaultForegroundColor" TEXT,
ADD COLUMN     "defaultForegroundType" "ForegroundContentType" NOT NULL DEFAULT 'SYSTEM_ICON',
ADD COLUMN     "defaultForegroundValue" TEXT NOT NULL,
ADD COLUMN     "defaultOuterShape" "BadgeShape" NOT NULL DEFAULT 'CIRCLE',
ADD COLUMN     "defaultSubtitleText" TEXT,
ADD COLUMN     "defaultTextFont" TEXT,
ADD COLUMN     "defaultTextSize" INTEGER,
ADD COLUMN     "definesCredential" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inherentTier" "BadgeTier",
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isModifiableByIssuer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ownedByUserId" TEXT;

-- CreateTable
CREATE TABLE "MetadataFieldDefinition" (
    "id" TEXT NOT NULL,
    "badgeTemplateId" TEXT NOT NULL,
    "fieldKeyForInstanceData" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "prefix" TEXT,
    "suffix" TEXT,
    "style" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MetadataFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstanceMetadataValue" (
    "id" TEXT NOT NULL,
    "badgeInstanceId" TEXT NOT NULL,
    "dataKey" TEXT NOT NULL,
    "dataValue" TEXT NOT NULL,

    CONSTRAINT "InstanceMetadataValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedAsset" (
    "id" TEXT NOT NULL,
    "uploaderId" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "hostedUrl" TEXT NOT NULL,
    "storageIdentifier" TEXT NOT NULL,
    "assetType" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemIcon" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "svgContent" TEXT,
    "assetId" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemIcon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetadataFieldDefinition_badgeTemplateId_displayOrder_idx" ON "MetadataFieldDefinition"("badgeTemplateId", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MetadataFieldDefinition_badgeTemplateId_fieldKeyForInstance_key" ON "MetadataFieldDefinition"("badgeTemplateId", "fieldKeyForInstanceData");

-- CreateIndex
CREATE INDEX "InstanceMetadataValue_badgeInstanceId_idx" ON "InstanceMetadataValue"("badgeInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "InstanceMetadataValue_badgeInstanceId_dataKey_key" ON "InstanceMetadataValue"("badgeInstanceId", "dataKey");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedAsset_hostedUrl_key" ON "UploadedAsset"("hostedUrl");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedAsset_storageIdentifier_key" ON "UploadedAsset"("storageIdentifier");

-- CreateIndex
CREATE INDEX "UploadedAsset_uploaderId_idx" ON "UploadedAsset"("uploaderId");

-- CreateIndex
CREATE INDEX "UploadedAsset_assetType_idx" ON "UploadedAsset"("assetType");

-- CreateIndex
CREATE INDEX "UploadedAsset_hostedUrl_idx" ON "UploadedAsset"("hostedUrl");

-- CreateIndex
CREATE UNIQUE INDEX "SystemIcon_name_key" ON "SystemIcon"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SystemIcon_assetId_key" ON "SystemIcon"("assetId");

-- CreateIndex
CREATE INDEX "SystemIcon_name_idx" ON "SystemIcon"("name");

-- CreateIndex
CREATE INDEX "SystemIcon_category_idx" ON "SystemIcon"("category");

-- CreateIndex
CREATE INDEX "SystemIcon_isAvailable_idx" ON "SystemIcon"("isAvailable");

-- CreateIndex
CREATE INDEX "BadgeInstance_credentialValue_idx" ON "BadgeInstance"("credentialValue");

-- CreateIndex
CREATE INDEX "BadgeTemplate_authoredByUserId_idx" ON "BadgeTemplate"("authoredByUserId");

-- CreateIndex
CREATE INDEX "BadgeTemplate_ownedByUserId_idx" ON "BadgeTemplate"("ownedByUserId");

-- CreateIndex
CREATE INDEX "BadgeTemplate_isArchived_idx" ON "BadgeTemplate"("isArchived");

-- CreateIndex
CREATE INDEX "BadgeTemplate_isModifiableByIssuer_idx" ON "BadgeTemplate"("isModifiableByIssuer");

-- CreateIndex
CREATE INDEX "BadgeTemplate_allowsPushedInstanceUpdates_idx" ON "BadgeTemplate"("allowsPushedInstanceUpdates");

-- CreateIndex
CREATE INDEX "BadgeTemplate_inherentTier_idx" ON "BadgeTemplate"("inherentTier");

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_authoredByUserId_fkey" FOREIGN KEY ("authoredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_ownedByUserId_fkey" FOREIGN KEY ("ownedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetadataFieldDefinition" ADD CONSTRAINT "MetadataFieldDefinition_badgeTemplateId_fkey" FOREIGN KEY ("badgeTemplateId") REFERENCES "BadgeTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstanceMetadataValue" ADD CONSTRAINT "InstanceMetadataValue_badgeInstanceId_fkey" FOREIGN KEY ("badgeInstanceId") REFERENCES "BadgeInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedAsset" ADD CONSTRAINT "UploadedAsset_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemIcon" ADD CONSTRAINT "SystemIcon_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UploadedAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
