-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('UPLOADING', 'PROCESSING', 'TEMP', 'PERMANENT', 'DELETED');

-- AlterTable
ALTER TABLE "BadgeInstance" ADD COLUMN     "overrideForegroundColorConfig" JSONB;

-- AlterTable
ALTER TABLE "BadgeTemplate" ADD COLUMN     "defaultForegroundColorConfig" JSONB;

-- AlterTable
ALTER TABLE "UploadedAsset" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'PERMANENT';

-- CreateIndex
CREATE INDEX "UploadedAsset_status_expiresAt_idx" ON "UploadedAsset"("status", "expiresAt");
