# Midiverse

A NestJS application to edit and display [markmaps](https://github.com/markmap/markmap).

## Features

### Backend
- **Database**: Prisma with PostgreSQL
- **Authentication**: JWT-based authentication system

### Core Functionality

#### 1. Markmap Visualization (Public Access)
- View markmaps without login required
- Markmap autoloader for easy visualization
- Public sharing of markmaps

#### 2. Search
- Search markmaps by:
  - Title or text content
  - Language tags
  - Topic tags

#### 3. User Authentication
- Sign up and login endpoints
- JWT token-based authentication
- Secure password hashing with bcrypt

#### 4. Member View
- **Viewing History**: Track all viewed markmaps
- **Interaction History**: Record user interactions (expand, collapse, search, etc.)
- User profile with statistics

#### 5. Editor View
- **Markmap Editor**: Create and edit markmaps with:
  - **Text**: Markdown content for markmap
  - **Tags**:
    - Language tags
    - Topic tags
  - **Parameters**:
    - `maxWidth`: Maximum width for nodes
    - `colorFreezeLevel`: Level at which colors freeze
    - `initialExpandLevel`: Initial expansion level (-1 for fully expanded)
- Full CRUD operations (Create, Read, Update, Delete)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file based on `.env.example`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/midiverse?schema=public"
JWT_SECRET="your-secret-key-change-this-in-production"
PORT=3000
```

## Database Setup

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (if you have a PostgreSQL database running)
npx prisma migrate dev --name init
```

## Running the App

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

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
  "topic": "tutorial",
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
GET /markmaps/search?query=tutorial&language=en&topic=programming
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
- createdAt, updatedAt

### Markmap
- id (UUID, Primary Key)
- title
- text (Markdown content)
- language (Optional tag)
- topic (Optional tag)
- maxWidth (Default: 0)
- colorFreezeLevel (Default: 0)
- initialExpandLevel (Default: -1)
- isPublic (Default: true)
- authorId (Foreign Key to User, Optional)
- createdAt, updatedAt

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

## Technology Stack

- **Framework**: NestJS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator, class-transformer
- **Password Hashing**: bcrypt
- **Markmap**: markmap-lib, markmap-view

## License

[MIT](LICENSE)
