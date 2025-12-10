# Bug Fix: Deployment Routing Issues

## Problem Summary

Two critical bugs were reported in the production deployment:

1. **`/keynode/fullscreen` stuck on "Loading keynode hierarchy..."**
   - Console error: `Loading module from "https://midiverse.org/_nuxt/C7RnLupW.js" was blocked because of a disallowed MIME type ("text/html")`
   
2. **Direct link access returns raw JSON instead of rendered pages**
   - When users refresh the page or directly access URLs like `/markmaps/username/slug/fullscreen`
   - The browser receives raw JSON data instead of the rendered HTML page

## Root Cause Analysis

The issue stemmed from an architectural misconfiguration in the nginx reverse proxy setup. The original nginx configuration had the following routing rules:

```nginx
# Backend routes (auth, markmaps, complaints, etc.)
location ~ ^/(auth|markmaps|users|series|tags|complaints|admin|keynodes) {
    proxy_pass http://localhost:3010;  # Backend API
    ...
}

# Frontend
location / {
    proxy_pass http://localhost:3001;  # Nuxt frontend
    ...
}
```

### The Problem

This configuration routed ALL requests matching `/markmaps/*`, `/keynodes/*`, etc. to the backend API (port 3010), regardless of whether they were:
- **API requests** (e.g., `fetch('/markmaps')` from JavaScript) - Should go to backend
- **Page navigation** (e.g., browser accessing `/markmaps/username/slug`) - Should go to frontend

### Why This Caused the Bugs

1. **MIME Type Error**: When the browser navigated to `/keynode/fullscreen`, nginx routed it to the backend API. The backend returned JSON (Content-Type: application/json), but the browser expected an HTML page to load JavaScript modules, causing the MIME type error.

2. **Raw JSON Response**: Similarly, when accessing `/markmaps/username/slug/fullscreen` directly, the browser was routed to the backend API endpoint, which returned raw JSON data instead of the rendered Nuxt page.

### The Core Issue

The architecture lacked a clear distinction between:
- **Frontend routes** (for page rendering via Nuxt SSR)
- **Backend API routes** (for data endpoints)

Both were sharing the same URL namespace, making it impossible for nginx to differentiate between them.

## Solution

### 1. Add Global API Prefix to Backend

Modified `src/main.ts` to prefix all backend routes with `/api`:

```typescript
// Set global API prefix
app.setGlobalPrefix('api');
```

Now all backend endpoints are accessible at:
- `/api/auth/login`
- `/api/markmaps`
- `/api/keynodes/hierarchy`
- etc.

### 2. Update Frontend API Base URL

Updated `frontend/nuxt.config.ts` to include the `/api` prefix:

```typescript
runtimeConfig: {
  public: {
    apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3000/api'
  }
}
```

### 3. Simplify Nginx Configuration

Updated the nginx configuration to be much cleaner:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Backend API (all API routes are prefixed with /api)
    location /api {
        proxy_pass http://localhost:3010;
        ...
    }

    # Frontend (all other routes)
    location / {
        proxy_pass http://localhost:3001;
        ...
    }
}
```

## How This Fixes Both Bugs

### Fix for Bug 1: `/keynode/fullscreen` Loading Issue

**Before**: 
- Browser navigates to `/keynode/fullscreen`
- Nginx routes to backend API (matches regex `^/keynodes`)
- Backend returns JSON
- Browser tries to parse JSON as HTML → MIME type error

**After**:
- Browser navigates to `/keynode/fullscreen`
- Nginx routes to frontend (doesn't match `/api`)
- Frontend's Nuxt SSR renders the page properly
- Page loads, then makes API call to `/api/keynodes/hierarchy`
- Backend returns JSON as expected

### Fix for Bug 2: Direct Link Access

**Before**:
- Browser accesses `/markmaps/username/slug/fullscreen`
- Nginx routes to backend API (matches regex `^/markmaps`)
- Backend returns JSON for the markmap data
- User sees raw JSON instead of rendered page

**After**:
- Browser accesses `/markmaps/username/slug/fullscreen`
- Nginx routes to frontend (doesn't match `/api`)
- Frontend's Nuxt SSR/SPA renders the page
- Page makes API call to `/api/markmaps/username/slug`
- Backend returns JSON data
- Frontend renders the markmap visualization

## Benefits of This Architecture

1. **Clear Separation**: API endpoints and page routes are completely separate
2. **No Routing Conflicts**: Nginx can easily distinguish between frontend and backend requests
3. **RESTful Best Practice**: Using `/api` prefix follows common conventions
4. **Easier Debugging**: Clear URL structure makes it obvious what's frontend vs backend
5. **Future-Proof**: Adding new frontend pages or API endpoints won't cause conflicts

## Migration Steps for Existing Deployments

For deployments upgrading from the previous architecture:

1. Pull the latest code
2. Update backend `.env` (no changes needed, PORT stays the same)
3. Update frontend `.env`:
   ```
   NUXT_PUBLIC_API_BASE=https://yourdomain.com/api
   ```
4. Update nginx configuration (remove regex location blocks)
5. Rebuild both backend and frontend
6. Restart PM2 applications
7. Test thoroughly

## Testing Checklist

- [ ] Frontend pages load correctly (/, /markmaps, /keynode, etc.)
- [ ] Direct URL access works (refresh button, bookmarks)
- [ ] Fullscreen routes work (/keynode/fullscreen, /markmaps/*/fullscreen)
- [ ] API calls succeed (check browser DevTools Network tab)
- [ ] Authentication flows work (login, signup)
- [ ] No MIME type errors in console
- [ ] No 404 errors for API endpoints

## Files Modified

### Backend
- `src/main.ts` - Added `app.setGlobalPrefix('api')`

### Frontend
- `frontend/nuxt.config.ts` - Updated default apiBase URL
- `frontend/.env.example` - Updated API base URL

### Documentation
- `DEPLOYMENT.md` - Updated nginx config and added migration guide
- `README.md` - Updated API URL references
- `API.md` - Updated all example endpoints and curl commands
- `frontend/README.md` - Updated configuration examples
- `FRONTEND_IMPLEMENTATION.md` - Updated architecture notes

## Technical Notes

### Why Not Use Nuxt's Server Routes?

Nuxt 3 supports server routes in the `server/` directory, but this project uses a separate NestJS backend for several reasons:
- More robust type system with TypeScript decorators
- Extensive ecosystem (Prisma, Passport, etc.)
- Better separation of concerns
- Existing NestJS codebase

### Why `/api` Prefix vs Other Solutions?

Other approaches considered:
1. **Subdomain** (api.midiverse.org) - Requires additional DNS configuration
2. **Different Port** - Requires CORS configuration, less user-friendly
3. **Version Prefix** (/v1/markmaps) - Adds unnecessary complexity for now

The `/api` prefix is:
- Industry standard
- Simple to implement
- No additional infrastructure needed
- Clear and semantic

## Conclusion

This fix resolves both reported bugs by establishing a clear architectural boundary between frontend page routes and backend API endpoints. The solution is minimal, follows best practices, and prevents similar routing conflicts in the future.
