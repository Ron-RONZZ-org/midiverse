-- CreateEnum
CREATE TYPE "MarkmapReviewStatus" AS ENUM ('none', 'action_required', 'pending_review');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('complaint_sustained', 'complaint_dismissed', 'complaint_appealed', 'markmap_reinstated', 'markmap_needs_edit', 'keynode_approved', 'keynode_rejected');

-- AlterTable
ALTER TABLE "Markmap" ADD COLUMN     "reviewStatus" "MarkmapReviewStatus" NOT NULL DEFAULT 'none';

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "markmapId" TEXT,
    "complaintId" TEXT,
    "keynodeId" TEXT,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Markmap_reviewStatus_idx" ON "Markmap"("reviewStatus");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
