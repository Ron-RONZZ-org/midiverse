# Midiverse Frontend

A Nuxt.js 3 frontend application for Midiverse - the markmap visualization platform.

## Features

- 🔒 **HTTPS Support**: Built-in HTTPS development server
- 🗺️ **Interactive Markmaps**: View and interact with markmap visualizations
- ✏️ **Editor**: Create and edit markmaps with live preview
- 🔍 **Search**: Search markmaps by title, content, language, and topic
- 🔐 **Authentication**: JWT-based user authentication
- 👤 **User Profiles**: Track your markmaps and view statistics

## Prerequisites

- Node.js 18+ and npm
- Running Midiverse backend (NestJS API)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the frontend directory:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```

Adjust the API URL if your backend is running on a different port or host.

### 3. SSL Certificates

Self-signed SSL certificates have been generated for HTTPS development. The certificates are:
- `server.key` - Private key
- `server.crt` - Certificate

**Note**: Browsers will show a security warning for self-signed certificates. This is expected for development.

## Running the Frontend

### Development Mode (with HTTPS)

```bash
npm run dev
```

The application will be available at `https://localhost:3001`

**Important**: Your browser will warn about the self-signed certificate. Click "Advanced" and "Proceed to localhost" to continue.

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── app/
│   └── app.vue              # Root component
├── assets/
│   └── css/
│       └── main.css         # Global styles
├── components/
│   └── MarkmapViewer.vue    # Markmap visualization component
├── composables/
│   ├── useApi.ts            # API client composable
│   └── useAuth.ts           # Authentication composable
├── layouts/
│   └── default.vue          # Default layout with navbar
├── pages/
│   ├── index.vue            # Home page
│   ├── login.vue            # Login page
│   ├── signup.vue           # Sign up page
│   ├── editor.vue           # Create/edit markmap
│   ├── profile.vue          # User profile
│   ├── search.vue           # Search markmaps
│   └── markmaps/
│       ├── index.vue        # List all markmaps
│       └── [id].vue         # View single markmap
├── public/                  # Static assets
├── server.key               # SSL private key
├── server.crt               # SSL certificate
├── nuxt.config.ts           # Nuxt configuration
└── package.json
```

## Pages

### Public Pages
- `/` - Home page with recent markmaps
- `/markmaps` - Browse all public markmaps
- `/markmaps/[id]` - View a specific markmap
- `/search` - Search markmaps
- `/login` - User login
- `/signup` - User registration

### Protected Pages (require authentication)
- `/editor` - Create or edit markmaps
- `/profile` - User profile and markmap list

## API Integration

The frontend communicates with the NestJS backend API. The API base URL is configured in `nuxt.config.ts` and can be overridden via environment variables.

### Composables

#### `useApi()`
Provides API client functionality:
- `authFetch()` - Make authenticated API requests
- `getToken()` / `setToken()` - Manage JWT tokens
- `getUser()` / `setUser()` - Manage user data

#### `useAuth()`
Provides authentication functionality:
- `login()` - User login
- `signup()` - User registration
- `logout()` - User logout
- `isAuthenticated` - Check authentication status
- `currentUser` - Get current user data

## Components

### MarkmapViewer
Renders interactive markmap visualizations from markdown content.

**Props**:
- `markdown` - Markdown content to visualize
- `options` - Markmap options (maxWidth, colorFreezeLevel, initialExpandLevel)

**Usage**:
```vue
<ClientOnly>
  <MarkmapViewer 
    :markdown="content"
    :options="{ maxWidth: 300, initialExpandLevel: -1 }"
  />
</ClientOnly>
```

## Development Tips

### Accepting Self-Signed Certificate

When you first access `https://localhost:3001`, your browser will show a security warning:

**Chrome**: Click "Advanced" → "Proceed to localhost (unsafe)"
**Firefox**: Click "Advanced" → "Accept the Risk and Continue"
**Safari**: Click "Show Details" → "visit this website"

### Hot Module Replacement

Nuxt 3 supports hot module replacement. Changes to components, pages, and styles will automatically refresh in the browser.

### Debugging

- Use Vue DevTools for component debugging
- Check browser console for errors
- Monitor network tab for API requests

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| NUXT_PUBLIC_API_BASE | Backend API base URL | http://localhost:3000 |

## Building for Production

For production deployment, you'll need:

1. **Valid SSL Certificates**: Replace self-signed certificates with proper SSL certificates from a Certificate Authority
2. **Environment Configuration**: Set proper API base URL for production
3. **Backend Configuration**: Ensure backend CORS settings allow your frontend domain

## Troubleshooting

### "Failed to load markmaps"
- Check that the backend is running on the correct port
- Verify the API base URL in your environment variables
- Check browser console for CORS errors

### Authentication Issues
- Clear localStorage and try logging in again
- Check that JWT_SECRET matches between frontend and backend
- Verify token is being sent in Authorization header

### HTTPS Certificate Warnings
- This is normal for self-signed certificates in development
- Follow browser-specific instructions to accept the certificate
- For production, use proper SSL certificates

## License

[MIT](../LICENSE)
