-- AlterTable
ALTER TABLE "Markmap" ADD COLUMN "slug" TEXT;

-- Create a function to generate slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) RETURNS TEXT AS $$
DECLARE
    slug TEXT;
BEGIN
    -- Convert to lowercase, replace spaces and special characters with hyphens
    slug := lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    slug := trim(both '-' from slug);
    -- Limit length to 100 characters
    slug := substring(slug from 1 for 100);
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- Populate slug for existing records
UPDATE "Markmap" 
SET "slug" = generate_slug(title) || '-' || substring(id::text from 1 for 8)
WHERE "slug" IS NULL;

-- Make slug required
ALTER TABLE "Markmap" ALTER COLUMN "slug" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Markmap_slug_idx" ON "Markmap"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Markmap_authorId_slug_key" ON "Markmap"("authorId", "slug");
