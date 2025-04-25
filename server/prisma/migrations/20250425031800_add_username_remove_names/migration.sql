-- Add username column as nullable first
ALTER TABLE "User" ADD COLUMN "username" TEXT;

-- Update existing users with a username derived from their email
UPDATE "User" SET "username" = SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1);

-- Now make the column NOT NULL and add unique constraint
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Drop firstName and lastName columns
ALTER TABLE "User" DROP COLUMN IF EXISTS "firstName";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastName";