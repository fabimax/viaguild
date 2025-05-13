-- AlterTable
ALTER TABLE "GuildCategory" ADD COLUMN     "assignedById" TEXT;

-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN     "assignedById" TEXT;

-- AlterTable
ALTER TABLE "UserSystemRole" ADD COLUMN     "assignedById" TEXT;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSystemRole" ADD CONSTRAINT "UserSystemRole_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildAssignmentDetails" ADD CONSTRAINT "GuildAssignmentDetails_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildCategory" ADD CONSTRAINT "GuildCategory_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
