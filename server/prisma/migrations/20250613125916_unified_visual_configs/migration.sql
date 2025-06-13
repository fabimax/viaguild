-- AlterTable
ALTER TABLE "BadgeInstance" ADD COLUMN     "overrideBackgroundConfig" JSONB,
ADD COLUMN     "overrideBorderConfig" JSONB,
ADD COLUMN     "overrideForegroundConfig" JSONB;

-- AlterTable
ALTER TABLE "BadgeTemplate" ADD COLUMN     "defaultBackgroundConfig" JSONB,
ADD COLUMN     "defaultBorderConfig" JSONB,
ADD COLUMN     "defaultForegroundConfig" JSONB;
