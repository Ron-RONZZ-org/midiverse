# Migration: Add Slug to Markmap

This migration adds a `slug` field to the `Markmap` table to support human-friendly URLs.

## What's Changed

- Added `slug` column (TEXT, NOT NULL)
- Added unique constraint on `(authorId, slug)` to prevent duplicate slugs per user
- Added index on `slug` for faster lookups
- Populated existing records with slugs based on their titles

## After Pulling This Change

If you pull this migration, you need to:

1. **Regenerate Prisma Client** (this happens automatically with `npm install`):
   ```bash
   npm install
   ```
   
   Or manually:
   ```bash
   npx prisma generate
   ```

2. **Apply the migration** to your database:
   ```bash
   npx prisma migrate dev
   ```

## Why You Need to Regenerate

The Prisma Client is a TypeScript type-safe database client that's generated from your schema. When the schema changes (like adding the `slug` field), the client needs to be regenerated to include the new field's types. Without regenerating, you'll get TypeScript errors like:

```
error TS2353: Object literal may only specify known properties, and 'slug' does not exist in type 'MarkmapWhereInput'.
```

The `postinstall` script in `package.json` automatically runs `prisma generate` after `npm install`, so running `npm install` is usually sufficient.
