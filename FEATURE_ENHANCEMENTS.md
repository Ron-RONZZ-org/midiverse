# Feature Enhancements Documentation

## Overview
This document describes the new features added to Midiverse as part of the feature enhancements update.

## 1. Search Ranking Options

### Description
Users can now sort search results by different criteria to find markmaps more easily.

### Sort Options
- **Newest First** (default): Shows the most recently created markmaps first
- **Oldest First**: Shows the oldest markmaps first
- **Most Relevant**: Intelligently ranks results based on:
  - Exact title matches (highest priority)
  - Partial title matches
  - Content matches
  - View count (as a tiebreaker)
- **Most Views**: Shows markmaps with the most views first

### Usage
1. Navigate to the Search page
2. Enter your search criteria (query, language, author, tags)
3. Select your preferred sort option from the "Sort By" dropdown
4. Click "Search"
5. Results will be displayed according to your chosen sorting method

### Implementation Details
- Backend: `SearchMarkmapDto` includes `sortBy` field
- Service: `MarkmapsService.search()` handles sorting logic
- Frontend: `search.vue` includes sort dropdown UI
- View counts are displayed in search results when available

## 2. Editor Fullscreen Mode

### Description
The editor already supports fullscreen mode with live preview toggle, allowing users to focus on content creation without distractions.

### Features
- **Fullscreen Toggle**: Expand the editor to fill the entire screen
- **Live Preview Toggle**: Show or hide the preview pane in fullscreen mode
- **Exit Fullscreen**: Quick button to return to normal mode

### Usage
1. Navigate to the Editor page
2. Click the "↗ Fullscreen" button to enter fullscreen mode
3. Use "Hide Preview" / "Show Preview" to toggle the preview pane
4. Click "↙ Exit Fullscreen" to return to normal mode

## 3. Profile Picture Background Color

### Description
Users can now set a custom background color for their profile picture using either a color picker or by entering a hex color code.

### Usage
1. Navigate to your profile page
2. Click "Edit Profile"
3. Scroll to the "Profile Picture Background Color" field
4. Either:
   - Enter a hex color code (e.g., #FF5733)
   - Use the color picker to select a color visually
5. Click "Save Changes"
6. Your profile picture will now display with the chosen background color

### Implementation Details
- Backend: `User` model includes `profileBackgroundColor` field
- Validation: Hex color format (#RRGGBB) is enforced
- Frontend: Profile picture div applies the background color as inline style
- Optional field: Leave empty for no background color

## 4. User Preferences

### Description
Users can now customize their experience and control their privacy settings through a dedicated User Preferences interface.

### Sections

#### Display
- **Dark Theme**: Toggle dark mode (UI ready, full implementation coming soon)

#### Language
- **Language Selection**: Currently supports English (more languages coming soon)

#### Privacy
Users have fine-grained control over what information is publicly visible:

- **Profile Page Public Visibility**: When disabled, other users cannot view your profile page (they'll see a "User not found" message)
- **Profile Picture Public Visibility**: When disabled, your profile picture is hidden from other users (they'll see your username initial instead)
- **Email Address Public Visibility**: When disabled, your email address is hidden from other users

### Usage
1. Navigate to your profile page
2. Click "User Preferences" (next to Edit Profile button)
3. Adjust your preferences:
   - Check/uncheck boxes as desired
   - Select your preferred language
4. Click "Save Preferences"
5. Your changes take effect immediately

### Implementation Details
- Backend: `UserPreferences` model with one-to-one relationship to `User`
- Endpoints: 
  - GET `/users/preferences` - Retrieve user preferences
  - PATCH `/users/preferences` - Update user preferences
- Privacy enforcement: `getProfileByUsername()` respects privacy settings
- Default settings: All privacy options are enabled by default for new users

## Database Schema Changes

### User Model
Added fields:
- `profileBackgroundColor` (String, optional): Stores hex color code for profile picture background

### New Model: UserPreferences
```prisma
model UserPreferences {
  id                    String   @id @default(uuid())
  darkTheme             Boolean  @default(false)
  language              String   @default("en")
  profilePageVisible    Boolean  @default(true)
  profilePictureVisible Boolean  @default(true)
  emailVisible          Boolean  @default(true)
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  userId                String   @unique
  user                  User     @relation(...)
}
```

## Migration
Migration file: `20251123195318_add_user_preferences_and_profile_color/migration.sql`
- Adds `profileBackgroundColor` column to `User` table
- Creates `UserPreferences` table
- Sets up foreign key relationship

## API Endpoints

### Search with Sorting
```
GET /markmaps/search?query=...&sortBy=newest
Query Parameters:
  - sortBy: "newest" | "oldest" | "relevant" | "views" (optional, defaults to "newest")
```

### User Preferences
```
GET /users/preferences
Response: UserPreferences object

PATCH /users/preferences
Body: {
  darkTheme?: boolean,
  language?: string,
  profilePageVisible?: boolean,
  profilePictureVisible?: boolean,
  emailVisible?: boolean
}
```

### Profile Update with Background Color
```
PATCH /users/profile
Body: {
  profileBackgroundColor?: string  // Must be hex format #RRGGBB
  // ... other profile fields
}
```

## Testing Recommendations

1. **Search Sorting**: Test all sort options with various search queries
2. **Profile Background Color**: Test with various hex colors and color picker
3. **User Preferences**: 
   - Test each privacy setting individually
   - Verify privacy settings are enforced when viewing other users' profiles
   - Test language selection
4. **Editor Fullscreen**: Verify fullscreen mode works on different screen sizes

## Notes

- Dark theme functionality is planned for future implementation
- Additional languages will be added in future updates
- Profile picture background color is optional and can be cleared by submitting an empty value
