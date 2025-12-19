# Testing API Endpoints Locally

This guide explains how to test the API key authentication feature when running the development server.

## Prerequisites

1. **Backend running** on `localhost:3010`:
   ```bash
   PORT=3010 npm run start:dev
   ```

2. **Frontend running** (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```

3. **Database** must be running with migrations applied:
   ```bash
   npx prisma migrate deploy
   ```

## Step 1: Generate an API Key via UI

1. Navigate to `http://localhost:3001` (frontend)
2. Log in to your account
3. Go to your profile page: `http://localhost:3001/profile/[your-username]`
4. Click "Account Settings" button
5. Scroll down to the "API Keys" section
6. Fill in the form:
   - **Key Name**: e.g., "Local Testing"
   - **Permission Level**: Choose "Full Access" for testing all endpoints
   - **Expiration**: Leave empty for testing
7. Click "Generate API Key"
8. **Important**: Copy the API key immediately (starts with `mk_`)

## Step 2: Test API Endpoints with cURL

### Setup
Store your API key in an environment variable:
```bash
export MIDIVERSE_API_KEY="mk_your_generated_key_here"
```

### Test Read Operations

**List all markmaps:**
```bash
curl -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  http://localhost:3010/api/markmaps
```

**Search markmaps:**
```bash
curl -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  "http://localhost:3010/api/markmaps/search?query=test"
```

**Get specific markmap (replace ID):**
```bash
curl -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  http://localhost:3010/api/markmaps/YOUR_MARKMAP_ID
```

### Test Write Operations (Requires Full Access)

**Create a new markmap:**
```bash
curl -X POST \
  -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Markmap",
    "text": "# Root\n## Branch 1\n### Leaf 1\n## Branch 2\n### Leaf 2",
    "language": "en",
    "tags": ["#test", "#api"],
    "isPublic": true
  }' \
  http://localhost:3010/api/markmaps
```

**Update a markmap (replace ID):**
```bash
curl -X PATCH \
  -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "text": "# Updated Content\n## New Branch"
  }' \
  http://localhost:3010/api/markmaps/YOUR_MARKMAP_ID
```

**Delete a markmap (replace ID):**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  http://localhost:3010/api/markmaps/YOUR_MARKMAP_ID
```

### Test API Key Management

**List your API keys:**
```bash
# Note: This requires JWT token, not API key
TOKEN="your_jwt_token_from_login"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/api/api-keys
```

**Delete an API key:**
```bash
curl -X DELETE \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3010/api/api-keys/YOUR_API_KEY_ID
```

## Step 3: Test with Postman or Thunder Client

### Import Collection

Create a new collection with these requests:

**1. List Markmaps**
- Method: GET
- URL: `http://localhost:3010/api/markmaps`
- Headers:
  - `Authorization`: `Bearer {{apiKey}}`

**2. Create Markmap**
- Method: POST
- URL: `http://localhost:3010/api/markmaps`
- Headers:
  - `Authorization`: `Bearer {{apiKey}}`
  - `Content-Type`: `application/json`
- Body (JSON):
  ```json
  {
    "title": "Test Markmap",
    "text": "# Root\n## Branch",
    "isPublic": true
  }
  ```

**3. Update Markmap**
- Method: PATCH
- URL: `http://localhost:3010/api/markmaps/{{markmapId}}`
- Headers:
  - `Authorization`: `Bearer {{apiKey}}`
  - `Content-Type`: `application/json`
- Body (JSON):
  ```json
  {
    "title": "Updated Title"
  }
  ```

### Environment Variables
Set up these variables:
- `apiKey`: Your generated API key (mk_...)
- `markmapId`: ID of a markmap for testing
- `baseUrl`: `http://localhost:3010/api`

## Step 4: Test with JavaScript

Create a test script `test-api.js`:

```javascript
const API_KEY = process.env.MIDIVERSE_API_KEY;
const BASE_URL = 'http://localhost:3010/api';

async function testAPI() {
  // Test 1: List markmaps
  console.log('Testing GET /markmaps...');
  let response = await fetch(`${BASE_URL}/markmaps`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  let data = await response.json();
  console.log('✓ Fetched', data.length, 'markmaps');

  // Test 2: Create markmap
  console.log('\nTesting POST /markmaps...');
  response = await fetch(`${BASE_URL}/markmaps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'API Test Markmap',
      text: '# Root\n## Branch 1\n## Branch 2',
      isPublic: true
    })
  });
  data = await response.json();
  console.log('✓ Created markmap:', data.id);

  // Test 3: Update markmap
  const markmapId = data.id;
  console.log('\nTesting PATCH /markmaps/:id...');
  response = await fetch(`${BASE_URL}/markmaps/${markmapId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Updated Test Markmap'
    })
  });
  data = await response.json();
  console.log('✓ Updated markmap:', data.title);

  // Test 4: Delete markmap
  console.log('\nTesting DELETE /markmaps/:id...');
  response = await fetch(`${BASE_URL}/markmaps/${markmapId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${API_KEY}`
    }
  });
  console.log('✓ Deleted markmap');

  console.log('\n✅ All tests passed!');
}

testAPI().catch(console.error);
```

Run the test:
```bash
MIDIVERSE_API_KEY="mk_your_key" node test-api.js
```

## Step 5: Test Permission Enforcement

### Test Read-Only Key

1. Generate a new API key with "Read Only" permission
2. Try to create a markmap:
```bash
curl -X POST \
  -H "Authorization: Bearer $READONLY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","text":"# Test","isPublic":true}' \
  http://localhost:3010/api/markmaps
```

Expected response:
```json
{
  "statusCode": 403,
  "message": "This operation requires an API key with full_access permission",
  "error": "Forbidden"
}
```

3. Try to fetch markmaps (should work):
```bash
curl -H "Authorization: Bearer $READONLY_API_KEY" \
  http://localhost:3010/api/markmaps
```

Expected: Success with list of markmaps

## Step 6: Test Expiration

1. Generate an API key with an expiration date in the past
2. Try to use it:
```bash
curl -H "Authorization: Bearer $EXPIRED_API_KEY" \
  http://localhost:3010/api/markmaps
```

Expected response:
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

## Troubleshooting

### "Unauthorized" Error

**Possible causes:**
1. API key not in correct format (must start with `mk_`)
2. API key has been deleted
3. API key has expired
4. Wrong header format (must be `Authorization: Bearer mk_...`)

**Debug:**
```bash
# Check if API key is in correct format
echo $MIDIVERSE_API_KEY | grep "^mk_"

# Test with verbose output
curl -v -H "Authorization: Bearer $MIDIVERSE_API_KEY" \
  http://localhost:3010/api/markmaps
```

### "Forbidden" Error

**Possible cause:** Using a read-only API key for write operations

**Solution:** Use an API key with "Full Access" permission

### Connection Refused

**Possible causes:**
1. Backend not running
2. Wrong port number
3. Database not running

**Check:**
```bash
# Check if backend is running
curl http://localhost:3010/api/markmaps

# Check backend logs
# (look at terminal where you ran npm run start:dev)
```

### CORS Errors (when testing from browser)

If testing from browser console, you might see CORS errors. This is because the backend needs to allow the origin.

**Solution:** Add your test origin to CORS configuration in `src/main.ts`

## Testing Checklist

Before considering the feature complete, test:

- [ ] Generate API key via UI
- [ ] Copy API key to clipboard works
- [ ] List API keys shows new key
- [ ] Delete API key works
- [ ] API key with read-only permission can fetch markmaps
- [ ] API key with read-only permission cannot create/edit/delete markmaps
- [ ] API key with full access can fetch markmaps
- [ ] API key with full access can create markmaps
- [ ] API key with full access can update markmaps
- [ ] API key with full access can delete markmaps
- [ ] Expired API key returns 401 Unauthorized
- [ ] Invalid API key returns 401 Unauthorized
- [ ] Missing Authorization header returns 401 Unauthorized
- [ ] Last used timestamp updates after API key usage

## Next Steps

After local testing is complete:
1. Review the [Deployment Guide](docs/DEPLOYMENT-midiverse.md) for production deployment
2. Test in a staging environment before production
3. Monitor API key usage in production
4. Set up rate limiting for production use
