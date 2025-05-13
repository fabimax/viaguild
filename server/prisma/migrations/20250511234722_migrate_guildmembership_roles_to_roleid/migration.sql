/*
  Warnings:

  - You are about to drop the column `role` on the `GuildMembership` table. All the data in the column will be lost.
  - Added the required column `roleId` to the `GuildMembership` table without a default value. This is not possible if the table is not empty.

*/
-- Phase 1 Migration Edit (from PrismaSchemaMigrationPlan.md):
-- Detailed steps for transforming GuildMembership.role to GuildMembership.roleId

-- Step 1: Add the new roleId column as nullable initially.
ALTER TABLE "GuildMembership"
ADD COLUMN     "roleId" TEXT;

-- Step 2: Populate the new roleId column from the old text-based role column.
-- This maps the string role names (OWNER, ADMIN, MEMBER) to the IDs of the corresponding system AppRoles.
DO $$
DECLARE
    owner_role_id TEXT;
    admin_role_id TEXT;
    member_role_id TEXT;
BEGIN
    -- Get the IDs of the system roles from AppRole table
    SELECT id INTO owner_role_id FROM "AppRole" WHERE name = 'OWNER' AND "isSystemRole" = true AND "guildId" IS NULL;
    SELECT id INTO admin_role_id FROM "AppRole" WHERE name = 'ADMIN' AND "isSystemRole" = true AND "guildId" IS NULL;
    SELECT id INTO member_role_id FROM "AppRole" WHERE name = 'MEMBER' AND "isSystemRole" = true AND "guildId" IS NULL;

    -- Update GuildMembership based on the old role string
    UPDATE "GuildMembership"
    SET "roleId" = CASE "role"
                        WHEN 'OWNER' THEN owner_role_id
                        WHEN 'ADMIN' THEN admin_role_id
                        WHEN 'MEMBER' THEN member_role_id
                        ELSE NULL -- Or handle error/default if a role string doesn't match
                    END
    WHERE "roleId" IS NULL; -- Only update if not already set (though it shouldn't be)

    -- Optional: Add a check here for any rows where roleId is still NULL and handle them.
    -- For now, we assume all existing roles are OWNER, ADMIN, or MEMBER.
    IF EXISTS (SELECT 1 FROM "GuildMembership" WHERE "roleId" IS NULL AND "role" IS NOT NULL) THEN
        RAISE WARNING 'Some GuildMembership records had role strings that did not map to a system AppRole (OWNER, ADMIN, MEMBER). Their roleId is NULL.';
    END IF;
END;
$$;

-- Step 3: Now that roleId is populated, alter it to be NOT NULL.
-- If any roleId is still NULL from Step 2 (due to unmapped roles), this will fail.
-- This highlights data integrity issues that would need to be fixed before this step.
ALTER TABLE "GuildMembership"
ALTER COLUMN "roleId" SET NOT NULL;

-- Step 4: Create an index on the new roleId column.
CREATE INDEX "GuildMembership_roleId_idx" ON "GuildMembership"("roleId");

-- Step 5: Add the foreign key constraint from GuildMembership.roleId to AppRole.id.
ALTER TABLE "GuildMembership"
ADD CONSTRAINT "GuildMembership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "AppRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 6: Now that data is migrated to roleId and FK is in place, drop the old text-based role column.
ALTER TABLE "GuildMembership"
DROP COLUMN "role";

-- Step 7: Finally, drop the old Role enum as it's no longer used by any column.
DROP TYPE "Role";
