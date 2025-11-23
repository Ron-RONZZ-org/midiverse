#!/bin/bash
# Production Database Setup Script
# This script sets up a fresh database for production deployment

set -e  # Exit on error

echo "=========================================="
echo "Midiverse Production Database Setup"
echo "=========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    echo "Please set DATABASE_URL before running this script"
    exit 1
fi

echo "Step 1: Generating Prisma Client..."
npx prisma generate

echo ""
echo "Step 2: Running database migrations..."
npx prisma migrate deploy

echo ""
echo "=========================================="
echo "Database setup completed successfully!"
echo "=========================================="
echo ""
echo "Your database is now ready for production use."
echo ""
echo "Next steps:"
echo "1. Build the application: npm run build"
echo "2. Start the application: npm run start:prod"
echo ""
