# Midiverse API Usage Guide

This guide will help you get started with the Midiverse API using API keys for programmatic access to markmaps.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [API Key Permissions](#api-key-permissions)
- [Common Use Cases](#common-use-cases)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Best Practices](#best-practices)

## Getting Started

### 1. Generate an API Key

1. Log in to your Midiverse account
2. Navigate to your profile page (`/profile/[your-username]`)
3. Click on "Account Settings"
4. Scroll down to the "API Keys" section
5. Fill in the form:
   - **Key Name**: A descriptive name (e.g., "Production App", "Testing Script")
   - **Permission Level**: Choose between:
     - `Read Only`: Can only fetch and search markmaps
     - `Full Access`: Can create, edit, and delete markmaps
   - **Expiration** (Optional): Set an expiration date for the key
6. Click "Generate API Key"
7. **Important**: Copy the API key immediately - you won't be able to see it again!

### 2. Store Your API Key Securely

Never commit your API key to version control or share it publicly. Store it as an environment variable:

```bash
export MIDIVERSE_API_KEY="mk_your_api_key_here"
```

Or in a `.env` file (don't forget to add it to `.gitignore`):

```
MIDIVERSE_API_KEY=mk_your_api_key_here
```

## Authentication

Include your API key in the `Authorization` header using the Bearer scheme:

```
Authorization: Bearer mk_your_api_key_here
```

### Example with cURL

```bash
curl -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  https://api.midiverse.com/markmaps
```

### Example with JavaScript/Fetch

```javascript
const apiKey = process.env.MIDIVERSE_API_KEY;

const response = await fetch('https://api.midiverse.com/markmaps', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

const markmaps = await response.json();
```

### Example with Python

```python
import os
import requests

api_key = os.environ.get('MIDIVERSE_API_KEY')
headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

response = requests.get('https://api.midiverse.com/markmaps', headers=headers)
markmaps = response.json()
```

## API Key Permissions

### Read Only (`read_only`)

**Allowed Operations:**
- `GET /markmaps` - List all public markmaps
- `GET /markmaps/search` - Search markmaps
- `GET /markmaps/:id` - Get a specific markmap by ID
- `GET /markmaps/:username/:slug` - Get a markmap by username and slug

**Use Cases:**
- Displaying markmaps on external websites
- Analyzing markmap data
- Building read-only integrations

### Full Access (`full_access`)

**Allowed Operations:**
All read-only operations, plus:
- `POST /markmaps` - Create new markmaps
- `PATCH /markmaps/:id` - Update your markmaps
- `DELETE /markmaps/:id` - Delete your markmaps
- `POST /markmaps/:id/duplicate` - Duplicate markmaps

**Use Cases:**
- Automated markmap creation scripts
- Bulk markmap management tools
- Third-party markmap editors

## Common Use Cases

### 1. Fetch All Public Markmaps

```bash
curl -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  https://api.midiverse.com/markmaps
```

### 2. Search Markmaps

```bash
curl -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  "https://api.midiverse.com/markmaps/search?query=programming&language=en"
```

### 3. Get a Specific Markmap

```bash
curl -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  https://api.midiverse.com/markmaps/550e8400-e29b-41d4-a716-446655440001
```

### 4. Create a New Markmap (Requires Full Access)

```bash
curl -X POST \
  -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My API Created Markmap",
    "text": "# Root\n## Branch 1\n### Leaf 1\n## Branch 2\n### Leaf 2",
    "language": "en",
    "tags": ["#api", "#automation"],
    "isPublic": true
  }' \
  https://api.midiverse.com/markmaps
```

```bash
jq -n --rawfile text midiverse/API-docs.md '{title:"My API Created Markmap", text:$text, language:"en", tags:["#api","#automation"], isPublic:true}' \
| curl -X POST \
  -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d @- https://api.midiverse.com/markmaps
```

### 5. Update a Markmap (Requires Full Access)

```bash
curl -X PATCH \
  -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "text": "# Updated Content\n## New Branch"
  }' \
  https://api.midiverse.com/markmaps/550e8400-e29b-41d4-a716-446655440001
```

### 6. Delete a Markmap (Requires Full Access)

```bash
curl -X DELETE \
  -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  https://api.midiverse.com/markmaps/550e8400-e29b-41d4-a716-446655440001
```

## Error Handling

### Common HTTP Status Codes

- `200 OK` - Request succeeded
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - API key doesn't have required permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

### Example Error Handling (JavaScript)

```javascript
try {
  const response = await fetch('https://api.midiverse.com/markmaps', {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(`Error ${response.status}:`, error.message);
    return;
  }

  const markmaps = await response.json();
  console.log('Fetched markmaps:', markmaps);
} catch (error) {
  console.error('Network error:', error);
}
```

## Rate Limits

To ensure fair usage and system stability, the following rate limits apply:

- **Read-only operations**: 100 requests per minute
- **Write operations** (create/update/delete): 20 requests per minute

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response with a `Retry-After` header indicating when you can retry.

### Handling Rate Limits

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After') || '60';
      console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
      await new Promise(resolve => setTimeout(resolve, parseInt(retryAfter) * 1000));
      continue;
    }
    
    return response;
  }
  
  throw new Error('Max retries exceeded');
}
```

## Best Practices

### 1. Secure Your API Keys

- Never commit API keys to version control
- Use environment variables or secure secret management
- Rotate keys regularly, especially after team member changes
- Use separate keys for development, staging, and production
- Delete unused API keys immediately

### 2. Use Appropriate Permissions

- Use `read_only` keys when you only need to fetch data
- Reserve `full_access` keys for trusted applications only
- Create separate keys for different applications/purposes

### 3. Set Expiration Dates

- Set expiration dates for temporary keys or testing
- Review and rotate long-lived keys regularly
- Keys without expiration dates should be monitored closely

### 4. Handle Errors Gracefully

- Always check response status codes
- Implement retry logic with exponential backoff
- Log errors for debugging
- Provide meaningful error messages to users

### 5. Optimize API Usage

- Cache responses when appropriate
- Use search parameters to filter data server-side
- Batch operations when possible
- Monitor your API usage in the account settings

### 6. Monitor Your Keys

- Check the "Last Used" date regularly in your account settings
- Delete keys that haven't been used in a while
- Review the list of active keys periodically

### 7. API Key Naming Convention

Use descriptive names that indicate:
- Purpose: "Production App", "Analytics Dashboard"
- Environment: "Dev", "Staging", "Prod"
- Owner/Team: "Backend Team", "Mobile App"

Example: "Production Mobile App - Full Access"

## Example Integration

Here's a complete example of a Node.js script that creates a markmap from a file:

```javascript
import fs from 'fs';
import fetch from 'node-fetch';

