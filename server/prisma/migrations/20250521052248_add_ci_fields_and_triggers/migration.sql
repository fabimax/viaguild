/*
  Warnings:

  - A unique constraint covering the columns `[ownedByUserId,templateSlug_ci]` on the table `BadgeTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[ownedByGuildId,templateSlug_ci]` on the table `BadgeTemplate` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name_ci]` on the table `Category` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name_ci]` on the table `Cluster` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clusterId,name_ci]` on the table `ClusterRole` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name_ci]` on the table `Guild` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[guildId,targetUserHandle_ci,platform]` on the table `GuildDirectInvitation` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[guildId,name_ci]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email_ci]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[username_ci]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `templateSlug_ci` to the `BadgeTemplate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_ci` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_ci` to the `Cluster` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_ci` to the `ClusterRole` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_ci` to the `Guild` table without a default value. This is not possible if the table is not empty.
  - Added the required column `targetUserHandle_ci` to the `GuildDirectInvitation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name_ci` to the `Role` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email_ci` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username_ci` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BadgeTemplate_ownedByGuildId_templateSlug_key";

-- DropIndex
DROP INDEX "BadgeTemplate_ownedByUserId_templateSlug_key";

-- DropIndex
DROP INDEX "ClusterRole_name_clusterId_key";

-- DropIndex
DROP INDEX "GuildDirectInvitation_guildId_targetUserHandle_platform_key";

-- DropIndex
DROP INDEX "Role_name_guildId_key";

-- AlterTable - Add columns as nullable first
ALTER TABLE "BadgeTemplate" ADD COLUMN     "templateSlug_ci" TEXT;
ALTER TABLE "Category" ADD COLUMN     "name_ci" TEXT;
ALTER TABLE "Cluster" ADD COLUMN     "name_ci" TEXT;
ALTER TABLE "ClusterRole" ADD COLUMN     "name_ci" TEXT;
ALTER TABLE "Guild" ADD COLUMN     "name_ci" TEXT;
ALTER TABLE "GuildDirectInvitation" ADD COLUMN     "targetUserHandle_ci" TEXT;
ALTER TABLE "Role" ADD COLUMN     "name_ci" TEXT;
ALTER TABLE "SocialAccount" ADD COLUMN     "username_ci" TEXT;
ALTER TABLE "User" ADD COLUMN     "email_ci" TEXT,
ADD COLUMN     "username_ci" TEXT;

-- Step 1: UPDATE existing rows to populate the new _ci columns
-- It's good practice to ensure the original column is not null before LOWER()
-- although for most of these, they are likely NOT NULL in your schema.

UPDATE "User" SET "email_ci" = LOWER("email") WHERE "email_ci" IS NULL AND "email" IS NOT NULL;
UPDATE "User" SET "username_ci" = LOWER("username") WHERE "username_ci" IS NULL AND "username" IS NOT NULL;
UPDATE "Guild" SET "name_ci" = LOWER("name") WHERE "name_ci" IS NULL AND "name" IS NOT NULL;
UPDATE "Cluster" SET "name_ci" = LOWER("name") WHERE "name_ci" IS NULL AND "name" IS NOT NULL;
UPDATE "Category" SET "name_ci" = LOWER("name") WHERE "name_ci" IS NULL AND "name" IS NOT NULL;
UPDATE "Role" SET "name_ci" = LOWER("name") WHERE "name_ci" IS NULL AND "name" IS NOT NULL;
UPDATE "ClusterRole" SET "name_ci" = LOWER("name") WHERE "name_ci" IS NULL AND "name" IS NOT NULL;
UPDATE "BadgeTemplate" SET "templateSlug_ci" = LOWER("templateSlug") WHERE "templateSlug_ci" IS NULL AND "templateSlug" IS NOT NULL;
UPDATE "GuildDirectInvitation" SET "targetUserHandle_ci" = LOWER("targetUserHandle") WHERE "targetUserHandle_ci" IS NULL AND "targetUserHandle" IS NOT NULL;
UPDATE "SocialAccount" SET "username_ci" = LOWER("username") WHERE "username_ci" IS NULL AND "username" IS NOT NULL;

-- Set columns to NOT NULL after populating them
ALTER TABLE "BadgeTemplate" ALTER COLUMN "templateSlug_ci" SET NOT NULL;
ALTER TABLE "Category" ALTER COLUMN "name_ci" SET NOT NULL;
ALTER TABLE "Cluster" ALTER COLUMN "name_ci" SET NOT NULL;
ALTER TABLE "ClusterRole" ALTER COLUMN "name_ci" SET NOT NULL;
ALTER TABLE "Guild" ALTER COLUMN "name_ci" SET NOT NULL;
ALTER TABLE "GuildDirectInvitation" ALTER COLUMN "targetUserHandle_ci" SET NOT NULL;
ALTER TABLE "Role" ALTER COLUMN "name_ci" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "email_ci" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "username_ci" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTemplate_ownedByUserId_templateSlug_ci_key" ON "BadgeTemplate"("ownedByUserId", "templateSlug_ci");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTemplate_ownedByGuildId_templateSlug_ci_key" ON "BadgeTemplate"("ownedByGuildId", "templateSlug_ci");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_ci_key" ON "Category"("name_ci");

-- CreateIndex
CREATE UNIQUE INDEX "Cluster_name_ci_key" ON "Cluster"("name_ci");

-- CreateIndex
CREATE UNIQUE INDEX "ClusterRole_clusterId_name_ci_key" ON "ClusterRole"("clusterId", "name_ci");

-- CreateIndex
CREATE UNIQUE INDEX "Guild_name_ci_key" ON "Guild"("name_ci");

-- CreateIndex
CREATE UNIQUE INDEX "GuildDirectInvitation_guildId_targetUserHandle_ci_platform_key" ON "GuildDirectInvitation"("guildId", "targetUserHandle_ci", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Role_guildId_name_ci_key" ON "Role"("guildId", "name_ci");

-- CreateIndex
CREATE INDEX "SocialAccount_username_ci_idx" ON "SocialAccount"("username_ci");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_ci_key" ON "User"("email_ci");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_ci_key" ON "User"("username_ci");


-- Step 2: Define Trigger Functions and Create Triggers

-- Trigger for User table
CREATE OR REPLACE FUNCTION populate_user_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email_ci = LOWER(NEW.email);
  ELSE
    NEW.email_ci = NULL;
  END IF;
  IF NEW.username IS NOT NULL THEN
    NEW.username_ci = LOWER(NEW.username);
  ELSE
    NEW.username_ci = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_populate_ci_fields
BEFORE INSERT OR UPDATE ON "User"
FOR EACH ROW
EXECUTE FUNCTION populate_user_ci_fields();

-- Trigger for Guild table
CREATE OR REPLACE FUNCTION populate_guild_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name_ci = LOWER(NEW.name);
  ELSE
    NEW.name_ci = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_guild_populate_ci_fields
BEFORE INSERT OR UPDATE ON "Guild"
FOR EACH ROW
EXECUTE FUNCTION populate_guild_ci_fields();

-- Trigger for Cluster table
CREATE OR REPLACE FUNCTION populate_cluster_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name_ci = LOWER(NEW.name);
  ELSE
    NEW.name_ci = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cluster_populate_ci_fields
BEFORE INSERT OR UPDATE ON "Cluster"
FOR EACH ROW
EXECUTE FUNCTION populate_cluster_ci_fields();

-- Trigger for Category table
CREATE OR REPLACE FUNCTION populate_category_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name_ci = LOWER(NEW.name);
  ELSE
    NEW.name_ci = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_category_populate_ci_fields
BEFORE INSERT OR UPDATE ON "Category"
FOR EACH ROW
EXECUTE FUNCTION populate_category_ci_fields();

-- Trigger for Role table
CREATE OR REPLACE FUNCTION populate_role_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name_ci = LOWER(NEW.name);
  ELSE
    NEW.name_ci = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_role_populate_ci_fields
BEFORE INSERT OR UPDATE ON "Role"
FOR EACH ROW
EXECUTE FUNCTION populate_role_ci_fields();

-- Trigger for ClusterRole table
CREATE OR REPLACE FUNCTION populate_clusterrole_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name_ci = LOWER(NEW.name);
  ELSE
    NEW.name_ci = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_clusterrole_populate_ci_fields
BEFORE INSERT OR UPDATE ON "ClusterRole"
FOR EACH ROW
EXECUTE FUNCTION populate_clusterrole_ci_fields();

-- Trigger for BadgeTemplate table
CREATE OR REPLACE FUNCTION populate_badgetemplate_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."templateSlug" IS NOT NULL THEN
    NEW."templateSlug_ci" = LOWER(NEW."templateSlug");
  ELSE
    NEW."templateSlug_ci" = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_badgetemplate_populate_ci_fields
BEFORE INSERT OR UPDATE ON "BadgeTemplate"
FOR EACH ROW
EXECUTE FUNCTION populate_badgetemplate_ci_fields();

-- Trigger for GuildDirectInvitation table
CREATE OR REPLACE FUNCTION populate_guilddirectinvitation_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."targetUserHandle" IS NOT NULL THEN
    NEW."targetUserHandle_ci" = LOWER(NEW."targetUserHandle");
  ELSE
    NEW."targetUserHandle_ci" = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_guilddirectinvitation_populate_ci_fields
BEFORE INSERT OR UPDATE ON "GuildDirectInvitation"
FOR EACH ROW
EXECUTE FUNCTION populate_guilddirectinvitation_ci_fields();

-- Trigger for SocialAccount table
CREATE OR REPLACE FUNCTION populate_socialaccount_ci_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.username IS NOT NULL THEN
    NEW.username_ci = LOWER(NEW.username);
  ELSE
    NEW.username_ci = NULL; -- username_ci in SocialAccount is nullable
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_socialaccount_populate_ci_fields
BEFORE INSERT OR UPDATE ON "SocialAccount"
FOR EACH ROW
EXECUTE FUNCTION populate_socialaccount_ci_fields();
