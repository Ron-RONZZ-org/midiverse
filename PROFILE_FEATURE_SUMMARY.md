# Profile View Feature - Implementation Summary

## Overview
This PR implements the profile view feature with username-based URLs, profile editing with restrictions, and a recycle bin for deleted markmaps.

## Requirements Fulfilled

### ✅ Navigation Changes
- **Requirement**: Once user logged-in, the log-in sign-up buttons should turn into dashboard (leading to /profile)
- **Implementation**: Updated `frontend/layouts/default.vue` to show "Dashboard" button instead of "Login/Signup" when authenticated

### ✅ Unique Profile URLs  
- **Requirement**: Each profile should have a unique url (/profile/{username})
- **Implementation**: 
  - Created `/profile/[username].vue` for username-based profiles
  - Updated `/profile.vue` to redirect to `/profile/{username}`

### ✅ Public View-Only Profile
- **Requirement**: When visited by other users, a public view-only profile is shown
- **Implementation**:
  - Created `GET /users/profile/:username` endpoint with optional authentication
  - Returns public data (username, stats) for other users
  - Frontend shows read-only view without edit options

### ✅ Profile Editing with Restrictions
- **Requirement**: Change email address and username once every 15 days
- **Implementation**:
  - Added `lastEmailChange` and `lastUsernameChange` fields to User model
  - Created `PATCH /users/profile` endpoint with validation
  - Enforces 15-day restriction with helpful error messages
  - Frontend shows last change dates in edit modal

### ✅ Markmap Management from Profile
- **Requirement**: Delete and duplicate mindmaps directly from the profile page
- **Implementation**:
  - Added duplicate button (📋) on each markmap card
  - Added delete button (🗑️) on each markmap card  
  - Created `POST /markmaps/:id/duplicate` endpoint
  - Updated `DELETE /markmaps/:id` to soft delete

### ✅ Recycle Bin
- **Requirement**: Deleted mindmaps placed in a private recycle bin for 30 days
- **Implementation**:
  - Added `deletedAt` field to Markmap model for soft delete
  - Created `GET /users/deleted-markmaps` endpoint
  - Created `POST /markmaps/:id/restore` endpoint
  - Frontend shows "Recycle Bin" section on own profile
  - Displays restore button (♻️) for each deleted markmap

## Technical Changes

### Backend

#### Database Schema (Prisma)
```prisma
model User {
  lastEmailChange     DateTime?
  lastUsernameChange  DateTime?
  // ... other fields
}

model Markmap {
  deletedAt           DateTime?
  // ... other fields
  @@index([deletedAt])
}
```

#### New Endpoints
- `GET /users/profile/:username` - Get profile by username (public/private)
- `PATCH /users/profile` - Update email/username (15-day restriction)
- `GET /users/deleted-markmaps` - Get deleted markmaps
- `POST /markmaps/:id/duplicate` - Duplicate markmap
- `POST /markmaps/:id/restore` - Restore deleted markmap

#### Modified Endpoints
- `DELETE /markmaps/:id` - Changed to soft delete (sets deletedAt)
- `GET /markmaps` - Filters out deleted markmaps
- `GET /markmaps/search` - Filters out deleted markmaps
- `GET /markmaps/:id` - Returns 404 for deleted markmaps

#### New Components
- `src/common/guards/optional-jwt-auth.guard.ts` - Guard for optional auth
- `src/users/dto/update-user.dto.ts` - DTO for profile updates
- `src/users/users.service.spec.ts` - Unit tests (9 tests)

#### Updated Services
- `UsersService` - Profile management with restrictions
- `MarkmapsService` - Soft delete, duplicate, restore functionality

### Frontend

#### New Pages
- `frontend/pages/profile/[username].vue` - Username-based profile page

#### Updated Pages
- `frontend/pages/profile.vue` - Now redirects to username URL
- `frontend/layouts/default.vue` - Shows "Dashboard" when authenticated

#### Features
- Edit profile modal with 15-day restriction display
- Delete/duplicate buttons on markmap cards
- Recycle bin section (only visible on own profile)
- Restore functionality for deleted markmaps
- Public vs private profile views

## Testing

### Unit Tests
- Created 9 comprehensive tests for UsersService
- Tests cover:
  - Profile retrieval (public vs private)
  - Profile updates with 15-day restrictions
  - Error handling (NotFoundException, BadRequestException, ConflictException)
  - Deleted markmaps retrieval

### Test Results
- **Total Tests**: 28 (19 existing + 9 new)
- **Status**: All passing ✅
- **Build**: Successful ✅
- **Linting**: All passing ✅

## Migration

Run this command after setting up the database:
```bash
npx prisma migrate deploy
```

Or manually run the migration in `prisma/migrations/20241115_add_profile_features/migration.sql`

## API Documentation

Updated `API.md` with:
- All new endpoints documented
- Request/response examples
- Authentication requirements
- 15-day restriction notes
- 30-day recycle bin retention notes

## Security Considerations

1. **Authentication**: Profile editing requires authentication
2. **Authorization**: Users can only edit/delete their own markmaps
3. **Rate Limiting**: 15-day restriction prevents abuse of email/username changes
4. **Data Validation**: All inputs validated with class-validator
5. **Soft Delete**: Prevents accidental data loss

## Future Enhancements

Potential improvements for future iterations:
1. Scheduled job to permanently delete markmaps > 30 days old
2. Email notification when username/email is changed
3. Profile picture upload
4. Bio/description field
5. Activity feed on profile
6. Follow/followers functionality
7. Statistics dashboard

## Notes

- The migration file is created but not applied (requires database connection)
- All queries now filter out soft-deleted markmaps
- Public markmaps are visible to all users, including in public profiles
- Private markmaps are only visible to the owner
