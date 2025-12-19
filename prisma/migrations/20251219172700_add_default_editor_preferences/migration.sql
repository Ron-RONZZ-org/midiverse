-- AlterTable
ALTER TABLE "UserPreferences" ADD COLUMN     "defaultEditorColorFreezeLevel" INTEGER,
ADD COLUMN     "defaultEditorInitialExpandLevel" INTEGER,
ADD COLUMN     "defaultEditorLanguage" TEXT,
ADD COLUMN     "defaultEditorMaxWidth" INTEGER,
ADD COLUMN     "defaultEditorSeriesId" TEXT;
