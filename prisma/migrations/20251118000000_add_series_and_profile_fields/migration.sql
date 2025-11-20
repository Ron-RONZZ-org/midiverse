-- AlterTable
ALTER TABLE "User" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "profilePictureUrl" TEXT;

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Markmap" ADD COLUMN     "seriesId" TEXT;

-- CreateIndex
CREATE INDEX "Series_authorId_idx" ON "Series"("authorId");

-- CreateIndex
CREATE INDEX "Series_slug_idx" ON "Series"("slug");

-- CreateIndex
CREATE INDEX "Series_isPublic_idx" ON "Series"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "Series_authorId_slug_key" ON "Series"("authorId", "slug");

-- CreateIndex
CREATE INDEX "Markmap_seriesId_idx" ON "Markmap"("seriesId");

-- AddForeignKey
ALTER TABLE "Markmap" ADD CONSTRAINT "Markmap_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
