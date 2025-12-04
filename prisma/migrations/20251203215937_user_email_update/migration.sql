-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT,
ADD COLUMN     "pendingEmailToken" TEXT,
ADD COLUMN     "pendingEmailTokenExpiry" TIMESTAMP(3);
