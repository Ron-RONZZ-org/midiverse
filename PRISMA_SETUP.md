# Prisma Database Setup Guide

This guide explains how to set up Prisma with a fresh PostgreSQL database.

## Prerequisites

- PostgreSQL database (local or hosted on Prisma Accelerate/other cloud provider)
- Node.js and npm installed

## Setup Steps for Fresh Database

### 1. Configure Database Connection

Copy the example environment file and update with your database credentials:

```bash
cp .env.example .env
```

Edit `.env` and set your `DATABASE_URL`:

```env
DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

**For Prisma Accelerate users**, your URL will look like:
```env
DATABASE_URL="prisma://accelerate.prisma-data.net/?api_key=your_api_key"
```

### 2. Install Dependencies

```bash
npm install
```

This will automatically run `prisma generate` via the postinstall script.

### 3. Apply Migrations to Fresh Database

For a **new/empty database**, run:

```bash
npx prisma migrate deploy
```

This applies all existing migrations without prompting and is safe for production use.

**Alternative** (for development):
```bash
npx prisma migrate dev
```

This will:
- Apply pending migrations
- Generate Prisma Client
- Create the database if it doesn't exist

### 4. Verify Setup

Check that tables were created successfully:

```bash
npx prisma studio
```

This opens a GUI where you can inspect your database.

## Troubleshooting

### Error: "relation already exists"

This error occurs when:
1. The database already has tables from a previous setup
2. There's a mismatch between database state and migration history

**Solution for fresh start:**

1. **Delete all data and start over:**
   ```bash
   npx prisma migrate reset
   ```
   ⚠️ **Warning:** This deletes all data!

2. **Or manually clear the database:**
   - Drop all tables in your database
   - Delete the `_prisma_migrations` table
   - Run `npx prisma migrate deploy`

### Starting with a Brand New Prisma Accelerate Project

If you deleted your old Prisma Accelerate project and created a new one:

1. Update your `DATABASE_URL` in `.env` with the new connection string
2. The new database is completely empty
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Verify with:
   ```bash
   npx prisma studio
   ```

### Migration History Mismatch

If you see migrations being applied that don't exist in your `prisma/migrations/` directory:

1. Your database has old migration records
2. Solution: Use a fresh database or manually clean the `_prisma_migrations` table

## Current Migration Status

This project has one migration:
- `20241115000000_init` - Creates all initial tables (User, Markmap, ViewHistory, Interaction, Tag, TagOnMarkmap)

## Commands Reference

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `npx prisma migrate deploy` | Apply migrations without prompts | Production, CI/CD, fresh databases |
| `npx prisma migrate dev` | Apply migrations and generate client | Local development |
| `npx prisma migrate reset` | Reset database and reapply all migrations | When you want to start fresh (⚠️ deletes data) |
| `npx prisma generate` | Generate Prisma Client | After schema changes |
| `npx prisma studio` | Open database GUI | Inspect/edit data visually |
| `npx prisma db push` | Push schema without migrations | Prototyping (not recommended for production) |

## Best Practices

1. **Never modify existing migration files** - Create new migrations instead
2. **Always commit migration files** to version control
3. **Use `migrate deploy` in production** - It's safe and doesn't prompt
4. **Keep `.env` out of version control** - It contains sensitive credentials
5. **Use `migrate reset` only in development** - It deletes all data

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Accelerate Setup](https://www.prisma.io/docs/accelerate/getting-started)
