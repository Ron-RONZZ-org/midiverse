# API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Endpoints

### Authentication Endpoints

#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

#### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### Markmap Endpoints

#### POST /markmaps
Create a new markmap. **Requires authentication.**

**Request Body:**
```json
{
  "title": "My Learning Path",
  "text": "# Programming\n## Frontend\n### React\n### Vue\n## Backend\n### Node.js\n### Python",
  "language": "en",
  "tags": ["#javascript", "#react", "#learning"],
  "maxWidth": 300,
  "colorFreezeLevel": 2,
  "initialExpandLevel": -1,
  "isPublic": true
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "My Learning Path",
  "text": "# Programming\n## Frontend\n### React\n### Vue\n## Backend\n### Node.js\n### Python",
  "language": "en",
  "maxWidth": 300,
  "colorFreezeLevel": 2,
  "initialExpandLevel": -1,
  "isPublic": true,
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "author": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe"
  },
  "tags": [
    {
      "tag": {
        "id": "550e8400-e29b-41d4-a716-446655440003",
        "name": "#javascript"
      }
    },
    {
      "tag": {
        "id": "550e8400-e29b-41d4-a716-446655440004",
        "name": "#react"
      }
    },
    {
      "tag": {
        "id": "550e8400-e29b-41d4-a716-446655440005",
        "name": "#learning"
      }
    }
  ]
}
```

#### GET /markmaps
Get all markmaps. Returns public markmaps for unauthenticated users, and both public and user's private markmaps for authenticated users.

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "title": "My Learning Path",
    "text": "# Programming\n...",
    "language": "en",
    "isPublic": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "author": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "johndoe"
    },
    "tags": [
      {
        "tag": {
          "id": "550e8400-e29b-41d4-a716-446655440003",
          "name": "#javascript"
        }
      }
    ]
  }
]
```

#### GET /markmaps/search
Search markmaps by query or language.

**Query Parameters:**
- `query` (optional): Search term for title or text
- `language` (optional): Filter by language tag

**Example:**
```
GET /markmaps/search?query=programming&language=en
```

**Response:** Same format as GET /markmaps

#### GET /markmaps/:id
Get a specific markmap by ID. Public markmaps can be accessed by anyone. Private markmaps require authentication and ownership.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "My Learning Path",
  "text": "# Programming\n...",
  "language": "en",
  "maxWidth": 300,
  "colorFreezeLevel": 2,
  "initialExpandLevel": -1,
  "isPublic": true,
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "author": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe"
  }
}
```

#### PATCH /markmaps/:id
Update a markmap. **Requires authentication.** Users can only update their own markmaps.

**Request Body:** (all fields optional)
```json
{
  "title": "Updated Title",
  "text": "# Updated content",
  "language": "es",
  "tags": ["#learning", "#updated"],
  "maxWidth": 400,
  "isPublic": false
}
```

**Response:** Updated markmap object

#### DELETE /markmaps/:id
Soft delete a markmap (moves to recycle bin). **Requires authentication.** Users can only delete their own markmaps.

The markmap will be kept in the recycle bin for 30 days before permanent deletion.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "My Learning Path",
  "deletedAt": "2024-01-15T00:00:00.000Z",
  ...
}
```

#### POST /markmaps/:id/duplicate
Duplicate a markmap. **Requires authentication.** Users can duplicate their own markmaps or public markmaps.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440099",
  "title": "My Learning Path (Copy)",
  "text": "# Programming\n## Frontend\n### React\n### Vue\n## Backend\n### Node.js\n### Python",
  "language": "en",
  "authorId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2024-01-15T00:00:00.000Z",
  "updatedAt": "2024-01-15T00:00:00.000Z",
  "deletedAt": null,
  "author": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe"
  }
}
```

