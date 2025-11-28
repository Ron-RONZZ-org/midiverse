-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'content_manager', 'administrator');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended');

-- CreateEnum
CREATE TYPE "KeynodeStatus" AS ENUM ('unverified', 'verified', 'alias');

-- CreateEnum
CREATE TYPE "ComplaintReason" AS ENUM ('harassment', 'false_information', 'author_right_infringement', 'inciting_violence_hate', 'discriminatory_abusive');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('pending', 'sustained', 'dismissed', 'appealed');

-- AlterTable
ALTER TABLE "Keynode" ADD COLUMN     "aliasOfId" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "status" "KeynodeStatus" NOT NULL DEFAULT 'unverified';

-- AlterTable
ALTER TABLE "Markmap" ADD COLUMN     "isRetired" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user',
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "reason" "ComplaintReason" NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'pending',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "markmapId" TEXT NOT NULL,
    "reporterId" TEXT,
    "resolvedById" TEXT,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Complaint_markmapId_idx" ON "Complaint"("markmapId");

-- CreateIndex
CREATE INDEX "Complaint_reporterId_idx" ON "Complaint"("reporterId");

-- CreateIndex
CREATE INDEX "Complaint_status_idx" ON "Complaint"("status");

-- CreateIndex
CREATE INDEX "Complaint_createdAt_idx" ON "Complaint"("createdAt");

-- CreateIndex
CREATE INDEX "Keynode_status_idx" ON "Keynode"("status");

-- CreateIndex
CREATE INDEX "Keynode_createdById_idx" ON "Keynode"("createdById");

-- CreateIndex
CREATE INDEX "Keynode_aliasOfId_idx" ON "Keynode"("aliasOfId");

-- CreateIndex
CREATE INDEX "Markmap_isRetired_idx" ON "Markmap"("isRetired");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- AddForeignKey
ALTER TABLE "Keynode" ADD CONSTRAINT "Keynode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Keynode" ADD CONSTRAINT "Keynode_aliasOfId_fkey" FOREIGN KEY ("aliasOfId") REFERENCES "Keynode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_markmapId_fkey" FOREIGN KEY ("markmapId") REFERENCES "Markmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
