-- CreateTable
CREATE TABLE "Keynode" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "childNodeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Keynode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeynodeOnMarkmap" (
    "id" TEXT NOT NULL,
    "keynodeId" TEXT NOT NULL,
    "markmapId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeynodeOnMarkmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Keynode_name_key" ON "Keynode"("name");

-- CreateIndex
CREATE INDEX "Keynode_name_idx" ON "Keynode"("name");

-- CreateIndex
CREATE INDEX "Keynode_category_idx" ON "Keynode"("category");

-- CreateIndex
CREATE INDEX "Keynode_parentId_idx" ON "Keynode"("parentId");

-- CreateIndex
CREATE INDEX "Keynode_childNodeCount_idx" ON "Keynode"("childNodeCount");

-- CreateIndex
CREATE UNIQUE INDEX "KeynodeOnMarkmap_keynodeId_markmapId_key" ON "KeynodeOnMarkmap"("keynodeId", "markmapId");

-- CreateIndex
CREATE INDEX "KeynodeOnMarkmap_keynodeId_idx" ON "KeynodeOnMarkmap"("keynodeId");

-- CreateIndex
CREATE INDEX "KeynodeOnMarkmap_markmapId_idx" ON "KeynodeOnMarkmap"("markmapId");

-- CreateIndex
CREATE INDEX "KeynodeOnMarkmap_createdAt_idx" ON "KeynodeOnMarkmap"("createdAt");

-- AddForeignKey
ALTER TABLE "Keynode" ADD CONSTRAINT "Keynode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Keynode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeynodeOnMarkmap" ADD CONSTRAINT "KeynodeOnMarkmap_keynodeId_fkey" FOREIGN KEY ("keynodeId") REFERENCES "Keynode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KeynodeOnMarkmap" ADD CONSTRAINT "KeynodeOnMarkmap_markmapId_fkey" FOREIGN KEY ("markmapId") REFERENCES "Markmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;
