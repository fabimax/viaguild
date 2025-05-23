-- AlterTable
ALTER TABLE "BadgeInstance" ADD COLUMN     "overrideMeasureBest" DOUBLE PRECISION,
ADD COLUMN     "overrideMeasureBestLabel" TEXT,
ADD COLUMN     "overrideMeasureIsNormalizable" BOOLEAN,
ADD COLUMN     "overrideMeasureWorst" DOUBLE PRECISION,
ADD COLUMN     "overrideMeasureWorstLabel" TEXT;

-- AlterTable
ALTER TABLE "BadgeTemplate" ADD COLUMN     "higherIsBetter" BOOLEAN,
ADD COLUMN     "measureBestLabel" TEXT,
ADD COLUMN     "measureWorstLabel" TEXT;
