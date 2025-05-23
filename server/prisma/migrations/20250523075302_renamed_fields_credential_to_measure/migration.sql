/*
  Warnings:

  - You are about to drop the column `credentialValue` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `credentialBest` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `credentialIsNormalizable` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `credentialLabel` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `credentialNotes` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `credentialWorst` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `definesCredential` on the `BadgeTemplate` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "BadgeInstance_credentialValue_idx";

-- AlterTable
ALTER TABLE "BadgeInstance" DROP COLUMN "credentialValue",
ADD COLUMN     "measureValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "BadgeTemplate" DROP COLUMN "credentialBest",
DROP COLUMN "credentialIsNormalizable",
DROP COLUMN "credentialLabel",
DROP COLUMN "credentialNotes",
DROP COLUMN "credentialWorst",
DROP COLUMN "definesCredential",
ADD COLUMN     "definesMeasure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "measureBest" DOUBLE PRECISION,
ADD COLUMN     "measureIsNormalizable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "measureLabel" TEXT,
ADD COLUMN     "measureNotes" TEXT,
ADD COLUMN     "measureWorst" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "BadgeInstance_measureValue_idx" ON "BadgeInstance"("measureValue");
