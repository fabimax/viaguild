/*
  Warnings:

  - You are about to drop the column `overrideBackgroundType` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideBackgroundValue` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideBorderColor` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideForegroundColor` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideForegroundColorConfig` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideForegroundType` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideForegroundValue` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideTextFont` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `overrideTextSize` on the `BadgeInstance` table. All the data in the column will be lost.
  - You are about to drop the column `defaultBackgroundType` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultBackgroundValue` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultBorderColor` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultForegroundColor` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultForegroundColorConfig` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultForegroundType` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultForegroundValue` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultTextFont` on the `BadgeTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `defaultTextSize` on the `BadgeTemplate` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BadgeInstance" DROP COLUMN "overrideBackgroundType",
DROP COLUMN "overrideBackgroundValue",
DROP COLUMN "overrideBorderColor",
DROP COLUMN "overrideForegroundColor",
DROP COLUMN "overrideForegroundColorConfig",
DROP COLUMN "overrideForegroundType",
DROP COLUMN "overrideForegroundValue",
DROP COLUMN "overrideTextFont",
DROP COLUMN "overrideTextSize";

-- AlterTable
ALTER TABLE "BadgeTemplate" DROP COLUMN "defaultBackgroundType",
DROP COLUMN "defaultBackgroundValue",
DROP COLUMN "defaultBorderColor",
DROP COLUMN "defaultForegroundColor",
DROP COLUMN "defaultForegroundColorConfig",
DROP COLUMN "defaultForegroundType",
DROP COLUMN "defaultForegroundValue",
DROP COLUMN "defaultTextFont",
DROP COLUMN "defaultTextSize";

-- DropEnum
DROP TYPE "BackgroundContentType";

-- DropEnum
DROP TYPE "ForegroundContentType";
