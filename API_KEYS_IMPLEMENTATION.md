# API Keys Implementation Summary

This document provides a technical overview of the API keys feature implementation.

## Overview

The API keys feature enables programmatic access to the Midiverse API, allowing users to create keys with different permission levels for various use cases.

## Architecture

### Database Schema

**ApiKey Model** (`prisma/schema.prisma`):
- `id`: UUID primary key
- `name`: User-friendly name for identification
- `key`: Hashed API key using bcrypt (10 rounds)
- `prefix`: First 8 characters of the key for display (e.g., "mk_1234...")
- `permission`: Enum (read_only, full_access)
- `expiresAt`: Optional expiration timestamp
- `lastUsedAt`: Tracks last usage for audit purposes
- `userId`: Foreign key to User model
- Cascade delete when user is deleted

### Backend Components

#### 1. API Keys Service (`src/api-keys/api-keys.service.ts`)

**Key Methods:**
- `create()`: Generates random key with `mk_` prefix, hashes it, and stores in database
- `validateApiKey()`: Verifies unhashed key against stored hashes, updates lastUsedAt
- `findAll()`: Lists user's API keys (without actual key values)
- `remove()`: Deletes API key with ownership validation

**Security Features:**
- Keys are hashed with bcrypt before storage
- Raw key is only returned once during creation
- Prefix optimization for faster validation lookups
- Expiration date validation
- User status validation (active users only)

#### 2. Authentication Strategy (`src/api-keys/api-key.strategy.ts`)

- Implements Passport Bearer token strategy
- Validates API key format (must start with 'mk_')
- Returns user object with `apiKeyPermission` property
- Used by Passport authentication guards

#### 3. Guards

**ApiKeyAuthGuard** (`src/common/guards/api-key-auth.guard.ts`):
- Standard Passport guard for API key authentication only

**JwtOrApiKeyAuthGuard** (`src/common/guards/jwt-or-api-key-auth.guard.ts`):
- Combines JWT and API key authentication
- Tries both strategies, succeeds if either works
- Used on endpoints that support both authentication methods

**ApiPermissionGuard** (`src/common/guards/api-permission.guard.ts`):
- Validates API key permissions for specific operations
- Allows JWT users full access (no permission check)
- Enforces permission requirements for API key users
- Throws ForbiddenException if permissions insufficient

#### 4. Controller (`src/api-keys/api-keys.controller.ts`)

**Endpoints:**
- `POST /api-keys`: Create new API key (requires JWT auth)
- `GET /api-keys`: List user's API keys (requires JWT auth)
- `DELETE /api-keys/:id`: Delete API key (requires JWT auth)

Note: API key management requires JWT authentication to prevent API keys from managing themselves.

### Frontend Components

#### Profile Page UI (`frontend/pages/profile/[username].vue`)

**Added to Account Settings Modal:**

1. **API Key Creation Form**:
   - Name input (required)
   - Permission dropdown (read_only/full_access)
   - Expiration date picker (optional)
   - Generate button with loading state

2. **Key Reveal Component**:
   - Shows generated key once with warning
   - Copy to clipboard button
   - Prominent warning about one-time display

3. **API Keys List**:
   - Displays all user's API keys
   - Shows: name, prefix, permission badge, created date, last used date, expiration
   - Delete button for each key
   - Empty state when no keys exist

**State Management:**
- API keys loaded when user opens Account Settings
- New key temporarily stored for display
- Automatic list refresh after creation/deletion
- Success/error message handling

**Styling:**
- Permission badges with color coding (blue for read-only, orange for full-access)
- Expired keys highlighted in red
- Warning box for new key display
- Responsive card layout for key list

### Authentication Flow

#### For API Key Requests:

1. Client sends request with `Authorization: Bearer mk_...` header
2. `JwtOrApiKeyAuthGuard` detects Bearer token
3. `ApiKeyStrategy.validate()` is called
4. Service validates key format, finds matching prefix
5. Service compares hashed key with bcrypt
6. Service checks expiration and user status
7. Service updates `lastUsedAt` timestamp
8. Strategy returns user with `apiKeyPermission` property
9. `ApiPermissionGuard` validates permission level (if required)
10. Request proceeds if validation succeeds

#### Permission Enforcement:

**Read-Only Keys:**
- Can access: GET endpoints for markmaps, search
- Cannot access: POST, PATCH, DELETE operations
- Enforced by `@RequireApiPermission(ApiKeyPermission.full_access)` decorator

**Full-Access Keys:**
- Can access: All read-only operations
- Can access: Create, update, delete operations
- Same permissions as JWT authenticated user

### Security Considerations

1. **Key Storage**:
   - Keys hashed with bcrypt (10 rounds)
   - Never stored or returned in plain text after creation
   - Prefix stored separately for display and lookup optimization

2. **Key Format**:
   - Random 32-byte value encoded as base64url
   - Prefixed with 'mk_' for identification
   - Approximately 43 characters long

