-- Add bio field to User
ALTER TABLE "User" ADD COLUMN "bio" TEXT;

-- Add isPublic field to User (default to true)
ALTER TABLE "User" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT true;

-- Add hiddenAccounts array to store IDs of accounts that should be hidden
ALTER TABLE "User" ADD COLUMN "hiddenAccounts" TEXT[] DEFAULT ARRAY[]::TEXT[];