const API_KEY = process.env.MIDIVERSE_API_KEY;
const API_BASE = 'https://api.midiverse.com';

async function createMarkmapFromFile(filePath) {
  try {
    // Read markdown content from file
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extract title from first line or use filename
    const lines = content.split('\n');
    const title = lines[0].replace(/^#\s*/, '') || filePath.split('/').pop();
    
    // Create markmap via API
    const response = await fetch(`${API_BASE}/markmaps`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        text: content,
        language: 'en',
        tags: ['#automated', '#import'],
        isPublic: true
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.message}`);
    }
    
    const markmap = await response.json();
    console.log(`✓ Created markmap: ${markmap.title}`);
    console.log(`  URL: https://midiverse.com/markmaps/${markmap.id}`);
    console.log(`  ID: ${markmap.id}`);
    
    return markmap;
  } catch (error) {
    console.error('Failed to create markmap:', error.message);
    throw error;
  }
}

// Usage
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node create-markmap.js <markdown-file>');
  process.exit(1);
}

createMarkmapFromFile(filePath)
  .then(() => console.log('Done!'))
  .catch(() => process.exit(1));
```

## Support

For issues or questions:
- Check the main [API Documentation](./API.md) for endpoint details
- Review the [README](./README.md) for general information
- Open an issue on GitHub for bug reports or feature requests

## Security

If you discover a security vulnerability related to API keys or authentication, please report it responsibly by contacting the maintainers directly rather than opening a public issue.