#### POST /markmaps/:id/restore
Restore a deleted markmap from the recycle bin. **Requires authentication.** Users can only restore their own markmaps.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "title": "My Learning Path",
  "deletedAt": null,
  ...
}
```

#### POST /markmaps/:id/interactions
Track user interactions with a markmap (expand, collapse, search, etc.).

**Request Body:**
```json
{
  "type": "expand",
  "metadata": {
    "nodeId": "node-123",
    "depth": 2
  }
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "type": "expand",
  "metadata": {
    "nodeId": "node-123",
    "depth": 2
  },
  "markmapId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "interactedAt": "2024-01-01T00:00:00.000Z"
}
```

### Tag Endpoints

#### GET /markmaps/tags/suggestions
Get tag suggestions for autocomplete. Returns tags matching the query with their usage counts.

**Query Parameters:**
- `query` (optional): Search term for tag names

**Example:**
```
GET /markmaps/tags/suggestions?query=javascript
```

**Response:**
```json
[
  {
    "name": "#javascript",
    "count": 42
  },
  {
    "name": "#java",
    "count": 15
  }
]
```

#### GET /markmaps/tags/statistics
Get statistics for the most popular tags with time filtering.

**Query Parameters:**
- `timeFilter` (optional): `all`, `24h`, or `1h`. Default: `all`

**Example:**
```
GET /markmaps/tags/statistics?timeFilter=24h
```

**Response:**
```json
[
  {
    "name": "#javascript",
    "count": 42
  },
  {
    "name": "#python",
    "count": 35
  },
  {
    "name": "#react",
    "count": 28
  }
]
```

#### GET /markmaps/tags/trend/:tagName
Get historical trend data for a specific tag over the last 30 days.

**Example:**
```
GET /markmaps/tags/trend/%23javascript
```

**Response:**
```json
[
  {
    "date": "2024-01-01",
    "count": 2
  },
  {
    "date": "2024-01-02",
    "count": 5
  },
  {
    "date": "2024-01-03",
    "count": 3
  }
]
```

### User Endpoints

#### GET /users/profile
Get current user's profile. **Requires authentication.**

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "johndoe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastEmailChange": "2024-01-01T00:00:00.000Z",
  "lastUsernameChange": null,
  "_count": {
    "markmaps": 5,
    "viewHistory": 23,
    "interactions": 47
  }
}
```

#### PATCH /users/profile
Update current user's email or username. **Requires authentication.**

Email and username can only be changed once every 15 days.

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "username": "newusername"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newemail@example.com",
  "username": "newusername",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastEmailChange": "2024-01-15T00:00:00.000Z",
  "lastUsernameChange": "2024-01-15T00:00:00.000Z"
}
```

#### GET /users/profile/:username
Get a user's profile by username. Public view for other users, full view for own profile.

**Response (public view):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "isOwnProfile": false,
  "_count": {
    "markmaps": 5,
    "viewHistory": 23,
    "interactions": 47
  }
}
```

**Response (own profile):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "username": "johndoe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastEmailChange": null,
  "lastUsernameChange": null,
  "isOwnProfile": true,
  "_count": {
    "markmaps": 5,
    "viewHistory": 23,
    "interactions": 47
  }
}
```

#### GET /users/markmaps
Get all markmaps created by the current user. **Requires authentication.**

**Response:** Array of markmap objects (including non-deleted markmaps)

#### GET /users/deleted-markmaps
Get all deleted markmaps in the recycle bin. **Requires authentication.**

Deleted markmaps are kept for 30 days before permanent removal.

**Response:** Array of deleted markmap objects

#### GET /users/history
Get viewing history and interactions for the current user. **Requires authentication.**

**Response:**
```json
{
  "viewHistory": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440003",
      "viewedAt": "2024-01-01T00:00:00.000Z",
      "markmap": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "My Learning Path",
        ...
      }
    }
  ],
  "interactions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "type": "expand",
      "metadata": {...},
      "interactedAt": "2024-01-01T00:00:00.000Z",
      "markmap": {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "title": "My Learning Path",
        ...
      }
    }
  ]
}
```

## Error Responses

### 400 Bad Request
Invalid input data.
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 6 characters"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
Missing or invalid authentication token.
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
Attempting to access or modify a resource you don't have permission for.
```json
{
  "statusCode": 403,
  "message": "You can only update your own markmaps",
  "error": "Forbidden"
}
```

### 404 Not Found
Resource not found.
```json
{
  "statusCode": 404,
  "message": "Markmap not found",
  "error": "Not Found"
}
```

## Markmap Parameters

### maxWidth
Maximum width for markmap nodes in pixels. Default: 0 (no limit).

### colorFreezeLevel
The level at which colors stop changing. Default: 0.
- 0: Colors continue to change at all levels
- N: Colors freeze at level N and below

### initialExpandLevel
The initial expansion level of the markmap. Default: -1.
- -1: Fully expanded
- 0: Only root node visible
- N: Expand to level N

## Example Workflow

1. **User Registration**
   ```bash
   curl -X POST http://localhost:3000/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","username":"johndoe","password":"secure123"}'
   ```

2. **Create a Markmap**
   ```bash
   curl -X POST http://localhost:3000/markmaps \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"title":"My Map","text":"# Root\n## Branch","isPublic":true}'
   ```

3. **View Public Markmaps**
   ```bash
   curl http://localhost:3000/markmaps
   ```

4. **Search Markmaps**
   ```bash
   curl "http://localhost:3000/markmaps/search?query=programming&language=en"
   ```

5. **Track Interaction**
   ```bash
   curl -X POST http://localhost:3000/markmaps/MARKMAP_ID/interactions \
     -H "Content-Type: application/json" \
     -d '{"type":"expand","metadata":{"nodeId":"node-1"}}'
   ```

6. **View Your History**
   ```bash
   curl http://localhost:3000/users/history \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