3. **Validation**:
   - Format check before database lookup
   - Expiration check during validation
   - User status check (must be active)
   - Permission level enforcement

4. **Audit Trail**:
   - Last used timestamp updated on each use
   - Created timestamp tracked
   - All keys associated with user account

5. **Best Practices Documented**:
   - Never commit keys to version control
   - Use environment variables for storage
   - Rotate keys regularly
   - Use minimum required permissions
   - Set expiration dates when appropriate

### Integration with Existing Code

#### Updated Endpoints:

**Markmaps Controller** (`src/markmaps/markmaps.controller.ts`):
- `POST /markmaps`: Now accepts API keys with full_access
- `PATCH /markmaps/:id`: Now accepts API keys with full_access
- `DELETE /markmaps/:id`: Now accepts API keys with full_access

**Unchanged Behavior:**
- GET endpoints already work with optional authentication
- User must still own markmaps to update/delete them
- All existing JWT authentication continues to work

### Documentation

#### API-docs.md
Comprehensive guide including:
- Step-by-step key generation instructions
- Authentication examples (curl, JavaScript, Python)
- Use cases for each permission level
- Error handling patterns
- Rate limiting information
- Security best practices
- Complete example integration

#### API.md Updates
- Added API key authentication section
- Documented new `/api-keys` endpoints
- Added examples of key format and response structure
- Cross-referenced API-docs.md for detailed usage

### Testing Recommendations

While automated tests were not included in this implementation, here are recommended test cases:

#### Unit Tests:
1. **API Keys Service**:
   - Test key generation format
   - Test key hashing and validation
   - Test expiration handling
   - Test user status validation
   - Test prefix matching optimization

2. **Guards**:
   - Test JWT authentication still works
   - Test API key authentication
   - Test dual authentication fallback
   - Test permission enforcement
   - Test error cases

#### Integration Tests:
1. **API Key CRUD**:
   - Create API key via API
   - List API keys
   - Delete API key
   - Test ownership validation

2. **Markmap Operations**:
   - Create markmap with API key
   - Update markmap with API key
   - Delete markmap with API key
   - Test permission restrictions

#### E2E Tests:
1. Complete workflow from key generation to usage
2. Frontend key management UI
3. Cross-browser clipboard functionality
4. Permission error handling in UI

### Future Enhancements

Potential improvements for future iterations:

1. **Rate Limiting**: Implement per-key rate limits
2. **Analytics**: Track API usage per key
3. **Scopes**: More granular permissions beyond read/full
4. **Key Rotation**: Automated key rotation reminders
5. **IP Restrictions**: Whitelist IPs for specific keys
6. **Webhook Support**: Allow API keys to access webhooks
7. **Key Names**: Enforce unique names per user
8. **Bulk Operations**: Create multiple keys at once
9. **Export Logs**: Download API usage logs
10. **Notifications**: Alert on suspicious API key usage

### Troubleshooting

#### Common Issues:

1. **"Invalid API key format"**:
   - Ensure key starts with 'mk_'
   - Check for whitespace or truncation
   - Verify full key was copied

2. **"Invalid API key"**:
   - Key may have been deleted
   - Key may have expired
   - User account may be inactive
   - Check for typos

3. **"This operation requires full_access permission"**:
   - Key has read_only permission
   - Create new key with full_access
   - Or use JWT authentication

4. **API key never displays**:
   - Check browser console for errors
   - Verify modal state management
   - Check authFetch implementation

### Files Changed

**Backend:**
- `prisma/schema.prisma`
- `prisma/migrations/20251216190339_add_api_keys/migration.sql`
- `src/api-keys/` (new directory)
  - `api-keys.service.ts`
  - `api-keys.controller.ts`
  - `api-keys.module.ts`
  - `api-key.strategy.ts`
  - `dto/create-api-key.dto.ts`
- `src/common/guards/`
  - `api-key-auth.guard.ts` (new)
  - `jwt-or-api-key-auth.guard.ts` (new)
  - `api-permission.guard.ts` (new)
- `src/common/decorators/require-api-permission.decorator.ts` (new)
- `src/markmaps/markmaps.controller.ts`
- `src/app.module.ts`
- `package.json`

**Frontend:**
- `frontend/pages/profile/[username].vue`

**Documentation:**
- `API-docs.md` (new)
- `API.md` (updated)
- `API_KEYS_IMPLEMENTATION.md` (this file)

### Deployment Checklist

Before deploying to production:

1. ✅ Run database migration
2. ✅ Update environment variables if needed
3. ✅ Test API key generation in staging
4. ✅ Verify both JWT and API key auth work
5. ✅ Test permission enforcement
6. ✅ Verify frontend UI displays correctly
7. ✅ Check documentation is accessible
8. ✅ Monitor error logs for authentication issues
9. ⚠️ Consider adding rate limiting (recommended)
10. ⚠️ Set up monitoring for API key usage (recommended)
