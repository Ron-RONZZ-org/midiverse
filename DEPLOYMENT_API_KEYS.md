# Deployment Changes for API Key Feature

This document outlines the specific changes needed to deploy the API key authentication feature to production.

## Summary

The API key feature **does not require** any changes to your Nginx configuration or DNS records. It works with your existing setup because:
- API keys are handled by the backend application code
- The authentication is done via HTTP headers, not URL paths
- All API endpoints remain at the same URLs (`/api/markmaps`, etc.)

## Required Changes

### 1. Database Migration ✅ REQUIRED

The API key feature adds a new `ApiKey` table to the database. You must run the migration:

```bash
cd /var/www/midiverse-deployment/midiverse
npx prisma migrate deploy
```

**Migration Details:**
- Creates `ApiKey` table with columns: id, name, key, prefix, permission, expiresAt, lastUsedAt, userId
- Creates `ApiKeyPermission` enum with values: read_only, full_access
- Adds foreign key relationship to User table with CASCADE delete

**Verify migration:**
```bash
# Check if migration was applied
npx prisma migrate status

# Or check database directly
psql -d midiverse -c "\d ApiKey"
```

### 2. Backend Dependencies ✅ REQUIRED

The feature requires the `passport-http-bearer` package:

```bash
cd /var/www/midiverse-deployment/midiverse
npm install
```

**New Dependencies:**
- `passport-http-bearer`: For Bearer token authentication
- `@types/passport-http-bearer`: TypeScript types

### 3. Frontend Dependencies ✅ REQUIRED

Frontend has no new dependencies, but you should still run:

```bash
cd /var/www/midiverse-deployment/midiverse/frontend
npm install
```

### 4. Rebuild Applications ✅ REQUIRED

```bash
cd /var/www/midiverse-deployment/midiverse

# Rebuild backend
npm run build

# Rebuild frontend
cd frontend
npm run build
cd ..
```

### 5. Restart Applications ✅ REQUIRED

```bash
pm2 restart all
```

Or restart individually:
```bash
pm2 restart midiverse-backend
pm2 restart midiverse-frontend
```

## Changes NOT Required

### ❌ Nginx Configuration
**No changes needed.** The existing Nginx configuration already handles API routes:

```nginx
# This already works for API key endpoints
location /api {
    proxy_pass http://localhost:3010;
    # ... existing configuration
}
```

The API key endpoints (`/api/api-keys`) are handled by the same proxy rules as other API endpoints.

### ❌ DNS Records
**No changes needed.** The API key feature uses the same domain and URLs as your existing API.

### ❌ Environment Variables
**No new environment variables required.** The feature uses existing configuration:
- JWT_SECRET: Already configured, used for validating JWT tokens in API key management endpoints
- DATABASE_URL: Already configured, used to store API keys
- PORT: Already configured, same port for all API endpoints

### ❌ Firewall Rules
**No changes needed.** The API key feature uses the same ports (80, 443) as your existing application.

### ❌ SSL Certificates
**No changes needed.** API key endpoints use the same SSL certificate as your existing API.

## Deployment Checklist

Use this checklist when deploying the API key feature:

```bash
cd /var/www/midiverse-deployment/midiverse

# 1. Pull latest code
git pull origin main

# 2. Install dependencies
npm install
cd frontend && npm install && cd ..

# 3. Run database migration
npx prisma migrate deploy

# 4. Verify migration
npx prisma migrate status

# 5. Rebuild backend
npm run build

# 6. Rebuild frontend
cd frontend && npm run build && cd ..

# 7. Restart applications
pm2 restart all

# 8. Verify applications are running
pm2 status

# 9. Test backend API
curl https://yourdomain.com/api/markmaps

# 10. Test frontend UI
# Visit https://yourdomain.com in browser
```

## Verification Steps

### 1. Verify Database Migration

```bash
# Connect to database
psql -U midiverseuser -d midiverse

# Check if ApiKey table exists
\dt ApiKey

# Check table structure
\d ApiKey

# Exit
\q
```

Expected output should show the `ApiKey` table with columns.

### 2. Verify Backend API

```bash
# Test that API is responding
curl https://yourdomain.com/api/markmaps

# Check backend logs
pm2 logs midiverse-backend --lines 50
```

### 3. Verify Frontend UI

1. Open browser and navigate to `https://yourdomain.com`
2. Log in to your account
3. Go to your profile page
4. Click "Account Settings"
5. Verify that "API Keys" section is visible
6. Try generating a test API key
7. Verify that the key is displayed and can be copied

### 4. Verify API Key Authentication

```bash
# Generate an API key via the UI, then test it
API_KEY="mk_your_generated_key"

# Test read operation
curl -H "Authorization: Bearer $API_KEY" \
  https://yourdomain.com/api/markmaps

# Test write operation (if full access key)
curl -X POST \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","text":"# Test","isPublic":true}' \
  https://yourdomain.com/api/markmaps
```

## Rollback Plan

