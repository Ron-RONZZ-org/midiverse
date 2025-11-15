-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastEmailChange" TIMESTAMP(3),
ADD COLUMN "lastUsernameChange" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Markmap" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Markmap_deletedAt_idx" ON "Markmap"("deletedAt");
