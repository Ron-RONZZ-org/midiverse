-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "lastEmailChange" TIMESTAMP(3),
    "lastUsernameChange" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Markmap" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "language" TEXT,
    "topic" TEXT,
    "maxWidth" INTEGER NOT NULL DEFAULT 0,
    "colorFreezeLevel" INTEGER NOT NULL DEFAULT 0,
    "initialExpandLevel" INTEGER NOT NULL DEFAULT -1,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,

    CONSTRAINT "Markmap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ViewHistory" (
    "id" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "markmapId" TEXT NOT NULL,

    CONSTRAINT "ViewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "interactedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    "markmapId" TEXT NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagOnMarkmap" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "markmapId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagOnMarkmap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Markmap_authorId_idx" ON "Markmap"("authorId");

-- CreateIndex
CREATE INDEX "Markmap_isPublic_idx" ON "Markmap"("isPublic");

-- CreateIndex
CREATE INDEX "Markmap_language_idx" ON "Markmap"("language");

-- CreateIndex
CREATE INDEX "Markmap_topic_idx" ON "Markmap"("topic");

-- CreateIndex
CREATE INDEX "Markmap_deletedAt_idx" ON "Markmap"("deletedAt");

-- CreateIndex
CREATE INDEX "ViewHistory_userId_idx" ON "ViewHistory"("userId");

-- CreateIndex
CREATE INDEX "ViewHistory_markmapId_idx" ON "ViewHistory"("markmapId");

-- CreateIndex
CREATE INDEX "Interaction_userId_idx" ON "Interaction"("userId");

-- CreateIndex
CREATE INDEX "Interaction_markmapId_idx" ON "Interaction"("markmapId");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "TagOnMarkmap_tagId_idx" ON "TagOnMarkmap"("tagId");

-- CreateIndex
CREATE INDEX "TagOnMarkmap_markmapId_idx" ON "TagOnMarkmap"("markmapId");

-- CreateIndex
CREATE INDEX "TagOnMarkmap_createdAt_idx" ON "TagOnMarkmap"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TagOnMarkmap_tagId_markmapId_key" ON "TagOnMarkmap"("tagId", "markmapId");

-- AddForeignKey
ALTER TABLE "Markmap" ADD CONSTRAINT "Markmap_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewHistory" ADD CONSTRAINT "ViewHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ViewHistory" ADD CONSTRAINT "ViewHistory_markmapId_fkey" FOREIGN KEY ("markmapId") REFERENCES "Markmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_markmapId_fkey" FOREIGN KEY ("markmapId") REFERENCES "Markmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnMarkmap" ADD CONSTRAINT "TagOnMarkmap_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagOnMarkmap" ADD CONSTRAINT "TagOnMarkmap_markmapId_fkey" FOREIGN KEY ("markmapId") REFERENCES "Markmap"("id") ON DELETE CASCADE ON UPDATE CASCADE;