If you need to rollback the deployment:

### Option 1: Revert Code Only (Keep Data)

```bash
cd /var/www/midiverse-deployment/midiverse

# Revert to previous commit (before API keys feature)
git log --oneline -n 10  # Find the commit before API keys
git checkout <commit-hash>

# Reinstall dependencies
npm install
cd frontend && npm install && cd ..

# Rebuild
npm run build
cd frontend && npm run build && cd ..

# Restart
pm2 restart all
```

**Note:** This keeps the `ApiKey` table in the database. Existing API keys will remain but won't work.

### Option 2: Revert Everything (Including Database)

```bash
# 1. Revert code (as above)
cd /var/www/midiverse-deployment/midiverse
git checkout <commit-hash>

# 2. Rollback database migration
npx prisma migrate resolve --rolled-back 20251216190339_add_api_keys

# This marks the migration as rolled back but doesn't delete data
# To actually remove the table:
psql -U midiverseuser -d midiverse -c "DROP TABLE IF EXISTS \"ApiKey\" CASCADE;"
psql -U midiverseuser -d midiverse -c "DROP TYPE IF EXISTS \"ApiKeyPermission\";"

# 3. Rebuild and restart
npm install
cd frontend && npm install && cd ..
npm run build
cd frontend && npm run build && cd ..
pm2 restart all
```

**Warning:** This will delete all API keys. Users will need to regenerate them.

## Monitoring

After deployment, monitor these aspects:

### 1. Backend Logs

```bash
# Watch for errors related to API keys
pm2 logs midiverse-backend | grep -i "apikey\|api-key"

# Watch for authentication errors
pm2 logs midiverse-backend | grep -i "unauthorized"
```

### 2. Database

```bash
# Monitor API key creation
psql -U midiverseuser -d midiverse -c "SELECT COUNT(*) FROM \"ApiKey\";"

# Check for API keys that haven't been used
psql -U midiverseuser -d midiverse -c "SELECT name, \"createdAt\", \"lastUsedAt\" FROM \"ApiKey\" WHERE \"lastUsedAt\" IS NULL;"

# Check for expired keys
psql -U midiverseuser -d midiverse -c "SELECT COUNT(*) FROM \"ApiKey\" WHERE \"expiresAt\" < NOW();"
```

### 3. Application Performance

```bash
# Monitor memory and CPU usage
pm2 monit

# Check for increased resource usage
pm2 status
```

## Troubleshooting

### Issue: Migration Fails

**Error:** `Migration failed to apply cleanly`

**Solution:**
```bash
# Check Prisma migration status
npx prisma migrate status

# If migration is in failed state, mark it as rolled back and try again
npx prisma migrate resolve --rolled-back 20251216190339_add_api_keys
npx prisma migrate deploy
```

### Issue: API Key Endpoints Return 404

**Possible Cause:** Backend not fully restarted

**Solution:**
```bash
pm2 restart midiverse-backend
pm2 logs midiverse-backend
```

### Issue: Cannot Generate API Keys in UI

**Possible Causes:**
1. Frontend not rebuilt
2. Backend API not accessible
3. User not logged in

**Solution:**
```bash
# Check frontend logs
pm2 logs midiverse-frontend

# Check if API is accessible
curl https://yourdomain.com/api/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Rebuild and restart frontend
cd /var/www/midiverse-deployment/midiverse/frontend
npm run build
cd ..
pm2 restart midiverse-frontend
```

### Issue: API Key Authentication Not Working

**Possible Causes:**
1. Incorrect header format
2. API key expired or deleted
3. Backend not recognizing passport-http-bearer strategy

**Debug:**
```bash
# Check backend logs for authentication errors
pm2 logs midiverse-backend | grep -i "strategy\|passport"

# Verify passport-http-bearer is installed
cd /var/www/midiverse-deployment/midiverse
npm list passport-http-bearer

# Test with curl
curl -v -H "Authorization: Bearer mk_test" \
  https://yourdomain.com/api/markmaps
```

## Support

If you encounter issues during deployment:

1. Check the logs: `pm2 logs`
2. Review the [main deployment guide](docs/DEPLOYMENT-midiverse.md)
3. Check [GitHub Issues](https://github.com/Ron-RONZZ-org/midiverse/issues)
4. Consult the [API Keys Implementation Guide](API_KEYS_IMPLEMENTATION.md)

## Summary

**Quick Deployment:**
```bash
cd /var/www/midiverse-deployment/midiverse
git pull origin main
npm install && cd frontend && npm install && cd ..
npx prisma migrate deploy
npm run build && cd frontend && npm run build && cd ..
pm2 restart all
```

**What Changed:**
- ✅ Database: New `ApiKey` table
- ✅ Backend: New API endpoints at `/api/api-keys`
- ✅ Frontend: New UI in Account Settings
- ❌ Nginx: No changes
- ❌ DNS: No changes
- ❌ Environment: No changes
- ❌ Firewall: No changes
