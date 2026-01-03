# Midiverse

A full-stack application to create, edit, and display interactive [markmaps](https://github.com/markmap/markmap).

## Architecture

- **Backend**: NestJS REST API with PostgreSQL database
- **Frontend**: Nuxt.js 3 web application with optional HTTPS support

## Features

### Security Features
- **Cloudflare Turnstile**: Anti-bot protection for signup and login
- **Email Verification**: Required email verification for new accounts
- **Password Security**: Bcrypt password hashing with salt
- **JWT Authentication**: Secure token-based authentication
- **HTTPS Support**: Optional SSL/TLS encryption for production

### Frontend (Nuxt.js)
- **HTTP/HTTPS Support**: Runs on HTTP by default, optional HTTPS with self-signed certificates
- **Interactive UI**: Modern, responsive web interface
- **Markmap Viewer**: Interactive visualization of markmaps
- **Live Editor**: Create and edit markmaps with real-time preview
- **User Authentication**: Login, signup, and profile management
- **Search Interface**: Find markmaps by title, content, language, or tags

### Backend (NestJS)
- **Database**: Prisma with PostgreSQL
- **Authentication**: JWT-based authentication system
- **REST API**: Full CRUD operations for markmaps
- **Email Service**: Nodemailer integration for verification emails

### Core Functionality

#### 1. Markmap Visualization (Public Access)
- View markmaps without login required
- Markmap autoloader for easy visualization
- Public sharing of markmaps
- **Human-friendly URLs**: Access markmaps via `/{username}/{slug}` (e.g., `/markmaps/johndoe/my-learning-path`)
- **Fullscreen view**: Display markmaps in fullscreen mode with `/fullscreen` suffix
- **Copy direct link**: Easy sharing with a button to copy fullscreen link

#### 2. Search
- Search markmaps by:
  - Title or text content
  - Language tags
  - Custom tags (e.g., #javascript, #tutorial)

#### 3. User Authentication
- Sign up with email verification
- Login with Cloudflare Turnstile bot protection
- JWT token-based authentication
- Secure password hashing with bcrypt
- Email verification required before full account access

#### 4. Member View
- **Viewing History**: Track all viewed markmaps
- **Interaction History**: Record user interactions (expand, collapse, search, etc.)
- User profile with statistics

#### 5. Editor View
- **Markmap Editor**: Create and edit markmaps with:
  - **Text**: Markdown content for markmap
  - **Tags**:
    - Language tags
    - **Custom Tags**: Add custom tags starting with # (e.g., #javascript, #tutorial)
      - Autocomplete suggestions with usage counts
      - Create new tags on-the-fly
  - **Parameters**:
    - `maxWidth`: Maximum width for nodes
    - `colorFreezeLevel`: Level at which colors freeze
    - `initialExpandLevel`: Initial expansion level (-1 for fully expanded)
- Full CRUD operations (Create, Read, Update, Delete)

#### 6. Tag System
- **Tag Management**:
  - All tags must start with # (automatically normalized)
  - Autocomplete suggestions while typing
  - Shows existing tag usage counts
  - Option to create new tags
- **Tag Analytics Page** (`/tags`):
  - **Trending Tags**: Bar chart showing top 10 most popular tags
    - Filter by time period: All Time, Last 24 Hours, Last Hour
    - Automatically refreshes
  - **Historical Trends**: Line chart showing tag usage over last 30 days
    - Search for specific tags
    - Visual representation of tag growth/decline

## Installation

### Backend Setup

```bash
npm install
```

## Configuration

### Backend Configuration

Create a `.env` file in the root directory based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/midiverse?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
JWT_EXPIRATION="7d"
PORT=3000

# Cloudflare Turnstile (get keys from https://dash.cloudflare.com/)
TURNSTILE_SECRET_KEY="your-turnstile-secret-key"

# Email Configuration (for email verification)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_FROM="noreply@midiverse.com"

# Application URL (used in email verification links)
EMAIL_LINK_BASEURL="http://localhost:3001"
```

**Note**: 
- Get Cloudflare Turnstile keys from [Cloudflare Dashboard](https://dash.cloudflare.com/)
- For Gmail, create an [App Password](https://support.google.com/accounts/answer/185833)
- In development, Turnstile verification is optional (skipped if not configured)
- Email verification is required for all new accounts

### Frontend Configuration

Create a `.env` file in the `frontend` directory:

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000/api
NUXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

**Note**: 
- Get the Turnstile **Site Key** (not Secret Key) from [Cloudflare Dashboard](https://dash.cloudflare.com/)
- **For local testing without Turnstile**: Leave `NUXT_PUBLIC_TURNSTILE_SITE_KEY` empty or set to empty string. The app will show a development warning and allow signup/login without bot protection.
- **For production**: Always configure Turnstile keys for bot protection

#### Optional: Enable HTTPS for Development

If you want to run the frontend with HTTPS, generate self-signed SSL certificates:

```bash
cd frontend
openssl req -x509 -newkey rsa:4096 -keyout server.key -out server.crt -days 365 -nodes -subj "/CN=localhost"
```

## Database Setup

For detailed database setup instructions, especially for fresh/empty databases, see **[PRISMA_SETUP.md](./PRISMA_SETUP.md)**.

### Quick Setup

```bash
# Generate Prisma Client (automatically runs after npm install)
npx prisma generate

# Apply migrations to a fresh database
npx prisma migrate deploy

# Or for development (creates database if needed)
npx prisma migrate dev
```

**Note:** If you encounter migration errors with an existing database, see the troubleshooting section in [PRISMA_SETUP.md](./PRISMA_SETUP.md).

## Running the Application

### Start the Backend

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

The backend will be available at `http://localhost:3000/api`

### Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3001` (or `https://localhost:3001` if you generated SSL certificates)

**Note**: If using HTTPS with self-signed certificates, your browser will show a security warning - this is normal for development. Click "Advanced" and proceed to continue.

### Full Stack Development

1. Start the backend in one terminal:
   ```bash
   npm run start:dev
   ```

2. Start the frontend in another terminal:
   ```bash
   cd frontend
   npm run dev
   ```

3. Access the application at `https://localhost:3001`

## API Endpoints

### Authentication

#### Sign Up
```http
POST /auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "username",
  "password": "password123"
}
```

Returns:
```json
{
  "access_token": "jwt-token",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "username"
  }
}
```

### Markmaps (Public endpoints work without authentication)

#### Create Markmap (Authenticated)
```http
POST /markmaps
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "My Markmap",
  "text": "# Root\n## Branch 1\n## Branch 2",
  "language": "en",
  "tags": ["#tutorial", "#javascript"],
  "maxWidth": 300,
  "colorFreezeLevel": 2,
  "initialExpandLevel": -1,
  "isPublic": true
}
```

#### Get All Markmaps (Public)
```http
GET /markmaps
```

#### Search Markmaps (Public)
```http
GET /markmaps/search?query=tutorial&language=en
```

#### Get Single Markmap (Public for public markmaps)
```http
GET /markmaps/{id}
```

#### Update Markmap (Authenticated - own markmaps only)
```http
PATCH /markmaps/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Updated Title",
  "text": "# Updated content"
}
```

#### Delete Markmap (Authenticated - own markmaps only)
```http
DELETE /markmaps/{id}
Authorization: Bearer {token}
```

#### Track Interaction
```http
POST /markmaps/{id}/interactions
Content-Type: application/json

{
  "type": "expand",
  "metadata": {
    "nodeId": "node-1"
  }
}
```

### User Endpoints (Authenticated)

#### Get User Profile
```http
GET /users/profile
Authorization: Bearer {token}
```

#### Get User's Markmaps
```http
GET /users/markmaps
Authorization: Bearer {token}
```

#### Get User History
```http
GET /users/history
Authorization: Bearer {token}
```

Returns:
```json
{
  "viewHistory": [...],
  "interactions": [...]
}
```

## Database Schema

### User
- id (UUID, Primary Key)
- email (Unique)
- username (Unique)
- password (Hashed)
- emailVerified (Boolean, Default: false)
- emailVerificationToken (String, nullable)
- emailVerificationTokenExpiry (DateTime, nullable)
- displayName (Optional)
- description (Optional)
- profilePictureUrl (Optional)
- lastEmailChange, lastUsernameChange
- createdAt, updatedAt

### Markmap
- id (UUID, Primary Key)
- title
- slug (URL-friendly version of title, unique per author)
- text (Markdown content)
- language (Optional tag)
- maxWidth (Default: 0)
- colorFreezeLevel (Default: 0)
- initialExpandLevel (Default: -1)
- isPublic (Default: true)
- authorId (Foreign Key to User, Optional)
- createdAt, updatedAt
- tags (Many-to-many relationship with Tag)
- Unique constraint: (authorId, slug)

### ViewHistory
- id (UUID, Primary Key)
- userId (Foreign Key to User, Optional)
- markmapId (Foreign Key to Markmap)
- viewedAt

### Interaction
- id (UUID, Primary Key)
- type (String: "expand", "collapse", "search", etc.)
- metadata (JSON)
- userId (Foreign Key to User, Optional)
- markmapId (Foreign Key to Markmap)
- interactedAt

### Tag
- id (UUID, Primary Key)
- name (String, Unique - tag name with # prefix)
- createdAt, updatedAt

### TagOnMarkmap
- id (UUID, Primary Key)
- tagId (Foreign Key to Tag)
- markmapId (Foreign Key to Markmap)
- createdAt
- Unique constraint on (tagId, markmapId)

## Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **Password Hashing**: bcrypt
- **Email**: Nodemailer
- **Anti-bot**: Cloudflare Turnstile
- **Markmap**: markmap-lib, markmap-view
- **Visualization**: Plotly.js (for tag analytics)

## Production Deployment

### Automated Deployment

For quick production deployment, use the automated scripts:

```bash
# Initial deployment with domain and SSL
sudo ./scripts/deploy.sh --domain yourdomain.com

# Or skip SSL for manual setup later
sudo ./scripts/deploy.sh --domain yourdomain.com --skip-ssl
```

See [scripts/README.md](./scripts/README.md) for detailed script usage and options.

### Manual Deployment

For detailed production deployment instructions, including:
- Ubuntu 24.04 LTS server setup
- PostgreSQL configuration
- Nginx reverse proxy setup
- SSL certificate with Let's Encrypt
- PM2 process management
- Email service configuration
- Security hardening

See the comprehensive [docs/DEPLOYMENT-midiverse.md](./docs/DEPLOYMENT-midiverse.md) guide.

### Maintenance and Updates

To update an existing deployment:

```bash
# Standard update
sudo ./scripts/update.sh

# Update with full restart
sudo ./scripts/update.sh --full-restart

# Dry run to see what would change
sudo ./scripts/update.sh --dry-run
```

See [docs/MAINTENANCE-midiverse.md](./docs/MAINTENANCE-midiverse.md) for manual maintenance procedures.

## Security Features

### Anti-bot Protection
- Cloudflare Turnstile integration on signup and login forms
- Prevents automated account creation and brute force attacks
- Optional in development (gracefully skips if not configured)

### Email Verification
- All new accounts require email verification
- Verification tokens expire after 24 hours
- Resend verification email functionality
- Prevents spam accounts and ensures valid contact information

### Password Security
- Bcrypt hashing with salt
- Minimum password length enforcement
- Secure password comparison

### API Security
- JWT token-based authentication
- Token expiration (configurable, default 7 days)
- Protected endpoints require valid authentication

## License

[AGPL 3](LICENSE)
